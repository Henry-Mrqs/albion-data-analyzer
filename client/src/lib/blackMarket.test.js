// IDEIA-088: as duas leituras do preço do Mercado Negro. Achado do Pesquisador (API West, 2026-11-20, T4_MAIN_SWORD q1):
// buy_price_max 2.607 e sell_price_min 10.854; o histórico realizado (~10.299) bate com a lista. NÃO VERIFICADO em jogo.
import { describe, expect, it } from 'vitest';
import { BM_CITY, BM_DIVERGENCE_RATIO, BM_READING_VERIFIED, bmHeadline, bmLabel, bmReadings } from './blackMarket';
import { netSale } from './econ';

const NOW = Date.parse('2026-11-20T03:00:00Z');
const H = 3600000;
const mk = (cell, quality = 1, mid = 'T4_MAIN_SWORD') => ({ [mid]: { [BM_CITY]: { [quality]: cell } } });
const fresh = { sd: NOW - H, bd: NOW - H };
const opt = { now: NOW, maxAgeH: 24 };

describe('bmReadings', () => {
  it('o achado: buy 2607, list 10854, razão 4,1634, diverge', () => {
    const r = bmReadings(mk({ s: 10854, b: 2607, ...fresh }), 'T4_MAIN_SWORD', opt);
    expect(r.buy.price).toBe(2607);
    expect(r.list.price).toBe(10854);
    expect(r.ratio).toBeCloseTo(4.163406, 5);
    expect(r.diverges).toBe(true);
  });
  it('limiar 1,5 incluso: 11376 x 18620 (1,6368) diverge; 10000 x 14000 (1,4) não; 10000 x 15000 (1,5) diverge', () => {
    expect(BM_DIVERGENCE_RATIO).toBe(1.5);
    const d = (b, s) => bmReadings(mk({ b, s, ...fresh }, 2), 'T4_MAIN_SWORD', { ...opt, quality: 2 });
    expect(d(11376, 18620).ratio).toBeCloseTo(1.6368, 4);
    expect(d(11376, 18620).diverges).toBe(true);
    expect(d(10000, 14000).diverges).toBe(false);
    expect(d(10000, 15000).diverges).toBe(true);
  });
  it('sem lista: list null, ratio null, diverges false; sem compra: buy null; sem nada: ambos null', () => {
    const a = bmReadings(mk({ s: 0, b: 2607, ...fresh }), 'T4_MAIN_SWORD', opt);
    expect([a.list, a.ratio, a.diverges]).toEqual([null, null, false]);
    expect(a.buy.price).toBe(2607);
    expect(bmReadings(mk({ s: 10854, b: 0, ...fresh }), 'T4_MAIN_SWORD', opt).buy).toBeNull();
    const n = bmReadings({}, 'T4_MAIN_SWORD', opt);
    expect([n.buy, n.list]).toEqual([null, null]);
    expect(bmReadings(null, 'X', opt).buy).toBeNull();
  });
  it('dado velho: stale com 30 h; maxAgeH 0 desliga o limite; sem data = velho', () => {
    const old = { s: 10854, b: 2607, sd: NOW - 30 * H, bd: NOW - H };
    const r = bmReadings(mk(old), 'T4_MAIN_SWORD', opt);
    expect([r.list.stale, r.buy.stale]).toEqual([true, false]);
    expect(bmReadings(mk(old), 'T4_MAIN_SWORD', { now: NOW, maxAgeH: 0 }).list.stale).toBe(false);
    expect(bmReadings(mk({ s: 10854, b: 2607, sd: null, bd: null }), 'T4_MAIN_SWORD', opt).buy.stale).toBe(true);
  });
  it('qualidade 2 lê a célula certa; qualidade inexistente: ambos null', () => {
    const p = { T4_MAIN_SWORD: { [BM_CITY]: { 1: { s: 100, b: 50, ...fresh }, 2: { s: 900, b: 400, ...fresh } } } };
    expect(bmReadings(p, 'T4_MAIN_SWORD', { ...opt, quality: 2 }).list.price).toBe(900);
    expect(bmReadings(p, 'T4_MAIN_SWORD', { ...opt, quality: 3 }).buy).toBeNull();
    expect(bmReadings(p, 'T4_MAIN_SWORD', opt).list.price).toBe(100);
  });
});

describe('bmHeadline e bmLabel', () => {
  const both = bmReadings(mk({ s: 10854, b: 2607, ...fresh }), 'T4_MAIN_SWORD', opt);
  it('a constante de verificação está null (NÃO VERIFICADO em jogo)', () => {
    expect(BM_READING_VERIFIED).toBeNull();
  });
  it('null: a MENOR das existentes; "list"/"buy": a confirmada; confirmada ausente: a que existir', () => {
    expect(bmHeadline(both, null)).toBe('buy');
    expect(bmHeadline(both, 'list')).toBe('list');
    expect(bmHeadline(both, 'buy')).toBe('buy');
    const onlyBuy = bmReadings(mk({ s: 0, b: 2607, ...fresh }), 'T4_MAIN_SWORD', opt);
    expect(bmHeadline(onlyBuy, 'list')).toBe('buy');
    const onlyList = bmReadings(mk({ s: 10854, b: 0, ...fresh }), 'T4_MAIN_SWORD', opt);
    expect(bmHeadline(onlyList, null)).toBe('list');
    expect(bmHeadline(bmReadings({}, 'X', opt), null)).toBeNull();
  });
  it('a menor é a de lista quando a lista é menor que a compra', () => {
    const r = bmReadings(mk({ s: 1000, b: 2000, ...fresh }), 'T4_MAIN_SWORD', opt);
    expect(bmHeadline(r, null)).toBe('list');
  });
  it('rótulos: "NÃO VERIFICADO em jogo" some só na leitura confirmada', () => {
    expect(bmLabel('buy', null)).toBe('Mercado Negro: ordem de compra (buy_price_max) · NÃO VERIFICADO em jogo');
    expect(bmLabel('list', null)).toBe('Mercado Negro: preço de lista (sell_price_min) · NÃO VERIFICADO em jogo');
    expect(bmLabel('list', 'list')).toBe('Mercado Negro: preço de lista (sell_price_min)');
    expect(bmLabel('buy', 'list')).toContain('NÃO VERIFICADO em jogo');
  });
});

describe('líquido e lucro das duas leituras (conta pelo netSale do econ.js)', () => {
  const COST = 3524.27;
  it('com Premium: compra 2.502,72 -> -1.021,55; lista 10.419,84 -> +6.895,57', () => {
    expect(netSale(2607, 'instant', true)).toBeCloseTo(2502.72, 2);
    expect(netSale(2607, 'instant', true) - COST).toBeCloseTo(-1021.55, 2);
    expect(netSale(10854, 'instant', true)).toBeCloseTo(10419.84, 2);
    expect(netSale(10854, 'instant', true) - COST).toBeCloseTo(6895.57, 2);
  });
  it('sem Premium (0,92): 2.398,44 -> -1.125,83 e 9.985,68 -> +6.461,41', () => {
    expect(netSale(2607, 'instant', false) - COST).toBeCloseTo(-1125.83, 2);
    expect(netSale(10854, 'instant', false) - COST).toBeCloseTo(6461.41, 2);
  });
  it('o realizado do dossiê (média 7 d 10.299) -> +6.362,77; lista contra a mediana 10.662 = +1,8%', () => {
    expect(netSale(10299, 'instant', true) - COST).toBeCloseTo(6362.77, 1);
    expect(10854 / 10662 - 1).toBeCloseTo(0.018, 3);
  });
});
