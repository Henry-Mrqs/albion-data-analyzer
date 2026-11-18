import { describe, expect, it } from 'vitest';
import { craftsWithBudget, focusCost, focusPerCraft } from './focus';

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
