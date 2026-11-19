// IDEIA-048: validação das despesas extras e do mapa de saídas sem imposto.
import { describe, expect, it } from 'vitest';
import { MAX_QTY, cleanCraftCfg, cleanRefineCfg, validateExtras } from './inputRules';
import { MAX_EXTRAS } from './extras';

const row = (over = {}) => ({ name: 'Transporte', value: 150, scope: 'craft', ...over });
const ve = (list) => validateExtras(list);
const fields = (r) => r.issues.map((i) => i.field);

describe('validateExtras (048)', () => {
  it('lista válida passa igual e sem aviso', () => {
    const list = [row(), row({ name: 'Comida', value: 80, scope: 'lote' })];
    const r = ve(list);
    expect(r.values).toEqual(list);
    expect(r.issues).toEqual([]);
  });
  it('não é array (ou ausente) → []', () => {
    for (const x of [undefined, null, 'x', 5, { a: 1 }]) expect(ve(x)).toEqual({ values: [], issues: [] });
  });
  it('mais de MAX_EXTRAS: corta em 20 e avisa; exatamente 20 não avisa', () => {
    const r21 = ve(Array.from({ length: MAX_EXTRAS + 1 }, () => row()));
    expect(r21.values).toHaveLength(MAX_EXTRAS);
    expect(r21.issues.map((i) => i.level)).toEqual(['warn']);
    expect(r21.issues[0].field).toBe('extras');
    const r20 = ve(Array.from({ length: MAX_EXTRAS }, () => row()));
    expect(r20.values).toHaveLength(MAX_EXTRAS);
    expect(r20.issues).toEqual([]);
  });
  it('nome: não texto → vazio sem aviso; espaços aparados; 60 passa; 61 corta com aviso', () => {
    expect(ve([row({ name: 42 })]).values[0].name).toBe('');
    expect(ve([row({ name: 42 })]).issues).toEqual([]);
    expect(ve([row({ name: '  Poção  ' })]).values[0].name).toBe('Poção');
    expect(ve([row({ name: 'a'.repeat(60) })]).issues).toEqual([]);
    const r = ve([row({ name: 'a'.repeat(200) })]);
    expect(r.values[0].name).toBe('a'.repeat(60));
    expect(r.issues.map((i) => [i.field, i.level])).toEqual([['extras[0].name', 'warn']]);
  });
  it('valor vazio/null/undefined → 0 sem aviso (linha em branco)', () => {
    for (const value of ['', '   ', null, undefined]) {
      const r = ve([row({ value })]);
      expect(r.values[0].value).toBe(0);
      expect(r.issues).toEqual([]);
    }
  });
  it('valor texto/NaN → 0 com erro no campo certo', () => {
    for (const value of ['abc', NaN, true, {}]) {
      const r = ve([row(), row({ value })]);
      expect(r.values[1].value).toBe(0);
      expect(r.issues.map((i) => [i.field, i.level])).toEqual([['extras[1].value', 'error']]);
    }
  });
  it('valor negativo → 0 com erro; zero é válido sem aviso; texto numérico vale', () => {
    const r = ve([row({ value: -1 })]);
    expect(r.values[0].value).toBe(0);
    expect(r.issues.map((i) => i.level)).toEqual(['error']);
    expect(ve([row({ value: 0 })]).issues).toEqual([]);
    expect(ve([row({ value: '150' })]).values[0].value).toBe(150);
    expect(ve([row({ value: -0.01 })]).values[0].value).toBe(0);
  });
  it('valor acima de MAX_QTY → MAX_QTY com aviso (1e9 exato passa; 1e308 e Infinity cortam)', () => {
    expect(ve([row({ value: MAX_QTY })]).issues).toEqual([]);
    for (const value of [MAX_QTY + 1, 1e308, 'Infinity']) {
      const r = ve([row({ value })]);
      expect(r.values[0].value).toBe(MAX_QTY);
      expect(r.issues.map((i) => i.level)).toEqual(['warn']);
    }
  });
  it('escopo fora de craft|lote → craft com erro', () => {
    for (const scope of ['x', undefined, 3, null]) {
      const r = ve([row({ scope })]);
      expect(r.values[0].scope).toBe('craft');
      expect(r.issues.map((i) => [i.field, i.level])).toEqual([['extras[0].scope', 'error']]);
    }
    expect(ve([row({ scope: 'lote' })]).values[0].scope).toBe('lote');
  });
  it('linha que não é objeto vira linha em branco (0, craft), sem quebrar', () => {
    const r = ve([null, 'x', 5]);
    expect(r.values).toEqual([0, 1, 2].map(() => ({ name: '', value: 0, scope: 'craft' })));
  });
  it('idempotente: validar o resultado de novo não muda nada nem avisa', () => {
    const dirty = [row({ value: -5, name: ' x '.repeat(40), scope: 'zz' }), row({ value: 1e12 }), row({ value: 'a' })];
    const once = ve(dirty);
    const twice = ve(once.values);
    expect(twice.values).toEqual(once.values);
    expect(twice.issues).toEqual([]);
  });
  it('não muta a lista original', () => {
    const list = [row({ value: -3 })];
    const copy = structuredClone(list);
    ve(list);
    expect(list).toEqual(copy);
  });
});

const craftBase = { feePer100: 400, crafts: 1, customRRR: '', refineFee: 400 };
const refineBase = { feePer100: 400, qty: 10, customRRR: '', daily: 0 };

describe('cleanCraftCfg e cleanRefineCfg com extras e noTax (048)', () => {
  it.each([['craft', cleanCraftCfg, craftBase], ['refino', cleanRefineCfg, refineBase]])('%s: cfg sem extras/noTax vira [] e {} sem avisos', (_n, clean, base) => {
    const r = clean(base, {});
    expect(r.cfg.extras).toEqual([]);
    expect(r.cfg.noTax).toEqual({});
    expect(r.issues.filter((i) => i.field.startsWith('extras'))).toEqual([]);
  });
  it.each([['craft', cleanCraftCfg, craftBase], ['refino', cleanRefineCfg, refineBase]])('%s: limpa extras, filtra noTax e não muta', (_n, clean, base) => {
    const raw = { ...base, extras: [row({ value: -4 })], noTax: { 'Caerleon|order': true, 'Caerleon|instant': true, 'Lymhurst|foo': true, 'Caerleon': true, 'Martlock|order': false, 'Thetford|order': 1, '|order': true } };
    const copy = structuredClone(raw);
    const r = clean(raw, {});
    expect(r.cfg.extras[0].value).toBe(0);
    expect(r.cfg.noTax).toEqual({ 'Caerleon|order': true, 'Caerleon|instant': true });
    expect(fields(r)).toContain('extras[0].value');
    expect(raw).toEqual(copy);
  });
  it.each([['craft', cleanCraftCfg, craftBase], ['refino', cleanRefineCfg, refineBase]])('%s: extras ou noTax corrompidos (string, array, número) são limpos em silêncio', (_n, clean, base) => {
    for (const bad of ['x', 5, [], null]) {
      const r = clean({ ...base, extras: bad, noTax: bad }, {});
      expect(r.cfg.extras).toEqual([]);
      expect(r.cfg.noTax).toEqual({});
    }
  });
  it('os avisos das despesas contam no selo "valores corrigidos" (level warn/error)', () => {
    const r = cleanCraftCfg({ ...craftBase, extras: [row({ value: -1 })] }, {});
    expect(r.issues.filter((i) => i.level !== 'info' && i.field.startsWith('extras'))).toHaveLength(1);
  });
});
