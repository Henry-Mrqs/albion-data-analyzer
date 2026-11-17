// Regras econômicas do Albion (retorno de recursos, taxas, custo de cadeia de refino).
import { recipeOf, refinedTypeOf, tierOf, ingredientValue, recipeValue, nameOf, marketId } from './catalog';
import { CITIES, quote } from './market';

export const SETUP_FEE = 0.025; // taxa de criação de ordem (compra e venda)
export const salesTax = (premium) => (premium ? 0.04 : 0.08);

/** Taxa de retorno de recursos: RRR = PB / (100 + PB), PB = bônus de produção em %. */
export function rrr({ kind, specialty, focus, daily = 0 }) {
  const pb = 18 + (specialty ? (kind === 'refine' ? 40 : 15) : 0) + (focus ? 59 : 0) + daily;
  return pb / (100 + pb);
}

/** Taxa de uso da bancada: valor do item * 0.1125 nutrição, cobrada por 100 de nutrição. */
export const stationFee = (itemValue, feePer100) => Math.round(itemValue * 0.1125 * (feePer100 / 100));

/** Líquido ao vender: 'order' (cria ordem de venda) ou 'instant' (vende numa ordem de compra). */
export const netSale = (price, mode, premium) =>
  mode === 'order' ? price * (1 - salesTax(premium) - SETUP_FEE) : price * (1 - salesTax(premium));

export const fmt = (n) => Math.round(n).toLocaleString('pt-BR');
export const pct = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

// "T4_PLANKS_LEVEL1" -> { base: "T4_PLANKS", ench: 1 }
export const splitUniq = (uniq) => {
  const m = uniq.match(/^(.*)_LEVEL(\d)$/);
  return m ? { base: m[1], ench: +m[2] } : { base: uniq, ench: 0 };
};

/** Preço de compra de um material: melhor cidade (ou uma específica), via venda direta ou ordem de compra. */
export function buyQuote(prices, mid, { city = 'best', useOrders = false } = {}) {
  const cities = city === 'best' ? CITIES : [city];
  let best = { price: 0, date: null, city: null };
  for (const c of cities) {
    const q = quote(prices, mid, c, useOrders ? 'buy' : 'sell');
    if (q.price > 0 && (best.price === 0 || q.price < best.price)) best = { ...q, city: c };
  }
  if (useOrders && best.price) best.price *= 1 + SETUP_FEE;
  return best;
}

/**
 * Custo de produzir 1 unidade de um recurso refinado.
 * ctx: { prices, city, useOrders, rrr, feePer100, deep }
 * Retorna { cost, fee, missing:[mid], lines:[{mid,name,qty,unit,date,city,refined?:sub}] }
 */
export function refineUnit(uniq, ctx) {
  const { base, ench } = splitUniq(uniq);
  const rec = recipeOf(base, ench);
  if (!rec) return { cost: 0, fee: 0, missing: [uniq], lines: [] };
  const lines = [];
  const missing = [];
  let gross = 0;
  for (const r of rec.res) {
    let unit;
    let sub = null;
    let date = null;
    let city = null;
    if (ctx.deep && refinedTypeOf(r.uniq) && tierOf(r.uniq) >= 2) {
      sub = refineUnit(r.uniq, ctx);
      unit = sub.cost;
      missing.push(...sub.missing);
    } else {
      const q = buyQuote(ctx.prices, r.mid, ctx);
      unit = q.price;
      date = q.date;
      city = q.city;
      if (!unit) missing.push(r.mid);
    }
    gross += r.count * unit;
    lines.push({ mid: r.mid, name: r.name, qty: r.count, unit, date, city, sub });
  }
  const value = ingredientValue(uniq) || recipeValue(rec);
  const fee = stationFee(value, ctx.feePer100);
  return { cost: gross * (1 - ctx.rrr) + fee, fee, missing, lines };
}

/** IDs de mercado necessários para calcular a cadeia de um refinado (até T2 se deep). */
export function refineChainIds(uniq, deep) {
  const out = new Set([marketId(uniq)]);
  const walk = (u) => {
    const { base, ench } = splitUniq(u);
    const rec = recipeOf(base, ench);
    if (!rec) return;
    for (const r of rec.res) {
      out.add(r.mid);
      if (deep && refinedTypeOf(r.uniq) && tierOf(r.uniq) >= 2) walk(r.uniq);
    }
  };
  walk(uniq);
  return [...out];
}

export { nameOf };
