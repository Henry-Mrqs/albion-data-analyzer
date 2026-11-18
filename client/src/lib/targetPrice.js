// Preço-alvo reverso: dado o custo unitário, por quanto listar para lucrar X, ter margem M ou empatar.
// Inverte netSale: o fator de líquido k vem de econ.js (nunca recalculado aqui).
import { netSale, SETUP_FEE } from './econ';

/**
 * Menor preço de venda inteiro P tal que líquido(P) >= custo + lucro.
 * mode: 'order' | 'instant'. profit (prata) e margin (fração sobre o custo) são excludentes;
 * nenhum dos dois = equilíbrio. relists: atualizações extras da ordem (cada uma cobra a taxa de criação
 * de novo; só no modo ordem). Retorna null se o custo for inválido.
 */
export function targetPrice({ cost, profit, margin, premium, mode, relists = 0 }) {
  if (profit != null && margin != null) throw new TypeError('Informe lucro OU margem, não os dois.');
  if (!Number.isFinite(cost) || cost <= 0) return null;
  const L = profit != null ? profit : margin != null ? cost * margin : 0;
  let k = netSale(1, mode, premium);
  if (mode === 'order') k -= relists * SETUP_FEE;
  if (!(k > 0) || !Number.isFinite(L)) return null;
  const p = Math.ceil((cost + L) / k - 1e-9);
  return Number.isFinite(p) && p > 0 ? p : null;
}

/** Quanto o alvo está acima (+) ou abaixo (-) do preço atual, como fração. */
export const marketGap = (target, current) => (current > 0 ? target / current - 1 : null);
