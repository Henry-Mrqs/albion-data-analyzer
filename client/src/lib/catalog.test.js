import { beforeEach, describe, expect, it } from 'vitest';
import {
  CRAFT_CITIES, allItems, cityOfCategory, craftBonusCity, craftCategoryLabel, focusOf, getItem, ingredientValue, marketId, nameOf,
  recipeOf, recipeValue, recipeVariants, refinedTypeOf, resetCatalog, searchItems, setCatalog, tierOf, weightOf,
} from './catalog';
import { refineChainIds } from './econ';
import { loadFixtureCatalog } from '../test/helpers';

beforeEach(loadFixtureCatalog);

// casos 1 a 16 do dossiê IDEIA-038 §4: [id, c, cc, cidade de bônus]
const CASES_1_A_16 = [
  ['T4_MAIN_SWORD', 'weapons/sword', 'sword', 'Lymhurst'],
  ['T4_ARMOR_CLOTH_SET1', 'armors/cloth_armor', 'cloth_armor', 'Fort Sterling'],
  ['T4_HEAD_CLOTH_SET1', 'head/cloth_helmet', 'cloth_helmet', 'Thetford'],
  ['T4_SHOES_LEATHER_SET1', 'shoes/leather_shoes', 'leather_shoes', 'Lymhurst'],
  ['T4_SHOES_CLOTH_SET1', 'shoes/cloth_shoes', 'cloth_shoes', 'Bridgewatch'],
  ['T4_OFF_BOOK', 'offhands/booktype', 'offhand', 'Martlock'],
  ['T4_OFF_TORCH', 'offhands/torchtype', 'offhand', 'Martlock'],
  ['T4_OFF_SHIELD', 'offhands/shieldtype', 'offhand', 'Martlock'],
  ['T4_BAG', 'bags/bags', 'bag', 'Brecilien'],
  ['T4_BAG_INSIGHT', 'bags/satchels', 'bag', 'Brecilien'],
  ['T4_CAPE', 'capes/accessoires_capes_capes', 'cape', 'Brecilien'],
  ['T4_POTION_HEAL', 'consumables/potions', 'potion', 'Brecilien'],
  ['T4_MEAL_SALAD', 'consumables/food', 'food', 'Caerleon'],
  ['T4_2H_KNUCKLES_SET1', 'weapons/knuckles', 'knuckles', 'Caerleon'],
  ['T4_CAPEITEM_FW_LYMHURST', 'capes/accessoires_capes_lymhurst', undefined, null],
  ['T4_ARMOR_PLATE_ROYAL', 'armors/plate_armor', undefined, null],
];

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
  it('nameOf', () => {
    expect(nameOf('T4_PLANKS')).toBe('Tábuas de Pinho');
    expect(nameOf('T4_WOOD_LEVEL1@1')).toBe('Troncos de Pinho Incomuns');
  });
  it.each(CASES_1_A_16)('craftBonusCity(%s)', (id, _c, _cc, city) => {
    expect(craftBonusCity(getItem(id))).toBe(city);
  });
  it('craftBonusCity: arco = Lymhurst; recurso refinado e item sem cc ou indefinido = null', () => {
    expect(craftBonusCity(getItem('T4_2H_BOW'))).toBe('Lymhurst');
    expect(craftBonusCity(getItem('T4_PLANKS'))).toBeNull();
    expect(craftBonusCity({})).toBeNull();
    expect(craftBonusCity(undefined)).toBeNull();
  });
  it('ROYAL não herda bônus pela categoria de loja', () => {
    expect(getItem('T4_ARMOR_PLATE_ROYAL').c).toBe('armors/plate_armor');
    expect(craftBonusCity(getItem('T4_ARMOR_PLATE_ROYAL'))).toBeNull();
  });
  it('cityOfCategory: dagger = Bridgewatch (exceção C4); categoria desconhecida ou ausente = null', () => {
    expect(cityOfCategory('dagger')).toBe('Bridgewatch');
    expect(cityOfCategory('offhand')).toBe('Martlock');
    expect(cityOfCategory('inexistente')).toBeNull();
    expect(cityOfCategory(undefined)).toBeNull();
  });
  it('CRAFT_CITIES inclui Brecilien e as 6 cidades de CITIES', () => {
    expect(CRAFT_CITIES).toEqual(['Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Caerleon', 'Brecilien']);
  });
  it('craftCategoryLabel: rótulo em português por craftingcategory', () => {
    expect(craftCategoryLabel('offhand')).toMatch(/secundária/i);
    expect(craftCategoryLabel('sword')).toBe('Espada');
    expect(craftCategoryLabel(undefined)).toMatch(/sem categoria/i);
  });
  it('catálogo sem cityOf não quebra', () => {
    resetCatalog();
    setCatalog({ items: [], extra: {}, vals: {}, encNames: {} });
    expect(cityOfCategory('sword')).toBeNull();
  });
  it('resetCatalog esvazia', () => {
    resetCatalog();
    expect(getItem('T4_PLANKS')).toBeUndefined();
    expect(nameOf('T4_PLANKS')).toBe('T4_PLANKS');
  });
});

