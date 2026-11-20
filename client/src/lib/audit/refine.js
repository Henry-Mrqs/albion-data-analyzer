// IDEIA-005: auditor do Refino. Cada build LÊ o que evaluateTier/refineUnit e a tela usaram; nenhuma fórmula é copiada (V1).
import { cityLabel } from '../market';
import { feeIsUnconfirmedDefault } from '../econ';
import { DAILY_NOTE } from '../dailyBonus';
import { DEFAULT_MAX_AGE_H } from '../exits';
import { focusValues } from '../focus';
import { pbParts } from '../rrrCalc';
import { apiRow, correctionNote, joinNote, notConsideredRows, plain, relistRow, row, stressVars, targetVars, taxRows } from './core';
import { auditScreen, registerScreen } from './registry';

const SRC = {
  pb: 'dump craftingmodifiers.xml (alta)',
  focus: 'regra do servidor, não está no dump (média-alta)',
  daily: 'AUDITORIA-001, wiki e AFM 2026 (média-alta)',
  rrr: 'RRR = PB ÷ (100 + PB) (alta)',
};
const ROUTE = {
  buy: 'comprar refinado pronto (só refina o último nível)',
  all: 'produzir tudo (refina a cadeia inteira até T2)',
  best: 'melhor combinação (o mais barato em cada nível)',
};
const isObj = (x) => x != null && typeof x === 'object' && !Array.isArray(x);
const flat = (lines = []) => lines.flatMap((l) => (l.sub ? flat(l.sub.lines) : [l]));

const parts = (ctx) => pbParts({ kind: 'refine', specialty: ctx.specialty, focus: !!ctx.cfg.focus, daily: +ctx.vcfg.daily || 0 });

const item = (ctx) =>
  row({
    id: 'item', label: 'Recurso, tier e encanto', value: `${ctx.info.label} T${ctx.cfg.tier}.${ctx.ench}`, unit: '', origin: 'user', status: 'applied',
    note: ctx.cfg.type === 'STONEBLOCK' ? 'Bloco de pedra não tem encanto.' : undefined,
  });

const city = (ctx) => {
  const p = parts(ctx);
  return [
    row({ id: 'refine-city', label: 'Cidade de refino', value: ctx.cfg.refineCity, unit: '', origin: 'user', status: 'applied', note: `Cidade de bônus de ${ctx.info.label}: ${ctx.info.city}.` }),
    row({
      id: 'specialty', label: ctx.specialty ? 'Especialização da cidade (+40)' : 'Especialização da cidade', value: p.specialty, unit: 'PB', origin: 'derived', status: 'applied', source: SRC.pb,
      note: ctx.specialty
        ? 'Regra que valeu: especialização +40 aplicada: refina na cidade de bônus.'
        : `Regra que valeu: sem especialização: o bônus de ${ctx.info.label} é em ${ctx.info.city}, e você refina em ${ctx.cfg.refineCity}.`,
    }),
  ];
};

const rrrBase = () => row({ id: 'rrr-base', label: 'Base de produção', value: pbParts({ kind: 'refine', specialty: false, focus: false }).base, unit: 'PB', origin: 'game', status: 'applied', source: SRC.pb, note: 'Retorno de recursos = PB ÷ (100 + PB), com PB = bônus de produção.' });

const focus = (ctx) => {
  const on = !!ctx.cfg.focus;
  return row({ id: 'focus', label: 'Foco do refino', value: parts(ctx).focus, unit: 'PB', origin: 'user', status: 'applied', source: SRC.focus, note: on ? 'Ligado: +59 de bônus de produção. A regra vem do servidor e não está no dump.' : 'Desligado.' });
};

