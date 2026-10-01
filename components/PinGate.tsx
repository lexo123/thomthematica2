import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../contexts/AuthContext';
import { useChild } from '../contexts/ChildContext';
import { useSessionMode } from '../contexts/SessionModeContext';
import { getSupabase, cleanUrl, cleanKey } from '../lib/supabase';
import { hashPin, isValidPinFormat } from '../utils/pinHash';
import { getAvatarEmoji } from '../hooks/useChildren';

type IdentityChildMeta = {
  id: string;
  name: string;
  avatar_id: string;
};

type SelectedIdentity =
  | { type: 'parent' }
  | { type: 'child'; childId: string; childName: string };

export type ParentPinStatus = 'has_pin' | 'no_pin' | 'error';

/**
 * Fail-closed derivation of parent PIN status from profiles.pin_hash query result:
 * - Any query error -> 'error'
 * - Missing row (data === null / undefined, even when error === null) -> 'error'
 * - Existing row with pin_hash === null or '' -> 'no_pin'
 * - Existing row with non-empty string pin_hash -> 'has_pin'
 */
export function deriveParentPinStatus(
  data: { pin_hash?: string | null } | null | undefined,
  error: unknown
): ParentPinStatus {
  if (error !== null && error !== undefined) {
    return 'error';
  }
  if (data === null || data === undefined) {
    return 'error';
  }
  if (data.pin_hash === null || data.pin_hash === undefined || data.pin_hash === '') {
    return 'no_pin';
  }
  if (typeof data.pin_hash === 'string' && data.pin_hash.length > 0) {
    return 'has_pin';
  }
  return 'error';
}

