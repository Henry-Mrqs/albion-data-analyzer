// IDEIA-065: preço de saída realista. Quando o menor preço de venda listado passa de k × a mediana dos preços médios diários
// dos últimos N dias completos, o lucro usa k × mediana. Puro. k = 1,25 e N = 7 são ESCOLHAS DO APP (regra do app, sem fonte de jogo).
import { HISTORY_DAYS, MIN_POINTS_IN_WINDOW } from './liquidity';
import { br, echoValue } from './inputRules';

export const ANCHOR_K = 1.25;
export const ANCHOR_DAYS = HISTORY_DAYS;
export const ANCHOR_DEFAULT_ON = true; // padrão ligado (D-071); uma linha para virar desligado
export const ANCHOR_K_MAX = 10;
export const ANCHOR_DAYS_MAX = 30;

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const isEmpty = (x) => x == null || (typeof x === 'string' && x.trim() === '');
const toNum = (x) => (typeof x === 'number' || typeof x === 'string' ? Number(String(x).trim()) : NaN);

/** Lê anchorOn, anchorK e anchorDays de uma cfg (bruta) e devolve valores limpos + avisos (formato de inputRules). Nunca lança. */
export function cleanAnchor(cfg) {
  const c = isObj(cfg) ? cfg : {};
  const issues = [];
  const add = (field, level, code, msg, raw, used) => issues.push({ field, level, code, msg, raw, used });

  let on = ANCHOR_DEFAULT_ON;
  if (c.anchorOn != null) {
    if (typeof c.anchorOn === 'boolean') on = c.anchorOn;
    else add('anchorOn', 'warn', 'anchorOn-invalid', `Interruptor do preço realista inválido: usando ${ANCHOR_DEFAULT_ON ? 'ligado' : 'desligado'}.`, c.anchorOn, ANCHOR_DEFAULT_ON);
  }

  let k = ANCHOR_K;
  if (!isEmpty(c.anchorK)) {
    const n = toNum(c.anchorK);
    if (!Number.isFinite(n) || n < 1) {
      add('anchorK', 'warn', 'anchorK-invalid', `k${echoValue(c.anchorK)} inválido (use de 1 a ${ANCHOR_K_MAX}; abaixo de 1 o teto ficaria abaixo da mediana): usando ${br(ANCHOR_K)}.`, c.anchorK, ANCHOR_K);
    } else if (n > ANCHOR_K_MAX) {
      k = ANCHOR_K_MAX;
      add('anchorK', 'warn', 'anchorK-max', `k ${br(n)} acima do limite de ${ANCHOR_K_MAX}: usando ${ANCHOR_K_MAX}.`, c.anchorK, k);
    } else k = n;
  }

  let days = ANCHOR_DAYS;
  if (!isEmpty(c.anchorDays)) {
    const n = toNum(c.anchorDays);
    if (!Number.isFinite(n) || n < MIN_POINTS_IN_WINDOW) {
      add('anchorDays', 'warn', 'anchorDays-invalid', `N${echoValue(c.anchorDays)} inválido (use de ${MIN_POINTS_IN_WINDOW} a ${ANCHOR_DAYS_MAX} dias): usando ${ANCHOR_DAYS}.`, c.anchorDays, ANCHOR_DAYS);
    } else if (n > ANCHOR_DAYS_MAX) {
      days = ANCHOR_DAYS_MAX;
      add('anchorDays', 'warn', 'anchorDays-max', `N ${br(n)} acima do limite de ${ANCHOR_DAYS_MAX} dias: usando ${ANCHOR_DAYS_MAX}.`, c.anchorDays, days);
    } else {
      days = Math.floor(n);
      if (days !== n) add('anchorDays', 'warn', 'anchorDays-decimal', `N ${br(n)} não é inteiro: usando ${days}.`, c.anchorDays, days);
    }
  }
  return { values: { on, k, days }, issues };
}

/**
 * Decide o preço de saída realista. stats = saída de windowStats/loadedStats (a mesma mediana do Giro, com `days` parametrizável).
 * state: 'anchored' (listado > k × mediana: price = teto) | 'listed' | 'nohistory' | 'unloaded' | 'invalid'.
 */
export function realisticPrice({ listed, stats, k = ANCHOR_K }) {
  const base = { price: 0, listed, state: 'invalid', ceiling: null, median: null, points: stats?.points ?? 0 };
  if (typeof listed !== 'number' || !Number.isFinite(listed) || !(listed > 0)) return base;
  const out = { ...base, price: listed };
  if (!stats || stats.state === 'unloaded') return { ...out, state: 'unloaded' };
  const med = stats.medianPrice;
  if (!['ok', 'low', 'none'].includes(stats.state) || !(typeof med === 'number' && med > 0)) return { ...out, state: 'nohistory' };
  const ceiling = k * med;
  if (listed > ceiling) return { ...out, state: 'anchored', price: ceiling, ceiling, median: med };
  return { ...out, state: 'listed', ceiling, median: med };
}
