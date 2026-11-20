// IDEIA-083: o auditor do Refino mostra os valores vivos do cartão Preço-alvo.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { mkPrices, planksSpec } from '../test/helpers';
import { resetApp, seed, pricesHook } from '../test/ui';

const { priceHook } = vi.hoisted(() => ({ priceHook: vi.fn() }));
vi.mock('../lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook }));

import Refining from './Refining';

const cfgBase = (over = {}) => ({
  type: 'PLANKS', tier: 4, ench: 0, buyCity: 'best', refineCity: 'Fort Sterling', sellCity: 'best',
  focus: false, daily: 0, feePer100: 400, customRRR: '', useOrders: false, route: 'best', sellMode: 'order', qty: 100,
  extras: [{ name: '', value: '10', scope: 'craft' }], ...over,
});
beforeEach(resetApp);

function mount(cfg = {}, target = null) {
  seed('refine:cfg', cfgBase(cfg));
  if (target !== null) seed('target:cfg', target);
  priceHook.mockReturnValue(pricesHook(mkPrices(planksSpec({ T4_PLANKS: { 'Fort Sterling': { s: 120 }, Martlock: { s: 135 }, 'Black Market': { b: 140 } } }))));
  return render(<Refining />);
}
const rowEl = (id) => within(screen.getByTestId('var-audit')).getAllByTestId('audit-row').find((e) => e.dataset.rowId === id);
const sw = () => screen.getByRole('checkbox', { name: /Venda sem imposto/ });

describe('Refining: Preço-alvo vivo no auditor (083)', () => {
  it('o interruptor Venda sem imposto liga e desliga "aplicada"', () => {
    mount();
    expect(rowEl('target-notax').dataset.status).toBe('info-only');
    fireEvent.click(sw());
    expect(rowEl('target-notax').dataset.status).toBe('applied');
    expect(rowEl('target-notax').textContent).toContain('aplicada: ordem de compra do Mercado Negro (Black Market)');
    fireEvent.click(sw());
    expect(rowEl('target-notax').dataset.status).toBe('info-only');
  });
  it('meta e modo vivos; mudar a meta atualiza a linha', () => {
    mount({}, { goal: 'profit', profit: 1000, margin: 20, mode: 'instant', relists: 3 });
    expect(rowEl('target-goal').textContent).toContain('lucro de 1.000 por unidade');
    expect(rowEl('target-mode').textContent).toContain('ordem de compra (na hora)');
    fireEvent.click(screen.getByRole('button', { name: 'Equilíbrio' }));
    expect(rowEl('target-goal').textContent).toContain('equilíbrio (lucro 0)');
  });
  it('target:cfg corrompido: quadro presente', () => {
    for (const bad of [null, { mode: 'FOO' }]) {
      const { unmount } = mount({}, bad);
      expect(rowEl('target-notax')).toBeTruthy();
      unmount();
    }
  });
});
