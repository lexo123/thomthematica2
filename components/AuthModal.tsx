import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot_password';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp, resetPassword, isConfigured } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message || 'შესვლა ვერ მოხერხდა. გადაამოწმეთ ელფოსტა და პაროლი.');
        } else {
          onClose();
        }
      } else if (mode === 'register') {
        if (password.length < 6) {
          setError('პაროლი უნდა შედგებოდეს მინიმუმ 6 სიმბოლოსგან');
          setSubmitting(false);
          return;
        }
        const { error } = await signUp(email, password, fullName);
        if (error) {
          setError(error.message || 'რეგისტრაცია ვერ მოხერხდა.');
        } else {
          setMessage('რეგისტრაცია წარმატებულია! შეგიძლიათ შეხვიდეთ სისტემაში.');
          setMode('login');
        }
      } else if (mode === 'forgot_password') {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message || 'პაროლის აღდგენის ბმულის გაგზავნა ვერ მოხერხდა.');
        } else {
          setMessage('პაროლის აღდგენის ინსტრუქცია გაიგზავნა მითითებულ ელფოსტაზე.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-4 border-amber-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
          aria-label="დახურვა"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header Badge */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-2xl mb-3 shadow-inner text-2xl">
            👨‍👩‍👧‍👦
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {mode === 'login' && 'მშობლის შესვლა'}
            {mode === 'register' && 'მშობლის რეგისტრაცია'}
            {mode === 'forgot_password' && 'პაროლის აღდგენა'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {mode === 'login' && 'შედით შვილების პროგრესის და სურვილების სანახავად'}
            {mode === 'register' && 'შექმენით ანგარიში ბავშვების შედეგების შესანახად'}
            {mode === 'forgot_password' && 'შეიყვანეთ ელფოსტა პაროლის აღსადგენად'}
          </p>
        </div>

        {!isConfigured && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-800 text-xs leading-relaxed">
            ⚠️ <strong>შენიშვნა:</strong> Supabase-ის კონფიგურაცია ჯერ არ არის შეყვანილი (.env-ში). შეგიძლიათ გააგრძელოთ სტუმრის (Guest) რეჟიმში.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                თქვენი სახელი (მშობელი)
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="მაგ. გიორგი"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-medium text-slate-800 outline-none transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ელფოსტა
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-medium text-slate-800 outline-none transition-all"
            />
          </div>

          {mode !== 'forgot_password' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                პაროლი
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-medium text-slate-800 outline-none transition-all"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {submitting ? (
              <span className="inline-block animate-spin mr-2">🔄</span>
            ) : null}
            {mode === 'login' && 'შესვლა'}
            {mode === 'register' && 'რეგისტრაცია'}
            {mode === 'forgot_password' && 'ბმულის გაგზავნა'}
          </button>
        </form>

        {/* Footer Navigation Links */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col space-y-2 text-center text-xs text-slate-600 font-medium">
          {mode === 'login' ? (
            <>
              <div>
                არ გაქვთ ანგარიში?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); setMessage(null); }}
                  className="text-amber-600 font-bold hover:underline"
                >
                  დარეგისტრირდით
                </button>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => { setMode('forgot_password'); setError(null); setMessage(null); }}
                  className="text-slate-500 hover:text-slate-700 underline"
                >
                  დაგავიწყდათ პაროლი?
                </button>
              </div>
            </>
          ) : mode === 'register' ? (
            <div>
              უკვე გაქვთ ანგარიში?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setMessage(null); }}
                className="text-amber-600 font-bold hover:underline"
              >
                შედით აქ
              </button>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setMessage(null); }}
                className="text-amber-600 font-bold hover:underline"
              >
                ← შესვლის გვერდზე დაბრუნება
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
