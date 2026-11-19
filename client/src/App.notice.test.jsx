import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { resetApp, seed, craftCfg, pricesHook } from './test/ui';

const { priceHook, histHook } = vi.hoisted(() => ({ priceHook: vi.fn(), histHook: vi.fn() }));
vi.mock('./lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook, fetchPrices: vi.fn(async () => ({})) }));
vi.mock('./lib/history', async (orig) => ({ ...(await orig()), useHistory: histHook, fetchHistory: vi.fn(async () => ({ data: {}, truncated: false })) }));

import App from './App';

const AVISO = /bônus de produção da cidade especializada/;
const NOTICE_KEY = 'albion:notice:craft-refine-city';
const noticeKeys = () => Object.keys(localStorage).filter((k) => k.startsWith('albion:notice:'));

// formato de 9e1e4a2: craft:cfg sem refineCity
const velho = () => {
  const { refineCity, ...rest } = craftCfg(); // eslint-disable-line no-unused-vars
  return rest;
};

beforeEach(() => {
  resetApp();
  location.hash = '#market';
  priceHook.mockReturnValue(pricesHook({}));
  histHook.mockReturnValue({ history: null, loading: false, error: null });
});
afterEach(() => {
  location.hash = '';
});

describe('App: aviso de migração só quando o item usa refino (IDEIA-071, O3)', () => {
  it('item que usa refino (T6_MAIN_SWORD, o padrão sem item salvo): aviso com o texto novo e o botão Entendi', () => {
    seed('craft:cfg', velho());
    render(<App />);
    expect(screen.getByText(AVISO)).toBeTruthy();
    expect(screen.getByText(/15% para 37%/)).toBeTruthy();
    expect(screen.queryByText(/RRR \+40/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Entendi' })).toBeTruthy();
  });

  it('item salvo que usa refino também mostra', () => {
    seed('craft:cfg', velho());
    seed('craft:item', { id: 'T6_MAIN_SWORD', ench: 0 });
    render(<App />);
    expect(screen.getByText(AVISO)).toBeTruthy();
  });

  it('item que NÃO usa refino (T4_POTION_HEAL): nenhum aviso; nada é gravado em albion:notice:*', () => {
    seed('craft:cfg', velho());
    seed('craft:item', { id: 'T4_POTION_HEAL', ench: 0 });
    render(<App />);
    expect(screen.queryByText(AVISO)).toBeNull();
    expect(screen.queryByText('Configuração antiga atualizada')).toBeNull();
    expect(noticeKeys()).toEqual([]);
  });

  it('craft:item corrompido (JSON inválido): cai no item padrão sem lançar', () => {
    seed('craft:cfg', velho());
    localStorage.setItem('albion:craft:item', '{lixo');
    render(<App />);
    expect(screen.getByText(AVISO)).toBeTruthy();
  });

  it('Entendi grava albion:notice:craft-refine-city e o aviso não volta ao remontar', () => {
    seed('craft:cfg', velho());
    const { unmount } = render(<App />);
    expect(localStorage.getItem(NOTICE_KEY)).toBeNull(); // nada gravado antes de dispensar
    fireEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(localStorage.getItem(NOTICE_KEY)).toBe('1');
    expect(screen.queryByText(AVISO)).toBeNull();
    unmount();
    render(<App />);
    expect(screen.queryByText(AVISO)).toBeNull();
  });

  it('estado atual (com refineCity) ou sem nada salvo: nenhum aviso', () => {
    seed('craft:cfg', craftCfg());
    const { unmount } = render(<App />);
    expect(screen.queryByText(AVISO)).toBeNull();
    unmount();
    localStorage.clear();
    render(<App />);
    expect(screen.queryByText(AVISO)).toBeNull();
  });

  it('o aviso é lido no primeiro render de App (useState): regravar craft:cfg depois não o tira; um novo mount relê o armazenamento', () => {
    seed('craft:cfg', velho());
    const { rerender, unmount } = render(<App />);
    expect(screen.getByText(AVISO)).toBeTruthy();
    seed('craft:cfg', { ...craftCfg(), _v: 1 }); // uma aba regravou o estado já migrado
    rerender(<App />);
    expect(screen.getByText(AVISO)).toBeTruthy(); // lido uma vez, no primeiro render
    unmount();
    render(<App />);
    expect(screen.queryByText(AVISO)).toBeNull(); // novo mount: relê (não é constante de módulo)
  });
});
