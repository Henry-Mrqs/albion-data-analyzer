import { beforeEach, describe, expect, it } from 'vitest';
import { focusOf, recipeOf } from './catalog';
import { craftFocusSummary, craftsWithBudget, focusCost, focusPerCraft, focusValues, refineFocusSummary } from './focus';
import { loadFixtureCatalog, mkPrices, planksSpec } from '../test/helpers';

beforeEach(loadFixtureCatalog);

describe('IDEIA-002: custo de foco (fórmula da fonte, dossiê §4)', () => {
  it.each([[31000, 149.99], [300, 1259.53], [15500, 439.18]])('espada T4.0 (base 1286), eficiência %s → %s', (e, esperado) => expect(focusCost(1286, e)).toBeCloseTo(esperado, 2));
  it('eficiência 0 = custo cheio; cada 10.000 divide ao meio', () => {
    expect(focusCost(1286, 0)).toBe(1286);
    expect(focusCost(1286, 10000)).toBeCloseTo(643, 9);
    expect(focusCost(1286, 20000)).toBeCloseTo(321.5, 9);
  });
  it('orçamento 9.000: 60 crafts a 149,99 e 7 a 1.259,53 (AFM)', () => {
    expect(craftsWithBudget(9000, focusCost(1286, 31000))).toBe(60);
    expect(craftsWithBudget(9000, focusCost(1286, 300))).toBe(7);
  });
  it('orçamento: custo 0, negativo ou orçamento 0 não dividem por zero', () => {
    for (const [b, c] of [[100, 0], [100, -1], [0, 10], [NaN, 10]]) expect(craftsWithBudget(b, c)).toBe(0);
  });
  it('override vence a fórmula; base 0 ou null = none', () => {
    expect(focusPerCraft({ base: 1286, efficiency: 31000, override: 120 })).toEqual({ points: 120, source: 'override' });
    expect(focusPerCraft({ base: 1286, efficiency: 31000 }).source).toBe('formula');
    expect(focusPerCraft({ base: 0 }).source).toBe('none');
    expect(focusPerCraft({ base: null }).source).toBe('none');
  });
  it('encantos: espada .1 a 31.000 = 262,53 (2.251 do dump)', () => expect(focusCost(2251, 31000)).toBeCloseTo(262.53, 2));
});

// Cenário do dossiê §4: espada T4 em cidade de bônus (specialty explícito), preços hipotéticos 200/150.
const BUY = { METALBAR: 'buy', LEATHER: 'buy' };
const craftCfg = (over = {}) => ({
  craftCity: 'Lymhurst', specialty: true, focus: false, feePer100: 500, customRRR: '',
  matCity: 'best', useOrders: false, crafts: 1,
  refine: BUY, refineFocus: false, refineFee: 400, refineCity: 'auto', refineDaily: {},
  ...over,
});
const ARGS = () => ({ rec: recipeOf('T4_MAIN_SWORD'), targetMid: 'T4_MAIN_SWORD', prices: mkPrices({ T4_METALBAR: 200, T4_LEATHER: 150, T4_MAIN_SWORD: 9000 }), premium: true, bonusCity: null });
const S = (o = {}, cfgOver = {}) => craftFocusSummary({ ...ARGS(), cfg: craftCfg(cfgOver), base: 1286, ...o });

