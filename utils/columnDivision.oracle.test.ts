/**
 * Independent oracle for column division layouts.
 *
 * IMPORTANT: this file deliberately does NOT re-implement the long-division
 * algorithm. It only reads the cells that buildDivisionLayout produced and
 * checks them against arithmetic identities and layout rules that must hold
 * for ANY correct long division. Do not "simplify" it by importing helpers
 * from columnDivision.ts other than buildDivisionLayout and its types.
 */
import { describe, it, expect } from 'vitest';
import { buildDivisionLayout, DivisionCell } from './columnDivision';

const num = (cells: DivisionCell[]): number => Number(cells.map((c) => c.expected).join(''));

function checkLayoutAgainstArithmetic(dividend: number, divisor: number): string[] {
  const problems: string[] = [];
  const err = (m: string) => problems.push(`${dividend}/${divisor}: ${m}`);

  const L = buildDivisionLayout(dividend, divisor);
  const D = String(dividend).split('').map(Number);
  const n = D.length;
  const steps = Math.max(...L.cells.map((c) => c.step)) + 1;

  const q = (i: number) => L.cells.find((c) => c.kind === 'quotient' && c.step === i)!;
  const prod = (i: number) => L.cells.filter((c) => c.kind === 'product' && c.step === i);
  const work = (i: number) => L.cells.filter((c) => c.kind === 'working' && c.step === i);

  // First working number is read from the dividend itself: 1 or 2 leading digits.
  const e0 = prod(0)[prod(0).length - 1].col;
  if (e0 !== 0 && e0 !== 1) err(`e0=${e0}`);
  if ((e0 === 0) !== (D[0] >= divisor)) err('e0 rule (one vs two leading digits)');
  let W = Number(D.slice(0, e0 + 1).join(''));

  for (let i = 0; i < steps; i++) {
    const P = num(prod(i));
    const qi = Number(q(i).expected);
    if (P !== qi * divisor) err(`step ${i}: product ${P} != ${qi}*${divisor}`);
    if (qi !== Math.floor(W / divisor)) err(`step ${i}: quotient digit ${qi} wrong for W=${W}`);
    if (q(i).col !== i) err(`step ${i}: quotient col ${q(i).col}`);

    const pc = prod(i);
    if (pc[pc.length - 1].col !== e0 + i) err(`step ${i}: product right edge ${pc[pc.length - 1].col}`);
    for (let k = 1; k < pc.length; k++) if (pc[k].col !== pc[k - 1].col + 1) err(`step ${i}: product not contiguous`);
    if (pc.length > 1 && pc[0].expected === '0') err(`step ${i}: product has leading zero`);

    const r = W - P;
    if (r < 0 || r >= divisor) err(`step ${i}: remainder ${r} out of range`);

    if (i < steps - 1) {
      const wc = work(i);
      const nextW = r * 10 + D[e0 + i + 1];
      if (num(wc) !== nextW) err(`step ${i}: working number ${num(wc)} != ${nextW}`);
      if (wc.length !== (r === 0 ? 1 : 2)) err(`step ${i}: working cell count ${wc.length} for remainder ${r}`);
      if (wc[wc.length - 1].col !== e0 + i + 1) err(`step ${i}: working right edge ${wc[wc.length - 1].col}`);
      for (let k = 1; k < wc.length; k++) if (wc[k].col !== wc[k - 1].col + 1) err(`step ${i}: working not contiguous`);
      W = nextW;
    } else {
      if (r !== 0) err('last remainder is not 0');
      if (e0 + i !== n - 1) err('last step is not at last dividend column');
      const f = L.cells.find((c) => c.kind === 'final')!;
      if (f.col !== n - 1 || f.expected !== '0') err('final cell');
    }
  }

  // Solving order: per step quotient, product (left to right), working (left to right); then final.
  const expectedSeq: string[] = [];
  for (let i = 0; i < steps; i++) expectedSeq.push(q(i).id, ...prod(i).map((c) => c.id), ...work(i).map((c) => c.id));
  expectedSeq.push(L.cells.find((c) => c.kind === 'final')!.id);
  if (JSON.stringify(expectedSeq) !== JSON.stringify(L.solvingSequence)) err('solvingSequence order');

  // `row` field must match kind and step for EVERY cell.
  for (const c of L.cells) {
    const rowOk =
      c.kind === 'quotient' ? c.row === 'quotient'
      : c.kind === 'final' ? c.row === 'final'
      : typeof c.row === 'object' && c.row.stepRow === c.step && c.row.part === c.kind;
    if (!rowOk) err(`cell ${c.id}: row field does not match kind/step`);
  }

  // No two cells may occupy the same position. Quotient cells live in their own
  // block (right of the dividend), all other cells share the dividend columns:
  // product of step i is one grid row, working/final cells after step i are another.
  const seen = new Set<string>();
  for (const c of L.cells) {
    const rowKey =
      c.kind === 'quotient' ? 'Q'
      : c.kind === 'product' ? `P${c.step}`
      : `R${c.step}`; // working cells and the final cell both sit below the line of their step
    const key = `${rowKey}:${c.col}`;
    if (seen.has(key)) err(`two cells share position ${key}`);
    seen.add(key);
  }

  return problems;
}

describe('column division oracle (arithmetic invariants, no algorithm copy)', () => {
  it('holds for every exact 3-4 digit dividend and divisor 2-9 (18,106 pairs)', () => {
    let processed = 0;
    const problems: string[] = [];
    for (let a = 100; a <= 9999; a++) {
      for (let v = 2; v <= 9; v++) {
        if (a % v !== 0) continue;
        processed++;
        // every pair is always processed; only the stored error list is capped
        for (const m of checkLayoutAgainstArithmetic(a, v)) if (problems.length < 10) problems.push(m);
      }
    }
    expect(processed).toBe(18106);
    expect(problems).toEqual([]);
  });

  // Hand-written expectations (NOT derived from the code under test).
  // Format: kind|step|col|expected
  const norm = (dividend: number, divisor: number) =>
    buildDivisionLayout(dividend, divisor)
      .cells.map((c) => `${c.kind}|${c.step}|${c.col}|${c.expected}`)
      .sort();

  it('2400 / 6 = 400: two-digit start (24), then a chain of zero remainders', () => {
    expect(norm(2400, 6)).toEqual(
      [
        'quotient|0|0|4', 'quotient|1|1|0', 'quotient|2|2|0',
        'product|0|0|2', 'product|0|1|4', 'product|1|2|0', 'product|2|3|0',
        'working|0|2|0', 'working|1|3|0',
        'final|2|3|0',
      ].sort()
    );
  });

  it('9000 / 9 = 1000: one-digit start, then a chain of zero remainders', () => {
    expect(norm(9000, 9)).toEqual(
      [
        'quotient|0|0|1', 'quotient|1|1|0', 'quotient|2|2|0', 'quotient|3|3|0',
        'product|0|0|9', 'product|1|1|0', 'product|2|2|0', 'product|3|3|0',
        'working|0|1|0', 'working|1|2|0', 'working|2|3|0',
        'final|3|3|0',
      ].sort()
    );
  });

  it('row field matches kind and step for every cell (2400 / 6)', () => {
    for (const c of buildDivisionLayout(2400, 6).cells) {
      if (c.kind === 'quotient') expect(c.row).toBe('quotient');
      else if (c.kind === 'final') expect(c.row).toBe('final');
      else expect(c.row).toEqual({ stepRow: c.step, part: c.kind });
    }
  });
});
