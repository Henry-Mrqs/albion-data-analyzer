import { beforeEach, describe, expect, it } from 'vitest';
import { loadFixtureCatalog } from '../test/helpers';
import { cityOfCategory, getItem, recipeOf } from './catalog';
import { isSpecialty, itemCraftInfo, recipeReturn, referenceTable, rrrFor } from './rrrCalc';

beforeEach(loadFixtureCatalog);

const ESPECIALISTA = () => cityOfCategory('sword');
const base = { kind: 'craft', city: 'Martlock', category: 'sword', resource: 'PLANKS', focus: false, daily: 0 };
const FS = { kind: 'refine', city: 'Fort Sterling', resource: 'PLANKS' };
const cases = [
  ['cidade sem bônus', { kind: 'refine', city: 'Martlock', resource: 'PLANKS' }, 18, 0.152542],
  ['craft em cidade de bônus', { city: 'ESPECIALISTA' }, 33, 0.24812],
  ['refino em cidade de bônus', FS, 58, 0.367089],
  ['foco sem bônus', { kind: 'refine', city: 'Martlock', resource: 'PLANKS', focus: true }, 77, 0.435028],
  ['craft bônus + foco', { city: 'ESPECIALISTA', focus: true }, 92, 0.479167],
  ['refino bônus + foco', { ...FS, focus: true }, 117, 0.539171],
  ['craft bônus + foco + dia 20', { city: 'ESPECIALISTA', focus: true, daily: 20 }, 112, 0.528302],
  ['craft bônus + foco + dia 10', { city: 'ESPECIALISTA', focus: true, daily: 10 }, 102, 0.50495],
  ['refino bônus + foco + dia 20', { ...FS, focus: true, daily: 20 }, 137, 0.578059],
  ['refino bônus + dia 10', { ...FS, daily: 10 }, 68, 0.404762],
];
const build = (o) => ({ ...base, ...o, city: o.city === 'ESPECIALISTA' ? ESPECIALISTA() : (o.city ?? base.city) });

describe('rrrFor (casos do dossiê §4)', () => {
  it.each(cases)('%s', (_n, over, pb, r) => {
    const out = rrrFor(build(over));
    expect(out.pb).toBeCloseTo(pb, 6);
    expect(out.rrr).toBeCloseTo(r, 4);
  });

  it('decompõe o PB em partes', () => {
    const { parts } = rrrFor(build({ city: 'ESPECIALISTA', focus: true, daily: 20 }));
    expect(parts.base).toBeCloseTo(18, 6);
    expect(parts.specialty).toBeCloseTo(15, 6);
    expect(parts.focus).toBeCloseTo(59, 6);
    expect(parts.daily).toBeCloseTo(20, 6);
  });
});

describe('isSpecialty', () => {
  it('refino (aceita o refinado ou o recurso bruto)', () => {
    expect(isSpecialty({ kind: 'refine', city: 'Fort Sterling', resource: 'PLANKS' })).toBe(true);
    expect(isSpecialty({ kind: 'refine', city: 'Martlock', resource: 'PLANKS' })).toBe(false);
    expect(isSpecialty({ kind: 'refine', city: 'Thetford', resource: 'ORE' })).toBe(true);
    expect(isSpecialty({ kind: 'refine', city: 'Thetford', resource: 'METALBAR' })).toBe(true);
  });
  it('craft', () => {
    expect(isSpecialty({ kind: 'craft', city: ESPECIALISTA(), category: 'sword' })).toBe(true);
    expect(isSpecialty({ kind: 'craft', city: 'Martlock', category: 'sword' })).toBe(false);
    expect(isSpecialty({ kind: 'craft', city: 'Brecilien', category: 'bag' })).toBe(true);
    expect(isSpecialty({ kind: 'craft', city: 'Martlock', category: undefined })).toBe(false);
    expect(isSpecialty({ kind: 'craft', city: 'Martlock', category: '' })).toBe(false);
  });
});

