import { describe, it, expect } from 'vitest';
import { cleanRelist, relistParts, relistCost, netSaleWithRelists, SETUP_BASES } from './relist';
import { netSale } from './econ';

describe('relistParts', () => {
  it('preço novo: u=2,s=10 -> flat 0,75 e perPrice 0,05; u=4 -> flat 2,5', () => {
    const a = relistParts({ updates: 2, step: 10, base: 'price' });
    expect(a.perPrice).toBeCloseTo(0.05, 10);
    expect(a.flat).toBeCloseTo(0.75, 10);
    expect(relistParts({ updates: 4, step: 10 }).flat).toBeCloseTo(2.5, 10);
  });
  it('diferença: u=2,s=10 -> { 0, 1 }; u=4 -> flat 2', () => {
    expect(relistParts({ updates: 2, step: 10, base: 'diff' })).toEqual({ perPrice: 0, flat: 1 });
    expect(relistParts({ updates: 4, step: 10, base: 'diff' }).flat).toBeCloseTo(2, 10);
  });
  it('defende: NaN, null, texto, negativo, Infinity -> 0; base desconhecida = preço novo', () => {
    for (const bad of [NaN, null, 'x', -3, Infinity, undefined, {}, [3]]) {
      expect(relistParts({ updates: bad, step: 10 })).toEqual({ perPrice: 0, flat: 0 });
      expect(relistParts({ updates: 2, step: bad }).perPrice).toBeCloseTo(0.05, 10);
      expect(relistParts({ updates: 2, step: bad }).flat).toBe(0);
    }
    expect(relistParts({ updates: 2, step: 10, base: 'foo' })).toEqual(relistParts({ updates: 2, step: 10, base: 'price' }));
    expect(SETUP_BASES).toEqual(['price', 'diff']);
  });
});

describe('netSaleWithRelists', () => {
  it('dossiê: 4.470, n 1, order, premium, u 3, s 10 -> net 3.842,70, relistCost 336,75, setupTotal 448,50', () => {
    const r = netSaleWithRelists({ price: 4470, qty: 1, mode: 'order', premium: true, updates: 3, step: 10 });
    expect(r.net).toBeCloseTo(3842.7, 6);
    expect(r.relistCost).toBeCloseTo(336.75, 6);
    expect(r.setupTotal).toBeCloseTo(448.5, 6);
  });
  it('n = 5: relistCost 1.683,75, setupTotal 2.242,50, net 19.213,50', () => {
    const r = netSaleWithRelists({ price: 4470, qty: 5, mode: 'order', premium: true, updates: 3, step: 10 });
    expect(r.relistCost).toBeCloseTo(1683.75, 6);
    expect(r.setupTotal).toBeCloseTo(2242.5, 6);
    expect(r.net).toBeCloseTo(19213.5, 6);
  });
  it('u = 0: net = netSale = 4.179,45, relistCost 0, setupTotal 111,75', () => {
    const r = netSaleWithRelists({ price: 4470, mode: 'order', premium: true, updates: 0 });
    expect(r.net).toBe(netSale(4470, 'order', true));
    expect(r.net).toBeCloseTo(4179.45, 6);
    expect(r.relistCost).toBe(0);
    expect(r.setupTotal).toBeCloseTo(111.75, 6);
  });
  it('u 2, s 10: preço novo -> relistCost 224,25 e net 3.955,20; diferença -> 1 e 4.178,45', () => {
    const a = netSaleWithRelists({ price: 4470, mode: 'order', premium: true, updates: 2, step: 10, base: 'price' });
    expect(a.relistCost).toBeCloseTo(224.25, 6);
    expect(a.net).toBeCloseTo(3955.2, 6);
    const b = netSaleWithRelists({ price: 4470, mode: 'order', premium: true, updates: 2, step: 10, base: 'diff' });
    expect(b.relistCost).toBeCloseTo(1, 6);
    expect(b.net).toBeCloseTo(4178.45, 6);
  });
  it('sem premium: 4.470, u 1, s 0 -> net 3.888,90', () => {
    const r = netSaleWithRelists({ price: 4470, mode: 'order', premium: false, updates: 1, step: 0 });
    expect(r.net).toBeCloseTo(4000.65 - 111.75, 6);
  });
  it('instant e none: sem efeito', () => {
    const i = netSaleWithRelists({ price: 4470, mode: 'instant', premium: true, updates: 3, step: 10 });
    expect(i).toMatchObject({ relistCost: 0, setupTotal: 0 });
    expect(i.net).toBeCloseTo(4291.2, 6);
    const n = netSaleWithRelists({ price: 4470, mode: 'none', premium: true, updates: 3, step: 10 });
    expect(n).toMatchObject({ net: 4470, relistCost: 0, setupTotal: 0 });
  });
  it('relistCost direto', () => {
    expect(relistCost({ price: 4470, qty: 1, updates: 3, step: 10 })).toBeCloseTo(336.75, 6);
  });
});

describe('cleanRelist', () => {
  const f = (cfg, premium = true) => cleanRelist(cfg, { premium });
  it('relists', () => {
    expect(f({ relists: '3' })).toMatchObject({ values: { updates: 3 }, issues: [] });
    for (const v of ['', undefined, null]) expect(f({ relists: v })).toMatchObject({ values: { updates: 0 }, issues: [] });
    expect(f({ relists: 'abc' }).issues[0].field).toBe('relists');
    expect(f({ relists: 'abc' }).values.updates).toBe(0);
    expect(f({ relists: -1 }).values.updates).toBe(0);
    expect(f({ relists: 2.7 })).toMatchObject({ values: { updates: 2 } });
    expect(f({ relists: 2.7 }).issues[0].code).toBe('relists-decimal');
    expect(f({ relists: 100 }).values.updates).toBe(37);
    expect(f({ relists: 100 }, false).values.updates).toBe(35);
    expect(f({ relists: 100 }).issues[0].code).toBe('relists-max');
  });
  it('step', () => {
    expect(f({ relistStep: '10' }).values.step).toBe(10);
    expect(f({ relistStep: '' })).toMatchObject({ values: { step: 0 }, issues: [] });
    for (const bad of ['x', -5, NaN, {}, [3]]) {
      const r = f({ relistStep: bad });
      expect(r.values.step).toBe(0);
      expect(r.issues[0].field).toBe('relistStep');
      expect(r.issues[0].msg).not.toMatch(/object|\[|\{/);
    }
    const big = f({ relistStep: 1e12 });
    expect(big.values.step).toBe(1e9);
    expect(big.issues[0].field).toBe('relistStep');
  });
  it('base', () => {
    expect(f({})).toMatchObject({ values: { base: 'price' }, issues: [] });
    expect(f({ relistBase: 'diff' }).values.base).toBe('diff');
    for (const bad of ['foo', 3]) {
      const r = f({ relistBase: bad });
      expect(r.values.base).toBe('price');
      expect(r.issues[0].field).toBe('relistBase');
    }
    expect(f({ relistBase: null })).toMatchObject({ values: { base: 'price' }, issues: [] });
  });
  it('cfg ruim não lança', () => {
    for (const bad of [null, undefined, [], 'x', 3]) {
      expect(f(bad).values).toEqual({ updates: 0, step: 0, base: 'price' });
    }
  });
});
