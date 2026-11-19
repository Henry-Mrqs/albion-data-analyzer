// IDEIA-048 na tela de Craft: despesas extras e coluna "Sem imposto" (dossiê §4: espada T4, bancada 216).
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

beforeEach(() => {
  resetApp();
  histHook.mockReturnValue({ history: null, loading: false, error: null });
});

function mount(cfg = {}, sword = { Caerleon: { s: 4500 } }) {
  seed('craft:item', { id: 'T4_MAIN_SWORD', ench: 0 });
  seed('craft:cfg', craftCfg({ specialty: true, feePer100: 500, refine: BUY, ...cfg }));
  priceHook.mockReturnValue(pricesHook(mkPrices({ T4_METALBAR: 200, T4_LEATHER: 150, T4_MAIN_SWORD: sword })));
  return render(<Crafting />);
}
const saved = () => JSON.parse(localStorage.getItem('albion:craft:cfg'));
const totalRow = () => screen.getAllByText('Custo total', { selector: 'strong' })[0].closest('tr').textContent;
const bestBox = () => document.querySelector('.result').textContent;

describe('Crafting: despesas extras (048)', () => {
  it('sem despesas: sem linha "Despesas extras" na tabela, custo 3.524 e lucro +683', () => {
    mount();
    expect(screen.queryByText('Despesas extras', { selector: 'td' })).toBeNull();
    expect(totalRow()).toContain('3.524');
    expect(bestBox()).toContain('683');
  });
  it('com 150 + 80 por craft: linha Despesas extras 230, custo 3.754 e lucro 453 (dossiê §4)', () => {
    mount({ extras: L });
    expect(screen.getAllByText('Despesas extras', { selector: 'td' }).length).toBeGreaterThanOrEqual(1);
    expect(totalRow()).toContain('3.754');
    expect(bestBox()).toContain('453');
    expect(document.body.textContent).toContain('Despesas: 230 por craft (230 no lote de 1)');
  });
  it('adicionar despesa pela tela grava em craft:cfg e recarregar mantém a lista', () => {
    const { unmount } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar despesa' }));
    fireEvent.change(screen.getByLabelText('Valor da despesa 1'), { target: { value: '230' } });
    expect(saved().extras).toEqual([{ name: '', value: '230', scope: 'craft' }]);
    expect(totalRow()).toContain('3.754');
    unmount();
    render(<Crafting />);
    expect(screen.getByLabelText('Valor da despesa 1').value).toBe('230');
  });
  it('estado salvo antigo sem extras/noTax renderiza normalmente', () => {
    mount();
    expect(saved().extras).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Adicionar despesa' })).toBeTruthy();
  });
  it('despesa negativa: aviso sob a linha, selo de valor corrigido e custo sem a despesa', () => {
    mount({ extras: [{ name: '', value: '-50', scope: 'craft' }] });
    expect(document.body.textContent).toContain('Despesa 1: valor -50 é negativo: usando 0.');
    expect(document.body.textContent).toContain('1 valor corrigido');
    expect(totalRow()).toContain('3.524');
  });
  it('lote ÷ unidades: 230 por lote em 10 crafts = 23 por craft (custo/un. 3.547)', () => {
    mount({ crafts: 10, extras: [{ name: '', value: '230', scope: 'lote' }] });
    expect(screen.getAllByText('Custo total', { selector: 'strong' })[0].closest('tr').textContent).toContain('3.547');
  });
});

describe('Crafting: coluna "Sem imposto" (048)', () => {
  it('marcar a linha grava a chave Cidade|modo, tira o imposto e a taxa de criação (líquido 4.500, lucro 975)', () => {
    mount();
    const box = screen.getByRole('checkbox', { name: /^Sem imposto: Caerleon/ });
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(saved().noTax).toEqual({ 'Caerleon|order': true });
    expect(screen.getByRole('checkbox', { name: /^Sem imposto: Caerleon/ }).checked).toBe(true);
    expect(screen.getByText('venda fora do mercado')).toBeTruthy();
    expect(bestBox()).toContain('4.500');
    expect(bestBox()).toContain('976'); // 4.500 − 3.524,27 = 975,73
  });
  it('a chave leva o modo: marcar a ordem de compra (instantânea) da mesma cidade grava só Caerleon|instant', () => {
    mount({}, { Caerleon: { s: 4500, b: 4000 } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sem imposto: Caerleon, Ordem de compra' }));
    expect(saved().noTax).toEqual({ 'Caerleon|instant': true });
    expect(screen.getByRole('checkbox', { name: 'Sem imposto: Caerleon, Ordem de venda' }).checked).toBe(false);
  });
  it('despesas + sem imposto: lucro 745,73 (dossiê §4)', () => {
    mount({ extras: L, noTax: { 'Caerleon|order': true } });
    expect(bestBox()).toContain('746');
  });
  it('desmarcar volta ao líquido com imposto', () => {
    mount({ noTax: { 'Caerleon|order': true } });
    fireEvent.click(screen.getByRole('checkbox', { name: /^Sem imposto: Caerleon/ }));
    expect(saved().noTax['Caerleon|order']).toBe(false);
    expect(bestBox()).toContain('683');
  });
});
