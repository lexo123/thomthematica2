/**
 * Independent oracle for column division layouts (rules v2: uniform rows, optional cells).
 *
 * IMPORTANT: this file deliberately does NOT re-implement the layout algorithm.
 * It only reads the cells that buildDivisionLayout produced and checks them against
 * arithmetic identities and layout rules that must hold for ANY correct long division.
 * Do not "simplify" it by importing anything from columnDivision.ts other than
 * buildDivisionLayout, validateDivisionAnswers and the types.
 *
 * Cell rules: 'required' = must equal expected; 'optional' = empty OR equal to expected;
 * 'blank' = must stay empty (any digit is wrong).
 */
import { describe, it, expect } from 'vitest';
import { buildDivisionLayout, validateDivisionAnswers, DivisionCell } from './columnDivision';

const num = (cells: DivisionCell[]): number => Number(cells.map((c) => c.expected).join(''));
const byCol = (cells: DivisionCell[]): DivisionCell[] => [...cells].sort((a, b) => a.col - b.col);
const wrongDigit = (d: string): string => String((Number(d) + 1) % 10);

function checkLayout(dividend: number, divisor: number): string[] {
  const problems: string[] = [];
  const err = (m: string) => problems.push(`${dividend}/${divisor}: ${m}`);

  const L = buildDivisionLayout(dividend, divisor);
  const D = String(dividend).split('').map(Number);
  const n = D.length;

  const allowedKinds = new Set(['quotient', 'spare', 'product', 'working', 'final']);
  for (const c of L.cells) if (!allowedKinds.has(c.kind)) err(`unknown kind ${c.kind}`);
  if (new Set(L.cells.map((c) => c.id)).size !== L.cells.length) err('duplicate cell ids');

  const quot = L.cells.filter((c) => c.kind === 'quotient').sort((a, b) => a.step - b.step);
  const spare = L.cells.filter((c) => c.kind === 'spare');
  const finals = L.cells.filter((c) => c.kind === 'final');
  const steps = quot.length;
  const last = steps - 1;
  const prod = (i: number) => byCol(L.cells.filter((c) => c.kind === 'product' && c.step === i));
  const work = (i: number) => byCol(L.cells.filter((c) => c.kind === 'working' && c.step === i));

  // Quotient row always has exactly n cells: real digits first, then (at most one) spare at the END.
  if (steps + spare.length !== n) err(`quotient row has ${steps + spare.length} cells, expected ${n}`);
  if (spare.length !== (steps < n ? 1 : 0)) err('spare count');
  quot.forEach((c, i) => {
    if (c.col !== i) err(`quotient col ${c.col} for step ${i}`);
    if (c.rule !== 'required') err(`quotient step ${i} must be required`);
  });
  for (const s of spare) {
    if (s.col !== steps || s.rule !== 'blank' || s.expected !== '') err('spare cell shape');
  }

  // Number of leading dividend digits in the first working number (1 or 2).
  const e0 = D[0] >= divisor ? 0 : 1;
  let W = Number(D.slice(0, e0 + 1).join(''));

  const expectedCells = steps + spare.length + 1;
  let counted = expectedCells;

  for (let i = 0; i < steps; i++) {
    const isLast = i === last;
    const qi = Number(quot[i].expected);
    if (qi !== Math.floor(W / divisor)) err(`step ${i}: quotient digit ${qi} wrong for W=${W}`);

    const pc = prod(i);
    const wantLen = i === 0 && e0 === 0 ? 1 : 2;
    counted += pc.length;
    if (pc.length !== wantLen) err(`step ${i}: product has ${pc.length} cells, expected ${wantLen}`);
    const P = num(pc);
    if (P !== qi * divisor) err(`step ${i}: product ${P} != ${qi}*${divisor}`);
    if (pc[pc.length - 1].col !== e0 + i) err(`step ${i}: product right edge ${pc[pc.length - 1].col}`);
    if (pc.length === 2 && pc[0].col !== e0 + i - 1) err(`step ${i}: product left col`);
    if (pc.length === 2 && P >= 10 && pc[0].expected !== String(Math.floor(P / 10))) err(`step ${i}: product tens digit`);
    if (pc[pc.length - 1].expected !== String(P % 10)) err(`step ${i}: product units digit`);
    // rules
    pc.forEach((c, k) => {
      const isLeadingSlot = pc.length === 2 && k === 0 && P < 10;
      const want = isLast || isLeadingSlot ? 'optional' : 'required';
      if (c.rule !== want) err(`step ${i}: product cell ${k} rule ${c.rule}, expected ${want}`);
    });

    const r = W - P;
    if (r < 0 || r >= divisor) err(`step ${i}: remainder ${r} out of range`);

    if (!isLast) {
      const wc = work(i);
      counted += wc.length;
      if (wc.length !== 2) err(`step ${i}: working row has ${wc.length} cells (must always be 2)`);
      else {
        const nextDigit = D[e0 + i + 1];
        if (wc[0].col !== e0 + i || wc[1].col !== e0 + i + 1) err(`step ${i}: working cols`);
        if (wc[0].expected !== String(r)) err(`step ${i}: remainder cell ${wc[0].expected} != ${r}`);
        if (wc[0].rule !== (r === 0 ? 'optional' : 'required')) err(`step ${i}: remainder cell rule`);
        if (wc[1].expected !== String(nextDigit) || wc[1].rule !== 'required') err(`step ${i}: brought-down digit`);
        if (num(wc) !== r * 10 + nextDigit) err(`step ${i}: working number`);
        W = r * 10 + nextDigit;
      }
    } else {
      if (work(i).length !== 0) err('last step must have no working cells');
      if (r !== 0) err('last remainder is not 0');
      if (e0 + i !== n - 1) err('last step is not at last dividend column');
    }
  }
  if (finals.length !== 1) err('exactly one final cell');
  else if (finals[0].col !== n - 1 || finals[0].expected !== '0' || finals[0].rule !== 'optional' || finals[0].step !== last) err('final cell shape');
  if (counted !== L.cells.length) err(`cell count ${L.cells.length} != ${counted}`);

  // row field must match kind and step for EVERY cell
  for (const c of L.cells) {
    const rowOk =
      c.kind === 'quotient' || c.kind === 'spare' ? c.row === 'quotient'
      : c.kind === 'final' ? c.row === 'final'
      : typeof c.row === 'object' && c.row.stepRow === c.step && c.row.part === c.kind;
    if (!rowOk) err(`cell ${c.id}: row field does not match kind/step`);
  }

  // No two cells occupy the same position.
  const seen = new Set<string>();
  for (const c of L.cells) {
    const rowKey = c.kind === 'quotient' || c.kind === 'spare' ? 'Q' : c.kind === 'product' ? `P${c.step}` : `R${c.step}`;
    const key = `${rowKey}:${c.col}`;
    if (seen.has(key)) err(`two cells share position ${key}`);
    seen.add(key);
  }

  // Solving order: per step quotient, product L->R, working L->R; then final.
  // The spare quotient cell is NOT part of the solving order (the child can still tap it).
  const seq: string[] = [];
  for (let i = 0; i < steps; i++) {
    seq.push(quot[i].id);
    seq.push(...prod(i).map((c) => c.id), ...work(i).map((c) => c.id));
  }
  seq.push(...finals.map((c) => c.id));
  if (JSON.stringify(seq) !== JSON.stringify(L.solvingSequence)) err('solvingSequence order');

  // Behaviour through the public validation API.
  const required = L.cells.filter((c) => c.rule === 'required');
  const optional = L.cells.filter((c) => c.rule === 'optional');
  const perfect: Record<string, string> = {};
  for (const c of L.cells) perfect[c.id] = c.expected;
  if (!validateDivisionAnswers(L, perfect).isAllCorrect) err('perfect child is not all-correct');
  const minimal: Record<string, string> = {};
  for (const c of required) minimal[c.id] = c.expected;
  if (!validateDivisionAnswers(L, minimal).isAllCorrect) err('child who fills only required cells is not all-correct');
  const r0 = required[0];
  const omitted = { ...minimal }; delete omitted[r0.id];
  const vo = validateDivisionAnswers(L, omitted);
  if (vo.statuses[r0.id] !== 'empty' || vo.isAllCorrect) err('omitted required cell must be empty/not correct');
  const vw = validateDivisionAnswers(L, { ...minimal, [r0.id]: wrongDigit(r0.expected) });
  if (vw.statuses[r0.id] !== 'wrong' || vw.isAllCorrect) err('wrong required cell must be wrong');
  for (const o of optional) {
    const vOptWrong = validateDivisionAnswers(L, { ...minimal, [o.id]: wrongDigit(o.expected) });
    if (vOptWrong.statuses[o.id] !== 'wrong' || vOptWrong.isAllCorrect) err(`optional cell ${o.id}: wrong digit must be wrong`);
    const vOptRight = validateDivisionAnswers(L, { ...minimal, [o.id]: o.expected });
    if (!vOptRight.isAllCorrect) err(`optional cell ${o.id}: correct digit must be accepted`);
  }
  for (const s of spare) {
    for (const d of ['0', '5']) {
      const vs = validateDivisionAnswers(L, { ...minimal, [s.id]: d });
      if (vs.statuses[s.id] !== 'wrong' || vs.isAllCorrect) err(`spare cell must reject "${d}"`);
    }
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
        for (const m of checkLayout(a, v)) if (problems.length < 10) problems.push(m);
      }
    }
    expect(processed).toBe(18106);
    expect(problems).toEqual([]);
  });

  // Hand-reviewed expectations (NOT derived from the code under test).
  // Format: kind|step|col|rule|expected
