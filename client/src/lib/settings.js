import { useSyncExternalStore } from 'react';

export const SERVERS = {
  west: 'Américas',
  europe: 'Europa',
  east: 'Ásia',
};

const DEFAULTS = { server: 'west', premium: true, feeCeiling: 1000 };
const KEY = 'albion:settings';
const listeners = new Set();
let state = (() => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
})();

export const getSettings = () => state;

export function setSettings(patch) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* modo privado */
  }
  listeners.forEach((l) => l());
}

export function useSettings() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

// estado persistente por calculadora
import { useCallback, useState } from 'react';
export function usePersisted(key, initial) {
  const [value, set] = useState(() => {
    try {
      const raw = localStorage.getItem(`albion:${key}`);
      return raw === null ? initial : JSON.parse(raw);
    } catch {
      return initial;
    }
  });
  const setValue = useCallback(
    (v) =>
      set((prev) => {
        const next = typeof v === 'function' ? v(prev) : v;
        try {
          localStorage.setItem(`albion:${key}`, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      }),
    [key],
  );
  return [value, setValue];
}
