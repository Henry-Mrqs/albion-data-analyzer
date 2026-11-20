// Cenários e montagem de entradas do auditor (IDEIA-005) para os testes de lib. Sem JSX.
// As funções assemble* repetem a MONTAGEM que cada tela faz (quais funções chamar, em que ordem); nenhuma conta é feita aqui.
import { REFINING, craftBonusCity, craftCategories, getItem, marketId, recipeOf, recipeVariants } from '../lib/catalog';
import { annotateOptions } from '../lib/exits';
import { computeCraft } from '../lib/craftPlan';
import { effectiveDaily } from '../lib/dailyBonus';
import { pickCheapest, resolveVariant } from '../lib/recipeAlt';
import { compareCraftCities } from '../lib/cityCompare';
import { cleanRefineCfg, validateInputs } from '../lib/inputRules';
import { evaluateTier } from '../lib/refinePlan';
import { cleanRelist } from '../lib/relist';
import { extrasPerUnit, REFINE_NO_TAX_KEY } from '../lib/extras';
import { rrr as calcRRR, resolveRRR } from '../lib/econ';
import { itemCraftInfo, recipeReturn, rrrFor } from '../lib/rrrCalc';
import { mkPrices, planksSpec } from './helpers';

export const NOW = Date.parse('2026-11-19T12:00:00Z'); // servidor west: reset às 10:00 UTC
export const H = 3600000;
const BUY = { METALBAR: 'buy', LEATHER: 'buy' };

// ---------- Craft ----------
/** Espada T4 (dossiê 005 §5: custo 3.524,27 com bancada 500; venda Caerleon 4.500) e cajado oculto T4 (receita com 2 variantes e cadeia de tábuas). */
export const CRAFT_SCENARIOS = {
  sword: {
    item: { id: 'T4_MAIN_SWORD', ench: 0 },
    cfg: () => ({
      craftCity: 'Lymhurst', specialty: true, focus: false, feePer100: 500, customRRR: '', matCity: 'best', useOrders: false, crafts: 1,
      refine: { ...BUY }, refineFocus: false, refineFee: 400, refineCity: 'auto', refineDaily: {},
    }),
    prices: (now = NOW) =>
      mkPrices({
        T4_METALBAR: { 'Fort Sterling': { s: 200, b: 180, sd: now - 3 * H, bd: now - 3 * H } },
        T4_LEATHER: { 'Fort Sterling': { s: 150, b: 130, sd: now - 3 * H, bd: now - 3 * H } },
        T4_MAIN_SWORD: { Caerleon: { s: 4500, b: 4300, sd: now - 2 * H, bd: now - 2 * H } },
      }),
  },
  // IDEIA-065: espada com oferta isolada (Caerleon 12.000) e histórico de 7 dias (mediana 6.309): o preço realista ancora em 7.886,25
  anchored: {
    item: { id: 'T4_MAIN_SWORD', ench: 0 },
    cfg: () => ({
      craftCity: 'Lymhurst', specialty: true, focus: false, feePer100: 500, customRRR: '', matCity: 'best', useOrders: false, crafts: 1,
      refine: { ...BUY }, refineFocus: false, refineFee: 400, refineCity: 'auto', refineDaily: {},
    }),
    prices: (now = NOW) =>
      mkPrices({
        T4_METALBAR: { 'Fort Sterling': { s: 200, b: 180, sd: now - 3 * H, bd: now - 3 * H } },
        T4_LEATHER: { 'Fort Sterling': { s: 150, b: 130, sd: now - 3 * H, bd: now - 3 * H } },
        T4_MAIN_SWORD: { Caerleon: { s: 12000, sd: now - 2 * H } },
      }),
    history: (now = NOW) => {
      const day = Math.floor(now / 86400000) * 86400000;
      return { T4_MAIN_SWORD: { Caerleon: [8431, 5381, 2009, 5498, 8316, 10999, 6309].map((p, i) => ({ t: day - (7 - i) * 86400000, n: 10, p })) } };
    },
  },
  staff: {
    item: { id: 'T4_2H_ARCANESTAFF_HELL', ench: 0 },
    cfg: () => ({
      craftCity: 'Lymhurst', specialty: true, focus: false, feePer100: 500, customRRR: '', matCity: 'best', useOrders: false, crafts: 1,
      refine: { PLANKS: 'buy', METALBAR: 'buy' }, refineFocus: false, refineFee: 400, refineCity: 'auto', refineDaily: {},
    }),
    prices: (now = NOW) =>
      mkPrices(
        planksSpec({
          T4_PLANKS: { 'Fort Sterling': { s: 100, b: 90, sd: now - 3 * H, bd: now - 3 * H } },
          T4_METALBAR: { 'Fort Sterling': { s: 200, b: 180, sd: now - 3 * H, bd: now - 3 * H } },
          T4_ARTEFACT_2H_ARCANESTAFF_HELL: 1840,
          T4_ARTEFACT_TOKEN_FAVOR_2: 18498,
          T4_2H_ARCANESTAFF_HELL: { Caerleon: { s: 9000, b: 8500, sd: now - 2 * H, bd: now - 2 * H } },
        }),
      ),
  },
};

