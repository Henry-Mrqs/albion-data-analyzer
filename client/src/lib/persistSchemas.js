// Registro por chave do estado salvo (IDEIA-070): versão, migrações 0→1 e esquema de tipos.
// NÃO importa o app (catalog.js/market.js/settings.js): evita ciclo com settings.js. As listas abaixo são
// cópias; persistSchemas.test.js garante que continuam iguais às do app.
//
// REGRA: toda ideia que acrescente campo a uma cfg acrescenta a entrada aqui NO MESMO commit
// (o teste de contrato reprova campo gravado por set({...}) sem esquema).

const CITIES = ['Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Caerleon'];
const SELL_CITIES = [...CITIES, 'Black Market'];
const CRAFT_CITIES = [...CITIES, 'Brecilien'];
const REFINE_TYPES = ['PLANKS', 'METALBAR', 'LEATHER', 'CLOTH', 'STONEBLOCK'];
const SERVERS = ['west', 'europe', 'east'];
const CRAFT_CATEGORIES = [
  'sword', 'bow', 'arcanestaff', 'axe', 'quarterstaff', 'froststaff', 'mace', 'naturestaff', 'firestaff',
  'hammer', 'spear', 'holystaff', 'crossbow', 'dagger', 'cursestaff', 'knuckles', 'shapeshifterstaff',
  'plate_armor', 'leather_armor', 'cloth_armor', 'plate_helmet', 'leather_helmet', 'cloth_helmet',
  'plate_shoes', 'leather_shoes', 'cloth_shoes', 'offhand', 'cape', 'bag', 'potion', 'food',
  'gatherergear', 'tools',
];
const FLIP_GROUPS = ['weapons', 'armors', 'head', 'shoes', 'offhands', 'capes', 'artefacts', 'consumables', 'resources'];
const REFINE_MODES = ['buy', 'all', 'best'];

export const ALLOWED = { CITIES, SELL_CITIES, CRAFT_CITIES, REFINE_TYPES, SERVERS, CRAFT_CATEGORIES, FLIP_GROUPS };

const item = { id: 'str', ench: 'num' };

// ---------- migrações 0 → 1 (puras; recebem uma cópia) ----------

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** craft:cfg: some `deep`; 'refine' → 'all' (o que modeOf já faz); modo fora de buy|all|best sai. */
function migrateCraft(o) {
  const { deep, ...rest } = o; // eslint-disable-line no-unused-vars
  if (isObj(rest.refine)) {
    const refine = {};
    for (const [k, v] of Object.entries(rest.refine)) {
      const mode = v === 'refine' ? 'all' : v;
      if (REFINE_MODES.includes(mode)) refine[k] = mode;
    }
    rest.refine = refine;
  }
  return rest;
}

/** refine:cfg: `deep:true` sem `route` vira route 'all' (ANTES da mescla, que injetaria 'best'). */
function migrateRefine(o) {
  const { deep, ...rest } = o;
  if (rest.route === undefined && deep === true) rest.route = 'all';
  return rest;
}

const SHOP_PREFIX = /^(?:weapons|armors|head|shoes)\/(.+)$/;
const SHOP_TO_CRAFT = {
  'capes/accessoires_capes_capes': 'cape',
  'consumables/potions': 'potion',
  'consumables/food': 'food',
};

/** rrr:cfg: categoria de LOJA ('weapons/sword') → de craft ('sword'); desconhecida → 'sword'. */
function migrateRrr(o) {
  const c = o.category;
  if (typeof c !== 'string' || c === '' || CRAFT_CATEGORIES.includes(c)) return o;
  let next = SHOP_TO_CRAFT[c];
  if (!next && c.startsWith('offhands/')) next = 'offhand';
  if (!next && c.startsWith('bags/')) next = 'bag';
  if (!next) next = SHOP_PREFIX.exec(c)?.[1];
  return { ...o, category: CRAFT_CATEGORIES.includes(next) ? next : 'sword' };
}

/**
 * D-042: estado de antes da 7fe574e não tem `refineCity`. O código comparava `refineCity === 'auto'`
 * (falso para undefined) e refinava SEM o bônus de especialização (RRR 18/118) enquanto a tela mostrava
 * "cada recurso na sua cidade". Agora o padrão 'auto' vale (58/158): os números mudam, então avisa.
 */
const REFINE_CITY_NOTE = {
  id: 'craft-refine-city',
  // IDEIA-071: +40 é o bônus de produção (PB), não o RRR; 15% e 37% são rrr() de refino sem/com especialização
  // (18/118 e 58/158; migrationNotes.test.js confere com rrr()). Só vale para quem refina no Craft: `when`.
  message:
    "Sua configuração antiga foi atualizada: o refino dos materiais do Craft agora usa o bônus de produção da cidade especializada de cada recurso (+40). O RRR do refino sobe de cerca de 15% para 37% e o custo do craft cai. Antes o app calculava esse refino sem o bônus, embora a tela dissesse 'cada recurso na sua cidade de bônus'.",
  when: 'craft-uses-refine',
};
function craftNotes(saved, fromVersion) {
  return fromVersion === 0 && Object.keys(saved).length > 0 && saved.refineCity === undefined ? [REFINE_CITY_NOTE] : [];
}

