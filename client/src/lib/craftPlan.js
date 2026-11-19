// Lógica de cálculo da tela de Craft (pura: sem React, fetch ou localStorage).
import { REFINING, recipeValue, nameOf, refinedTypeOf, tierOf } from './catalog';
import { SELL_CITIES, quote } from './market';
import { cleanCraftCfg } from './inputRules';
import { extrasTotal } from './extras';
import { rrr as calcRRR, resolveRRR, refineUnit, refineChainIds, buyQuote, materialPlan, netSale, stationFee, roundFee } from './econ';

export const keyOf = (uniq) => uniq.replace(/^T\d_/, '').replace(/_LEVEL\d$/, '');
export const canRefineUniq = (uniq) => !!refinedTypeOf(uniq) && tierOf(uniq) >= 2;

// 'buy' = compra o refinado pronto; 'all' = produz desde o recurso bruto mais baixo; 'best' = mais barato em cada nível
export const modeOf = (refineCfg, uniq) => {
  const v = refineCfg[keyOf(uniq)];
  return v === 'buy' ? 'buy' : v === 'refine' || v === 'all' ? 'all' : 'best';
};

// todos os itens das cadeias de refino ficam na mesma consulta (permite comparar as rotas)
export function craftChainIds(rec, targetMid) {
  const chainMids = [];
  if (rec) {
    chainMids.push(targetMid);
    for (const r of rec.res) {
      if (canRefineUniq(r.uniq)) chainMids.push(...refineChainIds(r.uniq, true));
      else chainMids.push(r.mid);
    }
  }
  return [...new Set(chainMids)];
}

export function craftRates(cfg, bonusCity) {
  const specialty = cfg.specialty ?? (bonusCity === cfg.craftCity);
  const crafts = Math.max(1, +cfg.crafts || 1);
  const autoRRR = calcRRR({ kind: 'craft', specialty, focus: cfg.focus, daily: +cfg.craftDaily || 0 });
  const craftRRR = resolveRRR(autoRRR, cfg.customRRR);
  // RRR do refino por tipo de recurso: bônus base + bônus da cidade especializada (se refinar lá) + foco + bônus diário do recurso
  const refineRRRFor = (type, daily = +(cfg.refineDaily?.[type] ?? 0)) =>
    calcRRR({ kind: 'refine', specialty: cfg.refineCity === 'auto' || REFINING[type].city === cfg.refineCity, focus: cfg.refineFocus, daily });
  return { specialty, crafts, autoRRR, craftRRR, refineRRRFor };
}

// materiais sem preço dentro de cadeias de refino
function sub0(lines) {
  const out = [];
  for (const l of lines) if (l.sub) l.sub.missing.forEach((m) => out.push(nameOf(m)));
  return out;
}

