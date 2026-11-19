// IDEIA-075: o cartão Preço-alvo respeita "Sem imposto" (D1 do laudo da 048; regra D-056: melhor saída do modo).
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { mkPrices } from '../test/helpers';
import { resetApp, seed } from '../test/ui';
import TargetPrice from './TargetPrice';

const prices = mkPrices({ T4_MAIN_SWORD: { Caerleon: { s: 4500 } } });
const CFG = { goal: 'profit', profit: 1000, margin: 20, mode: 'order', relists: 0 };
const ON = { order: { on: true, city: 'Caerleon' }, instant: null };

beforeEach(resetApp);

function mount(noTax, cfg = {}) {
  seed('target:cfg', { ...CFG, ...cfg });
  const props = noTax === undefined ? {} : { noTax };
  return render(<TargetPrice cost={3754.27} prices={prices} mid="T4_MAIN_SWORD" missing={false} {...props} />);
}
const big = () => screen.getByText('Liste a').parentElement.querySelector('.big').textContent;
const hint = () => screen.getByText('Liste a').parentElement.textContent;
const AVISO = /Venda sem imposto marcada/;

describe('TargetPrice: noTax (075)', () => {
  it('sem noTax (padrão): lista a 5.085 (4.754,27 ÷ 0,935) e não mostra a linha de aviso', () => {
    mount();
    expect(big()).toBe('5.085');
    expect(document.body.textContent).not.toMatch(AVISO);
  });
  it('noTax.order ligado no modo ordem de venda: lista a 4.755 e avisa com a cidade e "relistagens não contam"', () => {
    mount(ON);
    expect(big()).toBe('4.755');
    expect(document.body.textContent).toContain('Venda sem imposto marcada (Caerleon, ordem de venda)');
    expect(document.body.textContent).toContain('relistagens não contam');
  });
  it('noTax só no instant e modo ordem: continua 5.085 e sem aviso (a marca é de outro modo)', () => {
    mount({ order: null, instant: { on: true, city: 'Black Market' } });
    expect(big()).toBe('5.085');
    expect(document.body.textContent).not.toMatch(AVISO);
  });
  it('noTax.order = { on: false }: 5.085 e sem aviso', () => {
    mount({ order: { on: false, city: 'Caerleon' }, instant: null });
    expect(big()).toBe('5.085');
    expect(document.body.textContent).not.toMatch(AVISO);
  });
  it('modo "Ordem de compra (na hora)" com instant desligado: 4.754,27 ÷ 0,96 = 4.953; ligado: 4.755 e aviso cita "ordem de compra"', () => {
    const { unmount } = mount({ order: ON.order, instant: { on: false, city: 'Caerleon' } }, { mode: 'instant' });
    expect(big()).toBe('4.953');
    expect(document.body.textContent).not.toMatch(AVISO);
    unmount();
    mount({ order: null, instant: { on: true, city: 'Black Market' } }, { mode: 'instant' });
    expect(big()).toBe('4.755');
    expect(document.body.textContent).toContain('Venda sem imposto marcada (Mercado Negro, ordem de compra)');
  });
  it('trocar o modo pela tela troca qual marca vale', () => {
    mount({ order: { on: false, city: 'Caerleon' }, instant: { on: true, city: 'Black Market' } });
    expect(big()).toBe('5.085');
    fireEvent.click(screen.getByRole('button', { name: 'Ordem de compra (na hora)' }));
    expect(big()).toBe('4.755');
    expect(document.body.textContent).toMatch(AVISO);
  });
  it('relistagens (2) com noTax.order: alvo 4.755 (não soma 2 × 2,5%); sem noTax o mesmo cenário dá 5.373', () => {
    const { unmount } = mount(undefined, { relists: 2 });
    expect(big()).toBe('5.373');
    unmount();
    mount(ON, { relists: 2 });
    expect(big()).toBe('4.755');
  });
  it('o texto bate: com noTax líquido 4.755,00 e lucro 1.000,73 por unidade (custo 3.754)', () => {
    mount(ON);
    expect(hint()).toContain('líquido 4.755,00');
    expect(hint()).toContain('lucro 1.000,73 por unidade (custo 3.754)');
  });
  it('meta de margem 20% com noTax: 3.754,27 × 1,2 = 4.506', () => {
    mount(ON, { goal: 'margin' });
    expect(big()).toBe('4.506');
  });
  it('prop noTax ausente, {} ou com null nos dois modos não quebra (tudo desligado)', () => {
    for (const noTax of [undefined, {}, { order: null, instant: null }]) {
      const { unmount } = mount(noTax);
      expect(big()).toBe('5.085');
      expect(document.body.textContent).not.toMatch(AVISO);
      unmount();
    }
  });
});
