// Foco (IDEIA-002): custo em pontos, orçamento diário e prata por ponto. Puro: sem React, fetch ou localStorage.

/** Fórmula da fonte (AFM, Albion-Tools-Alternate, albionutil; confiança média-alta): custo = base * 0,5^(eficiência / 10.000). */
export const FOCUS_HALF_PER = 10000;
/** Oferta diária Premium de foco (dossiê F6; fontes de 2017/2023/AFM, confiança média). Padrão editável. */
export const DAILY_FOCUS_PREMIUM = 10000;
/** Eficiência máxima conhecida: 100/100 do exemplo da AFM (100 × 30 + 100 × 280). */
export const MAX_FOCUS_EFFICIENCY = 31000;

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
  return { points: focusCost(base, efficiency), source: 'formula' };
}
