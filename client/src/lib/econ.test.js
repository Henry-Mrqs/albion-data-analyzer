import { beforeEach, describe, expect, it } from 'vitest';
import {
  buyQuote, materialPlan, netSale, refineChainIds, refineUnit, resolveRRR, roundFee, rrr, splitUniq, stationFee,
} from './econ';
import { loadFixtureCatalog, mkPrices, planksSpec } from '../test/helpers';

beforeEach(loadFixtureCatalog);

describe('rrr', () => {
  const cases = [
    [{ kind: 'refine', specialty: false, focus: false }, 18 / 118],
    [{ kind: 'refine', specialty: true, focus: false }, 58 / 158],
    [{ kind: 'craft', specialty: true, focus: false }, 33 / 133],
    [{ kind: 'craft', specialty: true, focus: true }, 92 / 192],
    [{ kind: 'refine', specialty: true, focus: true }, 117 / 217],
    [{ kind: 'refine', specialty: true, focus: false, daily: 20 }, 78 / 178],
    [{ kind: 'refine', specialty: true, focus: true, daily: 20 }, 137 / 237],
    [{ kind: 'craft', specialty: false, focus: true }, 77 / 177],
  ];
  it.each(cases)('rrr %j', (arg, esperado) => expect(rrr(arg)).toBeCloseTo(esperado, 6));
  it('valores literais', () => {
    // 0,1525 / 0,3671 / 0,2481 / 0,4792 / 0,5392 / 0,4382 / 0,5781 / 0,4350
    expect(rrr({ kind: 'refine', specialty: false, focus: false })).toBeCloseTo(0.1525, 4);
    expect(rrr({ kind: 'refine', specialty: true, focus: false })).toBeCloseTo(0.3671, 4);
    expect(rrr({ kind: 'craft', specialty: true, focus: false })).toBeCloseTo(0.2481, 4);
    expect(rrr({ kind: 'craft', specialty: true, focus: true })).toBeCloseTo(0.4792, 4);
    expect(rrr({ kind: 'refine', specialty: true, focus: true })).toBeCloseTo(0.5392, 4);
    expect(rrr({ kind: 'refine', specialty: true, focus: false, daily: 20 })).toBeCloseTo(0.4382, 4);
    expect(rrr({ kind: 'refine', specialty: true, focus: true, daily: 20 })).toBeCloseTo(0.5781, 4);
    expect(rrr({ kind: 'craft', specialty: false, focus: true })).toBeCloseTo(0.435, 4);
  });
});

describe('resolveRRR', () => {
  it('RRR manual válido vence o automático; inválido/vazio cai no automático', () => {
    expect(resolveRRR(0.3, '')).toBeCloseTo(0.3, 6);
    expect(resolveRRR(0.3, '25')).toBeCloseTo(0.25, 6);
    expect(resolveRRR(0.3, 25)).toBeCloseTo(0.25, 6);
    expect(resolveRRR(0.3, 'abc')).toBeCloseTo(0.3, 6);
    expect(resolveRRR(0.3, undefined)).toBeCloseTo(0.3, 6);
    expect(resolveRRR(0.3, '0')).toBe(0); // zero é "manual" (comportamento atual)
  });
});

describe('stationFee / roundFee (IDEIA-019: arredonda só no total)', () => {
  // dossiê §4: valor de item 384 (Broadsword T4 = 16*16 + 8*16), prancha T4 = 16
  it('caso 1: 100 crafts, taxa 100 = 4.320 (antes 4.300)', () => expect(roundFee(stationFee(384, 100, 100))).toBe(4320)); // 384*0,1125=43,2; *100 = 4320
  it('caso 2: 1 craft, taxa 100 = 43 (43,2 arredondado no total)', () => {
    expect(stationFee(384, 100)).toBeCloseTo(43.2, 6);
    expect(roundFee(stationFee(384, 100, 1))).toBe(43);
  });
  it('caso 3: 1.000 pranchas T4, taxa 100 = 1.800 (antes 2.000)', () => expect(roundFee(stationFee(16, 100, 1000))).toBe(1800)); // 16*0,1125*1000
  it('caso 4: 7 crafts, taxa 333 = 1.007 (antes 1.008)', () => {
    expect(stationFee(384, 333, 7)).toBeCloseTo(1006.992, 3); // 43,2*7*3,33
    expect(roundFee(stationFee(384, 333, 7))).toBe(1007);
  });
  it('caso 5: 100 crafts, taxa 500 = 21.600 (igual)', () => expect(roundFee(stationFee(384, 500, 100))).toBe(21600));
  it('por unidade é exata e n=1 por padrão', () => {
    expect(stationFee(16, 400)).toBeCloseTo(7.2, 9);
    expect(stationFee(8, 400)).toBeCloseTo(3.6, 9);
    expect(stationFee(4, 400)).toBeCloseTo(1.8, 9);
  });
  it('valores grandes: exato e arredondado', () => {
    expect(stationFee(7296, 400)).toBeCloseTo(3283.2, 6);
    expect(stationFee(1024, 400)).toBeCloseTo(460.8, 6);
    expect(roundFee(stationFee(7296, 400))).toBe(3283);
    expect(roundFee(stationFee(1024, 400))).toBe(461);
  });
  it('taxa zero e meio sobe', () => {
    expect(stationFee(100, 0, 5)).toBe(0);
    expect(roundFee(stationFee(100, 0))).toBe(0);
    expect(stationFee(40, 100)).toBeCloseTo(4.5, 9);
    expect(roundFee(stationFee(40, 100))).toBe(5); // 4,5 sobe
  });
  it('linearidade: stationFee(v, r, n) === n * stationFee(v, r)', () => expect(stationFee(384, 333, 7)).toBeCloseTo(7 * stationFee(384, 333), 9));
});

