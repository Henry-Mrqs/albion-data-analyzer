// IDEIA-005 Task 4: cartão "Variáveis deste cálculo" no Craft (espada T4, venda Caerleon 4.500, bancada 400 = padrão do app).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { mkPrices } from '../test/helpers';
import { resetApp, seed, craftCfg, freezeNow, pricesHook } from '../test/ui';
import { SAVED_STATES } from '../test/savedStates';

const { priceHook, histHook, audit } = vi.hoisted(() => ({ priceHook: vi.fn(), histHook: vi.fn(), audit: { off: false } }));
vi.mock('../lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook }));
vi.mock('../lib/history', async (orig) => ({ ...(await orig()), useHistory: histHook }));
// interruptor só para o teste diferencial: com `off`, o quadro some e a tela fica como era antes da IDEIA-005
vi.mock('../lib/audit/craft', async (orig) => {
  const m = await orig();
  return { ...m, auditCraft: (input) => (audit.off ? null : m.auditCraft(input)) };
});

import Crafting from './Crafting';
import ErrorBoundary from './ErrorBoundary';

const NOW = Date.parse('2026-11-19T12:00:00Z');
const H = 3600000;
const BUY = { METALBAR: 'buy', LEATHER: 'buy' };
let restore;

beforeEach(() => {
  resetApp();
  audit.off = false;
  restore = freezeNow('2026-11-19T12:00:00Z');
  histHook.mockReturnValue({ history: null, loading: false, error: null });
});
afterEach(() => restore());

const swordPrices = () =>
  mkPrices({
    T4_METALBAR: { 'Fort Sterling': { s: 200, b: 180, sd: NOW - 3 * H, bd: NOW - 3 * H } },
    T4_LEATHER: { 'Fort Sterling': { s: 150, b: 130, sd: NOW - 3 * H, bd: NOW - 3 * H } },
    T4_MAIN_SWORD: { Caerleon: { s: 4500, b: 4300, sd: NOW - 2 * H, bd: NOW - 2 * H } },
  });

function mount(cfg = {}, { rawCfg } = {}) {
  seed('craft:item', { id: 'T4_MAIN_SWORD', ench: 0 });
  seed('craft:cfg', rawCfg ?? craftCfg({ refine: BUY, ...cfg }));
  priceHook.mockReturnValue(pricesHook(swordPrices()));
  return render(
    <ErrorBoundary>
      <Crafting />
    </ErrorBoundary>,
  );
}

const card = () => screen.getByTestId('var-audit');
const rowEl = (id) => within(card()).getAllByTestId('audit-row').find((e) => e.dataset.rowId === id);
const head = () => screen.getByTestId('var-audit-summary').textContent;
const count = (label) => +new RegExp(`(\\d+) ${label}`).exec(head())[1];
const ERRO = /Algo deu errado ao mostrar esta tela/;
const feeInput = () => screen.getByText('Taxa da bancada (prata por 100 de nutrição)').parentElement.querySelector('input');
// texto da tela FORA do cartão
const outside = (container) => {
  const clone = container.cloneNode(true);
  clone.querySelector('[data-testid="var-audit"]')?.remove();
  return clone.textContent;
};

describe('Crafting: cartão Variáveis deste cálculo', () => {
  it('cfg padrão (espada T4, venda 4.500): recolhido, "não confirmadas" ≥ 1 (taxa 400) e a linha do diário de ofício (journal) é NÃO considerada', () => {
    mount();
    expect(card().open).toBe(false);
    expect(count('não confirmadas')).toBeGreaterThanOrEqual(1);
    expect(count('não consideradas')).toBeGreaterThanOrEqual(8);
    // as contagens do cabeçalho são as linhas que estão no cartão
    for (const [label, status] of [['aplicadas', 'applied'], ['não confirmadas', 'unconfirmed'], ['velhas/expiradas', 'stale'], ['não consideradas', 'not-considered']]) {
      expect(count(label), label).toBe(card().querySelectorAll(`[data-status="${status}"]`).length);
    }
    expect(rowEl('bench-fee').textContent).toContain('padrão não confirmado');
    expect(rowEl('bench-fee').textContent).toContain('padrão do app');
    expect(rowEl('nc-journal').textContent).toContain('Diário de ofício (journal)');
    expect(rowEl('nc-journal').textContent).toContain('NÃO considerada');
    expect(screen.getByTestId('var-audit-note').textContent).toContain('o diário de ofício (journal) não é modelado');
  });

  it('valores batem com a tela: RRR 24,81%, taxa cobrada 173, saída 4.500, imposto 4% e fator 0,935', () => {
    mount();
    expect(screen.getAllByText('24.8%', { exact: false }).length).toBeGreaterThan(0);
    expect(rowEl('rrr-final').textContent).toContain('24,81%');
    expect(rowEl('bench-fee-paid').textContent).toContain('173');
    expect(rowEl('exit').textContent).toContain('4.500');
    expect(rowEl('exit').textContent).toContain('Caerleon');
    expect(rowEl('sales-tax').textContent).toContain('4%');
    expect(rowEl('net-factor').textContent).toContain('0,935');
    expect(rowEl('price-T4_METALBAR').textContent).toContain('200');
  });

  it('digitar a taxa 500: a linha muda de "padrão não confirmado" para "digitado" e a contagem de não confirmadas cai', () => {
    mount();
    const before = count('não confirmadas');
    fireEvent.change(feeInput(), { target: { value: '500' } });
    expect(rowEl('bench-fee').textContent).toContain('digitado');
    expect(rowEl('bench-fee').textContent).not.toContain('padrão não confirmado');
    expect(rowEl('bench-fee').textContent).toContain('500');
    expect(count('não confirmadas')).toBe(before - 1);
    // o custo da tela mudou junto (taxa 500 → 216): o quadro lê o mesmo cálculo
    expect(rowEl('bench-fee-paid').textContent).toContain('216');
  });

  it('marcar "sem imposto" na saída: a linha da taxa de criação vira "não cobrada"', () => {
    mount();
    expect(rowEl('setup-fee').textContent).toContain('2,5%');
    fireEvent.click(screen.getByLabelText('Sem imposto: Caerleon, Ordem de venda'));
    expect(rowEl('setup-fee').textContent).toContain('não cobrada (venda sem imposto)');
    expect(rowEl('net-factor').textContent).toContain('1');
    expect(rowEl('no-tax').textContent).toContain('sim');
  });

  it('bônus diário expirado (informado antes do reset): linha "expirado" e contagem de velhas ≥ 1, valor usado 0', () => {
    mount({ craftDaily: 20, craftDailyAt: Date.parse('2026-11-19T09:00:00Z') });
    expect(rowEl('daily').textContent).toContain('expirado');
    expect(rowEl('daily').textContent).toContain('digitado 20');
    expect(count('velhas/expiradas')).toBeGreaterThanOrEqual(1);
  });

  it('seções Preço-alvo, Estresse e Comparar cidades: venda sem imposto no alvo é NÃO considerada', () => {
    mount();
    // desde a IDEIA-075 o alvo respeita "Sem imposto": informativa sem marca, "considerada" com a melhor saída marcada
    expect(rowEl('target-notax').textContent).toContain('só se a melhor saída');
    expect(rowEl('target-notax').textContent).not.toContain('NÃO considerada');
    fireEvent.click(screen.getByLabelText('Sem imposto: Caerleon, Ordem de venda'));
    expect(rowEl('target-notax').textContent).toContain('considerada');
    expect(rowEl('target-notax').textContent).toContain('ordem de venda (Caerleon)');
    expect(rowEl('stress-steps').textContent).toContain('±5% a ±20%');
    expect(rowEl('compare-rrr')).toBeTruthy();
    expect(within(card()).getAllByText('Preço-alvo').length).toBeGreaterThan(0);
  });

  it('RRR manual preenchido aparece como "ignorado" na comparação de cidades', () => {
    mount({ customRRR: '30' });
    expect(rowEl('compare-rrr').textContent).toContain('ignorado');
    expect(rowEl('compare-rrr').textContent).toContain('NÃO considerada');
  });

  it.each(SAVED_STATES.filter((s) => s.key === 'craft:cfg').map((s) => [`${s.commit}: ${s.note}`, s.saved]))('estado antigo salvo (%s): o cartão renderiza e o limite de erro não aparece', (_n, saved) => {
    mount({}, { rawCfg: saved });
    expect(card()).toBeTruthy();
    expect(screen.queryByText(ERRO)).toBeNull();
  });

  it('estado corrompido (campos lixo): o cartão renderiza, sem eco de objeto, e o limite de erro NÃO aparece', () => {
    mount({}, { rawCfg: { feePer100: { x: 1 }, crafts: 'abc', focus: 'sim', refine: 5, extras: 'lixo', noTax: [], craftDaily: {}, craftDailyAt: 'ontem', waitCost: [], share: {}, matCity: 7 } });
    expect(card()).toBeTruthy();
    expect(screen.queryByText(ERRO)).toBeNull();
    expect(card().textContent).not.toContain('[object');
  });

  it('o cartão não altera nenhum número da tela: texto fora do cartão igual com e sem o quadro', () => {
    const { container, unmount } = mount();
    const withCard = outside(container);
    expect(card()).toBeTruthy();
    unmount();
    audit.off = true;
    const off = mount();
    expect(screen.queryByTestId('var-audit')).toBeNull();
    expect(off.container.textContent).toBe(withCard);
  });
});
