import { describe, expect, it } from 'vitest';
import { validateInputs, MAX_QTY } from './inputRules';
import { stationFee } from './econ';

const v = (input, ctx) => validateInputs(input, ctx);

describe('dossiê §4', () => {
  it('taxa 5.000 → aviso, usa 1.000 (efeito: valor 384 → 2.160 sem correção, 432 com)', () => {
    const r = v({ feePer100: 5000 });
    expect(r.values.feePer100).toBe(1000);
    expect(r.issues[0]).toMatchObject({ field: 'feePer100', level: 'warn', used: 1000 });
    expect(stationFee(384, r.values.feePer100)).toBeCloseTo(432, 6);
    expect(stationFee(384, 5000)).toBeCloseTo(2160, 6);
  });
  it('taxa 0 válida, sem aviso', () => {
    const r = v({ feePer100: 0 });
    expect(r.values.feePer100).toBe(0);
    expect(r.issues).toEqual([]);
  });
  it('RRR 60 no craft → aviso, usa 52,83%', () => {
    const r = v({ customRRR: 60 }, { kind: 'craft' });
    expect(r.values.customRRR).toBeCloseTo(112 / 212, 9);
    expect(r.issues[0].level).toBe('warn');
  });
  it('RRR 55 no refino → aceito', () => {
    const r = v({ customRRR: 55 }, { kind: 'refine' });
    expect(r.values.customRRR).toBeCloseTo(0.55, 9);
    expect(r.issues).toEqual([]);
  });
  it('máximos vêm de rrr(): 57,81 refino e 52,83 craft passam; +0,01 não', () => {
    expect(v({ customRRR: 57.81 }, { kind: 'refine' }).issues).toEqual([]);
    expect(v({ customRRR: 57.82 }, { kind: 'refine' }).issues[0].level).toBe('warn');
    expect(v({ customRRR: 52.83 }, { kind: 'craft' }).issues).toEqual([]);
    expect(v({ customRRR: 52.84 }, { kind: 'craft' }).issues[0].level).toBe('warn');
    expect(v({ customRRR: 57.82 }, { kind: 'refine' }).values.customRRR).toBeCloseTo(137 / 237, 9);
  });
  it.each([100, -5, 150])('RRR %s → erro e usa o automático (null)', (x) => {
    const r = v({ customRRR: x }, { kind: 'craft' });
    expect(r.values.customRRR).toBeNull();
    expect(r.issues[0].level).toBe('error');
  });
  it('RRR 0 é aceito (manual explícito)', () => {
    const r = v({ customRRR: 0 });
    expect(r.values.customRRR).toBe(0);
    expect(r.issues).toEqual([]);
  });
  it('diário 15 → erro, usa 0; 0/10/20 aceitos', () => {
    expect(v({ daily: 15 }).values.daily).toBe(0);
    expect(v({ daily: 15 }).issues[0].level).toBe('error');
    for (const d of [0, 10, 20]) {
      expect(v({ daily: d }).issues).toEqual([]);
      expect(v({ daily: String(d) }).values.daily).toBe(d);
    }
  });
  it('crafts 0 → 1; 2,5 → 2; ambos erro', () => {
    expect(v({ crafts: 0 }).values.crafts).toBe(1);
    expect(v({ crafts: 2.5 }).values.crafts).toBe(2);
    expect(v({ crafts: 2.5 }).issues[0].level).toBe('error');
    expect(v({ crafts: 0 }).issues[0].level).toBe('error');
  });
  it('taxa vazia → 400 informativo (V8)', () => {
    const r = v({ feePer100: '' });
    expect(r.values.feePer100).toBe(400);
    expect(r.issues[0].level).toBe('info');
  });
});

