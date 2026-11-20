// IDEIA-073 (O6; também O3 da 031): fmt nunca mostra "-0".
import { describe, expect, it } from 'vitest';
import { fmt } from './econ';

describe('fmt', () => {
  it('valores que arredondam para zero viram "0", nunca "-0"', () => {
    for (const n of [-0.3, -0.49, -0]) expect(fmt(n), String(n)).toBe('0');
  });
  it('o resto não muda', () => {
    expect(fmt(-0.51)).toBe('-1');
    expect(fmt(1234.5)).toBe('1.235');
    expect(fmt(-1234.4)).toBe('-1.234');
    expect(fmt(0)).toBe('0');
    expect(fmt(NaN)).toBe('valor enorme');
    expect(fmt(Infinity)).toBe('valor enorme');
    expect(fmt(1e15)).toBe('1e15');
  });
});