/**
 * Monta o que Crafting.jsx monta: devolve { input (para auditCraft), c (resultado), results, idx }.
 * over = trocas na cfg; scenario = 'sword' | 'staff'.
 */
export function assembleCraft({ scenario = 'sword', over = {}, prices, premium = true, server = 'west', now = NOW, feeCeiling = 1000, cfg: whole } = {}) {
  const sc = CRAFT_SCENARIOS[scenario];
  const cfg = whole ?? { ...sc.cfg(), ...over };
  const { id, ench } = sc.item;
  const item = getItem(id);
  const variants = recipeVariants(id, ench);
  const targetMid = marketId(id, ench);
  const bonusCity = craftBonusCity(item);
  const px = prices === undefined ? sc.prices(now) : prices;
  const daily = effectiveDaily({ value: cfg.craftDaily ?? 0, setAt: cfg.craftDailyAt, now, server });
  const cfgEff = { ...cfg, craftDaily: daily.value };
  const anchor = sc.history ? { history: sc.history(now), now } : undefined;
  const run = (rec) => computeCraft({ rec, targetMid, prices: px, cfg: cfgEff, premium, bonusCity, feeCeiling, anchor });
  const results = variants.map((v) => run(v.rec));
  const auto = pickCheapest(results);
  const idx = resolveVariant(cfg.recipeVariant, variants.length, auto);
  const rec = variants[idx]?.rec ?? null;
  const c = results[idx] ?? run(null);
  const opts = annotateOptions(c.options, px, targetMid, { now });
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const compare = rec && px
    ? compareCraftCities({ rec, targetMid, prices: px, cfg: cfgEff, premium, bonusCity, feeCeiling, scenario: cfg.cityScenario === 'own' ? 'own' : 'best', feeByCity: isObj(cfg.feeByCity) ? cfg.feeByCity : {} })
    : null;
  return { input: { cfg, cfgEff, daily, results, variants, idx, result: c, opts, compare, bonusCity, premium, server, now, feeCeiling, targetMid, item }, c, results, idx };
}

/** Medida do teste de sensibilidade do Craft. */
export const craftMeasure = (a) => ({ totalCost: a.c.totalCost, profit: a.c.best?.profit ?? null });

// ---------- Refino ----------
export const refineCfg = (over = {}) => ({
  type: 'PLANKS', tier: 4, ench: 0, buyCity: 'best', refineCity: 'Fort Sterling', sellCity: 'best',
  focus: false, daily: 0, feePer100: 400, customRRR: '', useOrders: false, route: 'best', sellMode: 'order', qty: 100,
  ...over,
});

