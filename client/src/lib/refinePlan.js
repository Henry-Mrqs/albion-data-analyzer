// Lógica de cálculo da tela de Refino (pura: sem React, fetch ou localStorage).
import { marketId } from './catalog';
import { SELL_CITIES, quote } from './market';
import { refineUnit, materialPlan, roundFee } from './econ';
import { netSaleWithRelists } from './relist';

// ordem das rotas (rótulos e hints ficam no componente)
export const ROUTE_ORDER = ['buy', 'all', 'best'];

// Percorre a cadeia e diz, nível a nível, se compra o refinado pronto ou produz.
export function routePath(unit, tier) {
  const steps = [];
  let node = unit;
  let t = tier;
  while (node) {
    const l = node.lines.find((x) => x.refined);
    steps.push({ tier: t, action: 'make', raw: node.lines.filter((x) => !x.refined) });
    if (!l) break;
    if (l.sub) {
      node = l.sub;
      t -= 1;
    } else {
      steps.push({ tier: t - 1, action: 'buy', unit: l.unit, city: l.city });
      break;
    }
  }
  return steps;
}

// IDEIA-048: extrasPerUnit (despesas por unidade refinada) soma ao custo; noTax = venda fora do mercado (sem imposto nem taxa de criação)
export function evaluateTier({ tier, uniq, prices, ctx, sellCity, sellMode, premium, extrasPerUnit = 0, noTax = false, relist }) {
  const mid = marketId(uniq);
  const unit = refineUnit(uniq, ctx);
  const sellCities = sellCity === 'best' ? SELL_CITIES : [sellCity];
  let best = { price: 0, city: null, date: null };
  for (const c of sellCities) {
    const q = quote(prices, mid, c, c === 'Black Market' ? 'buy' : sellMode === 'instant' ? 'buy' : 'sell');
    if (q.price > best.price) best = { ...q, city: c };
  }
  const mode = best.city === 'Black Market' || sellMode === 'instant' ? 'instant' : 'order';
  // IDEIA-059: relist = { updates, step, base } (valores já limpos pela tela); só vale em ordem de venda com imposto
  const { net, relistCost, setupTotal } = netSaleWithRelists({ price: best.price, mode: noTax ? 'none' : mode, premium, ...relist });
  const cost = unit.cost + extrasPerUnit;
  const profit = net - cost;
  return { tier, uniq, mid, unit, sell: best, mode, net, profit, margin: cost > 0 ? (profit / cost) * 100 : 0, extrasPerUnit, relistCost, setupTotal };
}

// rotas: comprar refinado pronto x produzir tudo x melhor combinação
export function compareRoutes(uniq, ctx) {
  const routes = ROUTE_ORDER.map((value) => ({ value, unit: refineUnit(uniq, { ...ctx, route: value }) })).map((r) => ({ ...r, ok: !r.unit.missing.length }));
  const best = routes.filter((r) => r.ok).sort((a, b) => a.unit.cost - b.unit.cost)[0];
  return { routes, best };
}

// taxa da bancada do lote: soma exata das etapas, arredondada uma única vez
export const lotFee = (unit, qty, rrr) => roundFee(materialPlan(unit, qty, rrr).makes.reduce((s, m) => s + m.fee, 0));

export const pickBestTier = (rows) =>
  rows.filter((r) => r.sell.price > 0 && !r.unit.missing.length).sort((a, b) => b.profit - a.profit)[0];

// células (item|cidade) das compras folha, para destacar na tabela de preços
export function usedCells(unit) {
  const cells = new Set();
  const walk = (u) => u.lines.forEach((l) => (l.sub ? walk(l.sub) : l.city && cells.add(`${l.mid}|${l.city}`)));
  walk(unit);
  return cells;
}
