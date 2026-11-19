// IDEIA-048: despesas extras e venda sem imposto no Refino (Cenário A da 001: custo 61,4734; venda no Mercado Negro a 140).
import { beforeEach, describe, expect, it } from 'vitest';
import { evaluateTier } from './refinePlan';
import { loadFixtureCatalog, mkPrices, planksSpec } from '../test/helpers';

beforeEach(loadFixtureCatalog);

const prices = mkPrices(planksSpec({ T4_PLANKS: { 'Fort Sterling': { s: 120 }, Martlock: { s: 135 }, 'Black Market': { b: 140 } } }));
const ctx = { prices, city: 'best', useOrders: false, rrr: 58 / 158, feePer100: 400, route: 'best' };
const ev = (over = {}) => evaluateTier({ tier: 4, uniq: 'T4_PLANKS', prices, ctx, sellCity: 'best', sellMode: 'order', premium: true, ...over });

describe('evaluateTier com despesas extras e venda sem imposto (048)', () => {
  it('sem despesas: igual a antes (lucro 72,9266; extrasPerUnit 0)', () => {
    const r = ev();
    expect(r.profit).toBeCloseTo(72.9266, 4);
    expect(r.extrasPerUnit).toBe(0);
  });
  it('despesas de 10 por unidade: lucro 62,9266 e margem 88,04% (sobre o custo com despesas 71,4734)', () => {
    const r = ev({ extrasPerUnit: 10 });
    expect(r.profit).toBeCloseTo(62.9266, 4);
    expect(r.margin).toBeCloseTo(88.04, 2);
    expect(r.extrasPerUnit).toBe(10);
  });
  it('venda sem imposto: líquido 140 (sem os 4%) e lucro 78,5266', () => {
    const r = ev({ noTax: true });
    expect(r.net).toBe(140);
    expect(r.profit).toBeCloseTo(78.5266, 4);
  });
  it('os dois: 140 − 71,4734 = 68,5266', () => expect(ev({ extrasPerUnit: 10, noTax: true }).profit).toBeCloseTo(68.5266, 4));
  it('sem imposto também zera a taxa de criação numa ordem de venda (Martlock 135 → 135)', () => {
    const r = ev({ sellCity: 'Martlock', noTax: true });
    expect(r.mode).toBe('order');
    expect(r.net).toBe(135);
  });
  it('o custo de produção (unit.cost) e a rota não mudam com despesas', () => expect(ev({ extrasPerUnit: 10 }).unit.cost).toBeCloseTo(61.4734, 4));
  it('sem preço de venda: líquido 0 mesmo sem imposto', () => expect(ev({ sellCity: 'Martlock', sellMode: 'instant', noTax: true }).net).toBe(0));
});
