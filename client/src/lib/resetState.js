// IDEIA-071: lista e apaga SÓ as chaves do app ('albion:' + nome) do armazenamento. PURO: recebe o storage.
// storage = { length, key(i), getItem, removeItem }. Nunca lança.
export const APP_PREFIX = 'albion:'; // sensível a maiúsculas: 'ALBION:x' e 'albionx:y' NÃO casam

/** Chaves do app. Lê todas ANTES de qualquer remoção (os índices do Storage deslocam ao remover). */
export function albionKeys(storage) {
  const keys = [];
  try {
    const n = storage.length;
    for (let i = 0; i < n; i++) {
      const k = storage.key(i);
      if (typeof k === 'string' && k.startsWith(APP_PREFIX)) keys.push(k);
    }
  } catch {
    return [];
  }
  return keys;
}

/** Remove só as chaves do app. Falha em uma chave não impede as outras. */
export function clearAlbionKeys(storage) {
  const removed = [];
  const failed = [];
  for (const k of albionKeys(storage)) {
    try {
      storage.removeItem(k);
      removed.push(k);
    } catch {
      failed.push(k);
    }
  }
  return { removed, failed };
}
