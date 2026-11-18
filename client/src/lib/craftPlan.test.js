import { beforeEach, describe, expect, it } from 'vitest';
import { craftBonusCity, getItem, recipeOf } from './catalog';
import { canRefineUniq, computeCraft, craftChainIds, craftRates, keyOf, modeOf } from './craftPlan';
import { loadFixtureCatalog, mkPrices, planksSpec } from '../test/helpers';

beforeEach(loadFixtureCatalog);

const craftCfg = (over = {}) => ({
  craftCity: 'Lymhurst', specialty: null, focus: false, feePer100: 400, customRRR: '',
  matCity: 'best', useOrders: false, crafts: 1,
  refine: {}, refineFocus: false, refineFee: 400, refineCity: 'auto', refineDaily: {},
  ...over,
});

const bowPrices = () =>
  mkPrices({
    ...planksSpec({ T4_PLANKS: { 'Fort Sterling': { s: 120 }, Martlock: { s: 130 } } }),
    T4_2H_BOW: { Lymhurst: { s: 9500 }, Caerleon: { s: 9000, b: 8000 }, 'Black Market': { b: 8500 } },
  });
const bowArgs = (over = {}) => ({
  rec: recipeOf('T4_2H_BOW'),
  targetMid: 'T4_2H_BOW',
  prices: bowPrices(),
  cfg: craftCfg(),
  premium: true,
  bonusCity: craftBonusCity('weapons/bow'),
  ...over,
});

describe('craftRates', () => {
  it('especialização automática quando a cidade é a de bônus', () => {
    const r = craftRates(craftCfg(), 'Lymhurst');
    expect(r.specialty).toBe(true);
    expect(r.autoRRR).toBeCloseTo(33 / 133, 6);
    expect(r.craftRRR).toBeCloseTo(0.2481, 4);
  });
  it('cidade errada = sem bônus; specialty explícito vence', () => {
    expect(craftRates(craftCfg({ craftCity: 'Martlock' }), 'Lymhurst').autoRRR).toBeCloseTo(18 / 118, 6);
    expect(craftRates(craftCfg({ craftCity: 'Martlock', specialty: true }), 'Lymhurst').specialty).toBe(true);
    expect(craftRates(craftCfg({ specialty: false }), 'Lymhurst').autoRRR).toBeCloseTo(18 / 118, 6);
  });
  it('foco e RRR manual', () => {
    expect(craftRates(craftCfg({ focus: true }), 'Lymhurst').autoRRR).toBeCloseTo(92 / 192, 6);
    expect(craftRates(craftCfg({ customRRR: '30' }), 'Lymhurst').craftRRR).toBeCloseTo(0.3, 6);
    expect(craftRates(craftCfg({ customRRR: 'x' }), 'Lymhurst').craftRRR).toBeCloseTo(33 / 133, 6);
  });
  it('crafts: mínimo 1; aceita decimal (comportamento atual)', () => {
    for (const v of ['', 0, '0', -5, undefined]) expect(craftRates(craftCfg({ crafts: v }), null).crafts).toBe(1);
    expect(craftRates(craftCfg({ crafts: '1000' }), null).crafts).toBe(1000);
    expect(craftRates(craftCfg({ crafts: '2.5' }), null).crafts).toBe(2.5);
  });
  it('refineRRRFor: auto = cidade do recurso; cidade fixa só bate no recurso dela; diário soma', () => {
    const base = craftRates(craftCfg(), 'Lymhurst');
    expect(base.refineRRRFor('PLANKS')).toBeCloseTo(58 / 158, 6);
    expect(craftRates(craftCfg({ refineCity: 'Martlock' }), 'Lymhurst').refineRRRFor('PLANKS')).toBeCloseTo(18 / 118, 6);
    expect(craftRates(craftCfg({ refineCity: 'Fort Sterling' }), 'Lymhurst').refineRRRFor('PLANKS')).toBeCloseTo(58 / 158, 6);
    expect(craftRates(craftCfg({ refineDaily: { PLANKS: 20 } }), 'Lymhurst').refineRRRFor('PLANKS')).toBeCloseTo(78 / 178, 6);
    expect(craftRates(craftCfg({ refineFocus: true }), 'Lymhurst').refineRRRFor('PLANKS')).toBeCloseTo(117 / 217, 6);
  });
});

