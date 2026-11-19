// Preço do ouro (API `stats/gold` do AODP, IDEIA-054). Parsing e URL puros; o fetch REUSA o request() de market.js
// (como history.js): o 429 é compartilhado e o market.js não muda. Cache de 3 min por servidor, como os preços.
import { useCallback, useEffect, useRef, useState } from 'react';
import { MarketError, request } from './market';
import { useSettings } from './settings';

export const GOLD_TTL_MS = 3 * 60 * 1000;
export const goldDeps = { requestFn: request };

const parseTs = (s) => (typeof s === 'string' && s ? Date.parse(s.endsWith('Z') ? s : `${s}Z`) : NaN);

/** Linhas `[{ price, timestamp }]` -> o ponto mais recente { price, t (ms UTC) } ou null. Linha ruim é ignorada. */
export function parseGold(rows) {
  if (!Array.isArray(rows)) return null;
  let best = null;
  for (const r of rows) {
    const price = r?.price;
    const t = parseTs(r?.timestamp);
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || !Number.isFinite(t)) continue;
    if (!best || t > best.t) best = { price, t };
  }
  return best;
}

export const goldUrl = (server, count = 1) => `https://${server}.albion-online-data.com/api/v2/stats/gold?count=${count}`;

const cache = new Map(); // servidor -> { t, value }
export const clearGoldCache = () => cache.clear();

/** Último preço do ouro do servidor. Erros (inclui throttle) passam como estão; erro e resposta vazia não entram no cache. */
export async function fetchGold({ server, signal, force = false, now = Date.now(), requestFn = goldDeps.requestFn } = {}) {
  const hit = cache.get(server);
  if (!force && hit && now - hit.t < GOLD_TTL_MS) return hit.value;
  const value = parseGold(await requestFn(goldUrl(server), signal, 'ouro'));
  if (!value) throw new MarketError('A API não devolveu o preço do ouro.');
  cache.set(server, { t: now, value });
  return value;
}

/** Hook: busca o ouro do servidor escolhido ao abrir a tela e ao trocar de servidor; `refresh` ignora o cache. */
export function useGold() {
  const { server } = useSettings();
  const [state, setState] = useState({ gold: null, loading: false, error: null });
  const ctl = useRef(null);

  const load = useCallback(async (force = false) => {
    ctl.current?.abort();
    if (!server) return;
    const c = new AbortController();
    ctl.current = c;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const gold = await fetchGold({ server, signal: c.signal, force });
      if (!c.signal.aborted) setState({ gold, loading: false, error: null });
    } catch (e) {
      if (e.name === 'AbortError') return;
      setState({ gold: null, loading: false, error: e.message });
    }
  }, [server]);

  useEffect(() => {
    load(false); // eslint-disable-line react-hooks/set-state-in-effect -- busca externa (API) ao abrir/trocar de servidor, como usePrices
    return () => ctl.current?.abort();
  }, [load]);

  return { ...state, refresh: () => load(true) };
}
