import React, { useState } from 'react';
import { Child } from '../types';
import { CHILD_AVATARS, getAvatarEmoji } from '../hooks/useChildren';

interface ChildSelectorProps {
  childrenList: Child[];
  activeChildId: string | null;
  loading: boolean;
  onSelectChild: (child: Child) => void;
  onAddChild: (name: string, avatarId: string) => Promise<{ child: Child | null; error: Error | null }>;
  onClose?: () => void;
}

export const ChildSelector: React.FC<ChildSelectorProps> = ({
  childrenList,
  activeChildId,
  loading,
  onSelectChild,
  onAddChild,
  onClose,
}) => {
  const [isAdding, setIsAdding] = useState<boolean>(childrenList.length === 0);
  const [newChildName, setNewChildName] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('avatar_1');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildName.trim()) {
      setErrorMsg('შეიყვანეთ ბავშვის სახელი');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const { child, error } = await onAddChild(newChildName, selectedAvatar);
    setSubmitting(false);

    if (error) {
      setErrorMsg(error.message);
    } else if (child) {
      setNewChildName('');
      setIsAdding(false);
      onSelectChild(child);
      if (onClose) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-4 border-indigo-200 relative overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {onClose && childrenList.length > 0 && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
            aria-label="დახურვა"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-100 rounded-2xl mb-3 shadow-inner text-3xl">
            {isAdding ? '✨' : '🎮'}
          </div>
          <h2 className="text-2xl font-black text-indigo-950 tracking-tight">
            {isAdding ? 'ახალი ბავშვის დამატება' : 'ვინ თამაშობს?'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {isAdding
              ? 'შეიყვანეთ სახელი და აირჩიეთ სახალისო ავატარი'
              : 'აირჩიეთ ბავშვის პროფილი პროგრესის შესანახად'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <span className="animate-spin text-3xl">🔄</span>
            <span className="text-sm font-bold text-slate-500">იტვირთება...</span>
          </div>
        ) : isAdding ? (
          <form onSubmit={handleCreateChild} className="space-y-4 overflow-y-auto pr-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ბავშვის სახელი
              </label>
              <input
                type="text"
                required
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                placeholder="მაგ: თომა, ნიტა, ანდრია..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-bold text-slate-800 outline-none transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                აირჩიეთ ავატარი
              </label>
              <div className="grid grid-cols-4 gap-2.5 max-h-40 overflow-y-auto p-1.5 bg-slate-50 rounded-2xl border border-slate-200">
                {CHILD_AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar.id)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-2xl transition-all ${
                      selectedAvatar === avatar.id
                        ? 'bg-indigo-600 shadow-md scale-105 border-2 border-indigo-300'
                        : 'bg-white hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>{avatar.emoji}</span>
                    <span
                      className={`text-[10px] font-bold mt-1 leading-none ${
                        selectedAvatar === avatar.id ? 'text-white' : 'text-slate-500'
                      }`}
                    >
                      {avatar.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {childrenList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setErrorMsg(null);
                  }}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  უკან დაბრუნება
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {submitting ? 'ინახება...' : 'დამატება 🚀'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="space-y-2.5 overflow-y-auto max-h-64 pr-1 py-1">
              {childrenList.map((child) => {
                const isSelected = child.id === activeChildId;
                return (
                  <button
                    key={child.id}
                    onClick={() => {
                      onSelectChild(child);
                      if (onClose) onClose();
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all text-left ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-600 shadow-sm'
                        : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-2xl">
                        {getAvatarEmoji(child.avatar_id)}
                      </div>
                      <div>
                        <div className="text-base font-black text-slate-800">
                          {child.name}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-400">
                          {isSelected ? '⭐ აქტიური პროფილი' : 'დააჭირეთ ასარჩევად'}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-indigo-600 font-black text-lg">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(true);
                  setErrorMsg(null);
                }}
                className="w-full py-3 px-4 border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/50 text-indigo-700 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5"
              >
                <span>➕</span>
                <span>სხვა ბავშვის დამატება</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
