// IDEIA-059 na tela de Craft: cartão "Ordem de venda: atualizações", líquido e estresse concordam.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

function mount(cfg = {}, rawCfg) {
  seed('craft:item', { id: 'T4_MAIN_SWORD', ench: 0 });
  seed('craft:cfg', rawCfg ?? craftCfg({ specialty: true, feePer100: 500, refine: BUY, ...cfg }));
  priceHook.mockReturnValue(pricesHook(mkPrices({ T4_METALBAR: 200, T4_LEATHER: 150, T4_MAIN_SWORD: { Caerleon: { s: 4470 } } })));
  return render(<Crafting />);
}
const saved = () => JSON.parse(localStorage.getItem('albion:craft:cfg'));
const num = (s) => Number(s.replace(/[^\d,-]/g, '').replace(',', '.'));
const netCell = () => document.querySelector('tbody tr.best td:nth-child(3)').textContent;
const profitCell = () => document.querySelector('tbody tr.best td:nth-child(4)').textContent;
const stressCenter = () => num(screen.getByTestId('stress-center').textContent);
const summary = () => screen.queryByTestId('order-life-summary')?.textContent ?? '';
const field = (label) => screen.getByText(label).parentElement.querySelector('input,select');

describe('Crafting: atualizações da ordem de venda (059)', () => {
  it('estado antigo (sem os campos): cartão presente, sem resumo nem aviso; líquido = 4.470 × 0,935 = 4.179', () => {
    mount();
    expect(screen.getByTestId('order-life')).toBeTruthy();
    expect(summary()).toBe('');
    expect(netCell()).toContain('4.179');
    expect(document.body.textContent).not.toContain('desconta 0 atualização');
  });
  it('3 atualizações, queda 10: grava os campos, líquido 3.843, resumo 4 listagens e nota; estresse = lucro da tela', () => {
    mount();
    const lucro0 = num(profitCell());
    fireEvent.change(field('Atualizações da ordem (relistagens)'), { target: { value: '3' } });
    fireEvent.change(field('Queda de preço por atualização (prata)'), { target: { value: '10' } });
    expect(saved()).toMatchObject({ relists: '3', relistStep: '10' });
    expect(netCell()).toContain('3.843');
    expect(num(profitCell())).toBeCloseTo(lucro0 - 336.75, 0);
    expect(summary()).toContain('4 listagens');
    expect(summary()).toContain('448,50');
    expect(document.body.textContent).toContain('já desconta 3 atualização(ões) da ordem');
    expect(stressCenter()).toBeCloseTo(num(profitCell()), 0);
  });
  it('base "diferença" grava relistBase e o líquido sobe (extra 1,50 contra 336,75)', () => {
    mount({ relists: '3', relistStep: '10' });
    expect(netCell()).toContain('3.843');
    fireEvent.change(field('Base da taxa na atualização'), { target: { value: 'diff' } });
    expect(saved().relistBase).toBe('diff');
    expect(netCell()).toContain('4.178'); // 4.179,45 − 1,50
  });
  it('Sem imposto na saída: o resumo vira "não se aplicam" e o líquido volta a 4.470', () => {
    mount({ relists: '3', relistStep: '10', noTax: { 'Caerleon|order': true } });
    expect(summary()).toContain('não se aplicam');
    expect(netCell()).toContain('4.470');
  });
  it('estado corrompido: "abc" avisa e usa 0; relistBase "foo" não derruba; 100 avisa o máximo 37', () => {
    const { unmount } = mount({ relists: 'abc' });
    expect(document.body.textContent).toContain('Relistagens "abc" inválidas: usando 0.');
    expect(netCell()).toContain('4.179');
    unmount();
    mount({ relistBase: 'foo' });
    expect(screen.getByTestId('order-life')).toBeTruthy();
  });
  it('relists 100: aviso de máximo 37 sob o campo', () => {
    mount({ relists: '100' });
    expect(document.body.textContent).toContain('acima do máximo de 37');
  });
  it('o Preço-alvo não muda com as atualizações do Craft', () => {
    mount();
    const a = screen.getByText('Liste a').parentElement.querySelector('.big').textContent;
    fireEvent.change(field('Atualizações da ordem (relistagens)'), { target: { value: '3' } });
    expect(screen.getByText('Liste a').parentElement.querySelector('.big').textContent).toBe(a);
  });
});
