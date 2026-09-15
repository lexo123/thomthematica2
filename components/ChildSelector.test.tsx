// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ChildSelector } from './ChildSelector';
import { Child } from '../types';

describe('ChildSelector - first mode race condition fixes', () => {
  afterEach(() => {
    cleanup();
  });

  const mockChild1: Child = {
    id: 'child-1',
    parent_id: 'parent-1',
    name: 'თომა',
    avatar_id: 'avatar_1',
    gender: 'boy',
    created_at: '2026-01-01T00:00:00Z',
  };

  const mockChild2: Child = {
    id: 'child-2',
    parent_id: 'parent-1',
    name: 'ნიტა',
    avatar_id: 'avatar_2',
    gender: 'girl',
    created_at: '2026-01-02T00:00:00Z',
  };

  // Test 1: childrenReady=false → children=[child] მოგვიანებით → childrenReady=true → EXPECT: selection UI, არა add ფორმა
  it('displays selection UI and not add form when children load after initial render (childrenReady: false -> true)', () => {
    const onSelectChild = vi.fn();
    const onAddChild = vi.fn();

    const { rerender } = render(
      <ChildSelector
        childrenList={[]}
        activeChildId={null}
        loading={false}
        childrenReady={false}
        onSelectChild={onSelectChild}
        onAddChild={onAddChild}
      />
    );

    // Initial render with childrenReady=false: mode is not initialized yet, add form is not active
    expect(screen.queryByText('ახალი ბავშვის დამატება')).toBeNull();

    // Later: children data arrives and childrenReady becomes true
    rerender(
      <ChildSelector
        childrenList={[mockChild1]}
        activeChildId={null}
        loading={false}
        childrenReady={true}
        onSelectChild={onSelectChild}
        onAddChild={onAddChild}
      />
    );

    // EXPECT: Selection UI is displayed, NOT add form
    expect(screen.getByText('ვინ თამაშობს?')).toBeDefined();
    expect(screen.getByText('თომა')).toBeDefined();
    expect(screen.getByText('სხვა ბავშვის დამატება')).toBeDefined();
    expect(screen.queryByText('ახალი ბავშვის დამატება')).toBeNull();
  });

  // Test 2: childrenReady=true თავიდანვე, children=[] → EXPECT: add ფორმა
  it('displays add form immediately when childrenReady=true from start and children=[]', () => {
    const onSelectChild = vi.fn();
    const onAddChild = vi.fn();

    render(
      <ChildSelector
        childrenList={[]}
        activeChildId={null}
        loading={false}
        childrenReady={true}
        onSelectChild={onSelectChild}
        onAddChild={onAddChild}
      />
    );

    // EXPECT: Add form is displayed
    expect(screen.getByText('ახალი ბავშვის დამატება')).toBeDefined();
    expect(screen.getByText('შეიყვანეთ სახელი, აირჩიეთ სქესი და ავატარი')).toBeDefined();
    expect(screen.getByPlaceholderText('მაგ: თომა, ნიტა, ანდრია...')).toBeDefined();
    expect(screen.queryByText('ვინ თამაშობს?')).toBeNull();
  });

  // Test 3: children არსებობს, მომხმარებელი ირჩევს "დამატება", შემდეგ childrenList იცვლება (მაგ. ახალი ბავშვი ემატება) → EXPECT: კვლავ add რეჟიმშია (არ დაბრუნდა selection-ში)
  it('remains in add mode when childrenList changes after user manually selects add mode', () => {
    const onSelectChild = vi.fn();
    const onAddChild = vi.fn();

    const { rerender } = render(
      <ChildSelector
        childrenList={[mockChild1]}
        activeChildId={null}
        loading={false}
        childrenReady={true}
        onSelectChild={onSelectChild}
        onAddChild={onAddChild}
      />
    );

    // Initially in selection mode
    expect(screen.getByText('ვინ თამაშობს?')).toBeDefined();

    // User clicks "სხვა ბავშვის დამატება"
    const addBtn = screen.getByText('სხვა ბავშვის დამატება');
    fireEvent.click(addBtn);

    // Now in add form mode
    expect(screen.getByText('ახალი ბავშვის დამატება')).toBeDefined();

    // Background update or new child added arrives in childrenList
    rerender(
      <ChildSelector
        childrenList={[mockChild1, mockChild2]}
        activeChildId={null}
        loading={false}
        childrenReady={true}
        onSelectChild={onSelectChild}
        onAddChild={onAddChild}
      />
    );

    // EXPECT: Still in add mode, does not flip back to selection mode
    expect(screen.getByText('ახალი ბავშვის დამატება')).toBeDefined();
    expect(screen.getByPlaceholderText('მაგ: თომა, ნიტა, ანდრია...')).toBeDefined();
    expect(screen.queryByText('ვინ თამაშობს?')).toBeNull();
  });
});
