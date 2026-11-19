import { beforeEach, describe, expect, it } from 'vitest';
import { recipeOf } from './catalog';
import { computeCraft } from './craftPlan';
import { evaluateTier } from './refinePlan';
import { refineUnit, netSale } from './econ';
import { breakEven, craftStressInput, refineStressInput, stressGrid, stressProfit, verdict } from './stress';
import { loadFixtureCatalog, mkPrices, planksSpec } from '../test/helpers';

beforeEach(loadFixtureCatalog);

// Dossiê IDEIA-031 §4: Broadsword T4, G = 4400, R = 33/133, F = 216, P = 4500, premium + ordem (k = 0,935)
const IN = { variable: 4400 * (100 / 133), fixed: 216, price: 4500, k: 0.935 };

describe('núcleo (dossiê §4)', () => {
  it.each([[0.05, 893.6], [0, 683.23], [-0.05, 472.85], [-0.1, 262.48], [-0.15, 52.1]])('só preço dp=%s -> lucro %s', (dp, lucro) =>
    expect(stressProfit(IN, { dp })).toBeCloseTo(lucro, 2));
  it('só materiais +10% -> 352,40', () => expect(stressProfit(IN, { dm: 0.1 })).toBeCloseTo(352.4, 2));
  it('combinado preço -10% e material +10% -> -68,35', () => expect(stressProfit(IN, { dp: -0.1, dm: 0.1 })).toBeCloseTo(-68.35, 2));
  it('ruptura', () => {
    const b = breakEven(IN);
    expect(b.dp).toBeCloseTo(-0.1624, 4);
    expect(b.minPrice).toBeCloseTo(3769.27, 2);
    expect(b.priceDrop).toBeCloseTo(730.73, 2);
    expect(b.dm).toBeCloseTo(0.2065, 4);
  });
  it('sem especialização (RRR 18/118): lucro 262,69', () => expect(stressProfit({ ...IN, variable: 4400 * (100 / 118) })).toBeCloseTo(262.69, 2));
  it('grade: [dm=0][dp=0] = lucro base; cantos', () => {
    const g = stressGrid(IN);
    expect(g.cells[4][4]).toBeCloseTo(683.23, 2);
    expect(g.cells[4][0]).toBeCloseTo(-158.27, 2);
    expect(g.cells[8][0]).toBeCloseTo(-819.92, 2);
    expect(g.cells.length).toBe(9);
    expect(g.cells[0].length).toBe(9);
  });
  it('já em prejuízo: dp* positivo e dm* negativo', () => {
    const b = breakEven({ ...IN, price: 3000 });
    expect(b.dp).toBeCloseTo(0.2564, 3);
    expect(b.dm).toBeCloseTo(-0.2174, 3);
  });
  it('dm null quando taxa >= receita ou sem material', () => {
    expect(breakEven({ ...IN, fixed: 5000 }).dm).toBeNull();
    expect(breakEven({ ...IN, variable: 0 }).dm).toBeNull();
  });
  it('verdict', () => {
    expect(verdict(-1, 100)).toBe('loss');
    expect(verdict(0, 100)).toBe('thin');
    expect(verdict(4.99, 100)).toBe('thin');
    expect(verdict(5, 100)).toBe('ok');
  });
});

