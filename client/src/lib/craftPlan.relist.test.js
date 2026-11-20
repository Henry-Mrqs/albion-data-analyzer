// IDEIA-059: o Craft desconta as atualizações da ordem de venda; o estresse concorda com a tela.
import { beforeEach, describe, expect, it } from 'vitest';
import { recipeOf } from './catalog';
import { computeCraft } from './craftPlan';
import { craftStressInput, stressProfit } from './stress';
import { loadFixtureCatalog, mkPrices } from '../test/helpers';

beforeEach(loadFixtureCatalog);

const cfg0 = (over = {}) => ({
  craftCity: 'Lymhurst', specialty: true, focus: false, feePer100: 400, customRRR: '', matCity: 'best', useOrders: false, crafts: 1,
  refine: { METALBAR: 'buy', LEATHER: 'buy' }, refineFocus: false, refineFee: 400, refineCity: 'auto', refineDaily: {}, ...over,
});
const sell = (sword) => mkPrices({ T6_METALBAR: 200, T6_LEATHER: 150, T6_MAIN_SWORD: sword });
const run = (over = {}, sword = { Caerleon: { s: 4470 } }, premium = true) =>
  computeCraft({ rec: recipeOf('T6_MAIN_SWORD'), targetMid: 'T6_MAIN_SWORD', prices: sell(sword), cfg: cfg0(over), premium, bonusCity: null });
const ord = (c, city = 'Caerleon') => c.options.find((o) => o.city === city && o.mode === 'order');

describe('computeCraft: atualizações da ordem (059)', () => {
  it('estado antigo e relists 0 / "" / undefined: idênticos entre si', () => {
    const a = run();
    for (const v of [0, '', undefined, '0']) {
      const b = run({ relists: v });
      expect(b.options).toEqual(a.options);
      expect(b.best).toEqual(a.best);
      expect(b.totalCost).toBe(a.totalCost);
    }
    expect(ord(a).relistCost).toBe(0);
  });
  it('dossiê: relists 3, step 10 -> relistCost 336,75 e setupTotal 448,50 por unidade; lucro cai 336,75', () => {
    const a = run();
    const c = run({ relists: '3', relistStep: '10' });
    const o = ord(c);
    expect(c.units).toBe(a.units);
    expect(o.relistCost).toBeCloseTo(336.75 * c.units, 6);
    expect(o.setupTotal).toBeCloseTo(448.5 * c.units, 6);
    expect(o.profit).toBeCloseTo(ord(a).profit - 336.75 * c.units, 6);
    expect(c.relist).toEqual({ updates: 3, step: 10, base: 'price' });
  });
  it('step 0: extra 335,25; base diff u 2 s 10: extra 1 contra 224,25 do preço novo', () => {
    const a = ord(run());
    expect(a.profit - ord(run({ relists: 3 })).profit).toBeCloseTo(335.25 * run().units, 6);
    const d = ord(run({ relists: 2, relistStep: 10, relistBase: 'diff' }));
    const p = ord(run({ relists: 2, relistStep: 10 }));
    expect(a.profit - d.profit).toBeCloseTo(1 * run().units, 6);
    expect(a.profit - p.profit).toBeCloseTo(224.25 * run().units, 6);
  });
  it('saída marcada Sem imposto: relistCost 0 mesmo com relists 3', () => {
    const a = run({ noTax: { 'Caerleon|order': true } });
    const b = run({ noTax: { 'Caerleon|order': true }, relists: 3, relistStep: 10 });
    expect(ord(b).relistCost).toBe(0);
    expect(ord(b).profit).toBeCloseTo(ord(a).profit, 9);
  });
  it('ordem de compra (instant): sem efeito', () => {
    const s = { Caerleon: { s: 4470, b: 4300 } };
    const i = (c) => c.options.find((o) => o.mode === 'instant');
    expect(i(run({ relists: 3, relistStep: 10 }, s)).profit).toBeCloseTo(i(run({}, s)).profit, 9);
    expect(i(run({ relists: 3 }, s)).relistCost).toBe(0);
  });
  it('a melhor saída usa o líquido com atualizações', () => {
    const s = { Caerleon: { s: 4470 }, Martlock: { b: 4300 } };
    expect(run({}, s).best).toMatchObject({ city: 'Caerleon', mode: 'order' });
    expect(run({ relists: 3, relistStep: 10 }, s).best).toMatchObject({ city: 'Martlock', mode: 'instant' });
  });
  it('cfg corrompida: não lança e trata como 0; avisos em issues', () => {
    const base = run();
    for (const v of [null, {}, NaN, 'abc', -2]) {
      let c;
      expect(() => { c = run({ relists: v }); }).not.toThrow();
      expect(ord(c).profit).toBeCloseTo(ord(base).profit, 9);
    }
    expect(() => run({ relists: [3] })).not.toThrow(); // [3] vira "3" (toNum da 060)
    expect(() => run({ relists: Infinity })).not.toThrow(); // Infinity: teto de 37 da 060 (não é 0), com aviso
    expect(run({ relists: Infinity }).relist.updates).toBe(37);
    expect(run({ relists: 'abc' }).issues.some((i) => i.field === 'relists')).toBe(true);
    expect(run({ relistBase: 'foo' }).issues.some((i) => i.field === 'relistBase')).toBe(true);
    expect(run({ relistBase: 'foo' }).relist.base).toBe('price');
  });
});

describe('craftStressInput com atualizações (059)', () => {
  it('k = 0,935 − 0,075 e fixed + 1,5 por unidade; a grade bate com o lucro da tela', () => {
    const c = run({ relists: 3, relistStep: 10 });
    const si = craftStressInput(c, true);
    const si0 = craftStressInput(run(), true);
    expect(si.k).toBeCloseTo(0.935 - 0.075, 9);
    expect(si.fixed - si0.fixed).toBeCloseTo(1.5, 9);
    expect(stressProfit(si, {}) * c.units).toBeCloseTo(c.best.profit, 6);
  });
  it('saída noTax ou instant: k e fixed como hoje', () => {
    const a = craftStressInput(run({ noTax: { 'Caerleon|order': true } }), true);
    const b = craftStressInput(run({ noTax: { 'Caerleon|order': true }, relists: 3, relistStep: 10 }), true);
    expect(b.k).toBe(a.k);
    expect(b.fixed).toBe(a.fixed);
  });
  it('invariante tela x estresse em várias combinações', () => {
    for (const relists of [0, 1, 2, 5]) for (const relistStep of [0, 10]) for (const relistBase of ['price', 'diff']) {
      const c = run({ relists, relistStep, relistBase });
      expect(stressProfit(craftStressInput(c, true), {}) * c.units).toBeCloseTo(c.best.profit, 6);
    }
  });
});
