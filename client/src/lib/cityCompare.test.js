import { beforeEach, describe, expect, it } from 'vitest';
import { CRAFT_CITIES, craftBonusCity, getItem, recipeOf } from './catalog';
import { computeCraft } from './craftPlan';
import { compareCraftCities } from './cityCompare';
import { loadFixtureCatalog, mkPrices } from '../test/helpers';

beforeEach(loadFixtureCatalog);

// Preços reais do dossiê IDEIA-058 §4 (API West, 2026-11-18), venda mínima por cidade
const PRICES = mkPrices({
  T4_METALBAR: { Lymhurst: { s: 267 }, 'Fort Sterling': { s: 220 }, Martlock: { s: 267 }, Thetford: { s: 248 }, Bridgewatch: { s: 301 }, Caerleon: { s: 410 } },
  T4_LEATHER: { Lymhurst: { s: 322 }, 'Fort Sterling': { s: 319 }, Martlock: { s: 339 }, Thetford: { s: 337 }, Bridgewatch: { s: 363 } }, // Caerleon sem preço
});
// o catálogo de teste só existe depois do beforeEach: `base` é montado a cada teste (não na carga do módulo)
let base;
beforeEach(() => {
  base = { rec: recipeOf('T4_MAIN_SWORD'), targetMid: 'T4_MAIN_SWORD', prices: PRICES, premium: true, bonusCity: craftBonusCity(getItem('T4_MAIN_SWORD')), feeCeiling: 1000 };
});
const craftCfg = (over = {}) => ({
  craftCity: 'Lymhurst', specialty: null, focus: false, feePer100: 400, customRRR: '',
  matCity: 'best', useOrders: false, crafts: 1,
  refine: {}, refineFocus: false, refineFee: 400, refineCity: 'auto', refineDaily: {},
  ...over,
});
const cfg = (o = {}) => craftCfg({ feePer100: 500, refine: { METALBAR: 'buy', LEATHER: 'buy' }, ...o }); // taxa 500 → 384 × 0,1125 × 5 = 216 em todas
const by = (rows) => Object.fromEntries(rows.map((r) => [r.city, r]));
const run = (o = {}) => compareCraftCities({ ...base, cfg: cfg(), scenario: 'own', ...o });

