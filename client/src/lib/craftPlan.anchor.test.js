// IDEIA-065: o Craft usa o preço de saída realista quando a oferta (ordem de venda) é isolada.
import { beforeEach, describe, expect, it } from 'vitest';
import { recipeOf } from './catalog';
import { computeCraft } from './craftPlan';
import { craftFocusSummary } from './focus';
import { craftStressInput, stressProfit } from './stress';
import { loadFixtureCatalog, mkPrices } from '../test/helpers';

beforeEach(loadFixtureCatalog);

const D = 86400000;
const NOW = Date.UTC(2026, 9, 26, 12);
const serie = (ps) => ps.map((p, i) => ({ t: Date.UTC(2026, 9, 19) + i * D, n: 10, p }));
const CASO1 = serie([8431, 5381, 2009, 5498, 8316, 10999, 6309]);
const hist = (over = {}) => ({ T6_MAIN_SWORD: { Caerleon: CASO1, ...over } });
const cfg0 = (over = {}) => ({
  craftCity: 'Lymhurst', specialty: true, focus: false, feePer100: 400, customRRR: '', matCity: 'best', useOrders: false, crafts: 1,
  refine: { METALBAR: 'buy', LEATHER: 'buy' }, refineFocus: false, refineFee: 400, refineCity: 'auto', refineDaily: {}, ...over,
});
const prices = (sword) => mkPrices({ T6_METALBAR: 200, T6_LEATHER: 150, T6_MAIN_SWORD: sword });
const run = (over = {}, sword = { Caerleon: { s: 12000 } }, history = hist()) =>
  computeCraft({ rec: recipeOf('T6_MAIN_SWORD'), targetMid: 'T6_MAIN_SWORD', prices: prices(sword), cfg: cfg0(over), premium: true, bonusCity: null, anchor: history ? { history, now: NOW } : undefined });
const ord = (c, city = 'Caerleon') => c.options.find((o) => o.city === city && o.mode === 'order');

describe('computeCraft: preço realista (065)', () => {
  it('sem anchor: idêntico ao de hoje (preço listado)', () => {
    const a = run({}, undefined, null);
    expect(ord(a).price).toBe(12000);
    expect(ord(a).anchorState).toBeUndefined();
    expect(a.anchor).toMatchObject({ anchoredCount: 0 });
  });
  it('com anchor e on: preço 7.886,25, listed 12.000, anchored; lucro = (7.886,25 × 0,935 − custo)', () => {
    const a = run();
    const o = ord(a);
    expect(o.price).toBeCloseTo(7886.25, 6);
    expect(o).toMatchObject({ listed: 12000, anchorState: 'anchored', median: 6309, points: 7 });
    expect(o.ceiling).toBeCloseTo(7886.25, 6);
    expect(o.profit).toBeCloseTo(7886.25 * 0.935 * a.units - a.totalCost, 4);
    expect(a.anchor).toEqual({ on: true, k: 1.25, days: 7, anchoredCount: 1 });
  });
  it('anchorOn false: preço listado, mas o estado continua anchored e o teto aparece', () => {
    const o = ord(run({ anchorOn: false }));
    expect(o.price).toBe(12000);
    expect(o.anchorState).toBe('anchored');
    expect(o.ceiling).toBeCloseTo(7886.25, 6);
  });
  it('listado 7.000: não ancora', () => {
    const o = ord(run({}, { Caerleon: { s: 7000 } }));
    expect(o).toMatchObject({ price: 7000, anchorState: 'listed' });
  });
  it('a melhor saída muda: Caerleon 12.000 (ancorada) e Martlock 8.500 sem histórico', () => {
    const sword = { Caerleon: { s: 12000 }, Martlock: { s: 8500 } };
    const h = hist({ Martlock: [] });
    expect(run({ anchorOn: false }, sword, h).best.city).toBe('Caerleon');
    const c = run({}, sword, h);
    expect(c.best).toMatchObject({ city: 'Martlock', price: 8500, anchorState: 'nohistory' });
    expect(ord(c).profit).toBeLessThan(c.best.profit);
  });
  it('opção instant nunca é ancorada', () => {
    const c = run({}, { Caerleon: { s: 7000, b: 12000 } });
    const i = c.options.find((o) => o.mode === 'instant');
    expect(i.price).toBe(12000);
    expect(i.anchorState).toBeUndefined();
  });
  it('saída marcada Sem imposto: o preço ancorado entra sem imposto', () => {
    const a = run({ noTax: { 'Caerleon|order': true } });
    expect(ord(a).net).toBeCloseTo(7886.25 * a.units, 4);
  });
  it('cfg corrompida: não lança, padrões e avisos em issues', () => {
    const base = run();
    for (const over of [{ anchorK: null }, { anchorK: {} }, { anchorK: 'abc' }, { anchorK: 0 }, { anchorK: 1e9 }, { anchorDays: 'x' }, { anchorDays: 1 }, { anchorOn: 'sim' }]) {
      let c;
      expect(() => { c = run(over); }).not.toThrow();
      expect(Number.isFinite(c.best.profit)).toBe(true);
    }
    expect(run({ anchorK: 'abc' }).issues.some((i) => i.field === 'anchorK')).toBe(true);
    expect(run({ anchorK: 'abc' }).best.price).toBeCloseTo(base.best.price, 6);
    expect(run({ anchorDays: 'x' }).issues.some((i) => i.field === 'anchorDays')).toBe(true);
    expect(run({ anchorOn: 'sim' }).issues.some((i) => i.field === 'anchorOn')).toBe(true);
  });
  it('estresse usa o preço realista e concorda com o lucro da tela', () => {
    const c = run();
    const si = craftStressInput(c, true);
    expect(si.price).toBeCloseTo(7886.25, 6);
    expect(stressProfit(si, {}) * c.units).toBeCloseTo(c.best.profit, 6);
  });
  it('craftFocusSummary: com anchor usa o realista; sem anchor idêntico a hoje', () => {
    const args = { rec: recipeOf('T6_MAIN_SWORD'), targetMid: 'T6_MAIN_SWORD', prices: prices({ Caerleon: { s: 12000 } }), cfg: cfg0(), premium: true, bonusCity: null, base: null };
    const sem = craftFocusSummary(args);
    const com = craftFocusSummary({ ...args, anchor: { history: hist(), now: NOW } });
    expect(sem.profitOff - com.profitOff).toBeCloseTo((12000 - 7886.25) * 0.935, 3);
  });
  it('combinado com a 059: atualizações sobre o preço realista', () => {
    const a = run({ relists: 2 });
    const o = ord(a);
    expect(o.net).toBeCloseTo(a.units * (7886.25 * 0.935 - 0.025 * 2 * 7886.25), 4);
  });
});
