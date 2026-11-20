// IDEIA-082: aviso quando a marca "Sem imposto" é de outro modo; Mercado Negro nunca "ordem de venda"; mutantes M19/M23.
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { mkPrices } from '../test/helpers';
import { resetApp, seed } from '../test/ui';
import TargetPrice from './TargetPrice';

const prices = mkPrices({ T4_MAIN_SWORD: { Caerleon: { s: 4500 } } });
const CFG = { goal: 'profit', profit: 1000, margin: 20, mode: 'order', relists: 0 };
const NT = (order, instant) => ({ order, instant });
const ON_ORDER = NT({ on: true, city: 'Caerleon' }, { on: false, city: 'Caerleon' });
beforeEach(resetApp);

function mount(noTax, cfg = {}) {
  seed('target:cfg', { ...CFG, ...cfg });
  return render(<TargetPrice cost={3524.27} prices={prices} mid="T4_MAIN_SWORD" missing={false} noTax={noTax} />);
}
const big = () => screen.getByText('Liste a').parentElement.querySelector('.big').textContent;
const hint = () => screen.getByText('Liste a').parentElement.textContent;
const OUTRO = 'target-notax-other-mode';

describe('TargetPrice: aviso do outro modo (082 D2)', () => {
  it('modo instant com marca só em ordem de venda: alvo 4.713 (com imposto) e aviso do outro modo', () => {
    mount(ON_ORDER, { mode: 'instant' });
    expect(big()).toBe('4.713');
    expect(screen.getByTestId(OUTRO).textContent).toBe(
      "A saída marcada como 'sem imposto' (Caerleon, ordem de venda) é de outro modo: este alvo, em ordem de compra (Caerleon), conta imposto.",
    );
  });
  it('modo order com a marca em ordem de venda: alvo 4.525 e o aviso atual, sem o aviso de outro modo', () => {
    mount(ON_ORDER);
    expect(big()).toBe('4.525');
    expect(document.body.textContent).toContain('Venda sem imposto marcada (Caerleon, ordem de venda)');
    expect(screen.queryByTestId(OUTRO)).toBeNull();
  });
  it('sem nenhuma marca: nenhum aviso; alvo 4.839', () => {
    mount(NT(null, null));
    expect(big()).toBe('4.839');
    expect(screen.queryByTestId(OUTRO)).toBeNull();
    expect(document.body.textContent).not.toMatch(/Venda sem imposto marcada/);
  });
  it('Mercado Negro marcado: cita ordem de compra do Mercado Negro e nunca "ordem de venda" para essa cidade', () => {
    mount(NT({ on: false, city: 'Caerleon' }, { on: true, city: 'Black Market' }), { mode: 'order' });
    expect(screen.getByTestId(OUTRO).textContent).toContain('Mercado Negro, ordem de compra do Mercado Negro');
    expect(screen.getByTestId(OUTRO).textContent).not.toMatch(/Mercado Negro, ordem de venda/);
  });
});

describe('TargetPrice: mutantes M19/M23 (082 D1)', () => {
  it('M19: modo salvo inválido usa o corrigido (order) e aplica a marca: 4.525', () => {
    mount(ON_ORDER, { mode: 'FOO', relists: 2 });
    expect(big()).toBe('4.525');
    expect(hint()).toContain('lucro 1.000,73 por unidade');
  });
  it('M23: com a marca, relistagens não entram: líquido 4.525,00; sem a marca (2 relistagens) alvo 5.113', () => {
    const { unmount } = mount(ON_ORDER, { relists: 2 });
    expect(hint()).toContain('líquido 4.525,00');
    unmount();
    mount(NT(null, null), { relists: 2 });
    expect(big()).toBe('5.113');
    const m = hint().match(/líquido (\d[\d.]*,\d{2})/)[1];
    expect(Number(m.replace('.', '').replace(',', '.'))).toBeCloseTo(4525.005, 1);
  });
});
