import { describe, expect, it } from 'vitest';
import { targetPrice, marketGap, lowestListing } from './targetPrice';
import { netSale } from './econ';
import { mkPrices } from '../test/helpers';

// Caso do dossiê §4: barra 200 x16 + couro 150 x8, RRR 33/133, taxa 384 x 0,1125 x 5 = 216.
const C = 4400 * (100 / 133) + 216; // 3524,2707

describe('targetPrice', () => {
  it.each([
    ['equilíbrio ordem', { mode: 'order' }, 3770],
    ['lucro 1000 ordem', { mode: 'order', profit: 1000 }, 4839],
    ['lucro 1000 instantâneo', { mode: 'instant', profit: 1000 }, 4713],
    ['margem 20% ordem', { mode: 'order', margin: 0.2 }, 4524],
    ['equilíbrio instantâneo', { mode: 'instant' }, 3672],
  ])('premium: %s', (_n, arg, esperado) => expect(targetPrice({ cost: C, premium: true, ...arg })).toBe(esperado));

  it('sem premium, lucro 1000 ordem = 5056', () =>
    expect(targetPrice({ cost: C, premium: false, mode: 'order', profit: 1000 })).toBe(5056));

  it('verificação reversa: líquido(4839) - C ≈ 1000,19', () =>
    expect(netSale(4839, 'order', true) - C).toBeCloseTo(1000.1943, 3));

  it('propriedade: líquido do alvo >= custo + lucro, e 1 a menos não basta', () => {
    for (const [premium, mode, profit] of [[true, 'order', 0], [true, 'instant', 250], [false, 'order', 1000], [false, 'instant', 0]])
      for (const cost of [1, 17.3, 935, 3524.27, 99999]) {
        const p = targetPrice({ cost, profit, premium, mode });
        expect(netSale(p, mode, premium)).toBeGreaterThanOrEqual(cost + profit - 1e-9);
        expect(netSale(p - 1, mode, premium)).toBeLessThan(cost + profit);
      }
  });

  it('ruído de ponto flutuante não sobe 1 prata: cost 935 premium ordem = 1000', () =>
    expect(targetPrice({ cost: 935, premium: true, mode: 'order' })).toBe(1000));

  it('relistagem: 1 relistagem, lucro 1000 ordem = 4972 (k = 0,935 - 0,025)', () =>
    expect(targetPrice({ cost: C, premium: true, mode: 'order', profit: 1000, relists: 1 })).toBe(4972));

  it('relistagem ignorada no instantâneo', () =>
    expect(targetPrice({ cost: C, premium: true, mode: 'instant', profit: 1000, relists: 2 })).toBe(4713));

  it('entradas inválidas', () => {
    for (const cost of [0, -5, NaN]) expect(targetPrice({ cost, premium: true, mode: 'order' })).toBeNull();
    expect(() => targetPrice({ cost: C, premium: true, mode: 'order', profit: 1, margin: 0.1 })).toThrow(TypeError);
  });

  it('marketGap', () => {
    expect(marketGap(4839, 4500)).toBeCloseTo(0.0753, 4);
    expect(marketGap(4839, 0)).toBeNull();
  });
});

describe('lowestListing', () => {
  it('menor preço de venda entre cidades reais, ignorando zero e Black Market', () => {
    const prices = mkPrices({ T4_MAIN_SWORD: { Martlock: { s: 4600, sd: 111 }, Caerleon: { s: 4500, sd: 222 }, Lymhurst: { s: 0 }, 'Black Market': { s: 100 } } });
    expect(lowestListing(prices, 'T4_MAIN_SWORD')).toEqual({ price: 4500, city: 'Caerleon', date: 222 });
  });
  it('sem preços retorna null', () => {
    expect(lowestListing(null, 'T4_MAIN_SWORD')).toBeNull();
    expect(lowestListing(mkPrices({}), 'T4_MAIN_SWORD')).toBeNull();
  });
});