describe('compareCraftCities: números do dossiê §4', () => {
  it('premissa do dossiê: a cidade de bônus da espada é Lymhurst (lida do catálogo, não escrita na lib)', () => expect(base.bonusCity).toBe('Lymhurst'));

  it('cenário (a), cada cidade com o material da própria cidade', () => {
    const { rows, best, spread } = run();
    const r = by(rows);
    expect(r.Lymhurst.matCost).toBeCloseTo(5148.87, 2);
    expect(r.Lymhurst.totalCost).toBeCloseTo(5364.87, 2); // 6.848 × 0,751880 + 216
    expect(r['Fort Sterling'].totalCost).toBeCloseTo(5361.76, 2); // 6.072 × 0,847458 + 216
    expect(r.Thetford.totalCost).toBeCloseTo(5863.46, 2);
    expect(r.Martlock.totalCost).toBeCloseTo(6134.64, 2);
    expect(r.Bridgewatch.totalCost).toBeCloseTo(6758.37, 2);
    expect(rows.map((x) => x.city)).toEqual(['Fort Sterling', 'Lymhurst', 'Thetford', 'Martlock', 'Bridgewatch', 'Caerleon', 'Brecilien']); // incompletas por último
    expect(best.city).toBe('Fort Sterling');
    expect(spread).toBeCloseTo(1396.61, 2); // 6.758,37 − 5.361,76
  });

  it('RRR por cidade: 33/133 na de bônus e 18/118 nas outras (K1)', () => {
    const r = by(run().rows);
    expect(r.Lymhurst.rrr).toBeCloseTo(0.24812, 6);
    expect(r['Fort Sterling'].rrr).toBeCloseTo(0.152542, 6);
    expect(r.Lymhurst.isBonus).toBe(true);
    expect(r['Fort Sterling'].isBonus).toBe(false);
    expect(r.Lymhurst.specialty).toBe(true);
    expect(r['Fort Sterling'].specialty).toBe(false);
  });

  it('a cidade sem bônus empata com a de bônus: diferença de 3,11 por craft', () => {
    const r = by(run().rows);
    expect(r['Fort Sterling'].deltaVsBonus).toBeCloseTo(-3.11, 2);
    expect(r.Lymhurst.deltaVsBonus).toBe(0);
    expect(r['Fort Sterling'].deltaVsBest).toBe(0);
    expect(r.Lymhurst.deltaVsBest).toBeCloseTo(3.11, 2);
  });

  it('K5: cidade sem preço de algum material é incompleta, nunca custo 0', () => {
    const r = by(run().rows);
    expect(r.Caerleon).toMatchObject({ complete: false, totalCost: null, unitCost: null, deltaVsBonus: null, deltaVsBest: null });
    expect(r.Caerleon.missing).toHaveLength(1); // o couro
    expect(r.Brecilien).toMatchObject({ complete: false, totalCost: null }); // Brecilien não consultada
    expect(r.Lymhurst.complete).toBe(true);
    expect(r.Lymhurst.missing).toEqual([]);
  });

  it('cenário (b), material da cidade mais barata (Fort Sterling, bruto 6.072)', () => {
    const r = by(run({ scenario: 'best' }).rows);
    expect(r.Lymhurst.totalCost).toBeCloseTo(4781.41, 2); // 6.072 × 0,751880 + 216
    for (const c of ['Fort Sterling', 'Thetford', 'Martlock', 'Bridgewatch', 'Caerleon', 'Brecilien']) expect(r[c].totalCost).toBeCloseTo(5361.76, 2);
    expect(r['Fort Sterling'].deltaVsBonus).toBeCloseTo(580.35, 2); // 6.072 × (0,248120 − 0,152542)
  });

  it('cenário padrão é "best"', () => {
    const r = by(compareCraftCities({ ...base, cfg: cfg() }).rows);
    expect(r.Lymhurst.totalCost).toBeCloseTo(4781.41, 2);
  });

  it('cenário desconhecido cai em "best"', () => {
    expect(by(run({ scenario: 'xyz' }).rows).Lymhurst.totalCost).toBeCloseTo(4781.41, 2);
  });
});

describe('taxa por cidade', () => {
  it('taxa maior em Fort Sterling inverte o empate (dossiê §7)', () => {
    const { rows, best } = run({ feeByCity: { 'Fort Sterling': 1000 } });
    const r = by(rows);
    expect(r['Fort Sterling'].fee).toBeCloseTo(432, 6);
    expect(r['Fort Sterling'].totalCost).toBeCloseTo(5577.76, 2);
    expect(best.city).toBe('Lymhurst');
    expect(r.Lymhurst.totalCost).toBeCloseTo(5364.87, 2);
    expect(r['Fort Sterling'].feeSource).toBe('city');
    expect(r.Lymhurst.feeSource).toBe('general');
    expect(r.Lymhurst.fee).toBeCloseTo(216, 6);
  });

  it('valor 5000 vira o teto 1000 com aviso no campo da cidade', () => {
    const { rows, issues } = run({ feeByCity: { 'Fort Sterling': 5000 } });
    expect(by(rows)['Fort Sterling'].fee).toBeCloseTo(432, 6);
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe('feeByCity.Fort Sterling');
  });

  it('valor negativo vira 0 com erro', () => {
    const { rows, issues } = run({ feeByCity: { Lymhurst: -10 } });
    expect(by(rows).Lymhurst.fee).toBe(0);
    expect(issues[0]).toMatchObject({ field: 'feeByCity.Lymhurst', level: 'error' });
  });

  it("vazio ou undefined usam a taxa geral e nunca viram o 400 padrão", () => {
    const { rows, issues } = run({ feeByCity: { Lymhurst: '', Martlock: undefined, Thetford: '  ' } });
    const r = by(rows);
    for (const c of ['Lymhurst', 'Martlock', 'Thetford']) {
      expect(r[c].fee).toBeCloseTo(216, 6);
      expect(r[c].feeSource).toBe('general');
    }
    expect(issues).toEqual([]);
  });

  it('feeByCity inválido (não objeto) é tratado como vazio', () => {
    for (const bad of [null, 'x', 5, []]) expect(by(run({ feeByCity: bad }).rows).Lymhurst.fee).toBeCloseTo(216, 6);
  });

  it('o teto é o recebido (não o 1.000 fixo): 1.500 passa com teto 2.000, 3.000 vira 2.000', () => {
    const ok = run({ feeByCity: { Lymhurst: 1500 }, feeCeiling: 2000 });
    expect(by(ok.rows).Lymhurst.fee).toBeCloseTo(648, 6); // 384 × 0,1125 × 15
    expect(ok.issues).toEqual([]);
    const over = run({ feeByCity: { Lymhurst: 3000 }, feeCeiling: 2000 });
    expect(by(over.rows).Lymhurst.fee).toBeCloseTo(864, 6); // 384 × 0,1125 × 20
  });
});

