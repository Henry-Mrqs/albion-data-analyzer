// IDEIA-059: campos novos de craft:cfg e refine:cfg no esquema salvo.
import { describe, it, expect } from 'vitest';
import { PERSISTED } from './persistSchemas';

describe('persistSchemas: relists (059)', () => {
  it.each(['craft:cfg', 'refine:cfg'])('%s aceita relists/relistStep (numText) e relistBase (enum)', (key) => {
    const sc = PERSISTED[key].schema;
    expect(sc.relists).toBe('numText');
    expect(sc.relistStep).toBe('numText');
    expect(sc.relistBase).toEqual({ enum: ['price', 'diff'] });
  });
});
