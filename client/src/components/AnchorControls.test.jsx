// IDEIA-065: controles do preço realista (apresentação, textos honestos).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { resetApp } from '../test/ui';
import AnchorControls from './AnchorControls';

beforeEach(resetApp);

describe('AnchorControls (065)', () => {
  it('textos: regra do app, não do jogo; sem fonte; teto pode esconder alta', () => {
    render(<AnchorControls cfg={{}} set={() => {}} issues={[]} on />);
    const t = document.body.textContent;
    expect(t).toContain('Usar preço de saída realista (ordem de venda)');
    expect(t).toContain('regra do app, não do jogo');
    expect(t).toContain('sem fonte');
    expect(t).toContain('esconder uma alta de preço real');
    expect(t).toContain('Mediana de preços médios diários');
  });
  it('interruptor, k e N chamam set com os campos certos', () => {
    const set = vi.fn();
    render(<AnchorControls cfg={{}} set={set} issues={[]} on />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(set).toHaveBeenLastCalledWith({ anchorOn: false });
    const [k, n] = document.querySelectorAll('input[type="number"]');
    fireEvent.change(k, { target: { value: '1.5' } });
    expect(set).toHaveBeenLastCalledWith({ anchorK: '1.5' });
    fireEvent.change(n, { target: { value: '14' } });
    expect(set).toHaveBeenLastCalledWith({ anchorDays: '14' });
  });
  it('mostra os avisos sob o campo', () => {
    const issues = [{ field: 'anchorK', level: 'warn', code: 'anchorK-invalid', msg: 'k "abc" inválido: usando 1,25.', raw: 'abc', used: 1.25 }];
    render(<AnchorControls cfg={{ anchorK: 'abc' }} set={() => {}} issues={issues} on />);
    expect(document.body.textContent).toContain('k "abc" inválido');
  });
});