describe('IDEIA-002: craftFocusSummary (dossiê §4)', () => {
  it('economia do foco = 3.308,27 − 2.291,67 = 1.016,60 por craft', () => expect(S({ efficiency: 31000 }).savingsPerCraft).toBeCloseTo(1016.60, 2));
  it('prata por ponto: 6,78 com eficiência 31.000 (100/100) e 0,81 com 300 (nó 10, sem spec)', () => {
    expect(S({ efficiency: 31000 }).silverPerPoint).toBeCloseTo(6.78, 2);
    expect(S({ efficiency: 300 }).silverPerPoint).toBeCloseTo(0.81, 2);
  });
  it('pontos e orçamento: 149,99 por craft; 9.000 de foco = 60 crafts', () => {
    const s = S({ efficiency: 31000, budget: 9000 });
    expect(s.pointsPerCraft).toBeCloseTo(149.99, 2);
    expect(s.craftsInBudget).toBe(60);
  });
  it('a taxa de bancada não muda com foco (dossiê F7): 216 por craft com ou sem foco', () => {
    const s = S({ efficiency: 31000 });
    expect(s.feeOn).toBe(216);
    expect(s.feeOff).toBe(216);
  });
  it('custo total com e sem foco = material + taxa; lucro com e sem foco usa o melhor destino de cada', () => {
    const s = S({ efficiency: 31000 });
    expect(s.costOff).toBeCloseTo(3308.27 + 216, 2);
    expect(s.costOn).toBeCloseTo(2291.67 + 216, 2);
    expect(s.profitOn - s.profitOff).toBeCloseTo(1016.60, 2);
  });
  it('override do jogo vence a fórmula: 120 pontos → prata/ponto = 1.016,60/120 = 8,47', () => {
    const s = S({ efficiency: 31000, override: 120 });
    expect(s.silverPerPoint).toBeCloseTo(8.4717, 3);
    expect(s.pointsPerCraft).toBe(120);
  });
  it('lote: 100 crafts multiplica pontos e economia (a razão por ponto não muda)', () => {
    const s = S({ efficiency: 31000 });
    const l = S({ efficiency: 31000 }, { crafts: 100 });
    expect(l.pointsLot).toBeCloseTo(100 * s.pointsPerCraft, 6);
    expect(l.savingsLot).toBeCloseTo(100 * s.savingsPerCraft, 6);
    expect(l.silverPerPoint).toBeCloseTo(s.silverPerPoint, 6);
  });
  it('veredito: sem referência = info; referência 5 → worth (6,78 ≥ 5); referência 10 → notworth; base 0 → nofocus', () => {
    expect(S({ efficiency: 31000 }).verdict).toBe('info');
    expect(S({ efficiency: 31000, reference: 5 }).verdict).toBe('worth');
    expect(S({ efficiency: 31000, reference: 10 }).verdict).toBe('notworth');
    expect(S({ base: 0, reference: 5 }).verdict).toBe('nofocus');
    expect(S({ base: null }).verdict).toBe('nofocus');
  });
  it('veredito só existe com referência positiva: referência 0 ou nula = info', () => {
    expect(S({ efficiency: 31000, reference: 0 }).verdict).toBe('info');
    expect(S({ efficiency: 31000, reference: null }).verdict).toBe('info');
  });
  it('base 0 mas override do jogo digitado: calcula com o override', () => {
    const s = S({ base: 0, override: 100 });
    expect(s.verdict).toBe('info');
    expect(s.silverPerPoint).toBeCloseTo(10.166, 3);
  });
  it('o foco só economiza o que retorna: artefato (maxreturnamount 0) não entra na economia', () => {
    const rec = recipeOf('T6_MAIN_SWORD_CRYSTAL');
    const prices = mkPrices({ T6_METALBAR: 200, T6_LEATHER: 150, T6_ARTEFACT_MAIN_SWORD_CRYSTAL: 5000, T6_MAIN_SWORD_CRYSTAL: 20000 });
    const s = craftFocusSummary({ rec, targetMid: 'T6_MAIN_SWORD_CRYSTAL', prices, cfg: craftCfg(), premium: true, bonusCity: null, base: 3939, efficiency: 0 });
    const ret = 16 * 200 + 8 * 150; // só barra e couro retornam
    expect(s.savingsPerCraft).toBeCloseTo(ret * (1 - 33 / 133 - (1 - 92 / 192)), 6);
  });
  it('item rende 5 (poção): pontos por unidade = pontos por craft / 5', () => {
    const rec = recipeOf('T4_POTION_HEAL');
    const prices = mkPrices({ T4_BURDOCK: 10, T3_EGG: 20, T4_POTION_HEAL: 500 });
    const s = craftFocusSummary({ rec, targetMid: 'T4_POTION_HEAL', prices, cfg: craftCfg({ refine: {} }), premium: true, bonusCity: null, base: 210 });
    expect(s.pointsPerCraft).toBe(210);
    expect(s.pointsPerUnit).toBe(42);
  });
  it('sem preços ou sem receita: null (não inventa número)', () => {
    expect(craftFocusSummary({ ...ARGS(), prices: null, cfg: craftCfg(), base: 1286 })).toBeNull();
    expect(craftFocusSummary({ ...ARGS(), rec: null, cfg: craftCfg(), base: 1286 })).toBeNull();
  });
  it('material sem preço: null', () => {
    expect(craftFocusSummary({ ...ARGS(), prices: mkPrices({ T4_METALBAR: 200 }), cfg: craftCfg(), base: 1286 })).toBeNull();
  });
  it('o cfg.focus do usuário não altera o resultado (o cartão compara com e sem foco)', () => {
    expect(S({ efficiency: 31000 }, { focus: true })).toEqual(S({ efficiency: 31000 }, { focus: false }));
  });
  it('devolve o orçamento e a referência usados (para o cartão mostrar)', () => {
    expect(S({ efficiency: 0, budget: 9000, reference: 5 })).toMatchObject({ budget: 9000, reference: 5 });
    expect(S({ efficiency: 0 })).toMatchObject({ budget: 0, reference: null });
  });
  it('o cfg recebido não é mutado', () => {
    const cfg = craftCfg();
    const copy = structuredClone(cfg);
    craftFocusSummary({ ...ARGS(), cfg, base: 1286 });
    expect(cfg).toEqual(copy);
  });
  it('campos ausentes ou lixo (estado antigo): eficiência undefined/NaN/null = 0 e orçamento ausente = 0 crafts, sem NaN', () => {
    for (const eff of [undefined, NaN, null]) {
      const s = S({ efficiency: eff });
      expect(s.pointsPerCraft).toBe(1286);
      expect(Number.isFinite(s.silverPerPoint)).toBe(true);
      expect(s.craftsInBudget).toBe(0);
    }
  });
});