export const PERSISTED = {
  'craft:item': { version: 1, migrations: {}, schema: item },
  'market:item': { version: 1, migrations: {}, schema: item },
  'market:quality': { version: 1, migrations: {}, schema: { $self: { enum: [1, 2, 3, 4, 5] } } },
  'craft:cfg': {
    version: 1,
    migrations: { 1: migrateCraft },
    notes: craftNotes,
    schema: {
      craftCity: { enum: CRAFT_CITIES },
      specialty: 'boolOrNull',
      focus: 'bool',
      feePer100: 'numText',
      customRRR: 'numText',
      matCity: { enum: ['best', ...CITIES] },
      useOrders: 'bool',
      crafts: 'numText',
      refine: { map: { enum: REFINE_MODES } },
      refineFocus: 'bool',
      refineFee: 'numText',
      refineCity: { enum: ['auto', ...CITIES] },
      refineDaily: { map: 'numText' },
      // campos que só existem por set({...}); nunca estão nos padrões
      feeSet: 'bool',
      refineFeeSet: 'bool',
      craftDaily: 'numText',
      craftDailyAt: 'num',
      waitCost: 'numText',
      recipeVariant: 'recipeVariant',
      share: 'numText', // IDEIA-010 (opcional até entrar na master)
      cityScenario: { enum: ['own', 'best'] }, // IDEIA-058
      feeByCity: { map: 'numText' }, // IDEIA-058: taxa de bancada por cidade (vazio = taxa geral)
      extras: 'passthrough', // IDEIA-048: lista { name, value, scope }; a 060 (validateExtras) valida e avisa
      noTax: { map: 'bool' }, // IDEIA-048: { 'Cidade|modo': true } saídas vendidas fora do mercado
    },
  },
  'refine:cfg': {
    version: 1,
    migrations: { 1: migrateRefine },
    schema: {
      type: { enum: REFINE_TYPES },
      tier: { enum: [4, 5, 6, 7, 8] },
      ench: { enum: [0, 1, 2, 3, 4] },
      buyCity: { enum: ['best', ...CITIES] },
      refineCity: { enum: CITIES },
      sellCity: { enum: ['best', ...SELL_CITIES] },
      focus: 'bool',
      daily: 'numText',
      feePer100: 'numText',
      customRRR: 'numText',
      useOrders: 'bool',
      route: { enum: REFINE_MODES },
      sellMode: { enum: ['order', 'instant'] },
      qty: 'numText',
      feeSet: 'bool',
      extras: 'passthrough', // IDEIA-048: lista { name, value, scope } (a 060 valida)
      noTax: { map: 'bool' }, // IDEIA-048: interruptor único do Refino: { 'Refino|order': true }
    },
  },
  'flip:cfg': {
    version: 1,
    migrations: {},
    schema: {
      groups: { list: 'str', allowed: FLIP_GROUPS },
      tiers: { list: 'num', allowed: [4, 5, 6, 7, 8] },
      enchs: { list: 'num', allowed: [0, 1, 2, 3, 4] },
      buyCities: { list: 'str', allowed: CITIES },
      sellCities: { list: 'str', allowed: SELL_CITIES },
      buyMode: { enum: ['instant', 'order'] },
      sellMode: { enum: ['any', 'instant', 'order'] },
      minProfit: 'numText',
      minMargin: 'numText',
      maxAge: 'numText',
      budget: 'numText',
    },
  },
  'rrr:cfg': {
    version: 1,
    migrations: { 1: migrateRrr },
    schema: {
      kind: { enum: ['refine', 'craft'] },
      city: { enum: CRAFT_CITIES },
      category: { enum: ['', ...CRAFT_CATEGORIES] },
      resource: { enum: REFINE_TYPES },
      focus: 'bool',
      daily: 'numText',
      item: 'itemRefOrNull',
      crafts: 'numText',
    },
  },
  'target:cfg': {
    version: 1,
    migrations: {},
    schema: {
      goal: { enum: ['even', 'profit', 'margin'] },
      profit: 'numText',
      margin: 'numText',
      mode: { enum: ['order', 'instant'] },
      relists: 'numText',
    },
  },
  'premium:cfg': {
    version: 1,
    migrations: {},
    schema: { gold: 'numText', goldCost: 'numText', volume: 'numText', silverPerFocus: 'numText', focusPerDay: 'numText' }, // IDEIA-054
  },
  settings: {
    version: 1,
    migrations: {},
    schema: {
      server: { enum: SERVERS },
      premium: 'bool',
      feeCeiling: 'passthrough', // a 060 já valida e avisa; resetar em silêncio apagaria o aviso
    },
  },
};

/** Opções de loadPersisted para a chave (sem o `albion:`). Chave desconhecida: sem esquema, versão 1. */
export function getPersistedSpec(key) {
  const p = PERSISTED[key];
  return p ? { ...p, key } : { version: 1, migrations: {}, schema: {}, key };
}