describe('netSale (1000)', () => {
  it('ordem/instantânea, com e sem premium', () => {
    expect(netSale(1000, 'order', true)).toBeCloseTo(935, 6); // 1 - 0,04 - 0,025
    expect(netSale(1000, 'instant', true)).toBeCloseTo(960, 6);
    expect(netSale(1000, 'order', false)).toBeCloseTo(895, 6); // 1 - 0,08 - 0,025
    expect(netSale(1000, 'instant', false)).toBeCloseTo(920, 6);
  });
});

describe('buyQuote', () => {
  const D1 = 1_000_000;
  const D2 = 2_000_000;
  const spec = {
    T4_WOOD: {
      Martlock: { s: 32, sd: D1, b: 20, bd: D1 },
      Thetford: { s: 28, sd: D2, b: 22, bd: D2 },
      'Fort Sterling': { s: 0, b: 25 },
    },
  };
  it("'best' pega o menor preço de venda > 0", () => {
    expect(buyQuote(mkPrices(spec), 'T4_WOOD', { city: 'best' })).toMatchObject({ price: 28, city: 'Thetford', date: D2 });
  });
  it('cidade fixa', () => {
    expect(buyQuote(mkPrices(spec), 'T4_WOOD', { city: 'Martlock' })).toMatchObject({ price: 32, city: 'Martlock', date: D1 });
  });
  it('useOrders: menor ordem de compra mais 2,5%', () => {
    const q = buyQuote(mkPrices(spec), 'T4_WOOD', { city: 'best', useOrders: true });
    expect(q.price).toBeCloseTo(20.5, 6); // 20 * 1,025
    expect(q.city).toBe('Martlock');
    expect(q.date).toBe(D1);
  });
  it('sem preço', () => {
    expect(buyQuote(mkPrices({}), 'T4_WOOD')).toEqual({ price: 0, date: null, city: null });
    expect(buyQuote(null, 'T4_WOOD')).toEqual({ price: 0, date: null, city: null });
  });
});

describe('splitUniq / refineChainIds', () => {
  it('splitUniq', () => {
    expect(splitUniq('T4_PLANKS_LEVEL1')).toEqual({ base: 'T4_PLANKS', ench: 1 });
    expect(splitUniq('T4_PLANKS')).toEqual({ base: 'T4_PLANKS', ench: 0 });
  });
  it('refineChainIds', () => {
    expect(refineChainIds('T4_PLANKS', true)).toEqual(['T4_PLANKS', 'T4_WOOD', 'T3_PLANKS', 'T3_WOOD', 'T2_PLANKS', 'T2_WOOD']);
    expect(refineChainIds('T4_PLANKS', false)).toEqual(['T4_PLANKS', 'T4_WOOD', 'T3_PLANKS']);
  });
});