describe('IDEIA-002: focusValues (campos de foco salvos no navegador)', () => {
  it('estado salvo antigo ({}): padrões, sem aviso e sem NaN', () => {
    const r = focusValues({});
    expect(r.values).toEqual({ efficiency: 0, override: null, budget: 10000, reference: null });
    expect(r.issues).toEqual([]);
  });
  it('estado salvo nulo ou sem objeto: não lança', () => {
    for (const c of [undefined, null]) expect(focusValues(c).values).toEqual({ efficiency: 0, override: null, budget: 10000, reference: null });
  });
  it('lê focusEff, focusPoints, focusBudget e focusRef; texto digitado vale', () => {
    const r = focusValues({ focusEff: '31000', focusPoints: '120', focusBudget: '9000', focusRef: '5' });
    expect(r.values).toEqual({ efficiency: 31000, override: 120, budget: 9000, reference: 5 });
    expect(r.issues).toEqual([]);
  });
  it('fora de faixa avisa e usa o corrigido; os avisos levam o nome do campo da tela', () => {
    const r = focusValues({ focusEff: '99999', focusPoints: '-3', focusBudget: 'x', focusRef: '-1' });
    expect(r.values).toEqual({ efficiency: 31000, override: null, budget: 10000, reference: null });
    expect(r.issues.map((i) => i.field).sort()).toEqual(['focusBudget', 'focusEff', 'focusPoints', 'focusRef']);
  });
});

// Refino: Cenário A da 001 (Tábua T4: 2 Madeira T4 + 1 Tábua T3), cidade especializada: RRR sem foco 58/158, com foco 117/217.
const RRR_OFF = 58 / 158;
const RRR_ON = 117 / 217;
const rctx = (over = {}) => ({ prices: mkPrices(planksSpec()), city: 'best', useOrders: false, feePer100: 400, route: 'buy', ...over });
const R = (o = {}) => refineFocusSummary({ uniq: 'T4_PLANKS', ctx: rctx(), rrrOn: RRR_ON, rrrOff: RRR_OFF, base: focusOf('T4_PLANKS', 0), qty: 1, ...o });