const daily = (ctx) => {
  const d = +ctx.vcfg.daily || 0;
  return row({
    id: 'daily', label: 'Bônus diário do refino (+10/+20)', value: parts(ctx).daily, unit: 'PB', origin: 'user', status: 'applied', source: SRC.daily,
    note: joinNote(
      d > 0 ? DAILY_NOTE : 'Nenhum bônus diário',
      'O Refino não confere a data do bônus: ele vale até você mudar',
      correctionNote(ctx.issues, 'daily'),
      'É o bônus de produção +10/+20 que você informa, não o diário de ofício (journal)',
    ),
  });
};

const customRRR = (ctx) => {
  const manual = ctx.vcfg.customRRR !== '' && ctx.vcfg.customRRR != null;
  const p = parts(ctx);
  return [
    row({
      id: 'custom-rrr', label: 'RRR manual', value: manual ? ctx.rrrValue * 100 : 'não informado', unit: manual ? '%' : '', origin: manual ? 'user' : 'derived', status: 'applied',
      note: joinNote(manual ? `Substitui o RRR automático (${(ctx.autoRRR * 100).toFixed(2).replace('.', ',')}%)` : 'Usando o RRR automático', correctionNote(ctx.issues, 'customRRR')),
    }),
    row({
      id: 'rrr-final', label: 'RRR final do refino', value: ctx.rrrValue * 100, unit: '%', origin: 'derived', status: 'applied', source: SRC.rrr,
      note: manual ? 'Valor manual em uso.' : `PB total ${(p.base + p.specialty + p.focus + p.daily).toFixed(0)}.`,
    }),
  ];
};

const benchFee = (ctx) => {
  const unconfirmed = feeIsUnconfirmedDefault(ctx.vcfg.feePer100, ctx.cfg.feeSet);
  return row({
    id: 'bench-fee', label: 'Taxa da bancada (por 100 de nutrição)', value: ctx.vcfg.feePer100, unit: 'prata', origin: unconfirmed ? 'app-default' : 'user', status: unconfirmed ? 'unconfirmed' : 'applied',
    note: joinNote(unconfirmed ? 'Padrão do app (400), NÃO confirmado: confira na sua bancada e digite o valor real' : undefined, 'Valor do item refinado × 0,1125 × taxa ÷ 100, em cada etapa de refino', correctionNote(ctx.issues, 'feePer100')),
  });
};

const buy = (ctx) => [
  row({ id: 'buy-city', label: 'Cidade de compra dos materiais', value: ctx.cfg.buyCity === 'best' ? 'a mais barata de cada material' : ctx.cfg.buyCity, unit: '', origin: ctx.cfg.buyCity === 'best' ? 'app-default' : 'user', status: 'applied' }),
  row({
    id: 'use-orders', label: 'Compra com ordens de compra', value: ctx.cfg.useOrders ? 'sim' : 'não', unit: '', origin: 'user', status: 'applied',
    note: ctx.cfg.useOrders ? 'Paga 2,5% de taxa de criação sobre o preço da ordem.' : 'Compra pelo menor preço de venda, sem taxa de criação.',
  }),
];

const route = (ctx) =>
  row({ id: 'route', label: 'Rota de produção', value: ROUTE[ctx.route] ?? String(ctx.route), unit: '', origin: ctx.cfg.route === undefined ? 'app-default' : 'user', status: 'applied', note: ctx.cfg.route === undefined && ctx.cfg.deep ? 'Vem do campo antigo "deep" (produzir tudo).' : undefined });

const matPrices = (ctx) =>
  flat(ctx.cur?.unit.lines).map((l) => apiRow({ id: `price-${l.mid}`, label: `Preço · ${l.name}`, price: l.unit, date: l.date, now: ctx.now, maxAgeH: ctx.maxAgeH, note: l.city ? cityLabel(l.city) : undefined }));

