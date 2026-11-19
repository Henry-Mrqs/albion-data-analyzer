// IDEIA-005 Task 4: o cartão só apresenta (não calcula). Cabeçalho com contagens, recolhido por padrão, textos em português.
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { countRows, row } from '../lib/audit/core';
import { resetApp } from '../test/ui';
import VarAuditCard from './VarAuditCard';

beforeEach(resetApp);

const mk = (over) => row({ id: 'x', label: 'Algo', value: 1, unit: '', origin: 'user', status: 'applied', ...over });
const rows = [
  mk({ id: 'a1', label: 'Aplicada 1', value: 4500, unit: 'prata', origin: 'api', status: 'applied', date: Date.now() - 3600000 }),
  mk({ id: 'a2', label: 'Aplicada 2', value: 24.812, unit: '%', origin: 'derived', status: 'applied', source: 'RRR = PB ÷ (100 + PB) (alta)' }),
  mk({ id: 'a3', label: 'Aplicada 3', value: 18, unit: 'PB', origin: 'game', status: 'applied' }),
  mk({ id: 'u1', label: 'Taxa da bancada', value: 400, unit: 'prata', origin: 'app-default', status: 'unconfirmed', note: 'Padrão do app (400), NÃO confirmado' }),
  mk({ id: 's1', label: 'Bônus diário', value: 0, unit: 'PB', origin: 'user', status: 'stale', statusText: 'expirado', note: 'Usando 0' }),
  mk({ id: 'n1', label: 'Diário de ofício (journal)', value: 'não modelada', origin: 'app-default', status: 'not-considered' }),
  mk({ id: 'n2', label: 'Transporte', value: 'não modelada', origin: 'app-default', status: 'not-considered' }),
  mk({ id: 'i1', label: 'Giro', value: 'não informado', origin: 'user', status: 'info-only', section: 'Extras' }),
];
const audit = { screen: 't', rows, counts: countRows(rows) };

const card = () => screen.getByTestId('var-audit');
const rowEl = (id) => within(card()).getAllByTestId('audit-row').find((e) => e.dataset.rowId === id);

describe('VarAuditCard', () => {
  it('cabeçalho com as 4 contagens, sempre visível e fora do conteúdo recolhido', () => {
    render(<VarAuditCard audit={audit} />);
    expect(screen.getByText('Variáveis deste cálculo')).toBeTruthy();
    const head = screen.getByTestId('var-audit-summary').textContent;
    expect(head).toContain('3 aplicadas · 1 não confirmadas · 1 velhas/expiradas · 2 não consideradas');
  });

  it('recolhido por padrão; abre ao clicar no cabeçalho', () => {
    render(<VarAuditCard audit={audit} />);
    expect(card().open).toBe(false);
    fireEvent.click(screen.getByTestId('var-audit-summary'));
    expect(card().open).toBe(true);
  });

  it('abertas por padrão: não confirmada, velha e NÃO consideradas; as aplicadas ficam num <details> "Ver as 3 variáveis aplicadas"', () => {
    render(<VarAuditCard audit={audit} />);
    const appliedBox = screen.getByText('Ver as 3 variáveis aplicadas').closest('details');
    expect(appliedBox.open).toBe(false);
    for (const id of ['a1', 'a2', 'a3']) expect(appliedBox.contains(rowEl(id)), id).toBe(true);
    for (const id of ['u1', 's1', 'n1', 'n2']) expect(appliedBox.contains(rowEl(id)), id).toBe(false);
    // as abertas não estão dentro de nenhum <details> interno
    for (const id of ['u1', 's1', 'n1', 'n2']) expect(rowEl(id).closest('details'), id).toBe(card());
  });

  it('as informativas ficam em um <details> próprio, fora do grupo das aplicadas', () => {
    render(<VarAuditCard audit={audit} />);
    const box = screen.getByText('Ver a 1 variável informativa (não muda o lucro)').closest('details');
    expect(box.contains(rowEl('i1'))).toBe(true);
    expect(box.open).toBe(false);
    expect(screen.getByText('Ver as 3 variáveis aplicadas').closest('details').contains(rowEl('i1'))).toBe(false);
  });

  it('cada linha mostra origem e estado em português', () => {
    render(<VarAuditCard audit={audit} />);
    expect(rowEl('a1').textContent).toContain('API');
    expect(rowEl('a1').textContent).toContain('aplicada');
    expect(rowEl('a2').textContent).toContain('derivado');
    expect(rowEl('a3').textContent).toContain('jogo');
    expect(rowEl('u1').textContent).toContain('padrão do app');
    expect(rowEl('u1').textContent).toContain('padrão não confirmado');
    expect(rowEl('s1').textContent).toContain('digitado');
    expect(rowEl('s1').textContent).toContain('expirado'); // statusText troca o rótulo padrão
    expect(rowEl('n1').textContent).toContain('NÃO considerada');
    expect(rowEl('i1').textContent).toContain('informativa (não muda o lucro)');
    const all = card().textContent;
    for (const en of ['app-default', 'not-considered', 'unconfirmed', 'info-only', 'derived', 'user']) expect(all).not.toContain(en);
  });

  it('valores formatados em pt-BR com a unidade; fonte e nota aparecem; sem valor mostra traço', () => {
    render(<VarAuditCard audit={audit} />);
    expect(rowEl('a1').textContent).toContain('4.500');
    expect(rowEl('a2').textContent).toContain('24,81%');
    expect(rowEl('a2').textContent).toContain('RRR = PB ÷ (100 + PB) (alta)');
    expect(rowEl('a3').textContent).toContain('18 PB');
    expect(rowEl('u1').textContent).toContain('NÃO confirmado');
  });

  it('a nota fixa diz que o quadro não calcula e o que "bônus diário" e o journal são', () => {
    render(<VarAuditCard audit={audit} />);
    const note = screen.getByTestId('var-audit-note').textContent;
    expect(note).toContain('Este quadro só lê o que o cálculo usou; ele não calcula nada.');
    expect(note).toContain('+10/+20');
    expect(note).toContain('diário de ofício (journal) não é modelado');
  });

  it('seção: o nome aparece uma vez antes das linhas da seção', () => {
    render(<VarAuditCard audit={audit} />);
    expect(within(card()).getAllByText('Extras')).toHaveLength(1);
  });

  it('sem quadro (null/indefinido) ou sem linhas: não desenha nada', () => {
    const { container, rerender } = render(<VarAuditCard audit={null} />);
    expect(container.firstChild).toBeNull();
    rerender(<VarAuditCard audit={{ rows: [], counts: countRows([]) }} />);
    expect(container.firstChild).toBeNull();
    rerender(<VarAuditCard />);
    expect(container.firstChild).toBeNull();
  });

  it('sem linhas aplicadas, não mostra o bloco "Ver as 0 variáveis aplicadas"', () => {
    const only = [rows[3]];
    render(<VarAuditCard audit={{ rows: only, counts: countRows(only) }} />);
    expect(screen.queryByText(/variáveis aplicadas/)).toBeNull();
  });
});
