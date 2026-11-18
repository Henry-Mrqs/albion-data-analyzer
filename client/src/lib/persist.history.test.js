import { describe, expect, it } from 'vitest';
import { loadPersisted, serializePersisted } from './persist';
import { getPersistedSpec } from './persistSchemas';
import { CURRENT_DEFAULTS, SAVED_STATES } from '../test/savedStates';

// Oráculo: os formatos que cada versão REALMENTE salvou (git), em src/test/savedStates.js.
const loadRaw = (key, raw) => loadPersisted(raw, { defaults: CURRENT_DEFAULTS[key], key, ...getPersistedSpec(key) });
const load = (s) => loadRaw(s.key, JSON.stringify(s.saved));
const pick = (key, commit, noteHas) => SAVED_STATES.find((s) => s.key === key && s.commit.startsWith(commit) && (!noteHas || s.note.includes(noteHas)));
const rrrCat = (note) => load(SAVED_STATES.find((s) => s.key === 'rrr:cfg' && s.note.includes(note))).value.category;

const kindOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);

describe('todos os formatos do git carregam sem quebrar', () => {
  it.each(SAVED_STATES.map((s, i) => [`${s.key} @ ${s.commit} (${s.note})`, i]))('%s', (_, i) => {
    const s = SAVED_STATES[i];
    const { value, issues } = load(s);
    expect(issues.filter((x) => ['invalid-json', 'not-object', 'migration-failed'].includes(x.code))).toEqual([]);
    expect(value).not.toHaveProperty('deep');
    expect(value).not.toHaveProperty('_v');
    const defs = CURRENT_DEFAULTS[s.key];
    if (defs !== null && typeof defs === 'object' && !Array.isArray(defs)) {
      for (const f of Object.keys(defs)) {
        expect(value, `campo ${f}`).toHaveProperty(f);
        // tipo certo: igual ao padrão, exceto numéricos que a tela grava como texto, specialty (null|bool) e item (null|objeto)
        const a = kindOf(value[f]);
        const b = kindOf(defs[f]);
        const ok = a === b || (['number', 'string'].includes(a) && ['number', 'string'].includes(b)) || (f === 'specialty' && ['null', 'boolean'].includes(a)) || (f === 'item' && ['null', 'object'].includes(a));
        expect(ok, `campo ${f}: ${a} vs ${b}`).toBe(true);
      }
    } else {
      expect(kindOf(value)).toBe(kindOf(defs));
    }
  });

  it('estado ATUAL e completo carrega como identidade (e continua idêntico depois de gravar com _v)', () => {
    const atuais = SAVED_STATES.filter((s) => s.current);
    expect(atuais.length).toBeGreaterThanOrEqual(8);
    for (const s of atuais) {
      const v = load(s).value;
      expect(v, `${s.key} @ ${s.commit}`).toEqual(s.saved);
      expect(loadRaw(s.key, serializePersisted(v, getPersistedSpec(s.key).version)).value).toEqual(s.saved);
    }
  });
});

