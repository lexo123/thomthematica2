import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChild } from '../contexts/ChildContext';
import { useSessionMode } from '../contexts/SessionModeContext';
import { getSupabase } from '../lib/supabase';
import { hashPin, isValidPinFormat } from '../utils/pinHash';

export const PinGate: React.FC = () => {
  const { user, signOut } = useAuth();
  const { setActiveChildId } = useChild();
  const { setSessionMode, resetSessionMode } = useSessionMode();

  type ScopedChildPin = { id: string; pin_hash: string | null };

  const [pin, setPin] = useState('');
  const [parentPinHash, setParentPinHash] = useState<string | null>(null);
  const [childrenPins, setChildrenPins] = useState<ScopedChildPin[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const parentPinPromiseRef = useRef<Promise<string | null> | null>(null);
  const childrenPinsPromiseRef = useRef<Promise<ScopedChildPin[]> | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch parent's own profile pin_hash strictly scoped to current user.id
  // and fetch children (id, pin_hash) strictly scoped to current user.id
  useEffect(() => {
    let isCancelled = false;

    const fetchParentPin = async (): Promise<string | null> => {
      if (!user) {
        return null;
      }

      const supabase = getSupabase();
      if (!supabase) {
        return null;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('pin_hash')
          .eq('id', user.id)
          .maybeSingle();

        const hash = !error && data?.pin_hash ? data.pin_hash : null;
        if (!isCancelled) {
          setParentPinHash(hash);
        }
        return hash;
      } catch {
        return null;
      }
    };

    const fetchChildrenPins = async (): Promise<ScopedChildPin[]> => {
      if (!user) {
        return [];
      }

      const supabase = getSupabase();
      if (!supabase) {
        return [];
      }

      try {
        const { data, error } = await supabase
          .from('children')
          .select('id, pin_hash')
          .eq('parent_id', user.id);

        const list = !error && data ? (data as ScopedChildPin[]) : [];
        if (!isCancelled) {
          setChildrenPins(list);
        }
        return list;
      } catch {
        return [];
      }
    };

    parentPinPromiseRef.current = fetchParentPin();
    childrenPinsPromiseRef.current = fetchChildrenPins();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  // Keep input focused
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
    if (!isValidPinFormat(candidatePin)) {
      setErrorMsg('შეიყვანეთ 4-ციფრიანი PIN');
      setPin('');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const candidateHash = await hashPin(candidatePin);

      // In case parentPinHash promise is still resolving, await it
      let currentParentHash = parentPinHash;
      if (!currentParentHash && parentPinPromiseRef.current) {
        currentParentHash = await parentPinPromiseRef.current;
      }

      // 1. Check parent match
      if (currentParentHash && candidateHash === currentParentHash) {
        setSessionMode('parent');
        return;
      }

      // 2. Check child match from independent scoped fetch (id, pin_hash)
      let currentChildrenPins = childrenPins;
      if (currentChildrenPins.length === 0 && childrenPinsPromiseRef.current) {
        currentChildrenPins = await childrenPinsPromiseRef.current;
      }

      const matchedChild = currentChildrenPins.find(c => {
        return typeof c.pin_hash === 'string' && c.pin_hash.length > 0 && c.pin_hash === candidateHash;
      });

      if (matchedChild) {
        // Synchronously set both in the same event handler to eliminate intermediate states
        setActiveChildId(matchedChild.id);
        setSessionMode('child');
        return;
      }

      // 3. No match -> generic error message, do not reveal match proximity
      setErrorMsg('არასწორი PIN');
      setPin('');
      inputRef.current?.focus();
    } catch {
      setErrorMsg('არასწორი PIN');
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

  const handleLogout = async () => {
    resetSessionMode();
    setActiveChildId(null);
    await signOut();
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-indigo-100 to-purple-200 flex flex-col items-center justify-center p-4 relative animate-fadeIn select-none">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 sm:p-8 text-center border-4 border-indigo-200 relative flex flex-col items-center">
        {/* Header Icon */}
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner mb-4">
          🔐
        </div>

        <h1 className="text-2xl font-black text-indigo-950 tracking-tight">
          შეიყვანეთ PIN კოდი
        </h1>
        <p className="text-xs text-slate-500 mt-1 mb-6 font-medium">
          {user?.user_metadata?.full_name || user?.email ? (
            <span>ანგარიში: <strong className="text-indigo-900">{user.user_metadata?.full_name || user.email}</strong></span>
          ) : (
            'შეიყვანეთ 4-ციფრიანი PIN გასაგრძელებლად'
          )}
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
