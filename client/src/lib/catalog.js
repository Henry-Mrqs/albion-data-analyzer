// Catálogo oficial (gerado por scripts/build-catalog.mjs): itens, receitas, nomes em PT-BR.
import { useEffect, useState } from 'react';

let promise = null;
let data = null;
const byId = new Map();

export function loadCatalog() {
  if (!promise) {
    promise = fetch(`${import.meta.env.BASE_URL}data/catalog.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Catálogo indisponível (HTTP ${r.status})`);
        return r.json();
      })
      .then((d) => {
        data = d;
        for (const it of d.items) {
          it._s = `${it.p} ${it.e} ${it.i}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
          byId.set(it.i, it);
        }
        return d;
      })
      .catch((e) => {
        promise = null;
        throw e;
      });
  }
  return promise;
}

export function useCatalog() {
  const [state, setState] = useState({ ready: !!data, error: null });
  useEffect(() => {
    if (data) return;
    let alive = true;
    loadCatalog()
      .then(() => alive && setState({ ready: true, error: null }))
      .catch((e) => alive && setState({ ready: false, error: e.message }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

export const getItem = (id) => byId.get(id);
export const allItems = () => data?.items ?? [];

// ---------- IDs ----------
// id de mercado (AODP): "T4_MAIN_AXE@1", "T4_PLANKS_LEVEL1@1"
export const marketId = (uniq, ench = 0) => {
  const m = uniq.match(/_LEVEL(\d)$/);
  if (m) return `${uniq}@${m[1]}`;
  if (ench > 0 && /^T\d_(PLANKS|METALBAR|LEATHER|CLOTH|WOOD|ORE|HIDE|FIBER)$/.test(uniq)) return `${uniq}_LEVEL${ench}@${ench}`;
  return ench > 0 ? `${uniq}@${ench}` : uniq;
};

export const parseMarketId = (id) => {
  const [base, e] = id.split('@');
  return { base: base.replace(/_LEVEL\d$/, ''), ench: e ? +e : 0 };
};

export const RAW_TYPES = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'ROCK'];
export const REFINED_TYPES = ['PLANKS', 'METALBAR', 'LEATHER', 'CLOTH', 'STONEBLOCK'];
export const REFINING = {
  PLANKS: { raw: 'WOOD', city: 'Fort Sterling', label: 'Tábua', rawLabel: 'Madeira' },
  METALBAR: { raw: 'ORE', city: 'Thetford', label: 'Barra de Metal', rawLabel: 'Minério' },
  LEATHER: { raw: 'HIDE', city: 'Martlock', label: 'Couro', rawLabel: 'Couro Bruto' },
  CLOTH: { raw: 'FIBER', city: 'Lymhurst', label: 'Tecido', rawLabel: 'Fibra' },
  STONEBLOCK: { raw: 'ROCK', city: 'Bridgewatch', label: 'Bloco de Pedra', rawLabel: 'Pedra' },
};

export const refinedTypeOf = (uniq) => {
  const m = uniq.match(/^T\d_(PLANKS|METALBAR|LEATHER|CLOTH|STONEBLOCK)(?:_LEVEL\d)?$/);
  return m ? m[1] : null;
};

export const ENCHANT_LABEL = ['', '.1', '.2', '.3', '.4'];

// ---------- nomes ----------
export function nameOf(id) {
  if (!data) return id;
  const { base, ench } = parseMarketId(id);
  const key = ench ? `${base}@${ench}` : base;
  const it = byId.get(base);
  if (ench && data.encNames[key]) return data.encNames[key];
  const baseName = it?.p ?? data.extra[base]?.[0] ?? base;
  return ench ? `${baseName} .${ench}` : baseName;
}

export const tierOf = (id) => +(id.match(/^T(\d)/)?.[1] ?? 0);

export function weightOf(id) {
  const { base } = parseMarketId(id);
  return byId.get(base)?.w ?? data?.extra[base]?.[2] ?? 0;
}

// ---------- receitas ----------
const RULE_RE = /^T\d_(PLANKS|METALBAR|LEATHER|CLOTH|STONEBLOCK|WOOD|ORE|HIDE|FIBER|ROCK)$/;

/** Receita do item (id base) em um encantamento. Retorna {amount, focus, res:[{uniq, mid, count, name, value, returnable}]} */
export function recipeOf(baseId, ench = 0) {
  const it = byId.get(baseId);
  if (!it?.r) return null;
  let res = it.r;
  if (ench > 0) res = it.er?.[ench] ?? res.map(([id, c]) => [RULE_RE.test(id) ? `${id}_LEVEL${ench}` : id, c]);
  return {
    amount: it.a || 1,
    focus: it.f || 0,
    res: res.map(([uniq, count]) => {
      const mid = marketId(uniq);
      return {
        uniq,
        mid,
        count,
        name: nameOf(mid),
        value: ingredientValue(uniq),
        // recursos básicos, refinados, ervas, etc. retornam; artefatos não
        returnable: !/ARTEFACT|ARTIFACT|RUNE|SOUL|RELIC|SHARD/.test(uniq),
      };
    }),
  };
}

// valor de item (base da taxa de estação)
export function ingredientValue(uniq) {
  const v = data?.vals?.[uniq];
  if (v) return v;
  const m = uniq.match(/^(.*)_LEVEL(\d)$/);
  if (m && data?.vals?.[m[1]]) return data.vals[m[1]] * 2 ** +m[2];
  return 0;
}

export const recipeValue = (rec) => rec.res.reduce((s, r) => s + r.value * r.count, 0);

// ---------- categorias ----------
export const CATEGORIES = {
  'weapons/sword': 'Espada', 'weapons/axe': 'Machado', 'weapons/mace': 'Maça', 'weapons/hammer': 'Martelo',
  'weapons/spear': 'Lança', 'weapons/dagger': 'Adaga', 'weapons/bow': 'Arco', 'weapons/crossbow': 'Besta',
  'weapons/quarterstaff': 'Cajado Bilaminado', 'weapons/knuckles': 'Luvas de Guerra',
  'weapons/firestaff': 'Cajado de Fogo', 'weapons/froststaff': 'Cajado de Gelo', 'weapons/holystaff': 'Cajado Sagrado',
  'weapons/naturestaff': 'Cajado da Natureza', 'weapons/arcanestaff': 'Cajado Arcano', 'weapons/cursestaff': 'Cajado Amaldiçoado',
  'armors/plate_armor': 'Armadura de Placa', 'armors/leather_armor': 'Armadura de Couro', 'armors/cloth_armor': 'Armadura de Tecido',
  'head/plate_helmet': 'Elmo de Placa', 'head/leather_helmet': 'Capuz de Couro', 'head/cloth_helmet': 'Capuz de Tecido',
  'shoes/plate_shoes': 'Botas de Placa', 'shoes/leather_shoes': 'Botas de Couro', 'shoes/cloth_shoes': 'Botas de Tecido',
  'offhands/shieldtype': 'Escudo', 'offhands/booktype': 'Livro', 'offhands/torchtype': 'Tocha',
  'bags/bags': 'Bolsa', 'bags/satchels': 'Sacola', 'capes/accessoires_capes_capes': 'Capa',
  'consumables/potions': 'Poção', 'consumables/food': 'Comida',
  'crafting/resources': 'Recurso Bruto', 'crafting/refinedresources': 'Recurso Refinado',
};

export const categoryLabel = (c) => {
  if (CATEGORIES[c]) return CATEGORIES[c];
  if (c.startsWith('artefacts/')) return `Artefato · ${{ weapons: 'Arma', offhands: 'Secundária', head: 'Elmo', armors: 'Armadura', shoes: 'Botas', capes: 'Capa', favor: 'Favor' }[c.split('/')[1]] ?? ''}`;
  if (c.startsWith('capes/')) return 'Capa de Cidade';
  return c;
};

// Cidade com bônus de craft (+15% de produção) por tipo de item
const CRAFT_CITY = {
  Martlock: ['axe', 'quarterstaff', 'froststaff', 'plate_shoes', 'shieldtype'],
  Thetford: ['mace', 'naturestaff', 'firestaff', 'leather_armor', 'cloth_shoes'],
  'Fort Sterling': ['hammer', 'spear', 'holystaff', 'plate_helmet', 'cloth_armor'],
  Lymhurst: ['sword', 'bow', 'arcanestaff', 'leather_helmet', 'cloth_helmet', 'booktype'],
  Bridgewatch: ['crossbow', 'dagger', 'cursestaff', 'plate_armor', 'leather_shoes', 'torchtype'],
  Caerleon: ['knuckles', 'bags', 'satchels', 'potions', 'food', 'accessoires_capes_capes'],
};
export function craftBonusCity(category) {
  const sub = category.split('/')[1];
  for (const [city, subs] of Object.entries(CRAFT_CITY)) if (subs.includes(sub)) return city;
  return null;
}

// ---------- busca ----------
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function searchItems(query, { onlyCraftable = false, limit = 30 } = {}) {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const out = [];
  // "t6", "t6.2", "6.2" → filtro de tier / encantamento
  let tier = 0;
  const rest = terms.filter((t) => {
    const m = t.match(/^t?([3-8])(?:\.([0-4]))?$/);
    if (m) {
      tier = +m[1];
      return false;
    }
    return true;
  });
  for (const it of allItems()) {
    if (onlyCraftable && !it.r) continue;
    if (tier && it.t !== tier) continue;
    if (rest.every((t) => it._s.includes(t))) {
      out.push(it);
      if (out.length >= limit) break;
    }
  }
  return out;
}
