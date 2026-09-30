// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ParentWishInbox } from './ParentWishInbox';
import * as supabaseSyncService from '../services/supabaseSyncService';
import * as supabaseModule from '../lib/supabase';
import { Child, Wish } from '../types';

describe('ParentWishInbox Component (Wave Y Stage 3b)', () => {
  const mockRefetch = vi.fn().mockResolvedValue(undefined);
  const mockOnClose = vi.fn();

  const childrenList: Child[] = [
    {
      id: 'child-1',
      parent_id: 'parent-1',
      name: 'თომა',
      avatar_id: 'avatar_1',
      gender: 'boy',
      created_at: '2026-09-01T10:00:00Z',
    },
    {
      id: 'child-2',
      parent_id: 'parent-1',
      name: 'ნიტა',
      avatar_id: 'avatar_3',
      gender: 'girl',
      created_at: '2026-09-01T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    mockRefetch.mockClear();
    mockOnClose.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders empty state when wishes list is empty and not loading', () => {
    render(
      <ParentWishInbox
        wishes={[]}
        loading={false}
        error={null}
        refetch={mockRefetch}
        childrenList={childrenList}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('მოლოდინში სურვილი არ არის')).toBeDefined();
    fireEvent.click(screen.getByText('✕ დახურვა'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls parentApproveWish immediately when "✅ დადასტურება" is clicked on a wish_pending row and triggers refetch', async () => {
    const approveSpy = vi
      .spyOn(supabaseSyncService, 'parentApproveWish')
      .mockResolvedValue({ success: true });

    const wishes: Wish[] = [
      {
        id: 'wish-pending-1',
        child_id: 'child-1',
        wish_text: 'დრონი',
        correct_count: 40,
        status: 'wish_pending',
        proposed_image_path: null,
        created_at: '2026-09-29T10:00:00Z',
      },
    ];

    render(
      <ParentWishInbox
        wishes={wishes}
        loading={false}
        error={null}
        refetch={mockRefetch}
        childrenList={childrenList}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('თომა')).toBeDefined();
    expect(screen.getByText('✨ დრონი')).toBeDefined();

    fireEvent.click(screen.getByText('✅ დადასტურება'));

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith('wish-pending-1');
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  it('opens inline textarea on "❌ უარყოფა" and passes null (not empty string "") to parentRejectWish when textarea is left empty', async () => {
    const rejectSpy = vi
      .spyOn(supabaseSyncService, 'parentRejectWish')
      .mockResolvedValue({ success: true });

    const wishes: Wish[] = [
      {
        id: 'wish-pending-2',
        child_id: 'child-2',
        wish_text: 'სკუტერი',
        correct_count: 40,
        status: 'wish_pending',
        proposed_image_path: null,
        created_at: '2026-09-29T10:00:00Z',
      },
    ];

    render(
      <ParentWishInbox
        wishes={wishes}
        loading={false}
        error={null}
        refetch={mockRefetch}
        childrenList={childrenList}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('ნიტა')).toBeDefined();
    expect(screen.getByText('✨ სკუტერი')).toBeDefined();

    // Open inline reject textarea
    fireEvent.click(screen.getByText('❌ უარყოფა'));

    const textarea = screen.getByPlaceholderText('მიზეზი ან კომენტარი (არასავალდებულო)...');
    expect(textarea).toBeDefined();

    // Leave textarea empty (or whitespace) and click confirm reject button
    fireEvent.change(textarea, { target: { value: '   ' } });
    expect(rejectSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('დაადასტურე უარყოფა'));

    await waitFor(() => {
      expect(rejectSpy).toHaveBeenCalledWith('wish-pending-2', null);
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  it('renders signed-URL preview <img> for image_pending row via createSignedUrls and calls parentApproveImage on approve', async () => {
    const createSignedUrlsMock = vi.fn().mockResolvedValue({
      data: [
        {
          path: 'child-1/winner/robot.png',
          signedUrl: 'https://signed.example.com/child-1/winner/robot.png',
          error: null,
        },
      ],
      error: null,
    });

    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrls: createSignedUrlsMock,
        }),
      },
    } as any);

    const approveImageSpy = vi
      .spyOn(supabaseSyncService, 'parentApproveImage')
      .mockResolvedValue({ success: true });

    const wishes: Wish[] = [
      {
        id: 'wish-img-1',
        child_id: 'child-1',
        wish_text: 'LEGO რობოტი',
        correct_count: 40,
        status: 'image_pending',
        proposed_image_path: 'child-1/winner/robot.png',
        created_at: '2026-09-29T10:00:00Z',
      },
    ];

    render(
      <ParentWishInbox
        wishes={wishes}
        loading={false}
        error={null}
        refetch={mockRefetch}
        childrenList={childrenList}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      const img = screen.getByAltText('LEGO რობოტი') as HTMLImageElement;
      expect(img).toBeDefined();
      expect(img.getAttribute('src')).toBe('https://signed.example.com/child-1/winner/robot.png');
    });

    expect(createSignedUrlsMock).toHaveBeenCalledWith(['child-1/winner/robot.png'], 7200);

    fireEvent.click(screen.getByText('✅ დადასტურება'));

    await waitFor(() => {
      expect(approveImageSpy).toHaveBeenCalledWith('wish-img-1');
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  it('when signed-URL fetch fails for a specific row, shows "სურათი ვერ ჩაიტვირთა" only for that row while keeping the rest of the Inbox and Approve/Reject buttons active', async () => {
    const createSignedUrlsMock = vi.fn().mockResolvedValue({
      data: [
        {
          path: 'child-1/winner/broken.png',
          signedUrl: null,
          error: 'Object not found',
        },
        {
          path: 'child-2/winner/valid.png',
          signedUrl: 'https://signed.example.com/child-2/winner/valid.png',
          error: null,
        },
      ],
      error: null,
    });

    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrls: createSignedUrlsMock,
        }),
      },
    } as any);

    const rejectImageSpy = vi
      .spyOn(supabaseSyncService, 'parentRejectImage')
      .mockResolvedValue({ success: true });

    const wishes: Wish[] = [
      {
        id: 'wish-img-broken',
        child_id: 'child-1',
        wish_text: 'გაფუჭებული სურათის სურვილი',
        correct_count: 40,
        status: 'image_pending',
        proposed_image_path: 'child-1/winner/broken.png',
        created_at: '2026-09-29T09:00:00Z',
      },
      {
        id: 'wish-img-valid',
        child_id: 'child-2',
        wish_text: 'სწორი სურათის სურვილი',
        correct_count: 20,
        status: 'image_pending',
        proposed_image_path: 'child-2/winner/valid.png',
        created_at: '2026-09-29T10:00:00Z',
      },
    ];

    render(
      <ParentWishInbox
        wishes={wishes}
        loading={false}
        error={null}
        refetch={mockRefetch}
        childrenList={childrenList}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('სურათი ვერ ჩაიტვირთა')).toBeDefined();
      const validImg = screen.getByAltText('სწორი სურათის სურვილი') as HTMLImageElement;
      expect(validImg.getAttribute('src')).toBe('https://signed.example.com/child-2/winner/valid.png');
    });

    // Approve and Reject buttons on the failed-image row are still active and functional
    const rejectButtons = screen.getAllByText('❌ უარყოფა');
    expect(rejectButtons).toHaveLength(2);
    expect((rejectButtons[0] as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(rejectButtons[0]);
    fireEvent.click(screen.getByText('დაადასტურე უარყოფა'));

    await waitFor(() => {
      expect(rejectImageSpy).toHaveBeenCalledWith('wish-img-broken', null);
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });
});