describe('IDEIA-057: transmutação não é receita de craft', () => {
  it('recurso bruto não é craftável: recipeOf e searchItems(onlyCraftable)', () => {
    expect(recipeOf('T5_WOOD')).toBeNull();
    expect(recipeOf('T5_WOOD', 1)).toBeNull();
    expect(searchItems('t5_wood').map((i) => i.i)).toEqual(['T5_WOOD']); // Mercado continua achando
    expect(searchItems('t5_wood', { onlyCraftable: true })).toEqual([]); // Craft não oferece
  });
  it('nome e peso do bruto seguem funcionando', () => {
    expect(nameOf('T5_WOOD')).not.toBe('T5_WOOD');
    expect(weightOf('T5_WOOD')).toBeGreaterThan(0);
  });
  it('Refino inalterado: cadeia T4_PLANKS usa só receitas de refino', () => {
    expect(recipeOf('T4_PLANKS').res.map((r) => r.uniq)).toEqual(['T4_WOOD', 'T3_PLANKS']);
    expect(refineChainIds('T4_PLANKS', true)).toEqual(['T4_PLANKS', 'T4_WOOD', 'T3_PLANKS', 'T3_WOOD', 'T2_PLANKS', 'T2_WOOD']);
  });
});

describe('IDEIA-039: não retorna por ingrediente (dump OU fragmento)', () => {
  const ret = (id, ench = 0) => recipeOf(id, ench).res.map((x) => [x.uniq, x.returnable]);
  it('Royal: base e token não retornam', () => expect(ret('T4_ARMOR_PLATE_ROYAL')).toEqual([['T4_ARMOR_PLATE_SET1', false], ['QUESTITEM_TOKEN_ROYAL_T4', false]]));
  it('escudo de artefato: tábua e barra retornam, artefato não', () => expect(ret('T4_OFF_SHIELD_HELL')).toEqual([['T4_PLANKS', true], ['T4_METALBAR', true], ['T4_ARTEFACT_OFF_SHIELD_HELL', false]]));
  it('satchel: tela e couro retornam, livro não', () => expect(ret('T4_BAG_INSIGHT')).toEqual([['T4_CLOTH', true], ['T4_LEATHER', true], ['T4_SKILLBOOK_STANDARD', false]]));
  it('capa de facção: os três não retornam', () => expect(ret('T4_CAPEITEM_FW_BRIDGEWATCH').every(([, r]) => r === false)).toBe(true));
  it('fragmento continua NÃO retornando e fica marcado não verificado (união conservadora)', () => {
    const res = recipeOf('T4_ARTEFACT_2H_COMBATSTAFF_MORGANA').res;
    expect(res.map((x) => [x.uniq, x.returnable, x.unverified])).toEqual([['T4_RUNE', false, true]]);
  });
  it('só o token barra: unverified é falso quando o dump já marca ou nada barra', () => {
    expect(recipeOf('T4_ARMOR_PLATE_ROYAL').res.every((x) => x.unverified === false)).toBe(true);
    expect(recipeOf('T4_OFF_SHIELD_HELL').res.every((x) => x.unverified === false)).toBe(true);
  });
  it('regressão: returnable nunca passa de false para true em relação ao regex antigo', () => {
    const antigo = (id) => !/ARTEFACT|ARTIFACT|RUNE|SOUL|RELIC|SHARD/.test(id);
    for (const id of ['T4_ARMOR_PLATE_ROYAL', 'T4_OFF_SHIELD_HELL', 'T4_BAG_INSIGHT', 'T4_CAPEITEM_FW_BRIDGEWATCH', 'T4_ARTEFACT_2H_COMBATSTAFF_MORGANA', 'T4_2H_ARCANESTAFF_HELL'])
      for (const x of recipeOf(id).res) if (!antigo(x.uniq)) expect(x.returnable).toBe(false);
  });
  it('encanto .1 herda o flag (receita sem er, regra de recursos)', () => expect(ret('T4_2H_ARCANESTAFF_HELL', 1).at(-1)).toEqual(['T4_ARTEFACT_2H_ARCANESTAFF_HELL', false]));
  it('catálogo antigo (pares de 2 elementos) continua legível: tudo retorna', () => {
    resetCatalog();
    setCatalog({ built: 'x', src: 'x', cityOf: {}, items: [{ i: 'T4_X', p: 'X', e: 'X', c: 'weapons/sword', t: 4, w: 1, v: 1, x: 0, a: 1, f: 0, r: [['T4_Y', 1]] }], extra: {}, vals: {}, encNames: {} });
    expect(recipeOf('T4_X').res.map((x) => x.returnable)).toEqual([true]);
  });
});

