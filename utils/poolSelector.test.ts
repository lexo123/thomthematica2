import { describe, it, expect } from 'vitest';
import { selectFromPool } from './poolSelector';

describe('selectFromPool', () => {
  // 1. No repeat until exhausted: source=[A,B,C], 3 selection-ი → Set(selected).size === 3 (არცერთი გამეორება)
  it('selects without repeat until pool is exhausted (Set size equals source length)', () => {
    const source = ['A', 'B', 'C'];
    const poolRef = { current: [] as string[] };

    const selected = [
      selectFromPool(poolRef, source),
      selectFromPool(poolRef, source),
      selectFromPool(poolRef, source),
    ];

    expect(new Set(selected).size).toBe(3);
    expect(selected.sort()).toEqual(['A', 'B', 'C']);
    expect(poolRef.current.length).toBe(0);
  });

  // 2. Refill after exhaustion: 4 selection 3-ელემენტიან source-ზე → მე-4 selection ახალი cycle-იდანაა
  it('refills pool after exhaustion on subsequent selection', () => {
    const source = ['A', 'B', 'C'];
    const poolRef = { current: [] as string[] };

    const first3 = [
      selectFromPool(poolRef, source),
      selectFromPool(poolRef, source),
      selectFromPool(poolRef, source),
    ];
    expect(new Set(first3).size).toBe(3);
    expect(poolRef.current.length).toBe(0);

    const fourth = selectFromPool(poolRef, source);
    expect(source).toContain(fourth);
    // After 4th selection on 3-element source, pool was refilled to 3 then 1 was taken, leaving 2
    expect(poolRef.current.length).toBe(2);
  });

  // 3. One-element source: [A] → ყოველთვის A, არასდროს იშლება
  it('handles one-element source consistently across repeated selections', () => {
    const source = ['A'];
    const poolRef = { current: [] as string[] };

    for (let i = 0; i < 5; i++) {
      const selected = selectFromPool(poolRef, source);
      expect(selected).toBe('A');
    }
  });

  // 4. Source is not mutated: select-ების შემდეგ originalSource-ი ბიტობრივად იგივეა, რაც დასაწყისში (deep equality)
  it('does not mutate originalSource array', () => {
    const source = ['A', 'B', 'C', 'D'];
    const sourceSnapshot = [...source];
    const poolRef = { current: [] as string[] };

    selectFromPool(poolRef, source);
    selectFromPool(poolRef, source);
    selectFromPool(poolRef, source);

    expect(source).toEqual(sourceSnapshot);
    expect(source.length).toBe(4);
  });

  // 5. Empty source: throw-ს ამოწმებს (toThrow())
  it('throws an error when originalSource is empty', () => {
    const source: string[] = [];
    const poolRef = { current: [] as string[] };

    expect(() => selectFromPool(poolRef, source)).toThrow(
      'selectFromPool: originalSource is empty — cannot select an item.'
    );
  });
});
