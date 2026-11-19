// IDEIA-005: auditor do Craft. Cada build LÊ o que computeCraft (e as funções que a tela já chama) usou; nenhuma fórmula é copiada (V1).
// Inclui as seções Preço-alvo, Estresse e Comparar cidades, que vivem na tela do Craft.
import { REFINING, refinedTypeOf } from '../catalog';
import { cityLabel } from '../market';
import { feeIsUnconfirmedDefault, rrr as calcRRR } from '../econ';
import { cleanCraftCfg } from '../inputRules';
import { keyOf } from '../craftPlan';
import { feeDecides, FEE_DEPENDENCE_WARNING, returnBadge, variantLabel } from '../recipeAlt';
import { DAILY_NOTE, RESET_UTC_HOUR } from '../dailyBonus';
import { DEFAULT_MAX_AGE_H } from '../exits';
import { focusValues } from '../focus';
import { pbParts } from '../rrrCalc';
import { SERVERS } from '../settings';
import { apiRow, correctionNote, joinNote, notConsideredRows, plain, row, stressVars, targetVars, taxRows } from './core';
import { auditScreen, registerScreen } from './registry';

const SRC = {
  pb: 'dump craftingmodifiers.xml (alta)',
  focus: 'regra do servidor, não está no dump (média-alta)',
  daily: 'AUDITORIA-001, wiki e AFM 2026 (média-alta)',
  rrr: 'RRR = PB ÷ (100 + PB) (alta)',
  fee: 'valor × 0,1125 × taxa ÷ 100 (alta)',
};

const isObj = (x) => x != null && typeof x === 'object' && !Array.isArray(x);
const join = joinNote;
const flat = (lines = []) => lines.flatMap((l) => (l.sub ? flat(l.sub.lines) : [l]));

// melhor saída exatamente como a tela a mostra (anotada por exits.js::annotateOptions)
const bestOpt = (ctx) => {
  const b = ctx.result?.best;
  return b ? (ctx.opts ?? []).find((o) => o.city === b.city && o.mode === b.mode) ?? b : null;
};

// ---------- as linhas ----------

const recipe = (ctx) => {
  const v = ctx.variant;
  if (!v || v.count <= 1) return row({ id: 'recipe', label: 'Receita', value: 'única do catálogo', unit: '', origin: 'game', status: 'applied', source: 'dump do jogo' });
  if (v.auto) {
    return row({
      id: 'recipe', label: 'Receita escolhida', value: `${v.label} (a mais barata de ${v.count})`, unit: '', origin: 'derived', source: 'dump do jogo',
      status: v.feeDepends ? 'unconfirmed' : 'applied', note: v.feeDepends ? `Escolha automática: ${FEE_DEPENDENCE_WARNING}.` : 'Escolha automática pelo custo total (material + taxa de bancada).',
    });
  }
  return row({ id: 'recipe', label: 'Receita escolhida', value: `${v.label} (escolhida por você)`, unit: '', origin: 'user', status: 'applied', source: 'dump do jogo' });
};

const crafts = (ctx) =>
  row({ id: 'crafts', label: 'Nº de crafts', value: ctx.result.rates.crafts, unit: 'crafts', origin: 'user', status: 'applied', note: correctionNote(ctx.issues, 'crafts') });

const city = (ctx) => {
  const rates = ctx.result.rates;
  const informed = ctx.cfg.specialty !== null && ctx.cfg.specialty !== undefined;
  const parts = pbParts({ kind: 'craft', specialty: rates.specialty, focus: false, daily: 0 });
  return [
    row({
      id: 'craft-city', label: 'Cidade de craft', value: ctx.used.craftCity, unit: '', origin: 'user', status: 'applied',
      note: ctx.bonusCity ? `Cidade de bônus do item: ${ctx.bonusCity}.` : 'Sem cidade de bônus conhecida para este item.',
    }),
    row({
      id: 'specialty', label: rates.specialty ? 'Especialização da cidade (+15)' : 'Especialização da cidade', value: parts.specialty, unit: 'PB', origin: informed ? 'user' : 'derived', status: 'applied', source: SRC.pb,
      note: rates.specialty ? (informed ? 'Marcada por você.' : 'Regra do item: a cidade de craft é a cidade de bônus.') : informed ? 'Desmarcada por você.' : 'A cidade de craft não é a cidade de bônus do item.',
    }),
  ];
};

