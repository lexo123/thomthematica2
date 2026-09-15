import type React from 'react';

export function selectFromPool<T>(
  poolRef: React.MutableRefObject<T[]>,
  originalSource: T[]
): T {
  if (originalSource.length === 0) {
    throw new Error('selectFromPool: originalSource is empty — cannot select an item.');
  }
  if (poolRef.current.length === 0) {
    poolRef.current = [...originalSource];
  }
  const randomIndex = Math.floor(Math.random() * poolRef.current.length);
  const selected = poolRef.current[randomIndex];
  poolRef.current.splice(randomIndex, 1);
  return selected;
}