/** Cenário A do plano 001/005: tábua T4, custo 61,4734; venda Martlock 135 em ordem de venda (e Mercado Negro 140). */
export const refinePrices = (now = NOW) =>
  mkPrices(
    planksSpec({
      T4_WOOD: { 'Fort Sterling': { s: 30, b: 27, sd: now - 3 * H, bd: now - 3 * H } },
      T4_PLANKS: {
        'Fort Sterling': { s: 120, b: 100, sd: now - 3 * H, bd: now - 3 * H },
        Martlock: { s: 135, b: 125, sd: now - 2 * H, bd: now - 2 * H },
        'Black Market': { b: 140, bd: now - 2 * H },
      },
    }),
  );

/** Monta o que Refining.jsx monta. */
export function assembleRefine({ over = {}, prices, premium = true, feeCeiling = 1000, now = NOW, cfg: whole } = {}) {
  const cfg = whole ?? refineCfg(over);
  const info = REFINING[cfg.type];
  const ench = cfg.type === 'STONEBLOCK' ? 0 : cfg.ench;
  const uniqOf = (tier) => `T${tier}_${cfg.type}${ench ? `_LEVEL${ench}` : ''}`;
  const specialty = info.city === cfg.refineCity;
  const { cfg: vcfg, issues: baseIssues } = cleanRefineCfg(cfg, { premium, feeCeiling });
  const rl = cleanRelist(cfg, { premium }); // IDEIA-059 (espelha a tela do Refino)
  const issues = [...baseIssues, ...rl.issues];
  const autoRRR = calcRRR({ kind: 'refine', specialty, focus: cfg.focus, daily: vcfg.daily });
  const rrrValue = resolveRRR(autoRRR, vcfg.customRRR);
  const px = prices === undefined ? refinePrices(now) : prices;
  const route = cfg.route ?? (cfg.deep ? 'all' : 'best');
  const ctx = { prices: px, city: cfg.buyCity, useOrders: cfg.useOrders, rrr: rrrValue, feePer100: vcfg.feePer100, route };
  const perUnitExtras = extrasPerUnit(vcfg.extras, vcfg.qty, vcfg.qty);
  const noTax = vcfg.noTax[REFINE_NO_TAX_KEY] === true;
  const cur = px ? evaluateTier({ tier: cfg.tier, uniq: uniqOf(cfg.tier), prices: px, ctx, sellCity: cfg.sellCity, sellMode: cfg.sellMode, premium, extrasPerUnit: perUnitExtras, noTax, relist: rl.values }) : null;
  const input = { cfg, vcfg, issues, cur, info, ench, specialty, autoRRR, rrrValue, perUnitExtras, noTax, route, premium, now, feeCeiling, prices: px, relist: rl.values };
  return { input, cur };
}

export const refineMeasure = (a) => ({ totalCost: a.cur ? a.cur.unit.cost + a.input.perUnitExtras : null, profit: a.cur?.profit ?? null });

// ---------- RRR ----------
export const rrrCfg = (over = {}) => ({ kind: 'craft', city: 'Lymhurst', category: 'sword', resource: 'PLANKS', focus: false, daily: 0, item: null, crafts: 100, ...over });

/** Monta o que RrrCalculator.jsx monta. */
export function assembleRrr({ over = {}, cfg: whole } = {}) {
  const cfg = whole ?? rrrCfg(over);
  const sel = cfg.item ?? { id: 'T6_MAIN_SWORD', ench: 0 };
  const cats = craftCategories();
  const category = cfg.category === '' || cats.includes(cfg.category) ? cfg.category : 'sword';
  const dailyV = validateInputs({ daily: cfg.daily });
  const res = rrrFor({ ...cfg, category });
  const item = getItem(sel.id);
  const info = itemCraftInfo(item);
  const rec = item ? recipeOf(sel.id, sel.ench) : null;
  const rows = rec ? recipeReturn(rec, cfg.crafts, res.rrr) : [];
  return { input: { cfg, category, res, dailyV, item, info, rows, sel }, res, rows };
}

export const rrrMeasure = (a) => ({ rrr: a.res.rrr, returned: a.rows.map((r) => [r.uniq, +r.net.toFixed(6)]) });