describe('refineUnit (rota de refino)', () => {
  const ctx = (prices, route, extra = {}) => ({
    prices, city: 'best', useOrders: false, rrr: 58 / 158, feePer100: 400, route, ...extra,
  });
  const A = () => mkPrices(planksSpec());

  it('A buy', () => {
    const u = refineUnit('T4_PLANKS', ctx(A(), 'buy'));
    expect(u.cost).toBeCloseTo(76.8203, 4); // 110*0,632911 + 7,2
    expect(u.fee).toBeCloseTo(7.2, 9);
    expect(u.missing).toEqual([]);
    expect(u.lines.map((l) => [l.mid, l.qty, l.unit, l.choice, l.refined])).toEqual([
      ['T4_WOOD', 2, 30, 'buy', false],
      ['T3_PLANKS', 1, 50, 'buy', true],
    ]);
  });
  it('A all', () => {
    const u = refineUnit('T4_PLANKS', ctx(A(), 'all'));
    expect(u.cost).toBeCloseTo(62.2197, 4);
    expect(u.lines[1]).toMatchObject({ choice: 'make', alt: 50 });
    expect(u.lines[1].unit).toBeCloseTo(26.9312, 4);
    expect(u.lines[1].sub.lines[1]).toMatchObject({ choice: 'make', alt: 5 });
    expect(u.lines[1].sub.lines[1].unit).toBeCloseTo(6.8633, 4);
  });
  it('A best: faz T3, compra T2', () => {
    const u = refineUnit('T4_PLANKS', ctx(A(), 'best'));
    expect(u.cost).toBeCloseTo(61.4734, 4);
    expect(u.lines[1]).toMatchObject({ choice: 'make', alt: 50 });
    expect(u.lines[1].unit).toBeCloseTo(25.7519, 4);
    const t2 = u.lines[1].sub.lines[1];
    expect(t2).toMatchObject({ choice: 'buy', unit: 5 });
    expect(t2.alt).toBeCloseTo(6.8633, 4);
  });
  it('B best: compra T3 a 20 (= rota buy)', () => {
    const B = () => mkPrices(planksSpec({ T3_PLANKS: 20 }));
    const u = refineUnit('T4_PLANKS', ctx(B(), 'best'));
    expect(u.cost).toBeCloseTo(57.8329, 4);
    expect(u.lines[1]).toMatchObject({ choice: 'buy', unit: 20, sub: null });
    expect(u.lines[1].alt).toBeCloseTo(25.7519, 4);
    expect(refineUnit('T4_PLANKS', ctx(B(), 'all')).cost).toBeCloseTo(62.2197, 4);
  });
  it('sem T3_WOOD: all acusa, best contorna', () => {
    const p = () => mkPrices(planksSpec({ T3_WOOD: null }));
    const all = refineUnit('T4_PLANKS', ctx(p(), 'all'));
    expect(all.cost).toBeCloseTo(50.2024, 4);
    expect(all.missing).toEqual(['T3_WOOD']);
    const best = refineUnit('T4_PLANKS', ctx(p(), 'best'));
    expect(best.cost).toBeCloseTo(76.8203, 4);
    expect(best.missing).toEqual([]);
  });
  it('sem T4_WOOD na rota buy', () => {
    const u = refineUnit('T4_PLANKS', ctx(mkPrices(planksSpec({ T4_WOOD: null })), 'buy'));
    expect(u.cost).toBeCloseTo(38.8456, 4);
    expect(u.missing).toEqual(['T4_WOOD']);
  });
  it('sem receita', () => {
    expect(refineUnit('T9_PLANKS', ctx(A(), 'buy'))).toEqual({ uniq: 'T9_PLANKS', cost: 0, fee: 0, missing: ['T9_PLANKS'], lines: [] });
  });
  it('prices null não estoura', () => {
    const u = refineUnit('T4_PLANKS', ctx(null, 'best'));
    expect(u.cost).toBeCloseTo(7.2, 6); // só a taxa: tudo sem preço; valor 16 * 0,1125 * 4 = 7,2 (IDEIA-019: sem arredondar; antes 7)
    expect(u.missing).toEqual(['T4_WOOD', 'T3_PLANKS']);
  });
  it('deep legado: deep=true sem route equivale a all; sem ambos equivale a buy', () => {
    expect(refineUnit('T4_PLANKS', ctx(A(), undefined, { deep: true })).cost).toBeCloseTo(62.2197, 4);
    expect(refineUnit('T4_PLANKS', ctx(A(), undefined)).cost).toBeCloseTo(76.8203, 4);
  });
  it('DT-001: empate exato entre produzir e comprar na rota best compra (usa <, não <=)', () => {
    // rrr 0 e taxa 0: custo de produzir T3_PLANKS = 2 * T3_WOOD (15) + 1 * T2_PLANKS (5) = 35.
    // T2_WOOD ausente: T2 não é produzível, só comprado a 5. T3_PLANKS pronto custa 35: empate exato.
    const tie = () => mkPrices(planksSpec({ T2_WOOD: null, T3_PLANKS: 35 }));
    const u = refineUnit('T4_PLANKS', ctx(tie(), 'best', { rrr: 0, feePer100: 0 }));
    expect(u.lines[1]).toMatchObject({ mid: 'T3_PLANKS', choice: 'buy', unit: 35, sub: null, alt: 35 });
    // um centavo mais barato produzir: passa a produzir (o teste do empate não é trivial)
    const cheaper = mkPrices(planksSpec({ T2_WOOD: null, T3_PLANKS: 35.01 }));
    expect(refineUnit('T4_PLANKS', ctx(cheaper, 'best', { rrr: 0, feePer100: 0 })).lines[1]).toMatchObject({ choice: 'make', unit: 35 });
  });
  it('materialPlan(best A, n=1000)', () => {
    const p = materialPlan(refineUnit('T4_PLANKS', ctx(A(), 'best')), 1000, 58 / 158);
    expect(p.makes.map((m) => m.mid)).toEqual(['T4_PLANKS', 'T3_PLANKS']);
    expect(p.makes[0]).toMatchObject({ qty: 1000, fee: 7200 }); // 1,8*... 7,2 * 1000
    expect(p.makes[1].qty).toBeCloseTo(632.9114, 4);
    expect(p.makes[1].fee).toBeCloseTo(2278.481, 4); // 632,9114 * 3,6
    expect(p.buys.map((b) => [b.mid, b.unit])).toEqual([['T4_WOOD', 30], ['T3_WOOD', 15], ['T2_PLANKS', 5]]);
    expect(p.buys.map((b) => b.qty)).toEqual([
      expect.closeTo(1265.8228, 4), expect.closeTo(801.1537, 4), expect.closeTo(400.5768, 4),
    ]);
  });
});
