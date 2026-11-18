import { describe, expect, it } from 'vitest';
import { flipRows } from './flip';
import { mkPrices } from '../test/helpers';

const now = 1_700_000_000_000;
const H = 3600000;

const sword = (over = {}) => ({
  Martlock: { s: 1000, sd: now - 1 * H, b: 900, bd: now - 1 * H },
  Caerleon: { s: 1600, sd: now - 2 * H, b: 1500, bd: now - 1 * H },
  'Black Market': { b: 1700, bd: now - 1 * H },
  ...over,
});
const prices = (over) => mkPrices({ T6_MAIN_SWORD: sword(over) });
const cfg = (over = {}) => ({
  buyCities: ['Martlock'], sellCities: ['Caerleon', 'Black Market'], buyMode: 'instant', sellMode: 'any',
  minProfit: 0, minMargin: 0, maxAge: 24, budget: '', ...over,
});

describe('flipRows', () => {
  it('escolhe o melhor destino (BM instantânea 632)', () => {
    const [r] = flipRows(prices(), cfg(), true, now);
    expect(r).toMatchObject({ mid: 'T6_MAIN_SWORD', buy: 'Martlock', sell: 'Black Market', mode: 'instant', cost: 1000, price: 1700 });
    expect(r.profit).toBeCloseTo(632, 4); // 1700 * 0,96 - 1000
    expect(r.margin).toBeCloseTo(63.2, 4);
    expect(r.bdate).toBe(now - 1 * H);
    expect(r.sdate).toBe(now - 1 * H);
  });
  it('só Caerleon: ordem de venda 496 vence instantânea 440', () => {
    const [r] = flipRows(prices(), cfg({ sellCities: ['Caerleon'] }), true, now);
    expect(r).toMatchObject({ sell: 'Caerleon', mode: 'order', price: 1600 });
    expect(r.profit).toBeCloseTo(496, 4); // 1600 * 0,935 - 1000
    expect(r.margin).toBeCloseTo(49.6, 4);
  });
  it('sellMode instant em Caerleon: 440; sellMode order em Black Market: nenhuma linha', () => {
    const [r] = flipRows(prices(), cfg({ sellCities: ['Caerleon'], sellMode: 'instant' }), true, now);
    expect(r.mode).toBe('instant');
    expect(r.profit).toBeCloseTo(440, 4); // 1500 * 0,96 - 1000
    expect(flipRows(prices(), cfg({ sellCities: ['Black Market'], sellMode: 'order' }), true, now)).toEqual([]);
  });
  it('compra por ordem: custo 922.5 e lucro BM 709.5', () => {
    const [r] = flipRows(prices(), cfg({ buyMode: 'order' }), true, now);
    expect(r.cost).toBeCloseTo(922.5, 6); // 900 * 1,025
    expect(r.profit).toBeCloseTo(709.5, 4); // 1632 - 922,5
    expect(r.bdate).toBe(now - 1 * H);
  });
  it('sem premium: BM 564', () => {
    const [r] = flipRows(prices(), cfg(), false, now);
    expect(r.profit).toBeCloseTo(564, 4); // 1700 * 0,92 - 1000
  });
  it('dado velho some; maxAge 0 desliga o filtro', () => {
    const old = prices({ Martlock: { s: 1000, sd: now - 3 * H } });
    expect(flipRows(old, cfg({ maxAge: 1 }), true, now)).toEqual([]);
    expect(flipRows(old, cfg({ maxAge: 0 }), true, now)).toHaveLength(1);
    // o destino velho é descartado: BM com 30 h perde para Caerleon por ordem (496)
    const oldBm = prices({ 'Black Market': { b: 1700, bd: now - 30 * H } });
    const [r] = flipRows(oldBm, cfg(), true, now);
    expect(r).toMatchObject({ sell: 'Caerleon', mode: 'order' });
    expect(r.profit).toBeCloseTo(496, 4);
  });
  it('budget 950 barra compra instantânea (1000) mas aceita ordem (922.5)', () => {
    expect(flipRows(prices(), cfg({ budget: '950' }), true, now)).toEqual([]);
    const [r] = flipRows(prices(), cfg({ budget: 950, buyMode: 'order' }), true, now);
    expect(r.cost).toBeCloseTo(922.5, 6);
  });
  it('minProfit 700 e minMargin 70 removem a linha (lucro 632, margem 63,2%)', () => {
    expect(flipRows(prices(), cfg({ minProfit: 700 }), true, now)).toEqual([]);
    expect(flipRows(prices(), cfg({ minMargin: 70 }), true, now)).toEqual([]);
    expect(flipRows(prices(), cfg({ minProfit: 600, minMargin: 60 }), true, now)).toHaveLength(1);
  });
  it('não vende na mesma cidade em que comprou', () => {
    expect(flipRows(prices(), cfg({ buyCities: ['Caerleon'], sellCities: ['Caerleon'] }), true, now)).toEqual([]);
  });
  it('sem preços: lista vazia', () => {
    expect(flipRows({}, cfg(), true, now)).toEqual([]);
  });
});
