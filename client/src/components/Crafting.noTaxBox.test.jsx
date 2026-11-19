// IDEIA-076 (D4): o quadro "Melhor destino" diz quando a melhor saída está sem imposto; a nota da marca global.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { mkPrices } from '../test/helpers';
import { resetApp, seed, craftCfg, pricesHook } from '../test/ui';

const { priceHook, histHook } = vi.hoisted(() => ({ priceHook: vi.fn(), histHook: vi.fn() }));
vi.mock('../lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook }));
vi.mock('../lib/history', async (orig) => ({ ...(await orig()), useHistory: histHook }));

import Crafting from './Crafting';

const BUY = { METALBAR: 'buy', LEATHER: 'buy' };
const L = [{ name: 'Transporte', value: '150', scope: 'craft' }, { name: 'Comida de buff', value: '80', scope: 'craft' }];

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
const bestBox = () => document.querySelector('.result').textContent;

describe('Crafting: Melhor destino e a marca "Sem imposto" (076)', () => {
  it('sem marca: o quadro Melhor destino mostra lucro +453 e NÃO tem "sem imposto"', () => {
    mount();
    expect(bestBox()).toContain('453');
    expect(bestBox()).not.toContain('sem imposto');
  });
  it('marcando Sem imposto em Caerleon (ordem de venda): lucro +746, "Venda líquida 4.500 (sem imposto) − custo 3.754" e a etiqueta "sem imposto" no quadro', () => {
    mount({ noTax: { 'Caerleon|order': true } });
    expect(bestBox()).toContain('746');
    expect(bestBox()).toContain('Venda líquida 4.500 (sem imposto) − custo 3.754');
    expect(document.querySelector('.result small.good').textContent).toBe('sem imposto');
  });
  it('marca em OUTRA saída que não é a melhor (Lymhurst|order, com Caerleon melhor): o quadro continua sem "sem imposto"', () => {
    mount({ noTax: { 'Lymhurst|order': true } }, { Caerleon: { s: 4500 }, Lymhurst: { s: 4000 } });
    expect(bestBox()).toContain('Caerleon');
    expect(bestBox()).toContain('453');
    expect(bestBox()).not.toContain('sem imposto');
  });
  it('a nota da tabela de saídas diz que a marca vale para todos os itens e fica salva por cidade e modo, não por item', () => {
    mount();
    expect(document.body.textContent).toContain('A marca vale para todos os itens: fica salva por cidade e modo de venda, não por item.');
  });
});
