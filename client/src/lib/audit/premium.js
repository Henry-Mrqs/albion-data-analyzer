// IDEIA-086: auditor da aba Premium. Lê o que cleanPremiumInputs/premiumBalance (premium.js) e a tela usaram:
// nenhuma constante nem fórmula é copiada (V1); o saldo é LIDO de `res`, não recalculado.
import { DAILY_FOCUS_PREMIUM } from '../focusConsts';
import { NOT_COUNTED, PREMIUM, TAX_SAVING } from '../premium';
import { apiRow, correctionNote, joinNote, row } from './core';
import { auditScreen, registerScreen } from './registry';

const SRC = {
  premium: `AO Refinery (aorefinery.com/gold), ${PREMIUM.asOf}, fonte secundária, não verificado no wiki oficial`,
  tax: 'wiki e AFM 2026 (média-alta)',
};
const isObj = (x) => x != null && typeof x === 'object' && !Array.isArray(x);
const empty = (x) => x == null || (typeof x === 'string' && x.trim() === '');
const hasIssue = (ctx, field) => Array.isArray(ctx.issues) && ctx.issues.some((i) => i?.field === field);
// digitado e aceito (não vazio e sem correção): só então a linha é "digitado"
const typed = (ctx, field) => !empty(ctx.cfg[field]) && !hasIssue(ctx, field);
const fix = (ctx, field) => correctionNote(ctx.issues, field);

const gold = (ctx) => {
  const ok = ctx.res?.state === 'ok';
  if (!ok) {
    return row({
      id: 'gold', label: 'Preço do ouro', value: null, unit: 'prata por ouro', origin: 'user', status: 'not-considered', statusText: 'sem preço do ouro',
      note: joinNote('Informe o preço do ouro: o saldo não é calculado', fix(ctx, 'gold')),
    });
  }
  return row({ id: 'gold', label: 'Preço do ouro', value: ctx.values.gold, unit: 'prata por ouro', origin: 'user', status: 'applied', note: fix(ctx, 'gold') });
};

const goldApi = (ctx) =>
  apiRow({
    id: 'gold-api', label: 'Preço do ouro na API (informativo)', price: ctx.gold?.price, date: ctx.gold?.t, now: ctx.now, maxAgeH: 24, unit: 'prata por ouro',
    note: ctx.gold && ctx.res?.state === 'ok' && ctx.values.gold !== ctx.gold.price ? 'Difere do valor digitado: o cálculo usa o digitado.' : undefined,
  });

const goldCost = (ctx) => {
  const t = typed(ctx, 'goldCost');
  return row({
    id: 'gold-cost', label: 'Custo do Premium de 30 dias', value: ctx.values.goldCost, unit: 'ouro', origin: t ? 'user' : 'app-default', status: t ? 'applied' : 'unconfirmed',
    source: t ? undefined : SRC.premium, note: joinNote(t ? undefined : 'Padrão não confirmado: pode mudar por patch, confira no jogo', fix(ctx, 'goldCost')),
  });
};

const volume = (ctx) =>
  row({
    id: 'volume', label: 'Prata vendida no mercado por mês', value: ctx.values.volume ?? 0, unit: 'prata', origin: 'user', status: 'applied',
    note: joinNote(empty(ctx.cfg.volume) ? 'Vazio = 0: sem volume, só o foco conta' : undefined, fix(ctx, 'volume')),
  });

const silverPerFocus = (ctx) =>
  row({
    id: 'silver-per-focus', label: 'Prata por ponto de foco', value: ctx.values.silverPerFocus ?? 0, unit: 'prata', origin: 'user', status: 'applied',
    note: joinNote(empty(ctx.cfg.silverPerFocus) ? 'Vazio = 0' : undefined, fix(ctx, 'silverPerFocus')),
  });

