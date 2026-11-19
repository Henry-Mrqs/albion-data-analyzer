import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InputIssues, { CorrectedBadge } from './InputIssues';
import { getSettings } from '../lib/settings';
import { resetApp } from '../test/ui';

beforeEach(resetApp);

const feeIssue = (raw, over = {}) => ({ code: 'fee-ceiling', raw, field: 'feePer100', level: 'warn', msg: 'taxa alta', ...over });

describe('botão "Aceitar" (InputIssues)', () => {
  it('mostra "Aceitar 5.000 como novo teto"; clicar grava em settings e no localStorage', () => {
    render(<InputIssues issues={[feeIssue(5000)]} field="feePer100" />);
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar 5.000 como novo teto' }));
    expect(getSettings().feeCeiling).toBe(5000);
    expect(JSON.parse(localStorage.getItem('albion:settings')).feeCeiling).toBe(5000);
  });
  it('raw = 1e6 mostra o botão (limite inclusivo)', () => {
    render(<InputIssues issues={[feeIssue(1e6)]} />);
    expect(screen.queryByRole('button')).not.toBeNull();
  });
  it.each([1000001, 0, -5, 'x'])('raw = %s não mostra o botão', (raw) => {
    render(<InputIssues issues={[feeIssue(raw)]} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('outro code não mostra o botão', () => {
    render(<InputIssues issues={[feeIssue(5000, { code: 'range' })]} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('field filtra: issue de outro campo não aparece', () => {
    render(<InputIssues issues={[feeIssue(5000, { field: 'refineFee', msg: 'outro campo' })]} field="feePer100" />);
    expect(screen.queryByText('outro campo')).toBeNull();
    expect(screen.queryByTestId('input-issues')).toBeNull();
  });
  it('lista vazia ou undefined não renderiza nada', () => {
    const a = render(<InputIssues issues={[]} />);
    expect(a.container.firstChild).toBeNull();
    const b = render(<InputIssues />);
    expect(b.container.firstChild).toBeNull();
  });
});

describe('InputIssues níveis', () => {
  it('info usa muted, warn usa warn, error usa bad', () => {
    const issues = [
      { code: 'a', field: 'f1', level: 'info', msg: 'm-info' },
      { code: 'b', field: 'f2', level: 'warn', msg: 'm-warn' },
      { code: 'c', field: 'f3', level: 'error', msg: 'm-error' },
    ];
    render(<InputIssues issues={issues} />);
    expect(screen.getByText('m-info').className).toContain('muted');
    expect(screen.getByText('m-warn').className).toContain('warn');
    expect(screen.getByText('m-error').className).toContain('bad');
  });
});

describe('CorrectedBadge', () => {
  const lv = (level) => ({ level });
  it('info não conta (nenhum badge)', () => {
    const { container } = render(<CorrectedBadge issues={[lv('info')]} />);
    expect(container.firstChild).toBeNull();
  });
  it('1 aviso = "1 valor corrigido"', () => {
    const { container } = render(<CorrectedBadge issues={[lv('warn'), lv('info')]} />);
    expect(container.textContent).toBe('1 valor corrigido');
  });
  it('2 (warn + error) = "2 valores corrigidos"', () => {
    const { container } = render(<CorrectedBadge issues={[lv('warn'), lv('error')]} />);
    expect(container.textContent).toBe('2 valores corrigidos');
  });
  it('nenhum aviso = nada', () => {
    const a = render(<CorrectedBadge issues={[]} />);
    expect(a.container.firstChild).toBeNull();
    const b = render(<CorrectedBadge />);
    expect(b.container.firstChild).toBeNull();
  });
});
