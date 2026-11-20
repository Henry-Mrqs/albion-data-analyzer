// IDEIA-059: ciclo de vida da ordem de venda. Cada atualização da ordem cobra a taxa de criação (2,5%) de novo; cancelar não devolve.
// Puro. O líquido base continua vindo de netSale (econ.js): aqui só se calcula o EXTRA das atualizações.
// A base da taxa na atualização é SUPOSIÇÃO do app (sem fonte): 'price' = sobre o preço novo (padrão), 'diff' = sobre a diferença.
import { netSale, SETUP_FEE } from './econ';
import { validateInputs, br, echoValue } from './inputRules';

export const SETUP_BASES = ['price', 'diff'];
const MAX_STEP = 1e9; // teto técnico (não é regra do jogo): evita ∞/NaN

const okNum = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);

/** extra = qty × (perPrice × preço + flat). Entrada inválida vira 0 (defesa). */
export function relistParts({ updates = 0, step = 0, base = 'price' } = {}) {
  const u = okNum(updates) ? Math.floor(updates) : 0;
  const s = okNum(step) ? step : 0;
  if (base === 'diff') return { perPrice: 0, flat: 2 * SETUP_FEE * s * u };
  return { perPrice: u * SETUP_FEE, flat: (SETUP_FEE * s * u * (u + 1)) / 2 };
}

/** Custo extra (prata do lote) das atualizações. */
export function relistCost({ price, qty = 1, updates, step, base }) {
  const { perPrice, flat } = relistParts({ updates, step, base });
  return qty * (perPrice * price + flat);
}

/** Líquido do lote com as atualizações. Só 'order' paga; 'instant' (O6) e 'none' (sem taxa de criação) não. */
export function netSaleWithRelists({ price, qty = 1, mode, premium, updates = 0, step = 0, base = 'price' }) {
  const cost = mode === 'order' ? relistCost({ price, qty, updates, step, base }) : 0;
  return {
    net: netSale(price, mode, premium) * qty - cost,
    relistCost: cost,
    setupTotal: mode === 'order' ? SETUP_FEE * qty * price + cost : 0,
  };
}

const isEmpty = (x) => x == null || (typeof x === 'string' && x.trim() === '');

/** Lê relists, relistStep e relistBase de uma cfg (bruta) e devolve valores limpos + avisos. Nunca lança. */
export function cleanRelist(cfg, { premium = true } = {}) {
  const c = isObj(cfg) ? cfg : {};
  const issues = [];
  const r = validateInputs({ relists: c.relists }, { premium });
  issues.push(...r.issues);
  let step = 0;
  if (!isEmpty(c.relistStep)) {
    const n = typeof c.relistStep === 'number' || typeof c.relistStep === 'string' ? Number(String(c.relistStep).trim()) : NaN;
    if (!Number.isFinite(n) || n < 0) {
      issues.push({ field: 'relistStep', level: 'error', code: 'relistStep-invalid', msg: `Queda por atualização${echoValue(c.relistStep)} inválida: usando 0.`, raw: c.relistStep, used: 0 });
    } else if (n > MAX_STEP) {
      step = MAX_STEP;
      issues.push({ field: 'relistStep', level: 'warn', code: 'relistStep-max', msg: `Queda por atualização ${br(n)} acima do limite de ${br(MAX_STEP)}: usando ${br(MAX_STEP)}.`, raw: c.relistStep, used: step });
    } else step = n;
  }
  let base = 'price';
  if (c.relistBase != null) {
    if (SETUP_BASES.includes(c.relistBase)) base = c.relistBase;
    else issues.push({ field: 'relistBase', level: 'warn', code: 'relistBase-invalid', msg: 'Base da taxa na atualização desconhecida: usando o preço novo.', raw: c.relistBase, used: 'price' });
  }
  return { values: { updates: r.values.relists, step, base }, issues };
}
