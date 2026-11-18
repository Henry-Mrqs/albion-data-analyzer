import { beforeEach, describe, expect, it } from 'vitest';
import { recipeVariants } from './catalog';
import { computeCraft } from './craftPlan';
import { FEE_DEPENDENCE_WARNING, feeDecides, pickCheapest, resolveVariant, returnBadge, variantLabel } from './recipeAlt';
import { loadFixtureCatalog, mkPrices } from '../test/helpers';

beforeEach(loadFixtureCatalog);

const BUY = { PLANKS: 'buy', METALBAR: 'buy' };
const craftCfg = (over = {}) => ({
  craftCity: 'Lymhurst', specialty: null, focus: false, feePer100: 400, customRRR: '',
  matCity: 'best', useOrders: false, crafts: 1,
  refine: {}, refineFocus: false, refineFee: 400, refineCity: 'auto', refineDaily: {},
  ...over,
});
const price = (artefact, token) => mkPrices({ T4_PLANKS: 100, T4_METALBAR: 200, T4_ARTEFACT_2H_ARCANESTAFF_HELL: artefact, T4_ARTEFACT_TOKEN_FAVOR_2: token });
const run = (p) => recipeVariants('T4_2H_ARCANESTAFF_HELL').map((v) => computeCraft({
  rec: v.rec, targetMid: 'T4_2H_ARCANESTAFF_HELL', prices: p, cfg: craftCfg({ specialty: true, refine: BUY }), premium: true, bonusCity: null,
}));

describe('pickCheapest: números do dossiê §4 (artefato 1.840 e ficha 18.498 são preços reais; tábua 100 e barra 200 são hipotéticos)', () => {
  it('especial A = 1.840 e B = 18.498; diferença de material 16.658; a mais barata é a do artefato', () => {
    const [a, b] = run(price(1840, 18498));
    expect(a.lines[2]).toMatchObject({ qty: 1, unit: 1840, returnable: false });
    expect(b.lines[2]).toMatchObject({ qty: 1, unit: 18498, returnable: false });
    expect(b.matCost - a.matCost).toBeCloseTo(16658, 6);
    expect(pickCheapest([a, b])).toBe(0);
  });
  it('com a taxa do dump: a diferença total é 16.889 (16.658 + 231 da taxa: ficha 896 contra artefato 384)', () => {
    const [a, b] = run(price(1840, 18498));
    expect(a.fee).toBe(403);
    expect(b.fee).toBe(634);
    expect(b.totalCost - a.totalCost).toBeCloseTo(16889, 6);
  });
  it('material comum igual nas duas: (20×100 + 12×200) × 0,751880 = 3.308,27', () => {
    const [a, b] = run(price(1840, 18498));
    expect(a.matCost - 1840).toBeCloseTo(3308.27, 2);
    expect(b.matCost - 18498).toBeCloseTo(3308.27, 2);
  });
  it('inverte quando a ficha é mais barata: ficha 1.000, artefato 1.840 → índice 1', () => {
    expect(pickCheapest(run(price(1840, 1000)))).toBe(1);
  });
  it('ignora a receita incompleta: ficha sem preço (missing) → escolhe o artefato mesmo sendo mais caro', () => {
    const r = run(price(1840, null));
    expect(r[1].missing.length).toBeGreaterThan(0);
    expect(pickCheapest(r)).toBe(0);
    expect(pickCheapest(run(price(null, 500)))).toBe(1);
  });
  it('nenhuma completa → 0; empate → a primeira; lista de 1 → 0; vazia → 0', () => {
    expect(pickCheapest(run(price(null, null)))).toBe(0);
    expect(pickCheapest([{ missing: [], totalCost: 100 }, { missing: [], totalCost: 100 }])).toBe(0);
    expect(pickCheapest([{ missing: [], totalCost: 100 }])).toBe(0);
    expect(pickCheapest([])).toBe(0);
    expect(pickCheapest([{ missing: ['x'], totalCost: 1 }, { missing: [], totalCost: 50 }, { missing: [], totalCost: 40 }])).toBe(2);
  });
  it('Royal (derivado do dossiê: mínimo(SET1,SET2,SET3) + 4 × token; preços HIPOTÉTICOS): SET1 3.000, SET2 2.500, SET3 3.200, token 500', () => {
    const p = mkPrices({ T4_ARMOR_PLATE_SET1: 3000, T4_ARMOR_PLATE_SET2: 2500, T4_ARMOR_PLATE_SET3: 3200, QUESTITEM_TOKEN_ROYAL_T4: 500 });
    const r = recipeVariants('T4_ARMOR_PLATE_ROYAL').map((v) => computeCraft({
      rec: v.rec, targetMid: 'T4_ARMOR_PLATE_ROYAL', prices: p, cfg: craftCfg({ specialty: true }), premium: true, bonusCity: null,
    }));
    expect(pickCheapest(r)).toBe(1);
    expect(r[1].matCost).toBeCloseTo(4500, 6); // nada retorna (039)
    expect(r[0].matCost).toBeCloseTo(5000, 6);
    expect(r[2].matCost).toBeCloseTo(5200, 6);
  });
});

