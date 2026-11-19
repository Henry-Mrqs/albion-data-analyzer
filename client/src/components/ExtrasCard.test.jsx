import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ExtrasCard from './ExtrasCard';
import { MAX_EXTRAS } from '../lib/extras';
import { validateExtras } from '../lib/inputRules';
import { resetApp } from '../test/ui';

beforeEach(resetApp);

const L = [{ name: 'Transporte', value: '150', scope: 'craft' }, { name: 'Comida de buff', value: '80', scope: 'craft' }];
const mount = (props = {}) => {
  const onChange = vi.fn();
  const view = render(<ExtrasCard list={[]} onChange={onChange} issues={[]} crafts={1} {...props} />);
  return { onChange, ...view };
};

describe('ExtrasCard (048)', () => {
  it('lista vazia: nenhuma linha, nenhum valor sugerido, botão de adicionar e o texto fixo', () => {
    const { container } = mount();
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Adicionar despesa' })).toBeTruthy();
    expect(container.textContent).toContain('Não mudam RRR, foco nem taxa de bancada');
    expect(container.textContent).not.toContain('Despesas:');
  });
  it('"Adicionar despesa" acrescenta uma linha em branco por craft (sem valor sugerido)', () => {
    const { onChange } = mount({ list: L });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar despesa' }));
    expect(onChange).toHaveBeenCalledWith([...L, { name: '', value: '', scope: 'craft' }]);
  });
  it('limite: com MAX_EXTRAS linhas o botão de adicionar fica desligado', () => {
    const full = Array.from({ length: MAX_EXTRAS }, (_, i) => ({ name: `d${i}`, value: '1', scope: 'craft' }));
    mount({ list: full });
    expect(screen.getByRole('button', { name: 'Adicionar despesa' }).disabled).toBe(true);
    expect(screen.getAllByRole('button', { name: /^Remover despesa/ })).toHaveLength(MAX_EXTRAS);
  });
  it('com MAX_EXTRAS - 1 linhas o botão ainda funciona', () => {
    mount({ list: Array.from({ length: MAX_EXTRAS - 1 }, () => ({ name: '', value: '1', scope: 'craft' })) });
    expect(screen.getByRole('button', { name: 'Adicionar despesa' }).disabled).toBe(false);
  });
  it('remover tira exatamente a linha clicada', () => {
    const { onChange } = mount({ list: L });
    fireEvent.click(screen.getByRole('button', { name: 'Remover despesa 2' }));
    expect(onChange).toHaveBeenCalledWith([L[0]]);
  });
  it('editar nome, valor e escopo muda só aquele campo daquela linha', () => {
    const { onChange } = mount({ list: L });
    fireEvent.change(screen.getByLabelText('Valor da despesa 2'), { target: { value: '90' } });
    expect(onChange).toHaveBeenLastCalledWith([L[0], { ...L[1], value: '90' }]);
    fireEvent.change(screen.getByLabelText('Nome da despesa 1'), { target: { value: 'Pedágio' } });
    expect(onChange).toHaveBeenLastCalledWith([{ ...L[0], name: 'Pedágio' }, L[1]]);
    fireEvent.change(screen.getByLabelText('Escopo da despesa 1'), { target: { value: 'lote' } });
    expect(onChange).toHaveBeenLastCalledWith([{ ...L[0], scope: 'lote' }, L[1]]);
  });
  it('resumo: 230 por craft (2.300 no lote de 10)', () => {
    const { container } = mount({ list: L, crafts: 10 });
    expect(container.textContent).toContain('Despesas: 230 por craft (2.300 no lote de 10)');
  });
  it('resumo misto e rótulos do Refino (por unidade / por lote)', () => {
    const list = [{ name: '', value: '150', scope: 'craft' }, { name: '', value: '80', scope: 'lote' }];
    const { container } = mount({ list, crafts: 10 });
    expect(container.textContent).toContain('Despesas: 150 por craft + 80 por lote (1.580 no lote de 10)');
  });
  it('Refino: rótulos por unidade e lote ÷ quantidade', () => {
    const { container } = mount({ list: [{ name: '', value: '2', scope: 'craft' }], crafts: 50, kind: 'refine' });
    expect(container.textContent).toContain('Despesas: 2 por unidade (100 no lote de 50)');
    const opts = within(screen.getByLabelText('Escopo da despesa 1')).getAllByRole('option').map((o) => o.textContent);
    expect(opts).toEqual(['por unidade', 'por lote']);
  });
  it('valor negativo: o aviso da 060 aparece sob a linha certa e o resumo conta 0', () => {
    const raw = [{ name: '', value: '10', scope: 'craft' }, { name: '', value: '-5', scope: 'craft' }];
    const { values, issues } = validateExtras(raw);
    const { container } = mount({ list: raw, issues, summaryList: values, crafts: 1 });
    expect(screen.getByRole('status').textContent).toContain('Despesa 2: valor -5 é negativo: usando 0.');
    expect(container.textContent).toContain('Despesas: 10 por craft');
  });
  it('linha em branco não mostra aviso', () => {
    const raw = [{ name: '', value: '', scope: 'craft' }];
    const { issues } = validateExtras(raw);
    mount({ list: raw, issues });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