const rrrBase = () => {
  const p = pbParts({ kind: 'craft', specialty: false, focus: false });
  return row({ id: 'rrr-base', label: 'Base de produção', value: p.base, unit: 'PB', origin: 'game', status: 'applied', source: SRC.pb, note: 'Retorno de recursos = PB ÷ (100 + PB), com PB = bônus de produção.' });
};

const focus = (ctx) => {
  const on = !!ctx.used.focus;
  const p = pbParts({ kind: 'craft', specialty: ctx.result.rates.specialty, focus: on });
  return row({ id: 'focus', label: 'Foco do craft', value: p.focus, unit: 'PB', origin: 'user', status: 'applied', source: SRC.focus, note: on ? 'Ligado: +59 de bônus de produção. A regra vem do servidor e não está no dump.' : 'Desligado.' });
};

const daily = (ctx) => {
  const d = ctx.daily ?? { value: 0, stale: false, future: false };
  const informed = +ctx.cfg.craftDaily || 0;
  const usedValue = +ctx.used.craftDaily || 0;
  const p = pbParts({ kind: 'craft', specialty: ctx.result.rates.specialty, focus: !!ctx.used.focus, daily: usedValue });
  const meaning = 'É o bônus de produção +10/+20 que você informa, não o diário de ofício (journal).';
  const base = { id: 'daily', label: 'Bônus diário do craft (+10/+20)', value: p.daily, unit: 'PB', origin: 'user', source: SRC.daily };
  if (d.stale) return row({ ...base, status: 'stale', statusText: 'expirado', note: join(`Usando 0 (digitado ${informed}, passou do reset do servidor às ${RESET_UTC_HOUR[ctx.server]}:00 UTC). Escolha o bônus de hoje de novo para confirmar`, meaning) });
  if (d.future) return row({ ...base, status: 'stale', statusText: 'data inválida', note: join(`Usando 0 (digitado ${informed}, mas a data do bônus está no futuro)`, meaning) });
  if (usedValue > 0) return row({ ...base, status: 'applied', note: join(DAILY_NOTE, correctionNote(ctx.issues, 'craftDaily'), meaning) });
  return row({ ...base, status: 'applied', note: join('Nenhum bônus diário', correctionNote(ctx.issues, 'craftDaily'), meaning) });
};

const customRRR = (ctx) => {
  const r = ctx.result.rates;
  const manual = ctx.used.customRRR !== '' && ctx.used.customRRR != null;
  const parts = pbParts({ kind: 'craft', specialty: r.specialty, focus: !!ctx.used.focus, daily: +ctx.used.craftDaily || 0 });
  const pb = parts.base + parts.specialty + parts.focus + parts.daily;
  return [
    row({
      id: 'custom-rrr', label: 'RRR manual', value: manual ? r.craftRRR * 100 : 'não informado', unit: manual ? '%' : '', origin: manual ? 'user' : 'derived', status: 'applied',
      note: join(manual ? `Substitui o RRR automático (${(r.autoRRR * 100).toFixed(2).replace('.', ',')}%).` : 'Usando o RRR automático.', correctionNote(ctx.issues, 'customRRR')),
    }),
    row({
      id: 'rrr-final', label: 'RRR final do craft', value: r.craftRRR * 100, unit: '%', origin: 'derived', status: 'applied', source: SRC.rrr,
      note: manual ? 'Valor manual em uso.' : `PB total ${pb.toFixed(0)}.`,
    }),
  ];
};

