import { useState, useEffect, useRef } from 'react';
import { ChildRewardImagesState } from '../types';
import { fetchChildRewardImages } from '../services/rewardImagesService';

export function useChildRewardImagesFetcher(childId: string | null): ChildRewardImagesState | null {
  const [state, setState] = useState<ChildRewardImagesState | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!childId) {
      requestIdRef.current += 1;
      setState(null);
      return;
    }

    const thisRequestId = ++requestIdRef.current;
    setState(null);

    fetchChildRewardImages(childId)
      .then((result) => {
        if (thisRequestId === requestIdRef.current) {
          setState(result);
        }
      })
      .catch((err) => {
        if (thisRequestId === requestIdRef.current) {
          console.error('Error in useChildRewardImagesFetcher:', err);
          setState({
            isPersonalized: false,
            winner: [],
            loser: [],
            super_winner: [],
          });
        }
      });
  }, [childId]);

  return state;
}
