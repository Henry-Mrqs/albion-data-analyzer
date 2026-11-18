// Foco (IDEIA-002): custo em pontos, orçamento diário e prata por ponto. Puro: sem React, fetch ou localStorage.
import { computeCraft } from './craftPlan';
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
    feeOn: on.fee,
    feeOff: off.fee,
    costOn: on.totalCost,
    costOff: off.totalCost,
    profitOn: on.best ? on.best.profit : null,
    profitOff: off.best ? off.best.profit : null,
    verdict: verdictOf(source, silverPerPoint, reference),
  };
}