describe('itemCraftInfo (categoria do jogo do item escolhido)', () => {
  it('escudo: categoria offhand, Martlock', () => {
    expect(itemCraftInfo(getItem('T4_OFF_SHIELD'))).toEqual({ cc: 'offhand', label: 'Mão secundária (escudo, livro, tocha)', city: 'Martlock' });
  });
  it('bolsa: Brecilien', () => {
    expect(itemCraftInfo(getItem('T4_BAG'))).toMatchObject({ cc: 'bag', city: 'Brecilien' });
  });
  it('item Royal: sem categoria e sem cidade', () => {
    expect(itemCraftInfo(getItem('T4_ARMOR_PLATE_ROYAL'))).toMatchObject({ cc: undefined, city: null, label: expect.stringMatching(/sem categoria/i) });
  });
  it('item indefinido', () => {
    expect(itemCraftInfo(undefined)).toBeNull();
  });
});

describe('referenceTable', () => {
  it('24 linhas únicas e consistentes', () => {
    const t = referenceTable();
    expect(t).toHaveLength(24);
    expect(new Set(t.map((r) => r.key)).size).toBe(24);
    t.forEach((r) => expect(r.per100).toBeCloseTo(r.rrr * 100, 9));
  });
  it('contém os casos do dossiê', () => {
    const t = referenceTable();
    for (const [, , pb, r] of cases) {
      const row = t.find((x) => Math.abs(x.pb - pb) < 1e-6);
      expect(row, `PB ${pb}`).toBeTruthy();
      expect(row.rrr).toBeCloseTo(r, 4);
    }
  });
});

describe('recipeReturn', () => {
  it('lote do dossiê: 100 crafts, sem foco (RRR 24,8120%)', () => {
    const rows = recipeReturn(recipeOf('T6_MAIN_SWORD'), 100, 33 / 133);
    expect(rows.map((r) => r.gross)).toEqual([1600, 800]);
    expect(rows[0].returned).toBeCloseTo(396.99, 2);
    expect(rows[1].returned).toBeCloseTo(198.5, 2);
    expect(rows[0].net).toBeCloseTo(1203.01, 2);
    expect(rows[1].net).toBeCloseTo(601.5, 2);
  });
  it('com foco (47,9167%)', () => {
    const r = rrrFor(build({ city: 'ESPECIALISTA', focus: true })).rrr;
    const rows = recipeReturn(recipeOf('T6_MAIN_SWORD'), 100, r);
    expect(rows[0].returned).toBeCloseTo(766.67, 2);
    expect(rows[1].returned).toBeCloseTo(383.33, 2);
    expect(rows[0].net).toBeCloseTo(833.33, 2);
    expect(rows[1].net).toBeCloseTo(416.67, 2);
  });
  it('artefato não retorna', () => {
    const rows = recipeReturn(recipeOf('T6_MAIN_SWORD_CRYSTAL'), 100, 0.5);
    const last = rows[rows.length - 1];
    expect(last.returnable).toBe(false);
    expect(last.gross).toBe(100);
    expect(last.returned).toBe(0);
    expect(last.net).toBe(100);
  });
  it('IDEIA-060: N=1e308 não gera ∞ nem NaN', () => {
    const rows = recipeReturn(recipeOf('T6_MAIN_SWORD'), 1e308, 33 / 133);
    for (const r of rows) for (const x of [r.gross, r.returned, r.net]) expect(Number.isFinite(x)).toBe(true);
    expect(rows[0].gross).toBe(16 * 1e9);
  });
  it.each(['', 0, -5, 'abc'])('IDEIA-060: N=%j usa 1', (n) => expect(recipeReturn(recipeOf('T6_MAIN_SWORD'), n, 33 / 133)[0].gross).toBe(16));
  it('IDEIA-060: N decimal usa floor: 2,7 → 2 e 2,5 → 2 (mata a mutação floor→round)', () => {
    for (const n of [2.7, 2.5]) expect(recipeReturn(recipeOf('T6_MAIN_SWORD'), n, 33 / 133)[0].gross).toBe(32);
  });
  it('IDEIA-060: N=100 continua dando o caso do dossiê: 1.600 / 396,99 / 1.203,01', () => {
    const r = recipeReturn(recipeOf('T6_MAIN_SWORD'), 100, 33 / 133)[0];
    expect([r.gross, +r.returned.toFixed(2), +r.net.toFixed(2)]).toEqual([1600, 396.99, 1203.01]);
  });
  it('crafts inválido vira 1', () => {
    for (const c of [0, '', -3]) {
      const rows = recipeReturn(recipeOf('T6_MAIN_SWORD'), c, 0.25);
      expect(rows.map((r) => r.gross)).toEqual([16, 8]);
    }
  });
});
