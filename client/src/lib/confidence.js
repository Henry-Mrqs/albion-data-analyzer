// IDEIA-012: confiança do preço (outlier, dado velho, preço isolado). Puro. Só MARCA: nenhum número do app muda.
// Todos os limiares abaixo são REGRA DO APP (decisão de produto, D-059), não dado do jogo; ficam juntos para ajuste fácil.
import { DEFAULT_MAX_AGE_H } from './exits';
import { HISTORY_DAYS, PRICE_ABOVE_MEDIAN_WARN, median, windowOf, windowStats } from './liquidity';

export const STALE_H = DEFAULT_MAX_AGE_H; // dado com mais de 24 h: "confira"
export const VERY_STALE_H = 72; // dado com mais de 72 h: "desconfie"
export const HISTORY_STALE_DAYS = 7; // último registro do histórico mais velho que isto
export const BELOW_MEDIAN = -0.5; // preço mais de 50% abaixo da mediana
export const ABOVE_MEDIAN = PRICE_ABOVE_MEDIAN_WARN; // +20% (a mesma constante do alerta do Giro)
export const VERY_ABOVE_MEDIAN = 1.0; // +100%
export const UNSTABLE_MAD = 0.25; // MAD / mediana acima disto: histórico instável
export const Z_CUT = 3.5; // corte do z modificado
export const MAD_FLOOR = 0.05; // piso do MAD: 5% da mediana (evita dividir por 0 em série constante)
export const Z_SCALE = 0.6745;

const H = 3600000;
const DAY_MS = 86400000;
const num = (x) => typeof x === 'number' && Number.isFinite(x);
const pct = (x) => Math.round(Math.abs(x) * 100);
const dec1 = (x) => x.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Estatística da janela de dias completos: state de windowStats ('unloaded' se a série não foi pedida), mediana e MAD dos dias com dado. */
export function seriesStats(series, { now = Date.now(), days = HISTORY_DAYS } = {}) {
  if (series === undefined) return { state: 'unloaded', median: null, mad: null, points: 0, lastRecord: null, days };
  const w = windowStats(series, { now, days });
  let med = null;
  let mad = null;
  if (Array.isArray(series) && w.points > 0) {
    const { fromMs, toMs } = windowOf(now, days);
    const ps = series.filter((x) => x && x.t >= fromMs && x.t < toMs && num(x.p)).map((x) => x.p);
    if (ps.length) {
      med = median(ps);
      mad = median(ps.map((p) => Math.abs(p - med)));
    }
  }
  const lastRecord = w.lastRecord != null && Number.isFinite(w.lastRecord) ? w.lastRecord : null;
  return { state: w.state, median: med, mad, points: w.points, lastRecord, days };
}

const TEXT = {
  nodate: () => 'sem data de registro',
  stale: (o) => `dado com mais de ${o.maxAgeH} h`,
  verystale: () => `dado com mais de ${VERY_STALE_H} h`,
  nobuyer: () => 'sem ordem de compra visível',
  'single-level': (o) => (o.buyer === false ? 'nível de preço único (menor = maior) e sem comprador visível' : 'nível de preço único (menor = maior)'),
  above: (o) => `${pct(o.vs)}% acima da mediana de ${o.days} dias`,
  'above-high': (o) => `${pct(o.vs)}% acima da mediana de ${o.days} dias`,
  below: (o) => `${pct(o.vs)}% abaixo da mediana de ${o.days} dias`,
  outlier: (o) => `fora do padrão da série (z ${dec1(o.z)})`,
  unstable: (o) => `histórico instável (desvio ${pct(o.rel)}% da mediana)`,
  sparse: (o) => `histórico com poucos dias (${o.points} de ${o.days})`,
  nohistory: () => 'sem histórico registrado',
  'hist-old': (o) => `último registro do histórico há ${o.ago} dias`,
  unloaded: () => 'histórico não carregado: sem verificação de outlier',
};

