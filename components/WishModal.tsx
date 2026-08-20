import React from 'react';
import { Button } from './Button';

interface WishModalProps {
  lastCompletedBlockCorrectCount: number;
  wishText: string;
  isSendingWish: boolean;
  onWishTextChange: (text: string) => void;
  onSendWish: () => void;
}

export const WishModal: React.FC<WishModalProps> = ({
  lastCompletedBlockCorrectCount,
  wishText,
  isSendingWish,
  onWishTextChange,
  onSendWish,
}) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-md bg-indigo-900/40">
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl text-center border-t-8 border-yellow-400 animate-in fade-in zoom-in duration-300">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-3xl font-black text-indigo-900 mb-2">
          ბრავო თომა!
        </h2>
        <p className="text-lg text-gray-600 mb-6">
          ზედიზედ 40 კითხვიდან {lastCompletedBlockCorrectCount} სწორად გამოიცანი! შენ ნამდვილი გენიოსი ხარ.
        </p>
        
        <div className="text-left mb-6">
          <label className="block text-sm font-bold text-indigo-900 mb-2 ml-1">
            დაწერე, რა სურათი გინდა რომ გავაკეთო შემდეგში:
          </label>
          <textarea
            value={wishText}
            onChange={(e) => onWishTextChange(e.target.value)}
            placeholder="აბა, რა გავაკეთო"
            className="w-full p-4 border-4 border-indigo-50 rounded-2xl focus:border-yellow-400 outline-none transition-all placeholder-gray-300 text-lg min-h-[120px]"
            autoFocus
          />
        </div>

        <Button 
          onClick={onSendWish} 
          className="w-full text-xl py-4 bg-yellow-400 hover:bg-yellow-500 text-indigo-900"
          disabled={!wishText.trim() || isSendingWish}
        >
          {isSendingWish ? 'იგზავნება...' : 'გააგზავნე'}
        </Button>
      </div>
    </div>
  );
};
