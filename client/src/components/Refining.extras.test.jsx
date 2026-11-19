// IDEIA-048 na tela de Refino: despesas por unidade/lote e interruptor único "Venda sem imposto".
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { mkPrices, planksSpec } from '../test/helpers';
import { resetApp, seed, pricesHook } from '../test/ui';

const { priceHook } = vi.hoisted(() => ({ priceHook: vi.fn() }));
vi.mock('../lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook }));

import Refining from './Refining';

// Cenário A (001/019): T4 tábua custa 61,4734; venda no Mercado Negro a 140 (instantânea): lucro 72,93
const cfgBase = (over = {}) => ({
  type: 'PLANKS', tier: 4, ench: 0, buyCity: 'best', refineCity: 'Fort Sterling', sellCity: 'best',
  focus: false, daily: 0, feePer100: 400, customRRR: '', useOrders: false, route: 'best', sellMode: 'order', qty: 100,
  ...over,
});

beforeEach(resetApp);

function mount(cfg = {}) {
  seed('refine:cfg', cfgBase(cfg));
  priceHook.mockReturnValue(pricesHook(mkPrices(planksSpec({ T4_PLANKS: { 'Fort Sterling': { s: 120 }, Martlock: { s: 135 }, 'Black Market': { b: 140 } } }))));
  return render(<Refining />);
}
const saved = () => JSON.parse(localStorage.getItem('albion:refine:cfg'));
const kv = (label) => screen.getByText(label).closest('.kv').textContent;

const targetBig = () => screen.getByText('Liste a').parentElement.querySelector('.big').textContent;
const bestRouteRow = () => screen.getByText(/^Melhor rota/, { selector: 'h2' }).closest('.card').querySelector('tr.best');

describe('Refining: mutantes sobreviventes da 048 (D5, 076)', () => {
  it('mutante 40: o Preço-alvo inclui as despesas: 10 por unidade -> 1.146; sem despesas 1.136', () => {
    const { unmount } = mount({ extras: [{ name: '', value: '10', scope: 'craft' }] });
    expect(targetBig()).toBe('1.146'); // (61,4734 + 10 + 1.000) ÷ 0,935
    unmount();
    mount();
    expect(targetBig()).toBe('1.136'); // (61,4734 + 1.000) ÷ 0,935
  });
  it('mutante 41: a tabela de rotas desconta as despesas: lucro/un. da melhor rota +63 (sem despesas +73)', () => {
    const { unmount } = mount({ extras: [{ name: '', value: '10', scope: 'craft' }] });
    const cell = () => bestRouteRow().querySelectorAll('td')[2].textContent;
    expect(cell()).toContain('+63');
    expect(cell()).not.toContain('73');
    unmount();
    mount();
    expect(cell()).toContain('+73');
  });
});

describe('Refining: despesas extras e venda sem imposto (048)', () => {
  it('sem despesas: lucro por unidade +73 e sem linha de despesas', () => {
    mount();
    expect(kv('Lucro por unidade')).toContain('73');
    expect(screen.queryByText('Despesas extras (por unidade)')).toBeNull();
  });
  it('10 por unidade: lucro por unidade +63 e custo líquido 71 (61,47 + 10)', () => {
    mount({ extras: [{ name: '', value: '10', scope: 'craft' }] });
    expect(kv('Lucro por unidade')).toContain('63');
    expect(kv('Despesas extras (por unidade)')).toContain('10');
    expect(kv('Custo líquido')).toContain('71');
  });
  it('lote de 100 em 100 unidades = 1 por unidade; lucro total reflete as despesas', () => {
    mount({ extras: [{ name: '', value: '100', scope: 'lote' }] });
    expect(kv('Despesas extras (por unidade)')).toContain('1');
    expect(kv('Lucro total')).toContain('7.193'); // (72,9266 − 1) × 100 = 7.192,66
  });
  it('interruptor: marca grava Refino|order e o líquido sobe para 140 (sem os 4%)', () => {
    mount();
    expect(kv('Líquido após impostos')).toContain('134');
    fireEvent.click(screen.getByRole('checkbox', { name: /Venda sem imposto/ }));
    expect(saved().noTax).toEqual({ 'Refino|order': true });
    expect(kv('Líquido após impostos')).toContain('140');
    expect(kv('Lucro por unidade')).toContain('79'); // 78,53
  });
  it('estado salvo antigo (sem extras/noTax) renderiza normalmente', () => {
    mount();
    expect(screen.getByRole('button', { name: 'Adicionar despesa' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: /Venda sem imposto/ }).checked).toBe(false);
  });
  it('despesa negativa: aviso, selo e lucro sem a despesa', () => {
    mount({ extras: [{ name: '', value: '-5', scope: 'craft' }] });
    expect(document.body.textContent).toContain('Despesa 1: valor -5 é negativo: usando 0.');
    expect(kv('Lucro por unidade')).toContain('73');
  });
});
