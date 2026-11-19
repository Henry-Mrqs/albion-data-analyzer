import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StressTest from './StressTest';
import { fmt } from '../lib/econ';

// Dossiê IDEIA-031 §4 (Broadsword T4): lucro 683,23; ruptura de preço -16,24% (mínimo 3.769); de material +20,65%
const IN = { variable: 4400 * (100 / 133), fixed: 216, price: 4500, k: 0.935 };

describe('StressTest', () => {
  it('mostra resumo, grade 9x9 e célula central igual ao lucro base', () => {
    render(<StressTest input={IN} />);
    expect(screen.getByTestId('stress-center').textContent).toBe(fmt(683.23));
    const s = screen.getByTestId('stress-summary').textContent;
    expect(s).toContain('683');
    expect(s).toContain('16,2%');
    expect(s).toContain('3.769');
    expect(s).toContain('20,7%');
    expect(screen.getByTestId('stress-grid').querySelectorAll('tbody td')).toHaveLength(81);
  });
  it('em prejuízo o texto pede alta de preço e queda de material', () => {
    render(<StressTest input={{ ...IN, price: 3000 }} />);
    const s = screen.getByTestId('stress-summary').textContent;
    expect(s).toContain('Preço precisa subir');
    expect(s).toContain('Materiais precisam cair');
  });
  it('sem input pede os preços ausentes', () => {
    render(<StressTest input={null} />);
    expect(screen.getByText(/Preencha os preços ausentes/)).toBeTruthy();
  });
});
