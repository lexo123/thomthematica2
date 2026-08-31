import React, { useState } from 'react';
import { GameMode } from '../types';
import { Button } from './Button';
import { useAuth } from '../contexts/AuthContext';
import { useChild } from '../contexts/ChildContext';
import { AuthModal } from './AuthModal';
import { UpdatePasswordModal } from './UpdatePasswordModal';
import { ChildSelector } from './ChildSelector';
import { getAvatarEmoji } from '../hooks/useChildren';

interface MainMenuProps {
  onSelectMode: (mode: GameMode) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onSelectMode }) => {
  const { user, signOut, setIsPasswordRecovery } = useAuth();
  const {
    childrenList,
    activeChild,
    activeChildId,
    loading: childrenLoading,
    setActiveChild,
    addChild,
    showChildSelector,
    setShowChildSelector,
  } = useChild();

  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-200 flex flex-col items-center justify-center p-4 relative">
      {/* Top Bar for Parent Account / Guest Status / Child Profile */}
      <div className="w-full max-w-lg flex flex-col gap-2 mb-3 px-1">
        {/* Main Status Row */}
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-full border border-indigo-100 shadow-sm max-w-[200px] sm:max-w-xs truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            {user ? (
              <span className="truncate">👤 {user.user_metadata?.full_name || user.email}</span>
            ) : (
              <span>🔒 ავტორიზაცია</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {user ? (
              <>
                <button
                  onClick={() => setIsPasswordRecovery(true)}
                  className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 px-3 py-1.5 rounded-full border border-amber-200 shadow-sm transition-all flex items-center gap-1"
                  title="პაროლის შეცვლა"
                >
                  🔑 პაროლი
                </button>
                <button
                  onClick={() => signOut()}
                  className="text-xs font-bold text-rose-600 bg-white/80 hover:bg-white hover:text-rose-700 px-3 py-1.5 rounded-full border border-rose-100 shadow-sm transition-all flex items-center gap-1"
                >
                  გასვლა 🚪
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="text-xs font-bold text-indigo-700 bg-white/80 hover:bg-white hover:text-indigo-900 px-3 py-1.5 rounded-full border border-indigo-200 shadow-sm hover:shadow transition-all flex items-center gap-1"
              >
                👨‍👩‍👧‍👦 მშობლის შესვლა
              </button>
            )}
          </div>
        </div>

        {/* Authenticated Child Profile Pill */}
        {user && (
          <div className="flex items-center justify-between bg-indigo-900/90 text-white px-3.5 py-2 rounded-2xl shadow-md backdrop-blur-sm border border-indigo-700/50">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl">
                {activeChild ? getAvatarEmoji(activeChild.avatar_id) : '👶'}
              </span>
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-[10px] text-indigo-200 font-semibold uppercase tracking-wider">
                  მოთამაშე
                </span>
                <span className="text-sm font-black truncate">
                  {activeChild ? activeChild.name : 'ბავშვი არჩეული არ არის'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowChildSelector(true)}
              className="text-xs font-black bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl border border-white/20 transition-all flex items-center gap-1 shrink-0"
            >
              🔄 შეცვლა
            </button>
          </div>
        )}
      </div>

      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 md:p-12 text-center space-y-8 border-b-8 border-indigo-200">
        <h1 className="text-4xl font-black text-indigo-900 tracking-tight">
          აირჩიე თამაში 👑
        </h1>
        <div className="grid gap-4">
          <Button 
            onClick={() => onSelectMode(GameMode.Thomthematica)}
            className="text-xl py-6 bg-indigo-600 hover:bg-indigo-700"
          >
            თომთემატიკა
          </Button>
          <Button 
            onClick={() => onSelectMode(GameMode.ThomravlebisTabula)}
            className="text-xl py-6 bg-purple-600 hover:bg-purple-700"
          >
            თომრავლების ტაბულა
          </Button>
          <Button 
            onClick={() => onSelectMode(GameMode.Gethometria)}
            className="text-xl py-6 bg-green-600 hover:bg-green-700"
          >
            გეთომეტრია 📐
          </Button>
          <Button 
            onClick={() => onSelectMode(GameMode.Kveshmicera)}
            className="text-xl py-6 bg-amber-600 hover:bg-amber-700"
          >
            ქვეშმიწერით გამრავლება ✍️
          </Button>
        </div>
      </div>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
      />

      {user && showChildSelector && (
        <ChildSelector
          childrenList={childrenList}
          activeChildId={activeChildId}
          loading={childrenLoading}
          onSelectChild={(child) => {
            setActiveChild(child);
            setShowChildSelector(false);
          }}
          onAddChild={addChild}
          onClose={() => {
            if (childrenList.length > 0) {
              setShowChildSelector(false);
            }
          }}
        />
      )}

      <UpdatePasswordModal />
    </div>
  );
};
