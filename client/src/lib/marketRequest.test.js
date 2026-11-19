// Mensagens de erro de request() (compartilhado entre preços e histórico): o nome da API vem do chamador.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketError, request, resetThrottleForTests } from './market';
import { fetchHistory, clearHistoryCache } from './history';

const stub = (res) => vi.stubGlobal('fetch', vi.fn(async () => res));
// o 429 grava `blockedUntil` no módulo: zera antes e depois de cada teste para a ordem (shuffle) não importar.
beforeEach(resetThrottleForTests);
afterEach(() => {
  vi.unstubAllGlobals();
  resetThrottleForTests();
});

const msgOf = async (p) => p.then(() => null, (e) => e);

describe('request(): texto dos erros', () => {
  it('padrão continua falando em "API de preços" (rota de preços inalterada)', async () => {
    stub({ ok: false, status: 500 });
    const e = await msgOf(request('http://x', undefined));
    expect(e).toBeInstanceOf(MarketError);
    expect(e.message).toBe('A API de preços respondeu HTTP 500.');
  });
  it('histórico: HTTP de erro cita "API de histórico"', async () => {
    stub({ ok: false, status: 500 });
    expect((await msgOf(request('http://x', undefined, 'histórico'))).message).toBe('A API de histórico respondeu HTTP 500.');
  });
  it('histórico: resposta que não é JSON cita "API de histórico"', async () => {
    stub({ ok: true, status: 200, json: async () => { throw new Error('x'); } });
    expect((await msgOf(request('http://x', undefined, 'histórico'))).message).toBe('Resposta inválida da API de histórico.');
  });
  it('histórico: falha de rede cita a API de histórico e o domínio', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('net'); }));
    expect((await msgOf(request('http://x', undefined, 'histórico'))).message).toMatch(/API de histórico \(albion-online-data\.com\)/);
  });
  it('preços: resposta inválida e rede seguem como antes', async () => {
    stub({ ok: true, status: 200, json: async () => { throw new Error('x'); } });
    expect((await msgOf(request('http://x', undefined))).message).toBe('Resposta inválida da API de preços.');
  });
  it('fetchHistory repassa "histórico" ao requestFn', async () => {
    clearHistoryCache();
    const rq = vi.fn(async () => []);
    await fetchHistory(['A'], { cities: ['Caerleon'], requestFn: rq, now: 1, server: 'west' });
    expect(rq.mock.calls[0][2]).toBe('histórico');
  });
  // por último: o 429 grava o bloqueio no módulo
  it('429: o aviso de pausa cita a API pedida, e o bloqueio vale para os dois (mensagem de pausa também)', async () => {
    stub({ ok: false, status: 429, text: async () => 'Throttled' });
    const e = await msgOf(request('http://x', undefined, 'histórico'));
    expect(e.kind).toBe('throttle');
    const again = await msgOf(request('http://x', undefined, 'histórico'));
    expect(again.message).toMatch(/^A API de histórico pediu uma pausa/);
    const prices = await msgOf(request('http://x', undefined));
    expect(prices.message).toMatch(/^A API de preços pediu uma pausa/);
  });
});
