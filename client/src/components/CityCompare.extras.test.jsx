// IDEIA-076 (D4): "Comparar cidades de craft" mostra as despesas extras no custo total e explica o "Sem imposto".
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { resetApp } from '../test/ui';
import CityCompare from './CityCompare';

beforeEach(resetApp);

// exemplo do laudo: material 4.511 + taxa 432 + despesas 420 (120 × 3 crafts + 60 por lote) = 5.363
const row = (over = {}) => ({
  city: 'Fort Sterling', isBonus: false, specialty: false, rrr: 0.15, matCost: 4511, fee: 432, extras: 420, totalCost: 5363, unitCost: 1787.67,
  complete: true, missing: [], feeSource: 'general', deltaVsBonus: 0, deltaVsBest: 0, ...over,
});
const incomplete = (over = {}) => row({ city: 'Caerleon', matCost: null, totalCost: null, unitCost: null, complete: false, missing: ['T4_LEATHER'], deltaVsBonus: null, ...over });
function mount(rows, over = {}) {
  const result = { rows, best: rows.find((r) => r.complete) ?? null, spread: null, issues: [] };
  return render(
    <CityCompare result={result} scenario="own" onScenario={() => {}} feeByCity={{}} onFee={() => {}} general={{ value: 500, touched: true }} units={3} {...over} />,
  );
}
const cells = (tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent);
const headers = () => [...document.querySelectorAll('th')].map((th) => th.textContent);
const rowOf = (city) => [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.startsWith(city));

describe('CityCompare: despesas extras (076)', () => {
  it('com despesas > 0: cabeçalho "Despesas" e a célula mostra 420; a linha soma 4.511 + 432 + 420 = 5.363', () => {
    mount([row()]);
    const h = headers();
    expect(h.indexOf('Despesas')).toBe(h.indexOf('Taxa (por 100)') + 1); // IDEIA-073: Custo total passou para antes do Material
    expect(h.indexOf('Custo total')).toBeLessThan(h.indexOf('Material'));
    const c = cells(rowOf('Fort Sterling'));
    expect(c[h.indexOf('Despesas')]).toBe('420');
    expect(c[h.indexOf('Material')]).toBe('4.511');
    expect(c[h.indexOf('Custo total')]).toBe('5.363');
    expect(4511 + 432 + 420).toBe(5363);
  });
  it('a nota diz "Custo total = material + taxa da bancada + despesas extras" e que a despesa é a mesma em todas as cidades', () => {
    mount([row()]);
    const t = document.body.textContent;
    expect(t).toContain('Custo total = material + taxa da bancada + despesas extras.');
    expect(t).toContain('As despesas são as mesmas em todas as cidades, então não mudam qual é a mais barata.');
  });
  it('sem despesas (extras 0 em todas): nenhuma coluna "Despesas" e nenhuma nota de despesas (tabela como antes)', () => {
    mount([row({ extras: 0 }), incomplete({ extras: 0 })]);
    expect(headers()).not.toContain('Despesas');
    expect(document.body.textContent).not.toContain('despesas extras');
    expect(rowOf('Fort Sterling').querySelectorAll('td')).toHaveLength(headers().length);
  });
  it('linha incompleta (sem preço): a célula de despesas mostra "—", como o custo total', () => {
    mount([row(), incomplete({ extras: 420 })]);
    const h = headers();
    const c = cells(rowOf('Caerleon'));
    expect(c[h.indexOf('Despesas')]).toBe('—');
    expect(c[h.indexOf('Custo total')]).toBe('—');
  });
  it('a nota sobre o "Sem imposto": só afeta a venda; não entra nesta comparação (com e sem despesas)', () => {
    for (const extras of [420, 0]) {
      document.body.innerHTML = '';
      mount([row({ extras })]);
      expect(document.body.textContent).toContain('O interruptor “Sem imposto” só afeta a venda; não entra nesta comparação.');
    }
  });
  it('texto antigo "Compara só o custo de produzir; não inclui transporte" continua presente', () => {
    mount([row()]);
    expect(document.body.textContent).toContain('Compara só o custo de produzir; não inclui transporte');
  });
  it('rótulo da taxa (D-056): fee 648 (3 crafts × 216) mostra "648 no lote" e NÃO "por craft"; fee 216 com 1 craft mostra "216 no lote"', () => {
    mount([row({ fee: 648 })], { units: 3 });
    expect(rowOf('Fort Sterling').textContent).toContain('648 no lote');
    expect(document.body.textContent).not.toContain('por craft');
    document.body.innerHTML = '';
    mount([row({ fee: 216, extras: 0 })], { units: 1 });
    expect(rowOf('Fort Sterling').textContent).toContain('216 no lote');
  });
});