describe('o que a tabela ignora de propósito e o que vale para todas', () => {
  const totals = (o) => run(o).rows.map((x) => [x.city, x.totalCost, x.rrr]);
  it('interruptor de especialização, RRR manual e cidade escolhida não mudam nenhuma linha', () => {
    const ref = totals();
    expect(compareCraftCities({ ...base, cfg: cfg({ specialty: false, customRRR: '30', craftCity: 'Martlock' }), scenario: 'own' }).rows.map((x) => [x.city, x.totalCost, x.rrr])).toEqual(ref);
    expect(compareCraftCities({ ...base, cfg: cfg({ specialty: true, craftCity: 'Caerleon' }), scenario: 'own' }).rows.map((x) => [x.city, x.totalCost, x.rrr])).toEqual(ref);
  });

  it('foco: Lymhurst 92/192, outras 77/177', () => {
    const r = by(run({ cfg: cfg({ focus: true }) }).rows);
    expect(r.Lymhurst.rrr).toBeCloseTo(92 / 192, 6);
    expect(r['Fort Sterling'].rrr).toBeCloseTo(77 / 177, 6);
  });

  it('diário 20: Lymhurst 53/153, outras 38/138; com foco 112/212 e 97/197', () => {
    const r = by(run({ cfg: cfg({ craftDaily: 20 }) }).rows);
    expect(r.Lymhurst.rrr).toBeCloseTo(53 / 153, 6);
    expect(r.Martlock.rrr).toBeCloseTo(38 / 138, 6);
    const f = by(run({ cfg: cfg({ craftDaily: 20, focus: true }) }).rows);
    expect(f.Lymhurst.rrr).toBeCloseTo(112 / 212, 6);
    expect(f.Martlock.rrr).toBeCloseTo(97 / 197, 6);
  });

  it('nº de crafts escala o custo e a taxa em todas as cidades', () => {
    const r = by(run({ cfg: cfg({ crafts: 10 }) }).rows);
    expect(r.Lymhurst.fee).toBeCloseTo(2160, 6);
    expect(r.Lymhurst.totalCost).toBeCloseTo(5148.87 * 10 + 2160, 1);
  });
});

describe('itens especiais e entradas vazias', () => {
  // preços iguais em todas as cidades para todo material da receita
  const flat = (rec) => mkPrices(Object.fromEntries(rec.res.map((r) => [r.mid, Object.fromEntries(CRAFT_CITIES.slice(0, 6).map((c) => [c, { s: 100 }]))])));

  it('item sem cidade de bônus: mesmo RRR 18/118 em todas, nenhuma isBonus, delta nulo', () => {
    const it2 = getItem('T4_ARMOR_PLATE_ROYAL');
    expect(craftBonusCity(it2)).toBeNull();
    const rec = recipeOf('T4_ARMOR_PLATE_ROYAL');
    const { rows } = compareCraftCities({ rec, targetMid: 'T4_ARMOR_PLATE_ROYAL', prices: flat(rec), cfg: cfg({ refine: {} }), premium: true, bonusCity: null, feeCeiling: 1000, scenario: 'best' });
    for (const r of rows) {
      expect(r.rrr).toBeCloseTo(18 / 118, 6);
      expect(r.isBonus).toBe(false);
      expect(r.deltaVsBonus).toBeNull();
    }
  });

  it('item de Brecilien (bolsa): no cenário (b) Brecilien tem 33/133 e é a de bônus; no (a) fica incompleta', () => {
    const it2 = getItem('T4_BAG');
    const bonusCity = craftBonusCity(it2);
    expect(bonusCity).toBe('Brecilien');
    const rec = recipeOf('T4_BAG');
    const args = { rec, targetMid: 'T4_BAG', prices: flat(rec), cfg: cfg({ refine: {} }), premium: true, bonusCity, feeCeiling: 1000 };
    const b = by(compareCraftCities({ ...args, scenario: 'best' }).rows);
    expect(b.Brecilien.rrr).toBeCloseTo(33 / 133, 6);
    expect(b.Brecilien.isBonus).toBe(true);
    expect(b.Brecilien.complete).toBe(true);
    const a = by(compareCraftCities({ ...args, scenario: 'own' }).rows);
    expect(a.Brecilien.complete).toBe(false);
    expect(a.Brecilien.totalCost).toBeNull();
  });

  it('sem preços: linhas todas incompletas, sem exceção', () => {
    const { rows, best, spread } = run({ prices: null });
    expect(rows).toHaveLength(7);
    expect(rows.every((r) => !r.complete && r.totalCost === null)).toBe(true);
    expect(best).toBeNull();
    expect(spread).toBeNull();
  });

  it('sem receita: nenhuma linha, sem exceção', () => {
    expect(run({ rec: null })).toEqual({ rows: [], best: null, spread: null, issues: [] });
  });

  it('spread é nulo com menos de 2 cidades completas', () => {
    expect(run({ cities: ['Lymhurst', 'Caerleon'] }).spread).toBeNull();
  });
});

