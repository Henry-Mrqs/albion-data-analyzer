import { beforeEach, describe, expect, it } from 'vitest';
import { computeCraft } from './craftPlan';
import { recipeOf } from './catalog';
import { evaluateTier } from './refinePlan';
import { netSale } from './econ';
import { craftStressInput, refineStressInput } from './stress';
import { loadFixtureCatalog, mkPrices, planksSpec } from '../test/helpers';

beforeEach(loadFixtureCatalog);

// IDEIA-031 (retrabalho): guarda `ready`, k com premium e a saída de venda vinda do mesmo lugar que a grade.
const cfg = (over = {}) => ({
  craftCity: 'Lymhurst', specialty: true, focus: false, feePer100: 500, customRRR: '',
  matCity: 'best', useOrders: false, crafts: 1,
  refine: { METALBAR: 'buy', LEATHER: 'buy' }, refineFocus: false, refineFee: 400, refineCity: 'auto', refineDaily: {},
  noTax: {}, extras: [],
  ...over,
});
const run = (prices, premium, over) => computeCraft({ rec: recipeOf('T4_MAIN_SWORD'), targetMid: 'T4_MAIN_SWORD', prices, cfg: cfg(over), premium, bonusCity: null });

describe('craftStressInput: guarda de material sem preço (M29)', () => {
  it('material faltando COM preço de venda presente -> null (nunca lucro inflado)', () => {
    const c = run(mkPrices({ T4_METALBAR: 200, T4_MAIN_SWORD: { Caerleon: { s: 4500 } } }), true);
    expect(c.best?.price).toBe(4500);
    expect(c.ready).toBe(false);
    expect(craftStressInput(c, true)).toBeNull();
  });
});

describe('craftStressInput: k respeita premium (M23)', () => {
  const prices = () => mkPrices({ T4_METALBAR: 200, T4_LEATHER: 150, T4_MAIN_SWORD: { Caerleon: { s: 4500 } } });
  it('ordem de venda: premium 0,935 e sem premium 0,895', () => {
    expect(craftStressInput(run(prices(), true), true).k).toBeCloseTo(0.935, 6);
    expect(craftStressInput(run(prices(), false), false).k).toBeCloseTo(netSale(1, 'order', false), 6);
    expect(craftStressInput(run(prices(), false), false).k).toBeCloseTo(0.895, 6);
  });
  it('ordem de compra (instantânea): premium 0,96 e sem premium 0,92', () => {
    const p = mkPrices({ T4_METALBAR: 200, T4_LEATHER: 150, T4_MAIN_SWORD: { Caerleon: { b: 4500 } } });
    expect(craftStressInput(run(p, true), true).k).toBeCloseTo(0.96, 6);
    expect(craftStressInput(run(p, false), false).k).toBeCloseTo(0.92, 6);
  });
});

describe('saída de venda exposta (D1)', () => {
  it('Craft: cidade, modo e noTax vêm de c.best', () => {
    const p = mkPrices({ T4_METALBAR: 200, T4_LEATHER: 150, T4_MAIN_SWORD: { Caerleon: { s: 4500 } } });
    const c = run(p, true);
    expect(craftStressInput(c, true)).toMatchObject({ city: c.best.city, label: c.best.label, noTax: false });
    const n = run(p, true, { noTax: { 'Caerleon|order': true } });
    expect(craftStressInput(n, true)).toMatchObject({ city: 'Caerleon', label: 'Ordem de venda', noTax: true });
  });
  it('Refino: cidade/modo da linha atual e noTax', () => {
    const rrr = 58 / 158;
    const p = mkPrices(planksSpec({ T4_PLANKS: { 'Black Market': { b: 140 } } }));
    const ctx = { prices: p, city: 'best', useOrders: false, rrr, feePer100: 400, route: 'best' };
    const row = evaluateTier({ tier: 4, uniq: 'T4_PLANKS', prices: p, ctx, sellCity: 'best', sellMode: 'instant', premium: true, extrasPerUnit: 0, noTax: true });
    const inp = refineStressInput(row.unit, rrr, { price: row.sell.price, mode: row.mode, city: row.sell.city }, true, { noTax: true });
    expect(inp).toMatchObject({ city: 'Black Market', label: 'Ordem de compra', noTax: true });
    const inp2 = refineStressInput(row.unit, rrr, { price: row.sell.price, mode: row.mode, city: row.sell.city }, true);
    expect(inp2.noTax).toBe(false);
  });
});
