import { describe, expect, it } from 'vitest';
import { targetPrice, marketGap, exitNoTaxByMode } from './targetPrice';
import { netSale } from './econ';

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

describe('IDEIA-060: entradas inválidas', () => {
  it('relistagens negativa ou decimal: a lib recusa', () => {
    for (const relists of [-3, 2.7]) expect(targetPrice({ cost: C, premium: true, mode: 'order', profit: 1000, relists })).toBeNull();
  });
  it('modo inválido: null (antes tratava como instantâneo)', () => {
    for (const mode of ['foo', undefined, null]) expect(targetPrice({ cost: C, premium: true, mode, profit: 1000 })).toBeNull();
  });
  it('relistagens acima do derivado: null; no limite continua válido', () => {
    expect(targetPrice({ cost: C, premium: true, mode: 'order', profit: 1000, relists: 38 })).toBeNull();
    expect(targetPrice({ cost: C, premium: true, mode: 'order', profit: 1000, relists: 37 })).not.toBeNull();
  });
});

describe('targetPrice com noTax (IDEIA-075)', () => {
  const base = { cost: 1000, profit: 500, premium: true };
  it('noTax: ordem de venda, premium: 1.500 ÷ 1 = 1.500 (sem noTax: 1.605)', () => {
    expect(targetPrice({ ...base, mode: 'order' })).toBe(1605);
    expect(targetPrice({ ...base, mode: 'order', noTax: true })).toBe(1500);
  });
  it('noTax: ordem de compra na hora, premium: 1.500 (sem noTax: 1.563)', () => {
    expect(targetPrice({ ...base, mode: 'instant' })).toBe(1563);
    expect(targetPrice({ ...base, mode: 'instant', noTax: true })).toBe(1500);
  });
  it('noTax sem premium (8%): ordem de venda 1.676; com noTax 1.500', () => {
    expect(targetPrice({ ...base, premium: false, mode: 'order' })).toBe(1676);
    expect(targetPrice({ ...base, premium: false, mode: 'order', noTax: true })).toBe(1500);
  });
  it('noTax ignora relistagens: 2 relistagens sem noTax = 1.695; com noTax 1.500', () => {
    expect(targetPrice({ ...base, mode: 'order', relists: 2 })).toBe(1695);
    expect(targetPrice({ ...base, mode: 'order', relists: 2, noTax: true })).toBe(1500);
  });
  it('noTax com margem: 20% de 1.000 = 200; 1.200 (sem noTax 1.284)', () => {
    expect(targetPrice({ cost: 1000, margin: 0.2, premium: true, mode: 'order' })).toBe(1284);
    expect(targetPrice({ cost: 1000, margin: 0.2, premium: true, mode: 'order', noTax: true })).toBe(1200);
  });
  it('equilíbrio com noTax: preço = custo arredondado para cima (3.754,27 → 3.755)', () => {
    expect(targetPrice({ cost: 3754.27, premium: true, mode: 'order', noTax: true })).toBe(3755);
  });
  it('noTax só vale com true estrito: "true", 1, undefined e null contam como falso', () => {
    for (const noTax of ['true', 1, undefined, null]) expect(targetPrice({ ...base, mode: 'order', noTax })).toBe(1605);
  });
  it('mode inválido continua null mesmo com noTax; custo inválido idem', () => {
    expect(targetPrice({ ...base, mode: 'none', noTax: true })).toBeNull();
    expect(targetPrice({ ...base, cost: 0, mode: 'order', noTax: true })).toBeNull();
  });
  it('consistência com netSale: com noTax, netSale(alvo, "none") >= custo + lucro e netSale(alvo - 1, "none") < custo + lucro', () => {
    const p = targetPrice({ cost: 3754.27, profit: 1000, premium: true, mode: 'order', noTax: true });
    expect(p).toBe(4755);
    expect(netSale(p, 'none', true)).toBeGreaterThanOrEqual(4754.27);
    expect(netSale(p - 1, 'none', true)).toBeLessThan(4754.27);
  });
  it('exitNoTaxByMode: só a MELHOR (primeira) saída do modo decide; marca em outra saída do mesmo modo não conta', () => {
    const o = [{ city: 'Caerleon', mode: 'order', noTax: false }, { city: 'Martlock', mode: 'order', noTax: true }, { city: 'Black Market', mode: 'instant', noTax: true }];
    expect(exitNoTaxByMode(o)).toEqual({ order: { on: false, city: 'Caerleon' }, instant: { on: true, city: 'Black Market' } });
    expect(exitNoTaxByMode([o[1], o[0]]).order).toEqual({ on: true, city: 'Martlock' });
  });
  it('exitNoTaxByMode: modo sem saída é null; noTax só com true estrito; vazio, undefined e não-array dão tudo null', () => {
    expect(exitNoTaxByMode([{ city: 'Caerleon', mode: 'order', noTax: 'true' }])).toEqual({ order: { on: false, city: 'Caerleon' }, instant: null });
    for (const x of [[], undefined, null, 'abc', {}]) expect(exitNoTaxByMode(x)).toEqual({ order: null, instant: null });
  });
});
