import React, { useState } from 'react';
import { Child } from '../types';
import { CHILD_AVATARS, GENDER_OPTIONS } from '../hooks/useChildren';
import { isValidChildName } from '../utils/childNameValidator';
import { hashPin, isValidPinFormat } from '../utils/pinHash';
import { isPinTaken } from '../utils/pinUniqueness';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '../lib/supabase';

interface ChildSelectorProps {
  childrenList: Child[];
  activeChildId: string | null;
  loading: boolean;
  childrenReady: boolean;
  onSelectChild: (child: Child) => void;
  onAddChild: (name: string, avatarId: string, gender: 'boy' | 'girl', pin: string) => Promise<{ child: Child | null; error: Error | null }>;
  onClose?: () => void;
}

export const ChildSelector: React.FC<ChildSelectorProps> = ({
  loading,
  onSelectChild,
  onAddChild,
  onClose,
}) => {
  let user: any = null;
  try {
    const auth = useAuth();
    user = auth.user;
  } catch {
    // Graceful fallback when rendered outside AuthProvider (e.g. isolated unit tests)
  }
  const [newChildName, setNewChildName] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<'boy' | 'girl' | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('avatar_1');
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedName = newChildName.trim();
    if (!normalizedName) {
      setErrorMsg('შეიყვანეთ ბავშვის სახელი');
      return;
    }
    if (!isValidChildName(normalizedName)) {
      setErrorMsg('სახელი უნდა შეიცავდეს მხოლოდ ქართულ ასოებს (დასაშვებია დეფისი და გამოტოვება)');
      return;
    }
    if (!selectedGender) {
      setErrorMsg('აირჩიეთ სქესი');
      return;
    }

    if (!isValidPinFormat(pin)) {
      setErrorMsg('PIN კოდი უნდა შედგებოდეს ზუსტად 4 ციფრისგან');
      return;
    }

    if (pin !== confirmPin) {
      setErrorMsg('PIN კოდები არ ემთხვევა ერთმანეთს');
      return;
    }

    const candidateHash = await hashPin(pin);

    // Uniqueness check scoped strictly to current parent's profiles.pin_hash + own children's pin_hashes
    let existingHashes: (string | null | undefined)[] = [];
    const supabase = getSupabase();
    if (supabase && user) {
      try {
        const [parentRes, childrenRes] = await Promise.all([
          supabase.from('profiles').select('pin_hash').eq('id', user.id).maybeSingle(),
          supabase.from('children').select('pin_hash').eq('parent_id', user.id),
        ]);
        const parentHash = parentRes.data?.pin_hash;
        const childHashes = (childrenRes.data || []).map((c: any) => c.pin_hash);
        existingHashes = [parentHash, ...childHashes];
      } catch {
        // Fallback: proceed
      }
    }

    if (isPinTaken(candidateHash, existingHashes)) {
      setErrorMsg('ეს PIN უკვე გამოყენებულია. აირჩიეთ განსხვავებული PIN.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const { child, error } = await onAddChild(normalizedName, selectedAvatar, selectedGender, candidateHash);
    setSubmitting(false);

    if (error) {
      setErrorMsg(error.message);
    } else if (child) {
      setNewChildName('');
      setSelectedGender(null);
      setPin('');
      setConfirmPin('');
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
        {onClose && (
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
            ✨
          </div>
          <h2 className="text-2xl font-black text-indigo-950 tracking-tight">
            ახალი ბავშვის დამატება
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            შეიყვანეთ სახელი, აირჩიეთ სქესი და ავატარი
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
        ) : (
          <form onSubmit={handleCreateChild} noValidate className="space-y-4 overflow-y-auto pr-1">
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
                აირჩიეთ სქესი
              </label>
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-50 rounded-2xl border border-slate-200">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedGender(opt.id)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-2xl transition-all ${
                      selectedGender === opt.id
                        ? 'bg-indigo-600 shadow-md scale-105 border-2 border-indigo-300'
                        : 'bg-white hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    <span
                      className={`text-xs font-bold mt-1 leading-none ${
                        selectedGender === opt.id ? 'text-white' : 'text-slate-500'
                      }`}
                    >
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ბავშვის 4-ციფრიანი PIN კოდი
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                required
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPin(val);
                }}
                placeholder="••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium text-slate-800 outline-none transition-all tracking-widest text-center"
              />
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                ამ PIN-ით ბავშვი შევა თავის პროფილში
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                გაიმეორეთ PIN კოდი
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                required
                value={confirmPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setConfirmPin(val);
                }}
                placeholder="••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium text-slate-800 outline-none transition-all tracking-widest text-center"
              />
            </div>

            <div className="flex gap-2 pt-2">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  გაუქმება
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
        )}
      </div>
    </div>
  );
};
