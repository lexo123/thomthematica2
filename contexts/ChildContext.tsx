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
  addChild: (name: string, avatarId?: string, rewardTheme?: string) => Promise<{ child: Child | null; error: Error | null }>;
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

  useEffect(() => {
    if (!user) {
      setActiveChildIdState(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ACTIVE_CHILD_STORAGE_KEY);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user || loading) return;

    if (childrenList.length > 0) {
      const exists = childrenList.some(c => c.id === activeChildId);
      if (!exists) {
        const firstChild = childrenList[0];
        setActiveChildIdState(firstChild.id);
        if (typeof window !== 'undefined') {
          localStorage.setItem(ACTIVE_CHILD_STORAGE_KEY, firstChild.id);
        }
      }
    } else {
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
