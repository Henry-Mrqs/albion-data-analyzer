import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { resetApp, seed, freezeNow } from '../test/ui';

const { goldHook } = vi.hoisted(() => ({ goldHook: vi.fn() }));
vi.mock('../lib/gold', async (orig) => ({ ...(await orig()), useGold: goldHook }));

import Premium from './Premium';

const CFG = { gold: '', goldCost: '', volume: '', silverPerFocus: '', focusPerDay: '' };
const cell = (label) => screen.getByText(label).closest('tr').querySelector('td.num').textContent;

let restore;
beforeEach(() => {
  resetApp();
  goldHook.mockReturnValue({ gold: null, loading: false, error: null, refresh: vi.fn() });
  restore = freezeNow('2026-11-18T03:00:00Z');
});
afterEach(() => restore());

describe('Premium: célula do volume de equilíbrio e botão Atualizar', () => {
  it('foco que paga sozinho: a célula diz "não precisa de vendas", nunca "0 prata por mês"', () => {
    seed('premium:cfg', { ...CFG, gold: '9414', silverPerFocus: '120' });
    render(<Premium />);
    expect(cell('Volume de vendas de equilíbrio')).toBe('não precisa de vendas');
    expect(cell('Volume de vendas de equilíbrio')).not.toMatch(/prata por mês/);
  });

  it('sem pagar sozinho: a célula mostra o volume de equilíbrio em prata por mês', () => {
    seed('premium:cfg', { ...CFG, gold: '9414', silverPerFocus: '43' });
    render(<Premium />);
    expect(cell('Volume de vendas de equilíbrio')).toBe('560.062.500 prata por mês');
  });

  it('"Atualizar" chama refresh do hook do ouro (uma vez por clique)', () => {
    const refresh = vi.fn();
    goldHook.mockReturnValue({ gold: null, loading: false, error: null, refresh });
    render(<Premium />);
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    expect(refresh).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('rodapé: atribui a lista ao AO Refinery com "confira no jogo" e separa o que não foi verificado no wiki oficial', () => {
    render(<Premium />);
    const t = document.body.textContent;
    expect(t).not.toContain('lista da fonte');
    expect(t).toContain('AO Refinery; confira no jogo');
    expect(t).toMatch(/fonte secundária/);
    expect(t).toMatch(/não verificad[oa]s? no wiki oficial/);
    for (const k of ['3.750 ouro', '10.000 de foco', '+50% de fama', '30 pontos de aprendizado', '4% contra 8%']) expect(t).toContain(k);
  });
});
