import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { resetApp, pricesHook } from './test/ui';

const { priceHook, histHook, goldHook } = vi.hoisted(() => ({ priceHook: vi.fn(), histHook: vi.fn(), goldHook: vi.fn() }));
vi.mock('./lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook, fetchPrices: vi.fn(async () => ({})) }));
vi.mock('./lib/history', async (orig) => ({ ...(await orig()), useHistory: histHook, fetchHistory: vi.fn(async () => ({ data: {}, truncated: false })) }));
vi.mock('./lib/gold', async (orig) => ({ ...(await orig()), useGold: goldHook }));
import App from './App';

const NOMES = ['Mercado', 'Refino', 'Craft', 'Flipper', 'RRR', 'Premium'];
const abas = () => [...document.querySelectorAll('nav.tabs button')];

let scrollSpy;
beforeEach(() => {
  resetApp();
  priceHook.mockReturnValue(pricesHook({}));
  histHook.mockReturnValue({ history: null, loading: false, error: null });
  goldHook.mockReturnValue({ gold: null, loading: false, error: null, refresh() {} });
  scrollSpy = vi.fn();
  Element.prototype.scrollIntoView = scrollSpy;
});
afterEach(() => {
  delete Element.prototype.scrollIntoView;
  location.hash = '';
});

describe('App: abas só ícone em tela estreita (IDEIA-054, retrabalho 1)', () => {
  it('toda aba tem aria-label e title com o nome (o rótulo some por CSS em telas estreitas)', async () => {
    render(<App />);
    expect(abas().map((b) => b.getAttribute('aria-label'))).toEqual(NOMES);
    expect(abas().map((b) => b.getAttribute('title'))).toEqual(NOMES);
    for (const n of NOMES) expect(screen.getByRole('button', { name: n })).toBeTruthy();
  });

  it('o texto da aba fica dentro de um <span class="tab-label"> (é ele que o CSS esconde)', async () => {
    render(<App />);
    expect(abas().map((b) => b.querySelector('.tab-label')?.textContent)).toEqual(NOMES);
  });

  it('a aba ativa é rolada para a vista ao montar (#premium), com block/inline "nearest"', async () => {
    location.hash = '#premium';
    render(<App />);
    await waitFor(() => expect(scrollSpy).toHaveBeenCalled());
    expect(scrollSpy.mock.contexts.at(-1)).toBe(abas()[5]);
    expect(scrollSpy).toHaveBeenLastCalledWith({ block: 'nearest', inline: 'nearest' });
  });

  it('ao trocar de aba, a nova aba ativa é rolada para a vista', async () => {
    render(<App />);
    scrollSpy.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'RRR' }));
    await waitFor(() => expect(scrollSpy).toHaveBeenCalled());
    expect(scrollSpy.mock.contexts.at(-1)).toBe(abas()[4]);
    expect(scrollSpy).toHaveBeenLastCalledWith({ block: 'nearest', inline: 'nearest' });
  });
});
