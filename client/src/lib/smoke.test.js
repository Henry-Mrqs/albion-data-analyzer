import { describe, it, expect } from 'vitest';
import { rrr } from './econ';

describe('smoke', () => {
  it('econ.js carrega em Node (sem jsdom) e rrr funciona', () => {
    expect(rrr({ kind: 'refine', specialty: true, focus: false })).toBeCloseTo(58 / 158, 6);
  });
});
