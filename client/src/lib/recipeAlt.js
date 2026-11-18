// Escolha entre receitas alternativas (artefato ou ficha de favor; base Royal SET1/2/3). Puro: sem React nem fetch.

export const FEE_DEPENDENCE_WARNING = 'a escolha depende da taxa de bancada (valor do artefato na taxa NÃO verificado)';

/** Rótulo da variante a partir do ingrediente que ela troca. */
export function variantLabel(uniq) {
  if (!uniq) return 'Alternativa';
  if (/TOKEN_FAVOR/.test(uniq)) return 'Ficha de favor';
  const set = uniq.match(/_SET(\d)$/);
  if (set) return `Base ${set[1]}`;
  if (/ARTEFACT/.test(uniq)) return 'Artefato';
  return 'Alternativa';
}

const complete = (r, cost) => !r.missing?.length && cost(r) > 0;

function cheapestBy(results, cost) {
  let best = -1;
  results.forEach((r, i) => {
    if (!complete(r, cost)) return;
    if (best < 0 || cost(r) < cost(results[best])) best = i;
  });
  return best < 0 ? 0 : best;
}

/** Índice da receita de menor custo total (material + taxa de bancada) entre as completas; empate: a primeira; nenhuma completa: 0. */
export const pickCheapest = (results) => cheapestBy(results, (r) => r.totalCost);

/**
 * D-034: a comparação usa o custo total (com a taxa), mas a taxa do ingrediente especial não é verificada (D-012).
 * `depends` = a vencedora muda quando a taxa é excluída (só material).
 */
export function feeDecides(results) {
  const withFee = pickCheapest(results);
  const noFee = cheapestBy(results, (r) => r.matCost);
  return { withFee, noFee, depends: withFee !== noFee };
}

/** Índice da receita a usar: 'auto'/ausente = a mais barata; índice salvo inválido ou fora de faixa = 0 (nunca lança). */
export function resolveVariant(saved, count, auto) {
  if (saved === undefined || saved === 'auto') return count > 0 ? auto : 0;
  const n = typeof saved === 'number' || (typeof saved === 'string' && saved.trim() !== '') ? Number(saved) : NaN;
  return Number.isInteger(n) && n >= 0 && n < count ? n : 0;
}

/** Selo do ingrediente que não retorna: null quando retorna. `unverified` = barrado só pelo token (fragmento). */
export function returnBadge(line) {
  if (line.returnable) return null;
  return {
    text: line.unverified ? 'não retorna · não verificado' : 'não retorna',
    title: line.unverified ? 'O dump não marca este ingrediente; assumimos que não retorna até medir em jogo.' : undefined,
  };
}
