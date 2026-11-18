// Validação das entradas livres pelas faixas do jogo (IDEIA-060). Pura: sem React, fetch ou localStorage.
// Política: CORRIGE e AVISA (nunca bloqueia, nunca calcula calado com valor impossível).
import { rrr, netSale, SETUP_FEE, DEFAULT_FEE } from './econ';

export const MAX_QTY = 1e9; // teto técnico (não é regra do jogo): evita ∞/NaN
export const FEE_CEILING = 1000; // teto da taxa de bancada por 100 de nutrição (post de desenvolvedor, confiança média)
export const HARD_FEE_CEILING = 1e6; // teto duro do teto configurável: acima disso o valor salvo é tratado como corrompido
const DAILY_OK = [0, 10, 20];

const isEmpty = (x) => x == null || (typeof x === 'string' && x.trim() === '');
const toNum = (x) => Number(String(x).trim());
const br = (n) =>
  !Number.isFinite(n) ? String(n) : Math.abs(n) >= 1e15 ? n.toExponential().replace('e+', 'e') : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const shown = (raw) => (typeof raw === 'string' ? `"${raw.trim()}"` : br(raw));
const round2 = (x) => Math.round(x * 100) / 100;

/**
 * Valida o teto de taxa configurável (vem de localStorage): número finito, > 0 e <= HARD_FEE_CEILING;
 * qualquer outra coisa (null, 0, negativo, NaN, texto) volta a 1.000 e avisa. `undefined` = ausente (padrão, sem aviso).
 */
export function sanitizeFeeCeiling(raw) {
  if (raw === undefined) return { value: FEE_CEILING, issue: null };
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0 && raw <= HARD_FEE_CEILING) return { value: raw, issue: null };
  const was = typeof raw === 'number' ? br(raw) : raw == null ? 'vazio' : `"${String(raw).slice(0, 20)}"`;
  return {
    value: FEE_CEILING,
    issue: {
      field: 'feeCeiling',
      level: 'warn',
      code: 'ceiling-invalid',
      msg: `Teto de taxa salvo (${was}) é inválido (use um valor de 1 a ${br(HARD_FEE_CEILING)}): usando ${br(FEE_CEILING)}.`,
      raw,
      used: FEE_CEILING,
    },
  };
}

/** RRR máximo (fração) com os bônus conhecidos: especialização + foco + diário 20. Derivado de rrr(), nunca escrito. */
export const maxRRR = (kind) => rrr({ kind: kind === 'refine' ? 'refine' : 'craft', specialty: true, focus: true, daily: 20 });

/** Maior nº de relistagens com líquido positivo: netSale(1,'order') − n × SETUP_FEE > 0 (37 com premium, 35 sem). */
export function maxRelists(premium = true) {
  let n = 0;
  while (netSale(1, 'order', premium) - (n + 1) * SETUP_FEE > 0) n++;
  return n;
}

/**
 * validateInputs(input, ctx) -> { values, issues }
 * input: { feePer100, customRRR (%), daily, crafts, relists, mode } (só as chaves presentes são validadas)
 * ctx: { kind: 'craft'|'refine', premium, feeCeiling, maxQty }
 * issues: [{ field, level: 'info'|'warn'|'error', code, msg, raw, used }]
 */