describe('achados dos Testers', () => {
  it('RRR manual "  " ou null vira automático (antes: 0)', () => {
    for (const x of ['', ' ', '   ', null, undefined]) {
      const r = v({ customRRR: x });
      expect(r.values.customRRR).toBeNull();
      expect(r.issues).toEqual([]);
    }
  });
  it('RRR manual texto → automático com aviso', () => {
    const r = v({ customRRR: 'abc' });
    expect(r.values.customRRR).toBeNull();
    expect(r.issues[0].level).toBe('warn');
  });
  it('crafts Infinity e 1e308 → teto técnico, sem ∞', () => {
    expect(MAX_QTY).toBe(1e9);
    for (const x of [Infinity, 1e308, '1e308', 1e9 + 1]) {
      const r = v({ crafts: x });
      expect(r.values.crafts).toBe(1e9);
      expect(r.issues[0].level).toBe('warn');
    }
    expect(v({ crafts: 1e9 }).issues).toEqual([]);
  });
  it('taxa −400 → 0; Infinity → teto; texto → 400', () => {
    const r = v({ feePer100: -400 });
    expect(r.values.feePer100).toBe(0);
    expect(r.issues[0].level).toBe('error');
    expect(v({ feePer100: Infinity }).values.feePer100).toBe(1000);
    expect(v({ feePer100: 'abc' }).values.feePer100).toBe(400);
    expect(v({ feePer100: 1000 }).issues).toEqual([]);
  });
  it('N: vazio, 0, −5, texto → 1 com aviso; 2,7 → 2 e 2,5 → 2 (floor, não round)', () => {
    for (const x of ['', 0, -5, 'abc', 0.5]) {
      const r = v({ crafts: x });
      expect(r.values.crafts).toBe(1);
      expect(r.issues.length).toBe(1);
    }
    expect(v({ crafts: 2.7 }).values.crafts).toBe(2);
    expect(v({ crafts: 2.5 }).values.crafts).toBe(2);
  });
  it('relistagens: −3 → 0 (erro); 2,7 → 2 (aviso); limite derivado 37 premium e 35 sem', () => {
    expect(v({ relists: -3 }, { premium: true }).values.relists).toBe(0);
    expect(v({ relists: -3 }, { premium: true }).issues[0].level).toBe('error');
    expect(v({ relists: 2.7 }, { premium: true }).values.relists).toBe(2);
    expect(v({ relists: 2.7 }, { premium: true }).issues[0].level).toBe('warn');
    expect(v({ relists: 99 }, { premium: true }).values.relists).toBe(37);
    expect(v({ relists: 99 }, { premium: false }).values.relists).toBe(35);
    expect(v({ relists: 37 }, { premium: true }).issues).toEqual([]);
    expect(v({ relists: 38 }, { premium: true }).values.relists).toBe(37);
    expect(v({ relists: 35 }, { premium: false }).issues).toEqual([]);
    expect(v({ relists: 36 }, { premium: false }).values.relists).toBe(35);
    expect(v({ relists: '' }).values.relists).toBe(0);
    expect(v({ relists: '' }).issues).toEqual([]);
  });
  it('modo inválido → null (erro)', () => {
    expect(v({ mode: 'foo' }).values.mode).toBeNull();
    expect(v({ mode: 'foo' }).issues[0].level).toBe('error');
    expect(v({ mode: 'order' }).values.mode).toBe('order');
    expect(v({ mode: 'instant' }).values.mode).toBe('instant');
  });
  it('idempotência: validar os valores já corrigidos não gera aviso (exceto info)', () => {
    let s = 12345;
    const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const pool = [-5, 0, 0.5, 1, 2.5, 7, 15, 20, 57.82, 60, 100, 150, 400, 1000, 5000, 1e9 + 5, 1e308, Infinity, -Infinity, '', ' ', 'abc', null, undefined, '12', '2,5'];
    const pick = () => pool[Math.floor(rnd() * pool.length)];
    for (let i = 0; i < 200; i++) {
      const ctx = { kind: rnd() < 0.5 ? 'craft' : 'refine', premium: rnd() < 0.5 };
      const first = v({ feePer100: pick(), customRRR: pick(), daily: pick(), crafts: pick(), relists: pick() }, ctx);
      const x = first.values;
      const again = v(
        { feePer100: x.feePer100, customRRR: x.customRRR == null ? null : x.customRRR * 100, daily: x.daily, crafts: x.crafts, relists: x.relists },
        ctx,
      );
      expect(again.issues.filter((q) => q.level !== 'info')).toEqual([]);
      expect(again.values).toEqual(x);
    }
  });
  it('teto configurável', () => {
    expect(v({ feePer100: 5000 }, { feeCeiling: 10000 }).values.feePer100).toBe(5000);
    expect(v({ feePer100: 5000 }, { feeCeiling: 10000 }).issues).toEqual([]);
  });
});
