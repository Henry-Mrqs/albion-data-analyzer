// IDEIA-058: custo de craftar o mesmo item em cada cidade. Pura: sem React, fetch ou localStorage.
// Não tem fórmula própria: chama computeCraft uma vez por cidade, trocando só cidade, material, taxa e RRR manual.
import { CRAFT_CITIES } from './catalog';
import { computeCraft } from './craftPlan';
import { validateInputs } from './inputRules';

const isEmpty = (x) => x == null || (typeof x === 'string' && x.trim() === '');
const isObj = (x) => x != null && typeof x === 'object' && !Array.isArray(x);

/**
 * compareCraftCities({ rec, targetMid, prices, cfg, premium, bonusCity, feeCeiling, scenario, feeByCity, cities })
 *  -> { rows, best, spread, issues }
 * scenario 'own' = materiais comprados na própria cidade de craft; qualquer outro valor = 'best' (cidade mais barata de cada material).
 * feeByCity: { [cidade]: taxa }; vazio/ausente = taxa geral da tela (cfg.feePer100).
 * A especialização vem da regra do item (bonusCity === cidade) e o RRR manual é desligado; foco, diário, refino e ordens valem para todas.
 */
export function compareCraftCities({ rec, targetMid, prices, cfg, premium, bonusCity, feeCeiling, scenario = 'best', feeByCity = {}, cities = CRAFT_CITIES }) {
  if (!rec) return { rows: [], best: null, spread: null, issues: [] };
  const fees = isObj(feeByCity) ? feeByCity : {};
  const issues = [];

  const built = cities.map((city, order) => {
    const raw = fees[city];
    let feePer100 = cfg.feePer100;
    let feeSource = 'general';
    if (!isEmpty(raw)) {
      const v = validateInputs({ feePer100: raw }, { kind: 'craft', premium, feeCeiling });
      feePer100 = v.values.feePer100;
      feeSource = 'city';
      issues.push(...v.issues.filter((i) => i.field === 'feePer100').map((i) => ({ ...i, field: `feeByCity.${city}` })));
    }
    const c = computeCraft({
      rec, targetMid, prices, premium, bonusCity, feeCeiling,
      cfg: { ...cfg, craftCity: city, specialty: null, matCity: scenario === 'own' ? city : 'best', feePer100, customRRR: '' },
    });
    const complete = c.missing.length === 0;
    return {
      order,
      row: {
        city,
        isBonus: !!bonusCity && bonusCity === city,
        specialty: c.rates.specialty,
        rrr: c.rates.craftRRR,
        matCost: complete ? c.matCost : null,
        fee: c.fee,
        extras: c.extras,
        totalCost: complete ? c.totalCost : null,
        unitCost: complete ? c.unitCost : null,
        complete,
        missing: [...new Set(c.missing)],
        feeSource,
        deltaVsBonus: null,
        deltaVsBest: null,
      },
    };
  });

  const done = built.filter((b) => b.row.complete).sort((a, b) => a.row.totalCost - b.row.totalCost || a.order - b.order);
  const rows = [...done, ...built.filter((b) => !b.row.complete)].map((b) => b.row);
  const best = done.length ? done[0].row : null;
  const bonusRow = rows.find((r) => r.isBonus && r.complete);
  for (const r of rows) {
    if (!r.complete) continue;
    r.deltaVsBest = r.totalCost - best.totalCost;
    r.deltaVsBonus = bonusRow ? r.totalCost - bonusRow.totalCost : null;
  }
  const spread = done.length >= 2 ? done[done.length - 1].row.totalCost - best.totalCost : null;
  return { rows, best, spread, issues };
}