export function validateInputs(input = {}, ctx = {}) {
  const { kind = 'craft', premium = true, maxQty = MAX_QTY } = ctx;
  const values = {};
  const issues = [];
  const add = (field, level, code, msg, raw, used) => issues.push({ field, level, code, msg, raw, used });

  if ('feePer100' in input) {
    const { value: feeCeiling, issue: ceilIssue } = sanitizeFeeCeiling(ctx.feeCeiling);
    if (ceilIssue) issues.push(ceilIssue);
    const raw = input.feePer100;
    let used;
    if (isEmpty(raw)) {
      used = DEFAULT_FEE;
      add('feePer100', 'info', 'fee-empty', `Taxa vazia: usando o padrão ${br(DEFAULT_FEE)} (padrão do app, não do jogo).`, raw, used);
    } else {
      const n = toNum(raw);
      if (Number.isNaN(n)) {
        used = DEFAULT_FEE;
        add('feePer100', 'error', 'fee-nan', `Taxa ${shown(raw)} não é um número: usando o padrão ${br(used)}.`, raw, used);
      } else if (n < 0) {
        used = 0;
        add('feePer100', 'error', 'fee-neg', `Taxa ${br(n)} é negativa: usando 0.`, raw, used);
      } else if (n > feeCeiling) {
        used = feeCeiling;
        add('feePer100', 'warn', 'fee-ceiling', `Taxa ${br(n)} acima do teto de ${br(feeCeiling)}: usando ${br(used)}.`, raw, used);
      } else used = n;
    }
    values.feePer100 = used;
  }

  if ('customRRR' in input) {
    const raw = input.customRRR;
    let used = null;
    if (!isEmpty(raw)) {
      const n = toNum(raw);
      const max = maxRRR(kind);
      if (Number.isNaN(n)) {
        add('customRRR', 'warn', 'rrr-nan', `RRR manual ${shown(raw)} não é um número: usando o RRR automático.`, raw, null);
      } else if (n < 0 || n >= 100) {
        add('customRRR', 'error', 'rrr-impossible', `RRR manual ${br(n)}% é impossível (fora de 0 a 100%): usando o RRR automático.`, raw, null);
      } else if (round2(n) > round2(max * 100)) {
        used = max;
        add('customRRR', 'warn', 'rrr-max', `RRR manual ${br(n)}% acima do máximo conhecido de ${br(round2(max * 100))}% (${kind === 'refine' ? 'refino' : 'craft'}): usando ${br(round2(max * 100))}%.`, raw, used);
      } else used = n / 100;
    }
    values.customRRR = used;
  }

  if ('daily' in input) {
    const raw = input.daily;
    let used = 0;
    if (!isEmpty(raw)) {
      const n = toNum(raw);
      if (DAILY_OK.includes(n)) used = n;
      else add('daily', 'error', 'daily-invalid', `Bônus diário ${shown(raw)} inválido (use 0, 10 ou 20): usando 0.`, raw, 0);
    }
    values.daily = used;
  }

  if ('crafts' in input) {
    const raw = input.crafts;
    let used = 1;
    if (isEmpty(raw)) {
      add('crafts', 'warn', 'qty-empty', 'Campo vazio: usando 1.', raw, 1);
    } else {
      const n = toNum(raw);
      if (Number.isNaN(n) || n <= 0) {
        add('crafts', 'error', 'qty-invalid', `Quantidade ${shown(raw)} é inválida: usando 1.`, raw, 1);
      } else if (n > maxQty) {
        used = maxQty;
        add('crafts', 'warn', 'qty-max', `Quantidade ${Number.isFinite(n) ? br(n) : 'infinita'} acima do limite de ${br(maxQty)}: usando ${br(maxQty)}.`, raw, used);
      } else {
        const f = Math.floor(n);
        if (f < 1) add('crafts', 'error', 'qty-invalid', `Quantidade ${br(n)} é inválida: usando 1.`, raw, 1);
        else {
          used = f;
          if (f !== n) add('crafts', 'error', 'qty-decimal', `Quantidade ${br(n)} não é inteira: usando ${br(f)}.`, raw, f);
        }
      }
    }
    values.crafts = used;
  }

  if ('relists' in input) {
    const raw = input.relists;
    const max = maxRelists(premium);
    let used = 0;
    if (!isEmpty(raw)) {
      const n = toNum(raw);
      if (Number.isNaN(n) || n < 0) {
        add('relists', 'error', 'relists-invalid', `Relistagens ${shown(raw)} inválidas: usando 0.`, raw, 0);
      } else if (Math.floor(n) > max) {
        used = max;
        add('relists', 'warn', 'relists-max', `Relistagens ${Number.isFinite(n) ? br(n) : 'infinita'} acima do máximo de ${max} (o líquido zeraria): usando ${max}.`, raw, used);
      } else {
        used = Math.floor(n);
        if (used !== n) add('relists', 'warn', 'relists-decimal', `Relistagens ${br(n)} não é inteiro: usando ${used}.`, raw, used);
      }
    }
    values.relists = used;
  }

  if ('mode' in input) {
    const raw = input.mode;
    if (raw === 'order' || raw === 'instant') values.mode = raw;
    else {
      values.mode = null;
      // vazio/null/undefined = ausente (sem aviso); só texto não vazio fora dos modos válidos avisa. A tela usa 'order'.
      if (!isEmpty(raw)) add('mode', 'error', 'mode-invalid', `Modo de venda ${shown(String(raw))} inválido: usando ordem de venda.`, raw, 'order');
    }
  }

  return { values, issues };
}

