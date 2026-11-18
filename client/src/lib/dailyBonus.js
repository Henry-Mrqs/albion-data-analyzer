// Bônus diário informado pelo usuário: detecta quando ele ficou velho (passou do reset do servidor). Pura.
// Horários (dossiê IDEIA-041 D5, confiança MÉDIA): 10:00 UTC Américas/Europa, 23:00 UTC Ásia. Chaves = servidores de settings.js.
export const RESET_UTC_HOUR = { west: 10, europe: 10, east: 23 };
const DAY = 86400000;

/** ms do reset mais recente <= now. Lança se o servidor for desconhecido. */
export function lastReset(now, server) {
  const h = RESET_UTC_HOUR[server];
  if (h == null) throw new Error(`Servidor desconhecido: ${server}`);
  const d = new Date(now);
  const today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h);
  return today <= now ? today : today - DAY;
}

/** Valor efetivo do bônus: informado antes do último reset (ou sem data) = velho, vale 0. Valor 0 nunca avisa. */
export function effectiveDaily({ value, setAt, now, server }) {
  if (!+value) return { value, stale: false };
  if (RESET_UTC_HOUR[server] == null) return { value, stale: false };
  const stale = !(+setAt >= lastReset(now, server));
  return stale ? { value: 0, stale: true } : { value, stale: false };
}
