// Constantes do foco (IDEIA-002), num módulo sem dependências para a validação (inputRules) não criar ciclo com focus.js.

/** Fórmula da fonte (AFM, Albion-Tools-Alternate, albionutil; confiança média-alta): custo = base * 0,5^(eficiência / 10.000). */
export const FOCUS_HALF_PER = 10000;
/** Oferta diária Premium de foco (dossiê F6; fontes de 2017/2023/AFM, confiança média). Padrão editável. */
export const DAILY_FOCUS_PREMIUM = 10000;
/** Eficiência máxima conhecida: 100/100 do exemplo da AFM (100 × 30 + 100 × 280). */
export const MAX_FOCUS_EFFICIENCY = 31000;
