import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MathProblem, GameState, GameMode } from './types';
import { Button } from './components/Button';
import { ResultOverlay } from './components/ResultOverlay';
import { Header } from './components/Header';
import { MainMenu } from './components/MainMenu';
import { ColumnMultiplication } from './components/ColumnMultiplication';
import { GeometryQuiz } from './components/GeometryQuiz';
import { MathQuiz } from './components/MathQuiz';
import { WishModal } from './components/WishModal';
import { UpdatePasswordModal } from './components/UpdatePasswordModal';
import { ChildSelector } from './components/ChildSelector';
import { AuthModal } from './components/AuthModal';
import { useAuth } from './contexts/AuthContext';
import { useChild } from './contexts/ChildContext';
import {
  generateProblem,
  CORRECT_PHRASES,
  INCORRECT_PHRASES,
  TIME_LIMIT,
} from './services/problemGenerator';
import { getExpectedDigits } from './utils/columnMultiplication';
import { useTimer } from './hooks/useTimer';
import { useColumnMultiplication } from './hooks/useColumnMultiplication';
import { useGameSession } from './hooks/useGameSession';

/** Delay (ms) to allow DOM rendering before focusing the first cell in Kveshmicera mode */
const KVESH_FIRST_CELL_FOCUS_DELAY_MS = 120;

