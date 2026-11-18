// Retrabalho D-030 da IDEIA-060: teto de taxa validado, modo ausente, selo coerente, daily da aba RRR, fmt seguro.
import { beforeEach, describe, expect, it } from 'vitest';
import { loadFixtureCatalog } from '../test/helpers';
import { validateInputs, cleanCraftCfg, sanitizeFeeCeiling } from './inputRules';
import { fmt } from './econ';
import { rrrFor } from './rrrCalc';

beforeEach(loadFixtureCatalog);
const v = (input, ctx) => validateInputs(input, ctx);

describe('teto de taxa (feeCeiling) validado', () => {
  it.each([1000, 5000, 1e6, 1000.5])('teto válido %s passa sem aviso', (x) => {
    expect(sanitizeFeeCeiling(x)).toEqual({ value: x, issue: null });
  });
  it.each([null, 0, -5, NaN, 'abc', '5000', Infinity, 1e6 + 1, 1e300, {}])('teto inválido %j volta a 1.000 e avisa', (x) => {
    const r = sanitizeFeeCeiling(x);
    expect(r.value).toBe(1000);
    expect(r.issue).toMatchObject({ field: 'feeCeiling', level: 'warn' });
    expect(r.issue.msg).toContain('1.000');
  });
  it('teto ausente (undefined) usa 1.000 sem aviso', () => expect(sanitizeFeeCeiling(undefined)).toEqual({ value: 1000, issue: null }));
  it('validateInputs: teto null não desliga a validação e avisa', () => {
    const r = v({ feePer100: 5000 }, { feeCeiling: null });
    expect(r.values.feePer100).toBe(1000);
    expect(r.issues.map((i) => i.field).sort()).toEqual(['feeCeiling', 'feePer100']);
  });
  it('validateInputs: teto 1e300 (corrompido) não deixa a taxa passar', () => {
    expect(v({ feePer100: 1e200 }, { feeCeiling: 1e300 }).values.feePer100).toBe(1000);
  });
  it('validateInputs: teto aceito 1e6 vale; taxa 1e300 usa 1e6 (finito)', () => {
    expect(v({ feePer100: 1e300 }, { feeCeiling: 1e6 }).values.feePer100).toBe(1e6);
  });
  it('sem taxa no input, teto inválido não gera aviso', () => expect(v({ crafts: 3 }, { feeCeiling: null }).issues).toEqual([]));
  it('cleanCraftCfg: teto inválido gera um único aviso feeCeiling', () => {
    const r = cleanCraftCfg({ feePer100: 400, refineFee: 400, crafts: 1, customRRR: '', refineDaily: {} }, { feeCeiling: 0 });
    expect(r.issues.filter((i) => i.field === 'feeCeiling')).toHaveLength(1);
  });
});

describe('modo ausente x inválido', () => {
  it.each(['', '  ', null, undefined])('modo %j é ausente: null sem aviso', (m) => {
    const r = v({ mode: m });
    expect(r.values.mode).toBeNull();
    expect(r.issues).toEqual([]);
  });
  it('modo "foo" avisa dizendo o valor usado (ordem de venda)', () => {
    const r = v({ mode: 'foo' });
    expect(r.issues[0].level).toBe('error');
    expect(r.issues[0].msg).toContain('ordem de venda');
    expect(r.issues[0].used).toBe('order');
  });
});

describe('selo só conta o que aparece', () => {
  const raw = { feePer100: 400, refineFee: 5000, crafts: 1, customRRR: '', refineDaily: { PLANKS: 15, METALBAR: 7 } };
  it('sem refineTypes: avisa todos (compatível)', () => {
    expect(cleanCraftCfg(raw, {}).issues.map((i) => i.field).sort()).toEqual(['refineDaily.METALBAR', 'refineDaily.PLANKS', 'refineFee']);
  });
  it('refineTypes limita o aviso aos recursos usados, mas a cfg segue limpa', () => {
    const r = cleanCraftCfg(raw, { refineTypes: ['METALBAR'] });
    expect(r.issues.map((i) => i.field).sort()).toEqual(['refineDaily.METALBAR', 'refineFee']);
    expect(r.cfg.refineDaily).toEqual({ PLANKS: 0, METALBAR: 0 });
  });
  it('sem recursos refináveis: nem a taxa de refino avisa', () => {
    expect(cleanCraftCfg(raw, { refineTypes: [] }).issues).toEqual([]);
  });
});

describe('daily salvo inválido na aba RRR', () => {
  const FS = { kind: 'refine', city: 'Fort Sterling', resource: 'PLANKS', focus: false };
  it('rrrFor trata daily 15, -10, texto como 0 (mesma validação)', () => {
    const ok = rrrFor({ ...FS, daily: 0 }).rrr;
    for (const d of [15, -10, 'abc', 30, null]) expect(rrrFor({ ...FS, daily: d }).rrr).toBe(ok);
    expect(rrrFor({ ...FS, daily: 20 }).rrr).toBeGreaterThan(ok);
    expect(rrrFor({ ...FS, daily: '10' }).rrr).toBe(rrrFor({ ...FS, daily: 10 }).rrr);
  });
});

describe('fmt seguro', () => {
  it('números normais não mudam', () => {
    expect(fmt(1234567.4)).toBe('1.234.567');
    expect(fmt(-5.6)).toBe('-6');
    expect(fmt(0)).toBe('0');
  });
  it('não finito vira texto, nunca ∞/NaN', () => {
    for (const x of [Infinity, -Infinity, NaN]) expect(fmt(x)).toBe('valor enorme');
  });
  it('número gigante vai em notação científica', () => {
    expect(fmt(1.5e20)).toBe('1,5e20');
    expect(fmt(1e300)).toBe('1e300');
    expect(fmt(1.778941501257237e15)).toBe('1,78e15');
    expect(fmt(999999999999999)).toBe('999.999.999.999.999');
  });
});
