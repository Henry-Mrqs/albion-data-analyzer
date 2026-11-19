// IDEIA-005: auditor da aba RRR. Lê o que rrrFor (rrrCalc.js) e a tela usaram; nenhuma constante de PB é copiada (V1).
import { REFINING, craftCategoryLabel, marketId, nameOf } from '../catalog';
import { DAILY_NOTE } from '../dailyBonus';
import { validateInputs } from '../inputRules';
import { pbParts } from '../rrrCalc';
import { correctionNote, joinNote, row } from './core';
import { auditScreen, registerScreen } from './registry';

const SRC = {
  pb: 'dump craftingmodifiers.xml (alta)',
  focus: 'regra do servidor, não está no dump (média-alta)',
  daily: 'AUDITORIA-001, wiki e AFM 2026 (média-alta)',
  rrr: 'RRR = PB ÷ (100 + PB) (alta)',
};
const isObj = (x) => x != null && typeof x === 'object' && !Array.isArray(x);
const refine = (ctx) => ctx.cfg.kind === 'refine';
const P = (ctx) => pbParts({ kind: refine(ctx) ? 'refine' : 'craft', specialty: ctx.res.specialty, focus: !!ctx.cfg.focus, daily: ctx.dailyV.values.daily });

const kind = (ctx) => row({ id: 'kind', label: 'Tipo de produção', value: refine(ctx) ? 'Refino' : 'Craft', unit: '', origin: 'user', status: 'applied', note: refine(ctx) ? 'Especialização de refino: +40.' : 'Especialização de craft: +15.' });

const city = (ctx) => {
  const spec = ctx.res.specialty;
  return [
    row({ id: 'city', label: 'Cidade', value: ctx.cfg.city, unit: '', origin: 'user', status: 'applied' }),
    row({
      id: 'specialty', label: refine(ctx) ? 'Especialização da cidade (+40)' : 'Especialização da cidade (+15)', value: P(ctx).specialty, unit: 'PB', origin: 'derived', status: 'applied', source: SRC.pb,
      note: spec ? 'A cidade é a de bônus: especialização aplicada.' : 'A cidade escolhida não é a de bônus: sem especialização.',
    }),
  ];
};

const category = (ctx) => {
  if (refine(ctx)) {
    const r = REFINING[ctx.cfg.resource];
    return row({ id: 'resource', label: 'Recurso refinado', value: r ? `${r.label} (${r.rawLabel})` : String(ctx.cfg.resource), unit: '', origin: 'user', status: 'applied', note: r ? `Cidade de bônus: ${r.city}.` : undefined });
  }
  const itemCc = ctx.info?.cc ?? '';
  const matches = ctx.item ? itemCc === ctx.category : false;
  return row({
    id: 'category', label: 'Categoria de craft', value: craftCategoryLabel(ctx.category), unit: '', origin: matches ? 'game' : 'user', status: 'applied', source: matches ? 'dump do jogo (item.cc)' : undefined,
    note: matches ? 'Vem da categoria do item no dump; define a cidade de bônus.' : ctx.item ? 'Selecionada por você e diferente da categoria do item escolhido: confira.' : 'Selecionada por você.',
  });
};

const rrrBase = () => row({ id: 'rrr-base', label: 'Base de produção', value: pbParts({ kind: 'craft', specialty: false, focus: false }).base, unit: 'PB', origin: 'game', status: 'applied', source: SRC.pb, note: 'Retorno de recursos = PB ÷ (100 + PB), com PB = bônus de produção.' });

const focus = (ctx) => row({ id: 'focus', label: 'Foco', value: P(ctx).focus, unit: 'PB', origin: 'user', status: 'applied', source: SRC.focus, note: ctx.cfg.focus ? 'Ligado: +59 de bônus de produção. A regra vem do servidor e não está no dump.' : 'Desligado.' });

