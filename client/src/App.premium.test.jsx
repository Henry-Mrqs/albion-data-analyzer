import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { resetApp, pricesHook } from './test/ui';

const { priceHook, histHook, goldHook } = vi.hoisted(() => ({ priceHook: vi.fn(), histHook: vi.fn(), goldHook: vi.fn() }));
vi.mock('./lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook, fetchPrices: vi.fn(async () => ({})) }));
vi.mock('./lib/history', async (orig) => ({ ...(await orig()), useHistory: histHook, fetchHistory: vi.fn(async () => ({ data: {}, truncated: false })) }));
vi.mock('./lib/gold', async (orig) => ({ ...(await orig()), useGold: goldHook }));
// A aba Premium quebra só quando globalThis.__quebra é verdadeiro; fora disso renderiza a aba real.
vi.mock('./components/Premium', async (orig) => {
  const Real = (await orig()).default;
  return {
    default: function Quebrada(props) {
      if (globalThis.__quebra) throw new Error('premium quebrou');
      return <Real {...props} />;
    },
  };
});

import App from './App';

let spy;
beforeEach(() => {
  resetApp();
  globalThis.__quebra = false;
  priceHook.mockReturnValue(pricesHook({}));
  histHook.mockReturnValue({ history: null, loading: false, error: null });
  goldHook.mockReturnValue({ gold: null, loading: false, error: null, refresh() {} });
  spy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  delete globalThis.__quebra;
  spy.mockRestore();
  location.hash = '';
});

const aba = (nome) => screen.getByRole('button', { name: new RegExp(`^${nome}$`) });

describe('App: aba Premium (IDEIA-054)', () => {
  it('#premium abre a aba "Premium" (6ª, no fim da barra) e as 5 abas antigas continuam', async () => {
    location.hash = '#premium';
    render(<App />);
    expect(await screen.findByText('Vale pagar Premium?')).toBeTruthy();
    const nomes = [...document.querySelectorAll('nav.tabs button')].map((b) => b.textContent.trim());
    expect(nomes).toEqual(['Mercado', 'Refino', 'Craft', 'Flipper', 'RRR', 'Premium']);
    expect(aba('Premium').className).toContain('active');
  });

  it('clicar em "Premium" troca para a aba e põe #premium na URL; clicar em "Refino" volta a uma aba antiga', async () => {
    render(<App />);
    fireEvent.click(aba('Premium'));
    expect(await screen.findByText('Vale pagar Premium?')).toBeTruthy();
    expect(location.hash).toBe('#premium');
    fireEvent.click(aba('Refino'));
    await waitFor(() => expect(screen.queryByText('Vale pagar Premium?')).toBeNull());
    expect(aba('Refino').className).toContain('active');
  });

  it('aba Premium que lança fica contida: cabeçalho e abas intactos', async () => {
    globalThis.__quebra = true;
    location.hash = '#premium';
    render(<App />);
    expect(await screen.findByText(/Algo deu errado ao mostrar esta tela/)).toBeTruthy();
    for (const n of ['Mercado', 'Refino', 'Craft', 'Flipper', 'RRR', 'Premium']) expect(aba(n)).toBeTruthy();
    expect(screen.getByText('DATA')).toBeTruthy();
  });
});
