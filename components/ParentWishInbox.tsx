import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Child, Wish } from '../types';
import { getSupabase } from '../lib/supabase';
import {
  parentApproveWish,
  parentRejectWish,
  parentApproveImage,
  parentRejectImage,
} from '../services/supabaseSyncService';
import { getAvatarEmoji } from '../hooks/useChildren';

export interface ParentWishInboxProps {
  wishes: Wish[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  childrenList: Child[];
  onClose: () => void;
}

/**
 * Props-driven Parent Wish Inbox UI for reviewing wish_pending and image_pending wishes.
 */
export const ParentWishInbox: React.FC<ParentWishInboxProps> = ({
  wishes,
  loading,
  error,
  refetch,
  childrenList,
  onClose,
}) => {
  const [signedUrlMap, setSignedUrlMap] = useState<Map<string, string>>(() => new Map());
  const [signedUrlsLoading, setSignedUrlsLoading] = useState<boolean>(false);
  const [submittingById, setSubmittingById] = useState<Record<string, boolean>>({});
  const [rejectingById, setRejectingById] = useState<Record<string, boolean>>({});
  const [rejectNoteById, setRejectNoteById] = useState<Record<string, string>>({});
  const [rowErrorById, setRowErrorById] = useState<Record<string, string | null>>({});

  const signedReqIdRef = useRef(0);

  const sortedWishes = useMemo(() => {
    return [...wishes].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeA - timeB;
    });
  }, [wishes]);

  useEffect(() => {
    const paths: string[] = Array.from(
      new Set<string>(
        wishes
          .filter((w) => w.status === 'image_pending' && Boolean(w.proposed_image_path))
          .map((w) => w.proposed_image_path as string)
      )
    );

    if (paths.length === 0) {
      signedReqIdRef.current += 1;
      setSignedUrlMap(new Map());
      setSignedUrlsLoading(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      signedReqIdRef.current += 1;
      setSignedUrlMap(new Map());
      setSignedUrlsLoading(false);
      return;
    }

    const thisReqId = ++signedReqIdRef.current;
    setSignedUrlsLoading(true);

    (async () => {
      try {
        const { data: signedData, error: signedError } = await supabase.storage
          .from('child-reward-images')
          .createSignedUrls(paths, 7200);

        if (thisReqId !== signedReqIdRef.current) return;

        if (signedError || !signedData || !Array.isArray(signedData)) {
          setSignedUrlMap(new Map());
          setSignedUrlsLoading(false);
          return;
        }

        const nextMap = new Map<string, string>();
        for (const item of signedData) {
          if (item && !item.error && item.path && (item.signedUrl || (item as any).signedURL)) {
            nextMap.set(item.path, item.signedUrl || (item as any).signedURL);
          }
        }
        setSignedUrlMap(nextMap);
      } catch {
        if (thisReqId !== signedReqIdRef.current) return;
        setSignedUrlMap(new Map());
      } finally {
        if (thisReqId === signedReqIdRef.current) {
          setSignedUrlsLoading(false);
        }
      }
    })();
  }, [wishes]);

  const handleApprove = async (wish: Wish) => {
    setSubmittingById((prev) => ({ ...prev, [wish.id]: true }));
    setRowErrorById((prev) => ({ ...prev, [wish.id]: null }));

    try {
      const result =
        wish.status === 'image_pending'
          ? await parentApproveImage(wish.id)
          : await parentApproveWish(wish.id);

      if (result.success) {
        setRejectingById((prev) => ({ ...prev, [wish.id]: false }));
        await refetch();
      } else {
        setRowErrorById((prev) => ({
          ...prev,
          [wish.id]: result.error || 'დადასტურება ვერ მოხერხდა',
        }));
      }
    } catch (err: any) {
      setRowErrorById((prev) => ({
        ...prev,
        [wish.id]: err?.message || 'დადასტურება ვერ მოხერხდა',
      }));
    } finally {
      setSubmittingById((prev) => ({ ...prev, [wish.id]: false }));
    }
  };

  const handleConfirmReject = async (wish: Wish) => {
    setSubmittingById((prev) => ({ ...prev, [wish.id]: true }));
    setRowErrorById((prev) => ({ ...prev, [wish.id]: null }));

    const rawNote = rejectNoteById[wish.id] ?? '';
    const trimmed = rawNote.trim();
    const noteOrNull = trimmed.length > 0 ? trimmed : null;

    try {
      const result =
        wish.status === 'image_pending'
          ? await parentRejectImage(wish.id, noteOrNull)
          : await parentRejectWish(wish.id, noteOrNull);

      if (result.success) {
        setRejectingById((prev) => ({ ...prev, [wish.id]: false }));
        setRejectNoteById((prev) => {
          const next = { ...prev };
          delete next[wish.id];
          return next;
        });
        await refetch();
      } else {
        setRowErrorById((prev) => ({
          ...prev,
          [wish.id]: result.error || 'უარყოფა ვერ მოხერხდა',
        }));
      }
    } catch (err: any) {
      setRowErrorById((prev) => ({
        ...prev,
        [wish.id]: err?.message || 'უარყოფა ვერ მოხერხდა',
      }));
    } finally {
      setSubmittingById((prev) => ({ ...prev, [wish.id]: false }));
    }
  };

  const renderHeader = () => (
    <div className="flex justify-between items-center border-b pb-4">
      <h2 className="text-2xl font-black text-indigo-900 flex items-center gap-2">
        📬 სურვილების ყუთი
      </h2>
      <button
        type="button"
        onClick={onClose}
        className="text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full text-sm font-bold transition-all"
        aria-label="დახურვა"
      >
        ✕ დახურვა
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 border-b-8 border-indigo-200">
        {renderHeader()}
        <div className="text-center py-12 space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-indigo-800 font-semibold text-sm">იტვირთება სურვილები...</p>
        </div>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 border-b-8 border-indigo-200">
        {renderHeader()}
        <div className="text-center py-10 space-y-4">
          <div className="text-rose-600 font-semibold text-base">შეცდომა: {error}</div>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all text-sm inline-flex items-center gap-2"
          >
            ხელახლა ცდა
          </button>
        </div>
      </div>
    );
  }

  if (sortedWishes.length === 0) {
    return (
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 border-b-8 border-indigo-200">
        {renderHeader()}
        <div className="text-center py-12 text-gray-500 font-medium">
          მოლოდინში სურვილი არ არის
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 border-b-8 border-indigo-200 max-h-[90vh] overflow-y-auto">
      {renderHeader()}

      <div className="space-y-4">
        {sortedWishes.map((wish) => {
          const child = childrenList.find((c) => c.id === wish.child_id);
          const childName = child?.name || 'უცნობი ბავშვი';
          const isSubmitting = Boolean(submittingById[wish.id]);
          const isRejecting = Boolean(rejectingById[wish.id]);
          const rowError = rowErrorById[wish.id];
          const isImageReview = wish.status === 'image_pending';
          const signedUrl =
            isImageReview && wish.proposed_image_path
              ? signedUrlMap.get(wish.proposed_image_path)
              : undefined;

          return (
            <div
              key={wish.id}
              className="border border-indigo-100 bg-indigo-50/40 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-black text-indigo-900">
                    {child && <span>{getAvatarEmoji(child.avatar_id)}</span>}
                    <span>{childName}</span>
                  </div>
                  <div className="text-base font-bold text-gray-900 break-words">
                    ✨ {wish.wish_text}
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-700 shrink-0">
                  {isImageReview ? '🖼️ სურათის შემოწმება' : '📝 ახალი სურვილი'}
                </span>
              </div>

              {isImageReview && (
                <div className="pt-1">
                  {signedUrlsLoading ? (
                    <div className="text-xs text-gray-500 py-4 text-center">
                      იტვირთება სურათი...
                    </div>
                  ) : signedUrl ? (
                    <img
                      src={signedUrl}
                      alt={wish.wish_text}
                      className="w-full max-h-64 object-contain rounded-xl border border-indigo-100 bg-white"
                    />
                  ) : (
                    <div className="text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                      სურათი ვერ ჩაიტვირთა
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleApprove(wish)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold transition-all"
                >
                  ✅ დადასტურება
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    setRejectingById((prev) => ({ ...prev, [wish.id]: !prev[wish.id] }))
                  }
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-bold transition-all"
                >
                  ❌ უარყოფა
                </button>
              </div>

              {isRejecting && (
                <div className="space-y-2 pt-2 border-t border-indigo-100">
                  <textarea
                    rows={2}
                    value={rejectNoteById[wish.id] ?? ''}
                    onChange={(e) =>
                      setRejectNoteById((prev) => ({ ...prev, [wish.id]: e.target.value }))
                    }
                    disabled={isSubmitting}
                    placeholder="მიზეზი ან კომენტარი (არასავალდებულო)..."
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleConfirmReject(wish)}
                      className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white text-xs font-bold transition-all"
                    >
                      დაადასტურე უარყოფა
                    </button>
                  </div>
                </div>
              )}

              {rowError && (
                <div className="text-xs font-bold text-rose-600 pt-1">{rowError}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
