// IDEIA-088 Task 3: o Mercado Negro tem DUAS leituras. A do cabeçalho (enquanto BM_READING_VERIFIED é null: a MENOR) fica em `options`;
// a outra vai para `bmAlt` (mesmos números, fora do melhor destino). Desvio do plano: o plano põe a 2ª leitura em `options`, mas o teste
// existente DT-001 (craftPlan.test.js) exige exatamente [Lymhurst order, Black Market instant] nas opções (ver docs/qa/BATCH1-NOTAS.md).
import { beforeEach, describe, expect, it } from 'vitest';
import { recipeOf } from './catalog';
import { computeCraft } from './craftPlan';
import { annotateOptions, pickExit } from './exits';
import { netSale } from './econ';
import { loadFixtureCatalog, mkPrices } from '../test/helpers';

beforeEach(loadFixtureCatalog);

const NOW = Date.now();
const cfg = (over = {}) => ({
  craftCity: 'Lymhurst', specialty: true, focus: false, feePer100: 400, customRRR: '', matCity: 'best', useOrders: false, crafts: 1,
  refine: { METALBAR: 'buy', LEATHER: 'buy' }, refineFocus: false, refineFee: 400, refineCity: 'auto', refineDaily: {}, ...over,
});
const base = { T6_METALBAR: 200, T6_LEATHER: 150 };
const pricesOf = (bm, extra = {}) =>
  mkPrices({ ...base, T6_MAIN_SWORD: { ...extra, ...(bm ? { 'Black Market': { s: bm.s ?? 0, b: bm.b ?? 0, sd: NOW - 3600000, bd: NOW - 3600000 } } : {}) } });
const run = (bm, over = {}, extra = {}, bmVerified) =>
  computeCraft({ rec: recipeOf('T6_MAIN_SWORD'), targetMid: 'T6_MAIN_SWORD', premium: true, bonusCity: null, cfg: cfg(over), prices: pricesOf(bm, extra), ...(bmVerified ? { bmVerified } : {}) });
const bmOpts = (c) => c.options.filter((o) => o.city === 'Black Market');

describe('opções do Mercado Negro com as duas leituras', () => {
  it('(a) as duas leituras existem (uma em options, outra em bmAlt); net(lista) - net(compra) = (10854 - 2607) x 0,96 x unidades', () => {
    const c = run({ b: 2607, s: 10854 });
    const all = [...bmOpts(c), ...c.bmAlt];
    expect(all.map((x) => x.reading).sort()).toEqual(['buy', 'list']);
    const buy = all.find((x) => x.reading === 'buy');
    const list = all.find((x) => x.reading === 'list');
    expect(list.net - buy.net).toBeCloseTo((10854 - 2607) * 0.96 * c.units, 6);
    expect(buy.net).toBeCloseTo(netSale(2607, 'instant', true) * c.units, 6);
    expect(list.profit - buy.profit).toBeCloseTo(list.net - buy.net, 6);
  });

  it('(b) com BM_READING_VERIFIED null: best é a de compra (a menor); a de lista fica em bmAlt, "não verificada", e nunca é best nem bestReal', () => {
    const c = run({ b: 2607, s: 10854 });
    expect(bmOpts(c)).toHaveLength(1);
    expect(bmOpts(c)[0].reading).toBe('buy');
    expect(c.bmAlt).toHaveLength(1);
    expect(c.bmAlt[0].reading).toBe('list');
    expect(c.bmAlt[0].unverified).toBe(true);
    expect(bmOpts(c)[0].unverified).toBe(true);
    expect(c.best.reading).toBe('buy');
    const { best, bestReal } = pickExit(annotateOptions(c.options, pricesOf({ b: 2607, s: 10854 }), 'T6_MAIN_SWORD', { now: NOW }));
    expect(best.reading).toBe('buy');
    expect(bestReal?.reading).not.toBe('list');
  });

  it('(c) com bmVerified "list" a de lista vira best (em options) e a de compra vai para bmAlt', () => {
    const c = run({ b: 2607, s: 10854 }, {}, {}, 'list');
    expect(c.best.reading).toBe('list');
    expect(c.best.unverified).toBe(false);
    expect(c.bmAlt.map((x) => x.reading)).toEqual(['buy']);
    expect(c.bmAlt[0].unverified).toBe(true);
  });

  it('lista MENOR que a compra com bmVerified null: a menor (lista) é o cabeçalho; a compra vai para bmAlt', () => {
    const c = run({ b: 2000, s: 1000 });
    expect(c.best.reading).toBe('list');
    expect(c.bmAlt.map((x) => x.reading)).toEqual(['buy']);
  });

  it('(d) só compra (lista 0): UMA linha, igual à de antes (rótulo "Ordem de compra"), nada em bmAlt; sem Mercado Negro: nenhuma opção ganha campo novo', () => {
    const c = run({ b: 2607, s: 0 });
    expect(bmOpts(c)).toHaveLength(1);
    expect(bmOpts(c)[0].label).toBe('Ordem de compra');
    expect(c.bmAlt).toEqual([]);
    expect(c.best.city).toBe('Black Market');
    expect(bmOpts(c)[0].net).toBeCloseTo(netSale(2607, 'instant', true) * c.units, 6);
    const none = run(null, {}, { Caerleon: { s: 5000, b: 4000 } });
    expect(none.bmAlt).toEqual([]);
    for (const o of none.options) {
      expect(o.reading).toBeUndefined();
      expect(o.unverified).toBeUndefined();
    }
  });

  it('só lista (compra 0): a lista fica em bmAlt e não vira best', () => {
    const c = run({ b: 0, s: 10854 }, {}, { Caerleon: { s: 5000, b: 4000 } });
    expect(c.bmAlt.map((x) => x.reading)).toEqual(['list']);
    expect(c.best.city).toBe('Caerleon');
    expect(bmOpts(c)).toHaveLength(0);
  });

  it('(e) annotateOptions repassa reading e unverified; a ilusória da 066 não muda', () => {
    const c = run({ b: 2607, s: 10854 }, {}, { Caerleon: { s: 9000, b: 0 } });
    const a = annotateOptions(c.options, pricesOf({ b: 2607, s: 10854 }, { Caerleon: { s: 9000, b: 0 } }), 'T6_MAIN_SWORD', { now: NOW });
    expect(a.find((x) => x.city === 'Black Market').reading).toBe('buy');
    expect(a.find((x) => x.city === 'Black Market').unverified).toBe(true);
    expect(a.find((x) => x.city === 'Caerleon' && x.mode === 'order')?.illusory).toBe(true);
    expect(a.filter((x) => x.city === 'Black Market').every((x) => !x.illusory)).toBe(true);
  });

  it('(f) noTax["Black Market|list"] vale só para a de lista; "Black Market|instant" só para a de compra', () => {
    const c = run({ b: 2607, s: 10854 }, { noTax: { 'Black Market|list': true } });
    expect(c.bmAlt[0].noTax).toBe(true);
    expect(c.bmAlt[0].net).toBeCloseTo(10854 * c.units, 6);
    expect(bmOpts(c)[0].noTax).toBe(false);
    const d = run({ b: 2607, s: 10854 }, { noTax: { 'Black Market|instant': true } });
    expect(bmOpts(d)[0].noTax).toBe(true);
    expect(d.bmAlt[0].noTax).toBe(false);
  });
});