describe('migrações com os formatos do git', () => {
  it('craft:cfg de 8bf3014 (deep:true, refine {METALBAR:"refine"}): refine vira "all", deep some, ganha refineCity "auto" e refineDaily {}', () => {
    const { value, fromVersion } = load(pick('craft:cfg', '8bf3014', 'deep:true'));
    expect(fromVersion).toBe(0);
    expect(value.refine).toEqual({ METALBAR: 'all', LEATHER: 'buy' });
    expect(value).not.toHaveProperty('deep');
    expect(value.refineCity).toBe('auto');
    expect(value.refineDaily).toEqual({});
    expect(value.feePer100).toBe('250'); // sem coerção
    expect(value.crafts).toBe('5');
  });

  it('craft:cfg de 9e1e4a2: refine "refine" → "all"; best e all ficam; ganha refineCity "auto"', () => {
    const { value } = load(pick('craft:cfg', '9e1e4a2'));
    expect(value.refine).toEqual({ PLANKS: 'all', CLOTH: 'all', METALBAR: 'best' });
    expect(value.refineCity).toBe('auto');
  });

  it('craft:cfg: modo de refino fora de buy|all|best é removido do mapa (o resto fica)', () => {
    const { value } = loadRaw('craft:cfg', JSON.stringify({ refine: { PLANKS: 'x', LEATHER: 'buy', CLOTH: 3, METALBAR: null } }));
    expect(value.refine).toEqual({ LEATHER: 'buy' });
  });

  it('refine:cfg de 8bf3014 com deep:true: route "all" (e NÃO "best"), deep some, qty continua "250"', () => {
    const { value } = load(pick('refine:cfg', '8bf3014', 'deep:true'));
    expect(value.route).toBe('all');
    expect(value).not.toHaveProperty('deep');
    expect(value.qty).toBe('250');
  });

  it('refine:cfg de 8bf3014 com deep:false: route ausente → padrão "best"', () => {
    const { value } = load(pick('refine:cfg', '8bf3014', 'deep:false'));
    expect(value.route).toBe('best');
    expect(value).not.toHaveProperty('deep');
  });

  it('refine:cfg com route E deep: a route vale (como o código faz: cfg.route ?? ...)', () => {
    expect(loadRaw('refine:cfg', JSON.stringify({ route: 'buy', deep: true })).value.route).toBe('buy');
  });

  it('rrr:cfg de 451f0fa: weapons/axe → axe; armors/plate_armor → plate_armor; offhands/booktype → offhand; bags/satchels → bag; capes → cape; potions → potion; desconhecido → "sword"', () => {
    expect(rrrCat('weapons/axe')).toBe('axe');
    expect(rrrCat('armors/plate_armor')).toBe('plate_armor');
    expect(rrrCat('offhands/booktype')).toBe('offhand');
    expect(rrrCat('bags/satchels')).toBe('bag');
    expect(rrrCat('capes/accessoires_capes_capes')).toBe('cape');
    expect(rrrCat('consumables/potions')).toBe('potion');
    expect(rrrCat('crafting/resources')).toBe('sword');
  });

  it('rrr:cfg: head/shoes/food, categoria de craft e vazia ficam como devem', () => {
    const cat = (c) => loadRaw('rrr:cfg', JSON.stringify({ category: c })).value.category;
    expect(cat('head/cloth_helmet')).toBe('cloth_helmet');
    expect(cat('shoes/leather_shoes')).toBe('leather_shoes');
    expect(cat('consumables/food')).toBe('food');
    expect(cat('weapons/zzz')).toBe('sword');
    expect(cat('bow')).toBe('bow'); // já é categoria de craft
    expect(cat('')).toBe(''); // "sem categoria" é um valor válido da tela
    expect(cat('xyz')).toBe('sword');
    expect(loadRaw('rrr:cfg', JSON.stringify({ category: 5 })).value.category).toBe('sword');
  });

  it('rrr:cfg de 451f0fa preserva item, foco, diário e crafts em texto', () => {
    const { value } = load(pick('rrr:cfg', '451f0fa', 'armors/plate_armor'));
    expect(value).toMatchObject({ kind: 'refine', city: 'Fort Sterling', resource: 'METALBAR', focus: false, daily: 20, item: { id: 'T5_MAIN_AXE', ench: 1 }, crafts: '50' });
  });
});

