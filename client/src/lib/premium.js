// "Vale pagar Premium?" (IDEIA-054). Puro: sem React, fetch ou localStorage.
// Fórmula única do dossiê: saldo = TAX_SAVING·V + foco·dias·s − goldCost·G, com V = prata vendida no mercado por mês,
// s = prata por ponto de foco e G = preço do ouro. É economia de jogo; o app não recomenda a compra.
import { salesTax } from './econ';
import { DAILY_FOCUS_PREMIUM } from './focusConsts';
import { MAX_QTY, br, echoValue } from './inputRules';

/** P1 (confiança média, muda por patch): constante editável e datada. */
export const PREMIUM = {
  goldCost: 3750,
  days: 30,
  asOf: '2026-11-18',
  source: 'AO Refinery (aorefinery.com/gold) e trecho da wiki; fonte secundária, pode mudar por patch',
};

/** P5: diferença de imposto de mercado sem Premium e com Premium (8% − 4%), derivada de econ.js. */
export const TAX_SAVING = salesTax(false) - salesTax(true);

export const MAX_VOLUME = 1e15; // teto técnico do volume mensal (evita ∞/NaN)

/** P7: o que a AO Refinery não conta e este cálculo também não conta. */
export const NOT_COUNTED = [
  '+50% de prata e saque de monstros',
  'fama extra',
  'pontos de aprendizado',
  '+50% de rendimento de coleta',
  'ilhas e animais',
];

const isEmpty = (x) => x == null || (typeof x === 'string' && x.trim() === '');

/**
 * Valida os campos digitados. Corrige e avisa (nunca bloqueia). Vazio/ausente = padrão sem aviso.
 * Só texto e número são aceitos: objeto, array, booleano e função viram padrão com aviso, sem eco.
 */
export function cleanPremiumInputs(cfg) {
  const src = cfg !== null && typeof cfg === 'object' && !Array.isArray(cfg) ? cfg : {};
  const issues = [];
  const values = {};

  const field = (name, label, { fallback, min, max, exclusiveMin = false }) => {
    const raw = src[name];
    let used = fallback;
    if (isEmpty(raw)) {
      values[name] = used;
      return;
    }
    const n = typeof raw === 'string' || typeof raw === 'number' ? Number(String(raw).trim()) : NaN;
    const fb = fallback === null ? 'campo ausente' : `usando ${br(fallback)}`;
    const add = (code, msg) => issues.push({ field: name, level: 'warn', code, msg, raw, used });
    if (Number.isNaN(n)) add('nan', `${label}${echoValue(raw)} não é um número: ${fb}.`);
    else if (n < min || (exclusiveMin && n === min)) add('range', `${label}${echoValue(raw)} ${exclusiveMin ? 'precisa ser maior que' : 'não pode ser menor que'} ${br(min)}: ${fb}.`);
    else if (n > max) {
      used = max;
      add('max', `${label} ${Number.isFinite(n) ? br(n) : 'infinito'} acima do limite de ${br(max)}: usando ${br(max)}.`);
    } else used = n;
    values[name] = used;
  };

  field('gold', 'Preço do ouro', { fallback: null, min: 0, max: MAX_QTY, exclusiveMin: true });
  field('goldCost', 'Custo do Premium', { fallback: PREMIUM.goldCost, min: 0, max: MAX_QTY });
  field('volume', 'Prata vendida por mês', { fallback: 0, min: 0, max: MAX_VOLUME });
  field('silverPerFocus', 'Prata por ponto de foco', { fallback: 0, min: 0, max: MAX_QTY });
  field('focusPerDay', 'Foco usado por dia', { fallback: DAILY_FOCUS_PREMIUM, min: 0, max: MAX_QTY });
  return { values, issues };
}

const num = (x, fb = 0) => (Number.isFinite(x) ? x : fb);

/**
 * Saldo de 30 dias em prata. `values` vem de cleanPremiumInputs (mas aceita qualquer coisa sem lançar).
 * breakEven = volume V* com saldo 0: (cost − focusValue) / TAX_SAVING; se cost − focusValue <= 0, 0 e paysAlone.
 */
export function premiumBalance(values = {}) {
  const gold = values?.gold;
  if (!(Number.isFinite(gold) && gold > 0)) return { state: 'nogold', cost: 0, taxSaving: 0, focusValue: 0, balance: 0, breakEven: 0, paysAlone: false };
  const goldCost = num(values.goldCost, PREMIUM.goldCost);
  const cost = goldCost * gold;
  const taxSaving = TAX_SAVING * num(values.volume);
  const focusValue = num(values.focusPerDay, DAILY_FOCUS_PREMIUM) * PREMIUM.days * num(values.silverPerFocus);
  const gap = cost - focusValue;
  const paysAlone = gap <= 0;
  return {
    state: 'ok',
    cost,
    taxSaving,
    focusValue,
    balance: taxSaving + focusValue - cost,
    breakEven: paysAlone ? 0 : gap / TAX_SAVING,
    paysAlone,
  };
}
