// Liquidez (IDEIA-010): vendas por dia a partir da série diária da API `history` do AODP.
// Puro: sem rede, sem React. Regra de produto sobre dado colaborativo da API, NÃO é regra do jogo.
// Série: [{ t: ms UTC do dia, n: item_count, p: avg_price }] (ver history.js).

// Constantes de produto (decisão D-034 do Gerente; nenhuma tem fonte de jogo). Ficam juntas para ajuste fácil.
export const HISTORY_API_DAYS = 29; // observado em 2026-11-19 (dossiê 011 H2); NÃO VERIFICADO se é fixo da API
export const HISTORY_DAYS = 7; // janela de dias COMPLETOS: termina na véspera (UTC); hoje, parcial, fica fora
export const NO_TURNOVER_PER_DAY = 5; // abaixo disto: "sem giro"
export const LOW_TURNOVER_PER_DAY = 15; // abaixo disto: "pouco giro"
// A API só traz os dias que têm registro: dia ausente pode ser falta de dado, não falta de venda.
// Com menos dias com dado que isto NÃO se classifica o giro ("dados insuficientes"), para não gerar falso "sem giro".
export const MIN_POINTS_IN_WINDOW = 3;
export const DEFAULT_SHARE_PCT = 10; // fatia do volume que você espera capturar
export const PRICE_ABOVE_MEDIAN_WARN = 0.2; // alerta de preço acima da mediana a partir de +20%

const DAY_MS = 86400000;

/** Janela de `days` dias UTC completos que terminam na véspera de `now`: [fromMs, toMs). */
export function windowOf(now, days = HISTORY_DAYS) {
  const toMs = Math.floor(now / DAY_MS) * DAY_MS;
  return { fromMs: toMs - days * DAY_MS, toMs };
}

export const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Estatística da janela. Estados:
 *  nodata  série inexistente/vazia (sem histórico: NÃO é sem giro)
 *  idle    há série, mas nenhum dia na janela (sem venda registrada)
 *  sparse  1 a MIN_POINTS_IN_WINDOW-1 dias com dado (dados insuficientes: sem veredito de giro)
 *  none / low / ok  pelos limiares de vendas por dia
 * volumePerDay = soma(n da janela) / windowDays (dias que a série cobre, ≤ days); dia sem registro conta 0. points = dias com dado (de windowDays).
 */
export function windowStats(series, { now = Date.now(), days = HISTORY_DAYS } = {}) {
  const base = { state: 'nodata', volumePerDay: 0, points: 0, windowDays: days, requestedDays: days, medianPrice: null, lastRecord: null };
  if (!Array.isArray(series) || !series.length) return base;
  const { fromMs, toMs } = windowOf(now, days);
  const inWin = series.filter((x) => x.t >= fromMs && x.t < toMs);
  const lastRecord = series.reduce((m, x) => Math.max(m, x.t), -Infinity);
  if (!inWin.length) return { ...base, state: 'idle', lastRecord };
  // Divisor: dias da janela que a série cobre (do 1º registro da série até o fim da janela, no máximo `days`).
  // Dia sem registro dentro desse intervalo conta 0 (D-034); NÃO é "dias com registro". Regra do app, sem fonte de jogo.
  const firstRecord = series.reduce((m, x) => Math.min(m, x.t), Infinity);
  const windowDays = Math.max(1, Math.min(days, Math.floor((toMs - Math.max(fromMs, firstRecord)) / DAY_MS)));
  const volumePerDay = inWin.reduce((a, x) => a + x.n, 0) / windowDays;
  const medianPrice = median(inWin.map((x) => x.p));
  const points = inWin.length;
  let state = 'ok';
  if (points < MIN_POINTS_IN_WINDOW) state = 'sparse';
  else if (volumePerDay < NO_TURNOVER_PER_DAY) state = 'none';
  else if (volumePerDay < LOW_TURNOVER_PER_DAY) state = 'low';
  return { state, volumePerDay, points, windowDays, requestedDays: days, medianPrice, lastRecord };
}

/** Dias para vender `qty` unidades capturando `sharePct`% do volume diário. null se não houver conta válida. */
export function daysToSell(qty, volumePerDay, sharePct) {
  const ok = (x) => Number.isFinite(x) && x > 0;
  if (!ok(qty) || !ok(volumePerDay) || !ok(sharePct)) return null;
  return qty / (volumePerDay * (sharePct / 100));
}

/** Preço contra a mediana, em fração (0,25 = 25% acima). null sem mediana válida. */
export function priceVsMedian(price, median) {
  if (!Number.isFinite(price) || !Number.isFinite(median) || median <= 0) return null;
  return price / median - 1;
}

const LABELS = {
  unloaded: 'giro não carregado',
  nodata: 'sem histórico',
  idle: 'sem venda registrada',
  sparse: 'dados insuficientes',
  none: 'sem giro',
  low: 'pouco giro',
  ok: 'giro ok',
};
export const verdictLabel = (state) => LABELS[state] ?? '';

const num1 = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ddmm = (ms) => {
  const d = new Date(ms);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

/**
 * Estatística de uma célula de `data[mid][cidade]` (formato de fetchHistory). Série ausente = histórico NÃO pedido
 * ('unloaded', nunca "sem histórico"); série [] = pedido e sem registros ('nodata'). Distinção exigida pela D-034.
 */
export function loadedStats(data, mid, city, opts) {
  const series = data?.[mid]?.[city];
  if (series === undefined) return { state: 'unloaded', volumePerDay: 0, points: 0, windowDays: opts?.days ?? HISTORY_DAYS, requestedDays: opts?.days ?? HISTORY_DAYS, medianPrice: null, lastRecord: null };
  return windowStats(series, opts);
}

/** "4 de 7 dias com dados": quantos dias da janela têm registro (dia ausente pode ser falta de dado, não de venda). */
export function coverageLabel(stats) {
  if (stats.state === 'unloaded') return '';
  if (stats.state === 'nodata') return verdictLabel('nodata');
  return `${stats.points} de ${stats.windowDays} dias com dados`;
}

/** Texto, tom e dica da célula "Giro". Só ok/low/none mostram número; sparse nunca vira "sem giro". */
export function giroText(stats) {
  const { state } = stats;
  if (state === 'unloaded') return { text: '—', tone: 'muted', title: 'Giro ainda não carregado para esta cidade: use "Carregar giro".' };
  if (state === 'idle') return { text: `${verdictLabel('idle')} (último ${ddmm(stats.lastRecord)})`, tone: 'muted', title: coverageLabel(stats) };
  if (state === 'ok' || state === 'low' || state === 'none') {
    const tone = { ok: 'good', low: 'warn', none: 'bad' }[state];
    const median = Number.isFinite(stats.medianPrice) ? ` · mediana do preço ${Math.round(stats.medianPrice).toLocaleString('pt-BR')}` : '';
    return { text: `${num1(stats.volumePerDay)}/dia`, tone, title: `${verdictLabel(state)} · ${coverageLabel(stats)}${median}` };
  }
  return { text: verdictLabel(state), tone: 'muted', title: coverageLabel(stats) };
}
