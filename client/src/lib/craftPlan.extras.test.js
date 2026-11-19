// IDEIA-048: despesas extras e saída sem imposto no cálculo do Craft (dossiê §4: espada, bancada 216, custo 3.524,27).
import { beforeEach, describe, expect, it } from 'vitest';
import { recipeOf } from './catalog';
import { computeCraft, waitSavings } from './craftPlan';
import { loadFixtureCatalog, mkPrices } from '../test/helpers';

beforeEach(loadFixtureCatalog);

const BUY = { METALBAR: 'buy', LEATHER: 'buy' };
const baseCfg = (over = {}) => ({
  craftCity: 'Lymhurst', specialty: true, focus: false, feePer100: 500, customRRR: '',
  matCity: 'best', useOrders: false, crafts: 1,
  refine: BUY, refineFocus: false, refineFee: 400, refineCity: 'auto', refineDaily: {},
  ...over,
});
const prices = (sword = { Caerleon: { s: 4500 } }) => mkPrices({ T4_METALBAR: 200, T4_LEATHER: 150, T4_MAIN_SWORD: sword });
const run = (o = {}, p = prices()) => computeCraft({ rec: recipeOf('T4_MAIN_SWORD'), targetMid: 'T4_MAIN_SWORD', prices: p, cfg: baseCfg(o), premium: true, bonusCity: null });
const L = [{ name: 'Transporte', value: 150, scope: 'craft' }, { name: 'Comida de buff', value: 80, scope: 'craft' }];

