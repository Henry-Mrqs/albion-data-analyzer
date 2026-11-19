// IDEIA-031: teste de estresse (dossiê §2). Puro. Modelo POR UNIDADE:
//   custo(dm) = variable*(1+dm) + fixed     (variable = compras a preço de mercado, já líquidas de RRR;
//                                            fixed = taxa de bancada + despesas extras: não variam com o mercado)
//   lucro(dp, dm) = price*(1+dp)*k - custo(dm)
// k vem de netSale (mesma função de líquido das telas, inclusive noTax): nenhuma taxa é recalculada aqui.
import { netSale, materialPlan } from './econ';

export const STEPS = [-0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2];

export const stressProfit = ({ variable, fixed, price, k }, { dp = 0, dm = 0 } = {}) =>
  price * (1 + dp) * k - (variable * (1 + dm) + fixed);

/** Ruptura: dp* (negativa se há lucro), preço mínimo e queda em prata; dm* (null sem material ou se a receita não cobre o fixo). */
export function breakEven({ variable, fixed, price, k }) {
  const rev = price * k;
  const minPrice = k > 0 ? (variable + fixed) / k : Infinity;
  const dp = rev > 0 ? (variable + fixed) / rev - 1 : null;
  const dm = variable > 0 && rev > fixed ? (rev - fixed) / variable - 1 : null;
  return { dp, dm, minPrice, priceDrop: price - minPrice };
}

/** Grade: cells[iDm][iDp]. */
export function stressGrid(input, steps = STEPS) {
  return { steps, cells: steps.map((dm) => steps.map((dp) => stressProfit(input, { dp, dm }))) };
}

/** Semáforo. Limiar de 5% do custo = decisão de produto (sem fonte de jogo). */
export const THIN_MARGIN = 0.05;
export const verdict = (profit, cost) => (profit < 0 ? 'loss' : profit < THIN_MARGIN * cost ? 'thin' : 'ok');

// Rótulos de modo iguais aos da tabela "Onde vender" do Craft; só descreve a saída variada, não calcula nada.
const EXIT_LABEL = { order: 'Ordem de venda', instant: 'Ordem de compra' };
const exitInfo = (city, label, noTax) => ({ city, label, noTax: noTax === true });

/** Adaptador do Craft a partir de computeCraft: taxas de bancada (craft e etapas de refino) e despesas extras são fixas. */
export function craftStressInput(c, premium) {
  if (!c || !c.ready || !(c.units > 0) || !(c.best?.price > 0)) return null;
  const makeFees = c.plan.filter((p) => p.kind === 'make').reduce((s, p) => s + p.total, 0);
  const mode = c.best.noTax ? 'none' : c.best.mode;
  return {
    variable: (c.matCost - makeFees) / c.units,
    fixed: (c.fee + makeFees + (c.extras || 0)) / c.units,
    price: c.best.price,
    k: netSale(1, mode, premium),
    mode,
    units: c.units,
    ...exitInfo(c.best.city, c.best.label, c.best.noTax),
  };
}

/** Adaptador do Refino: `unit` de refineUnit; extrasPerUnit e noTax como no evaluateTier. */
export function refineStressInput(unit, rrr, sell, premium, { extrasPerUnit = 0, noTax = false } = {}) {
  if (!unit || unit.missing.length || !(sell?.price > 0)) return null;
  const makeFees = materialPlan(unit, 1, rrr).makes.reduce((s, m) => s + m.fee, 0);
  const mode = noTax ? 'none' : sell.mode;
  return {
    variable: unit.cost - makeFees,
    fixed: makeFees + extrasPerUnit,
    price: sell.price,
    k: netSale(1, mode, premium),
    mode,
    units: 1,
    ...exitInfo(sell.city, EXIT_LABEL[sell.mode], noTax),
  };
}
