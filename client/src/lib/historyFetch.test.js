// fetchHistory: cache, fila e limites (requestFn falso e `now` injetados; sem rede).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HISTORY_CONCURRENCY, HISTORY_MAX_REQUESTS, HISTORY_TOP_N, HISTORY_TTL_MS, clearHistoryCache, fetchHistory, historyDeps, historyUrl } from './history';
import { MarketError, request as marketRequest } from './market';

const idsOf = (url) => decodeURIComponent(url.split('/history/')[1].split('?')[0]).split(',');
const rowsFor = (url, cities = ['Caerleon']) =>
  idsOf(url).flatMap((id) => cities.map((location) => ({ location, item_id: id, quality: 1, data: [{ item_count: 10, avg_price: 100, timestamp: '2026-10-19T00:00:00' }] })));
const echo = () => vi.fn(async (url) => rowsFor(url));
const manyIds = (n) => Array.from({ length: n }, (_, i) => `T4_ITEM_${String(i).padStart(4, '0')}`);
const T0 = 1e12;
const base = { cities: ['Caerleon'], now: T0, server: 'west' };

describe('fetchHistory', () => {
  beforeEach(() => clearHistoryCache());

  it('constantes (decisão de produto): TTL 1 h, concorrência 2, cap 5, top 30', () => {
    expect(HISTORY_TTL_MS).toBe(3600000);
    expect(HISTORY_CONCURRENCY).toBe(2);
    expect(HISTORY_MAX_REQUESTS).toBe(5);
    expect(HISTORY_TOP_N).toBe(30);
  });

  it('reusa o request() de market.js por padrão (mesmo throttle e mesmos erros)', () => expect(historyDeps.requestFn).toBe(marketRequest));

  it('pede, devolve a série parseada e usa a URL de history', async () => {
    const rq = echo();
    const r = await fetchHistory(['T4_BAG'], { ...base, requestFn: rq });
    expect(rq).toHaveBeenCalledTimes(1);
    expect(rq.mock.calls[0][0]).toBe(historyUrl({ server: 'west', ids: ['T4_BAG'], cities: ['Caerleon'] }));
    expect(r.data.T4_BAG.Caerleon).toEqual([{ t: Date.parse('2026-10-19T00:00:00Z'), n: 10, p: 100 }]);
    expect(r.truncated).toBe(false);
  });

  it('CACHEIA por TTL (1 h): 2ª chamada igual não faz requisição; passado o TTL, faz', async () => {
    const rq = echo();
    const o = { ...base, requestFn: rq };
    await fetchHistory(['T4_BAG'], o);
    await fetchHistory(['T4_BAG'], { ...o, now: T0 + HISTORY_TTL_MS - 1 });
    expect(rq).toHaveBeenCalledTimes(1);
    await fetchHistory(['T4_BAG'], { ...o, now: T0 + HISTORY_TTL_MS + 1 });
    expect(rq).toHaveBeenCalledTimes(2);
  });

  it('force ignora o cache', async () => {
    const rq = echo();
    const o = { ...base, requestFn: rq };
    await fetchHistory(['T4_BAG'], o);
    await fetchHistory(['T4_BAG'], { ...o, force: true });
    expect(rq).toHaveBeenCalledTimes(2);
  });

  it('cache negativo: id sem registros (resposta vazia) vira [] e não é pedido de novo dentro do TTL', async () => {
    const rq = vi.fn().mockResolvedValue([]);
    const o = { ...base, requestFn: rq };
    const r = await fetchHistory(['T9_NADA'], o);
    expect(r.data.T9_NADA.Caerleon).toEqual([]);
    await fetchHistory(['T9_NADA'], { ...o, now: T0 + 1 });
    expect(rq).toHaveBeenCalledTimes(1);
  });

  it('cache por servidor e por lista de cidades (a ordem das cidades não importa)', async () => {
    const rq = echo();
    const o = { ...base, requestFn: rq };
    await fetchHistory(['T4_BAG'], o);
    await fetchHistory(['T4_BAG'], { ...o, server: 'europe' });
    await fetchHistory(['T4_BAG'], { ...o, cities: ['Caerleon', 'Lymhurst'] });
    expect(rq).toHaveBeenCalledTimes(3);
    await fetchHistory(['T4_BAG'], { ...o, cities: ['Lymhurst', 'Caerleon'] });
    expect(rq).toHaveBeenCalledTimes(3);
  });

  it('só pede o que falta: ids novos entram na requisição, os já em cache não', async () => {
    const rq = echo();
    const o = { ...base, requestFn: rq };
    await fetchHistory(['A', 'B'], o);
    const r = await fetchHistory(['A', 'B', 'C'], o);
    expect(idsOf(rq.mock.calls[1][0])).toEqual(['C']);
    expect(Object.keys(r.data).sort()).toEqual(['A', 'B', 'C']);
  });

  it('ids repetidos viram um pedido só', async () => {
    const rq = echo();
    await fetchHistory(['A', 'A', 'A'], { ...base, requestFn: rq });
    expect(idsOf(rq.mock.calls[0][0])).toEqual(['A']);
  });

  it('cap HISTORY_MAX_REQUESTS: ids demais => 5 requisições, truncated=true e só os ids pedidos entram em data', async () => {
    const rq = echo();
    const r = await fetchHistory(manyIds(1000), { ...base, requestFn: rq });
    expect(rq).toHaveBeenCalledTimes(HISTORY_MAX_REQUESTS);
    expect(r.truncated).toBe(true);
    const asked = new Set(rq.mock.calls.flatMap((c) => idsOf(c[0])));
    expect(Object.keys(r.data).sort()).toEqual([...asked].sort());
    expect(asked.size).toBeLessThan(1000);
  });

  it('dentro do cap: truncated=false', async () => {
    const rq = echo();
    const r = await fetchHistory(manyIds(100), { ...base, requestFn: rq });
    expect(rq.mock.calls.length).toBeLessThanOrEqual(HISTORY_MAX_REQUESTS);
    expect(r.truncated).toBe(false);
  });

  it('concorrência nunca passa de HISTORY_CONCURRENCY (2) e chega a 2', async () => {
    let inflight = 0;
    let peak = 0;
    const rq = vi.fn(async (url) => {
      inflight++;
      peak = Math.max(peak, inflight);
      await new Promise((res) => setTimeout(res, 5));
      inflight--;
      return rowsFor(url);
    });
    await fetchHistory(manyIds(500), { ...base, requestFn: rq });
    expect(rq.mock.calls.length).toBeGreaterThan(2);
    expect(peak).toBe(HISTORY_CONCURRENCY);
  });

  it('429/throttle: rejeita com o MarketError original, para de pedir chunks; os já concluídos ficam no cache', async () => {
    const err = new MarketError('x', 'throttle', 123);
    const rq = vi.fn().mockImplementationOnce(async (url) => rowsFor(url)).mockRejectedValue(err);
    const o = { ...base, requestFn: rq };
    await expect(fetchHistory(manyIds(500), o)).rejects.toBe(err);
    expect(rq.mock.calls.length).toBeLessThan(HISTORY_MAX_REQUESTS);
    const first = idsOf(rq.mock.calls[0][0]);
    const again = vi.fn(async (url) => rowsFor(url));
    await fetchHistory(first, { ...o, requestFn: again });
    expect(again).not.toHaveBeenCalled();
  });

  it('AbortError passa como está (não vira MarketError) e não cacheia', async () => {
    const abort = Object.assign(new Error('abort'), { name: 'AbortError' });
    const rq = vi.fn().mockRejectedValue(abort);
    await expect(fetchHistory(['A'], { ...base, requestFn: rq })).rejects.toBe(abort);
    const ok = echo();
    await fetchHistory(['A'], { ...base, requestFn: ok });
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it('repassa o signal ao requestFn', async () => {
    const rq = echo();
    const ctl = new AbortController();
    await fetchHistory(['A'], { ...base, requestFn: rq, signal: ctl.signal });
    expect(rq.mock.calls[0][1]).toBe(ctl.signal);
  });

  it('onProgress(done, total) é chamado uma vez por chunk', async () => {
    const rq = echo();
    const calls = [];
    await fetchHistory(manyIds(300), { ...base, requestFn: rq, onProgress: (d, t) => calls.push([d, t]) });
    const total = rq.mock.calls.length;
    expect(total).toBeGreaterThan(1);
    expect(calls).toEqual(Array.from({ length: total }, (_, i) => [i + 1, total]));
  });

  it('tudo em cache: nenhuma requisição e nenhum progresso', async () => {
    const rq = echo();
    const o = { ...base, requestFn: rq };
    await fetchHistory(['A'], o);
    const onProgress = vi.fn();
    await fetchHistory(['A'], { ...o, onProgress });
    expect(rq).toHaveBeenCalledTimes(1);
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('cidade pedida e sem série na resposta vem como [] (pedido, sem registros), nunca ausente', async () => {
    const rq = vi.fn(async (url) => rowsFor(url, ['Caerleon']));
    const r = await fetchHistory(['A'], { ...base, cities: ['Caerleon', 'Lymhurst'], requestFn: rq });
    expect(r.data.A.Lymhurst).toEqual([]);
    expect(r.data.A.Caerleon).toHaveLength(1);
  });

  it('lista vazia de ids: nada a pedir', async () => {
    const rq = echo();
    expect(await fetchHistory([], { ...base, requestFn: rq })).toEqual({ data: {}, truncated: false });
    expect(rq).not.toHaveBeenCalled();
  });
});
