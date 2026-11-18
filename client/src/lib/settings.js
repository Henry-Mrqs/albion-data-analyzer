import { useSyncExternalStore } from 'react';
import { loadPersisted, serializePersisted } from './persist';
import { getPersistedSpec } from './persistSchemas';

export const SERVERS = {
  west: 'Américas',
  europe: 'Europa',
  east: 'Ásia',
};

const DEFAULTS = { server: 'west', premium: true, feeCeiling: 1000 };
const KEY = 'albion:settings';
const SPEC = getPersistedSpec('settings');
const listeners = new Set();
// IDEIA-070: o salvo é mesclado com os padrões e validado (o `_v` nunca aparece no estado)
let state = (() => {
  try {
    return loadPersisted(localStorage.getItem(KEY), { defaults: DEFAULTS, ...SPEC }).value;
  } catch {
    return { ...DEFAULTS };
  }
})();

export const getSettings = () => state;

export function setSettings(patch) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, serializePersisted(state, SPEC.version));
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
      // IDEIA-070: mescla com os padrões, valida tipos e migra formatos antigos (puro, em persist.js)
      return loadPersisted(localStorage.getItem(`albion:${key}`), { defaults: initial, ...getPersistedSpec(key) }).value;
    } catch {
      return initial;
    }
  });
  const setValue = useCallback(
    (v) =>
      set((prev) => {
        const next = typeof v === 'function' ? v(prev) : v;
        try {
          localStorage.setItem(`albion:${key}`, serializePersisted(next, getPersistedSpec(key).version));
        } catch {
          /* ignore */
        }
        return next;
      }),
    [key],
  );
  return [value, setValue];
}