const focusDay = (ctx) => {
  const t = typed(ctx, 'focusPerDay');
  return row({
    id: 'focus-day', label: 'Foco do Premium usado por dia', value: ctx.values.focusPerDay ?? DAILY_FOCUS_PREMIUM, unit: 'foco', origin: t ? 'user' : 'app-default', status: t ? 'applied' : 'unconfirmed',
    source: t ? undefined : 'fonte secundária (AO Refinery)', note: joinNote(t ? undefined : 'Padrão do app, não confirmado: só conta o foco que você realmente gasta', fix(ctx, 'focusPerDay')),
  });
};

const days = () =>
  row({ id: 'days', label: 'Dias do Premium', value: PREMIUM.days, unit: 'dias', origin: 'app-default', status: 'unconfirmed', source: 'fonte secundária (AO Refinery)', note: 'Duração do Premium comprado.' });

const taxSaving = () =>
  row({ id: 'tax-saving', label: 'Imposto economizado com Premium', value: TAX_SAVING * 100, unit: 'pontos %', origin: 'derived', status: 'applied', source: SRC.tax, note: 'Diferença entre o imposto sem e com Premium (8% e 4%), vinda de econ.js.' });

const balance = (ctx) =>
  ctx.res?.state === 'ok'
    ? row({ id: 'balance', label: 'Saldo em 30 dias', value: ctx.res.balance, unit: 'prata', origin: 'derived', status: 'applied', note: 'Imposto economizado + valor do foco − custo do Premium, lido do resultado da tela.' })
    : null;

const notCounted = () =>
  NOT_COUNTED.map((label, i) =>
    row({
      id: `nc-premium-${i}`, label, value: 'não considerado', unit: '', origin: 'app-default', status: 'not-considered', note: 'A conta é só imposto + foco − custo; o app não recomenda a compra.',
    }),
  );

const V = (id, label, fields, kind, affects, build, extra = {}) => ({ id, label, fields, kind, affects, build, ...extra });

export const premiumVars = [
  V('gold', 'Preço do ouro', ['gold'], 'applied', 'balance', gold, { probe: { cfg: { gold: '10000' } } }),
  V('gold-api', 'Preço do ouro na API', [], 'info-only', 'none', goldApi),
  V('gold-cost', 'Custo do Premium em ouro', ['goldCost'], 'applied', 'balance', goldCost, { probe: { cfg: { goldCost: '3000' } } }),
  V('volume', 'Prata vendida por mês', ['volume'], 'applied', 'balance', volume, { probe: { cfg: { volume: '30000000' } } }),
  V('silver-per-focus', 'Prata por ponto de foco', ['silverPerFocus'], 'applied', 'balance', silverPerFocus, { probe: { cfg: { silverPerFocus: '60' } } }),
  V('focus-day', 'Foco por dia', ['focusPerDay'], 'applied', 'balance', focusDay, { probe: { cfg: { focusPerDay: '5000' } } }),
  V('days', 'Dias do Premium', [], 'applied', 'balance', days),
  V('tax-saving', 'Imposto economizado', [], 'applied', 'balance', taxSaving),
  V('balance', 'Saldo em 30 dias', [], 'applied', 'balance', balance),
  V('nc-premium', 'O que o cálculo não conta', [], 'not-considered', 'none', notCounted),
];

registerScreen('premium', { cfgKeys: ['premium:cfg'], ignoredFields: {}, vars: premiumVars });

/**
 * Monta o quadro da aba Premium com os objetos que a tela já calculou.
 * input = { cfg, values, issues, res, gold, now }; gold = { price, t } | null. Nunca lança.
 */
export function auditPremium(input) {
  const i = input ?? {};
  return auditScreen('premium', {
    ...i,
    cfg: isObj(i.cfg) ? i.cfg : {},
    values: isObj(i.values) ? i.values : {},
    issues: Array.isArray(i.issues) ? i.issues : [],
    res: isObj(i.res) ? i.res : { state: 'nogold' },
    gold: isObj(i.gold) ? i.gold : null,
    now: Number.isFinite(i.now) ? i.now : Date.now(),
  });
}