describe('aviso da taxa de bancada (D-034/D-012): a escolha depende da taxa?', () => {
  it('vencedora igual com e sem taxa (artefato 1.840 × ficha 18.498): sem aviso', () => {
    const r = run(price(1840, 18498));
    expect(feeDecides(r)).toEqual({ withFee: 0, noFee: 0, depends: false });
  });
  it('vencedora diferente sem a taxa: artefato 1.000, ficha 900 → com taxa artefato (0), sem taxa ficha (1): aviso', () => {
    const r = run(price(1000, 900));
    expect(r[0].fee).toBe(403);
    expect(r[1].fee).toBe(634);
    expect(r[1].matCost).toBeLessThan(r[0].matCost);
    expect(r[1].totalCost).toBeGreaterThan(r[0].totalCost);
    expect(feeDecides(r)).toEqual({ withFee: 0, noFee: 1, depends: true });
  });
  it('sem receita completa ou com uma só receita: nunca avisa', () => {
    expect(feeDecides(run(price(null, null))).depends).toBe(false);
    expect(feeDecides([{ missing: [], totalCost: 10, matCost: 10 }]).depends).toBe(false);
  });
  it('texto do aviso', () => expect(FEE_DEPENDENCE_WARNING).toBe('a escolha depende da taxa de bancada (valor do artefato na taxa NÃO verificado)'));
  it('texto mostrado ao usuário não traz referência interna (D-0xx)', () => expect(FEE_DEPENDENCE_WARNING).not.toMatch(/D-\d+/));
});

describe('resolveVariant: escolha salva no navegador', () => {
  it('ausente ou "auto": usa a mais barata', () => {
    expect(resolveVariant(undefined, 3, 2)).toBe(2);
    expect(resolveVariant('auto', 3, 1)).toBe(1);
  });
  it('índice válido (número ou texto): vale', () => {
    expect(resolveVariant(1, 3, 0)).toBe(1);
    expect(resolveVariant('2', 3, 0)).toBe(2);
  });
  it.each([[1.5], [-1], [3], [99], [NaN], ['x'], [null], [{}], [Infinity]])('inválido %s ou fora de faixa: variante 0, sem lançar', (v) => {
    expect(resolveVariant(v, 3, 2)).toBe(0);
  });
  it('item que perdeu variantes: índice 1 salvo com 1 receita só cai em 0; sem receitas: 0', () => {
    expect(resolveVariant(1, 1, 0)).toBe(0);
    expect(resolveVariant('auto', 0, 0)).toBe(0);
  });
});

describe('variantLabel', () => {
  it('rótulos', () => {
    expect(variantLabel('T4_ARTEFACT_TOKEN_FAVOR_2')).toBe('Ficha de favor');
    expect(variantLabel('T4_ARTEFACT_2H_ARCANESTAFF_HELL')).toBe('Artefato');
    expect(variantLabel('T4_ARMOR_PLATE_SET3')).toBe('Base 3');
    expect(variantLabel('T4_ARMOR_PLATE_SET1')).toBe('Base 1');
    expect(variantLabel('T4_QUALQUER_COISA')).toBe('Alternativa');
    expect(variantLabel(null)).toBe('Alternativa');
  });
});

describe('returnBadge (DT-009): selo de "não retorna" decidido numa função pura', () => {
  it('ingrediente que retorna: sem selo', () => expect(returnBadge({ returnable: true, unverified: false })).toBeNull());
  it('não retorna pelo dump: "não retorna", sem dica', () => expect(returnBadge({ returnable: false, unverified: false })).toEqual({ text: 'não retorna', title: undefined }));
  it('barrado só pelo token (fragmento): "não retorna · não verificado" com dica', () => {
    const b = returnBadge({ returnable: false, unverified: true });
    expect(b.text).toBe('não retorna · não verificado');
    expect(b.title).toMatch(/dump não marca/);
  });
  it('integrado com recipeOf: ficha de favor verificada; fragmento não verificado', () => {
    const [, ficha] = recipeVariants('T4_2H_ARCANESTAFF_HELL');
    expect(returnBadge(ficha.rec.res[2]).text).toBe('não retorna');
    expect(returnBadge(recipeVariants('T6_ARTEFACT_MAIN_SWORD_CRYSTAL')[0].rec.res[0]).text).toBe('não retorna · não verificado');
    expect(returnBadge(ficha.rec.res[0])).toBeNull();
  });
});