describe('IDEIA-049: recipeOf com variante e recipeVariants', () => {
  const ret = (id, ench = 0, v = 0) => recipeOf(id, ench, v).res.map((x) => [x.uniq, x.returnable]);
  it('variante 0 é igual à receita de sempre (para todos os itens e níveis da fixture)', () => {
    for (const it of allItems()) for (let n = 0; n <= it.x; n++) if (it.r) expect(recipeOf(it.i, n, 0)).toEqual(recipeOf(it.i, n));
  });
  it('arcanestaff: variante 1 troca o artefato pela ficha; o resto idêntico', () => {
    expect(ret('T4_2H_ARCANESTAFF_HELL', 0, 0)).toEqual([['T4_PLANKS', true], ['T4_METALBAR', true], ['T4_ARTEFACT_2H_ARCANESTAFF_HELL', false]]);
    expect(ret('T4_2H_ARCANESTAFF_HELL', 0, 1)).toEqual([['T4_PLANKS', true], ['T4_METALBAR', true], ['T4_ARTEFACT_TOKEN_FAVOR_2', false]]);
  });
  it('39 não regride: ficha de favor e SET2/SET3 e o token Royal NÃO retornam', () => {
    expect(ret('T4_ARMOR_PLATE_ROYAL', 0, 1)).toEqual([['T4_ARMOR_PLATE_SET2', false], ['QUESTITEM_TOKEN_ROYAL_T4', false]]);
    expect(ret('T4_ARMOR_PLATE_ROYAL', 0, 2)[0]).toEqual(['T4_ARMOR_PLATE_SET3', false]);
  });
  it('encanto .1: a variante troca só o ingrediente especial; planks e barras ficam _LEVEL1', () => {
    const r = recipeOf('T4_2H_ARCANESTAFF_HELL', 1, 1).res.map((x) => x.uniq);
    expect(r).toEqual(['T4_PLANKS_LEVEL1', 'T4_METALBAR_LEVEL1', 'T4_ARTEFACT_TOKEN_FAVOR_2']);
  });
  it('recipeVariants: 2 (arcanestaff), 3 (Royal), 1 (espada), 0 (sem receita)', () => {
    expect(recipeVariants('T4_2H_ARCANESTAFF_HELL')).toHaveLength(2);
    expect(recipeVariants('T4_ARMOR_PLATE_ROYAL')).toHaveLength(3);
    expect(recipeVariants('T4_MAIN_SWORD')).toHaveLength(1);
    expect(recipeVariants('T4_WOOD')).toEqual([]);
  });
  it('recipeVariants: swapped é o ingrediente original de cada variante', () => {
    expect(recipeVariants('T4_2H_ARCANESTAFF_HELL').map((v) => [v.variant, v.swapped])).toEqual([[0, 'T4_ARTEFACT_2H_ARCANESTAFF_HELL'], [1, 'T4_ARTEFACT_TOKEN_FAVOR_2']]);
    expect(recipeVariants('T4_ARMOR_PLATE_ROYAL').map((v) => v.swapped)).toEqual(['T4_ARMOR_PLATE_SET1', 'T4_ARMOR_PLATE_SET2', 'T4_ARMOR_PLATE_SET3']);
  });
  it.each([[1.5], [-1], [-0.5], [2], [99], [NaN], [Infinity], ['1'], ['x'], [null], [undefined], [{}], [[]], [true]])(
    'variante inválida %s (valor salvo no navegador): cai na variante 0, sem lançar',
    (v) => {
      expect(() => recipeOf('T4_2H_ARCANESTAFF_HELL', 0, v)).not.toThrow();
      expect(recipeOf('T4_2H_ARCANESTAFF_HELL', 0, v)).toEqual(recipeOf('T4_2H_ARCANESTAFF_HELL', 0, 0));
      expect(recipeOf('T4_MAIN_SWORD', 0, v)).toEqual(recipeOf('T4_MAIN_SWORD'));
    },
  );
  it('item que perdeu variantes: o índice salvo cai na variante 0', () => {
    expect(recipeOf('T4_MAIN_SWORD', 0, 1)).toEqual(recipeOf('T4_MAIN_SWORD', 0, 0));
    expect(recipeOf('T4_ARMOR_PLATE_ROYAL', 0, 3)).toEqual(recipeOf('T4_ARMOR_PLATE_ROYAL', 0, 0));
  });
  it('variante válida continua valendo (0, 1 e 2 do Royal)', () => {
    expect(recipeOf('T4_ARMOR_PLATE_ROYAL', 0, 2).res[0].uniq).toBe('T4_ARMOR_PLATE_SET3');
  });
  it('rec.variants conta as receitas', () => {
    expect(recipeOf('T4_ARMOR_PLATE_ROYAL').variants).toBe(3);
    expect(recipeOf('T4_MAIN_SWORD').variants).toBe(1);
  });
  it('38 não regride: a cidade de bônus é do item, não da receita', () => {
    expect(craftBonusCity(getItem('T4_ARMOR_PLATE_ROYAL'))).toBeNull();
    expect(craftBonusCity(getItem('T4_2H_ARCANESTAFF_HELL'))).toBe(cityOfCategory('arcanestaff'));
    expect(craftBonusCity(getItem('T4_2H_ARCANESTAFF_HELL'))).toBe('Lymhurst');
  });
  it('ingredientValue dos novos ids: ficha 896 e artefato 384 (taxa usa o valor do dump)', () => {
    expect(ingredientValue('T4_ARTEFACT_TOKEN_FAVOR_2')).toBe(896);
    expect(ingredientValue('T4_ARTEFACT_2H_ARCANESTAFF_HELL')).toBe(384);
  });
  it('DT-009: ingrediente *_SHARD* sem flag continua NÃO retornando (regra conservadora) e não verificado', () => {
    const res = recipeOf('T6_ARTEFACT_MAIN_SWORD_CRYSTAL').res;
    expect(res.map((x) => [x.uniq, x.returnable, x.unverified])).toEqual([['T6_SHARD_CRYSTAL', false, true]]);
  });
});