// o RRR do refino vem de rates.refineRRRFor (line.rr); a regra que valeu (+40 ou não) é lida comparando com o rrr() das duas hipóteses
const refineSpecialtyOn = (rr, type, ctx) => Math.abs(rr - calcRRR({ kind: 'refine', specialty: true, focus: ctx.used.refineFocus, daily: +(ctx.used.refineDaily?.[type] ?? 0) })) < 1e-9;

const refineTypes = (ctx) => {
  const seen = new Map();
  for (const l of ctx.result.lines) if (l.canRefine) seen.set(refinedTypeOf(l.uniq), l);
  return [...seen.entries()];
};

const refineRRR = (ctx) => {
  const list = refineTypes(ctx);
  if (!list.length) return row({ id: 'refine-rrr', label: 'RRR do refino dos materiais', value: 'não se aplica', unit: '', origin: 'derived', status: 'info-only', note: 'Esta receita não usa material refinável.' });
  const auto = ctx.used.refineCity === 'auto';
  return list.map(([type, l]) => {
    const made = ctx.result.lines.some((x) => x.canRefine && refinedTypeOf(x.uniq) === type && x.useRefine);
    const spec = refineSpecialtyOn(l.rr, type, ctx);
    const d = +(ctx.used.refineDaily?.[type] ?? 0);
    const rule = spec
      ? `especialização +40 aplicada: ${auto ? 'cada recurso na sua cidade de bônus' : `refina em ${ctx.used.refineCity}`}`
      : `sem especialização: refina em ${ctx.used.refineCity}, e a cidade de bônus de ${REFINING[type].label} é ${REFINING[type].city}`;
    return row({
      id: `refine-rrr-${type}`, label: `RRR do refino · ${REFINING[type].label}`, value: l.rr * 100, unit: '%', origin: 'derived', source: SRC.rrr,
      status: made ? 'applied' : 'info-only',
      note: join(made ? rule : 'Você compra este material pronto: este RRR não entra no custo', ctx.used.refineFocus ? 'com foco' : 'sem foco', d ? `bônus diário +${d}` : undefined, correctionNote(ctx.issues, `refineDaily.${type}`)),
    });
  });
};

const nonReturn = (ctx) =>
  ctx.result.lines
    .filter((l) => !l.returnable)
    .map((l) => {
      const b = returnBadge(l);
      return row({
        id: `no-return-${l.uniq}`, label: `Não retorna · ${l.name}`, value: 'não retorna', unit: '', origin: 'game', source: 'dump do jogo (maxreturnamount = 0)',
        status: l.unverified ? 'unconfirmed' : 'applied', statusText: l.unverified ? 'não verificado' : undefined,
        note: b.title ?? 'Entra no custo inteiro, sem desconto de RRR.',
      });
    });

const benchFee = (ctx) => {
  const unconfirmed = feeIsUnconfirmedDefault(ctx.used.feePer100, ctx.cfg.feeSet);
  return [
    row({
      id: 'bench-fee', label: 'Taxa da bancada (por 100 de nutrição)', value: ctx.used.feePer100, unit: 'prata', origin: unconfirmed ? 'app-default' : 'user', status: unconfirmed ? 'unconfirmed' : 'applied',
      note: join(unconfirmed ? 'Padrão do app (400), NÃO confirmado: confira na sua bancada e digite o valor real' : undefined, correctionNote(ctx.issues, 'feePer100')),
    }),
    row({
      id: 'bench-fee-paid', label: 'Taxa da bancada cobrada no lote', value: ctx.result.fee, unit: 'prata', origin: 'derived', status: 'applied', source: SRC.fee,
      note: 'Valor do item (soma dos ingredientes, incluindo o artefato: NÃO VERIFICADO) × 0,1125 × taxa ÷ 100; arredondado no total do lote.',
    }),
  ];
};

