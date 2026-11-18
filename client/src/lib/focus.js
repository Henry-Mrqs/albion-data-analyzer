// Foco (IDEIA-002): custo em pontos, orçamento diário e prata por ponto. Puro: sem React, fetch ou localStorage.
import { computeCraft } from './craftPlan';
import { validateInputs } from './inputRules';
import { focusOf, parseMarketId } from './catalog';
import { refineUnit, materialPlan } from './econ';
import { FOCUS_HALF_PER, DAILY_FOCUS_PREMIUM, MAX_FOCUS_EFFICIENCY } from './focusConsts';

export { FOCUS_HALF_PER, DAILY_FOCUS_PREMIUM, MAX_FOCUS_EFFICIENCY };

/** Pontos de foco de um craft com a eficiência dada (0 = sem especialização = custo cheio). */
export const focusCost = (base, efficiency = 0) => base * 0.5 ** (efficiency / FOCUS_HALF_PER);

/** Quantos crafts o orçamento paga (inteiro; 0 se custo ou orçamento não são positivos). */
export function craftsWithBudget(budget, costPerCraft) {
  if (!(costPerCraft > 0) || !(budget > 0)) return 0;
  return Math.floor(budget / costPerCraft);
}

/** Pontos por craft: o valor mostrado pelo jogo (override > 0) vence a fórmula; base 0/null = sem dado. */
export function focusPerCraft({ base, efficiency = 0, override } = {}) {
  if (override > 0) return { points: override, source: 'override' };
  if (!(base > 0)) return { points: 0, source: 'none' };
  // estado salvo antigo ou lixo (undefined, NaN, null): sem eficiência = custo cheio
  const eff = Number.isFinite(efficiency) ? efficiency : 0;
  return { points: focusCost(base, eff), source: 'formula' };
}

/**
 * Valores validados dos campos de foco guardados na cfg da tela (focusEff, focusPoints, focusBudget, focusRef).
 * Campo ausente (estado salvo antigo) = padrão, sem aviso. `issues` usam o nome do campo da cfg.
 */
export function focusValues(cfg) {
  const c = cfg ?? {};
  const { values, issues } = validateInputs({ efficiency: c.focusEff, focusPoints: c.focusPoints, focusBudget: c.focusBudget, focusRef: c.focusRef });
  return {
    values: { efficiency: values.efficiency, override: values.focusPoints, budget: values.focusBudget, reference: values.focusRef },
    issues: issues.map((i) => (i.field === 'efficiency' ? { ...i, field: 'focusEff' } : i)),
  };
}

// veredito: só existe contra uma referência positiva digitada pelo usuário (o jogo não vende foco por prata)
const verdictOf = (source, silverPerPoint, reference) => {
  if (source === 'none') return 'nofocus';
  if (!(reference > 0) || silverPerPoint == null) return 'info';
  return silverPerPoint >= reference ? 'worth' : 'notworth';
};

/**
 * Cartão "Foco" do Craft. Chama computeCraft com foco ligado e desligado (nenhuma fórmula de RRR é escrita aqui):
 * a economia é a diferença do custo total, então só ingredientes que retornam contam e a taxa de bancada cancela (dossiê F7).
 * null se não há receita, preços, ou falta preço de algum material.
 */
export function craftFocusSummary({ rec, targetMid, prices, cfg, premium, bonusCity, feeCeiling, base, efficiency, override, budget, reference }) {
  if (!rec || !prices) return null;
  const args = { rec, targetMid, prices, premium, bonusCity, feeCeiling };
  const on = computeCraft({ ...args, cfg: { ...cfg, focus: true } });
  const off = computeCraft({ ...args, cfg: { ...cfg, focus: false } });
  if (on.missing.length || off.missing.length) return null;
  const crafts = on.rates.crafts;
  const { points, source } = focusPerCraft({ base, efficiency, override });
  const savingsPerCraft = (off.totalCost - on.totalCost) / crafts;
  const silverPerPoint = points > 0 ? savingsPerCraft / points : null;
  return {
    source,
    pointsPerCraft: points,
    pointsPerUnit: points / rec.amount,
    pointsLot: points * crafts,
    savingsPerCraft,
    savingsLot: savingsPerCraft * crafts,
    silverPerPoint,
    craftsInBudget: craftsWithBudget(budget, points),
    budget: Number.isFinite(budget) ? budget : 0,
    reference: reference > 0 ? reference : null,
    feeOn: on.fee,
    feeOff: off.fee,
    costOn: on.totalCost,
    costOff: off.totalCost,
    profitOn: on.best ? on.best.profit : null,
    profitOff: off.best ? off.best.profit : null,
    verdict: verdictOf(source, silverPerPoint, reference),
  };
}

/**
 * Cartão "Foco" do Refino, por unidade do refinado `uniq` (ex.: T4_PLANKS). ctx = o contexto de refineUnit (sem rrr).
 * Economia = custo da unidade com RRR sem foco − com foco (a taxa de bancada cancela). Pontos = soma das etapas da rota
 * (materialPlan com o RRR com foco): a mesma eficiência vale em todas as etapas e o `override` do jogo vale só para a etapa final.
 * `base` é o foco da etapa final; o das demais vem do catálogo (etapa sem dado conta 0 e entra em `stepsWithoutData`).
 * null se faltam preços.
 */
export function refineFocusSummary({ uniq, ctx, rrrOn, rrrOff, base, efficiency, override, qty = 1, budget, reference }) {
  if (!ctx?.prices) return null;
  const unitOn = refineUnit(uniq, { ...ctx, rrr: rrrOn });
  const unitOff = refineUnit(uniq, { ...ctx, rrr: rrrOff });
  if (unitOn.missing.length || unitOff.missing.length || !(unitOn.cost > 0)) return null;
  const final = focusPerCraft({ base, efficiency, override });
  let stepsWithoutData = 0;
  const steps = materialPlan(unitOn, 1, rrrOn).makes.map((m, k) => {
    let p;
    if (k === 0) p = final;
    else {
      const { base: b, ench } = parseMarketId(m.mid);
      p = focusPerCraft({ base: focusOf(b, ench), efficiency });
      if (p.source === 'none') stepsWithoutData++;
    }
    return { mid: m.mid, qty: m.qty, points: m.qty * p.points };
  });
  const pointsPerUnit = steps.reduce((s, x) => s + x.points, 0);
  const savingsPerUnit = unitOff.cost - unitOn.cost;
  const silverPerPoint = pointsPerUnit > 0 ? savingsPerUnit / pointsPerUnit : null;
  const q = Math.max(1, +qty || 1);
  return {
    source: final.source,
    steps,
    stepsWithoutData,
    pointsPerUnit,
    pointsLot: pointsPerUnit * q,
    savingsPerUnit,
    savingsLot: savingsPerUnit * q,
    silverPerPoint,
    unitsInBudget: craftsWithBudget(budget, pointsPerUnit),
    budget: Number.isFinite(budget) ? budget : 0,
    reference: reference > 0 ? reference : null,
    costOn: unitOn.cost,
    costOff: unitOff.cost,
    profitOn: null,
    profitOff: null,
    verdict: verdictOf(final.source, silverPerPoint, reference),
  };
}