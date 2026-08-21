import React, { createContext, useContext, useState, useEffect } from 'react';
import { Child } from '../types';
import { useAuth } from './AuthContext';
import { useChildren } from '../hooks/useChildren';

interface ChildContextType {
  childrenList: Child[];
  activeChild: Child | null;
  activeChildId: string | null;
  loading: boolean;
  error: string | null;
  setActiveChildId: (id: string | null) => void;
  setActiveChild: (child: Child | null) => void;
  addChild: (name: string, avatarId?: string) => Promise<{ child: Child | null; error: Error | null }>;
  fetchChildren: () => Promise<void>;
  showChildSelector: boolean;
  setShowChildSelector: (show: boolean) => void;
}

const ChildContext = createContext<ChildContextType | undefined>(undefined);

const ACTIVE_CHILD_STORAGE_KEY = 'thomthematica_active_child_id';

export const ChildProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { children: childrenList, loading, error, fetchChildren, addChild } = useChildren();
  const [activeChildId, setActiveChildIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY);
    }
    return null;
  });
  const [showChildSelector, setShowChildSelector] = useState<boolean>(false);

  // When user logs out, clear active child state and storage
  useEffect(() => {
    if (!user) {
      setActiveChildIdState(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ACTIVE_CHILD_STORAGE_KEY);
      }
    }
  }, [user]);

  // Sync activeChildId with actual children list
  useEffect(() => {
    if (!user || loading) return;

    if (childrenList.length > 0) {
      if (activeChildId) {
        const stillExists = childrenList.some(c => c.id === activeChildId);
        if (!stillExists) {
          // If stored active child is invalid/deleted/from another user, clear and prompt selector
          setActiveChildId(null);
          setShowChildSelector(true);
        }
      } else {
        // Authenticated user with children but none currently selected
        setShowChildSelector(true);
      }
    } else {
      // If user is authenticated but has 0 children, clear active child and prompt child selector modal
      setActiveChildId(null);
      setShowChildSelector(true);
    }
  }, [user, childrenList, activeChildId, loading]);

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
        loading,
        error,
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
