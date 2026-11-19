import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { resetApp, seed, craftCfg } from '../test/ui';
import RestoreSettings from './RestoreSettings';

let reload;
beforeEach(() => {
  resetApp();
  reload = vi.fn();
});

const semear = () => {
  seed('craft:cfg', craftCfg());
  seed('settings', { server: 'east' });
  localStorage.setItem('albion:notice:craft-refine-city', '1');
  localStorage.setItem('outra:coisa', 'x');
  localStorage.setItem('albionx:y', 'y');
  localStorage.setItem('vercel-toolbar', 'z');
};
const abrir = () => fireEvent.click(screen.getByRole('button', { name: /restaurar configurações/i }));

describe('RestoreSettings (IDEIA-071)', () => {
  it('mostra só o botão; nada é apagado antes de confirmar', () => {
    semear();
    render(<RestoreSettings reload={reload} />);
    expect(screen.getByRole('button', { name: /restaurar configurações/i })).toBeTruthy();
    expect(localStorage.length).toBe(6);
    expect(screen.queryByText(/apagar e recarregar/i)).toBeNull();
  });

  it('clicar abre a confirmação com a contagem de itens (3 do app) e o texto de escopo', () => {
    semear();
    render(<RestoreSettings reload={reload} />);
    abrir();
    expect(screen.getByText(/3 itens/)).toBeTruthy();
    expect(screen.getByText(/nada fora do app é apagado/i)).toBeTruthy();
    expect(screen.getByText(/servidor, Premium/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /apagar e recarregar/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeTruthy();
    expect(localStorage.length).toBe(6);
  });

  it('contagem no singular: 1 item', () => {
    seed('settings', { server: 'east' });
    render(<RestoreSettings reload={reload} />);
    abrir();
    expect(screen.getByText(/1 item\b/)).toBeTruthy();
  });

  it('Cancelar fecha o painel e NÃO apaga nada nem recarrega', () => {
    semear();
    render(<RestoreSettings reload={reload} />);
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(localStorage.length).toBe(6);
    expect(reload).not.toHaveBeenCalled();
    expect(screen.queryByText(/apagar e recarregar/i)).toBeNull();
  });

  it('Apagar e recarregar remove SÓ albion:*; outras chaves ficam; recarrega uma vez', () => {
    semear();
    render(<RestoreSettings reload={reload} />);
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /apagar e recarregar/i }));
    expect(localStorage.getItem('albion:craft:cfg')).toBeNull();
    expect(localStorage.getItem('albion:settings')).toBeNull();
    expect(localStorage.getItem('albion:notice:craft-refine-city')).toBeNull();
    expect(localStorage.getItem('outra:coisa')).toBe('x');
    expect(localStorage.getItem('albionx:y')).toBe('y');
    expect(localStorage.getItem('vercel-toolbar')).toBe('z');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('sem nada salvo: avisa "Não há configurações salvas" e o botão de apagar fica desabilitado', () => {
    localStorage.clear(); // resetApp grava albion:settings
    localStorage.setItem('outra:coisa', 'x');
    render(<RestoreSettings reload={reload} />);
    abrir();
    expect(screen.getByText(/Não há configurações salvas neste navegador/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /apagar e recarregar/i }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /apagar e recarregar/i }));
    expect(reload).not.toHaveBeenCalled();
  });

  it('removeItem que falha: mostra "Não foi possível apagar N item(ns)", NÃO recarrega e o painel continua', () => {
    const m = new Map([['albion:a', '1'], ['albion:b', '2'], ['albion:c', '3']]);
    const storage = {
      get length() { return m.size; },
      key: (i) => [...m.keys()][i] ?? null,
      getItem: (k) => m.get(k) ?? null,
      removeItem: (k) => { if (k === 'albion:b') throw new Error('x'); m.delete(k); },
    };
    render(<RestoreSettings storage={storage} reload={reload} />);
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /apagar e recarregar/i }));
    expect(screen.getByText(/Não foi possível apagar 1 item/)).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /apagar e recarregar/i })).toBeTruthy();
  });

  it('funciona sem catálogo, sem settings e sem hooks do app (render isolado, sem providers)', () => {
    localStorage.clear();
    seed('settings', { server: 'east' });
    expect(() => render(<RestoreSettings reload={reload} />)).not.toThrow();
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /apagar e recarregar/i }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('compact: só o botão pequeno do rodapé (mesma confirmação)', () => {
    semear();
    render(<RestoreSettings reload={reload} compact />);
    const b = screen.getByRole('button', { name: /restaurar configurações/i });
    expect(b.className).toMatch(/\bsm\b/);
    fireEvent.click(b);
    expect(screen.getByText(/3 itens/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /apagar e recarregar/i }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
