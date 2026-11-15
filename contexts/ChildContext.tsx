import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Child, ChildGrade, ChildRewardImagesState } from '../types';
import { useAuth } from './AuthContext';
import { useChildren, UpdateChildGradeResult } from '../hooks/useChildren';
import { useChildRewardImagesFetcher } from '../hooks/useChildRewardImagesFetcher';

interface ChildContextType {
  childrenList: Child[];
  activeChild: Child | null;
  activeChildId: string | null;
  childRewardImages: ChildRewardImagesState | null;
  loading: boolean;
  error: string | null;
  hasFetchedOnce: boolean;
  setActiveChildId: (id: string | null) => void;
  setActiveChild: (child: Child | null) => void;
  addChild: (name: string, avatarId: string, gender: 'boy' | 'girl', pin: string) => Promise<{ child: Child | null; error: Error | null }>;
  updateChildGrade: (childId: string, grade: ChildGrade) => Promise<UpdateChildGradeResult>;
  fetchChildren: () => Promise<void>;
  showChildSelector: boolean;
  setShowChildSelector: (show: boolean) => void;
}

const ChildContext = createContext<ChildContextType | undefined>(undefined);

const ACTIVE_CHILD_STORAGE_KEY = 'thomthematica_active_child_id';

interface RewardBarrierState {
  trackedChildId: string | null;
  transitionSnapshot: ChildRewardImagesState | null;
  nullResetObserved: boolean;
}

export const ChildProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const {
    children: childrenList,
    loading,
    error,
    hasFetchedOnce,
    appliedFetchSeq,
    fetchChildren,
    addChild,
    updateChildGrade,
  } = useChildren();

  const [rawActiveChildId, setRawActiveChildId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY);
    }
    return null;
  });

  const [showChildSelector, setShowChildSelector] = useState<boolean>(false);
  const lastReconciledRef = useRef<{ ownerId: string | null; seq: number }>({
    ownerId: null,
    seq: 0,
  });

  // Expose only current-parent validated children and verified activeChild / activeChildId
  const exposedChildrenList = userId ? childrenList : [];
  const exposedActiveChild =
    userId && hasFetchedOnce && rawActiveChildId
      ? exposedChildrenList.find(c => c.id === rawActiveChildId) ?? null
      : null;
  const exposedActiveChildId = exposedActiveChild ? exposedActiveChild.id : null;

  // Pass only verified exposedActiveChildId (never raw candidate) to the reward fetcher
  const rawRewardImages = useChildRewardImagesFetcher(exposedActiveChildId);

  // Batching-safe transition barrier (state-during-render, idempotent under StrictMode)
  const [rewardBarrier, setRewardBarrier] = useState<RewardBarrierState>(() => ({
    trackedChildId: exposedActiveChildId,
    transitionSnapshot: rawRewardImages,
    nullResetObserved: rawRewardImages === null,
  }));

  let effectiveBarrier = rewardBarrier;
  if (rewardBarrier.trackedChildId !== exposedActiveChildId) {
    effectiveBarrier = {
      trackedChildId: exposedActiveChildId,
      transitionSnapshot: rawRewardImages,
      nullResetObserved: rawRewardImages === null,
    };
    setRewardBarrier(effectiveBarrier);
  } else if (rawRewardImages === null && !rewardBarrier.nullResetObserved) {
    effectiveBarrier = {
      ...rewardBarrier,
      nullResetObserved: true,
    };
    setRewardBarrier(effectiveBarrier);
  }

  let childRewardImages: ChildRewardImagesState | null = null;
  if (exposedActiveChildId !== null) {
    if (rawRewardImages === null) {
      // 1. Fetcher's raw result is null -> publish null (null-reset already recorded in barrier)
      childRewardImages = null;
    } else if (rawRewardImages.isPersonalized === false) {
      // 2. Non-sensitive empty state -> publish immediately even if shared EMPTY_STATE reference
      childRewardImages = rawRewardImages;
    } else if (
      effectiveBarrier.nullResetObserved ||
      rawRewardImages !== effectiveBarrier.transitionSnapshot
    ) {
      // 3. Personalized state -> publish only if barrier opened via (a) null-reset or (b) changed reference
      childRewardImages = rawRewardImages;
    } else {
      childRewardImages = null;
    }
  }

  const setActiveChildId = (id: string | null) => {
    setRawActiveChildId(id);
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem(ACTIVE_CHILD_STORAGE_KEY, id);
      } else {
        localStorage.removeItem(ACTIVE_CHILD_STORAGE_KEY);
      }
    }
  };

  const setActiveChild = (child: Child | null) => {
    setActiveChildId(child ? child.id : null);
  };

  // When user logs out, clear raw active child and storage
  useEffect(() => {
    if (!userId) {
      lastReconciledRef.current = { ownerId: null, seq: 0 };
      setRawActiveChildId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ACTIVE_CHILD_STORAGE_KEY);
      }
    }
  }, [userId]);

  // Reconcile rawActiveChildId ONLY on a new current-parent successful list-read event
  useEffect(() => {
    if (!userId) {
      return;
    }

    if (lastReconciledRef.current.ownerId !== userId) {
      lastReconciledRef.current = { ownerId: userId, seq: 0 };
    }

    if (
      !hasFetchedOnce ||
      appliedFetchSeq <= 0 ||
      appliedFetchSeq === lastReconciledRef.current.seq
    ) {
      return;
    }

    lastReconciledRef.current = { ownerId: userId, seq: appliedFetchSeq };

    if (rawActiveChildId) {
      const stillExists = exposedChildrenList.some(c => c.id === rawActiveChildId);
      if (!stillExists) {
        setActiveChildId(null);
      }
    }
  }, [userId, hasFetchedOnce, appliedFetchSeq, exposedChildrenList, rawActiveChildId]);

  return (
    <ChildContext.Provider
      value={{
        childrenList: exposedChildrenList,
        activeChild: exposedActiveChild,
        activeChildId: exposedActiveChildId,
        childRewardImages,
        loading,
        error,
        hasFetchedOnce,
        setActiveChildId,
        setActiveChild,
        addChild,
        updateChildGrade,
        fetchChildren,
        showChildSelector,
        setShowChildSelector,
      }}
    >
      {children}
    </ChildContext.Provider>
  );
};

export const useChild = () => {
  const context = useContext(ChildContext);
  if (!context) {
    throw new Error('useChild must be used within a ChildProvider');
  }
  return context;
};

export const useChildContext = useChild;
