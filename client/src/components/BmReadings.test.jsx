// IDEIA-088: cartão das duas leituras do Mercado Negro. Só apresenta; as contas vêm de lib/blackMarket.js e econ.js.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { bmReadings } from '../lib/blackMarket';
import BmReadings from './BmReadings';

const NOW = Date.now();
const mk = (s, b) => bmReadings({ X: { 'Black Market': { 1: { s, b, sd: NOW - 3600000, bd: NOW - 3600000 } } } }, 'X', { now: NOW });
const COST = 3524.27;
const text = () => document.body.textContent;

describe('BmReadings', () => {
  it('o achado (2.607 x 10.854): as duas linhas rotuladas, líquidos e lucros, a frase de lado seguro e o alerta de divergência', () => {
    render(<BmReadings readings={mk(10854, 2607)} cost={COST} premium median7d={10662} />);
    expect(text()).toContain('Mercado Negro: ordem de compra (buy_price_max) · NÃO VERIFICADO em jogo');
    expect(text()).toContain('Mercado Negro: preço de lista (sell_price_min) · NÃO VERIFICADO em jogo');
    expect(text()).toContain('2.607 → líquido 2.503, lucro -1.022');
    expect(text()).toContain('10.854 → líquido 10.420, lucro +6.896');
    expect(text()).toContain('O app não sabe qual dos dois você recebe. O cálculo principal usa o menor (lado seguro).');
    expect(text()).toContain('mediana 10.662) está perto do preço de lista');
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(text()).not.toMatch(/o correto é|é o certo|vale a pena/i);
  });

  it('sem a mediana do histórico a frase do histórico não aparece', () => {
    render(<BmReadings readings={mk(10854, 2607)} cost={COST} premium />);
    expect(text()).not.toContain('histórico dos últimos 7 dias');
  });

  it('sem divergência (razão 1,4): sem alerta, mas as duas linhas continuam', () => {
    render(<BmReadings readings={mk(14000, 10000)} cost={COST} premium />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(text()).toContain('preço de lista');
  });

  it('uma leitura só: aviso curto com NÃO VERIFICADO', () => {
    render(<BmReadings readings={mk(0, 2607)} cost={COST} premium />);
    expect(text()).toContain('uma leitura só (ordem de compra)');
    expect(text()).toContain('NÃO VERIFICADO em jogo');
  });

  it('sem nenhuma leitura não mostra nada; sem custo completo mostra os preços sem lucro', () => {
    const { container } = render(<BmReadings readings={mk(0, 0)} cost={COST} premium />);
    expect(container.textContent).toBe('');
    render(<BmReadings readings={mk(10854, 2607)} cost={null} premium />);
    expect(text()).toContain('sem custo completo');
  });
});
