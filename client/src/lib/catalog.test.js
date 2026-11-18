import { beforeEach, describe, expect, it } from 'vitest';
import {
  craftBonusCity, getItem, ingredientValue, marketId, nameOf, recipeOf, recipeValue,
  refinedTypeOf, resetCatalog, tierOf,
} from './catalog';
import { loadFixtureCatalog } from '../test/helpers';

beforeEach(loadFixtureCatalog);

describe('catalog.js', () => {
  it('marketId', () => {
    expect(marketId('T4_PLANKS', 1)).toBe('T4_PLANKS_LEVEL1@1');
    expect(marketId('T4_PLANKS_LEVEL1')).toBe('T4_PLANKS_LEVEL1@1');
    expect(marketId('T4_2H_BOW', 2)).toBe('T4_2H_BOW@2');
    expect(marketId('T4_2H_BOW')).toBe('T4_2H_BOW');
  });
  it('refinedTypeOf / tierOf', () => {
    expect(refinedTypeOf('T4_PLANKS_LEVEL2')).toBe('PLANKS');
    expect(refinedTypeOf('T4_WOOD')).toBeNull();
    expect(tierOf('T6_METALBAR')).toBe(6);
    // splitUniq vem de econ.js; testado na Task 3
  });
  it('recipeOf T4_PLANKS .0', () => {
    const r = recipeOf('T4_PLANKS', 0);
    expect(r.amount).toBe(1);
    expect(r.focus).toBe(54);
    expect(r.res.map((x) => [x.uniq, x.mid, x.count, x.value, x.returnable])).toEqual([
      ['T4_WOOD', 'T4_WOOD', 2, 4, true],
      ['T3_PLANKS', 'T3_PLANKS', 1, 8, true],
    ]);
    expect(recipeValue(r)).toBe(16);
  });
  it('recipeOf T4_PLANKS .1 usa er[1]', () => {
    const r = recipeOf('T4_PLANKS', 1);
    expect(r.res[0].uniq).toBe('T4_WOOD_LEVEL1');
    expect(r.res[0].mid).toBe('T4_WOOD_LEVEL1@1');
    expect(r.res[0].value).toBe(12);
    expect(r.res[1].uniq).toBe('T3_PLANKS');
  });
  it('recipeOf espada T6 .1 sem er: aplica RULE_RE só em recursos', () => {
    const r = recipeOf('T6_MAIN_SWORD', 1);
    expect(r.res.map((x) => x.uniq)).toEqual(['T6_METALBAR_LEVEL1', 'T6_LEATHER_LEVEL1']);
  });
  it('artefato não retorna e tem valor 5760', () => {
    const a = recipeOf('T6_MAIN_SWORD_CRYSTAL', 0).res.at(-1);
    expect(a).toMatchObject({ uniq: 'T6_ARTEFACT_MAIN_SWORD_CRYSTAL', count: 1, value: 5760, returnable: false });
    expect(recipeValue(recipeOf('T6_MAIN_SWORD_CRYSTAL', 0))).toBe(7296); // 16*64 + 8*64 + 5760
  });
  it('ingredientValue: LEVEL sem entrada dobra por nível', () => {
    expect(ingredientValue('T3_PLANKS_LEVEL1')).toBe(16); // 8 * 2^1
    expect(ingredientValue('T4_PLANKS_LEVEL1')).toBe(32); // entrada direta em vals
    expect(ingredientValue('T9_NADA')).toBe(0);
  });
  it('recipeOf sem receita', () => {
    expect(recipeOf('T4_WOOD', 0)).toBeNull();
    expect(recipeOf('XXX')).toBeNull();
  });
  it('nameOf / craftBonusCity', () => {
    expect(nameOf('T4_PLANKS')).toBe('Tábuas de Pinho');
    expect(nameOf('T4_WOOD_LEVEL1@1')).toBe('Troncos de Pinho Incomuns');
    expect(craftBonusCity('weapons/bow')).toBe('Lymhurst');
    expect(craftBonusCity('armors/plate_armor')).toBe('Bridgewatch');
    expect(craftBonusCity('crafting/refinedresources')).toBeNull();
  });
  it('resetCatalog esvazia', () => {
    resetCatalog();
    expect(getItem('T4_PLANKS')).toBeUndefined();
    expect(nameOf('T4_PLANKS')).toBe('T4_PLANKS');
  });
});
