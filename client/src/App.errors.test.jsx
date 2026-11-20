import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { resetApp, pricesHook } from './test/ui';
import { warmTabs } from './test/lazyWarm';

const { priceHook, histHook } = vi.hoisted(() => ({ priceHook: vi.fn(), histHook: vi.fn() }));
vi.mock('./lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook, fetchPrices: vi.fn(async () => ({})) }));
vi.mock('./lib/history', async (orig) => ({ ...(await orig()), useHistory: histHook, fetchHistory: vi.fn(async () => ({ data: {}, truncated: false })) }));
// A aba Refino quebra só quando globalThis.__quebra é verdadeiro (os testes de perfis a usam normal).
// Fora disso renderiza a aba real (os perfis corrompidos precisam exercitar o Refining de verdade).
vi.mock('./components/Refining', async (orig) => {
  const Real = (await orig()).default;
  return {
    default: function Quebrada(props) {
      if (globalThis.__quebra) throw new Error('refino quebrou');
      return <Real {...props} />;
    },
  };
});

import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Prazo único para findBy/waitFor sobre aba lazy (o import() custa mais de 1 s sob carga).
const SLOW = { timeout: 10000 };
const TITULO = /Algo deu errado ao mostrar esta tela/;
let spy;

beforeAll(warmTabs, 30000);

beforeEach(() => {
  resetApp();
  globalThis.__quebra = false;
  priceHook.mockReturnValue(pricesHook({}));
  histHook.mockReturnValue({ history: null, loading: false, error: null });
  spy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  delete globalThis.__quebra;
  spy.mockRestore();
  location.hash = '';
});

const abrirApp = (hash, wrap = false) => {
  location.hash = hash;
  return render(wrap ? <ErrorBoundary title="O app parou"><App /></ErrorBoundary> : <App />);
};
const aba = (nome) => screen.getByRole('button', { name: new RegExp(`^${nome}$`) });

describe('App: limite de erro por aba (IDEIA-071)', () => {
  it('warmTabs resolve todas as abas lazy antes dos testes (IDEIA-085)', async () => {
    const mods = await warmTabs();
    expect(mods).toHaveLength(6);
    for (const m of mods) expect(typeof m.default).toBe('function');
  });

  it('aba que lança: fallback dentro da área da aba; cabeçalho, abas e rodapé continuam na tela', async () => {
    globalThis.__quebra = true;
    abrirApp('#refining');
    expect(await screen.findByText(TITULO, undefined, SLOW)).toBeTruthy();
    for (const n of ['Mercado', 'Refino', 'Craft', 'Flipper', 'RRR']) expect(aba(n)).toBeTruthy();
    expect(screen.getByText('DATA')).toBeTruthy();
    expect(screen.getByText(/Albion Online Data Project/)).toBeTruthy();
  });

  it('trocar para outra aba recupera (resetKey = aba): #crafting renderiza normalmente sem recarregar', async () => {
    globalThis.__quebra = true;
    abrirApp('#refining');
    await screen.findByText(TITULO, undefined, SLOW);
    fireEvent.click(aba('Craft'));
    expect(await screen.findByText(/Materiais \(/, undefined, SLOW)).toBeTruthy();
    expect(screen.queryByText(TITULO)).toBeNull();
  });

  it('voltar para a aba quebrada depois de corrigir a causa também recupera', async () => {
    globalThis.__quebra = true;
    abrirApp('#refining');
    await screen.findByText(TITULO, undefined, SLOW);
    fireEvent.click(aba('Mercado'));
    globalThis.__quebra = false;
    fireEvent.click(aba('Refino'));
    expect(await screen.findByRole('heading', { name: 'Refino' }, SLOW)).toBeTruthy();
  });

  it('o limite de fora (main) não aparece quando só uma aba quebra', async () => {
    globalThis.__quebra = true;
    abrirApp('#refining', true);
    await screen.findByText(TITULO, undefined, SLOW);
    expect(screen.queryByText('O app parou')).toBeNull();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('rodapé mostra o botão Restaurar configurações (compact) e ele abre a confirmação', async () => {
    abrirApp('#refining');
    await screen.findByRole('heading', { name: 'Refino' }, SLOW);
    const rodape = document.querySelector('.footer');
    const b = within(rodape).getByRole('button', { name: /restaurar configurações/i });
    fireEvent.click(b);
    expect(within(rodape).getByRole('button', { name: /apagar e recarregar/i })).toBeTruthy();
    expect(within(rodape).getByText(/nada fora do app é apagado/i)).toBeTruthy();
  });
});

const TODAS = ['craft:item', 'craft:cfg', 'refine:cfg', 'flip:cfg', 'market:item', 'market:quality', 'rrr:cfg', 'target:cfg', 'settings'];
const raw = (k, v) => localStorage.setItem(`albion:${k}`, typeof v === 'string' ? v : JSON.stringify(v));
const PERFIS = {
  'C1 todas {}': () => TODAS.forEach((k) => raw(k, {})),
  'C2 todas null': () => TODAS.forEach((k) => raw(k, 'null')),
  'C3 texto lixo': () => TODAS.forEach((k) => raw(k, '{lixo não é json')),
  'C7 craft sem refine e item id:5': () => { raw('craft:cfg', { craftCity: 'Lymhurst' }); raw('craft:item', { id: 5, ench: 0 }); },
  'C8 refine type FOO e market item.id null': () => { raw('refine:cfg', { type: 'FOO' }); raw('market:item', { id: null, ench: 0 }); },
  'C10 craft refine null, refineDaily [], recipeVariant 1.5': () => raw('craft:cfg', { refine: null, refineDaily: [], recipeVariant: '1.5' }),
  'flip groups FOO': () => raw('flip:cfg', { groups: ['FOO'] }),
};
const ABAS = [['market', 'Mercado'], ['refining', 'Refino'], ['crafting', 'Craft'], ['flipper', 'Flipper'], ['rrr', 'RRR']];

describe('estados salvos corrompidos NÃO derrubam nenhuma aba (regressão do laudo da 070: 0 telas brancas)', () => {
  const completos = ['C1 todas {}', 'C2 todas null', 'C3 texto lixo'];
  const casos = Object.keys(PERFIS).flatMap((p) => (completos.includes(p) ? ABAS : [ABAS[2]]).map(([h]) => [p, h]));
  it.each(casos)('%s em #%s: o conteúdo existe e o fallback "Algo deu errado" NÃO aparece', async (perfil, hash) => {
    PERFIS[perfil]();
    abrirApp(`#${hash}`);
    // espera o conteúdo da aba (lazy) sair do Suspense
    await vi.waitFor(() => expect(document.querySelector('.app').textContent.length).toBeGreaterThan(400), SLOW);
    expect(screen.queryByText(TITULO)).toBeNull();
    expect(document.querySelector('.app').textContent).not.toMatch(/NaN|undefined|\[object/);
  });
});

describe('estado que quebra de verdade: fallback -> Restaurar -> Apagar e recarregar', () => {
  it('limpa albion:*, preserva o resto e remontar com o armazenamento limpo mostra os filhos', () => {
    function Veneno() {
      if (localStorage.getItem('albion:veneno') === 'x') throw new Error('veneno');
      return <p>filho ok</p>;
    }
    localStorage.setItem('albion:veneno', 'x');
    localStorage.setItem('outra:coisa', 'y');
    const reload = vi.fn();
    render(<ErrorBoundary reload={reload}><Veneno /></ErrorBoundary>);
    expect(screen.getByText(TITULO)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /restaurar configurações/i }));
    fireEvent.click(screen.getByRole('button', { name: /apagar e recarregar/i }));
    expect(localStorage.getItem('albion:veneno')).toBeNull();
    expect(localStorage.getItem('outra:coisa')).toBe('y');
    expect(reload).toHaveBeenCalledTimes(1);
    // o "recarregar" real remonta tudo; aqui, remontar o limite com o armazenamento limpo
    render(<ErrorBoundary reload={reload}><Veneno /></ErrorBoundary>);
    expect(screen.getAllByText('filho ok').length).toBeGreaterThan(0);
  });
});