const sell = (ctx) => {
  if (!ctx.cur) return row({ id: 'exit', label: 'Saída (onde vender)', value: null, unit: 'prata', origin: 'api', status: 'not-considered', note: 'sem preços carregados' });
  const s = ctx.cur.sell;
  const mode = ctx.cur.mode === 'instant' ? 'ordem de compra (na hora)' : 'ordem de venda';
  return [
    row({ id: 'sell-mode', label: 'Venda do refinado', value: ctx.cfg.sellMode === 'instant' ? 'ordem de compra (na hora)' : 'ordem de venda', unit: '', origin: 'user', status: 'applied', note: s.city === 'Black Market' ? 'No Mercado Negro a venda é sempre na hora (ordem de compra).' : undefined }),
    apiRow({ id: 'exit', label: `Saída: ${s.city ? cityLabel(s.city) : '—'} · ${mode}`, price: s.price, date: s.date, now: ctx.now, maxAgeH: ctx.maxAgeH, note: ctx.cfg.sellCity === 'best' ? 'cidade mais cara (automático)' : undefined }),
  ];
};

const tax = (ctx) => {
  const c = ctx.cur;
  return taxRows({ premium: ctx.premium, sale: c?.sell.price > 0 ? { mode: c.mode, noTax: ctx.noTax, factor: c.net / c.sell.price } : null });
};

const noTax = (ctx) =>
  row({
    id: 'no-tax', label: 'Venda sem imposto (fora do mercado)', value: ctx.noTax ? 'sim' : 'não', unit: '', origin: 'user', status: 'applied',
    note: ctx.noTax ? 'Sem imposto e sem taxa de criação.' : 'Interruptor único do Refino (guilda, troca direta ou encomenda).',
  });

const qty = (ctx) => row({ id: 'qty', label: 'Quantidade a refinar', value: ctx.vcfg.qty, unit: 'un.', origin: 'user', status: 'applied', note: joinNote('Divide as despesas por lote e entra na taxa do lote', correctionNote(ctx.issues, 'qty')) });

const extras = (ctx) =>
  row({
    id: 'extras', label: 'Despesas extras lançadas, por unidade', value: ctx.perUnitExtras, unit: 'prata', origin: 'user', status: 'applied',
    note: joinNote(Array.isArray(ctx.vcfg.extras) && ctx.vcfg.extras.length ? `${ctx.vcfg.extras.length} despesa(s) dividida(s) pelo lote` : 'Nenhuma despesa digitada', correctionNote(ctx.issues, 'extras')),
  });

const focusPoints = (ctx) => {
  const { values, issues } = focusValues(ctx.cfg);
  const p = [];
  if (values.efficiency > 0) p.push(`eficiência ${values.efficiency}`);
  if (values.override > 0) p.push(`foco por refino ${values.override}`);
  if (values.budget > 0 && plain(ctx.cfg.focusBudget) !== 'não informado') p.push(`foco disponível ${values.budget}`);
  if (values.reference > 0) p.push(`1 ponto = ${values.reference} prata`);
  return row({
    id: 'focus-points', label: 'Foco como custo em pontos', value: p.length ? p.join(' · ') : plain(undefined), unit: '', origin: 'user', status: 'info-only',
    note: joinNote('Não muda o lucro: só o interruptor "Usar foco" muda o custo', correctionNote(issues, 'focusEff')),
  });
};

const notConsidered = () => notConsideredRows(['factionRecipe', 'transportBuy', 'relists', 'quality', 'journal', 'stock', 'drift', 'stoneBatch']);

const V = (id, label, fields, kind, affects, build, extra = {}) => ({ id, label, fields, kind, affects, build, ...extra });