describe('IDEIA-002: focusOf', () => {
  it('nível 0 usa f; nível n usa ef[n]; sem dado = null', () => {
    expect(focusOf('T4_MAIN_SWORD', 0)).toBe(1286);
    expect(focusOf('T4_MAIN_SWORD', 3)).toBe(6893);
    expect(focusOf('T4_PLANKS', 1)).toBe(94);
    expect(focusOf('T4_ARMOR_PLATE_ROYAL', 2)).toBeNull();
    expect(focusOf('T9_NADA')).toBeNull();
  });
  it('catálogo antigo sem ef (cache velho): ench > 0 devolve null, não 0; nível 0 segue valendo', () => {
    resetCatalog();
    setCatalog({ built: 'x', src: 'x', cityOf: {}, items: [{ i: 'T4_X', p: 'X', e: 'X', c: 'weapons/sword', t: 4, w: 1, v: 1, x: 0, a: 1, f: 100, r: [['T4_Y', 1]] }], extra: {}, vals: {}, encNames: {} });
    expect(focusOf('T4_X', 1)).toBeNull();
    expect(focusOf('T4_X', 0)).toBe(100);
  });
  it('item com f 0 no nível 0 = null (sem dado), não 0', () => expect(focusOf('T4_ARMOR_PLATE_ROYAL', 0)).toBeNull());
});

describe('IDEIA-072: foco por encanto no catálogo real (item com receita alternativa por ficha)', () => {
  it('focusOf("T4_OFF_TOWERSHIELD_UNDEAD", 2) = 1313 e nível 0 = 429 (o ef não muda com a variante)', async () => {
    const { readFileSync } = await import('node:fs');
    const real = JSON.parse(readFileSync(new URL('../../public/data/catalog.json', import.meta.url)));
    setCatalog(structuredClone(real));
    expect(focusOf('T4_OFF_TOWERSHIELD_UNDEAD', 2)).toBe(1313);
    expect(focusOf('T4_OFF_TOWERSHIELD_UNDEAD', 0)).toBe(429);
    expect(focusOf('T4_OFF_TOWERSHIELD_UNDEAD', 4)).toBe(4021);
  });
});