const refineFee = (ctx) => {
  if (!refineTypes(ctx).length) return null;
  const made = ctx.result.lines.some((l) => l.useRefine);
  const unconfirmed = feeIsUnconfirmedDefault(ctx.used.refineFee, ctx.cfg.refineFeeSet);
  return row({
    id: 'refine-fee', label: 'Taxa da bancada do refino (por 100 de nutrição)', value: ctx.used.refineFee, unit: 'prata', origin: unconfirmed ? 'app-default' : 'user',
    status: !made ? 'info-only' : unconfirmed ? 'unconfirmed' : 'applied',
    note: join(!made ? 'Nenhum material é refinado por você: esta taxa não entra no custo' : undefined, unconfirmed ? 'Padrão do app (400), NÃO confirmado' : undefined, correctionNote(ctx.issues, 'refineFee')),
  });
};

const ROUTE = { buy: 'comprar pronto', all: 'produzir tudo', best: 'melhor (o mais barato em cada nível)' };
const refineRoute = (ctx) =>
  ctx.result.lines
    .filter((l) => l.canRefine)
    .map((l) => {
      const chosen = ctx.used.refine?.[keyOf(l.uniq)];
      return row({
        id: `route-${l.uniq}`, label: `Rota · ${l.name}`, value: `${ROUTE[l.mode]}${l.mode === 'best' ? (l.useRefine ? ' → produz' : ' → compra pronto') : ''}`, unit: '', origin: chosen === undefined ? 'app-default' : 'user', status: 'applied',
      });
    });

const matSource = (ctx) => [
  row({ id: 'mat-city', label: 'Cidade de compra dos materiais', value: ctx.used.matCity === 'best' ? 'a mais barata de cada material' : ctx.used.matCity, unit: '', origin: ctx.used.matCity === 'best' ? 'app-default' : 'user', status: 'applied' }),
  row({
    id: 'use-orders', label: 'Compra com ordens de compra', value: ctx.used.useOrders ? 'sim' : 'não', unit: '', origin: 'user', status: 'applied',
    note: ctx.used.useOrders ? 'Paga 2,5% de taxa de criação sobre o preço da ordem.' : 'Compra pelo menor preço de venda, sem taxa de criação.',
  }),
];

const matPrices = (ctx) => {
  const rows = [];
  for (const l of ctx.result.lines) {
    if (l.sub) rows.push(row({ id: `made-${l.uniq}`, label: `Custo de produção · ${l.name}`, value: l.unit, unit: 'prata', origin: 'derived', status: 'applied', note: 'Calculado pelos preços da cadeia de refino (linhas abaixo).' }));
    else rows.push(apiRow({ id: `price-${l.uniq}`, label: `Preço · ${l.name}`, price: l.unit, date: l.date, now: ctx.now, maxAgeH: ctx.maxAgeH, note: l.city ? cityLabel(l.city) : undefined }));
  }
  for (const l of ctx.result.lines.filter((x) => x.sub)) {
    for (const s of flat(l.sub.lines)) rows.push(apiRow({ id: `price-${l.uniq}-${s.mid}`, label: `Preço · ${s.name} (cadeia de ${l.name})`, price: s.unit, date: s.date, now: ctx.now, maxAgeH: ctx.maxAgeH, note: s.city ? cityLabel(s.city) : undefined }));
  }
  return rows;
};

const premium = (ctx) => {
  const b = ctx.result.best;
  const ok = b && b.price > 0 && ctx.result.units > 0;
  return taxRows({ premium: ctx.premium, sale: b ? { mode: b.mode, noTax: b.noTax, factor: ok ? b.net / (b.price * ctx.result.units) : NaN } : null });
};

