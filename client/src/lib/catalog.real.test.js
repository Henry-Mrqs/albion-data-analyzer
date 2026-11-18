// Testa o catalog.json real (gerado de ao-bin-dumps), sem rede e sem fixture. Casos do dossiê IDEIA-038 §4.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ingredientValue, resetCatalog, setCatalog } from './catalog';
import { validateCatalog } from './catalogLoad';

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

describe('catalog.json real: vals novos da 057', () => {
  it('ingredientValue de T8_ROCK_LEVEL1/2 é igual ao fallback vals[T8_ROCK] * 2^n', () => {
    // Conta à mão: vals.T8_ROCK = 25,6 -> LEVEL1 = 25,6 x 2 = 51,2; LEVEL2 = 25,6 x 4 = 102,4.
    // Os dois ids entram em vals só por serem entradas de transmutação em tm (ninguém os usa em r/er).
    expect(cat.vals.T8_ROCK).toBe(25.6);
    expect(cat.vals.T8_ROCK_LEVEL1).toBe(51.2);
    expect(cat.vals.T8_ROCK_LEVEL2).toBe(102.4);
    const semNovos = { ...cat.vals };
    delete semNovos.T8_ROCK_LEVEL1;
    delete semNovos.T8_ROCK_LEVEL2;
    resetCatalog();
    setCatalog(structuredClone({ ...cat, vals: semNovos })); // sem as chaves novas: cai no fallback
    const fallback = [ingredientValue('T8_ROCK_LEVEL1'), ingredientValue('T8_ROCK_LEVEL2')];
    resetCatalog();
    setCatalog(structuredClone(cat));
    expect([ingredientValue('T8_ROCK_LEVEL1'), ingredientValue('T8_ROCK_LEVEL2')]).toEqual(fallback);
    expect(fallback).toEqual([51.2, 102.4]);
    resetCatalog();
  });
});

describe('catalog.json real: não retorna por ingrediente (IDEIA-039)', () => {
  const nrIds = (id) => byId[id].r.filter((x) => x[2] === 1).map((x) => x[0]);
  it.each([
    ['T4_2H_ARCANESTAFF_HELL', ['T4_ARTEFACT_2H_ARCANESTAFF_HELL']],
    ['T4_OFF_SHIELD_HELL', ['T4_ARTEFACT_OFF_SHIELD_HELL']],
    ['T6_2H_DUALSCIMITAR_UNDEAD', ['T6_ARTEFACT_2H_DUALSCIMITAR_UNDEAD']],
    ['T4_ARMOR_PLATE_ROYAL', ['T4_ARMOR_PLATE_SET1', 'QUESTITEM_TOKEN_ROYAL_T4']],
    ['T4_HEAD_PLATE_ROYAL', ['T4_HEAD_PLATE_SET1', 'QUESTITEM_TOKEN_ROYAL_T4']],
    ['T4_CAPEITEM_FW_BRIDGEWATCH', ['T4_CAPE', 'T4_CAPEITEM_FW_BRIDGEWATCH_BP', 'T1_FACTION_STEPPE_TOKEN_1']],
    ['T4_BAG_INSIGHT', ['T4_SKILLBOOK_STANDARD']],
  ])('não retorna: %s', (id, esperado) => expect(nrIds(id)).toEqual(esperado));
  it.each(['T4_MAIN_SWORD', 'T4_BAG', 'T4_CAPE', 'T4_POTION_HEAL'])('retorna tudo: %s', (id) => expect(nrIds(id)).toEqual([]));
  it('contagem de ingredientes marcados', () => {
    const n = cat.items.filter((i) => i.c !== 'crafting/resources').flatMap((i) => i.r ?? []).filter((x) => x[2] === 1).length;
    expect(n).toBe(1053);
  });
  it('todo ingrediente com ARTEFACT/ARTIFACT no id tem o flag (dossiê M2)', () => {
    const pares = cat.items.flatMap((i) => [...(i.r ?? []), ...Object.values(i.er ?? {}).flat()]);
    expect(pares.filter((x) => /ARTEFACT|ARTIFACT/.test(x[0]) && x[2] !== 1)).toEqual([]);
  });
  it('só os fragmentos RUNE/SOUL/RELIC/SHARD aparecem sem flag entre os que o regex antigo barrava (M6)', () => {
    const semFlag = new Set(cat.items.flatMap((i) => i.r ?? []).filter((x) => x[2] !== 1 && /ARTEFACT|ARTIFACT|RUNE|SOUL|RELIC|SHARD/.test(x[0])).map((x) => x[0]));
    expect(semFlag.size).toBe(30);
    expect([...semFlag].every((id) => /RUNE|SOUL|RELIC|SHARD/.test(id))).toBe(true);
  });
  it('o grupo dos 765 itens de Artefato existe e tem fragmento sem flag', () => {
    const grupo = cat.items.filter((i) => (i.r ?? []).some((x) => x[2] !== 1 && /RUNE|SOUL|RELIC|SHARD/.test(x[0])));
    expect(grupo).toHaveLength(765);
    expect(grupo.every((i) => i.c.startsWith('artefacts/'))).toBe(true);
  });
  it('encanto herda o flag: T4_2H_ARCANESTAFF_HELL .1', () => {
    const lvl = byId.T4_2H_ARCANESTAFF_HELL.er?.[1] ?? byId.T4_2H_ARCANESTAFF_HELL.r;
    expect(lvl.filter((x) => x[2] === 1).map((x) => x[0])).toEqual(['T4_ARTEFACT_2H_ARCANESTAFF_HELL']);
  });
});

