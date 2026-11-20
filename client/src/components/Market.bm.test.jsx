// IDEIA-088: a linha do Mercado Negro na aba Mercado rotula as duas colunas; as outras cidades não mudam.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { mkPrices } from '../test/helpers';
import { resetApp, pricesHook } from '../test/ui';

const { priceHook } = vi.hoisted(() => ({ priceHook: vi.fn() }));
vi.mock('../lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook }));

import Market from './Market';

beforeEach(resetApp);

describe('Market: Mercado Negro com as duas colunas rotuladas', () => {
  it('só a linha do Mercado Negro ganha os rótulos NÃO VERIFICADO em jogo', () => {
    priceHook.mockReturnValue(pricesHook(mkPrices({ T6_MAIN_SWORD: { Caerleon: { s: 1600, b: 1500 }, 'Black Market': { s: 10854, b: 2607 } } })));
    render(<Market />);
    const row = (name) => [...document.querySelectorAll('tbody tr')].find((r) => r.firstChild.textContent === name);
    expect(row('Mercado Negro').textContent).toContain('preço de lista (sell_price_min) · NÃO VERIFICADO em jogo');
    expect(row('Mercado Negro').textContent).toContain('ordem de compra (buy_price_max) · NÃO VERIFICADO em jogo');
    expect(row('Caerleon').textContent).not.toContain('NÃO VERIFICADO');
    expect(screen.getByText(/o app não sabe qual delas o jogador recebe/)).toBeTruthy();
  });
});
