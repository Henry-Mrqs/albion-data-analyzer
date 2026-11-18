// Testa o catalog.json real (gerado de ao-bin-dumps), sem rede e sem fixture. Casos do dossiê IDEIA-038 §4.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const cat = JSON.parse(fs.readFileSync(new URL('../../public/data/catalog.json', import.meta.url), 'utf8'));
const byId = Object.fromEntries(cat.items.map((i) => [i.i, i]));

// Tabela canônica do dossiê §2 (oráculo independente do build).
const DOSSIE_TABELA = {};
for (const [cidade, cats] of Object.entries({
  Martlock: ['axe', 'quarterstaff', 'froststaff', 'plate_shoes', 'offhand'],
  Thetford: ['mace', 'naturestaff', 'firestaff', 'leather_armor', 'cloth_helmet'],
  'Fort Sterling': ['hammer', 'spear', 'holystaff', 'plate_helmet', 'cloth_armor'],
  Lymhurst: ['sword', 'bow', 'arcanestaff', 'leather_helmet', 'leather_shoes'],
  Bridgewatch: ['crossbow', 'dagger', 'cursestaff', 'plate_armor', 'cloth_shoes'],
  Caerleon: ['gatherergear', 'tools', 'food', 'knuckles', 'shapeshifterstaff'],
  Brecilien: ['cape', 'bag', 'potion'],
})) for (const c of cats) DOSSIE_TABELA[c] = cidade;

const CASES = [ // [id, c esperado, cc esperado, cidade esperada] (casos 1 a 16 do dossiê)
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

describe('catalog.json real: cc e cityOf', () => {
  it.each(CASES)('%s', (id, c, cc, city) => {
    const it = byId[id];
    expect(it.c).toBe(c);
    expect(it.cc).toBe(cc);
    expect(cat.cityOf[it.cc] ?? null).toBe(city);
  });

  it('caso 17 (exceção C4): T4_2H_IRONGAUNTLETS_HELL não está no catálogo; a categoria dagger vai para Bridgewatch', () => {
    expect(byId.T4_2H_IRONGAUNTLETS_HELL).toBeUndefined();
    expect(cat.cityOf.dagger).toBe('Bridgewatch');
  });

  it('cityOf é a cópia fiel do XML (33 entradas, tabela do dossiê)', () => {
    expect(cat.cityOf).toEqual(DOSSIE_TABELA);
    expect(Object.keys(cat.cityOf)).toHaveLength(33);
  });

  it('contagens', () => {
    expect(cat.items).toHaveLength(2292);
    expect(cat.items.filter((i) => i.r)).toHaveLength(2166);
    expect(cat.items.filter((i) => i.cc)).toHaveLength(1286);
    expect(cat.items.filter((i) => /_ROYAL$/.test(i.i) && i.cc)).toHaveLength(0);
  });

  it('cc ausente em ROYAL, capas de cidade/facção e artefatos', () => {
    const royal = cat.items.filter((i) => /_ROYAL$/.test(i.i));
    expect(royal).toHaveLength(45);
    for (const i of royal) expect(i.cc).toBeUndefined();
    const capasCidade = cat.items.filter((i) => /^capes\/accessoires_capes_(?!capes$)/.test(i.c));
    expect(capasCidade.length).toBeGreaterThan(0);
    for (const i of capasCidade) expect(i.cc).toBeUndefined();
    for (const i of cat.items.filter((i) => i.c.startsWith('artefacts/'))) expect(i.cc).toBeUndefined();
  });

  it('src fixa o SHA do dump', () => {
    expect(cat.src).toBe('0483dd97f1581dfaf02eed42f25f5ea2a3cb75e5');
    expect(cat.built).toBe('2026-11-02');
  });
});

const RAW = cat.items.filter((i) => i.c === 'crafting/resources');
const VINTE = ['WOOD', 'ROCK', 'ORE', 'HIDE', 'FIBER'].flatMap((t) => [5, 6, 7, 8].map((n) => `T${n}_${t}`));

describe('catalog.json real: transmutação (IDEIA-057)', () => {
  it('nenhum recurso bruto é craftável', () => {
    expect(RAW.filter((i) => i.r || i.er || i.a || i.f)).toEqual([]);
  });
  it('os 20 recursos de transmutação saíram de craftáveis mas continuam no catálogo', () => {
    for (const id of VINTE) {
      expect(byId[id]).toBeDefined();
      expect(byId[id].r).toBeUndefined();
      expect(byId[id].tm[0]).toHaveLength(1);
    }
    expect(cat.items.filter((i) => i.r)).toHaveLength(2166);
    expect(cat.items).toHaveLength(2292);
  });
  it('tm preserva a prata do dump', () => {
    expect(byId.T5_ORE.tm[0]).toEqual([['T4_ORE', 781]]);
    expect(byId.T8_ORE.tm[0]).toEqual([['T7_ORE', 5000]]);
    expect(byId.T6_WOOD.tm[0]).toEqual([['T5_WOOD', 1250]]);
    expect(byId.T4_ORE.tm[1]).toEqual([['T4_ORE', 1500]]);
    expect(byId.T4_WOOD.tm[2]).toEqual([['T4_WOOD_LEVEL1', 3000]]);
    expect(byId.T5_ORE.tm[1]).toEqual([['T4_ORE_LEVEL1', 1563], ['T5_ORE', 2000]]);
  });
  it('pedra tem tabela de prata própria', () => {
    expect(byId.T5_ROCK.tm[0]).toEqual([['T4_ROCK', 1180]]);
    expect(byId.T4_ROCK.tm[1]).toEqual([['T4_ROCK', 1800]]);
  });
  it('25 recursos têm tm', () => expect(RAW.filter((i) => i.tm)).toHaveLength(25));
  it('refinados intactos: 35 com receita de refino', () => {
    const ref = cat.items.filter((i) => i.c === 'crafting/refinedresources');
    expect(ref).toHaveLength(35);
    expect(ref.every((i) => i.r)).toBe(true);
    expect(byId.T4_PLANKS.r).toEqual([['T4_WOOD', 2], ['T3_PLANKS', 1]]);
  });
  it('encanto dos refinados continua em er', () => {
    expect(byId.T4_PLANKS.er[1]).toEqual([['T4_WOOD_LEVEL1', 2], ['T3_PLANKS', 1]]);
  });
});
