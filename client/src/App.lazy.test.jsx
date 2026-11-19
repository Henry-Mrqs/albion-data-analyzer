import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { resetApp, pricesHook } from './test/ui';

const { priceHook, histHook, goldHook } = vi.hoisted(() => ({ priceHook: vi.fn(), histHook: vi.fn(), goldHook: vi.fn() }));
vi.mock('./lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook, fetchPrices: vi.fn(async () => ({})) }));
vi.mock('./lib/history', async (orig) => ({ ...(await orig()), useHistory: histHook, fetchHistory: vi.fn(async () => ({ data: {}, truncated: false })) }));
vi.mock('./lib/gold', async (orig) => ({ ...(await orig()), useGold: goldHook }));
// A fábrica roda quando o módulo da aba é AVALIADO: com import estático (sem lazy) isso ocorre já ao importar o App.
vi.mock('./components/Premium', async (orig) => {
  globalThis.__premiumAvaliado = true;
  return orig();
});

import App from './App';

beforeEach(() => {
  resetApp();
  priceHook.mockReturnValue(pricesHook({}));
  histHook.mockReturnValue({ history: null, loading: false, error: null });
  goldHook.mockReturnValue({ gold: null, loading: false, error: null, refresh() {} });
});

describe('App: Premium é carregada sob demanda (lazy)', () => {
  it('o módulo da aba não está no grafo estático do App: só é avaliado ao abrir a aba', async () => {
    expect(globalThis.__premiumAvaliado).toBeUndefined(); // só importar o App não avalia a aba
    render(<App />);
    await screen.findByRole('button', { name: 'Premium' });
    expect(globalThis.__premiumAvaliado).toBeUndefined(); // nem renderizar o App na aba Mercado
    fireEvent.click(screen.getByRole('button', { name: 'Premium' }));
    expect(await screen.findByText('Vale pagar Premium?')).toBeTruthy();
    expect(globalThis.__premiumAvaliado).toBe(true);
  });
});
