// Preço-alvo reverso: dado o custo unitário, por quanto listar para lucrar X, ter margem M ou empatar.
// Inverte netSale: o fator de líquido k vem de econ.js (nunca recalculado aqui); o modo 'none' é o da 048 (sem imposto).
import { netSale, SETUP_FEE } from './econ';

/**
 * Menor preço de venda inteiro P tal que líquido(P) >= custo + lucro.
 * mode: 'order' | 'instant'. profit (prata) e margin (fração sobre o custo) são excludentes;
 * nenhum dos dois = equilíbrio. relists: atualizações extras da ordem (cada uma cobra a taxa de criação
 * de novo; só no modo ordem). Retorna null se o custo for inválido.
 */
export function targetPrice({ cost, profit, margin, premium, mode, relists = 0, noTax = false }) {
  if (profit != null && margin != null) throw new TypeError('Informe lucro OU margem, não os dois.');
  if (!Number.isFinite(cost) || cost <= 0) return null;
  // IDEIA-060: modo e relistagens inválidos são recusados aqui (a tela corrige e avisa com validateInputs)
  if (mode !== 'order' && mode !== 'instant') return null;
  if (!Number.isInteger(relists) || relists < 0) return null;
  const L = profit != null ? profit : margin != null ? cost * margin : 0;
  // IDEIA-075: noTax (venda fora do mercado, modo 'none' da 048) = sem imposto e sem taxa de criação (relistagens não contam)
  const off = noTax === true;
  let k = netSale(1, off ? 'none' : mode, premium);
  if (mode === 'order' && !off) k -= relists * SETUP_FEE;
  if (!(k > 0) || !Number.isFinite(L)) return null;
  const p = Math.ceil((cost + L) / k - 1e-9);
  return Number.isFinite(p) && p > 0 ? p : null;
}

/**
 * Por modo, a melhor saída do Craft (a PRIMEIRA daquele modo na lista recebida, que vem de computeCraft ordenada por lucro)
 * e se ela está marcada "Sem imposto". Modo sem saída = null. Não-array = tudo null.
 */
export function exitNoTaxByMode(options) {
  const out = { order: null, instant: null };
  if (!Array.isArray(options)) return out;
  for (const mode of ['order', 'instant']) {
    const o = options.find((x) => x?.mode === mode);
    if (o) out[mode] = { on: o.noTax === true, city: o.city ?? null };
  }
  return out;
}

/** Quanto o alvo está acima (+) ou abaixo (-) do preço atual, como fração. */
export const marketGap = (target, current) => (current > 0 ? target / current - 1 : null);
