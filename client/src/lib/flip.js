// Cálculo das linhas do Flipper (pura: sem React, fetch ou localStorage).
import { SETUP_FEE, netSale } from './econ';

/** Melhor par (cidade de compra, destino) por item, filtrado por lucro, margem, idade e orçamento. Sem ordenação. */
export function flipRows(prices, cfg, premium, now = Date.now()) {
  const maxAgeMs = cfg.maxAge * 3600000;
  const fresh = (d) => d && (!cfg.maxAge || now - d <= maxAgeMs);
  const budget = +cfg.budget || Infinity;
  const out = [];
  for (const [mid, cities] of Object.entries(prices)) {
    let best = null;
    for (const b of cfg.buyCities) {
      const bq = cities[b]?.[1];
      if (!bq) continue;
      const instantBuy = bq.s > 0 && fresh(bq.sd);
      const orderBuy = bq.b > 0 && fresh(bq.bd);
      const cost = cfg.buyMode === 'instant' ? (instantBuy ? bq.s : 0) : orderBuy ? bq.b * (1 + SETUP_FEE) : 0;
      if (!cost || cost > budget) continue;
      const bdate = cfg.buyMode === 'instant' ? bq.sd : bq.bd;
      for (const s of cfg.sellCities) {
        if (s === b) continue;
        const sq = cities[s]?.[1];
        if (!sq) continue;
        const opts = [];
        if (cfg.sellMode !== 'order' && sq.b > 0 && fresh(sq.bd)) opts.push({ mode: 'instant', price: sq.b, date: sq.bd });
        if (cfg.sellMode !== 'instant' && s !== 'Black Market' && sq.s > 0 && fresh(sq.sd)) opts.push({ mode: 'order', price: sq.s, date: sq.sd });
        for (const o of opts) {
          const profit = netSale(o.price, o.mode, premium) - cost;
          if (!best || profit > best.profit) best = { mid, buy: b, sell: s, mode: o.mode, cost, price: o.price, profit, margin: (profit / cost) * 100, bdate, sdate: o.date };
        }
      }
    }
    // IDEIA-088: destino Mercado Negro: a 2ª leitura (sell_price_min) vai à parte; NÃO VERIFICADO em jogo qual das duas o jogador recebe
    if (best && best.sell === 'Black Market') {
      const lq = cities['Black Market']?.[1];
      if (lq?.s > 0) {
        best.altPrice = lq.s;
        best.altProfit = netSale(lq.s, 'instant', premium) - best.cost;
        best.altStale = !fresh(lq.sd);
      }
    }
    if (best && best.profit >= (+cfg.minProfit || 0) && best.margin >= (+cfg.minMargin || 0)) out.push(best);
  }
  return out;
}
