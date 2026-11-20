// IDEIA-059: o Refino desconta as atualizações da ordem de venda (cenário A: custo 61,4734; Martlock 135 por ordem).
import { beforeEach, describe, expect, it } from 'vitest';
import { evaluateTier } from './refinePlan';
import { refineStressInput, stressProfit } from './stress';
import { loadFixtureCatalog, mkPrices, planksSpec } from '../test/helpers';

beforeEach(loadFixtureCatalog);

const prices = mkPrices(planksSpec({ T4_PLANKS: { 'Fort Sterling': { s: 120 }, Martlock: { s: 135 }, 'Black Market': { b: 140 } } }));
const ctx = { prices, city: 'best', useOrders: false, rrr: 58 / 158, feePer100: 400, route: 'best' };
const ev = (over = {}) => evaluateTier({ tier: 4, uniq: 'T4_PLANKS', prices, ctx, sellCity: 'Martlock', sellMode: 'order', premium: true, ...over });
const R2 = { updates: 2, step: 0, base: 'price' };

describe('evaluateTier: atualizações da ordem (059)', () => {
  it('sem relist: net 126,225 e lucro 64,7516 (como antes)', () => {
    const r = ev();
    expect(r.net).toBeCloseTo(126.225, 6);
    expect(r.profit).toBeCloseTo(64.7516, 4);
    expect(r.relistCost).toBe(0);
  });
  it('relist 2: relistCost 6,75, net 119,475, lucro 58,0016, setupTotal 10,125', () => {
    const r = ev({ relist: R2 });
    expect(r.relistCost).toBeCloseTo(6.75, 6);
    expect(r.net).toBeCloseTo(119.475, 6);
    expect(r.profit).toBeCloseTo(58.0016, 4);
    expect(r.setupTotal).toBeCloseTo(10.125, 6);
  });
  it('venda instantânea (Mercado Negro) e noTax: sem efeito', () => {
    const a = ev({ sellCity: 'best', relist: R2 });
    expect(a.profit).toBeCloseTo(72.9266, 4);
    const b = ev({ noTax: true, relist: R2 });
    expect(b.profit).toBeCloseTo(135 - 61.4734, 4);
    expect(b.relistCost).toBe(0);
  });
  it('refineStressInput concorda com o lucro por unidade; sem relist, igual ao de hoje', () => {
    const r = ev({ relist: R2 });
    const sell = { price: r.sell.price, mode: r.mode, city: r.sell.city };
    const input = refineStressInput(r.unit, ctx.rrr, sell, true, { relist: R2 });
    expect(stressProfit(input, {})).toBeCloseTo(r.profit, 6);
    const r0 = ev();
    const i0 = refineStressInput(r0.unit, ctx.rrr, sell, true);
    expect(stressProfit(i0, {})).toBeCloseTo(r0.profit, 6);
  });
});
