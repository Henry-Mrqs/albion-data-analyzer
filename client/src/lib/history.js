// Histórico de vendas (API `stats/history` do AODP, IDEIA-010). Parsing e URL puros (testáveis sem rede);
// o fetch REUSA o request() e o chunk() de market.js: mesmo `blockedUntil` (um 429 em preços ou histórico pausa os dois),
// mesmo tratamento de "Throttled" e mesmos MarketError.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SELL_CITIES, chunk, request } from './market';
import { getSettings, useSettings } from './settings';

// Decisões de produto (sem fonte de jogo): dado diário muda pouco; concorrência menor que a dos preços (3).
export const HISTORY_TTL_MS = 60 * 60 * 1000;
export const HISTORY_CONCURRENCY = 2;
export const HISTORY_MAX_REQUESTS = 5; // por chamada
export const HISTORY_TOP_N = 30; // Flipper: só as primeiras linhas, nunca o catálogo todo

export const historyDeps = { requestFn: request };

const normCity = (c) => (c === 'BlackMarket' ? 'Black Market' : c);
const parseTs = (s) => (typeof s === 'string' && s ? Date.parse(s.endsWith('Z') ? s : `${s}Z`) : NaN);

/**
 * Linhas da API -> { [mid]: { [cidade]: [{ t, n, p }] } }.
 * Só qualidade 1; t em ms UTC (timestamp sem 'Z' = UTC), ordenado; 'BlackMarket' -> 'Black Market';
 * linha com data:[] vira [] (pedido sem registros); linha ou ponto ruim é pulado, sem exceção.
 */
export function parseHistory(rows) {
  const out = {};
  if (!Array.isArray(rows)) return out;
  for (const r of rows) {
    if (!r || typeof r.item_id !== 'string' || typeof r.location !== 'string' || !Array.isArray(r.data)) continue;
    if ((r.quality || 1) !== 1) continue;
    const list = ((out[r.item_id] ??= {})[normCity(r.location)] ??= []);
    for (const d of r.data) {
      const t = parseTs(d?.timestamp);
      const n = d?.item_count;
      const p = d?.avg_price;
      if (!Number.isFinite(t) || !Number.isFinite(n) || n < 0 || !Number.isFinite(p) || p < 0) continue;
      list.push({ t, n, p });
    }
  }
  for (const byCity of Object.values(out)) for (const c of Object.keys(byCity)) byCity[c].sort((a, b) => a.t - b.t);
  return out;
}

export function historyUrl({ server, ids, cities, scale = 24, qualities = '1' }) {
  return `https://${server}.albion-online-data.com/api/v2/stats/history/${ids.map(encodeURIComponent).join(',')}?locations=${encodeURIComponent(cities.join(','))}&time-scale=${scale}&qualities=${encodeURIComponent(qualities)}`;
}

/** Flipper: ids e cidades de venda só das primeiras `n` linhas mostradas (nunca o catálogo todo). */
export function topHistoryRequest(rows, n = HISTORY_TOP_N) {
  const top = rows.slice(0, n);
  return { ids: [...new Set(top.map((r) => r.mid))], cities: [...new Set(top.map((r) => r.sell))] };
}

/** Junta dois `data` ({mid:{cidade:série}}) cidade a cidade, sem mutar: carregar a cidade B não apaga a A. */
export function mergeHistory(a, b) {
  const out = {};
  for (const src of [a, b]) {
    for (const [mid, byCity] of Object.entries(src ?? {})) out[mid] = { ...out[mid], ...byCity };
  }
  return out;
}

// ---------- fetch com cache próprio ----------
const cache = new Map(); // `${server}|${cidades ordenadas}|${id}` -> { t, series: { [cidade]: série } }
export const clearHistoryCache = () => cache.clear();

/**
 * Busca o histórico de `ids` (só o que falta no cache de 1 h), no máximo HISTORY_MAX_REQUESTS requisições por chamada.
 * Retorna { data: { [mid]: { [cidade]: série } }, truncated }. Série [] = pedido e sem registros; ausente = não pedido/falhou.
 * Erros (inclui throttle) são repassados como estão; os chunks já concluídos ficam no cache.
 */
export async function fetchHistory(
  ids,
  { cities = SELL_CITIES, force = false, signal, onProgress, server = getSettings().server, now = Date.now(), requestFn = historyDeps.requestFn } = {},
) {
  const unique = [...new Set(ids)];
  const citiesKey = [...cities].sort().join(',');
  const keyOf = (id) => `${server}|${citiesKey}|${id}`;
  const data = {};
  const missing = [];
  for (const id of unique) {
    const hit = cache.get(keyOf(id));
    if (!force && hit && now - hit.t < HISTORY_TTL_MS) data[id] = hit.series;
    else missing.push(id);
  }
  if (!missing.length) return { data, truncated: false };

  const base = historyUrl({ server, ids: [], cities });
  const all = chunk(missing, base);
  const chunks = all.slice(0, HISTORY_MAX_REQUESTS);
  const truncated = all.length > chunks.length;
  const queue = [...chunks];
  let done = 0;
  let failed = false;

  async function worker() {
    while (queue.length && !failed) {
      const part = queue.shift();
      let rows;
      try {
        rows = await requestFn(historyUrl({ server, ids: part, cities }), signal, 'histórico');
      } catch (e) {
        failed = true;
        throw e;
      }
      const parsed = parseHistory(rows);
      for (const id of part) {
        const series = Object.fromEntries(cities.map((c) => [c, parsed[id]?.[c] ?? []]));
        cache.set(keyOf(id), { t: now, series });
        data[id] = series;
      }
      onProgress?.(++done, chunks.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(HISTORY_CONCURRENCY, chunks.length) }, worker));
  return { data, truncated };
}

/** Hook: histórico dos `ids` (sob demanda: só busca com enabled). Aborta ao trocar de ids. */
export function useHistory(ids, { cities = SELL_CITIES, enabled = true } = {}) {
  const { server } = useSettings();
  const key = useMemo(() => [...new Set(ids)].sort().join(','), [ids]);
  const citiesKey = cities.join(',');
  const [state, setState] = useState({ history: null, loading: false, error: null });
  const ctl = useRef(null);

  const load = useCallback(async () => {
    ctl.current?.abort();
    if (!key || !enabled) return;
    const c = new AbortController();
    ctl.current = c;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data } = await fetchHistory(key.split(','), { cities: citiesKey.split(','), signal: c.signal, server });
      if (!c.signal.aborted) setState({ history: data, loading: false, error: null });
    } catch (e) {
      if (e.name === 'AbortError') return;
      setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  }, [key, citiesKey, enabled, server]);

  useEffect(() => {
    load();
    return () => ctl.current?.abort();
  }, [load]);

  return state;
}
