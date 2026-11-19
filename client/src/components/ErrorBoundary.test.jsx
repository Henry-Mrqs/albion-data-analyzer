import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { lazy, Suspense } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { resetApp, seed } from '../test/ui';
import ErrorBoundary from './ErrorBoundary';

let spy;
beforeEach(() => {
  resetApp();
  globalThis.__boom = false;
  spy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  delete globalThis.__boom;
  spy.mockRestore();
});

function Bomba({ msg = 'estourou' }) {
  if (globalThis.__boom) throw new Error(msg);
  return <p>filho ok</p>;
}
const TITULO = /Algo deu errado ao mostrar esta tela/;

describe('ErrorBoundary (IDEIA-071)', () => {
  it('filhos normais: renderiza os filhos e nenhum fallback', () => {
    render(<ErrorBoundary><Bomba /></ErrorBoundary>);
    expect(screen.getByText('filho ok')).toBeTruthy();
    expect(screen.queryByText(TITULO)).toBeNull();
  });

  it('exceção de render: fallback com role alert, filho escondido, texto de ajuda e os botões', () => {
    globalThis.__boom = true;
    render(<ErrorBoundary><Bomba /></ErrorBoundary>);
    expect(screen.getByRole('alert').textContent).toMatch(TITULO);
    expect(screen.queryByText('filho ok')).toBeNull();
    expect(screen.getByText(/Seus preços e os dados do jogo não foram afetados/)).toBeTruthy();
    expect(screen.getByText(/restaure as configurações/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /restaurar configurações/i })).toBeTruthy();
  });

  it('detalhes técnicos: <details> com a mensagem do erro e o console.error foi chamado', () => {
    globalThis.__boom = true;
    const { container } = render(<ErrorBoundary><Bomba msg="causa-especifica" /></ErrorBoundary>);
    const d = container.querySelector('details');
    expect(d.textContent).toMatch(/Detalhes técnicos/);
    expect(d.textContent).toContain('causa-especifica');
    expect(spy).toHaveBeenCalled();
  });

  it('Tentar de novo: corrigida a causa remonta os filhos; se persiste volta ao fallback', () => {
    globalThis.__boom = true;
    render(<ErrorBoundary><Bomba /></ErrorBoundary>);
    fireEvent.click(screen.getByRole('button', { name: /tentar de novo/i }));
    expect(screen.getByText(TITULO)).toBeTruthy();
    globalThis.__boom = false;
    fireEvent.click(screen.getByRole('button', { name: /tentar de novo/i }));
    expect(screen.getByText('filho ok')).toBeTruthy();
    expect(screen.queryByText(TITULO)).toBeNull();
  });

  it('resetKey: trocar a chave limpa o erro; manter a chave não limpa', () => {
    globalThis.__boom = true;
    const { rerender } = render(<ErrorBoundary resetKey="a"><Bomba /></ErrorBoundary>);
    globalThis.__boom = false;
    rerender(<ErrorBoundary resetKey="a"><Bomba /></ErrorBoundary>);
    expect(screen.getByText(TITULO)).toBeTruthy();
    rerender(<ErrorBoundary resetKey="b"><Bomba /></ErrorBoundary>);
    expect(screen.getByText('filho ok')).toBeTruthy();
    expect(screen.queryByText(TITULO)).toBeNull();
  });

  it('erro de carga de pedaço (lazy rejeitado) cai no fallback depois do Suspense: "Há uma versão nova do app" e Recarregar chama reload', async () => {
    const reload = vi.fn();
    const Quebrada = lazy(() => Promise.reject(new TypeError('Failed to fetch dynamically imported module: https://x/assets/Refining-abc.js')));
    render(
      <ErrorBoundary reload={reload}>
        <Suspense fallback={<p>carregando</p>}>
          <Quebrada />
        </Suspense>
      </ErrorBoundary>,
    );
    expect(await screen.findByText(/Há uma versão nova do app/)).toBeTruthy();
    expect(screen.getByText(/Recarregue a página/)).toBeTruthy();
    expect(screen.queryByText(TITULO)).toBeNull();
    expect(screen.queryByRole('button', { name: /restaurar configurações/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^recarregar$/i }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('lazy rejeitado com erro comum também cai no fallback genérico', async () => {
    const Quebrada = lazy(() => Promise.reject(new Error('falha qualquer')));
    render(
      <ErrorBoundary>
        <Suspense fallback={<p>carregando</p>}>
          <Quebrada />
        </Suspense>
      </ErrorBoundary>,
    );
    expect(await screen.findByText(TITULO)).toBeTruthy();
  });

  it('limites aninhados: o de dentro captura; o de fora não renderiza fallback; irmão fora do limite continua visível', () => {
    globalThis.__boom = true;
    render(
      <ErrorBoundary title="fora">
        <p>irmão</p>
        <ErrorBoundary>
          <Bomba />
        </ErrorBoundary>
      </ErrorBoundary>,
    );
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByText('irmão')).toBeTruthy();
    expect(screen.getByText(TITULO)).toBeTruthy();
  });

  it('erro que não é Error (throw "texto", throw null): fallback genérico, sem exceção no fallback', () => {
    for (const valor of ['texto solto', null, undefined]) {
      const Lanca = () => { throw valor; };
      const { unmount } = render(<ErrorBoundary><Lanca /></ErrorBoundary>);
      expect(screen.getByText(TITULO)).toBeTruthy();
      unmount();
    }
  });

  it('title customizado substitui o título do fallback', () => {
    globalThis.__boom = true;
    render(<ErrorBoundary title="O app parou"><Bomba /></ErrorBoundary>);
    expect(screen.getByText('O app parou')).toBeTruthy();
    expect(screen.queryByText(TITULO)).toBeNull();
  });

  it('o fallback não lê settings, catálogo nem localStorage além do botão de restaurar; Restaurar apaga só albion:*', () => {
    globalThis.__boom = true;
    localStorage.clear();
    seed('settings', { server: 'east' });
    localStorage.setItem('outra:coisa', 'x');
    const get = vi.spyOn(Storage.prototype, 'getItem');
    render(<ErrorBoundary><Bomba /></ErrorBoundary>);
    expect(get).not.toHaveBeenCalled();
    get.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: /restaurar configurações/i }));
    expect(screen.getByText(/1 item\b/)).toBeTruthy();
  });
});
