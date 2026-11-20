// IDEIA-059 na tela de Refino (cenário A: custo 61,4734 + 10 de despesa; venda em Martlock por ordem a 135, qty 100).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { mkPrices, planksSpec } from '../test/helpers';
import { resetApp, seed, pricesHook } from '../test/ui';

const { priceHook } = vi.hoisted(() => ({ priceHook: vi.fn() }));
vi.mock('../lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook }));

import Refining from './Refining';

const cfgBase = (over = {}) => ({
  type: 'PLANKS', tier: 4, ench: 0, buyCity: 'best', refineCity: 'Fort Sterling', sellCity: 'Martlock',
  focus: false, daily: 0, feePer100: 400, customRRR: '', useOrders: false, route: 'best', sellMode: 'order', qty: 100,
  extras: [{ name: '', value: '10', scope: 'craft' }], ...over,
});
beforeEach(resetApp);

function mount(cfg = {}) {
  seed('refine:cfg', cfgBase(cfg));
  priceHook.mockReturnValue(pricesHook(mkPrices(planksSpec({ T4_PLANKS: { 'Fort Sterling': { s: 120 }, Martlock: { s: 135 }, 'Black Market': { b: 140 } } }))));
  return render(<Refining />);
}
const text = () => document.body.textContent;
const field = (label) => screen.getByText(label).parentElement.querySelector('input,select');

describe('Refining: atualizações da ordem de venda (059)', () => {
  it('estado antigo: lucro por unidade +55 e total +5.475; sem resumo', () => {
    mount();
    expect(text()).toContain('+55');
    expect(text()).toContain('+5.475');
    expect(screen.queryByTestId('order-life-summary')).toBeNull();
  });
  it('2 atualizações: lucro +48, total +4.800, resumo 3 listagens e nota no líquido', () => {
    mount({ relists: '2' });
    expect(text()).toContain('+48');
    expect(text()).toContain('+4.800');
    expect(screen.getByTestId('order-life-summary').textContent).toContain('3 listagens');
    expect(text()).toContain('já desconta 2 atualização(ões) da ordem');
  });
  it('digitar grava refine:cfg; Venda sem imposto: "não se aplicam"', () => {
    mount();
    fireEvent.change(field('Atualizações da ordem (relistagens)'), { target: { value: '2' } });
    expect(JSON.parse(localStorage.getItem('albion:refine:cfg')).relists).toBe('2');
    fireEvent.click(screen.getByRole('checkbox', { name: /Venda sem imposto/ }));
    expect(screen.getByTestId('order-life-summary').textContent).toContain('não se aplicam');
  });
  it('corrompido: "abc" avisa e usa 0 (lucro +55)', () => {
    mount({ relists: 'abc' });
    expect(text()).toContain('Relistagens "abc" inválidas: usando 0.');
    expect(text()).toContain('+55');
  });
});