const exit = (ctx) => {
  const b = ctx.result.best;
  if (!b) return row({ id: 'exit', label: 'Saída (onde vender)', value: null, unit: 'prata', origin: 'api', status: 'not-considered', note: 'sem preço de venda deste item em nenhuma cidade' });
  const o = bestOpt(ctx);
  const r = apiRow({ id: 'exit', label: `Saída: ${cityLabel(b.city)} · ${b.label}`, price: b.price, date: b.date, now: ctx.now, maxAgeH: ctx.maxAgeH });
  const illusory = o.illusory ? 'Ilusória: ordem de venda sem ordem de compra visível na cidade' : undefined;
  // a idade manda no estado ("velha"); "ilusória" fica na nota quando as duas valem
  if (o.stale || r.status === 'stale') return { ...r, status: 'stale', note: join(r.note, o.stale && r.status !== 'stale' ? 'dado velho' : undefined, illusory) };
  if (o.illusory) return { ...r, status: 'unconfirmed', statusText: 'ilusória', note: join(r.note, illusory) };
  return r;
};

const noTax = (ctx) => {
  const b = ctx.result.best;
  const marked = Object.values(isObj(ctx.used.noTax) ? ctx.used.noTax : {}).filter((v) => v === true).length;
  return row({
    id: 'no-tax', label: 'Venda sem imposto (fora do mercado)', value: b?.noTax ? 'sim, na melhor saída' : 'não', unit: '', origin: 'user', status: 'applied',
    note: join(marked ? `${marked} saída(s) marcada(s); a marca vale por cidade e modo, para todos os itens` : undefined, b?.noTax ? 'Sem imposto e sem taxa de criação' : undefined),
  });
};

const extras = (ctx) =>
  row({
    id: 'extras', label: 'Despesas extras', value: ctx.result.extras, unit: 'prata', origin: 'user', status: 'applied',
    note: join(ctx.result.extrasList?.length ? `${ctx.result.extrasList.length} despesa(s), no lote` : 'Nenhuma despesa digitada', correctionNote(ctx.issues, 'extras')),
  });

const focusPoints = (ctx) => {
  const { values, issues } = focusValues(ctx.cfg);
  const parts = [];
  if (values.efficiency > 0) parts.push(`eficiência ${values.efficiency}`);
  if (values.override > 0) parts.push(`foco por craft ${values.override}`);
  if (values.budget > 0) parts.push(`foco disponível ${values.budget}`);
  if (values.reference > 0) parts.push(`1 ponto = ${values.reference} prata`);
  return row({
    id: 'focus-points', label: 'Foco como custo em pontos', value: parts.length ? parts.join(' · ') : 'não informado', unit: '', origin: 'user', status: 'info-only',
    note: join('Não muda o lucro: só o interruptor "Usar foco" muda o custo', correctionNote(issues, 'focusEff')),
  });
};

const share = (ctx) =>
  row({ id: 'share', label: 'Parte do mercado que você espera capturar', value: plain(ctx.cfg.share), unit: plain(ctx.cfg.share) === 'não informado' || plain(ctx.cfg.share) === '(valor inválido)' ? '' : '%', origin: 'user', status: 'info-only', note: 'Só estima os dias para vender o lote (Giro); não muda o lucro.' });

const waitCost = (ctx) =>
  row({ id: 'wait-cost', label: 'Custo de esperar o bônus do dia', value: plain(ctx.cfg.waitCost), unit: plain(ctx.cfg.waitCost) === 'não informado' || plain(ctx.cfg.waitCost) === '(valor inválido)' ? '' : 'prata', origin: 'user', status: 'info-only', note: 'Só decide o veredito "vale esperar"; não muda o lucro.' });

const compareInfo = (ctx) => {
  if (!ctx.compare) return null;
  const own = ctx.cfg.cityScenario === 'own';
  const perCity = ctx.compare.rows.filter((r) => r.feeSource === 'city').length;
  const generalDefault = feeIsUnconfirmedDefault(ctx.used.feePer100, ctx.cfg.feeSet);
  return [
    row({ id: 'compare-scenario', label: 'Materiais na comparação de cidades', value: own ? 'comprados na própria cidade de craft' : 'na cidade mais barata de cada material', unit: '', origin: ctx.cfg.cityScenario === undefined ? 'app-default' : 'user', status: 'info-only' }),
    row({
      id: 'compare-fee', label: 'Taxa de bancada por cidade na comparação', value: perCity ? `${perCity} cidade(s) com taxa própria; as outras usam a geral` : 'taxa geral em todas as cidades', unit: '', origin: perCity ? 'user' : 'derived', status: 'info-only',
      note: generalDefault ? 'A taxa geral (400) é padrão do app, não confirmada: valendo em todas as cidades sem taxa própria, ela esconde diferenças reais entre bancadas.' : undefined,
    }),
  ];
};

