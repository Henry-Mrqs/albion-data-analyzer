// IDEIA-059: cartão de atualizações da ordem de venda (apresentação).
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { resetApp } from '../test/ui';
import OrderLifeCard from './OrderLifeCard';

beforeEach(resetApp);
const mount = (over = {}) => render(<OrderLifeCard cfg={{}} set={() => {}} issues={[]} applies listings={1} setupTotal={0} relistCost={0} {...over} />);
const text = () => document.body.textContent;

describe('OrderLifeCard (059)', () => {
  it('mostra os 3 campos, o escopo e o rodapé honesto; a base NÃO é apresentada como fato', () => {
    mount();
    expect(text()).toContain('Atualizações da ordem (relistagens)');
    expect(text()).toContain('Queda de preço por atualização (prata)');
    expect(text()).toContain('Base da taxa na atualização');
    expect(text()).toContain('NÃO foi confirmado');
    expect(text()).toContain('Não considera a duração/expiração da ordem');
    expect(text()).toContain('não vale para ordem de compra na hora');
    expect(document.querySelector('[data-testid="order-life-summary"]')).toBeNull();
  });
  it('applies false com atualizações: "não se aplicam"; applies true: 4 listagens e 448,50', () => {
    const { unmount } = mount({ applies: false, listings: 4 });
    expect(text()).toContain('A melhor saída não é uma ordem de venda com imposto');
    unmount();
    mount({ listings: 4, setupTotal: 448.5, relistCost: 336.75 });
    expect(text()).toContain('4 listagens: taxa de criação acumulada 448,50 no lote, dos quais 336,75 são das atualizações.');
  });
});
