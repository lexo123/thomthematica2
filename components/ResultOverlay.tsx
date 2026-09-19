import React, { useEffect, useState, useRef } from 'react';
import { GameState, RewardCategory } from '../types';
import { Button } from './Button';
import { ImageConfig, SUPER_WINNER_GIFS, WINNER_IMAGES, LOSER_IMAGES } from '../data/rewards';
import { selectFromPool } from '../utils/poolSelector';
import { useChild } from '../contexts/ChildContext';

// სათადარიგო GIF, თუ რამე გაფუჭდა
const FALLBACK_GIF = "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2lsaG1oMnB6eXJ6eXJ6eXJ6eXJ6eXJ6eXJ6eXJ6eXJ6eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0MYt5jPR6QX5pnqM/giphy.gif";

const GLOBAL_FALLBACK: Record<RewardCategory, ImageConfig[]> = {
  winner: WINNER_IMAGES,
  loser: LOSER_IMAGES,
  super_winner: SUPER_WINNER_GIFS,
};

const getDriveId = (url: string) => {
  if (!url) return null;
  const driveRegex = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([-_\w]+)/;
  const match = url.match(driveRegex);
  return match && match[1] ? match[1] : null;
};

const getDirectLink = (url: string) => {
  if (!url || !url.includes('drive.google.com')) return url;
  const id = getDriveId(url);
  if (!id) return url;
  // Google Drive-ის ლინკების პირდაპირ გახსნა
  return `https://lh3.googleusercontent.com/d/${id}`;
};

interface ResultOverlayProps {
  gameState: GameState;
  onReset: () => void;
  correctAnswer: number;
  message: string;        
  showImage: boolean;     
  isPerfectBlock: boolean; // იყო თუ არა 3-ვე პასუხი სწორი
  consecutivePerfectBlocks: number; // რამდენი ბლოკი გამოიცნო ზედიზედ შეცდომის გარეშე
}

export const ResultOverlay: React.FC<ResultOverlayProps> = ({ 
  gameState, 
  onReset, 
  correctAnswer, 
  message,
  showImage,
  isPerfectBlock,
  consecutivePerfectBlocks
}) => {
  const { childRewardImages, activeChildId } = useChild();
  const [showContent, setShowContent] = useState(false);
  
  // ვინახავთ აქტიურ სურათს და მის შესაბამის ტექსტს
  const [activeImgData, setActiveImgData] = useState<{src: string, caption: string} | null>(null);
  const [imageError, setImageError] = useState(false);

  // Pool ref-ების Map: `${activeChildId ?? 'global'}:${category}:${sourceType}`
  const poolsMapRef = useRef<Map<string, React.MutableRefObject<ImageConfig[]>>>(new Map());

  const getPoolRef = (poolKey: string): React.MutableRefObject<ImageConfig[]> => {
    let ref = poolsMapRef.current.get(poolKey);
    if (!ref) {
      ref = { current: [] };
      poolsMapRef.current.set(poolKey, ref);
    }
    return ref;
  };

  const isCorrect = gameState === GameState.Correct;

  // Enter-ზე დაჭერის ლოგიკა
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        onReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onReset]);

  // სურათის ლოგიკა
  useEffect(() => {
    if (!showImage) return;

    let category: RewardCategory;

    // 1. განვსაზღვრავთ კატეგორიას
    if (!isPerfectBlock) {
      category = 'loser';
    } else if (consecutivePerfectBlocks > 0 && consecutivePerfectBlocks % 3 === 0) {
      // ყოველი მე-3 სუფთა ბლოკი -> გიფი
      category = 'super_winner';
    } else {
      // ჩვეულებრივი მოგება
      category = 'winner';
    }

    const sourceType = childRewardImages?.isPersonalized ? 'personalized' : 'fallback';
    const poolKey = `${activeChildId ?? 'global'}:${category}:${sourceType}`;

    const source: ImageConfig[] = childRewardImages?.isPersonalized
      ? childRewardImages[category]
      : GLOBAL_FALLBACK[category];

    const picked: ImageConfig = selectFromPool(getPoolRef(poolKey), source);
    const finalSrc = getDirectLink(picked.url);
    
    setActiveImgData({
      src: finalSrc,
      caption: picked.caption
    });
    setImageError(false);
  }, [showImage, isPerfectBlock, consecutivePerfectBlocks, childRewardImages, activeChildId]);

  const titleColor = isCorrect ? 'text-green-600' : 'text-red-600';
  const bgColor = isCorrect ? 'bg-green-500/90' : 'bg-red-500/90';

  useEffect(() => {
    if (gameState === GameState.Playing) {
      setShowContent(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [gameState]);

  if (gameState === GameState.Playing) return null;

  // ტექსტის არჩევა: თუ სურათი ჩანს, ვიღებთ სურათის ტექსტს, თუ არა - ზოგად მესიჯს
  const displayMessage = (showImage && activeImgData) ? activeImgData.caption : message;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${bgColor} transition-colors duration-500`}>
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-5xl w-full shadow-2xl text-center transform animate-bounce-short flex flex-col items-center">
        
        {/* მთავარი მესიჯი */}
        <h2 className={`text-2xl md:text-4xl font-black mb-8 ${titleColor} leading-tight`}>
          {displayMessage}
        </h2>

        {/* სურათი ჩნდება მხოლოდ მე-3 კითხვაზე (როცა showImage true-ა) */}
        {showContent && showImage && activeImgData && (
          <div className={`relative w-full h-[50vh] md:h-[60vh] mb-8 rounded-2xl overflow-hidden border-4 ${isPerfectBlock ? 'border-yellow-400' : 'border-gray-500'} shadow-xl bg-gray-100 flex items-center justify-center animate-fade-in-up`}>
            {!imageError ? (
              <img 
                key={activeImgData.src}
                src={activeImgData.src} 
                alt="შედეგი" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={() => {
                  console.warn("სურათი ვერ ჩაიტვირთა, ირთვება fallback");
                  if (activeImgData.src !== FALLBACK_GIF) {
                     setActiveImgData({ ...activeImgData, src: FALLBACK_GIF });
                  } else {
                     setImageError(true);
                  }
                }}
              />
            ) : (
              <div className="text-9xl select-none">
                {isPerfectBlock ? '👑' : '🥀'}
              </div>
            )}
          </div>
        )}

        <Button onClick={onReset} className="w-full text-2xl py-5 shadow-lg">
          {isCorrect ? 'შემდეგი' : 'თავიდან სცადე'}
        </Button>
      </div>
    </div>
  );
};