describe('IDEIA-002: refineFocusSummary', () => {
  it('Tábua T4, rota buy: pontos por unidade = f(T4_PLANKS) = 54 com eficiência 0', () => expect(R().pointsPerUnit).toBeCloseTo(54, 9));
  it('economia por unidade = bruto 110 × (0,632911 − 0,460829) = 18,93 → 0,35 prata por ponto', () => {
    const s = R();
    expect(s.savingsPerUnit).toBeCloseTo(18.929, 3);
    expect(s.silverPerPoint).toBeCloseTo(0.3505, 4);
  });
  it('rota all soma o foco de cada etapa: T4 + T3 e T2 pelas quantidades do plano com foco', () => {
    const s = R({ ctx: rctx({ route: 'all' }) });
    const k = 1 - RRR_ON;
    expect(s.pointsPerUnit).toBeCloseTo(focusOf('T4_PLANKS', 0) + focusOf('T3_PLANKS', 0) * k + focusOf('T2_PLANKS', 0) * k * k, 9);
    expect(s.pointsPerUnit).toBeCloseTo(54 + 31 * k + 18 * k * k, 9);
    expect(s.steps).toHaveLength(3);
  });
  it('eficiência vale em todas as etapas (cada 10.000 divide ao meio)', () => {
    const a = R({ ctx: rctx({ route: 'all' }) });
    const b = R({ ctx: rctx({ route: 'all' }), efficiency: 10000 });
    expect(b.pointsPerUnit).toBeCloseTo(a.pointsPerUnit / 2, 9);
  });
  it('encanto .1 usa ef: T4_PLANKS_LEVEL1 (94)', () => {
    const prices = mkPrices({ ...planksSpec(), 'T4_WOOD_LEVEL1@1': 40, 'T3_PLANKS_LEVEL1@1': 70, 'T4_PLANKS_LEVEL1@1': 200 });
    const s = refineFocusSummary({ uniq: 'T4_PLANKS_LEVEL1', ctx: rctx({ prices }), rrrOn: RRR_ON, rrrOff: RRR_OFF, base: focusOf('T4_PLANKS', 1), qty: 1 });
    expect(s.pointsPerUnit).toBeCloseTo(94, 9);
  });
  it('sem foco no catálogo (base null): verdict = nofocus', () => {
    expect(R({ base: null }).verdict).toBe('nofocus');
    expect(R({ base: 0 }).verdict).toBe('nofocus');
  });
  it('lote: qty multiplica pontos e economia; a razão por ponto não muda', () => {
    const s = R();
    const l = R({ qty: 100 });
    expect(l.pointsLot).toBeCloseTo(100 * s.pointsPerUnit, 6);
    expect(l.savingsLot).toBeCloseTo(100 * s.savingsPerUnit, 6);
    expect(l.silverPerPoint).toBeCloseTo(s.silverPerPoint, 9);
  });
  it('orçamento: 54 pontos por unidade, 10.000 de foco = 185 unidades', () => expect(R({ budget: 10000 }).unitsInBudget).toBe(185));
  it('override do jogo vale só para a etapa final: 40 na final + 31 do T3 (rota all, eficiência 0)', () => {
    const s = R({ ctx: rctx({ route: 'all' }), override: 40 });
    const k = 1 - RRR_ON;
    expect(s.pointsPerUnit).toBeCloseTo(40 + 31 * k + 18 * k * k, 9);
    expect(s.source).toBe('override');
  });
  it('veredito pela referência: 0,35 por ponto: referência 0,3 → worth; 1 → notworth; sem referência → info', () => {
    expect(R({ reference: 0.3 }).verdict).toBe('worth');
    expect(R({ reference: 1 }).verdict).toBe('notworth');
    expect(R().verdict).toBe('info');
  });
  it('sem preços ou preço faltando: null', () => {
    expect(R({ ctx: rctx({ prices: null }) })).toBeNull();
    expect(R({ ctx: rctx({ prices: mkPrices(planksSpec({ T4_WOOD: null })) }) })).toBeNull();
  });
  it('campos ausentes (estado antigo): eficiência undefined = 0, orçamento ausente = 0, sem NaN', () => {
    const s = R({ efficiency: undefined, budget: undefined });
    expect(s.pointsPerUnit).toBeCloseTo(54, 9);
    expect(s.unitsInBudget).toBe(0);
    expect(Number.isFinite(s.silverPerPoint)).toBe(true);
  });
});
