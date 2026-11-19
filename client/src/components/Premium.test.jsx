import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { resetApp, seed, freezeNow } from '../test/ui';

const { goldHook } = vi.hoisted(() => ({ goldHook: vi.fn() }));
vi.mock('../lib/gold', async (orig) => ({ ...(await orig()), useGold: goldHook }));

import Premium from './Premium';

const API = { gold: { price: 9411, t: Date.UTC(2026, 10, 18, 1) }, loading: false, error: null, refresh: vi.fn() };
const SEM_API = { gold: null, loading: false, error: null, refresh: vi.fn() };
const CFG = { gold: '', goldCost: '', volume: '', silverPerFocus: '', focusPerDay: '' };
const saved = () => JSON.parse(localStorage.getItem('albion:premium:cfg'));
const boxes = () => screen.getAllByRole('spinbutton'); // ouro, custo, volume, prata/foco, foco/dia
const text = () => document.body.textContent;

let restore;
beforeEach(() => {
  resetApp();
  goldHook.mockReturnValue(API);
  restore = freezeNow('2026-11-18T03:00:00Z');
});
afterEach(() => restore());

describe('Premium: estado antigo e texto fixo', () => {
  it('sem premium:cfg salvo: abre, pede o ouro, mostra o rodapé "Não conta:" e não aconselha compra', () => {
    render(<Premium />);
    expect(screen.getByText('Vale pagar Premium?')).toBeTruthy();
    expect(text()).toContain('Informe o preço do ouro para calcular.');
    expect(text()).toContain('Não conta: +50% de prata e saque de monstros, fama extra, pontos de aprendizado, +50% de rendimento de coleta, ilhas e animais');
    expect(text()).toContain('o app não recomenda a compra');
    expect(text()).not.toMatch(/não compre|compre agora|vale a pena|não vale/i);
  });

  it('cfg com todos os campos vazios (formato atual): mesmo comportamento', () => {
    seed('premium:cfg', CFG);
    render(<Premium />);
    expect(text()).toContain('Informe o preço do ouro para calcular.');
    expect(boxes().map((b) => b.value)).toEqual(['', '', '', '', '']);
  });
});

describe('Premium: números do dossiê', () => {
  it('gold 9414, volume 20000000, s 43: 35.302.500, 800.000, 12.900.000, saldo −21.602.500 e equilíbrio 560.062.500', () => {
    seed('premium:cfg', { ...CFG, gold: '9414', volume: '20000000', silverPerFocus: '43' });
    render(<Premium />);
    const t = text();
    expect(t).toContain('35.302.500 prata');
    expect(t).toContain('800.000 prata');
    expect(t).toContain('12.900.000 prata');
    expect(t).toMatch(/Saldo em 30 dias[^\d]*-21\.602\.500 prata/);
    expect(t).toContain('560.062.500 prata por mês');
    expect(t).toContain('vendendo cerca de 560.062.500 de prata por mês no mercado');
    expect(t).toContain('Estimativa');
  });

  it('custo editado (3.000) muda o resultado; a dica mostra "3.750" e "2026-11-18"', () => {
    seed('premium:cfg', { ...CFG, gold: '9414', goldCost: '3000' });
    render(<Premium />);
    expect(text()).toContain('28.242.000 prata');
    expect(text()).toContain('Padrão 3.750, conferido em 2026-11-18 em fonte secundária (AO Refinery)');
  });

  it('foco usado por dia: padrão 10.000 marcado como "padrão do app, não confirmado"; 5.000 muda o valor do foco', () => {
    seed('premium:cfg', { ...CFG, gold: '9414', silverPerFocus: '43', focusPerDay: '5000' });
    render(<Premium />);
    expect(text()).toContain('6.450.000 prata');
    expect(text()).toContain('Padrão 10.000');
    expect(text()).toContain('padrão do app, não confirmado');
  });

  it('paysAlone: s 120 mostra a frase "já cobre o custo" e NÃO mostra volume negativo', () => {
    seed('premium:cfg', { ...CFG, gold: '9414', silverPerFocus: '120' });
    render(<Premium />);
    expect(text()).toContain('O valor do foco que você informou, sozinho, já cobre o custo do Premium.');
    expect(text()).not.toContain('vendendo cerca de');
    expect(text()).not.toMatch(/-\d[\d.]* prata por mês/);
  });
});

