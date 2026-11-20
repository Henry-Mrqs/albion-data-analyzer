// IDEIA-075 na tela de Refino: o interruptor "Venda sem imposto" vale para o Preço-alvo (nos dois modos do cartão).
// Cenário A: tábua T4 custa 61,4734 + 10 de despesa por unidade = 71,4734; meta de lucro 1.000.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { mkPrices, planksSpec } from '../test/helpers';
import { resetApp, seed, pricesHook } from '../test/ui';

const { priceHook } = vi.hoisted(() => ({ priceHook: vi.fn() }));
vi.mock('../lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook }));

import Refining from './Refining';

const cfgBase = (over = {}) => ({
  type: 'PLANKS', tier: 4, ench: 0, buyCity: 'best', refineCity: 'Fort Sterling', sellCity: 'best',
  focus: false, daily: 0, feePer100: 400, customRRR: '', useOrders: false, route: 'best', sellMode: 'order', qty: 100,
  extras: [{ name: '', value: '10', scope: 'craft' }],
  ...over,
});

beforeEach(resetApp);

function mount(cfg = {}, target = null) {
  seed('refine:cfg', cfgBase(cfg));
  if (target) seed('target:cfg', { goal: 'profit', profit: 1000, margin: 20, mode: 'order', relists: 0, ...target });
  priceHook.mockReturnValue(pricesHook(mkPrices(planksSpec({ T4_PLANKS: { 'Fort Sterling': { s: 120 }, Martlock: { s: 135 }, 'Black Market': { b: 140 } } }))));
  return render(<Refining />);
}
const big = () => screen.getByText('Liste a').parentElement.querySelector('.big').textContent;
const AVISO = /Venda sem imposto marcada/;
const sw = () => screen.getByRole('checkbox', { name: /Venda sem imposto/ });

describe('Refining: Preço-alvo e "Venda sem imposto" (075)', () => {
  it('sem interruptor: alvo 1.146 ((71,4734 + 1.000) ÷ 0,935) e sem aviso', () => {
    mount();
    expect(big()).toBe('1.146');
    expect(document.body.textContent).not.toMatch(AVISO);
  });
  it('com "Venda sem imposto": alvo 1.072 (1.071,4734 ÷ 1) e a linha de aviso cita a cidade da venda', () => {
    mount();
    fireEvent.click(sw());
    expect(big()).toBe('1.072');
    expect(document.body.textContent).toContain('Venda sem imposto marcada (Mercado Negro, ordem de compra)');
    fireEvent.click(sw());
    expect(big()).toBe('1.146');
    expect(document.body.textContent).not.toMatch(AVISO);
  });
  it('o interruptor vale nos dois modos do cartão: na hora, sem: 1.071,4734 ÷ 0,96 = 1.116,1 → 1.117; com: 1.072', () => {
    const { unmount } = mount({}, { mode: 'instant' });
    expect(big()).toBe('1.117');
    unmount();
    mount({ noTax: { 'Refino|order': true } }, { mode: 'instant' });
    expect(big()).toBe('1.072');
    expect(document.body.textContent).toContain('ordem de compra');
  });
});