describe('catalog.json real: receitas alternativas (IDEIA-049)', () => {
  const withAlt = cat.items.filter((i) => i.alt);
  it('contagem do parser (dossiê §4): arcanestaff 2 receitas, Royal 3, espada 1', () => {
    expect(1 + byId.T4_2H_ARCANESTAFF_HELL.alt.v.length).toBe(2);
    expect(1 + byId.T4_ARMOR_PLATE_ROYAL.alt.v.length).toBe(3);
    expect(byId.T4_MAIN_SWORD.alt).toBeUndefined();
  });
  it('formato: arcanestaff at 2 com a ficha 2; Royal at 0 com SET2 e SET3', () => {
    expect(byId.T4_2H_ARCANESTAFF_HELL.alt).toEqual({ at: 2, v: [['T4_ARTEFACT_TOKEN_FAVOR_2', 1, 1]] });
    expect(byId.T4_ARMOR_PLATE_ROYAL.alt).toEqual({ at: 0, v: [['T4_ARMOR_PLATE_SET2', 1, 1], ['T4_ARMOR_PLATE_SET3', 1, 1]] });
  });
  it('605 itens com alt: 560 de artefato/ficha e 45 Royal', () => {
    expect(withAlt).toHaveLength(605);
    expect(withAlt.filter((i) => /_ROYAL$/.test(i.i))).toHaveLength(45);
    expect(withAlt.filter((i) => i.alt.v.length === 1)).toHaveLength(560);
  });
  it('invariante: a alternativa só troca o ingrediente em alt.at (mesma quantidade e mesmo flag)', () => {
    for (const i of withAlt) for (const v of i.alt.v) {
      expect(v[1]).toBe(i.r[i.alt.at][1]);
      expect(v[2] ?? 0).toBe(i.r[i.alt.at][2] ?? 0);
      expect(v[0]).not.toBe(i.r[i.alt.at][0]);
    }
  });
  it('refinados NÃO têm alt (ficha de facção fica de fora)', () => {
    expect(byId.T4_PLANKS.alt).toBeUndefined();
    expect(cat.items.filter((i) => i.c === 'crafting/refinedresources' && i.alt)).toEqual([]);
  });
  it('r, er, f, cc, tm intocados: T4_2H_ARCANESTAFF_HELL.r continua com o artefato na 3ª posição', () => {
    expect(byId.T4_2H_ARCANESTAFF_HELL.r).toEqual([['T4_PLANKS', 20], ['T4_METALBAR', 12], ['T4_ARTEFACT_2H_ARCANESTAFF_HELL', 1, 1]]);
  });
  it('vals ganhou os ingredientes alternativos: ficha 896; 110 ids novos', () => {
    expect(cat.vals.T4_ARTEFACT_TOKEN_FAVOR_2).toBe(896);
    expect(Object.keys(cat.vals).filter((k) => /TOKEN_FAVOR|SET[23]$/.test(k))).toHaveLength(110);
  });
  it('o catálogo novo é válido (067)', () => expect(validateCatalog(cat)).toEqual({ ok: true, problems: [] }));
});

describe('catalog.json real: foco por encanto (IDEIA-002)', () => {
  it('ef do dump: espada T4 .1 a .4 = 2.251, 3.939, 6.893, 12.064 (dossiê F2)', () => expect(byId.T4_MAIN_SWORD.ef).toEqual({ 1: 2251, 2: 3939, 3: 6893, 4: 12064 }));
  it('prancha T4: f 54; ef .1 = 94 (dossiê F2) e .2 = 164 (dump)', () => {
    expect(byId.T4_PLANKS.f).toBe(54);
    expect(byId.T4_PLANKS.ef).toMatchObject({ 1: 94, 2: 164 });
  });
  it('poção T4: f 210 por craft de 5 unidades; ef 277, 411, 811 (dump, 3 níveis)', () => {
    expect(byId.T4_POTION_HEAL).toMatchObject({ f: 210, a: 5 });
    expect(byId.T4_POTION_HEAL.ef).toEqual({ 1: 277, 2: 411, 3: 811 });
  });
  it('armadura Royal não tem foco no dump: f 0 e sem ef', () => {
    expect(byId.T4_ARMOR_PLATE_ROYAL.f).toBe(0);
    expect(byId.T4_ARMOR_PLATE_ROYAL.ef).toBeUndefined();
  });
  it('contagens: 1.240 itens com ef, 4.869 entradas; 1.285 itens com f > 0', () => {
    const w = cat.items.filter((i) => i.ef);
    expect(w).toHaveLength(1240);
    expect(w.reduce((s, i) => s + Object.keys(i.ef).length, 0)).toBe(4869);
    expect(cat.items.filter((i) => i.f > 0)).toHaveLength(1285);
  });
  it('todo ef é objeto de níveis 1 a 4 com foco positivo', () => {
    for (const i of cat.items.filter((x) => x.ef)) for (const [n, f] of Object.entries(i.ef)) {
      expect([1, 2, 3, 4]).toContain(+n);
      expect(f).toBeGreaterThan(0);
    }
  });
  it('o catálogo novo continua válido (067)', () => expect(validateCatalog(cat)).toEqual({ ok: true, problems: [] }));
});
