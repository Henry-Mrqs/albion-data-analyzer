// IDEIA-039: efeito do "não retorna" por ingrediente no custo de material (dossiê §4).
import { beforeEach, describe, expect, it } from 'vitest';
import { recipeOf } from './catalog';
import { computeCraft } from './craftPlan';
import { loadFixtureCatalog, mkPrices } from '../test/helpers';

beforeEach(loadFixtureCatalog);

const craftCfg = (over = {}) => ({
  craftCity: 'Lymhurst', specialty: null, focus: false, feePer100: 400, customRRR: '',
  matCity: 'best', useOrders: false, crafts: 1,
  refine: {}, refineFocus: false, refineFee: 400, refineCity: 'auto', refineDaily: {},
  ...over,
});

const run = (id, spec, over = {}) =>
  computeCraft({
    rec: recipeOf(id), targetMid: id, prices: mkPrices(spec),
    cfg: craftCfg({ specialty: true, ...over }), premium: true, bonusCity: null,
  });

describe('IDEIA-039: custo com não-retorno por ingrediente', () => {
  it('dossiê §4: escudo de artefato (RRR 24,8120%)', () => {
    const c = run('T4_OFF_SHIELD_HELL', { T4_PLANKS: 100, T4_METALBAR: 200, T4_ARTEFACT_OFF_SHIELD_HELL: 5000 }, { refine: { PLANKS: 'buy', METALBAR: 'buy' } });
    expect(c.lines.map((l) => l.qty)).toEqual([expect.closeTo(3.0075, 4), expect.closeTo(3.0075, 4), 1]);
    expect(c.matCost).toBeCloseTo(5902.2556, 3); // 1200 * 0,751880 = 902,26 + 5000
  });
  it('dossiê §4: armadura Royal, base 3000 e token 500: nada retorna', () => {
    const c = run('T4_ARMOR_PLATE_ROYAL', { T4_ARMOR_PLATE_SET1: 3000, QUESTITEM_TOKEN_ROYAL_T4: 500 });
    expect(c.matCost).toBeCloseTo(5000, 4); // antes: (3000+2000)*0,751880 = 3759,40 (24,8% a menos)
    expect(c.lines.every((l) => l.qty === l.count)).toBe(true);
  });
  it('fragmento NÃO retorna (união conservadora): 50 T4_RUNE a 10 = 500, igual a antes', () => {
    expect(run('T4_ARTEFACT_2H_COMBATSTAFF_MORGANA', { T4_RUNE: 10 }).matCost).toBeCloseTo(500, 4);
    // o dossiê M6 daria 375,94 (500 x 0,751880); NÃO adotado até haver medição em jogo
  });
});