export const refineVars = [
  V('item', 'Recurso, tier e encanto', ['type', 'tier', 'ench'], 'applied', 'cost', item, { probe: { cfg: { tier: 5 } } }),
  V('city', 'Cidade de refino e especialização', ['refineCity'], 'applied', 'cost', city, { probe: { cfg: { refineCity: 'Martlock' } } }),
  V('rrr-base', 'Base de produção', [], 'applied', 'cost', rrrBase),
  V('focus', 'Foco do refino', ['focus'], 'applied', 'cost', focus, { probe: { cfg: { focus: true } } }),
  V('daily', 'Bônus diário do refino', ['daily'], 'applied', 'cost', daily, { probe: { cfg: { daily: 20 } } }),
  V('custom-rrr', 'RRR manual e RRR final', ['customRRR'], 'applied', 'cost', customRRR, { probe: { cfg: { customRRR: '30' } } }),
  V('bench-fee', 'Taxa de bancada', ['feePer100', 'feeSet'], 'applied', 'cost', benchFee, { probe: { cfg: { feePer100: 600 } } }),
  V('buy', 'Cidade e ordens de compra', ['buyCity', 'useOrders'], 'applied', 'cost', buy, { probe: { cfg: { useOrders: true } } }),
  V('route', 'Rota de produção', ['route'], 'applied', 'cost', route, { probe: { cfg: { route: 'all' } } }),
  V('mat-prices', 'Preço e idade de cada material', [], 'applied', 'cost', matPrices),
  V('sell', 'Saída e modo de venda', ['sellCity', 'sellMode'], 'applied', 'profit', sell, { probe: { cfg: { sellMode: 'instant' } } }),
  V('tax', 'Premium, imposto e taxa de criação', [], 'applied', 'profit', tax, { probe: { settings: { premium: false }, cfg: {} } }),
  V('no-tax', 'Venda sem imposto', ['noTax'], 'applied', 'profit', noTax, { probe: { cfg: { noTax: { 'Refino|order': true } } } }),
  V('qty', 'Quantidade do lote', ['qty'], 'applied', 'cost', qty, { probe: { base: { extras: [{ name: 'Lote', value: '1000', scope: 'lote' }] }, cfg: { qty: 200 } } }),
  V('relist', 'Atualizações da ordem de venda', ['relists', 'relistStep', 'relistBase'], 'applied', 'profit', (ctx) => relistRow({ relist: ctx.relist, best: ctx.cur ? { mode: ctx.cur.mode, noTax: ctx.noTax === true } : null, issues: ctx.issues }), { probe: { base: { sellCity: 'Martlock' }, cfg: { relists: '3', relistStep: '10' } } }),
  V('extras', 'Despesas extras', ['extras'], 'applied', 'cost', extras, { probe: { cfg: { extras: [{ name: 'Transporte', value: '10', scope: 'craft' }] } } }),
  V('focus-points', 'Foco como custo em pontos', ['focusEff', 'focusPoints', 'focusBudget', 'focusRef'], 'info-only', 'none', focusPoints, { probe: { cfg: { focusEff: '10000' } } }),
  V('not-considered', 'NÃO consideradas', [], 'not-considered', 'none', notConsidered, { section: 'NÃO consideradas' }),
  ...targetVars(
    (ctx) => (ctx.cur ? ctx.cur.unit.cost + ctx.perUnitExtras : null),
    // o Refino tem uma saída só: o interruptor vale para os dois modos (como a tela passa ao cartão)
    (ctx) => ({ order: { on: ctx.noTax === true, city: ctx.cur?.sell.city ?? null }, instant: { on: ctx.noTax === true, city: ctx.cur?.sell.city ?? null } }),
  ),
  ...stressVars(),
];

registerScreen('refine', { cfgKeys: ['refine:cfg', 'target:cfg'], ignoredFields: {}, vars: refineVars });

/**
 * Monta o quadro do Refino com os objetos que a tela já calculou.
 * input = { cfg, vcfg, issues, cur, info, ench, specialty, autoRRR, rrrValue, perUnitExtras, noTax, route, premium, now, feeCeiling }
 * (cur = evaluateTier da tela; null sem preços). Nunca lança: dado ilegível vira linha "não foi possível ler".
 */
export function auditRefine(input) {
  const i = input ?? {};
  const cfg = isObj(i.cfg) ? i.cfg : {};
  return auditScreen('refine', { ...i, cfg, vcfg: isObj(i.vcfg) ? i.vcfg : cfg, issues: i.issues ?? [], maxAgeH: DEFAULT_MAX_AGE_H });
}
