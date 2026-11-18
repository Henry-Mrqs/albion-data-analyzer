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

/** RRR manual (em %) se for um número válido; senão o automático. Vazio/inválido cai no automático. */
export const resolveRRR = (auto, raw) => {
  const custom = raw !== '' && !isNaN(+raw);
  return custom ? +raw / 100 : auto;
};

/** Taxa de uso da bancada, EXATA: valor do item * 0.1125 nutrição * n, cobrada por 100 de nutrição. Não arredonda. */
export const stationFee = (itemValue, feePer100, n = 1) => itemValue * 0.1125 * n * (feePer100 / 100);

/** Único ponto de arredondamento da taxa: no total do lote (meio sobe). */
export const roundFee = (x) => Math.round(x);

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
  if (!rec) return { uniq, cost: 0, fee: 0, missing: [uniq], lines: [] };
  const lines = [];
  const missing = [];
  let gross = 0;
  // rota: 'buy' = compra o refinado pronto; 'all' = produz toda a cadeia; 'best' = o mais barato em cada nível
  const route = ctx.route ?? (ctx.deep ? 'all' : 'buy');
  for (const r of rec.res) {
    const refined = !!refinedTypeOf(r.uniq) && tierOf(r.uniq) >= 2;
    const q = buyQuote(ctx.prices, r.mid, ctx);
    let unit = q.price;
    let sub = null;
    let date = q.date;
    let city = q.city;
    let choice = 'buy';
    let alt = 0; // custo da alternativa não escolhida
    if (refined && route !== 'buy') {
      const s = refineUnit(r.uniq, ctx);
      const canMake = !s.missing.length && s.cost > 0;
      if (route === 'all' || (canMake && (!q.price || s.cost < q.price))) {
        choice = 'make';
        sub = s;
        unit = s.cost;
        date = null;
        city = null;
        alt = q.price;
        missing.push(...s.missing);
      } else {
        alt = canMake ? s.cost : 0;
      }
    }
    if (choice === 'buy' && !unit) missing.push(r.mid);
    gross += r.count * unit;
    lines.push({ mid: r.mid, name: r.name, qty: r.count, unit, date, city, sub, refined, choice, alt });
  }
  const value = ingredientValue(uniq) || recipeValue(rec);
  const fee = stationFee(value, ctx.feePer100);
  return { uniq, cost: gross * (1 - ctx.rrr) + fee, fee, missing, lines };
}

/**
 * Desdobra a produção de `n` unidades de um refinado em etapas:
 * makes = refinos a fazer (qtd e taxa da bancada); buys = tudo que precisa ser comprado.
 */
export function materialPlan(unit, n, rrr, out = { buys: [], makes: [] }) {
  out.makes.push({ mid: marketId(unit.uniq), qty: n, fee: unit.fee * n });
  for (const l of unit.lines) {
    const q = n * l.qty * (1 - rrr);
    if (l.sub) materialPlan(l.sub, q, rrr, out);
    else out.buys.push({ mid: l.mid, name: l.name, qty: q, unit: l.unit, city: l.city, date: l.date, refined: l.refined });
  }
  return out;
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
