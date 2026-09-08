import React from 'react';
import { useChildDashboard } from '../hooks/useChildDashboard';
import { getGameModeLabel } from '../utils/gameModeLabels';

interface ParentDashboardProps {
  childId: string | null;
  onClose: () => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ childId, onClose }) => {
  // Hook rules: unconditionally called regardless of childId value
  const { stats, recentSessions, wishes, gameModeBreakdown = {}, loading, error, refetch } = useChildDashboard(childId);

  // Explicit rendering priority chain (stats is nullable)
  // 1. childId === null -> "ბავშვი არ არის არჩეული"
  if (childId === null) {
    return (
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 border-b-8 border-indigo-200">
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-2xl font-black text-indigo-900 flex items-center gap-2">
            📊 მშობლის დაშბორდი
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full text-sm font-bold transition-all"
            aria-label="დახურვა"
          >
            ✕ დახურვა
          </button>
        </div>
        <div className="text-center py-12 text-gray-500 font-medium">
          ბავშვი არ არის არჩეული
        </div>
      </div>
    );
  }

  // 2. loading === true -> spinner / loading state
  if (loading) {
    return (
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 border-b-8 border-indigo-200">
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-2xl font-black text-indigo-900 flex items-center gap-2">
            📊 მშობლის დაშბორდი
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full text-sm font-bold transition-all"
            aria-label="დახურვა"
          >
            ✕ დახურვა
          </button>
        </div>
        <div className="text-center py-12 space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-indigo-800 font-semibold text-sm">იტვირთება მონაცემები...</p>
        </div>
      </div>
    );
  }

  // 3. error !== null -> error + "🔄 თავიდან ცდა" (refetch)
  if (error !== null) {
    return (
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 border-b-8 border-indigo-200">
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-2xl font-black text-indigo-900 flex items-center gap-2">
            📊 მშობლის დაშბორდი
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full text-sm font-bold transition-all"
            aria-label="დახურვა"
          >
            ✕ დახურვა
          </button>
        </div>
        <div className="text-center py-10 space-y-4">
          <div className="text-rose-600 font-semibold text-base">
            შეცდომა: {error}
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all text-sm inline-flex items-center gap-2"
          >
            🔄 თავიდან ცდა
          </button>
        </div>
      </div>
    );
  }

  // 4. stats === null (loading/error finished, but stats has not arrived yet) -> neutral fallback
  if (stats === null) {
    return (
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 border-b-8 border-indigo-200">
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-2xl font-black text-indigo-900 flex items-center gap-2">
            📊 მშობლის დაშბორდი
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full text-sm font-bold transition-all"
            aria-label="დახურვა"
          >
            ✕ დახურვა
          </button>
        </div>
        <div className="text-center py-12 text-gray-400 font-medium">
          მონაცემები არ არის ხელმისაწვდომი
        </div>
      </div>
    );
  }

  // 5. stats.completedSessionCount === 0 -> "ჯერ არცერთი დასრულებული სესია არ არის"
  if (stats.completedSessionCount === 0) {
    return (
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 border-b-8 border-indigo-200">
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-2xl font-black text-indigo-900 flex items-center gap-2">
            📊 მშობლის დაშბორდი
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full text-sm font-bold transition-all"
            aria-label="დახურვა"
          >
            ✕ დახურვა
          </button>
        </div>
        <div className="text-center py-12 text-gray-500 font-medium">
          ჯერ არცერთი დასრულებული სესია არ არის
        </div>
      </div>
    );
  }

  // 6 & 7. stats.completedSessionCount > 0 -> Populated stats (accuracy may be null or number)
  return (
    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 border-b-8 border-indigo-200 max-h-[90vh] overflow-y-auto">
      {/* 1. Header + Close Button */}
      <div className="flex justify-between items-center border-b pb-4 sticky top-0 bg-white z-10">
        <h2 className="text-2xl font-black text-indigo-900 flex items-center gap-2">
          📊 მშობლის დაშბორდი
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full text-sm font-bold transition-all"
          aria-label="დახურვა"
        >
          ✕ დახურვა
        </button>
      </div>

      {/* 2. Aggregate Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5 text-center">
          <div className="text-xs font-bold text-indigo-600">სესიები</div>
          <div className="text-2xl font-black text-indigo-950 mt-1">
            {stats.completedSessionCount}
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3.5 text-center">
          <div className="text-xs font-bold text-purple-600">კითხვები</div>
          <div className="text-2xl font-black text-purple-950 mt-1">
            {stats.totalQuestions}
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 text-center">
          <div className="text-xs font-bold text-emerald-600">სწორი პასუხი</div>
          <div className="text-2xl font-black text-emerald-950 mt-1">
            {stats.totalCorrect}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3.5 text-center">
          <div className="text-xs font-bold text-amber-600">სიზუსტე</div>
          <div className="text-2xl font-black text-amber-950 mt-1">
            {stats.accuracyPercent !== null ? `${stats.accuracyPercent.toFixed(1)}%` : 'მონაცემი არ არის'}
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 text-center col-span-2 sm:col-span-2">
          <div className="text-xs font-bold text-rose-600">ვარსკვლავური ბლოკები (⭐ 40/40)</div>
          <div className="text-2xl font-black text-rose-950 mt-1">
            {stats.perfectBlocksCount}
          </div>
        </div>
      </div>

      {/* 3. Recent Sessions (limit 20 from hook) */}
      <div className="space-y-3">
        <h3 className="text-lg font-black text-indigo-900 flex items-center gap-1.5">
          ⏱️ ბოლო სესიები
        </h3>
        {recentSessions.length === 0 ? (
          <div className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-2xl text-center">
            ბოლო სესიები არ მოიძებნა
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {recentSessions.map((s) => {
              const dateStr = s.started_at
                ? new Date(s.started_at).toLocaleDateString('ka-GE', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—';
              const modeLabel = getGameModeLabel(s.game_mode);

              return (
                <div
                  key={s.id}
                  className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 p-3 rounded-2xl border border-gray-200/70 text-sm transition-all"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-gray-800 truncate">{modeLabel}</span>
                    <span className="text-xs text-gray-400">{dateStr}</span>
                  </div>
                  <div className="font-black text-indigo-900 bg-white px-2.5 py-1 rounded-xl border border-gray-200 shadow-sm shrink-0">
                    {s.total_correct}/{s.total_questions}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Game Mode Breakdown */}
      <div className="space-y-3">
        <h3 className="text-lg font-black text-indigo-900 flex items-center gap-1.5">
          🎮 თამაშის რეჟიმები
        </h3>
        {Object.keys(gameModeBreakdown).length === 0 ? (
          <div className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-2xl text-center">
            რეჟიმების სტატისტიკა არ მოიძებნა
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {Object.entries(gameModeBreakdown).map(([modeKey, entry]) => {
              const label = getGameModeLabel(modeKey);
              const accuracyDisplay =
                entry.accuracyPercent !== null ? `${entry.accuracyPercent.toFixed(1)}%` : '—';

              return (
                <div
                  key={modeKey}
                  className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 p-3 rounded-2xl border border-gray-200/70 text-sm transition-all"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-gray-800 truncate">{label}</span>
                    <span className="text-xs text-gray-400">
                      სესიები: {entry.sessionCount} • სიზუსტე: {accuracyDisplay}
                    </span>
                  </div>
                  <div className="font-black text-indigo-900 bg-white px-2.5 py-1 rounded-xl border border-gray-200 shadow-sm shrink-0">
                    {entry.totalCorrect}/{entry.totalQuestions}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Wishes (all, no truncation/slice) */}
      <div className="space-y-3">
        <h3 className="text-lg font-black text-indigo-900 flex items-center gap-1.5">
          🎁 სურვილები ({wishes.length})
        </h3>
        {wishes.length === 0 ? (
          <div className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-2xl text-center">
            სურვილები ჯერ არ არის ჩაწერილი
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {wishes.map((w) => (
              <div
                key={w.id}
                className="flex justify-between items-center bg-amber-50/70 border border-amber-200/70 p-3 rounded-2xl text-sm"
              >
                <div className="flex flex-col min-w-0 mr-2">
                  <span className="font-bold text-amber-950 truncate">✨ {w.wish_text}</span>
                  <span className="text-[11px] text-amber-700">
                    {w.correct_count === 40 ? '⭐ 40/40 ბლოკი' : '🎯 39/40 ბლოკი'}
                  </span>
                </div>
                <span
                  className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 ${
                    w.status === 'fulfilled'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {w.status === 'fulfilled' ? 'შესრულებულია ✅' : 'მოლოდინში ⏳'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
