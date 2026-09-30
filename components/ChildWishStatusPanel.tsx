import React, { useState } from 'react';
import { ChildSafeWish, childResubmitWish } from '../services/supabaseSyncService';

export interface ChildWishStatusPanelProps {
  wishes: ChildSafeWish[];
  loading: boolean;
  childId: string;
  onRefetch: () => Promise<void>;
}

const PENDING_STATUSES: ReadonlyArray<ChildSafeWish['status']> = [
  'wish_pending',
  'wish_approved',
  'image_pending',
  'image_approved',
  'image_rejected',
];

export const ChildWishStatusPanel: React.FC<ChildWishStatusPanelProps> = ({
  wishes,
  loading,
  childId,
  onRefetch,
}) => {
  const [draftById, setDraftById] = useState<Record<string, string>>({});
  const [submittingById, setSubmittingById] = useState<Record<string, boolean>>({});
  const [errorById, setErrorById] = useState<Record<string, string | null>>({});

  if (loading) {
    return null;
  }

  const rejected = wishes.filter((w) => w.status === 'wish_rejected');
  const pendingCount = wishes.filter((w) => PENDING_STATUSES.includes(w.status)).length;

  if (rejected.length === 0 && pendingCount === 0) {
    return null;
  }

  const handleSubmit = async (wishId: string) => {
    const rawValue = draftById[wishId] ?? '';
    const trimmed = rawValue.trim();
    if (!trimmed || submittingById[wishId]) return;

    setSubmittingById((prev) => ({ ...prev, [wishId]: true }));
    setErrorById((prev) => ({ ...prev, [wishId]: null }));

    try {
      const result = await childResubmitWish(wishId, childId, trimmed);
      if (result.success) {
        await onRefetch();
      } else {
        setErrorById((prev) => ({
          ...prev,
          [wishId]: result.error || 'გაგზავნა ვერ მოხერხდა',
        }));
      }
    } catch (err: any) {
      setErrorById((prev) => ({
        ...prev,
        [wishId]: err?.message || 'გაგზავნა ვერ მოხერხდა',
      }));
    } finally {
      setSubmittingById((prev) => ({ ...prev, [wishId]: false }));
    }
  };

  return (
    <div className="space-y-3 text-left">
      {rejected.map((wish) => {
        const draftValue = draftById[wish.id] ?? '';
        const isSubmitting = Boolean(submittingById[wish.id]);
        const isDisabled = draftValue.trim().length === 0 || isSubmitting;
        const rowError = errorById[wish.id];

        return (
          <div
            key={wish.id}
            className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-2.5"
          >
            <div className="text-sm font-black text-amber-950 break-words">
              {`შენი სურვილი: „${wish.wish_text}"`}
            </div>

            {wish.wish_parent_note !== null && wish.wish_parent_note !== '' && (
              <div className="text-xs font-bold text-amber-800 bg-amber-100/70 rounded-xl px-3 py-2 break-words">
                {`მშობლის კომენტარი: ${wish.wish_parent_note}`}
              </div>
            )}

            <div className="text-xs font-bold text-indigo-900 pt-1">
              დაწერე ახალი სურვილი:
            </div>

            <textarea
              rows={2}
              value={draftValue}
              onChange={(e) =>
                setDraftById((prev) => ({ ...prev, [wish.id]: e.target.value }))
              }
              disabled={isSubmitting}
              className="w-full rounded-xl border border-amber-300 bg-white p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex items-center justify-end">
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => handleSubmit(wish.id)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black transition-all"
              >
                გაგზავნა
              </button>
            </div>

            {rowError && (
              <div className="text-xs font-bold text-rose-600 pt-1">
                {rowError}
              </div>
            )}
          </div>
        );
      })}

      {pendingCount > 0 && (
        <div className="text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-xl px-3.5 py-2.5 text-center">
          {`${pendingCount} სურვილი მშობელთან გაიგზავნა`}
        </div>
      )}
    </div>
  );
};
