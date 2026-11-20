// IDEIA-088: Craft mostra as duas leituras do Mercado Negro, rotuladas; a de lista nunca é o "Melhor destino".
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { mkPrices } from '../test/helpers';
import { resetApp, seed, craftCfg, freezeNow, pricesHook } from '../test/ui';

const { priceHook, histHook } = vi.hoisted(() => ({ priceHook: vi.fn(), histHook: vi.fn() }));
vi.mock('../lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook }));
vi.mock('../lib/history', async (orig) => ({ ...(await orig()), useHistory: histHook }));

import Crafting from './Crafting';

const ISO = '2026-11-17T12:00:00Z';
let restore;
beforeEach(() => {
  resetApp();
  restore = freezeNow(ISO);
  histHook.mockReturnValue({ history: null, loading: false, error: null });
});
afterEach(() => restore());

const NOWMS = Date.parse(ISO);
function mount(bm, cfg = {}) {
  seed('craft:item', { id: 'T6_MAIN_SWORD', ench: 0 });
  seed('craft:cfg', craftCfg({ specialty: true, refine: { METALBAR: 'buy', LEATHER: 'buy' }, ...cfg }));
  const spec = { T6_METALBAR: 200, T6_LEATHER: 150 };
  if (bm) spec.T6_MAIN_SWORD = { 'Black Market': { ...bm, sd: NOWMS - 3600000, bd: NOWMS - 3600000 } };
  priceHook.mockReturnValue(pricesHook(mkPrices(spec)));
  return render(<Crafting />);
}
const ondeVender = () => screen.getByText('Onde vender').closest('.card');
const melhor = () => screen.getByText('Melhor destino').parentElement.textContent;

describe('Crafting: Mercado Negro com duas leituras', () => {
  it('com as duas: aviso e rótulos NÃO VERIFICADO; a tabela tem as duas linhas; a de lista tem o selo e não é o melhor destino', () => {
    mount({ b: 2607, s: 10854 });
    expect(screen.getByTestId('bm-readings')).toBeTruthy();
    const t = ondeVender().textContent;
    expect(t).toContain('Mercado Negro: ordem de compra (buy_price_max) · NÃO VERIFICADO em jogo');
    expect(t).toContain('Mercado Negro: preço de lista (sell_price_min) · NÃO VERIFICADO em jogo');
    expect(t).toContain('não entra no melhor destino');
    expect(melhor()).toContain('ordem de compra (buy_price_max)');
    expect(melhor()).not.toContain('sell_price_min');
    expect(screen.getByRole('alert').textContent).toContain('divergem');
  });

  it('marcar "Sem imposto" na leitura de lista grava a chave Black Market|list e não mexe na de compra', () => {
    mount({ b: 2607, s: 10854 });
    fireEvent.click(screen.getByRole('checkbox', { name: /Sem imposto: Mercado Negro, Mercado Negro: preço de lista/ }));
    const saved = JSON.parse(localStorage.getItem('albion:craft:cfg'));
    expect(saved.noTax).toEqual({ 'Black Market|list': true });
  });

  it('sem Mercado Negro: nenhum aviso nem rótulo de leitura; só compra: aviso curto de "uma leitura só"', () => {
    const a = mount(null);
    expect(screen.queryByTestId('bm-readings')).toBeNull();
    expect(a.container.textContent).not.toContain('buy_price_max');
    a.unmount();
    mount({ b: 2607, s: 0 });
    expect(screen.getByTestId('bm-readings').textContent).toContain('uma leitura só (ordem de compra)');
    expect(screen.getByTestId('bm-readings').textContent).toContain('NÃO VERIFICADO em jogo');
  });
});
