// IDEIA-075 na tela de Craft: o Preço-alvo segue a marca "Sem imposto" da melhor saída do modo (D1 da 048, D-056).
// Cenário do laudo: espada T4, bancada 500, venda Caerleon 4.500, despesas 150 + 80 por craft, custo 3.754,27, alvo de lucro 1.000.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { mkPrices } from '../test/helpers';
import { resetApp, seed, craftCfg, pricesHook } from '../test/ui';

const { priceHook, histHook } = vi.hoisted(() => ({ priceHook: vi.fn(), histHook: vi.fn() }));
vi.mock('../lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook }));
vi.mock('../lib/history', async (orig) => ({ ...(await orig()), useHistory: histHook }));

import Crafting from './Crafting';

const BUY = { METALBAR: 'buy', LEATHER: 'buy' };
const L = [{ name: 'Transporte', value: '150', scope: 'craft' }, { name: 'Comida de buff', value: '80', scope: 'craft' }];
const AVISO = /Venda sem imposto marcada/;

beforeEach(() => {
  resetApp();
  histHook.mockReturnValue({ history: null, loading: false, error: null });
});

function mount(cfg = {}, sword = { Caerleon: { s: 4500 } }) {
  seed('craft:item', { id: 'T4_MAIN_SWORD', ench: 0 });
  seed('craft:cfg', craftCfg({ specialty: true, feePer100: 500, refine: BUY, extras: L, ...cfg }));
  priceHook.mockReturnValue(pricesHook(mkPrices({ T4_METALBAR: 200, T4_LEATHER: 150, T4_MAIN_SWORD: sword })));
  return render(<Crafting />);
}
const big = () => screen.getByText('Liste a').parentElement.querySelector('.big').textContent;
const card = () => screen.getByText('Liste a').parentElement.textContent;
const bestBox = () => document.querySelector('.result').textContent;
const box = (re) => screen.getByRole('checkbox', { name: re });
const num = (s) => Number(s.replace(/\./g, '').replace(',', '.'));
const stressCenter = () => num(screen.getByTestId('stress-center').textContent);

describe('Crafting: Preço-alvo e "Sem imposto" (075)', () => {
  it('sem marca: Preço-alvo lista a 5.085 (caso medido pelo Tester em D1) e sem aviso', () => {
    mount();
    expect(big()).toBe('5.085');
    expect(document.body.textContent).not.toMatch(AVISO);
  });
  it('marcar "Sem imposto" em Caerleon|order pela tela: lista a 4.755, tabela mostra lucro 746 e o aviso cita Caerleon', () => {
    mount();
    fireEvent.click(box(/^Sem imposto: Caerleon, Ordem de venda/));
    expect(big()).toBe('4.755');
    expect(bestBox()).toContain('746');
    expect(document.body.textContent).toContain('Venda sem imposto marcada (Caerleon, ordem de venda)');
  });
  it('desmarcar volta a 5.085 e some o aviso', () => {
    mount({ noTax: { 'Caerleon|order': true } });
    expect(big()).toBe('4.755');
    fireEvent.click(box(/^Sem imposto: Caerleon, Ordem de venda/));
    expect(big()).toBe('5.085');
    expect(document.body.textContent).not.toMatch(AVISO);
  });
  it('marca em saída do modo "instant" não muda o cartão em modo ordem (5.085)', () => {
    mount({}, { Caerleon: { s: 4500, b: 4000 } });
    fireEvent.click(box('Sem imposto: Caerleon, Ordem de compra'));
    expect(big()).toBe('5.085');
    expect(document.body.textContent).not.toMatch(AVISO);
  });
  it('duas saídas de ordem de venda (Caerleon 4.500 e Martlock 4.000): só a melhor decide', () => {
    const sword = { Caerleon: { s: 4500 }, Martlock: { s: 4000 } };
    const { unmount } = mount({ noTax: { 'Martlock|order': true } }, sword);
    expect(big()).toBe('5.085');
    expect(document.body.textContent).not.toMatch(AVISO);
    unmount();
    mount({ noTax: { 'Caerleon|order': true } }, sword);
    expect(big()).toBe('4.755');
    expect(document.body.textContent).toContain('(Caerleon, ordem de venda)');
  });
  it('estado salvo com noTax já abre com 4.755', () => {
    mount({ noTax: { 'Caerleon|order': true } });
    expect(big()).toBe('4.755');
  });
});

describe('Crafting: a grade do estresse (031) e o Preço-alvo concordam no mesmo noTax (D-056)', () => {
  // k do cartão = líquido ÷ preço listado; k do estresse = (lucro central + custo) ÷ preço de venda (4.500). Ambos vêm de netSale.
  const kCard = () => num(card().match(/líquido (\d[\d.]*,\d{2})/)[1]) / num(big());
  const kStress = () => (stressCenter() + 3754.27) / 4500;
  it('marcado: os dois usam fator 1 (líquido 4.500 por unidade; sem imposto nem taxa de criação)', () => {
    mount({ noTax: { 'Caerleon|order': true } });
    expect(big()).toBe('4.755');
    expect(stressCenter()).toBe(746);
    expect(kCard()).toBeCloseTo(1, 3);
    expect(kStress()).toBeCloseTo(1, 3);
    expect(kStress() * 4500).toBeCloseTo(4500, 0);
    expect(screen.getByTestId('stress-card').textContent).toContain('Caerleon, Ordem de venda, sem imposto');
  });
  it('desmarcado: os dois usam 0,935 (líquido 4.207,50 por unidade)', () => {
    mount();
    expect(big()).toBe('5.085');
    expect(stressCenter()).toBe(453);
    expect(kCard()).toBeCloseTo(0.935, 3);
    expect(kStress()).toBeCloseTo(0.935, 3);
    expect(kStress() * 4500).toBeCloseTo(4207.5, 0);
  });
  it('mesmo estado salvo, mesma mudança: marcar pela tela move cartão e estresse juntos', () => {
    mount();
    expect(kCard()).toBeCloseTo(kStress(), 3);
    fireEvent.click(box(/^Sem imposto: Caerleon, Ordem de venda/));
    expect(kCard()).toBeCloseTo(1, 3);
    expect(kCard()).toBeCloseTo(kStress(), 3);
  });
});
