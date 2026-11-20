// IDEIA-088: a linha do Flipper com destino Mercado Negro mostra a 2ª leitura (lista), rotulada; as demais linhas não mudam.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { resetApp, seed } from '../test/ui';

const { fetchHook } = vi.hoisted(() => ({ fetchHook: vi.fn() }));
vi.mock('../lib/market', async (orig) => ({ ...(await orig()), fetchPrices: fetchHook }));
vi.mock('../lib/history', async (orig) => ({ ...(await orig()), fetchHistory: vi.fn(async () => ({ data: {}, truncated: false })) }));

import Flipper from './Flipper';

beforeEach(resetApp);

const prices = (bm) => {
  const t = Date.now() - 3600000;
  const q = (s, b) => ({ 1: { s, sd: t, b, bd: t } });
  return {
    T6_MAIN_SWORD: { Martlock: q(1000, 900), Caerleon: q(1600, 1500), 'Black Market': { 1: { b: 2600, bd: t, ...bm } } },
  };
};

async function scan(bm) {
  seed('flip:cfg', { groups: ['weapons'], tiers: [6], enchs: [0], buyCities: ['Martlock'], sellCities: ['Black Market', 'Caerleon'], buyMode: 'instant', sellMode: 'any', minProfit: 0, minMargin: 0, maxAge: 24, budget: '' });
  fetchHook.mockResolvedValue(prices(bm));
  render(<Flipper />);
  fireEvent.click(screen.getByRole('button', { name: /Varrer mercado/ }));
  await waitFor(() => expect(document.querySelector('tbody tr td')).toBeTruthy());
}

describe('Flipper: 2ª leitura do Mercado Negro', () => {
  it('destino Mercado Negro com lista: mostra a 2ª leitura com NÃO VERIFICADO em jogo', async () => {
    await scan({ s: 9000, sd: Date.now() - 3600000 });
    const alt = screen.getByTestId('bm-alt');
    expect(alt.textContent).toContain('preço de lista, sell_price_min');
    expect(alt.textContent).toContain('9.000');
    expect(alt.textContent).toContain('NÃO VERIFICADO em jogo');
  });
  it('sem lista: nenhuma 2ª leitura', async () => {
    await scan({});
    expect(screen.queryByTestId('bm-alt')).toBeNull();
  });
});
