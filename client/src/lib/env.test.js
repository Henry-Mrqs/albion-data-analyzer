import { describe, it, expect } from 'vitest';

describe('ambiente da lógica', () => {
  it('a lógica roda em Node, sem DOM', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
  });
});