describe('campos de set preservados e validados', () => {
  it('craft:cfg com feePer100 "250" e SEM feeSet (019): preservado; nenhum feeSet injetado', () => {
    const { value } = load(pick('craft:cfg', 'ae61c3e'));
    expect(value.feePer100).toBe('250');
    expect(value).not.toHaveProperty('feeSet');
    expect(value).not.toHaveProperty('refineFeeSet');
  });

  it('craft:cfg com feeSet, refineFeeSet, waitCost, craftDaily preservados (campos que nunca estão nos padrões)', () => {
    const { value } = load(pick('craft:cfg', 'f4915f5'));
    expect(value).toMatchObject({ feeSet: true, refineFeeSet: true, craftDaily: 20, craftDailyAt: 1763400000000, waitCost: '5000', recipeVariant: '1' });
  });

  it('craft:cfg com craftDaily 20 e craftDailyAt "abc": craftDailyAt removido; craftDaily 20 preservado', () => {
    const { value } = loadRaw('craft:cfg', JSON.stringify({ craftDaily: 20, craftDailyAt: 'abc' }));
    expect(value).not.toHaveProperty('craftDailyAt');
    expect(value.craftDaily).toBe(20);
  });

  it('recipeVariant: "auto", "0", 1 e "2" passam; "1.5", -1, "x", true, null saem (voltam ao automático)', () => {
    for (const ok of ['auto', '0', 1, '2']) expect(loadRaw('craft:cfg', JSON.stringify({ recipeVariant: ok })).value.recipeVariant).toBe(ok);
    for (const bad of ['1.5', -1, 'x', true, null]) expect(loadRaw('craft:cfg', JSON.stringify({ recipeVariant: bad })).value).not.toHaveProperty('recipeVariant');
  });

  it('settings de 8bf3014 ({server,premium}): ganha feeCeiling 1000; server "marte" → "west"; premium "false" → true (padrão); feeCeiling null/0/-5/"abc" passa INTACTO (a 060 avisa)', () => {
    const old = load(pick('settings', '8bf3014')).value;
    expect(old).toEqual({ server: 'europe', premium: false, feeCeiling: 1000 });
    const s = (o) => loadRaw('settings', JSON.stringify(o)).value;
    expect(s({ server: 'marte' }).server).toBe('west');
    expect(s({ premium: 'false' }).premium).toBe(true);
    for (const v of [null, 0, -5, 'abc']) expect(s({ feeCeiling: v }).feeCeiling).toBe(v);
  });

  it('flip:cfg com groups ["weapons","zzz"]: zzz sai; tiers "6" (texto) → padrão; buyCities nulo → padrão', () => {
    const { value } = loadRaw('flip:cfg', JSON.stringify({ groups: ['weapons', 'zzz'], tiers: '6', buyCities: null }));
    expect(value.groups).toEqual(['weapons']);
    expect(value.tiers).toEqual([6, 7, 8]);
    expect(value.buyCities).toEqual(CURRENT_DEFAULTS['flip:cfg'].buyCities);
  });

  it('flip:cfg: lista vazia salva continua vazia; elementos de tipo errado e cidade desconhecida saem', () => {
    const { value } = loadRaw('flip:cfg', JSON.stringify({ groups: [], tiers: [6, '7', 99, null], sellCities: ['Caerleon', 'Marte', 3], enchs: [] }));
    expect(value.groups).toEqual([]);
    expect(value.tiers).toEqual([6]);
    expect(value.sellCities).toEqual(['Caerleon']);
    expect(value.enchs).toEqual([]);
  });

  it('refine:cfg com type "FOO" → "PLANKS"; tier 99 → 4; route "x" → ausente → "best"', () => {
    const { value } = loadRaw('refine:cfg', JSON.stringify({ type: 'FOO', tier: 99, route: 'x' }));
    expect(value).toMatchObject({ type: 'PLANKS', tier: 4, route: 'best' });
  });

  it('craft:item/market:item com id número ou ausente: id → "T6_MAIN_SWORD"; ench texto → 0', () => {
    for (const key of ['craft:item', 'market:item']) {
      expect(loadRaw(key, JSON.stringify({ id: 5, ench: '2' })).value).toEqual({ id: 'T6_MAIN_SWORD', ench: 0 });
      expect(loadRaw(key, JSON.stringify({ ench: 3 })).value).toEqual({ id: 'T6_MAIN_SWORD', ench: 3 });
      expect(loadRaw(key, JSON.stringify({ id: 'T4_BAG' })).value).toEqual({ id: 'T4_BAG', ench: 0 });
    }
  });

  it('craft:cfg.refine nulo ou lista → {} (não derruba cfg.refine[...])', () => {
    for (const bad of [null, [], 'x']) expect(loadRaw('craft:cfg', JSON.stringify({ refine: bad })).value.refine).toEqual({});
  });

  it('rrr:cfg.item: objeto sem id texto → null; item válido fica', () => {
    expect(loadRaw('rrr:cfg', JSON.stringify({ item: { id: 7 } })).value.item).toBeNull();
    expect(loadRaw('rrr:cfg', JSON.stringify({ item: 'x' })).value.item).toBeNull();
    expect(loadRaw('rrr:cfg', JSON.stringify({ item: { id: 'T4_BAG', ench: 1 } })).value.item).toEqual({ id: 'T4_BAG', ench: 1 });
  });

  it('market:quality: 2 → 2; "x" e 9 → 1', () => {
    expect(loadRaw('market:quality', '2').value).toBe(2);
    expect(loadRaw('market:quality', '"x"').value).toBe(1);
    expect(loadRaw('market:quality', '9').value).toBe(1);
  });

  it('target:cfg: goal/mode inválidos voltam ao padrão; profit em texto fica', () => {
    const { value } = loadRaw('target:cfg', JSON.stringify({ goal: 'x', mode: 5, profit: '1500', relists: null }));
    expect(value).toMatchObject({ goal: 'profit', mode: 'order', profit: '1500', relists: 0 });
  });
});

describe('corrupção em TODAS as chaves: nunca lança; sempre devolve o padrão daquele campo', () => {
  const keys = Object.keys(CURRENT_DEFAULTS);
  it.each(keys)('%s com null, [], texto, número, {} e JSON quebrado', (key) => {
    for (const raw of ['null', '[]', '"x"', '123', '{}', '{', '', 'true']) {
      const { value } = loadRaw(key, raw);
      expect(value, `${key} <- ${raw}`).toEqual(CURRENT_DEFAULTS[key]);
    }
  });
  it.each(keys.filter((k) => typeof CURRENT_DEFAULTS[k] === 'object'))('%s com cada campo trocado por null: volta ao padrão só do campo', (key) => {
    const defs = CURRENT_DEFAULTS[key];
    for (const f of Object.keys(defs)) {
      const { value } = loadRaw(key, JSON.stringify({ ...defs, [f]: null }));
      const nullable = (key === 'craft:cfg' && f === 'specialty') || (key === 'rrr:cfg' && f === 'item') || (key === 'settings' && f === 'feeCeiling');
      if (nullable) continue; // null é válido (specialty, item) ou passthrough (feeCeiling) nesses campos
      expect(value[f], `${key}.${f}`).toEqual(defs[f]);
    }
  });
});