const daily = (ctx) => {
  const d = ctx.dailyV.values.daily;
  return row({
    id: 'daily', label: 'Bônus diário (+10/+20)', value: P(ctx).daily, unit: 'PB', origin: 'user', status: 'applied', source: SRC.daily,
    note: joinNote(
      d > 0 ? DAILY_NOTE : 'Nenhum bônus diário',
      'Escolha manual: o jogo sorteia 2 categorias por dia, e esta aba não confere a data',
      correctionNote(ctx.dailyV.issues, 'daily') ?? correctionNote(ctx.dailyV.issues.map((i) => ({ ...i, field: 'daily' })), 'daily'),
      'É o bônus de produção +10/+20 que você informa, não o diário de ofício (journal)',
    ),
  });
};

const crafts = (ctx) => {
  const v = validateInputs({ crafts: ctx.cfg.crafts });
  return row({ id: 'crafts', label: 'Nº de crafts (tabela de retorno)', value: v.values.crafts, unit: 'crafts', origin: 'user', status: 'applied', note: joinNote('Só muda a tabela de retorno, não o RRR', correctionNote(v.issues, 'crafts')) });
};

const item = (ctx) =>
  row({
    id: 'item', label: 'Item da tabela de retorno', value: ctx.item ? nameOf(marketId(ctx.sel.id, ctx.sel.ench)) : 'sem item no catálogo', unit: '', origin: ctx.cfg.item ? 'user' : 'app-default', status: 'applied',
    note: ctx.item ? undefined : 'Este item não tem receita no catálogo.',
  });

const final = (ctx) =>
  row({ id: 'rrr-final', label: 'RRR final', value: ctx.res.rrr * 100, unit: '%', origin: 'derived', status: 'applied', source: SRC.rrr, note: `PB total ${ctx.res.pb.toFixed(0)}.` });

const outOfScope = () =>
  row({ id: 'out-of-scope', label: 'Taxa de bancada, preços e imposto', value: 'esta aba não calcula', unit: '', origin: 'app-default', status: 'info-only', note: 'A aba mostra só o retorno de recursos: não considera taxa, preços nem imposto (use o Craft ou o Refino para o lucro).' });

const V = (id, label, fields, kind_, affects, build, extra = {}) => ({ id, label, fields, kind: kind_, affects, build, ...extra });

export const rrrVars = [
  V('kind', 'Tipo de produção', ['kind'], 'applied', 'rrr', kind, { probe: { cfg: { kind: 'refine' } } }),
  V('city', 'Cidade e especialização', ['city'], 'applied', 'rrr', city, { probe: { cfg: { city: 'Fort Sterling' } } }),
  V('category', 'Categoria ou recurso', ['category', 'resource'], 'applied', 'rrr', category, { probe: { cfg: { category: 'axe' } } }),
  V('rrr-base', 'Base de produção', [], 'applied', 'rrr', rrrBase),
  V('focus', 'Foco', ['focus'], 'applied', 'rrr', focus, { probe: { cfg: { focus: true } } }),
  V('daily', 'Bônus diário', ['daily'], 'applied', 'rrr', daily, { probe: { cfg: { daily: 20 } } }),
  V('crafts', 'Nº de crafts', ['crafts'], 'applied', 'rrr', crafts, { probe: { cfg: { crafts: 50 } } }),
  V('item', 'Item da tabela', ['item'], 'applied', 'rrr', item, { probe: { cfg: { item: { id: 'T4_MAIN_SWORD', ench: 0 } } } }),
  V('final', 'RRR final', [], 'applied', 'rrr', final),
  V('out-of-scope', 'O que a aba não calcula', [], 'info-only', 'none', outOfScope),
];

registerScreen('rrr', { cfgKeys: ['rrr:cfg'], ignoredFields: {}, vars: rrrVars });

/**
 * Monta o quadro da aba RRR com os objetos que a tela já calculou.
 * input = { cfg, category, res, dailyV, item, info, rows, sel }. Nunca lança.
 */
export function auditRrr(input) {
  const i = input ?? {};
  const cfg = isObj(i.cfg) ? i.cfg : {};
  return auditScreen('rrr', { ...i, cfg, dailyV: i.dailyV ?? { values: {}, issues: [] } });
}