describe('reuso de computeCraft', () => {
  it('totalCost de cada linha é o de computeCraft chamado à mão com a mesma configuração', () => {
    const { rows } = run();
    for (const r of rows.filter((x) => x.complete)) {
      const hand = computeCraft({ ...base, cfg: { ...cfg(), craftCity: r.city, specialty: null, matCity: r.city, customRRR: '' } });
      expect(r.totalCost).toBe(hand.totalCost);
      expect(r.matCost).toBe(hand.matCost);
      expect(r.unitCost).toBe(hand.unitCost);
    }
  });
  it('não muta a configuração recebida', () => {
    const c = cfg({ specialty: false, customRRR: '30' });
    const snap = structuredClone(c);
    run({ cfg: c, feeByCity: { Lymhurst: 700 } });
    expect(c).toEqual(snap);
  });
});

describe('compareCraftCities: despesas extras (D4, 076)', () => {
  it('despesas 150 por craft + 80 por craft (1 craft): cada linha completa ganha extras 230 e totalCost = material + taxa + 230 (Fort Sterling 5.361,76 + 230 = 5.591,76)', () => {
    const L = [{ name: '', value: '150', scope: 'craft' }, { name: '', value: '80', scope: 'craft' }];
    const { rows, best, spread } = run({ cfg: cfg({ extras: L }) });
    const r = by(rows);
    expect(r['Fort Sterling'].extras).toBe(230);
    expect(r['Fort Sterling'].totalCost).toBeCloseTo(5591.76, 2);
    expect(r['Fort Sterling'].totalCost).toBeCloseTo(r['Fort Sterling'].matCost + r['Fort Sterling'].fee + r['Fort Sterling'].extras, 6);
    expect(best.city).toBe('Fort Sterling');
    expect(spread).toBeCloseTo(1396.61, 2); // ranking e diferença não mudam: a despesa é igual em todas
  });
  it('3 crafts, 120 por craft + 60 por lote: extras 420 (3 × 120 + 60) em todas as cidades', () => {
    const L = [{ name: '', value: '120', scope: 'craft' }, { name: '', value: '60', scope: 'lote' }];
    const { rows } = run({ cfg: cfg({ crafts: 3, extras: L }) });
    expect(rows).toHaveLength(7);
    for (const r of rows) expect(r.extras).toBe(420);
  });
  it('sem despesas: extras 0 em todas as linhas (inclusive incompletas)', () => {
    const { rows } = run();
    expect(rows.some((r) => !r.complete)).toBe(true);
    for (const r of rows) expect(r.extras).toBe(0);
  });
  it('`fee` da linha é a taxa do LOTE inteiro, não por craft: com 3 crafts e taxa 500, `row.fee` = 648 (3 × 216); com 1 craft, 216 (D-056)', () => {
    expect(by(run({ cfg: cfg({ crafts: 3 }) }).rows)['Fort Sterling'].fee).toBe(648);
    expect(by(run().rows)['Fort Sterling'].fee).toBe(216);
  });
});