const compareRrr = (ctx) => {
  if (!ctx.compare) return null;
  const manual = ctx.used.customRRR !== '' && ctx.used.customRRR != null;
  return [
    row({
      id: 'compare-rrr', label: manual ? 'RRR manual ignorado na comparação' : 'RRR manual na comparação', value: manual ? `${ctx.used.customRRR}% ignorado` : 'desligado', unit: '', origin: manual ? 'user' : 'app-default', status: manual ? 'not-considered' : 'info-only',
      note: 'A comparação sempre usa o RRR automático de cada cidade; a especialização vem da regra do item.',
    }),
    row({ id: 'compare-sale', label: 'Venda e transporte na comparação', value: 'não considerados', unit: '', origin: 'app-default', status: 'not-considered', note: 'Compara só o custo de produzir em cada cidade; não inclui venda nem transporte entre cidades.' }),
  ];
};

const server = (ctx) =>
  row({
    id: 'server', label: 'Servidor', value: SERVERS[ctx.server] ?? String(ctx.server), unit: '', origin: 'user', status: 'applied',
    note: `Define de onde vêm os preços (AODP) e o reset do bônus diário (${RESET_UTC_HOUR[ctx.server] ?? '?'}:00 UTC).`,
  });

const notConsidered = () => notConsideredRows(['relists', 'transport', 'quality', 'journal', 'focusSilver', 'stock', 'drift', 'faction']);

// ---------- declaração (contrato) ----------
const cost = 'cost';
const V = (id, label, fields, kind, affects, build, extra = {}) => ({ id, label, fields, kind, affects, build, ...extra });

