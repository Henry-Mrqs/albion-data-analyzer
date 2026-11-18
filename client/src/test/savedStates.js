// Estados que cada versão ANTERIOR do app realmente gravou no localStorage (IDEIA-070).
// Oráculo: o histórico do git. Para cada versão, o bloco `usePersisted('chave', {...})` do commit
// (`git show <commit>:client/src/components/<arquivo>`) é o padrão da época; somam-se os campos que os
// `set({...})` daquele commit acrescentam. Campos de NumberInput são gravados como TEXTO.
// Estes objetos são o JSON que estaria em `albion:<chave>` (sem `_v`: ainda não existia).

/** Padrões ATUAIS (copiados dos componentes na master). */
export const CURRENT_DEFAULTS = {
  'craft:item': { id: 'T6_MAIN_SWORD', ench: 0 },
  'craft:cfg': {
    craftCity: 'Lymhurst', specialty: null, focus: false, feePer100: 400, customRRR: '',
    matCity: 'best', useOrders: false, crafts: 1,
    refine: {}, refineFocus: false, refineFee: 400, refineCity: 'auto', refineDaily: {},
  },
  'refine:cfg': {
    type: 'PLANKS', tier: 4, ench: 0,
    buyCity: 'best', refineCity: 'Fort Sterling', sellCity: 'best',
    focus: false, daily: 0, feePer100: 400, customRRR: '',
    useOrders: false, route: 'best', sellMode: 'order', qty: 100,
  },
  'flip:cfg': {
    groups: ['weapons', 'armors'], tiers: [6, 7, 8], enchs: [0, 1],
    buyCities: ['Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Caerleon'],
    sellCities: ['Black Market', 'Caerleon'],
    buyMode: 'instant', sellMode: 'any', minProfit: 2000, minMargin: 10, maxAge: 24, budget: '',
  },
  'market:item': { id: 'T6_MAIN_SWORD', ench: 0 },
  'market:quality': 1,
  'rrr:cfg': {
    kind: 'craft', city: 'Lymhurst', category: 'sword', resource: 'PLANKS',
    focus: false, daily: 0, item: null, crafts: 100,
  },
  'target:cfg': { goal: 'profit', profit: 1000, margin: 20, mode: 'order', relists: 0 },
  settings: { server: 'west', premium: true, feeCeiling: 1000 },
};

const CRAFT_8BF = {
  craftCity: 'Lymhurst', specialty: null, focus: false, feePer100: 400, customRRR: '',
  matCity: 'best', useOrders: false, crafts: 1,
  refine: {}, refineFocus: false, refineFee: 400, deep: false,
};

/**
 * Cada entrada: { key, commit, note, saved, current? }; `current: true` = formato que a versão ATUAL ainda produz (carregar tem que ser identidade). `saved` é o objeto (ou primitivo) gravado.
 * (O IDs de commit existem em `master`; o nome curto de cada um está no comentário.)
 */
