// IDEIA-005 Task 4: cartão "Variáveis deste cálculo" no Refino (cenário A: tábua T4, custo 61,4734; venda Martlock 135 em ordem).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { mkPrices, planksSpec } from '../test/helpers';
import { resetApp, seed, pricesHook } from '../test/ui';
import { SAVED_STATES } from '../test/savedStates';

const { priceHook, audit } = vi.hoisted(() => ({ priceHook: vi.fn(), audit: { off: false } }));
vi.mock('../lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook }));
vi.mock('../lib/audit/refine', async (orig) => {
  const m = await orig();
  return { ...m, auditRefine: (input) => (audit.off ? null : m.auditRefine(input)) };
});

import Refining from './Refining';
import ErrorBoundary from './ErrorBoundary';

const cfgBase = (over = {}) => ({
  type: 'PLANKS', tier: 4, ench: 0, buyCity: 'best', refineCity: 'Fort Sterling', sellCity: 'Martlock',
  focus: false, daily: 0, feePer100: 400, customRRR: '', useOrders: false, route: 'best', sellMode: 'order', qty: 100,
  ...over,
});

beforeEach(() => {
  resetApp();
  audit.off = false;
});

function mount(cfg = {}, { rawCfg, prices = true } = {}) {
  seed('refine:cfg', rawCfg ?? cfgBase(cfg));
  priceHook.mockReturnValue(pricesHook(prices ? mkPrices(planksSpec({ T4_PLANKS: { 'Fort Sterling': { s: 120 }, Martlock: { s: 135 }, 'Black Market': { b: 140 } } })) : null));
  return render(
    <ErrorBoundary>
      <Refining />
    </ErrorBoundary>,
  );
}

const card = () => screen.getByTestId('var-audit');
const rowEl = (id) => within(card()).getAllByTestId('audit-row').find((e) => e.dataset.rowId === id);
const head = () => screen.getByTestId('var-audit-summary').textContent;
const ERRO = /Algo deu errado ao mostrar esta tela/;
const outside = (container) => {
  const clone = container.cloneNode(true);
  clone.querySelector('[data-testid="var-audit"]')?.remove();
  return clone.textContent;
};

describe('Refining: cartão Variáveis deste cálculo', () => {
  it('cenário A: recolhido, taxa 400 não confirmada, NÃO consideradas do Refino e linhas do inventário', () => {
    mount();
    expect(card().open).toBe(false);
    expect(head()).toMatch(/\d+ aplicadas · [1-9]\d* não confirmadas · \d+ velhas\/expiradas · [1-9]\d* não consideradas/);
    expect(rowEl('bench-fee').textContent).toContain('padrão não confirmado');
    const n = (label) => +new RegExp(`(\\d+) ${label}`).exec(head())[1];
    expect(n('aplicadas')).toBe(card().querySelectorAll('[data-status="applied"]').length);
    expect(n('não consideradas')).toBe(card().querySelectorAll('[data-status="not-considered"]').length);
    for (const id of ['specialty', 'rrr-final', 'daily', 'route', 'exit', 'qty', 'no-tax', 'extras', 'nc-factionRecipe', 'nc-transportBuy', 'nc-relists', 'nc-quality', 'nc-journal']) {
      expect(rowEl(id), id).toBeTruthy();
    }
    expect(rowEl('nc-factionRecipe').textContent).toContain('NÃO considerada');
    expect(rowEl('nc-journal').textContent).toContain('Diário de ofício (journal)');
  });

  it('valores batem com a tela: RRR 36,71% (PB 58), saída Martlock 135, custo herdado pelo alvo 61', () => {
    mount();
    expect(screen.getAllByText('36.7%', { exact: false }).length).toBeGreaterThan(0);
    expect(rowEl('rrr-final').textContent).toContain('36,71%');
    expect(rowEl('exit').textContent).toContain('135');
    expect(rowEl('exit').textContent).toContain('Martlock');
    expect(rowEl('net-factor').textContent).toContain('0,935');
    expect(rowEl('target-inherits').textContent).toContain('61,47');
    expect(rowEl('qty').textContent).toContain('100');
  });

  it('trocar a cidade de refino muda a linha de especialização (+40 aplicada → sem especialização) e o RRR', () => {
    mount();
    expect(rowEl('specialty').textContent).toContain('especialização +40 aplicada');
    fireEvent.change(screen.getByDisplayValue('Fort Sterling (bônus)'), { target: { value: 'Martlock' } });
    expect(rowEl('specialty').textContent).toContain('sem especialização');
    expect(rowEl('rrr-final').textContent).toContain('15,25%');
  });

  it('sem preços: o cartão continua com as variáveis e as NÃO consideradas', () => {
    mount({}, { prices: false });
    expect(card()).toBeTruthy();
    expect(rowEl('nc-relists')).toBeTruthy();
    expect(rowEl('exit').textContent).toContain('NÃO considerada');
  });

  it.each(SAVED_STATES.filter((s) => s.key === 'refine:cfg').map((s) => [`${s.commit}: ${s.note}`, s.saved]))('estado antigo salvo (%s): renderiza sem limite de erro', (_n, saved) => {
    mount({}, { rawCfg: saved });
    expect(card()).toBeTruthy();
    expect(screen.queryByText(ERRO)).toBeNull();
  });

  it('estado corrompido (campos lixo): renderiza, sem eco de objeto, sem limite de erro', () => {
    mount({}, { rawCfg: { type: 'NADA', tier: 'x', feePer100: { a: 1 }, qty: null, daily: [], extras: 'lixo', noTax: 5, route: 9, sellMode: {}, refineCity: 7 } });
    expect(screen.queryByText(ERRO)).toBeNull();
    expect(card().textContent).not.toContain('[object');
  });

  it('o cartão não altera nenhum número da tela: texto fora do cartão igual com e sem o quadro', () => {
    const { container, unmount } = mount();
    const withCard = outside(container);
    unmount();
    audit.off = true;
    const off = mount();
    expect(screen.queryByTestId('var-audit')).toBeNull();
    expect(off.container.textContent).toBe(withCard);
  });
});
