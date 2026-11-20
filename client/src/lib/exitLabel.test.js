import { describe, it, expect } from 'vitest';
import { exitLabel } from './exitLabel';

describe('exitLabel (082)', () => {
  it('cidade comum: order = ordem de venda, instant = ordem de compra', () => {
    expect(exitLabel('Caerleon', 'order')).toBe('ordem de venda');
    expect(exitLabel('Caerleon', 'instant')).toBe('ordem de compra');
  });
  it('Mercado Negro: sempre ordem de compra do Mercado Negro, em qualquer modo', () => {
    expect(exitLabel('Black Market', 'instant')).toBe('ordem de compra do Mercado Negro');
    expect(exitLabel('Black Market', 'order')).toBe('ordem de compra do Mercado Negro');
  });
});