const App: React.FC = () => {
  const { user } = useAuth();
  const {
    childrenList,
    activeChild,
    activeChildId,
    loading: childrenLoading,
    setActiveChild,
    addChild,
  } = useChild();

  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [gameState, setGameState] = useState<GameState>(GameState.Playing);

  // Local UI-only state for 3-question blocks and reward popups
  const [questionsInBlock, setQuestionsInBlock] = useState<number>(0);
  const [isPerfectBlock, setIsPerfectBlock] = useState<boolean>(true);
  const [consecutivePerfectBlocks, setConsecutivePerfectBlocks] = useState<number>(0);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [showRewardImage, setShowRewardImage] = useState<boolean>(false);

  // Child selection modal state during active game mode blocker
  const [showChildGateSelector, setShowChildGateSelector] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Phase 2.5: activeChildId connected across all game modes for authenticated users
  const sessionChildId = user ? activeChildId : null;

  const {
    totalQuestions,
    totalCorrect,
    lastCompletedBlockCorrectCount,
    showWishModal,
    wishText,
    wishSubmitting,
    recordAnswer,
    handleWishSubmit,
    closeWishModal,
    setWishText,
    resetSession,
  } = useGameSession(gameMode, sessionChildId);

  // Phase 2.5 Gate: block game screens if not logged in OR if logged in without an active child profile
  const isAuthRequired = !user;
  const isChildSelectionRequired = Boolean(user && !activeChildId);
  const isGameScreenBlocked = Boolean(gameMode !== null && (isAuthRequired || isChildSelectionRequired));

  const getRandomPhrase = useCallback((phrases: string[]) => {
    return phrases[Math.floor(Math.random() * phrases.length)];
  }, []);

  const handleTimeOut = useCallback(() => {
    setIsPerfectBlock(false);
    setConsecutivePerfectBlocks(0);
    recordAnswer(false);
    
    setCurrentMessage("დრო ამოიწურა! წააგე.");
    setGameState(GameState.Incorrect);
    setShowRewardImage(false);
  }, [recordAnswer]);

  const { timeLeft, startTimer, stopTimer } = useTimer({
    timeLimit: TIME_LIMIT,
    onTimeOut: handleTimeOut
  });

  const {
    colMultState,
    showKveshValidation,
    setShowKveshValidation,
    hasKveshFailedThisQuestion,
    setHasKveshFailedThisQuestion,
    handleCellChange,
    handleKeyDown,
    isColMultFilled,
    resetColMultState,
    registerCellRef,
    focusFirstCell,
  } = useColumnMultiplication(problem);

  useEffect(() => {
    if (gameMode && !isGameScreenBlocked) {
      setProblem(generateProblem(gameMode, questionsInBlock));
      if (gameMode === GameMode.ThomravlebisTabula) {
        startTimer();
      }
    }
  }, [gameMode, isGameScreenBlocked]);

  useEffect(() => {
    if (gameState === GameState.Playing && !isGameScreenBlocked) {
      if (gameMode === GameMode.Kveshmicera) {
        setTimeout(() => {
          if (problem) {
            focusFirstCell(problem);
          }
        }, KVESH_FIRST_CELL_FOCUS_DELAY_MS);
      } else {
        inputRef.current?.focus();
      }
    }
  }, [gameState, gameMode, problem, focusFirstCell, isGameScreenBlocked]);

  const processAnswerResult = (isCorrect: boolean, actualUserAnswer: string) => {
    const shouldRecord = gameMode !== GameMode.Kveshmicera || !hasKveshFailedThisQuestion;

    if (shouldRecord) {
      recordAnswer(isCorrect);
    }

    if (gameMode === GameMode.Kveshmicera) {
      if (isCorrect) {
        setShowKveshValidation(false);
        setHasKveshFailedThisQuestion(false);
      } else {
        setHasKveshFailedThisQuestion(true);
        setShowKveshValidation(true);
      }
    }

    if (isCorrect) {
      const nextQuestionsInBlock = questionsInBlock + 1;
      setQuestionsInBlock(nextQuestionsInBlock);

      let message = getRandomPhrase(CORRECT_PHRASES);

      if (nextQuestionsInBlock === 3) {
        setShowRewardImage(true);
        if (isPerfectBlock) {
          setConsecutivePerfectBlocks(prev => prev + 1);
        } else {
          message = "შეცდომები გქონდა! მეფე უკმაყოფილოა.";
        }
      } else {
        setShowRewardImage(false);
      }

      setCurrentMessage(message);
      setGameState(GameState.Correct);
    } else {
      setIsPerfectBlock(false);
      setConsecutivePerfectBlocks(0);

      const template = getRandomPhrase(INCORRECT_PHRASES);
      const finalMessage = template.replace("[]", actualUserAnswer);
      
      setCurrentMessage(finalMessage);
      setGameState(GameState.Incorrect);
      setShowRewardImage(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!problem) return;

    if (gameMode !== GameMode.Kveshmicera && !userAnswer) return;

    stopTimer();

    let isCorrect = false;
    let actualUserAnswer = userAnswer;

    if (gameMode === GameMode.Kveshmicera) {
      if (!('num1' in problem && 'num2' in problem) || problem.num1 === undefined || problem.num2 === undefined) return;
      const { r1: expR1, r2: expR2, res: expRes } = getExpectedDigits(problem.num1, problem.num2);
      let isAllCorrect = true;
      for (let c = 0; c < 4; c++) {
        if (colMultState.r1[c] !== expR1[c]) isAllCorrect = false;
        if (colMultState.r2[c] !== expR2[c]) isAllCorrect = false;
        if (colMultState.res[c] !== expRes[c]) isAllCorrect = false;
      }
      isCorrect = isAllCorrect;
      const nonZeroRes = colMultState.res.filter(v => v !== "");
      actualUserAnswer = nonZeroRes.join('') || "0";
    } else {
      const val = parseInt(userAnswer, 10);
      if (isNaN(val)) return;
      isCorrect = val === problem.answer;
    }

    processAnswerResult(isCorrect, actualUserAnswer);
  };

  const handleNext = (force: boolean = false) => {
    if (showWishModal && !force) return;
    if (gameState === GameState.Incorrect) {
      setUserAnswer('');
      resetColMultState();
      setGameState(GameState.Playing);
      if (gameMode === GameMode.ThomravlebisTabula) {
        startTimer();
      }
      return;
    }

    if (gameState === GameState.Correct) {
      let nextIndex = questionsInBlock;
      if (questionsInBlock >= 3) {
        setQuestionsInBlock(0);
        setIsPerfectBlock(true);
        nextIndex = 0;
      }

      if (gameMode) {
        setProblem(generateProblem(gameMode, nextIndex));
      }
      setUserAnswer('');
      resetColMultState();
      setGameState(GameState.Playing);
      setShowRewardImage(false);
      if (gameMode === GameMode.ThomravlebisTabula) {
        startTimer();
      }
    }
  };

  const handleSendWish = async () => {
    const success = await handleWishSubmit();
    if (success) {
      handleNext(true);
    }
  };

  const handleHomeClick = () => {
    resetSession();
    setGameMode(null);
    setProblem(null);
    stopTimer();
  };

  if (!gameMode) {
    return <MainMenu onSelectMode={(mode) => setGameMode(mode)} />;
  }

  // Block game screens if unauthenticated or no child selected
  if (isGameScreenBlocked) {
    if (isAuthRequired) {
      return (
        <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-indigo-100 to-purple-200 flex flex-col items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 text-center space-y-6 border-b-8 border-indigo-200">
            <div className="text-5xl">🔒</div>
            <h2 className="text-2xl font-black text-indigo-950">
              ავტორიზაცია აუცილებელია
            </h2>
            <p className="text-indigo-700 text-sm">
              თამაშის დასაწყებად გაიარეთ ავტორიზაცია მშობლის ანგარიშით.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => setShowAuthModal(true)}
                className="w-full py-4 text-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg"
              >
                🔑 შესვლა / რეგისტრაცია
              </Button>
              <button
                onClick={handleHomeClick}
                className="w-full py-3 text-sm text-slate-500 hover:text-slate-700 font-semibold"
              >
                ← მთავარ მენიუში დაბრუნება
              </button>
            </div>
          </div>

          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
          />
        </div>
      );
    }

    // Authenticated user without active child
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-indigo-100 to-purple-200 flex flex-col items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 text-center space-y-6 border-b-8 border-indigo-200">
          <div className="text-5xl">👶</div>
          <h2 className="text-2xl font-black text-indigo-950">
            {childrenList.length === 0 ? 'დაამატეთ ბავშვის პროფილი' : 'აირჩიეთ ბავშვის პროფილი'}
          </h2>
          <p className="text-indigo-700 text-sm">
            თამაშის დასაწყებად აუცილებელია ბავშვის პროფილის არჩევა.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => setShowChildGateSelector(true)}
              className="w-full py-4 text-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg"
            >
              {childrenList.length === 0 ? '➕ პროფილის დამატება' : '🔄 პროფილის არჩევა'}
            </Button>
            <button
              onClick={handleHomeClick}
              className="w-full py-3 text-sm text-slate-500 hover:text-slate-700 font-semibold"
            >
              ← მთავარ მენიუში დაბრუნება
            </button>
          </div>
        </div>

        {showChildGateSelector && (
          <ChildSelector
            childrenList={childrenList}
            activeChildId={activeChildId}
            loading={childrenLoading}
            onSelectChild={(child) => {
              setActiveChild(child);
              setShowChildGateSelector(false);
            }}
            onAddChild={addChild}
            onClose={() => setShowChildGateSelector(false)}
          />
        )}
      </div>
    );
  }

  if (!problem) return <div className="min-h-screen flex items-center justify-center">იტვირთება...</div>;

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-indigo-100 to-purple-200 flex flex-col items-center p-2 sm:p-4 relative overflow-x-hidden">
      <Header 
        gameMode={gameMode}
        gameState={gameState}
        timeLeft={timeLeft}
        questionsInBlock={questionsInBlock}
        totalCorrect={totalCorrect}
        totalQuestions={totalQuestions}
        onHomeClick={handleHomeClick}
      />

      <main className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 md:p-12 relative overflow-hidden border-b-8 border-indigo-200 my-auto">
        <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400" />

        <div className="text-center space-y-8">
          {gameMode === GameMode.Kveshmicera ? (
            <ColumnMultiplication 
              problem={problem}
              colMultState={colMultState}
              showKveshValidation={showKveshValidation}
              currentMessage={currentMessage}
              onCellChange={handleCellChange}
              onKeyDown={handleKeyDown}
              getExpectedDigits={getExpectedDigits}
              onSubmit={handleSubmit}
              isColMultFilled={isColMultFilled}
              registerCellRef={registerCellRef}
            />
          ) : problem.category === 'geometry' ? (
            <GeometryQuiz problem={problem} />
          ) : (
            <MathQuiz problem={problem} />
          )}

          {gameMode !== GameMode.Kveshmicera && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="numeric"
                  data-testid="quiz-answer-input"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="?"
                  className="w-full text-center text-5xl font-bold py-4 border-4 border-gray-200 rounded-2xl focus:border-purple-500 focus:ring-4 focus:ring-purple-200 outline-none transition-all placeholder-gray-300 text-gray-800"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full text-2xl py-4"
                disabled={!userAnswer}
              >
                შემოწმება
              </Button>
            </form>
          )}
        </div>
      </main>

      <ResultOverlay 
        gameState={gameState} 
        correctAnswer={problem.answer}
        onReset={handleNext}
        message={currentMessage}
        showImage={showRewardImage}
        isPerfectBlock={isPerfectBlock}
        consecutivePerfectBlocks={consecutivePerfectBlocks}
      />

      {showWishModal && (
        <WishModal 
          lastCompletedBlockCorrectCount={lastCompletedBlockCorrectCount}
          wishText={wishText}
          isSendingWish={wishSubmitting}
          onWishTextChange={setWishText}
          onSendWish={handleSendWish}
        />
      )}

      <UpdatePasswordModal />
    </div>
  );
};

export default App;