export const craftVars = [
  V('recipe', 'Receita escolhida', ['recipeVariant'], 'applied', cost, recipe, { probe: { scenario: 'staff', cfg: { recipeVariant: 1 } } }),
  V('crafts', 'Nº de crafts', ['crafts'], 'applied', cost, crafts, { probe: { cfg: { crafts: 5 } } }),
  V('city', 'Cidade de craft e especialização', ['craftCity', 'specialty'], 'applied', cost, city, { probe: { cfg: { specialty: false } } }),
  V('rrr-base', 'Base de produção', [], 'applied', cost, rrrBase),
  V('focus', 'Foco do craft', ['focus'], 'applied', cost, focus, { probe: { cfg: { focus: true } } }),
  V('daily', 'Bônus diário do craft', ['craftDaily', 'craftDailyAt'], 'applied', cost, daily, { probe: { cfg: { craftDaily: 20, craftDailyAt: '@now' } } }),
  V('custom-rrr', 'RRR manual e RRR final', ['customRRR'], 'applied', cost, customRRR, { probe: { cfg: { customRRR: '30' } } }),
  V('refine-rrr', 'RRR do refino dos materiais', ['refineCity', 'refineFocus', 'refineDaily'], 'applied', cost, refineRRR, { probe: { scenario: 'staff', base: { refine: { PLANKS: 'all' } }, cfg: { refineFocus: true } } }),
  V('non-return', 'Ingredientes que não retornam', [], 'applied', cost, nonReturn),
  V('bench-fee', 'Taxa de bancada', ['feePer100', 'feeSet'], 'applied', cost, benchFee, { probe: { cfg: { feePer100: 600 } } }),
  V('refine-fee', 'Taxa de bancada do refino', ['refineFee', 'refineFeeSet'], 'applied', cost, refineFee, { probe: { scenario: 'staff', base: { refine: { PLANKS: 'all' } }, cfg: { refineFee: 600 } } }),
  V('refine-route', 'Rota por material', ['refine'], 'applied', cost, refineRoute, { probe: { scenario: 'staff', cfg: { refine: { PLANKS: 'all', METALBAR: 'buy' } } } }),
  V('mat-source', 'Cidade e ordens de compra', ['matCity', 'useOrders'], 'applied', cost, matSource, { probe: { cfg: { useOrders: true } } }),
  V('mat-prices', 'Preço e idade de cada material', [], 'applied', cost, matPrices),
  V('premium', 'Premium, imposto e taxa de criação', [], 'applied', 'profit', premium, { probe: { settings: { premium: false }, cfg: {} } }),
  V('exit', 'Saída', [], 'applied', 'profit', exit),
  V('no-tax', 'Venda sem imposto', ['noTax'], 'applied', 'profit', noTax, { probe: { cfg: { noTax: { 'Caerleon|order': true } } } }),
  V('extras', 'Despesas extras', ['extras'], 'applied', cost, extras, { probe: { cfg: { extras: [{ name: 'Transporte', value: '230', scope: 'craft' }] } } }),
  V('focus-points', 'Foco como custo em pontos', ['focusEff', 'focusPoints', 'focusBudget', 'focusRef'], 'info-only', 'none', focusPoints, { probe: { cfg: { focusEff: '10000' } } }),
  V('share', 'Giro e parte do mercado', ['share'], 'info-only', 'none', share, { probe: { cfg: { share: '5' } } }),
  V('wait-cost', 'Custo de esperar', ['waitCost'], 'info-only', 'none', waitCost, { probe: { cfg: { waitCost: '100' } } }),
  V('compare-info', 'Comparar cidades', ['cityScenario', 'feeByCity'], 'info-only', 'none', compareInfo, { section: 'Comparar cidades', probe: { cfg: { cityScenario: 'own' } } }),
  V('compare-rrr', 'Comparar cidades: o que não entra', [], 'not-considered', 'none', compareRrr, { section: 'Comparar cidades' }),
  V('server', 'Servidor', [], 'applied', 'none', server),
  V('not-considered', 'NÃO consideradas', [], 'not-considered', 'none', notConsidered, { section: 'NÃO consideradas' }),
  ...targetVars((ctx) => ctx.result.unitCost),
  ...stressVars(),
];

registerScreen('craft', { cfgKeys: ['craft:cfg', 'target:cfg'], ignoredFields: {}, vars: craftVars });

/**
 * Monta o quadro do Craft com os objetos que a tela já calculou.
 * input = { cfg, cfgEff, daily, results, variants, idx, result, opts, compare, bonusCity, premium, server, now, feeCeiling }
 * Nunca lança: dado ilegível vira linha "não foi possível ler".
 */
export function auditCraft(input) {
  const i = input ?? {};
  const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };
  const cfg = isObj(i.cfg) ? i.cfg : {};
  const cfgEff = isObj(i.cfgEff) ? i.cfgEff : cfg;
  const used = safe(() => cleanCraftCfg(cfgEff, { premium: i.premium, feeCeiling: i.feeCeiling }).cfg, cfgEff);
  const count = i.variants?.length ?? 0;
  const auto = cfg.recipeVariant === undefined || cfg.recipeVariant === 'auto';
  const variant = safe(() => ({
    count, idx: i.idx, auto, label: variantLabel(i.variants[i.idx]?.swapped),
    feeDepends: count > 1 && auto && feeDecides(i.results).depends,
  }), { count, idx: i.idx, auto, label: 'Alternativa', feeDepends: false });
  const noTaxOn = Object.values(isObj(cfg.noTax) ? cfg.noTax : {}).some((v) => v === true);
  return auditScreen('craft', { ...i, cfg, cfgEff, used, variant, noTaxOn, issues: i.result?.issues ?? [], maxAgeH: DEFAULT_MAX_AGE_H });
}
