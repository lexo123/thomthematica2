import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const UpdatePasswordModal: React.FC = () => {
  const { isPasswordRecovery, setIsPasswordRecovery, updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isPasswordRecovery) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('ახალი პაროლი უნდა შედგებოდეს მინიმუმ 6 სიმბოლოსგან');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('პაროლები ერთმანეთს არ ემთხვევა');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        setError(error.message || 'პაროლის განახლება ვერ მოხერხდა');
      } else {
        setSuccess(true);
        setTimeout(() => {
          setIsPasswordRecovery(false);
          setSuccess(false);
          setNewPassword('');
          setConfirmPassword('');
        }, 2000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-4 border-amber-300 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setIsPasswordRecovery(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
          aria-label="დახურვა"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-2xl mb-3 shadow-inner text-2xl">
            🔑
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            ახალი პაროლის დაყენება
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            შეიყვანეთ თქვენი ახალი პაროლი ანგარიშზე წვდომის აღსადგენად
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold">
            ✅ პაროლი წარმატებით განახლდა! მოდალი მალე დაიხურება...
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ახალი პაროლი
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="მინიმუმ 6 სიმბოლო"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-medium text-slate-800 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                გაიმეორეთ ახალი პაროლი
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="გაიმეორეთ პაროლი"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-medium text-slate-800 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {submitting ? (
                <span className="inline-block animate-spin mr-2">🔄</span>
              ) : null}
              პაროლის შენახვა
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
