import { describe, it, expect } from 'vitest';
import { cleanAnchor, realisticPrice, ANCHOR_K, ANCHOR_DAYS } from './anchor';
import { windowStats } from './liquidity';

const serie = (ps, d0 = Date.UTC(2026, 9, 19)) => ps.map((p, i) => ({ t: d0 + i * 86400000, n: 10, p }));
const now1 = Date.UTC(2026, 9, 26, 12);
const C1 = serie([8431, 5381, 2009, 5498, 8316, 10999, 6309]);
const C2 = serie([602, 602, 602, 1028, 602, 602, 602, 602, 603, 603, 603, 603, 1508, 603], Date.UTC(2026, 10, 12));
const now2 = Date.UTC(2026, 10, 26, 10);
const real = (listed, series, o = {}) => realisticPrice({ listed, stats: windowStats(series, { now: o.now ?? now1, days: o.days ?? 7 }), k: o.k ?? 1.25 });

describe('realisticPrice (065)', () => {
  it('caso 1: listado 12.000 -> anchored, mediana 6.309, teto 7.886,25', () => {
    const r = real(12000, C1);
    expect(r).toMatchObject({ state: 'anchored', median: 6309, points: 7, listed: 12000 });
    expect(r.ceiling).toBeCloseTo(7886.25, 6);
    expect(r.price).toBeCloseTo(7886.25, 6);
  });
  it('caso 2: mediana 603 (não a média), teto 753,75; com days 14 mediana 602,5 e teto 753,125', () => {
    const r = real(1840, C2, { now: now2 });
    expect(r.median).toBe(603);
    expect(r.price).toBeCloseTo(753.75, 6);
    const r14 = real(1840, C2, { now: now2, days: 14 });
    expect(r14.median).toBe(602.5);
    expect(r14.price).toBeCloseTo(753.125, 6);
  });
  it('abaixo do teto: listed; na borda exata: listed (não ancora)', () => {
    expect(real(7000, C1)).toMatchObject({ state: 'listed', price: 7000 });
    expect(real(7886.25, C1)).toMatchObject({ state: 'listed', price: 7886.25 });
  });
  it('fantasma 9.999.999 ancora a 7.886,25', () => {
    expect(real(9999999, C1).price).toBeCloseTo(7886.25, 6);
  });
  it('k 1 -> teto 6.309; k 1,5 -> 9.463,5', () => {
    expect(real(12000, C1, { k: 1 }).price).toBeCloseTo(6309, 6);
    expect(real(12000, C1, { k: 1.5 }).price).toBeCloseTo(9463.5, 6);
  });
  it('2 dias com dado: nohistory e price = listed; 3 dias: ancora', () => {
    expect(real(12000, serie([6000, 6300]))).toMatchObject({ state: 'nohistory', price: 12000 });
    expect(real(12000, serie([6000, 6300, 6309]))).toMatchObject({ state: 'anchored' });
  });
  it('sem série / [] / fora da janela / mediana 0: nunca preço 0', () => {
    expect(realisticPrice({ listed: 100, stats: { state: 'unloaded' } }).state).toBe('unloaded');
    expect(realisticPrice({ listed: 100, stats: undefined }).state).toBe('unloaded');
    expect(real(100, [])).toMatchObject({ state: 'nohistory', price: 100 });
    expect(real(100, serie([5, 5, 5], Date.UTC(2026, 8, 1)))).toMatchObject({ state: 'nohistory' });
    expect(real(100, serie([0, 0, 0]))).toMatchObject({ state: 'nohistory', price: 100 });
  });
  it('listed inválido: invalid sem lançar', () => {
    for (const bad of [0, -5, NaN, 'x', null, undefined]) expect(real(bad, C1).state).toBe('invalid');
  });
});

describe('cleanAnchor (065)', () => {
  it('sem campos: padrões sem aviso (estado antigo); anchorOn false', () => {
    expect(cleanAnchor({})).toEqual({ values: { on: true, k: ANCHOR_K, days: ANCHOR_DAYS }, issues: [] });
    expect(cleanAnchor({ anchorOn: false }).values.on).toBe(false);
    expect(cleanAnchor({ anchorOn: null }).issues).toEqual([]);
    const bad = cleanAnchor({ anchorOn: 'x' });
    expect(bad.values.on).toBe(true);
    expect(bad.issues[0].field).toBe('anchorOn');
  });
  it('k', () => {
    expect(cleanAnchor({ anchorK: '1.5' }).values.k).toBe(1.5);
    expect(cleanAnchor({ anchorK: '' })).toMatchObject({ values: { k: 1.25 }, issues: [] });
    for (const bad of ['1,5', 0.9, 0, -1, {}, [2], 'abc']) {
      const r = cleanAnchor({ anchorK: bad });
      expect(r.values.k).toBe(1.25);
      expect(r.issues[0].field).toBe('anchorK');
      expect(r.issues[0].msg).not.toMatch(/object|\{|\[/);
    }
    for (const big of [11, 1e9]) expect(cleanAnchor({ anchorK: big }).values.k).toBe(10);
  });
  it('days', () => {
    expect(cleanAnchor({ anchorDays: '3' }).values.days).toBe(3);
    for (const bad of [2, 0, -5, 'abc']) {
      const r = cleanAnchor({ anchorDays: bad });
      expect(r.values.days).toBe(7);
      expect(r.issues[0].field).toBe('anchorDays');
    }
    for (const big of [31, 1e9]) expect(cleanAnchor({ anchorDays: big }).values.days).toBe(30);
    const dec = cleanAnchor({ anchorDays: 7.5 });
    expect(dec.values.days).toBe(7);
    expect(dec.issues.length).toBe(1);
  });
  it('cfg ruim não lança', () => {
    for (const bad of [null, undefined, [], 'x', 3]) expect(cleanAnchor(bad).values).toEqual({ on: true, k: 1.25, days: 7 });
  });
});
