// IDEIA-012: selo de confiança nas células da tabela de preços por cidade (side "cost").
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { mkPrices } from '../test/helpers';
import { resetApp, freezeNow } from '../test/ui';
import PriceMatrix from './PriceMatrix';

const NOW = Date.UTC(2026, 9, 26, 12);
const H = 3600000;
let restore;
beforeEach(() => {
  resetApp();
  restore = freezeNow('2026-10-26T12:00:00Z');
});
afterEach(() => restore());

const mount = (cells, extra = {}) =>
  render(<PriceMatrix title="Preços" prices={mkPrices({ T4_METALBAR: cells })} mids={['T4_METALBAR']} used={new Set()} useOrders={false} targetMid="T4_SWORD" {...extra} />);
const cell = (city) => {
  const idx = [...document.querySelectorAll('th')].findIndex((th) => th.textContent === city);
  return document.querySelector('tbody tr').children[idx];
};

describe('PriceMatrix: selo de confiança (012)', () => {
  it('sem histórico: dado fresco não ganha selo; 30 h = "confira"; 80 h = "desconfie"; a dica cita a regra do app e o histórico não carregado', () => {
    mount({ Lymhurst: { s: 200, sd: NOW - H }, Martlock: { s: 210, sd: NOW - 30 * H }, Thetford: { s: 220, sd: NOW - 80 * H } });
    expect(cell('Lymhurst').querySelector('[data-testid="confidence-seal"]')).toBeNull();
    expect(cell('Martlock').textContent).toContain('confira');
    expect(cell('Thetford').textContent).toContain('desconfie');
    expect(document.querySelector('p.hint').textContent).toContain('regra do app, não dado do jogo');
    expect(document.querySelector('p.hint').textContent).toContain('Histórico não carregado: sem verificação de outlier');
  });
  it('preço sem data: desconfie; célula sem preço: sem selo', () => {
    mount({ Lymhurst: { s: 200 } });
    expect(cell('Lymhurst').textContent).toContain('desconfie');
    expect(cell('Martlock').querySelector('[data-testid="confidence-seal"]')).toBeNull();
  });
  it('com histórico do item na própria linha: preço 1 contra mediana 4.000 = desconfie', () => {
    const day = Date.UTC(2026, 9, 26);
    const history = { T4_METALBAR: { Lymhurst: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ t: day - (7 - i) * 86400000, n: 10, p: 4000 })) } };
    mount({ Lymhurst: { s: 1, sd: NOW - H } }, { history, now: NOW });
    expect(cell('Lymhurst').textContent).toContain('desconfie');
    expect(document.querySelector('p.hint').textContent).not.toContain('Histórico não carregado');
  });
});