describe('computeCraft', () => {
  it('C1: 1000 arcos, planks comprado pronto', () => {
    const c = computeCraft(bowArgs({ cfg: craftCfg({ crafts: 1000, refine: { PLANKS: 'buy' } }) }));
    const l = c.lines[0];
    expect(l).toMatchObject({ uniq: 'T4_PLANKS', mode: 'buy', unit: 120, city: 'Fort Sterling', sub: null, useRefine: false, canRefine: true });
    expect(l.qty).toBeCloseTo(24060.1504, 4);
    expect(l.total).toBeCloseTo(2887218.0451, 3);
    expect(l.rr).toBeCloseTo(58 / 158, 6);
    expect(l.cmp).toMatchObject({ buy: 120, bestIsMake: true });
    expect(l.cmp.all).toBeCloseTo(62.353, 3);
    expect(l.cmp.best).toBeCloseTo(61.5265, 3);
    expect(l.cmp.d10).toBeCloseTo(57.496, 3);
    expect(l.cmp.d20).toBeCloseTo(54.0016, 3);
    expect(c.fee).toBe(230000); // arredonda por craft antes de multiplicar (230,4 -> 230)
    expect(c.units).toBe(1000);
    expect(c.totalCost).toBeCloseTo(3117218.0451, 3);
    expect(c.unitCost).toBeCloseTo(3117.218, 3);
    expect(c.options.map((o) => [o.city, o.mode])).toEqual([
      ['Lymhurst', 'order'], ['Caerleon', 'order'], ['Black Market', 'instant'], ['Caerleon', 'instant'],
    ]);
    expect(c.options.map((o) => o.net)).toEqual([
      expect.closeTo(8882500, 2), expect.closeTo(8415000, 2), expect.closeTo(8160000, 2), expect.closeTo(7680000, 2),
    ]);
    expect(c.best.net).toBeCloseTo(8882500, 2);
    expect(c.best.profit).toBeCloseTo(5765281.9549, 3);
    expect(c.best.margin).toBeCloseTo(184.9496, 3);
    expect(c.ready).toBeTruthy();
    expect(c.missing).toEqual([]);
  });

  it('C1 sem premium', () => {
    const c = computeCraft(bowArgs({ cfg: craftCfg({ crafts: 1000, refine: { PLANKS: 'buy' } }), premium: false }));
    expect(c.best.net).toBeCloseTo(8502500, 2); // 9500 * 0,895 * 1000
    expect(c.best.profit).toBeCloseTo(5385281.9549, 3);
    expect(c.best.margin).toBeCloseTo(172.7592, 3);
  });

  it('C2: modo best (produz T3, compra T2) e plano', () => {
    const c = computeCraft(bowArgs({ cfg: craftCfg({ crafts: 1000, refine: { PLANKS: 'best' } }) }));
    const l = c.lines[0];
    expect(l.useRefine).toBe(true);
    expect(l.unit).toBeCloseTo(61.5265, 3);
    expect(l.total).toBeCloseTo(1480337.2797, 3);
    expect(c.totalCost).toBeCloseTo(1710337.2797, 3);
    expect(c.best.profit).toBeCloseTo(7172162.7203, 3);
    expect(c.best.margin).toBeCloseTo(419.342, 3);
    expect(c.plan.map((p) => p.kind)).toEqual(['make', 'make', 'buy', 'buy', 'buy']);
    expect(c.plan.map((p) => p.mid)).toEqual(['T4_PLANKS', 'T3_PLANKS', 'T4_WOOD', 'T3_WOOD', 'T2_PLANKS']);
    expect(c.plan.map((p) => p.qty)).toEqual([
      expect.closeTo(24060.1504, 4), expect.closeTo(15227.9433, 4), expect.closeTo(30455.8866, 4),
      expect.closeTo(19275.8776, 4), expect.closeTo(9637.9388, 4),
    ]);
    expect(c.plan.map((p) => p.total)).toEqual([
      expect.closeTo(168421.0526, 3), expect.closeTo(60911.7731, 3), expect.closeTo(913676.5966, 3),
      expect.closeTo(289138.1635, 3), expect.closeTo(48189.6939, 3),
    ]);
    const soma = c.plan.reduce((a, p) => a + p.total, 0) + c.fee;
    expect(Math.abs(soma - c.totalCost)).toBeLessThan(0.01);
    expect(c.used.has('T2_PLANKS|Fort Sterling')).toBe(true);
  });

  it('DT-001: empate exato entre comprar pronto e produzir (modo best) compra', () => {
    const run = (planksPrice) => computeCraft(bowArgs({
      prices: mkPrices({ ...planksSpec({ T4_PLANKS: planksPrice }), T4_2H_BOW: { Lymhurst: { s: 9500 } } }),
      cfg: craftCfg({ crafts: 10, refine: { PLANKS: 'best' } }),
    }));
    // custo de produzir, lido de uma rodada em que comprar é muito mais caro
    const makeCost = run(100000).lines[0].cmp.best;
    expect(makeCost).toBeGreaterThan(0);
    const tie = run(makeCost);
    expect(tie.lines[0].cmp.bestIsMake).toBe(false);
    expect(tie.lines[0].useRefine).toBe(false);
    expect(tie.lines[0].unit).toBe(makeCost);
    // com o pronto 1 centavo mais caro, passa a produzir
    expect(run(makeCost + 0.01).lines[0].useRefine).toBe(true);
  });

  it('DT-001: Black Market nunca é ordem de venda, mesmo com preço de venda (s) > 0', () => {
    const prices = mkPrices({
      ...planksSpec(),
      T4_2H_BOW: { Lymhurst: { s: 9500 }, 'Black Market': { s: 99999, b: 8500 } },
    });
    const c = computeCraft(bowArgs({ prices }));
    expect(c.options.map((o) => [o.city, o.mode])).toEqual([['Lymhurst', 'order'], ['Black Market', 'instant']]);
    expect(c.options.some((o) => o.city === 'Black Market' && o.mode === 'order')).toBe(false);
  });

  it('C3: espada T6 com artefato (3 ingredientes), refinados em modo buy', () => {
    const prices = mkPrices({ T6_METALBAR: 200, T6_LEATHER: 150, T6_ARTEFACT_MAIN_SWORD_CRYSTAL: 90000 });
    const c = computeCraft({
      rec: recipeOf('T6_MAIN_SWORD_CRYSTAL'),
      targetMid: 'T6_MAIN_SWORD_CRYSTAL',
      prices,
      cfg: craftCfg({ refine: { METALBAR: 'buy', LEATHER: 'buy' } }),
      premium: true,
      bonusCity: craftBonusCity('weapons/sword'),
    });
    expect(c.lines.map((l) => l.qty)).toEqual([expect.closeTo(12.0301, 4), expect.closeTo(6.015, 4), 1]);
    expect(c.lines[2].returnable).toBe(false);
    expect(c.lines[0].canRefine && c.lines[1].canRefine).toBe(true);
    expect(c.lines[2].canRefine).toBe(false);
    expect(c.fee).toBe(3283);
    expect(c.totalCost).toBeCloseTo(96591.2707, 3);
    expect(c.missing).toEqual([]);
  });

  it('C5: poção T6 com 4 ingredientes e amount 5 (3 crafts, conta à mão)', () => {
    // Receita T6_POTION_COOLDOWN: 24 FOXGLOVE, 12 TEASEL, 12 COMFREY, 6 MILK (valor 40 cada na fixture), amount 5.
    // Craft em Caerleon (bônus de poções): RRR = 33/133, então 1 - RRR = 100/133. 3 crafts.
    //   qtd: FOXGLOVE 72*100/133, TEASEL 36*100/133, COMFREY 36*100/133, MILK 18*100/133
    // Preços (Fort Sterling): FOXGLOVE 10, TEASEL 20, COMFREY 30, MILK 40
    //   material = (72*10 + 36*20 + 36*30 + 18*40) * 100/133 = (720+720+1080+720) * 100/133 = 324000/133 = 2436,0902
    // Valor da receita = (24+12+12+6) * 40 = 2160; taxa por craft com 150/100 de nutrição:
    //   2160 * 0,1125 * 1,5 = 364,5 -> Math.round = 365; 3 crafts = 1095 (arredonda antes de multiplicar)
    // Custo total = 2436,0902 + 1095 = 3531,0902; unidades = 5 * 3 = 15; custo por unidade = 235,4060
    // Venda em ordem em Caerleon a 400 (premium: 1 - 0,04 - 0,025 = 0,935): 400 * 0,935 * 15 = 5610
    //   lucro = 5610 - 3531,0902 = 2078,9098; margem = 2078,9098 / 3531,0902 * 100 = 58,8744%
    const rec = recipeOf('T6_POTION_COOLDOWN');
    expect(rec.amount).toBe(5);
    expect(rec.res).toHaveLength(4);
    const prices = mkPrices({
      T6_FOXGLOVE: 10, T5_TEASEL: 20, T3_COMFREY: 30, T6_MILK: 40,
      T6_POTION_COOLDOWN: { Caerleon: { s: 400 } },
    });
    const c = computeCraft({
      rec,
      targetMid: 'T6_POTION_COOLDOWN',
      prices,
      cfg: craftCfg({ craftCity: 'Caerleon', crafts: 3, feePer100: 150 }),
      premium: true,
      bonusCity: craftBonusCity(getItem('T6_POTION_COOLDOWN').c),
    });
    expect(c.rates.craftRRR).toBeCloseTo(33 / 133, 6);
    expect(c.lines.map((l) => l.qty)).toEqual([
      expect.closeTo(7200 / 133, 4), expect.closeTo(3600 / 133, 4), expect.closeTo(3600 / 133, 4), expect.closeTo(1800 / 133, 4),
    ]);
    expect(c.matCost).toBeCloseTo(2436.0902, 3);
    expect(c.fee).toBe(1095);
    expect(c.totalCost).toBeCloseTo(3531.0902, 3);
    expect(c.units).toBe(15);
    expect(c.unitCost).toBeCloseTo(235.406, 3);
    expect(c.options.map((o) => [o.city, o.mode])).toEqual([['Caerleon', 'order']]);
    expect(c.best.net).toBeCloseTo(5610, 3);
    expect(c.best.profit).toBeCloseTo(2078.9098, 3);
    expect(c.best.margin).toBeCloseTo(58.8744, 3);
  });

  it('C4: item sem preço', () => {
    const buy = computeCraft(bowArgs({
      prices: mkPrices({ ...planksSpec({ T4_PLANKS: null }), T4_2H_BOW: { Lymhurst: { s: 9500 } } }),
      cfg: craftCfg({ refine: { PLANKS: 'buy' } }),
    }));
    expect(buy.lines[0].unit).toBe(0);
    expect(buy.missing).toContain('Tábuas de Pinho');
    expect(buy.ready).toBeFalsy();

    const all = computeCraft(bowArgs({
      prices: mkPrices({ ...planksSpec({ T3_WOOD: null }), T4_2H_BOW: { Lymhurst: { s: 9500 } } }),
      cfg: craftCfg({ refine: { PLANKS: 'all' } }),
    }));
    expect(all.missing).toEqual(['Troncos de Castanheira']);
    expect(all.ready).toBeFalsy();
  });

  it('prices null (carregando) e rec null', () => {
    const c = computeCraft(bowArgs({ prices: null }));
    expect(c.lines[0].unit).toBe(0);
    expect(c.lines[0].cmp).toBeNull();
    expect(c.options).toEqual([]);
    expect(c.ready).toBeFalsy();
    const v = computeCraft({ rec: null, targetMid: 'X', prices: null, cfg: craftCfg(), premium: true, bonusCity: null });
    expect(v.lines).toEqual([]);
    expect(v.plan).toEqual([]);
    expect(v.totalCost).toBe(0);
    expect(v.ready).toBeFalsy();
  });
});

describe('helpers', () => {
  it('craftChainIds', () => {
    expect(craftChainIds(recipeOf('T4_2H_BOW'), 'T4_2H_BOW')).toEqual([
      'T4_2H_BOW', 'T4_PLANKS', 'T4_WOOD', 'T3_PLANKS', 'T3_WOOD', 'T2_PLANKS', 'T2_WOOD',
    ]);
    expect(craftChainIds(null, 'T4_2H_BOW')).toEqual([]);
  });
  it('modeOf', () => {
    expect(modeOf({ PLANKS: 'buy' }, 'T4_PLANKS')).toBe('buy');
    expect(modeOf({ PLANKS: 'refine' }, 'T4_PLANKS')).toBe('all');
    expect(modeOf({ PLANKS: 'all' }, 'T4_PLANKS')).toBe('all');
    expect(modeOf({}, 'T4_PLANKS')).toBe('best');
  });
  it('keyOf / canRefineUniq', () => {
    expect(keyOf('T4_PLANKS_LEVEL1')).toBe('PLANKS');
    expect(canRefineUniq('T4_PLANKS')).toBe(true);
    expect(canRefineUniq('T1_PLANKS')).toBe(false);
    expect(canRefineUniq('T4_WOOD')).toBe(false);
  });
});
