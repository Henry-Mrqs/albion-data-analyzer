import { beforeEach, describe, expect, it } from 'vitest';
import { refineUnit } from './econ';
import { ROUTE_ORDER, compareRoutes, lotFee, evaluateTier, pickBestTier, routePath, usedCells } from './refinePlan';
import { loadFixtureCatalog, mkPrices, planksSpec } from '../test/helpers';

beforeEach(loadFixtureCatalog);

const ctx = { prices: null, city: 'best', useOrders: false, rrr: 58 / 158, feePer100: 400 };
const withPrices = (prices) => ({ ...ctx, prices });
// Cenário A + venda do T4: Fort Sterling 120, Martlock 135, Black Market (compra) 140
const salesPrices = () =>
  mkPrices(planksSpec({ T4_PLANKS: { 'Fort Sterling': { s: 120 }, Martlock: { s: 135 }, 'Black Market': { b: 140 } } }));
const evalArgs = (over = {}) => {
  const prices = salesPrices();
  return { tier: 4, uniq: 'T4_PLANKS', prices, ctx: { ...withPrices(prices), route: 'best' }, sellCity: 'best', sellMode: 'order', premium: true, ...over };
};

describe('evaluateTier', () => {
  it('melhor cidade de venda (Black Market, instantânea)', () => {
    const r = evaluateTier(evalArgs());
    expect(r.sell).toMatchObject({ price: 140, city: 'Black Market' });
    expect(r.mode).toBe('instant');
    expect(r.unit.cost).toBeCloseTo(61.4734, 4);
    expect(r.net).toBeCloseTo(134.4, 4);
    expect(r.profit).toBeCloseTo(72.9266, 4);
    expect(r.margin).toBeCloseTo(118.63, 2);
  });
  it('cidade fixa Martlock por ordem', () => {
    const r = evaluateTier(evalArgs({ sellCity: 'Martlock' }));
    expect(r.sell).toMatchObject({ price: 135, city: 'Martlock' });
    expect(r.mode).toBe('order');
    expect(r.net).toBeCloseTo(126.225, 4); // 135 * 0,935
    expect(r.profit).toBeCloseTo(64.7516, 4);
  });
  it('sellMode instant usa preço de compra (b); Martlock s=135 sem b -> price 0', () => {
    const r = evaluateTier(evalArgs({ sellCity: 'Martlock', sellMode: 'instant' }));
    expect(r.sell.price).toBe(0);
    expect(r.net).toBe(0);
    expect(r.profit).toBeCloseTo(-r.unit.cost, 6);
    expect(r.margin).toBeCloseTo(-100, 6);
  });
  it('sem premium', () => {
    const r = evaluateTier(evalArgs({ premium: false }));
    expect(r.net).toBeCloseTo(128.8, 4); // 140 * 0,92
    expect(r.profit).toBeCloseTo(67.3266, 4);
  });
  it('tier sem receita no catálogo (T5) não estoura', () => {
    const r = evaluateTier(evalArgs({ tier: 5, uniq: 'T5_PLANKS' }));
    expect(r.unit.missing).toEqual(['T5_PLANKS']);
    expect(r.unit.cost).toBe(0);
    expect(r.margin).toBe(0);
  });
  it('prices null (carregando) não estoura', () => {
    const r = evaluateTier(evalArgs({ prices: null, ctx: { ...ctx, route: 'best' } }));
    expect(r.sell.price).toBe(0);
    expect(r.net).toBe(0);
    expect(r.mid).toBe('T4_PLANKS');
  });
});

describe('compareRoutes', () => {
  it('A: best vence', () => {
    const { routes, best } = compareRoutes('T4_PLANKS', withPrices(mkPrices(planksSpec())));
    expect(routes.map((r) => r.value)).toEqual(ROUTE_ORDER);
    expect(ROUTE_ORDER).toEqual(['buy', 'all', 'best']);
    expect(routes.map((r) => +r.unit.cost.toFixed(4))).toEqual([76.8203, 62.2197, 61.4734]);
    expect(best.value).toBe('best');
  });
  it('B: empate buy = best, vence a primeira (buy)', () => {
    const { routes, best } = compareRoutes('T4_PLANKS', withPrices(mkPrices(planksSpec({ T3_PLANKS: 20 }))));
    expect(routes.map((r) => +r.unit.cost.toFixed(4))).toEqual([57.8329, 62.2197, 57.8329]);
    expect(best.value).toBe('buy');
  });
  it('rota incompleta é excluída do best', () => {
    const { routes, best } = compareRoutes('T4_PLANKS', withPrices(mkPrices(planksSpec({ T3_WOOD: null }))));
    expect(routes.map((r) => r.ok)).toEqual([true, false, true]);
    expect(best.value).toBe('buy');
  });
  it('prices null não estoura e nenhuma rota é boa', () => {
    const { routes, best } = compareRoutes('T4_PLANKS', ctx);
    expect(routes.every((r) => !r.ok)).toBe(true);
    expect(best).toBeUndefined();
  });
});

describe('lotFee (IDEIA-019)', () => {
  const rrr = 58 / 158;
  const u = (route, feePer100 = 100) => refineUnit('T4_PLANKS', { ...withPrices(mkPrices(planksSpec())), rrr, feePer100, route });
  it('caso 3 do dossiê: 1.000 pranchas T4, taxa 100, rota buy = 1.800', () => {
    expect(u('buy').fee).toBeCloseTo(1.8, 9);
    expect(lotFee(u('buy'), 1000, rrr)).toBe(1800);
  });
  it('rota all, taxa 100, 1.000 un.: soma exata das etapas, arredondada uma vez', () => {
    // 1,8*1000 + 0,9*632,9114 + 0,45*400,5768 = 1800 + 569,6203 + 180,2596 = 2549,88 -> 2550
    expect(lotFee(u('all'), 1000, rrr)).toBe(2550);
  });
});

describe('pickBestTier', () => {
  const row = (tier, price, missing, profit) => ({ tier, sell: { price }, unit: { missing }, profit });
  it('ignora linhas sem preço ou com missing e escolhe o maior lucro', () => {
    const rows = [row(4, 0, [], 999), row(5, 10, ['X'], 500), row(6, 10, [], 30), row(7, 10, [], 80), row(8, 10, [], -5)];
    expect(pickBestTier(rows).tier).toBe(7);
    expect(pickBestTier([row(4, 0, [], 1)])).toBeUndefined();
    expect(pickBestTier([])).toBeUndefined();
  });
});

describe('usedCells / routePath (best A)', () => {
  const unit = () => refineUnit('T4_PLANKS', { ...withPrices(mkPrices(planksSpec())), route: 'best' });
  it('usedCells: só as compras folha', () => {
    const cells = usedCells(unit());
    expect(cells.has('T4_WOOD|Fort Sterling')).toBe(true);
    expect(cells.has('T3_WOOD|Fort Sterling')).toBe(true);
    expect(cells.has('T2_PLANKS|Fort Sterling')).toBe(true);
    expect([...cells].some((c) => c.startsWith('T3_PLANKS|'))).toBe(false);
  });
  it('routePath', () => {
    const steps = routePath(unit(), 4);
    expect(steps.map((s) => [s.tier, s.action])).toEqual([[4, 'make'], [3, 'make'], [2, 'buy']]);
    expect(steps[0].raw.map((l) => l.mid)).toEqual(['T4_WOOD']);
    expect(steps[1].raw.map((l) => l.mid)).toEqual(['T3_WOOD']);
    expect(steps[2]).toMatchObject({ unit: 5, city: 'Fort Sterling' });
  });
});