const LOW = new Set(['nodate', 'verystale', 'above-high', 'below', 'outlier', 'hist-old']);
const LABEL = { alta: 'preço confiável', media: 'confira', baixa: 'desconfie', nenhuma: 'sem preço' };
export const sealLabel = (level) => LABEL[level] ?? '';

/**
 * Confiança de um preço. { price, date, sellMax, buyer, side } e stats = seriesStats(...).
 * side 'exit' (onde você vende) avalia também comprador e nível único; 'cost' (material que você compra) não.
 * Retorna { level: 'alta'|'media'|'baixa'|'nenhuma', reasons: [{ code, text }], z, vsMedian }.
 */
export function priceConfidence({ price, date, sellMax = null, buyer = null, side = 'exit' } = {}, stats, { now = Date.now(), maxAgeH = STALE_H, zCut = Z_CUT } = {}) {
  if (!num(price) || !(price > 0)) return { level: 'nenhuma', reasons: [], z: null, vsMedian: null };
  const codes = [];
  const ctx = { maxAgeH, buyer, days: stats?.days ?? HISTORY_DAYS, points: stats?.points ?? 0 };
  let z = null;
  let vsMedian = null;

  // idade do dado
  if (!num(date) || !(date > 0)) codes.push('nodate');
  else {
    const age = now - date;
    if (age > VERY_STALE_H * H) codes.push('verystale');
    else if (maxAgeH > 0 && age > maxAgeH * H) codes.push('stale');
  }
  // comprador e nível único (só na saída)
  if (side === 'exit') {
    if (buyer === false) codes.push('nobuyer');
    if (num(sellMax) && sellMax === price) codes.push('single-level');
  }
  // histórico
  const st = stats && stats.state ? stats : { state: 'unloaded' };
  if (st.state === 'unloaded') codes.push('unloaded');
  else if (st.state === 'nodata') codes.push('nohistory');
  else if (st.state === 'idle') {
    ctx.ago = num(st.lastRecord) ? Math.floor((now - st.lastRecord) / DAY_MS) : null;
    codes.push(ctx.ago != null && ctx.ago > HISTORY_STALE_DAYS ? 'hist-old' : 'nohistory');
  } else if (st.state === 'sparse') codes.push('sparse');
  else if (num(st.median) && st.median > 0) {
    vsMedian = price / st.median - 1;
    ctx.vs = vsMedian;
    const mad = num(st.mad) ? st.mad : 0;
    z = (Z_SCALE * (price - st.median)) / Math.max(mad, MAD_FLOOR * st.median);
    ctx.z = z;
    ctx.rel = mad / st.median;
    const unstable = ctx.rel > UNSTABLE_MAD;
    if (vsMedian > VERY_ABOVE_MEDIAN) codes.push('above-high');
    else if (vsMedian > ABOVE_MEDIAN) codes.push('above');
    else if (vsMedian < BELOW_MEDIAN) codes.push('below');
    if (Math.abs(z) > zCut) codes.push('outlier');
    if (unstable) codes.push('unstable');
  } else codes.push('nohistory');

  // ordem de exibição fixa
  const ORDER = ['nodate', 'stale', 'verystale', 'nobuyer', 'single-level', 'above', 'above-high', 'below', 'outlier', 'unstable', 'sparse', 'nohistory', 'hist-old', 'unloaded'];
  codes.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const reasons = codes.map((code) => ({ code, text: TEXT[code](ctx) }));
  const has = (c) => codes.includes(c);
  const low = codes.some((c) => LOW.has(c)) || (has('nobuyer') && has('single-level')) || (has('above') && has('unstable'));
  const level = low ? 'baixa' : codes.length ? 'media' : 'alta';
  return { level, reasons, z, vsMedian };
}

/** O selo aparece? Não, se a única razão é "histórico não carregado" (evita um "confira" em toda célula) ou se não há preço. */
export function sealVisible(conf) {
  if (!conf || conf.level === 'nenhuma') return false;
  return !(conf.reasons.length === 1 && conf.reasons[0].code === 'unloaded');
}