const FIXTURES: [number, number, string[]][] = [
    [345, 3, [
      'quotient|0|0|required|1', 'product|0|0|required|3', 'working|0|0|optional|0', 'working|0|1|required|4', 'quotient|1|1|required|1', 'product|1|0|optional|0', 'product|1|1|required|3', 'working|1|1|required|1', 'working|1|2|required|5', 'quotient|2|2|required|5', 'product|2|1|optional|1', 'product|2|2|optional|5', 'final|2|2|optional|0'
    ]],
    [215, 5, [
      'quotient|0|0|required|4', 'product|0|0|required|2', 'product|0|1|required|0', 'working|0|1|required|1', 'working|0|2|required|5', 'quotient|1|1|required|3', 'spare|1|2|blank|', 'product|1|1|optional|1', 'product|1|2|optional|5', 'final|1|2|optional|0'
    ]],
    [612, 6, [
      'quotient|0|0|required|1', 'product|0|0|required|6', 'working|0|0|optional|0', 'working|0|1|required|1', 'quotient|1|1|required|0', 'product|1|0|optional|0', 'product|1|1|required|0', 'working|1|1|required|1', 'working|1|2|required|2', 'quotient|2|2|required|2', 'product|2|1|optional|1', 'product|2|2|optional|2', 'final|2|2|optional|0'
    ]],
    [4056, 4, [
      'quotient|0|0|required|1', 'product|0|0|required|4', 'working|0|0|optional|0', 'working|0|1|required|0', 'quotient|1|1|required|0', 'product|1|0|optional|0', 'product|1|1|required|0', 'working|1|1|optional|0', 'working|1|2|required|5', 'quotient|2|2|required|1', 'product|2|1|optional|0', 'product|2|2|required|4', 'working|2|2|required|1', 'working|2|3|required|6', 'quotient|3|3|required|4', 'product|3|2|optional|1', 'product|3|3|optional|6', 'final|3|3|optional|0'
    ]],
    [1000, 8, [
      'quotient|0|0|required|1', 'product|0|0|optional|0', 'product|0|1|required|8', 'working|0|1|required|2', 'working|0|2|required|0', 'quotient|1|1|required|2', 'product|1|1|required|1', 'product|1|2|required|6', 'working|1|2|required|4', 'working|1|3|required|0', 'quotient|2|2|required|5', 'spare|2|3|blank|', 'product|2|2|optional|4', 'product|2|3|optional|0', 'final|2|3|optional|0'
    ]],
    [2400, 6, [
      'quotient|0|0|required|4', 'product|0|0|required|2', 'product|0|1|required|4', 'working|0|1|optional|0', 'working|0|2|required|0', 'quotient|1|1|required|0', 'product|1|1|optional|0', 'product|1|2|required|0', 'working|1|2|optional|0', 'working|1|3|required|0', 'quotient|2|2|required|0', 'spare|2|3|blank|', 'product|2|2|optional|0', 'product|2|3|optional|0', 'final|2|3|optional|0'
    ]],
    [9000, 9, [
      'quotient|0|0|required|1', 'product|0|0|required|9', 'working|0|0|optional|0', 'working|0|1|required|0', 'quotient|1|1|required|0', 'product|1|0|optional|0', 'product|1|1|required|0', 'working|1|1|optional|0', 'working|1|2|required|0', 'quotient|2|2|required|0', 'product|2|1|optional|0', 'product|2|2|required|0', 'working|2|2|optional|0', 'working|2|3|required|0', 'quotient|3|3|required|0', 'product|3|2|optional|0', 'product|3|3|optional|0', 'final|3|3|optional|0'
    ]],
  ];
  
  const norm = (dividend: number, divisor: number) =>
    buildDivisionLayout(dividend, divisor)
      .cells.map((c) => `${c.kind}|${c.step}|${c.col}|${c.rule}|${c.expected}`)
      .sort();

  for (const [a, v, cells] of FIXTURES) {
    it(`golden layout ${a} / ${v}`, () => {
      expect(norm(a, v)).toEqual([...cells].sort());
    });
  }

  it('solving order for 345 / 3 (hand-written literal)', () => {
    expect(buildDivisionLayout(345, 3).solvingSequence).toEqual([
      'q-0', 'p-0-0', 'w-0-0', 'w-0-1', 'q-1', 'p-1-0', 'p-1-1', 'w-1-0', 'w-1-1', 'q-2', 'p-2-0', 'p-2-1', 'final',
    ]);
  });

  it('solving order for 215 / 5 does not include the spare quotient cell', () => {
    expect(buildDivisionLayout(215, 5).solvingSequence).toEqual([
      'q-0', 'p-0-0', 'p-0-1', 'w-0-0', 'w-0-1', 'q-1', 'p-1-0', 'p-1-1', 'final',
    ]);
  });
});
