// Cliente da API pública do Albion Online Data Project (AODP), chamado direto do navegador.
// - cache em memória (TTL)
// - fila com concorrência limitada (a API limita ~180 req/min por IP)
// - tratamento explícito do bloqueio "Throttled"
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSettings, useSettings } from './settings';

export const CITIES = ['Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Caerleon'];
export const SELL_CITIES = [...CITIES, 'Black Market'];
export const cityLabel = (c) => (c === 'Black Market' ? 'Mercado Negro' : c);

const TTL = 3 * 60 * 1000;
const MAX_URL = 1700;
const CONCURRENCY = 3;

const cache = new Map(); // `${server}|${q}|${id}` -> { t, data }
let blockedUntil = 0;

/** Só para testes: limpa a pausa compartilhada por 429/503 (estado de módulo). Não é chamada em produção. */
export function resetThrottleForTests() {
  blockedUntil = 0;
}

export class MarketError extends Error {
  constructor(message, kind = 'network', retryAt = 0) {
    super(message);
    this.kind = kind;
    this.retryAt = retryAt;
  }
}

const parseDate = (s) => (!s || s.startsWith('0001') ? null : new Date(s.endsWith('Z') ? s : `${s}Z`).getTime());

function normalize(rows) {
  const out = {};
  for (const r of rows) {
    const q = r.quality || 1;
    const city = r.city === 'BlackMarket' ? 'Black Market' : r.city;
    ((out[r.item_id] ??= {})[city] ??= {})[q] = {
      s: r.sell_price_min || 0,
      sd: parseDate(r.sell_price_min_date),
      b: r.buy_price_max || 0,
      bd: parseDate(r.buy_price_max_date),
    };
  }
  return out;
}

export function chunk(ids, base) {
  const chunks = [];
  let cur = [];
  let len = base.length;
  for (const id of ids) {
    if (len + id.length + 1 > MAX_URL && cur.length) {
      chunks.push(cur);
      cur = [];
      len = base.length;
    }
    cur.push(id);
    len += id.length + 1;
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}

export async function request(url, signal, what = 'preços') {
  const wait = blockedUntil - Date.now();
  if (wait > 0) throw new MarketError(`A API de ${what} pediu uma pausa. Tente de novo em ${Math.ceil(wait / 1000)}s.`, 'throttle', blockedUntil);
  let res;
  try {
    res = await fetch(url, { signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new MarketError(`Não foi possível falar com a API de ${what} (albion-online-data.com). Verifique sua conexão.`);
  }
  if (res.status === 429 || res.status === 503) {
    const text = await res.text().catch(() => '');
    const m = text.match(/resets at ([\d-]+ [\d:]+) \+0000/);
    blockedUntil = m ? new Date(`${m[1].replace(' ', 'T')}Z`).getTime() : Date.now() + 60_000;
    const secs = Math.max(1, Math.ceil((blockedUntil - Date.now()) / 1000));
    throw new MarketError(`Limite de requisições da API atingido. Liberado em ${secs > 90 ? `${Math.ceil(secs / 60)} min` : `${secs}s`}.`, 'throttle', blockedUntil);
  }
  if (!res.ok) throw new MarketError(`A API de ${what} respondeu HTTP ${res.status}.`);
  try {
    return await res.json();
  } catch {
    throw new MarketError(`Resposta inválida da API de ${what}.`);
  }
}

/**
 * Busca preços. Retorna { [itemId]: { [cidade]: { [qualidade]: {s, sd, b, bd} } } }
 * s/sd = menor ordem de venda e data; b/bd = maior ordem de compra e data.
 */
export async function fetchPrices(ids, { qualities = '1', force = false, signal, onProgress, cities = SELL_CITIES, server = getSettings().server } = {}) {
  const unique = [...new Set(ids)];
  const result = {};
  const missing = [];
  const now = Date.now();
  for (const id of unique) {
    const hit = cache.get(`${server}|${qualities}|${id}`);
    if (!force && hit && now - hit.t < TTL) Object.assign(result, hit.data);
    else missing.push(id);
  }
  if (!missing.length) return result;

  const locations = cities.join(',');
  const base = `https://${server}.albion-online-data.com/api/v2/stats/prices/?locations=${encodeURIComponent(locations)}&qualities=${qualities}`;
  const chunks = chunk(missing, base);
  let done = 0;
  const queue = [...chunks];

  async function worker() {
    while (queue.length) {
      const ids = queue.shift();
      const url = `https://${server}.albion-online-data.com/api/v2/stats/prices/${ids.map(encodeURIComponent).join(',')}?locations=${encodeURIComponent(locations)}&qualities=${qualities}`;
      const rows = await request(url, signal);
      const data = normalize(rows);
      for (const id of ids) {
        const entry = data[id] ? { [id]: data[id] } : {};
        cache.set(`${server}|${qualities}|${id}`, { t: Date.now(), data: entry });
      }
      Object.assign(result, data);
      onProgress?.(++done, chunks.length, result);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, worker));
  return result;
}

// ---------- leitura dos preços ----------
/** Melhor preço de um item numa cidade. mode: 'sell' (menor venda) | 'buy' (maior compra). Retorna {price, date} */
export function quote(prices, id, city, mode = 'sell', quality = 1) {
  const q = prices?.[id]?.[city]?.[quality];
  if (!q) return { price: 0, date: null };
  return mode === 'sell' ? { price: q.s, date: q.sd } : { price: q.b, date: q.bd };
}

export const priceOf = (prices, id, city, mode, quality) => quote(prices, id, city, mode, quality).price;

// "agora", "12 min", "3 h", "2 d"
export function ageLabel(ts) {
  if (!ts) return '';
  const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (m < 2) return 'agora';
  if (m < 60) return `${m} min`;
  if (m < 60 * 24) return `${Math.round(m / 60)} h`;
  return `${Math.round(m / 1440)} d`;
}

export function ageClass(ts) {
  if (!ts) return 'age-none';
  const h = (Date.now() - ts) / 3600000;
  return h < 3 ? 'age-fresh' : h < 24 ? 'age-ok' : 'age-old';
}

// ---------- hook ----------
export function usePrices(ids, opts = {}) {
  const { server } = useSettings();
  const { qualities = '1', enabled = true } = opts;
  const key = useMemo(() => [...new Set(ids)].sort().join(','), [ids]);
  const [state, setState] = useState({ prices: null, loading: false, error: null, updatedAt: null });
  const ctl = useRef(null);

  const load = useCallback(
    async (force = false) => {
      ctl.current?.abort();
      if (!key || !enabled) return;
      const c = new AbortController();
      ctl.current = c;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const prices = await fetchPrices(key.split(','), { qualities, force, signal: c.signal, server });
        if (!c.signal.aborted) setState({ prices, loading: false, error: null, updatedAt: Date.now() });
      } catch (e) {
        if (e.name === 'AbortError') return;
        setState((s) => ({ ...s, loading: false, error: e.message }));
      }
    },
    [key, qualities, enabled, server],
  );

  useEffect(() => {
    load(false);
    return () => ctl.current?.abort();
  }, [load]);

  return { ...state, refresh: () => load(true) };
}
