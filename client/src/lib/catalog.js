// Catálogo oficial (gerado por scripts/build-catalog.mjs): itens, receitas, nomes em PT-BR.
import { useEffect, useState } from 'react';
import { fetchCatalog } from './catalogLoad';

let promise = null;
let data = null;
const byId = new Map();

export function setCatalog(d) {
  data = d;
  for (const it of d.items) {
    it._s = `${it.p} ${it.e} ${it.i}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    byId.set(it.i, it);
  }
}

export function resetCatalog() {
  data = null;
  byId.clear();
  promise = null;
}

export function loadCatalog() {
  if (!promise) {
    promise = fetchCatalog({ fetchFn: fetch, base: import.meta.env.BASE_URL, id: import.meta.env.VITE_CATALOG_V })
      .then((d) => {
        setCatalog(d);
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
// Token mantido por prudência (decisão do Gerente, D-017): errar para "retorna" subestimaria o custo.
const FRAGMENT_RE = /RUNE|SOUL|RELIC|SHARD/;
const RULE_RE = /^T\d_(PLANKS|METALBAR|LEATHER|CLOTH|STONEBLOCK|WOOD|ORE|HIDE|FIBER|ROCK)$/;

// ingrediente [uniq, count, nr?] -> linha da receita (mesma regra para a base e para as variantes)
const toRes = ([uniq, count, nr]) => {
  const mid = marketId(uniq);
  return {
    uniq,
    mid,
    count,
    name: nameOf(mid),
    value: ingredientValue(uniq),
    // não retorna se o dump marca (nr = maxreturnamount 0) OU se for fragmento (RUNE/SOUL/RELIC/SHARD).
    returnable: !nr && !FRAGMENT_RE.test(uniq),
    // barrado só pelo token: o dump não confirma; assumimos que não retorna até medir em jogo.
    unverified: !nr && FRAGMENT_RE.test(uniq),
  };
};

// ingredientes (pares do catálogo) da receita do item no encanto, sem variante
function baseEntries(it, ench) {
  if (ench <= 0) return it.r;
  return it.er?.[ench] ?? it.r.map(([id, c, nr]) => { const n = RULE_RE.test(id) ? `${id}_LEVEL${ench}` : id; return nr ? [n, c, nr] : [n, c]; });
}

/**
 * Receita do item (id base) em um encantamento. Retorna {amount, focus, variants, res:[{uniq, mid, count, name, value, returnable}]}.
 * variant 0 = receita de sempre; k>0 troca o ingrediente `alt.at` por `alt.v[k-1]` (IDEIA-049); variante inválida => variante 0.
 */
export function recipeOf(baseId, ench = 0, variant = 0) {
  const it = byId.get(baseId);
  if (!it?.r) return null;
  const nVar = 1 + (it.alt?.v.length ?? 0);
  // o índice vem do navegador (estado salvo): qualquer valor inválido ou fora de faixa cai na receita de sempre
  if (!Number.isInteger(variant) || variant < 0 || variant >= nVar) variant = 0;
  let entries = baseEntries(it, ench);
  if (variant > 0) entries = entries.map((e, k) => (k === it.alt.at ? it.alt.v[variant - 1] : e));
  return { amount: it.a || 1, focus: it.f || 0, variants: nVar, res: entries.map(toRes) };
}

/**
 * IDEIA-002: foco base (pontos por craft, sem especialização) do item no encanto; null = sem dado.
 * ench 0: it.f (0 = o dump não traz foco); ench > 0: it.ef[ench] (catálogo antigo sem ef => null, nunca 0).
 */
export function focusOf(baseId, ench = 0) {
  const it = byId.get(baseId);
  if (!it) return null;
  const f = ench > 0 ? it.ef?.[ench] : it.f;
  return f > 0 ? f : null;
}

/** Todas as receitas do item no encanto: [{ variant, rec, swapped }]; swapped = ingrediente da variante 0 que a variante troca. */
export function recipeVariants(baseId, ench = 0) {
  const it = byId.get(baseId);
  if (!it?.r) return [];
  const out = [];
  for (let v = 0; v < 1 + (it.alt?.v.length ?? 0); v++) {
    const rec = recipeOf(baseId, ench, v);
    out.push({ variant: v, rec, swapped: it.alt ? rec.res[it.alt.at].uniq : null });
  }
  return out;
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

// Cidades onde se pode craftar (lista de nomes; o bônus vem de data.cityOf, lido do craftingmodifiers.xml)
export const CRAFT_CITIES = ['Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Caerleon', 'Brecilien'];

/** Cidade com +15% de produção para uma craftingcategory do jogo (item.cc); null se não houver. */
export const cityOfCategory = (cc) => (cc && data?.cityOf?.[cc]) || null;

/** Cidade de bônus de craft do item, pela craftingcategory dele (item sem cc, como *_ROYAL, não tem). */
export const craftBonusCity = (item) => cityOfCategory(item?.cc);

// Rótulos (apenas nomes) das craftingcategory do jogo
const CRAFT_CATEGORY_LABELS = {
  sword: 'Espada', bow: 'Arco', arcanestaff: 'Cajado Arcano', axe: 'Machado', quarterstaff: 'Cajado Bilaminado',
  froststaff: 'Cajado de Gelo', mace: 'Maça', naturestaff: 'Cajado da Natureza', firestaff: 'Cajado de Fogo',
  hammer: 'Martelo', spear: 'Lança', holystaff: 'Cajado Sagrado', crossbow: 'Besta', dagger: 'Adaga',
  cursestaff: 'Cajado Amaldiçoado', knuckles: 'Luvas de Guerra', shapeshifterstaff: 'Cajado Metamorfo',
  plate_armor: 'Armadura de Placa', leather_armor: 'Armadura de Couro', cloth_armor: 'Armadura de Tecido',
  plate_helmet: 'Elmo de Placa', leather_helmet: 'Capuz de Couro', cloth_helmet: 'Capuz de Tecido',
  plate_shoes: 'Botas de Placa', leather_shoes: 'Botas de Couro', cloth_shoes: 'Botas de Tecido',
  offhand: 'Mão secundária (escudo, livro, tocha)', cape: 'Capa', bag: 'Bolsa', potion: 'Poção', food: 'Comida',
  gatherergear: 'Equipamento de coleta', tools: 'Ferramentas',
};
export const NO_CRAFT_CATEGORY_LABEL = 'Sem categoria de craft (Royal, capa de cidade, artefato)';
export const craftCategoryLabel = (cc) => (cc ? CRAFT_CATEGORY_LABELS[cc] ?? cc : NO_CRAFT_CATEGORY_LABEL);
/** craftingcategory conhecidas (para seletores), na ordem do rótulo. */
export const craftCategories = () => Object.keys(CRAFT_CATEGORY_LABELS);

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
