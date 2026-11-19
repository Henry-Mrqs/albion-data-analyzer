// IDEIA-005 Task 4: cartão "Variáveis deste cálculo" na aba RRR.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { resetApp, seed } from '../test/ui';
import { SAVED_STATES } from '../test/savedStates';

const { audit } = vi.hoisted(() => ({ audit: { off: false } }));
vi.mock('../lib/audit/rrr', async (orig) => {
  const m = await orig();
  return { ...m, auditRrr: (input) => (audit.off ? null : m.auditRrr(input)) };
});

import RrrCalculator from './RrrCalculator';
import ErrorBoundary from './ErrorBoundary';

const cfgBase = (over = {}) => ({ kind: 'craft', city: 'Lymhurst', category: 'sword', resource: 'PLANKS', focus: false, daily: 0, item: null, crafts: 100, ...over });

beforeEach(() => {
  resetApp();
  audit.off = false;
});

function mount(cfg = {}, { rawCfg } = {}) {
  seed('rrr:cfg', rawCfg ?? cfgBase(cfg));
  return render(
    <ErrorBoundary>
      <RrrCalculator />
    </ErrorBoundary>,
  );
}

const card = () => screen.getByTestId('var-audit');
const rowEl = (id) => within(card()).getAllByTestId('audit-row').find((e) => e.dataset.rowId === id);
const ERRO = /Algo deu errado ao mostrar esta tela/;
const outside = (container) => {
  const clone = container.cloneNode(true);
  clone.querySelector('[data-testid="var-audit"]')?.remove();
  return clone.textContent;
};

describe('RrrCalculator: cartão Variáveis deste cálculo', () => {
  it('craft em Lymhurst (espada): recolhido; RRR 24,81% (PB 33); a categoria vem do jogo; a aba não calcula taxa, preço nem imposto', () => {
    mount();
    expect(card().open).toBe(false);
    expect(screen.getByTestId('var-audit-summary').textContent).toMatch(/aplicadas · \d+ não confirmadas · \d+ velhas\/expiradas · \d+ não consideradas/);
    expect(rowEl('rrr-final').textContent).toContain('24,81%');
    expect(screen.getAllByText('24,81%', { exact: false }).length).toBeGreaterThan(0);
    expect(rowEl('category').textContent).toContain('jogo');
    expect(rowEl('out-of-scope').textContent).toContain('não considera taxa, preços nem imposto');
    expect(rowEl('daily').textContent).toContain('+10/+20');
  });

  it('trocar a cidade muda a linha de especialização (+15 aplicada → sem especialização) e o RRR', () => {
    mount();
    expect(rowEl('specialty').textContent).toContain('especialização aplicada');
    fireEvent.change(screen.getByDisplayValue('Lymhurst (bônus)'), { target: { value: 'Fort Sterling' } });
    expect(rowEl('specialty').textContent).toContain('sem especialização');
    expect(rowEl('rrr-final').textContent).toContain('15,25%');
  });

  it('foco e diário 20: RRR 52,83% e a DAILY_NOTE (categoria não confirmada) na linha do diário', () => {
    mount({ focus: true, daily: 20 });
    expect(rowEl('rrr-final').textContent).toContain('52,83%');
    expect(rowEl('daily').textContent).toContain('ainda não foi confirmada em fonte oficial');
  });

  it.each(SAVED_STATES.filter((s) => s.key === 'rrr:cfg').map((s) => [`${s.commit}: ${s.note}`, s.saved]))('estado antigo salvo (%s): renderiza sem limite de erro', (_n, saved) => {
    mount({}, { rawCfg: saved });
    expect(card()).toBeTruthy();
    expect(screen.queryByText(ERRO)).toBeNull();
  });

  it('estado corrompido (campos lixo): renderiza sem eco de objeto e sem limite de erro', () => {
    mount({}, { rawCfg: { kind: 'xx', city: 5, category: {}, resource: [], focus: 'sim', daily: {}, item: 'lixo', crafts: [] } });
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