export function computeCraft({ rec, targetMid, prices, cfg: rawCfg, premium, bonusCity, feeCeiling }) {
  // IDEIA-060: entradas fora da faixa são corrigidas aqui (a lib se defende sozinha) e devolvidas como `issues`
  const refineTypes = rec ? [...new Set(rec.res.filter((r) => canRefineUniq(r.uniq)).map((r) => refinedTypeOf(r.uniq)))] : [];
  const { cfg, issues } = cleanCraftCfg(rawCfg, { premium, feeCeiling, refineTypes });
  const rates = craftRates(cfg, bonusCity);
  const { crafts, craftRRR, refineRRRFor } = rates;

  const matCtx = { prices, city: cfg.matCity, useOrders: cfg.useOrders };
  const refCtx = { ...matCtx, feePer100: +cfg.refineFee || 0 };

  const lines = rec
    ? rec.res.map((r) => {
        const canRefine = canRefineUniq(r.uniq);
        const mode = modeOf(cfg.refine, r.uniq);
        const qty = r.count * crafts * (r.returnable ? 1 - craftRRR : 1);
        const q = buyQuote(prices, r.mid, matCtx);
        let unit = q.price;
        let date = q.date;
        let city = q.city;
        let sub = null;
        let cmp = null;
        if (canRefine && prices) {
          const type = refinedTypeOf(r.uniq);
          const ctxAt = (daily) => ({ ...refCtx, rrr: refineRRRFor(type, daily) });
          const sAll = refineUnit(r.uniq, { ...ctxAt(), route: 'all' });
          const sBest = refineUnit(r.uniq, { ...ctxAt(), route: 'best' });
          const bestAt = (daily) => {
            const b = refineUnit(r.uniq, { ...ctxAt(daily), route: 'best' });
            const ok = !b.missing.length && b.cost > 0;
            return ok && (!q.price || b.cost < q.price) ? b.cost : q.price;
          };
          const okAll = !sAll.missing.length && sAll.cost > 0;
          const okBest = !sBest.missing.length && sBest.cost > 0;
          const bestIsMake = okBest && (!q.price || sBest.cost < q.price);
          cmp = {
            buy: q.price,
            all: okAll ? sAll.cost : 0,
            best: bestIsMake ? sBest.cost : q.price,
            bestIsMake,
            d10: bestAt(10),
            d20: bestAt(20),
          };
          const make = mode === 'all' || (mode === 'best' && bestIsMake);
          if (make) {
            sub = mode === 'all' ? sAll : sBest;
            unit = sub.cost;
            date = null;
            city = null;
          }
        }
        const rr = canRefine ? refineRRRFor(refinedTypeOf(r.uniq)) : 0;
        return { ...r, rr, qty, unit, total: qty * unit, date, city, sub, mode, cmp, useRefine: !!sub, canRefine };
      })
    : [];

  const matCost = lines.reduce((s, l) => s + l.total, 0);
  const fee = rec ? roundFee(stationFee(recipeValue(rec), +cfg.feePer100 || 0, crafts)) : 0;
  // IDEIA-048: despesas extras só somam ao custo (não mudam RRR, foco nem taxa de bancada: dossiê X4)
  const extrasList = cfg.extras;
  const extras = extrasTotal(extrasList, crafts);
  const totalCost = matCost + fee + extras;
  const units = rec ? rec.amount * crafts : 0;
  const unitCost = units ? totalCost / units : 0;
  const missing = lines.filter((l) => !l.unit).map((l) => l.name);
  if (sub0(lines)) missing.push(...sub0(lines));

  // opções de venda
  const options = [];
  for (const city of SELL_CITIES) {
    const buy = quote(prices, targetMid, city, 'buy');
    const sell = quote(prices, targetMid, city, 'sell');
    if (buy.price > 0) options.push({ city, mode: 'instant', label: 'Ordem de compra', price: buy.price, date: buy.date });
    if (sell.price > 0 && city !== 'Black Market') options.push({ city, mode: 'order', label: 'Ordem de venda', price: sell.price, date: sell.date });
  }
  options.forEach((o) => {
    o.noTax = cfg.noTax[`${o.city}|${o.mode}`] === true; // venda fora do mercado: sem imposto e sem taxa de criação (X3)
    o.net = netSale(o.price, o.noTax ? 'none' : o.mode, premium) * units;
    o.profit = o.net - totalCost;
    o.margin = totalCost > 0 ? (o.profit / totalCost) * 100 : 0;
  });
  options.sort((a, b) => b.profit - a.profit);
  const best = options[0];
  const ready = rec && missing.length === 0 && best;

  // ----- plano: o que comprar, onde, quanto, e o que refinar -----
  const plan = [];
  const used = new Set();
  for (const l of lines) {
    if (l.sub) {
      const p = materialPlan(l.sub, l.qty, l.rr);
      p.makes.forEach((m) => plan.push({ kind: 'make', ...m, total: m.fee }));
      p.buys.forEach((b) => plan.push({ kind: 'buy', ...b, total: b.qty * b.unit }));
      p.buys.forEach((b) => b.city && used.add(`${b.mid}|${b.city}`));
    } else {
      plan.push({ kind: 'buy', mid: l.mid, name: l.name, qty: l.qty, unit: l.unit, city: l.city, date: l.date, total: l.total, refined: l.canRefine });
      if (l.city) used.add(`${l.mid}|${l.city}`);
    }
  }
  const refinable = lines.filter((l) => l.cmp);
  const allBest = refinable.length > 0 && refinable.every((l) => l.mode === 'best');

  return { rates, lines, matCost, fee, extras, extrasList, totalCost, units, unitCost, missing, options, best, ready, plan, used, refinable, allBest, issues };
}

// Economia mínima (prata) para contar como ganho: decisão de produto sem fonte; o mesmo limiar do comparativo de refino da tela.
export const GAIN_THRESHOLD = 0.5;

/**
 * IDEIA-041: quanto o lote economizaria se o bônus diário do item fosse +10% ou +20% (valor ABSOLUTO que substitui o atual).
 * Reaproveita computeCraft em cada cenário (a taxa de bancada não depende do RRR, então não entra na diferença).
 * null se não há receita, preços ou algum material do cenário atual está sem preço.
 */
export function waitSavings({ rec, targetMid, prices, cfg, premium, bonusCity, feeCeiling, levels = [10, 20] }) {
  if (!rec || !prices) return null;
  const args = { rec, targetMid, prices, premium, bonusCity, feeCeiling };
  const now = computeCraft({ ...args, cfg });
  if (now.missing.length) return null;
  const crafts = now.rates.crafts;
  const rows = levels.map((daily) => {
    const totalCost = computeCraft({ ...args, cfg: { ...cfg, craftDaily: daily } }).totalCost;
    const lot = Math.max(0, now.totalCost - totalCost);
    return { daily, totalCost, perCraft: lot / crafts, lot, gain: lot > GAIN_THRESHOLD };
  });
  return { base: now.totalCost, rows };
}

/** "Vale esperar": há ganho e a economia do lote supera o custo de esperar (campo do usuário; inválido ou negativo = 0). */
export const worthWaiting = (row, waitCost) => row.gain && row.lot > Math.max(0, +waitCost || 0);
