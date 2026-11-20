// IDEIA-074 Task 3: ligação do Refino com o estresse (031 N09/N13). O código já está certo; a prova é a mutação
// (estresse sem repassar noTax; sellCity ignorada; extras do Refino fora do estresse).
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
  extras: [], ...over,
});

beforeEach(resetApp);

function mount(cfg = {}) {
  seed('refine:cfg', cfgBase(cfg));
  priceHook.mockReturnValue(pricesHook(mkPrices(planksSpec({ T4_PLANKS: { 'Fort Sterling': { s: 120 }, Martlock: { s: 135 }, 'Black Market': { b: 140 } } }))));
  return render(<Refining />);
}
const stress = () => screen.getByTestId('stress-card').textContent;
const center = () => screen.getByTestId('stress-center').textContent;

describe('Refining: o estresse recebe a venda escolhida e as despesas do Refino', () => {
  it('a cidade de venda escolhida aparece como a saída variada e muda com sellCity', () => {
    const a = mount({ sellCity: 'Martlock' });
    expect(stress()).toContain('Saída de venda variada: Martlock');
    a.unmount();
    mount({ sellCity: 'Fort Sterling' });
    expect(stress()).toContain('Saída de venda variada: Fort Sterling');
  });

  it('"Venda sem imposto" do Refino chega ao estresse: texto ", sem imposto" e o lucro central sobe', () => {
    const a = mount({ sellCity: 'Martlock' });
    const com = center();
    expect(stress()).not.toContain('sem imposto');
    fireEvent.click(screen.getByRole('checkbox', { name: /Venda sem imposto/ }));
    expect(stress()).toContain('sem imposto');
    expect(Number(center().replace(/\./g, '').replace(',', '.'))).toBeGreaterThan(Number(com.replace(/\./g, '').replace(',', '.')));
    a.unmount();
  });

  it('as despesas extras do Refino entram no estresse (lucro central cai)', () => {
    const a = mount({ sellCity: 'Martlock' });
    const sem = Number(center().replace(/\./g, '').replace(',', '.'));
    a.unmount();
    mount({ sellCity: 'Martlock', extras: [{ name: '', value: '10', scope: 'craft' }] });
    const com = Number(center().replace(/\./g, '').replace(',', '.'));
    expect(com).toBeLessThan(sem);
  });
});
