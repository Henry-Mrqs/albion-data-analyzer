// IDEIA-065 na tela de Craft: preço listado x realista (espada T4, custo 3.524,27; venda Caerleon 12.000; mediana de 7 dias 6.309).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { mkPrices } from '../test/helpers';
import { resetApp, seed, craftCfg, freezeNow, pricesHook } from '../test/ui';

const { priceHook, histHook } = vi.hoisted(() => ({ priceHook: vi.fn(), histHook: vi.fn() }));
vi.mock('../lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook }));
vi.mock('../lib/history', async (orig) => ({ ...(await orig()), useHistory: histHook }));

import Crafting from './Crafting';

const BUY = { METALBAR: 'buy', LEATHER: 'buy' };
const D = 86400000;
const day = Date.UTC(2026, 9, 26);
const CASO1 = [8431, 5381, 2009, 5498, 8316, 10999, 6309].map((p, i) => ({ t: day - (7 - i) * D, n: 10, p }));
let restore;

beforeEach(() => {
  resetApp();
  restore = freezeNow('2026-10-26T12:00:00Z');
  histHook.mockReturnValue({ history: { T4_MAIN_SWORD: { Caerleon: CASO1, Martlock: [] } }, loading: false, error: null });
});
afterEach(() => restore());

function mount(cfg = {}, sword = { Caerleon: { s: 12000 } }) {
  seed('craft:item', { id: 'T4_MAIN_SWORD', ench: 0 });
  seed('craft:cfg', craftCfg({ specialty: true, feePer100: 500, refine: BUY, ...cfg }));
  priceHook.mockReturnValue(pricesHook(mkPrices({ T4_METALBAR: 200, T4_LEATHER: 150, T4_MAIN_SWORD: sword })));
  return render(<Crafting />);
}
const saved = () => JSON.parse(localStorage.getItem('albion:craft:cfg'));
const num = (s) => Number(s.replace(/[^\d,-]/g, '').replace(',', '.'));
const bestBox = () => document.querySelector('.result').textContent;
const bestRow = () => document.querySelector('tbody tr.best');
const field = (label) => screen.getByText(label).parentElement.querySelector('input,select');
const text = () => document.body.textContent;
const stressCenter = () => num(screen.getByTestId('stress-center').textContent);

describe('Crafting: preço de saída realista (065)', () => {
  it('Caerleon 12.000: quadro com lucro +3.849 e "realista; listado 12.000"; linha com 7.886 e "realista · listado 12.000"; líquido 7.374', () => {
    mount();
    expect(bestBox()).toContain('+3.849');
    expect(bestBox()).toContain('realista; listado 12.000');
    expect(bestRow().textContent).toContain('7.886');
    expect(bestRow().textContent).toContain('realista · listado 12.000');
    expect(bestRow().textContent).toContain('7.374');
  });
  it('desligar grava anchorOn false, lucro +7.696 e a linha diz que o teto seria 7.886', () => {
    mount();
    fireEvent.click(within(screen.getByTestId('anchor-controls')).getByRole('checkbox'));
    expect(saved().anchorOn).toBe(false);
    expect(bestBox()).toContain('+7.696');
    expect(bestRow().textContent).toContain('o teto realista seria 7.886');
  });
  it('estado antigo (sem os campos): ligado e sem aviso de valor corrigido', () => {
    mount();
    expect(within(screen.getByTestId('anchor-controls')).getByRole('checkbox').checked).toBe(true);
    expect(text()).not.toContain('inválido');
  });
  it('k 1,5: grava anchorK; teto 9.463,5, lucro +5.324', () => {
    mount();
    fireEvent.change(field('k (teto = k × mediana)'), { target: { value: '1.5' } });
    expect(saved().anchorK).toBe('1.5');
    expect(bestBox()).toContain('+5.324');
  });
  it('corrompido: anchorK "abc" avisa e usa 1,25; anchorOn "x" não derruba', () => {
    const { unmount } = mount({ anchorK: 'abc' });
    expect(text()).toContain('k "abc" inválido');
    expect(bestBox()).toContain('+3.849');
    unmount();
    mount({ anchorOn: 'x' });
    expect(bestBox()).toContain('+3.849');
  });
  it('histórico carregando: "ancoragem pendente" e o lucro usa o listado', () => {
    histHook.mockReturnValue({ history: null, loading: true, error: null });
    mount();
    expect(text()).toContain('ancoragem pendente (histórico carregando)');
    expect(bestBox()).toContain('+7.696');
  });
  it('erro do histórico: lucro com o listado e aviso do Giro', () => {
    histHook.mockReturnValue({ history: null, loading: false, error: 'falhou' });
    mount();
    expect(bestBox()).toContain('+7.696');
    expect(text()).toContain('histórico não carregado: usando o listado');
    expect(text()).toContain('Giro indisponível');
  });
  it('Martlock 8.500 sem histórico: "sem histórico suficiente" e a melhor saída passa a Martlock (+4.423)', () => {
    mount({}, { Caerleon: { s: 12000 }, Martlock: { s: 8500 } });
    expect(bestBox()).toContain('Martlock');
    expect(bestBox()).toContain('+4.423');
    expect(text()).toContain('sem histórico suficiente: usando o listado');
  });
  it('o aviso do Giro "acima da mediana" usa o preço LISTADO (90%), não o realista (25%)', () => {
    mount();
    expect(text()).toContain('90% acima da mediana');
  });
  it('o estresse mostra o lucro realista', () => {
    mount();
    expect(stressCenter()).toBe(3849);
  });
  it('nota das saídas ancoradas', () => {
    mount();
    expect(text()).toContain('1 saída(s) com preço ancorado');
  });
});