describe('Premium: preço do ouro da API', () => {
  it('botão "Usar o preço atual (9.411 · 2 h)" copia o preço, grava gold em premium:cfg; a API não preenche sozinha', () => {
    render(<Premium />);
    expect(boxes()[0].value).toBe('');
    expect(localStorage.getItem('albion:premium:cfg')?.includes('9411') ?? false).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Usar o preço atual (9.411 · 2 h)' }));
    expect(boxes()[0].value).toBe('9411');
    expect(saved().gold).toBe('9411');
    expect(text()).toContain('35.291.250');
  });

  it('erro da API (throttle): mostra a mensagem e a aba continua utilizável digitando o ouro', () => {
    goldHook.mockReturnValue({ ...SEM_API, error: 'Limite de requisições da API atingido. Liberado em 40s.' });
    render(<Premium />);
    expect(text()).toContain('Limite de requisições da API atingido. Liberado em 40s.');
    expect(text()).toContain('Você pode digitar o preço');
    expect(screen.queryByRole('button', { name: /Usar o preço atual/ })).toBeNull();
    fireEvent.change(boxes()[0], { target: { value: '9414' } });
    expect(text()).toContain('35.302.500 prata');
  });

  it('API devolve null (sem preço): sem botão "Usar", texto "digite o preço"', () => {
    goldHook.mockReturnValue(SEM_API);
    render(<Premium />);
    expect(screen.queryByRole('button', { name: /Usar o preço atual/ })).toBeNull();
    expect(text()).toContain('digite o preço');
  });
});

describe('Premium: persistência', () => {
  it('digitar grava em premium:cfg e remontar mantém os valores', () => {
    const { unmount } = render(<Premium />);
    fireEvent.change(boxes()[0], { target: { value: '9414' } });
    fireEvent.change(boxes()[2], { target: { value: '20000000' } });
    expect(saved()).toMatchObject({ gold: '9414', volume: '20000000' });
    unmount();
    render(<Premium />);
    expect(boxes()[0].value).toBe('9414');
    expect(boxes()[2].value).toBe('20000000');
  });
});

describe('Premium: estado corrompido', () => {
  it('gold "abc": aviso "não é um número" e "Informe o preço do ouro"', () => {
    seed('premium:cfg', { ...CFG, gold: 'abc' });
    render(<Premium />);
    expect(text()).toContain('não é um número');
    expect(text()).toContain('Informe o preço do ouro para calcular.');
  });

  it('volume {} ou null salvo: sem aviso e sem exceção', () => {
    for (const volume of [{}, null, [1], true]) {
      localStorage.clear();
      seed('premium:cfg', { ...CFG, gold: '9414', volume });
      const { unmount } = render(<Premium />);
      expect(screen.queryByTestId('input-issues')).toBeNull();
      expect(text()).toContain('35.302.500 prata');
      unmount();
    }
  });

  it('premium:cfg inteiro null, [] ou texto: padrões, sem exceção', () => {
    for (const bad of [null, [], 'texto', 7]) {
      localStorage.clear();
      seed('premium:cfg', bad);
      const { unmount } = render(<Premium />);
      expect(text()).toContain('Informe o preço do ouro para calcular.');
      unmount();
    }
  });

  it('números enormes: teto com aviso, nunca ∞/NaN na tela', () => {
    seed('premium:cfg', { gold: '1e300', goldCost: '1e300', volume: '1e300', silverPerFocus: '1e300', focusPerDay: '1e300' });
    render(<Premium />);
    expect(text()).toContain('acima do limite');
    expect(text()).not.toMatch(/Infinity|NaN|∞/);
  });
});