describe('computeCraft com despesas extras (048)', () => {
  it('sem despesas e sem marca: números de antes (custo 3.524,27; lucro 683,23)', () => {
    const c = run();
    expect(c.totalCost).toBeCloseTo(3524.27, 2);
    expect(c.best.profit).toBeCloseTo(683.23, 2);
    expect(c.extras).toBe(0);
    expect(c.extrasList).toEqual([]);
  });
  it('dossiê §4: 150 + 80 = 230 por craft → custo 3.754,27 e lucro no mercado 453,23 (antes 683,23)', () => {
    const c = run({ extras: L });
    expect(c.extras).toBe(230);
    expect(c.totalCost).toBeCloseTo(3754.27, 2);
    expect(c.best.profit).toBeCloseTo(453.23, 2);
    expect(c.extrasList).toHaveLength(2);
  });
  it('dossiê §4: venda por contrato sem imposto → líquido 4.500 e lucro 745,73', () => {
    const c = run({ extras: L, noTax: { 'Caerleon|order': true } });
    expect(c.options[0].net).toBeCloseTo(4500, 2);
    expect(c.best.profit).toBeCloseTo(745.73, 2);
    expect(c.options[0].noTax).toBe(true);
  });
  it('dossiê §4: 10 crafts com 230 por lote → 23 por craft; custo 3.547,27 por unidade; lucro 660,23 por unidade', () => {
    const c = run({ crafts: 10, extras: [{ name: 'Lote', value: 230, scope: 'lote' }] });
    expect(c.units).toBe(10);
    expect(c.unitCost).toBeCloseTo(3547.27, 2);
    expect(c.best.profit / c.units).toBeCloseTo(660.23, 2);
    expect(c.best.profit).toBeCloseTo(6602.29, 2);
  });
  it('as mesmas despesas por craft em 10 crafts = 2.300', () => expect(run({ crafts: 10, extras: L }).extras).toBe(2300));
  it('despesas não mudam RRR, foco, taxa de bancada nem material', () => {
    const a = run();
    const b = run({ extras: L });
    expect(b.rates.craftRRR).toBe(a.rates.craftRRR);
    expect(b.fee).toBe(a.fee);
    expect(b.matCost).toBe(a.matCost);
    expect(b.lines.map((l) => l.qty)).toEqual(a.lines.map((l) => l.qty));
  });
  it('sem imposto remove também a taxa de criação de 2,5% da ordem de venda (com imposto: 4.207,50)', () => {
    expect(run().best.net).toBeCloseTo(4207.5, 2);
    expect(run({ noTax: { 'Caerleon|order': true } }).best.net).toBeCloseTo(4500, 2);
  });
  it('marcar uma linha não muda as outras (instantânea no Mercado Negro e ordem em Caerleon)', () => {
    const p = prices({ Caerleon: { s: 4500 }, 'Black Market': { b: 4000 } });
    const sem = run({}, p);
    const com = run({ noTax: { 'Caerleon|order': true } }, p);
    const bm = (c) => c.options.find((o) => o.city === 'Black Market');
    const ca = (c) => c.options.find((o) => o.city === 'Caerleon');
    expect(bm(com).net).toBeCloseTo(bm(sem).net, 6);
    expect(bm(com).noTax).toBe(false);
    expect(ca(com).net).toBeCloseTo(4500, 6);
    expect(ca(sem).noTax).toBe(false);
  });
  it('a chave leva o modo: marcar order não marca instant da mesma cidade', () => {
    const p = prices({ Caerleon: { s: 4500, b: 4000 } });
    const c = run({ noTax: { 'Caerleon|order': true } }, p);
    const inst = c.options.find((o) => o.city === 'Caerleon' && o.mode === 'instant');
    expect(inst.noTax).toBe(false);
    expect(inst.net).toBeCloseTo(4000 * 0.96, 6);
  });
  it('a saída sem imposto pode virar a melhor (ordenação por lucro)', () => {
    const p = prices({ Caerleon: { s: 4300 }, Lymhurst: { s: 4400 } });
    expect(run({}, p).best.city).toBe('Lymhurst');
    expect(run({ noTax: { 'Caerleon|order': true } }, p).best.city).toBe('Caerleon');
  });
  it('entrada inválida: despesa negativa vira 0 com aviso; chave noTax desconhecida é ignorada', () => {
    const c = run({ extras: [{ value: -50, scope: 'craft' }], noTax: { 'Lugar|order': true } });
    expect(c.extras).toBe(0);
    expect(c.issues.some((i) => i.field.startsWith('extras'))).toBe(true);
    expect(c.options.every((o) => o.noTax === false)).toBe(true);
  });
  it('unitCost inclui as despesas; waitSavings não muda com despesas (a despesa cancela)', () => {
    const a = run();
    const b = run({ extras: L });
    expect(b.unitCost - a.unitCost).toBeCloseTo(230, 6);
    const args = { rec: recipeOf('T4_MAIN_SWORD'), targetMid: 'T4_MAIN_SWORD', prices: prices(), premium: true, bonusCity: null };
    const w0 = waitSavings({ ...args, cfg: baseCfg() });
    const w1 = waitSavings({ ...args, cfg: baseCfg({ extras: L }) });
    expect(w1.rows[1].lot).toBeCloseTo(w0.rows[1].lot, 6);
    expect(w1.base - w0.base).toBeCloseTo(230, 6);
  });
  it('estado salvo antigo (sem extras/noTax) funciona como antes', () => {
    const cfg = baseCfg();
    delete cfg.extras;
    delete cfg.noTax;
    const c = computeCraft({ rec: recipeOf('T4_MAIN_SWORD'), targetMid: 'T4_MAIN_SWORD', prices: prices(), cfg, premium: true, bonusCity: null });
    expect(c.totalCost).toBeCloseTo(3524.27, 2);
  });
});

describe('computeCraft: margem inclui as despesas (D5, mutante 13, 076)', () => {
  it('230 de despesas: margem 12,07% (lucro 453,23 ÷ custo 3.754,27); sem despesas 19,39% (683,23 ÷ 3.524,27)', () => {
    expect(run({ extras: L }).best.margin).toBeCloseTo(12.07, 2);
    expect(run().best.margin).toBeCloseTo(19.39, 2);
  });
});

