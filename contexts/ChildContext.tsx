import React, { createContext, useContext, useState, useEffect } from 'react';
import { Child, ChildRewardImagesState } from '../types';
import { useAuth } from './AuthContext';
import { useChildren } from '../hooks/useChildren';
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
  fetchChildren: () => Promise<void>;
  showChildSelector: boolean;
  setShowChildSelector: (show: boolean) => void;
}

const ChildContext = createContext<ChildContextType | undefined>(undefined);

const ACTIVE_CHILD_STORAGE_KEY = 'thomthematica_active_child_id';

export const ChildProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { children: childrenList, loading, error, hasFetchedOnce, fetchChildren, addChild } = useChildren();
  const [activeChildId, setActiveChildIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY);
    }
    return null;
  });
  const childRewardImages = useChildRewardImagesFetcher(activeChildId);
  const [showChildSelector, setShowChildSelector] = useState<boolean>(false);

  // When user logs out, clear active child
  useEffect(() => {
    if (!user) {
      setActiveChildIdState(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ACTIVE_CHILD_STORAGE_KEY);
      }
    }
  }, [user]);

  // Sync activeChildId with actual children list (self-healing only; PinGate handles identity selection)
  useEffect(() => {
    if (!user || loading || !hasFetchedOnce) return;

    if (childrenList.length > 0) {
      if (activeChildId) {
        const stillExists = childrenList.some(c => c.id === activeChildId);
        if (!stillExists) {
          // If stored active child is invalid/deleted/from another user, clear it
          setActiveChildId(null);
        }
      }
    } else if (activeChildId) {
      // If user is authenticated but has 0 children, clear active child
      setActiveChildId(null);
    }
  }, [user, childrenList, activeChildId, loading, hasFetchedOnce]);

  const setActiveChildId = (id: string | null) => {
    setActiveChildIdState(id);
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

  const activeChild = childrenList.find(c => c.id === activeChildId) || null;

  return (
    <ChildContext.Provider
      value={{
        childrenList,
        activeChild,
        activeChildId,
        childRewardImages,
        loading,
        error,
        hasFetchedOnce,
        setActiveChildId,
        setActiveChild,
        addChild,
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