describe('craftStressInput', () => {
  const rec = () => recipeOf('T4_MAIN_SWORD');
  const cfg = (over = {}) => ({
    craftCity: 'Lymhurst', specialty: true, focus: false, feePer100: 500, customRRR: '',
    matCity: 'best', useOrders: false, crafts: 1,
    refine: { METALBAR: 'buy', LEATHER: 'buy' }, refineFocus: false, refineFee: 400, refineCity: 'auto', refineDaily: {},
    noTax: {}, extras: [],
    ...over,
  });
  const prices = () => mkPrices({ T4_METALBAR: 200, T4_LEATHER: 150, T4_MAIN_SWORD: { Caerleon: { s: 4500 } } });
  const run = (over) => computeCraft({ rec: rec(), targetMid: 'T4_MAIN_SWORD', prices: prices(), cfg: cfg(over), premium: true, bonusCity: null });

  it('reproduz a base do dossiê', () => {
    const c = run();
    const inp = craftStressInput(c, true);
    expect(inp.variable).toBeCloseTo(3308.2707, 3);
    expect(inp.fixed).toBe(216);
    expect(inp).toMatchObject({ price: 4500, mode: 'order', units: 1 });
    expect(inp.k).toBeCloseTo(0.935, 6);
    expect(stressProfit(inp, {})).toBeCloseTo(683.23, 2);
    expect(inp.variable + inp.fixed).toBeCloseTo(c.totalCost / c.units, 6);
  });
  it('despesas extras entram no fixo e a invariante vale', () => {
    const c = run({ extras: [{ name: 'transporte', value: 100, scope: 'craft' }] });
    const inp = craftStressInput(c, true);
    expect(inp.fixed).toBeCloseTo(316, 6);
    expect(inp.variable + inp.fixed).toBeCloseTo(c.totalCost / c.units, 6);
    expect(stressProfit(inp, {})).toBeCloseTo(c.best.profit / c.units, 6);
  });
  it('noTax: usa o mesmo líquido de venda (k = 1) e o lucro bate com a tela', () => {
    const c = run({ noTax: { 'Caerleon|order': true } });
    const inp = craftStressInput(c, true);
    expect(inp.k).toBe(netSale(1, 'none', true));
    expect(inp.k).toBe(1);
    expect(stressProfit(inp, {})).toBeCloseTo(c.best.profit / c.units, 6);
  });
  it('com refino produzido separa a taxa das etapas e preserva a invariante', () => {
    const c = computeCraft({
      rec: recipeOf('T4_2H_BOW'), targetMid: 'T4_2H_BOW',
      prices: mkPrices({ ...planksSpec(), T4_2H_BOW: { Caerleon: { s: 9000 } } }),
      cfg: cfg({ refine: { PLANKS: 'all' }, crafts: 10 }), premium: true, bonusCity: null,
    });
    const inp = craftStressInput(c, true);
    expect(c.plan.some((p) => p.kind === 'make')).toBe(true);
    expect(inp.variable + inp.fixed).toBeCloseTo(c.totalCost / c.units, 6);
    expect(stressProfit(inp, {})).toBeCloseTo(c.best.profit / c.units, 6);
    expect(inp.fixed).toBeGreaterThan(c.fee / c.units);
  });
  it('retorna null se o craft não está pronto', () => {
    expect(craftStressInput(computeCraft({ rec: rec(), targetMid: 'T4_MAIN_SWORD', prices: null, cfg: cfg(), premium: true, bonusCity: null }), true)).toBeNull();
    expect(craftStressInput(run({}) && computeCraft({ rec: rec(), targetMid: 'T4_MAIN_SWORD', prices: mkPrices({ T4_METALBAR: 200 }), cfg: cfg(), premium: true, bonusCity: null }), true)).toBeNull();
  });
});

describe('refineStressInput', () => {
  const rrr = 58 / 158;
  const prices = () => mkPrices(planksSpec({ T4_PLANKS: { 'Fort Sterling': { s: 120 }, Martlock: { s: 135 }, 'Black Market': { b: 140 } } }));
  const ctx = (p) => ({ prices: p, city: 'best', useOrders: false, rrr, feePer100: 400, route: 'best' });

  it('separa taxas das etapas de refino (cenário A, IDEIA-001)', () => {
    const unit = refineUnit('T4_PLANKS', ctx(prices()));
    const inp = refineStressInput(unit, rrr, { price: 140, mode: 'instant' }, true);
    expect(inp.fixed).toBeCloseTo(9.4785, 4);
    expect(inp.variable).toBeCloseTo(51.9949, 4);
    expect(inp.k).toBeCloseTo(0.96, 6);
    expect(inp.variable + inp.fixed).toBeCloseTo(unit.cost, 6);
    expect(stressProfit(inp, {})).toBeCloseTo(72.9266, 4);
  });
  it('célula central = lucro do evaluateTier (com despesas e noTax)', () => {
    const p = prices();
    for (const noTax of [false, true]) {
      const row = evaluateTier({ tier: 4, uniq: 'T4_PLANKS', prices: p, ctx: ctx(p), sellCity: 'best', sellMode: 'instant', premium: true, extrasPerUnit: 7, noTax });
      const inp = refineStressInput(row.unit, rrr, { price: row.sell.price, mode: row.mode }, true, { extrasPerUnit: 7, noTax });
      expect(stressProfit(inp, {})).toBeCloseTo(row.profit, 6);
    }
  });
  it('null com preço faltando ou sem preço de venda', () => {
    const p = mkPrices(planksSpec({ T3_WOOD: null, T3_PLANKS: null }));
    const unit = refineUnit('T4_PLANKS', { ...ctx(p), route: 'all' });
    expect(refineStressInput(unit, rrr, { price: 140, mode: 'instant' }, true)).toBeNull();
    const ok = refineUnit('T4_PLANKS', ctx(prices()));
    expect(refineStressInput(ok, rrr, { price: 0, mode: 'instant' }, true)).toBeNull();
  });
});
