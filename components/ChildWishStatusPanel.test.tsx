// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ChildWishStatusPanel } from './ChildWishStatusPanel';
import * as supabaseSyncService from '../services/supabaseSyncService';
import { ChildSafeWish } from '../types';

const FORBIDDEN_UI_LITERALS = [
  'wish_pending',
  'wish_approved',
  'image_pending',
  'image_approved',
  'image_rejected',
  'proposed_image_path',
  'image_parent_note',
] as const;

const assertNoForbiddenLiteralsInDOM = (container: HTMLElement) => {
  const renderedText = container.textContent ?? '';
  for (const forbidden of FORBIDDEN_UI_LITERALS) {
    expect(renderedText).not.toContain(forbidden);
  }
};

describe('ChildWishStatusPanel Component (Wave Y Stage 3c)', () => {
  const mockOnRefetch = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.restoreAllMocks();
    mockOnRefetch.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing (null) when wishes list is empty and not loading, or while loading', () => {
    const { container, rerender } = render(
      <ChildWishStatusPanel
        wishes={[]}
        loading={false}
        childId="child-1"
        onRefetch={mockOnRefetch}
      />
    );

    expect(container.firstChild).toBeNull();
    expect(container.textContent).toBe('');

    // Also renders nothing while loading even if wishes are passed
    rerender(
      <ChildWishStatusPanel
        wishes={[
          {
            id: 'w-1',
            wish_text: 'დრონი',
            status: 'wish_rejected',
            wish_parent_note: 'კომენტარი',
            correct_count: 40,
            created_at: '2026-09-29T10:00:00Z',
          },
        ]}
        loading={true}
        childId="child-1"
        onRefetch={mockOnRefetch}
      />
    );

    expect(container.firstChild).toBeNull();
    expect(container.textContent).toBe('');
  });

  it('renders only the aggregated counter for pending-type wishes (wish_pending, wish_approved, image_pending, image_approved, image_rejected) and never exposes raw status or image fields', () => {
    const wishes: ChildSafeWish[] = [
      {
        id: 'w-1',
        wish_text: 'სურვილი 1',
        status: 'wish_pending',
        wish_parent_note: null,
        correct_count: 40,
        created_at: '2026-09-29T08:00:00Z',
      },
      {
        id: 'w-2',
        wish_text: 'სურვილი 2',
        status: 'wish_approved',
        wish_parent_note: null,
        correct_count: 40,
        created_at: '2026-09-29T09:00:00Z',
      },
      {
        id: 'w-3',
        wish_text: 'სურვილი 3',
        status: 'image_pending',
        wish_parent_note: null,
        correct_count: 40,
        created_at: '2026-09-29T10:00:00Z',
      },
      {
        id: 'w-4',
        wish_text: 'სურვილი 4',
        status: 'image_approved',
        wish_parent_note: null,
        correct_count: 20,
        created_at: '2026-09-29T11:00:00Z',
      },
      {
        id: 'w-5',
        wish_text: 'სურვილი 5',
        status: 'image_rejected',
        wish_parent_note: null,
        correct_count: 19,
        created_at: '2026-09-29T12:00:00Z',
      },
    ];

    const { container } = render(
      <ChildWishStatusPanel
        wishes={wishes}
        loading={false}
        childId="child-1"
        onRefetch={mockOnRefetch}
      />
    );

    expect(screen.getByText('5 სურვილი მშობელთან გაიგზავნა')).toBeDefined();
    expect(screen.queryByText(/შენი სურვილი:/)).toBeNull();
    assertNoForbiddenLiteralsInDOM(container);
  });

  it('ignores published wishes completely (neither renders a card nor counts in pendingCount)', () => {
    const onlyPublished: ChildSafeWish[] = [
      {
        id: 'w-pub',
        wish_text: 'უკვე შესრულებული სურვილი',
        status: 'published',
        wish_parent_note: null,
        correct_count: 40,
        created_at: '2026-09-29T08:00:00Z',
      },
    ];

    const { container, rerender } = render(
      <ChildWishStatusPanel
        wishes={onlyPublished}
        loading={false}
        childId="child-1"
        onRefetch={mockOnRefetch}
      />
    );

    // Only published wish -> nothing rendered at all
    expect(container.firstChild).toBeNull();
    expect(container.textContent).toBe('');

    // Mix of 1 published + 1 image_pending + 1 wish_rejected
    const mixedWishes: ChildSafeWish[] = [
      ...onlyPublished,
      {
        id: 'w-pend',
        wish_text: 'სურათი მოლოდინში',
        status: 'image_pending',
        wish_parent_note: null,
        correct_count: 40,
        created_at: '2026-09-29T09:00:00Z',
      },
      {
        id: 'w-rej',
        wish_text: 'უარყოფილი სურვილი',
        status: 'wish_rejected',
        wish_parent_note: 'სხვა აირჩიე',
        correct_count: 40,
        created_at: '2026-09-29T10:00:00Z',
      },
    ];

    rerender(
      <ChildWishStatusPanel
        wishes={mixedWishes}
        loading={false}
        childId="child-1"
        onRefetch={mockOnRefetch}
      />
    );

    // Counter must be 1 (only image_pending), NOT 2
    expect(screen.getByText('1 სურვილი მშობელთან გაიგზავნა')).toBeDefined();
    expect(screen.getByText('შენი სურვილი: „უარყოფილი სურვილი"')).toBeDefined();
    expect(screen.queryByText(/უკვე შესრულებული სურვილი/)).toBeNull();
    assertNoForbiddenLiteralsInDOM(container);
  });

  it('renders wish_rejected card with parent note when wish_parent_note is present', () => {
    const wishes: ChildSafeWish[] = [
      {
        id: 'w-rej-note',
        wish_text: 'სკუტერი',
        status: 'wish_rejected',
        wish_parent_note: 'ძალიან დიდია, სხვა აირჩიე',
        correct_count: 40,
        created_at: '2026-09-29T10:00:00Z',
      },
    ];

    const { container } = render(
      <ChildWishStatusPanel
        wishes={wishes}
        loading={false}
        childId="child-1"
        onRefetch={mockOnRefetch}
      />
    );

    expect(screen.getByText('შენი სურვილი: „სკუტერი"')).toBeDefined();
    expect(screen.getByText('მშობლის კომენტარი: ძალიან დიდია, სხვა აირჩიე')).toBeDefined();
    expect(screen.getByText('დაწერე ახალი სურვილი:')).toBeDefined();
    assertNoForbiddenLiteralsInDOM(container);
  });

  it('renders wish_rejected card without parent comment line when wish_parent_note is null', () => {
    const wishes: ChildSafeWish[] = [
      {
        id: 'w-rej-null',
        wish_text: 'დრონი',
        status: 'wish_rejected',
        wish_parent_note: null,
        correct_count: 40,
        created_at: '2026-09-29T10:00:00Z',
      },
    ];

    const { container } = render(
      <ChildWishStatusPanel
        wishes={wishes}
        loading={false}
        childId="child-1"
        onRefetch={mockOnRefetch}
      />
    );

    expect(screen.getByText('შენი სურვილი: „დრონი"')).toBeDefined();
    expect(screen.queryByText(/მშობლის კომენტარი:/)).toBeNull();
    expect(screen.getByText('დაწერე ახალი სურვილი:')).toBeDefined();
    assertNoForbiddenLiteralsInDOM(container);
  });

  it('keeps "გაგზავნა" button disabled when textarea is empty or whitespace-only', () => {
    const wishes: ChildSafeWish[] = [
      {
        id: 'w-rej-1',
        wish_text: 'ძველი სურვილი',
        status: 'wish_rejected',
        wish_parent_note: null,
        correct_count: 40,
        created_at: '2026-09-29T10:00:00Z',
      },
    ];

    const { container } = render(
      <ChildWishStatusPanel
        wishes={wishes}
        loading={false}
        childId="child-1"
        onRefetch={mockOnRefetch}
      />
    );

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    const submitBtn = screen.getByRole('button', { name: 'გაგზავნა' }) as HTMLButtonElement;

    // Initially empty (not prefilled with old wish_text) and disabled
    expect(textarea.value).toBe('');
    expect(submitBtn.disabled).toBe(true);

    // Whitespace-only -> still disabled
    fireEvent.change(textarea, { target: { value: '   ' } });
    expect(submitBtn.disabled).toBe(true);

    // Non-empty -> enabled
    fireEvent.change(textarea, { target: { value: 'ახალი სურვილი' } });
    expect(submitBtn.disabled).toBe(false);
  });

  it('calls childResubmitWish with (wishId, childId, trimmedText) on submit, calls onRefetch() on success, and preserves textarea with inline error on failure', async () => {
    const resubmitSpy = vi
      .spyOn(supabaseSyncService, 'childResubmitWish')
      .mockResolvedValueOnce({ success: false, error: 'კავშირის შეცდომა' })
      .mockResolvedValueOnce({ success: true });

    const wishes: ChildSafeWish[] = [
      {
        id: 'w-rej-submit',
        wish_text: 'ძველი სურვილი',
        status: 'wish_rejected',
        wish_parent_note: 'შეცვალე',
        correct_count: 40,
        created_at: '2026-09-29T10:00:00Z',
      },
    ];

    const { container } = render(
      <ChildWishStatusPanel
        wishes={wishes}
        loading={false}
        childId="child-1"
        onRefetch={mockOnRefetch}
      />
    );

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    const submitBtn = screen.getByRole('button', { name: 'გაგზავნა' });

    fireEvent.change(textarea, { target: { value: '  ახალი LEGO ნაკრები  ' } });
    fireEvent.click(submitBtn);

    // 1st attempt fails -> inline error shown, textarea value preserved, onRefetch not called
    await waitFor(() => {
      expect(resubmitSpy).toHaveBeenCalledWith('w-rej-submit', 'child-1', 'ახალი LEGO ნაკრები');
      expect(screen.getByText('კავშირის შეცდომა')).toBeDefined();
    });
    expect(textarea.value).toBe('  ახალი LEGO ნაკრები  ');
    expect(mockOnRefetch).not.toHaveBeenCalled();

    // 2nd attempt succeeds -> onRefetch called
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(resubmitSpy).toHaveBeenCalledTimes(2);
      expect(mockOnRefetch).toHaveBeenCalledTimes(1);
    });
  });
});
