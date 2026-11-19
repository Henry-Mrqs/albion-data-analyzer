// Despesas extras do craft/refino (IDEIA-048). Puro. Valores são do usuário: nenhum padrão, nenhum preset.
// Despesas NÃO mudam RRR, foco nem taxa de bancada (dossiê X4): só somam ao custo.

export const MAX_EXTRAS = 20; // limite de linhas da lista (decisão de produto, técnica)

const num = (x) => (Number.isFinite(+x) ? +x : 0);

/** Σ (escopo 'lote' = valor uma vez; qualquer outro = valor × nº de crafts). */
export function extrasTotal(list, crafts) {
  if (!Array.isArray(list)) return 0;
  return list.reduce((s, e) => s + (e?.scope === 'lote' ? num(e.value) : num(e?.value) * num(crafts)), 0);
}

// O Refino tem uma saída só: o interruptor único grava esta chave no mapa noTax (formato 'Cidade|modo' do Craft).
export const REFINE_NO_TAX_KEY = 'Refino|order';

/** Partes do total para o resumo da tela: { perCraft (soma dos "por craft"), perLote (soma dos "por lote"), total (no lote) }. */
export function extrasParts(list, crafts) {
  const l = Array.isArray(list) ? list : [];
  return {
    perCraft: l.reduce((s, e) => s + (e?.scope === 'lote' ? 0 : num(e?.value)), 0),
    perLote: l.reduce((s, e) => s + (e?.scope === 'lote' ? num(e.value) : 0), 0),
    total: extrasTotal(l, crafts),
  };
}

/** Despesas por unidade produzida: total ÷ unidades; 0 se unidades <= 0. */
export function extrasPerUnit(list, units, crafts) {
  const u = num(units);
  return u > 0 ? extrasTotal(list, crafts) / u : 0;
}