export const PinGate: React.FC = () => {
  const { user, signOut } = useAuth();
  const { setActiveChildId } = useChild();
  const { setSessionMode, resetSessionMode } = useSessionMode();

  const [selectedIdentity, setSelectedIdentity] = useState<SelectedIdentity | null>(null);
  const [parentFullName, setParentFullName] = useState<string>('');
  const [childrenMeta, setChildrenMeta] = useState<IdentityChildMeta[]>([]);
  const [metadataLoading, setMetadataLoading] = useState<boolean>(false);

  // Stage 2 parent PIN status (3-state result only; hash value is never stored in state)
  const [parentPinStatus, setParentPinStatus] = useState<ParentPinStatus | null>(null);
  const parentPinReqIdRef = useRef(0);

  // Parent NULL PIN setup local states
  const [passwordVerified, setPasswordVerified] = useState<boolean>(false);
  const [setupPassword, setSetupPassword] = useState<string>('');
  const [setupPin, setSetupPin] = useState<string>('');
  const [setupConfirmPin, setSetupConfirmPin] = useState<string>('');
  const [setupSubmitting, setSetupSubmitting] = useState<boolean>(false);

  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Stage 1: Fetch ONLY identity metadata (profiles.full_name and children id, name, avatar_id), NOT pin_hash
  useEffect(() => {
    let isCancelled = false;

    const fetchIdentityMetadata = async () => {
      if (!user) {
        if (!isCancelled) {
          setParentFullName('');
          setChildrenMeta([]);
        }
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        return;
      }

      setMetadataLoading(true);
      try {
        const [profileRes, childrenRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('children')
            .select('id, name, avatar_id')
            .eq('parent_id', user.id),
        ]);

        if (isCancelled) return;

        const fetchedName =
          !profileRes.error && typeof profileRes.data?.full_name === 'string'
            ? profileRes.data.full_name.trim()
            : '';
        setParentFullName(fetchedName);

        const fetchedChildren =
          !childrenRes.error && Array.isArray(childrenRes.data)
            ? (childrenRes.data as IdentityChildMeta[])
            : [];
        setChildrenMeta(fetchedChildren);
      } catch {
        if (!isCancelled) {
          setParentFullName('');
          setChildrenMeta([]);
        }
      } finally {
        if (!isCancelled) {
          setMetadataLoading(false);
        }
      }
    };

    fetchIdentityMetadata();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  // Stage 2 (Parent): Read profiles.pin_hash once on entering parent Stage 2
  useEffect(() => {
    if (selectedIdentity?.type !== 'parent') {
      setParentPinStatus(null);
      return;
    }

    let isCancelled = false;
    const currentReqId = ++parentPinReqIdRef.current;

    const checkParentPinStatus = async () => {
      if (!user) {
        if (!isCancelled && currentReqId === parentPinReqIdRef.current) {
          setParentPinStatus('error');
        }
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        if (!isCancelled && currentReqId === parentPinReqIdRef.current) {
          setParentPinStatus('error');
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('pin_hash')
          .eq('id', user.id)
          .maybeSingle();

        if (isCancelled || currentReqId !== parentPinReqIdRef.current) return;

        const status = deriveParentPinStatus(data, error);
        setParentPinStatus(status);
      } catch {
        if (!isCancelled && currentReqId === parentPinReqIdRef.current) {
          setParentPinStatus('error');
        }
      }
    };

    checkParentPinStatus();

    return () => {
      isCancelled = true;
    };
  }, [selectedIdentity, user]);

  // Focus hidden input when entering Stage 2 PIN keypad
  useEffect(() => {
    if (selectedIdentity && (selectedIdentity.type === 'child' || parentPinStatus === 'has_pin' || parentPinStatus === null)) {
      inputRef.current?.focus();
    }
  }, [selectedIdentity, parentPinStatus]);

  const parentDisplayName = parentFullName || 'მშობელი';
  const selectedIdentityName =
    selectedIdentity?.type === 'parent'
      ? parentDisplayName
      : selectedIdentity?.type === 'child'
      ? selectedIdentity.childName
      : '';

  const resetSetupState = () => {
    setPasswordVerified(false);
    setSetupPassword('');
    setSetupPin('');
    setSetupConfirmPin('');
    setSetupSubmitting(false);
  };

  const handleSelectIdentity = (identity: SelectedIdentity) => {
    setSelectedIdentity(identity);
    setParentPinStatus(null);
    resetSetupState();
    setPin('');
    setErrorMsg(null);
  };

  const handleBackToStage1 = () => {
    parentPinReqIdRef.current += 1;
    setSelectedIdentity(null);
    setParentPinStatus(null);
    resetSetupState();
    setPin('');
    setErrorMsg(null);
  };

  const handleDigitClick = (digit: string) => {
    setPin(prev => {
      if (prev.length >= 4) return prev;
      const nextPin = prev + digit;
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
      return nextPin;
    });
    setErrorMsg(null);
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg(null);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg(null);
    inputRef.current?.focus();
  };

  const verifyPin = async (candidatePin: string) => {
    if (!selectedIdentity || !user) return;

    if (!isValidPinFormat(candidatePin)) {
      setErrorMsg('შეიყვანეთ 4-ციფრიანი PIN');
      setPin('');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const supabase = getSupabase();
      if (!supabase) {
        if (selectedIdentity.type === 'parent') {
          setParentPinStatus('error');
        } else {
          setErrorMsg('შემოწმება ვერ მოხერხდა, სცადეთ თავიდან');
        }
        setPin('');
        return;
      }

      const candidateHash = await hashPin(candidatePin);

      if (selectedIdentity.type === 'parent') {
        const { data, error } = await supabase
          .from('profiles')
          .select('pin_hash')
          .eq('id', user.id)
          .maybeSingle();

        const status = deriveParentPinStatus(data, error);
        if (status === 'error') {
          setParentPinStatus('error');
          setPin('');
          return;
        }
        if (status === 'no_pin') {
          setParentPinStatus('no_pin');
          setPin('');
          return;
        }

        const targetHash = typeof data?.pin_hash === 'string' ? data.pin_hash : null;
        if (targetHash && targetHash.length > 0 && candidateHash === targetHash) {
          setSessionMode('parent');
          return;
        }
      } else {
        const { data, error } = await supabase
          .from('children')
          .select('pin_hash')
          .eq('id', selectedIdentity.childId)
          .maybeSingle();

        if (error || !data) {
          setErrorMsg('შემოწმება ვერ მოხერხდა, სცადეთ თავიდან');
          setPin('');
          inputRef.current?.focus();
          return;
        }

        const targetHash = typeof data.pin_hash === 'string' ? data.pin_hash : '';
        if (targetHash.length === 0) {
          setErrorMsg('ამ ბავშვს PIN არ აქვს დაყენებული. გთხოვეთ მშობელს.');
          setPin('');
          inputRef.current?.focus();
          return;
        }

        if (candidateHash === targetHash) {
          // Synchronously set both in the same event handler to eliminate intermediate states
          setActiveChildId(selectedIdentity.childId);
          setSessionMode('child');
          return;
        }
      }

      setErrorMsg(`არასწორი PIN ${selectedIdentityName}-სთვის`);
      setPin('');
      inputRef.current?.focus();
    } catch {
      if (selectedIdentity.type === 'parent') {
        setParentPinStatus('error');
      } else {
        setErrorMsg('შემოწმება ვერ მოხერხდა, სცადეთ თავიდან');
      }
      setPin('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length === 4) {
      verifyPin(pin);
    }
  };

  const handleVerifySetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) {
      setErrorMsg('მომხმარებლის ელფოსტა ვერ მოიძებნა');
      return;
    }
    if (!setupPassword) {
      setErrorMsg('შეიყვანეთ ანგარიშის პაროლი');
      return;
    }

    setSetupSubmitting(true);
    setErrorMsg(null);

    try {
      const tempClient = createClient(cleanUrl, cleanKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      const { error } = await tempClient.auth.signInWithPassword({
        email: user.email,
        password: setupPassword,
      });

      if (error) {
        setErrorMsg('არასწორი პაროლი');
        return;
      }

      setPasswordVerified(true);
      setSetupPassword('');
      setErrorMsg(null);
    } catch {
      setErrorMsg('არასწორი პაროლი');
    } finally {
      setSetupSubmitting(false);
    }
  };

  const handleSaveNewParentPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !passwordVerified) return;

    if (!isValidPinFormat(setupPin)) {
      setErrorMsg('PIN კოდი უნდა შედგებოდეს ზუსტად 4 ციფრისგან');
      return;
    }

    if (setupPin !== setupConfirmPin) {
      setErrorMsg('PIN კოდები არ ემთხვევა ერთმანეთს');
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setErrorMsg('PIN-ის შენახვა ვერ მოხერხდა, სცადეთ თავიდან');
      return;
    }

    setSetupSubmitting(true);
    setErrorMsg(null);

    try {
      const newPinHash = await hashPin(setupPin);
      const { data: updatedRows, error: updateError } = await supabase
        .from('profiles')
        .update({ pin_hash: newPinHash })
        .eq('id', user.id)
        .select('id');

      if (updateError !== null || !Array.isArray(updatedRows) || updatedRows.length !== 1) {
        setErrorMsg('PIN-ის შენახვა ვერ მოხერხდა, სცადეთ თავიდან');
        return;
      }

      // Return to regular Stage 2 PIN-entry so parent enters the newly set PIN
      resetSetupState();
      setPin('');
      setErrorMsg(null);
      setParentPinStatus('has_pin');
    } catch {
      setErrorMsg('PIN-ის შენახვა ვერ მოხერხდა, სცადეთ თავიდან');
    } finally {
      setSetupSubmitting(false);
    }
  };

  const handleLogout = async () => {
    resetSessionMode();
    setActiveChildId(null);
    await signOut();
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-indigo-100 to-purple-200 flex flex-col items-center justify-center p-4 relative animate-fadeIn select-none">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 sm:p-8 text-center border-4 border-indigo-200 relative flex flex-col items-center">
        {selectedIdentity === null ? (
          /* Stage 1 — ვინ შედის (Identity List) */
          <>
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner mb-4">
              👋
            </div>

            <h1 className="text-2xl font-black text-indigo-950 tracking-tight">
              ვინ შედის?
            </h1>
            <p className="text-xs text-slate-500 mt-1 mb-6 font-medium">
              აირჩიეთ პროფილი და შეიყვანეთ შესაბამისი PIN
            </p>

            {metadataLoading ? (
              <div className="py-8 text-sm font-bold text-slate-500">
                იტვირთება...
              </div>
            ) : (
              <div className="w-full space-y-2.5 mb-6 max-h-72 overflow-y-auto pr-1">
                {/* Parent Identity Item */}
                <button
                  type="button"
                  onClick={() => handleSelectIdentity({ type: 'parent' })}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/70 hover:border-indigo-400 transition-all text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white border border-indigo-200 shadow-sm flex items-center justify-center text-2xl shrink-0">
                      👨‍👩‍👧‍👦
                    </div>
                    <div className="min-w-0">
                      <div className="text-base font-black text-indigo-950 truncate">
                        {parentDisplayName}
                      </div>
                      <div className="text-[11px] font-semibold text-indigo-600">
                        მშობლის რეჟიმი
                      </div>
                    </div>
                  </div>
                  <span className="text-indigo-500 font-black text-lg shrink-0">→</span>
                </button>

                {/* Children Identity Items */}
                {childrenMeta.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() =>
                      handleSelectIdentity({
                        type: 'child',
                        childId: child.id,
                        childName: child.name,
                      })
                    }
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-300 transition-all text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-2xl shrink-0">
                        {getAvatarEmoji(child.avatar_id)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-black text-slate-800 truncate">
                          {child.name}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-400">
                          მოთამაშე
                        </div>
                      </div>
                    </div>
                    <span className="text-slate-400 font-black text-lg shrink-0">→</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : selectedIdentity.type === 'parent' && parentPinStatus === 'error' ? (
          /* Stage 2 (Parent) — Fail-Closed Error State */
          <>
            <div className="w-full flex justify-start mb-2">
              <button
                type="button"
                onClick={handleBackToStage1}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
              >
                ← უკან
              </button>
            </div>

            <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner mb-4">
              ⚠️
            </div>

            <div className="w-full mb-6 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
              შემოწმება ვერ მოხერხდა, სცადეთ თავიდან
            </div>
          </>
        ) : selectedIdentity.type === 'parent' && parentPinStatus === 'no_pin' ? (
          /* Stage 2 (Parent) — NULL PIN First-Time Setup Flow */
          <>
            <div className="w-full flex justify-start mb-2">
              <button
                type="button"
                onClick={handleBackToStage1}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
              >
                ← უკან
              </button>
            </div>

            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner mb-4">
              🔑
            </div>

            <h1 className="text-2xl font-black text-indigo-950 tracking-tight">
              მშობლის PIN-ის დაყენება
            </h1>
            <p className="text-xs text-slate-500 mt-1 mb-6 font-medium">
              {passwordVerified
                ? 'შეიყვანეთ ახალი 4-ციფრიანი PIN კოდი'
                : 'უსაფრთხოებისთვის შეიყვანეთ ანგარიშის პაროლი'}
            </p>

            {errorMsg && (
              <div className="w-full mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold animate-shake">
                {errorMsg}
              </div>
            )}

            {!passwordVerified ? (
              <form onSubmit={handleVerifySetupPassword} className="w-full space-y-4 mb-4">
                <input
                  type="password"
                  value={setupPassword}
                  onChange={(e) => {
                    setSetupPassword(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="ანგარიშის პაროლი"
                  aria-label="ანგარიშის პაროლი"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium text-slate-800 outline-none transition-all"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={setupSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-sm rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {setupSubmitting ? 'მოწმდება...' : 'პაროლის დადასტურება'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSaveNewParentPin} className="w-full space-y-4 mb-4">
                <div>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={setupPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setSetupPin(val);
                      setErrorMsg(null);
                    }}
                    placeholder="ახალი PIN"
                    aria-label="ახალი PIN კოდი"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium text-slate-800 outline-none transition-all tracking-widest text-center"
                    autoFocus
                  />
                </div>
                <div>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={setupConfirmPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setSetupConfirmPin(val);
                      setErrorMsg(null);
                    }}
                    placeholder="გაიმეორეთ PIN"
                    aria-label="გაიმეორეთ PIN კოდი"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium text-slate-800 outline-none transition-all tracking-widest text-center"
                  />
                </div>
                <button
                  type="submit"
                  disabled={setupSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-sm rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {setupSubmitting ? 'ინახება...' : 'PIN-ის შენახვა'}
                </button>
              </form>
            )}
          </>
        ) : (
          /* Stage 2 — PIN Entry (scoped to selected identity) */
          <>
            <div className="w-full flex justify-start mb-2">
              <button
                type="button"
                onClick={handleBackToStage1}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
              >
                ← უკან
              </button>
            </div>

            {/* Header Icon */}
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner mb-4">
              🔐
            </div>

            <h1 className="text-2xl font-black text-indigo-950 tracking-tight">
              შეიყვანეთ {selectedIdentityName}-ის PIN
            </h1>
            <p className="text-xs text-slate-500 mt-1 mb-6 font-medium">
              შეიყვანეთ 4-ციფრიანი PIN გასაგრძელებლად
            </p>

            {/* Error message */}
            {errorMsg && (
              <div className="w-full mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold animate-shake">
                {errorMsg}
              </div>
            )}

            {/* Hidden HTML input for keyboard accessibility & mobile numeric virtual keyboard */}
            <form onSubmit={handleFormSubmit} className="w-full flex flex-col items-center">
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPin(val);
                  setErrorMsg(null);
                  if (val.length === 4) {
                    verifyPin(val);
                  }
                }}
                aria-label="PIN კოდი"
                className="sr-only"
                autoFocus
              />

              {/* 4 PIN Dots / Digits Display */}
              <div 
                className="flex justify-center gap-4 mb-6 cursor-pointer"
                onClick={() => inputRef.current?.focus()}
              >
                {[0, 1, 2, 3].map((index) => {
                  const isFilled = index < pin.length;
                  return (
                    <div
                      key={index}
                      className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all ${
                        isFilled
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm scale-105'
                          : 'border-slate-300 bg-slate-50 text-transparent'
                      }`}
                    >
                      {isFilled ? '●' : '○'}
                    </div>
                  );
                })}
              </div>

              {/* Numeric Keypad for Kids & Touchscreens */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-6">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    disabled={loading}
                    onClick={() => handleDigitClick(digit)}
                    className="h-14 bg-slate-50 hover:bg-indigo-50 active:bg-indigo-100 active:scale-95 border-2 border-slate-200 hover:border-indigo-300 text-indigo-950 font-black text-xl rounded-2xl transition-all shadow-sm flex items-center justify-center disabled:opacity-50"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={loading || pin.length === 0}
                  onClick={handleClear}
                  className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 font-bold text-xs rounded-2xl transition-all flex items-center justify-center disabled:opacity-30"
                  title="გასუფთავება"
                >
                  გასუფთავება
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDigitClick('0')}
                  className="h-14 bg-slate-50 hover:bg-indigo-50 active:bg-indigo-100 active:scale-95 border-2 border-slate-200 hover:border-indigo-300 text-indigo-950 font-black text-xl rounded-2xl transition-all shadow-sm flex items-center justify-center disabled:opacity-50"
                >
                  0
                </button>
                <button
                  type="button"
                  disabled={loading || pin.length === 0}
                  onClick={handleBackspace}
                  className="h-14 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 font-black text-lg rounded-2xl transition-all flex items-center justify-center disabled:opacity-30"
                  title="წაშლა"
                >
                  ⌫
                </button>
              </div>

              {/* Submit button when 4 digits entered */}
              {pin.length === 4 && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-sm rounded-2xl shadow-md hover:shadow-lg transition-all mb-4 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? 'მოწმდება...' : 'შესვლა 🚀'}
                </button>
              )}
            </form>
          </>
        )}

        {/* Logout / Switch Account footer link */}
        <div className="w-full pt-4 border-t border-slate-100 flex justify-center">
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1"
          >
            🚪 გასვლა ანგარიშიდან
          </button>
        </div>
      </div>
    </div>
  );
};