export const SAVED_STATES = [
  // ---- craft:cfg
  { key: 'craft:cfg', commit: '8bf3014', note: 'inicial, padrão intocado', saved: { ...CRAFT_8BF } },
  {
    key: 'craft:cfg', commit: '8bf3014', note: 'inicial com deep:true e refine {METALBAR:"refine", LEATHER:"buy"}',
    saved: { ...CRAFT_8BF, deep: true, refine: { METALBAR: 'refine', LEATHER: 'buy' }, feePer100: '250', crafts: '5' },
  },
  {
    key: 'craft:cfg', commit: '9e1e4a2', note: 'sem deep; refine aceita buy|refine|all|best',
    saved: {
      craftCity: 'Martlock', specialty: true, focus: true, feePer100: '250', customRRR: '', matCity: 'Thetford', useOrders: true, crafts: '5',
      refine: { PLANKS: 'refine', CLOTH: 'all', METALBAR: 'best' }, refineFocus: true, refineFee: '300',
    },
  },
  {
    key: 'craft:cfg', commit: '7fe574e', note: '+ refineCity e refineDaily',
    saved: {
      craftCity: 'Lymhurst', specialty: null, focus: false, feePer100: 400, customRRR: '', matCity: 'best', useOrders: false, crafts: 1,
      refine: { PLANKS: 'all' }, refineFocus: false, refineFee: 400, refineCity: 'Thetford', refineDaily: { PLANKS: 10 },
    },
  },
  {
    key: 'craft:cfg', commit: 'ae61c3e (019)', note: 'taxa 250 gravada sem feeSet (o sintoma que a 019 achou)',
    saved: {
      craftCity: 'Lymhurst', specialty: null, focus: false, feePer100: '250', customRRR: '', matCity: 'best', useOrders: false, crafts: 1,
      refine: {}, refineFocus: false, refineFee: 400, refineCity: 'auto', refineDaily: {},
    },
  },
  {
    key: 'craft:cfg', commit: 'f4915f5 (041)', current: true, note: 'atual completo com todos os campos de set',
    saved: {
      craftCity: 'Caerleon', specialty: false, focus: true, feePer100: '300', customRRR: '45', matCity: 'Martlock', useOrders: true, crafts: '10',
      refine: { PLANKS: 'all', LEATHER: 'buy', CLOTH: 'best' }, refineFocus: true, refineFee: '350', refineCity: 'auto', refineDaily: { PLANKS: 20, LEATHER: 10 },
      feeSet: true, refineFeeSet: true, craftDaily: 20, craftDailyAt: 1763400000000, waitCost: '5000', recipeVariant: '1',
    },
  },
  // ---- refine:cfg
  {
    key: 'refine:cfg', commit: '8bf3014', note: 'inicial com deep:true e qty em texto',
    saved: {
      type: 'METALBAR', tier: 6, ench: 1, buyCity: 'best', refineCity: 'Thetford', sellCity: 'Caerleon',
      focus: true, daily: 10, feePer100: '250', customRRR: '', useOrders: false, deep: true, sellMode: 'order', qty: '250',
    },
  },
  {
    key: 'refine:cfg', commit: '8bf3014', note: 'inicial com deep:false (padrão)',
    saved: {
      type: 'PLANKS', tier: 4, ench: 0, buyCity: 'best', refineCity: 'Fort Sterling', sellCity: 'best',
      focus: false, daily: 0, feePer100: 400, customRRR: '', useOrders: false, deep: false, sellMode: 'order', qty: 100,
    },
  },
  {
    key: 'refine:cfg', commit: 'f68f0af', note: 'deep vira route',
    saved: {
      type: 'LEATHER', tier: 5, ench: 2, buyCity: 'Martlock', refineCity: 'Martlock', sellCity: 'best',
      focus: false, daily: 20, feePer100: 400, customRRR: '', useOrders: true, route: 'buy', sellMode: 'instant', qty: 100,
    },
  },
  {
    key: 'refine:cfg', commit: 'ae61c3e (019)', current: true, note: 'atual com feeSet e taxa em texto',
    saved: {
      type: 'CLOTH', tier: 7, ench: 0, buyCity: 'best', refineCity: 'Lymhurst', sellCity: 'best',
      focus: true, daily: 0, feePer100: '300', customRRR: '', useOrders: false, route: 'all', sellMode: 'order', qty: '40', feeSet: true,
    },
  },
  // ---- rrr:cfg
  {
    key: 'rrr:cfg', commit: '451f0fa', note: 'categoria de LOJA (weapons/axe)',
    saved: { kind: 'craft', city: 'Martlock', category: 'weapons/axe', resource: 'PLANKS', focus: true, daily: 10, item: null, crafts: 100 },
  },
  {
    key: 'rrr:cfg', commit: '451f0fa', note: 'categoria de loja armors/plate_armor, refino, item escolhido',
    saved: { kind: 'refine', city: 'Fort Sterling', category: 'armors/plate_armor', resource: 'METALBAR', focus: false, daily: 20, item: { id: 'T5_MAIN_AXE', ench: 1 }, crafts: '50' },
  },
  {
    key: 'rrr:cfg', commit: '451f0fa', note: 'offhands/booktype',
    saved: { kind: 'craft', city: 'Lymhurst', category: 'offhands/booktype', resource: 'PLANKS', focus: false, daily: 0, item: null, crafts: 100 },
  },
  {
    key: 'rrr:cfg', commit: '451f0fa', note: 'bags/satchels',
    saved: { kind: 'craft', city: 'Lymhurst', category: 'bags/satchels', resource: 'PLANKS', focus: false, daily: 0, item: null, crafts: 100 },
  },
  {
    key: 'rrr:cfg', commit: '451f0fa', note: 'capes/accessoires_capes_capes',
    saved: { kind: 'craft', city: 'Lymhurst', category: 'capes/accessoires_capes_capes', resource: 'PLANKS', focus: false, daily: 0, item: null, crafts: 100 },
  },
  {
    key: 'rrr:cfg', commit: '451f0fa', note: 'consumables/potions',
    saved: { kind: 'craft', city: 'Lymhurst', category: 'consumables/potions', resource: 'PLANKS', focus: false, daily: 0, item: null, crafts: 100 },
  },
  {
    key: 'rrr:cfg', commit: '451f0fa', note: 'crafting/resources (não é categoria de craft)',
    saved: { kind: 'craft', city: 'Lymhurst', category: 'crafting/resources', resource: 'PLANKS', focus: false, daily: 0, item: null, crafts: 100 },
  },
  {
    key: 'rrr:cfg', commit: '8e387f6', current: true, note: 'categoria de craft (038), sem mudança',
    saved: { kind: 'craft', city: 'Martlock', category: 'axe', resource: 'LEATHER', focus: true, daily: 20, item: { id: 'T4_BAG', ench: 0 }, crafts: '12' },
  },
  // ---- target:cfg
  {
    key: 'target:cfg', commit: '943c7c8', current: true, note: 'estável (030)',
    saved: { goal: 'margin', profit: '1500', margin: '25', mode: 'instant', relists: '2' },
  },
  // ---- flip:cfg
  {
    key: 'flip:cfg', commit: '8bf3014', note: 'estável', current: true,
    saved: {
      groups: ['weapons', 'resources'], tiers: [4, 5], enchs: [0],
      buyCities: ['Martlock', 'Thetford'], sellCities: ['Black Market'],
      buyMode: 'order', sellMode: 'instant', minProfit: '3000', minMargin: '5', maxAge: '12', budget: '100000',
    },
  },
  // ---- market
  { key: 'market:item', commit: '8bf3014', note: 'estável', current: true, saved: { id: 'T5_ARMOR_PLATE_SET1', ench: 2 } },
  { key: 'market:quality', commit: '8bf3014', note: 'estável', current: true, saved: 3 },
  // ---- settings
  { key: 'settings', commit: '8bf3014', note: 'sem feeCeiling', saved: { server: 'europe', premium: false } },
  { key: 'settings', commit: 'da8bf1c (060)', current: true, note: 'atual', saved: { server: 'east', premium: true, feeCeiling: 500 } },
];

export const savedText = (s) => JSON.stringify(s.saved);
