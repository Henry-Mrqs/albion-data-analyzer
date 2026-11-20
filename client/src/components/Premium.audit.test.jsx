// IDEIA-086: cartão "Variáveis deste cálculo" na aba Premium.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { resetApp, seed, freezeNow } from '../test/ui';

const { goldHook } = vi.hoisted(() => ({ goldHook: vi.fn() }));
vi.mock('../lib/gold', async (orig) => ({ ...(await orig()), useGold: goldHook }));

import Premium from './Premium';
import ErrorBoundary from './ErrorBoundary';

const API = { gold: { price: 9411, t: Date.UTC(2026, 10, 18, 1) }, loading: false, error: null, refresh: vi.fn() };
const CFG = { gold: '', goldCost: '', volume: '', silverPerFocus: '', focusPerDay: '' };
const ERRO = /Algo deu errado ao mostrar esta tela/;
const card = () => screen.getByTestId('var-audit');
const rowEl = (id) => within(card()).getAllByTestId('audit-row').find((e) => e.dataset.rowId === id);
const mount = (cfg = {}, raw) => {
  seed('premium:cfg', raw ?? { ...CFG, ...cfg });
  return render(
    <ErrorBoundary>
      <Premium />
    </ErrorBoundary>,
  );
};
const outside = (container) => {
  const clone = container.cloneNode(true);
  clone.querySelector('[data-testid="var-audit"]')?.remove();
  return clone.textContent;
};

let restore;
beforeEach(() => {
  resetApp();
  goldHook.mockReturnValue(API);
  restore = freezeNow('2026-11-18T03:00:00Z');
});
afterEach(() => restore());

describe('Premium: cartão Variáveis deste cálculo', () => {
  it('recolhido; com ouro da API e cfg vazia, custo e foco/dia aparecem "padrão não confirmado" e há 5 NÃO consideradas', () => {
    mount({ gold: '9414' });
    expect(card().open).toBe(false);
    expect(rowEl('gold-cost').dataset.status).toBe('unconfirmed');
    expect(rowEl('focus-day').dataset.status).toBe('unconfirmed');
    expect(screen.getByTestId('var-audit-summary').textContent).toMatch(/5 não consideradas/);
  });

  it('digitar o custo do Premium troca a linha para "digitado"', () => {
    mount({ gold: '9414' });
    expect(rowEl('gold-cost').textContent).toContain('padrão do app');
    fireEvent.change(screen.getAllByRole('spinbutton')[1], { target: { value: '3000' } });
    expect(rowEl('gold-cost').textContent).toContain('digitado');
    expect(rowEl('gold-cost').dataset.status).toBe('applied');
  });

  it('o saldo da linha é o da tela (-21.602.500 no cenário-base)', () => {
    mount({ gold: '9414', volume: '20000000', silverPerFocus: '43' });
    expect(rowEl('balance').textContent).toMatch(/21\.602\.500/);
  });

  it('fora do cartão a tela continua mostrando o saldo', () => {
    const a = mount({ gold: '9414', volume: '20000000', silverPerFocus: '43' });
    const withCard = outside(a.container);
    expect(withCard).toContain('Saldo em 30 dias');
    expect(card()).toBeTruthy();
    a.unmount();
    expect(withCard.length).toBeGreaterThan(200);
  });

  it('premium:cfg corrompido não derruba a aba', () => {
    mount({}, { gold: {}, goldCost: [], volume: true, silverPerFocus: null, focusPerDay: 'x' });
    expect(screen.queryByText(ERRO)).toBeNull();
    expect(card().textContent).not.toContain('[object');
  });
});
