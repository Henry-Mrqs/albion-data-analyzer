import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StressTest from './StressTest';

const IN = { variable: 4400 * (100 / 133), fixed: 216, price: 4500, k: 0.935 };
const text = () => screen.getByTestId('stress-card').textContent;

describe('StressTest: textos honestos (D1)', () => {
  it('declara que o ±N% dos materiais vale para todos, inclusive artefatos', () => {
    render(<StressTest input={IN} />);
    expect(text()).toMatch(/todos os materiais, inclusive artefatos/);
  });
  it('diz qual saída de venda é variada (cidade traduzida e modo)', () => {
    render(<StressTest input={{ ...IN, city: 'Black Market', label: 'Ordem de compra', noTax: false }} />);
    expect(text()).toContain('Mercado Negro, Ordem de compra');
    expect(text()).not.toMatch(/sem imposto/i);
  });
  it('menciona sem imposto quando noTax', () => {
    render(<StressTest input={{ ...IN, city: 'Caerleon', label: 'Ordem de venda', noTax: true }} />);
    expect(text()).toContain('Caerleon, Ordem de venda, sem imposto');
  });
});

describe('StressTest: nunca Infinity/NaN (D4)', () => {
  it.each([
    ['preço infinito', { ...IN, price: Infinity }],
    ['material infinito', { ...IN, variable: Infinity }],
    ['material NaN', { ...IN, variable: NaN }],
    ['tudo infinito', { variable: Infinity, fixed: Infinity, price: Infinity, k: 0.935 }],
  ])('%s', (_n, input) => {
    render(<StressTest input={input} />);
    expect(text()).not.toMatch(/Infinity|NaN|undefined/);
  });
});
