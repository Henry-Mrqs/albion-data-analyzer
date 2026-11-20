// IDEIA-083: o auditor do Craft mostra os valores vivos do cartão Preço-alvo e "aplicada" só quando o alvo é sem imposto.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { mkPrices } from '../test/helpers';
import { resetApp, seed, craftCfg, pricesHook } from '../test/ui';

const { priceHook, histHook } = vi.hoisted(() => ({ priceHook: vi.fn(), histHook: vi.fn() }));
vi.mock('../lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook }));
vi.mock('../lib/history', async (orig) => ({ ...(await orig()), useHistory: histHook }));

import Crafting from './Crafting';

const BUY = { METALBAR: 'buy', LEATHER: 'buy' };
beforeEach(() => {
  resetApp();
  histHook.mockReturnValue({ history: null, loading: false, error: null });
});

function mount(target, cfg = {}) {
  seed('craft:item', { id: 'T4_MAIN_SWORD', ench: 0 });
  seed('craft:cfg', craftCfg({ refine: BUY, ...cfg }));
  if (target) seed('target:cfg', { goal: 'profit', profit: 1000, margin: 20, mode: 'order', relists: 0, ...target });
  priceHook.mockReturnValue(pricesHook(mkPrices({ T4_METALBAR: 200, T4_LEATHER: 150, T4_MAIN_SWORD: { Caerleon: { s: 4500 } } })));
  return render(<Crafting />);
}
const rowEl = (id) => within(screen.getByTestId('var-audit')).getAllByTestId('audit-row').find((e) => e.dataset.rowId === id);
const box = () => screen.getByRole('checkbox', { name: /^Sem imposto: Caerleon, Ordem de venda/ });

describe('Crafting: Preço-alvo vivo no auditor (083)', () => {
  it('marcar/desmarcar Sem imposto na melhor saída: target-notax vira applied e volta a info-only', () => {
    mount();
    expect(rowEl('target-notax').dataset.status).toBe('info-only');
    fireEvent.click(box());
    expect(rowEl('target-notax').dataset.status).toBe('applied');
    expect(rowEl('target-notax').textContent).toContain('aplicada: ordem de venda (Caerleon)');
    fireEvent.click(box());
    expect(rowEl('target-notax').dataset.status).toBe('info-only');
  });
  it('modo do cartão em ordem de compra com a marca só em ordem de venda: informativa', () => {
    mount({ mode: 'instant' }, { noTax: { 'Caerleon|order': true } });
    expect(rowEl('target-notax').dataset.status).toBe('info-only');
    expect(rowEl('target-notax').textContent).toContain('marcada só em ordem de venda');
    expect(rowEl('target-mode').textContent).toContain('ordem de compra (na hora)');
  });
  it('mudar a meta no cartão muda target-goal sem recarregar', () => {
    mount({});
    expect(rowEl('target-goal').textContent).toContain('lucro de 1.000 por unidade');
    fireEvent.click(screen.getByRole('button', { name: 'Equilíbrio' }));
    expect(rowEl('target-goal').textContent).toContain('equilíbrio (lucro 0)');
  });
  it('target:cfg corrompido: quadro presente, modo exibido é o corrigido', () => {
    for (const bad of [null, { mode: 'FOO' }]) {
      resetApp();
      seed('craft:item', { id: 'T4_MAIN_SWORD', ench: 0 });
      seed('craft:cfg', craftCfg({ refine: BUY }));
      seed('target:cfg', bad);
      priceHook.mockReturnValue(pricesHook(mkPrices({ T4_METALBAR: 200, T4_LEATHER: 150, T4_MAIN_SWORD: { Caerleon: { s: 4500 } } })));
      const { unmount } = render(<Crafting />);
      expect(rowEl('target-notax')).toBeTruthy();
      if (rowEl('target-mode')) expect(rowEl('target-mode').textContent).toContain('ordem de venda');
      unmount();
    }
  });
});