// RRR manual: a tela guarda string em %; '' = automático
const rrrString = (raw, issues, value) => {
  if (value == null) return '';
  return issues.some((i) => i.field === 'customRRR') ? String(value * 100) : String(raw).trim();
};

/** Limpa a configuração do Craft (mesmas chaves, valores corrigidos). Não muta a original. */
export function cleanCraftCfg(cfg, ctx = {}) {
  const c = { ...ctx, kind: 'craft' };
  const out = { ...cfg };
  const all = [];
  const main = validateInputs({ feePer100: cfg.feePer100, customRRR: cfg.customRRR, crafts: cfg.crafts }, c);
  out.feePer100 = main.values.feePer100;
  out.crafts = main.values.crafts;
  out.customRRR = rrrString(cfg.customRRR, main.issues, main.values.customRRR);
  all.push(...main.issues);
  const rf = validateInputs({ feePer100: cfg.refineFee }, c);
  out.refineFee = rf.values.feePer100;
  // ctx.refineTypes (opcional): recursos refináveis que a receita usa. Só eles aparecem na tela, então só eles avisam
  // (a cfg continua limpa por inteiro). Sem a lista, todos avisam.
  const shownType = (type) => !ctx.refineTypes || ctx.refineTypes.includes(type);
  const refineVisible = !ctx.refineTypes || ctx.refineTypes.length > 0;
  if (refineVisible) all.push(...rf.issues.filter((i) => i.field !== 'feeCeiling').map((i) => ({ ...i, field: 'refineFee' })));
  if (cfg.refineDaily) {
    out.refineDaily = { ...cfg.refineDaily };
    for (const type of Object.keys(cfg.refineDaily)) {
      const d = validateInputs({ daily: cfg.refineDaily[type] }, c);
      out.refineDaily[type] = d.values.daily;
      if (shownType(type)) all.push(...d.issues.map((i) => ({ ...i, field: `refineDaily.${type}` })));
    }
  }
  if ('craftDaily' in cfg) {
    const d = validateInputs({ daily: cfg.craftDaily }, c);
    out.craftDaily = d.values.daily;
    all.push(...d.issues.map((i) => ({ ...i, field: 'craftDaily' })));
  }
  return { cfg: out, issues: all };
}

/** Limpa a configuração do Refino (feePer100, customRRR, daily, qty). Não muta a original. */
export function cleanRefineCfg(cfg, ctx = {}) {
  const r = validateInputs({ feePer100: cfg.feePer100, customRRR: cfg.customRRR, daily: cfg.daily, crafts: cfg.qty }, { ...ctx, kind: 'refine' });
  const issues = r.issues.map((i) => (i.field === 'crafts' ? { ...i, field: 'qty' } : i));
  const out = {
    ...cfg,
    feePer100: r.values.feePer100,
    customRRR: rrrString(cfg.customRRR, r.issues, r.values.customRRR),
    daily: r.values.daily,
    qty: r.values.crafts,
  };
  return { cfg: out, issues };
}
