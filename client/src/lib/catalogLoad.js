// Carga do catálogo: URL versionada, validação estrutural e uma nova tentativa com cache-bust.
export const MIN_SCHEMA = 1; // schema ausente no catálogo = 1

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Cada exigência futura de formato = 1 linha aqui + 1 teste.
const REQUIRED = [
  ['items', (d) => Array.isArray(d.items) && d.items.length > 0, 'items (lista não vazia)'],
  ['extra', (d) => isObj(d.extra), 'extra (objeto)'],
  ['vals', (d) => isObj(d.vals), 'vals (objeto)'],
  ['encNames', (d) => isObj(d.encNames), 'encNames (objeto)'],
  ['cityOf', (d) => isObj(d.cityOf) && Object.keys(d.cityOf).length > 0, 'cityOf (objeto não vazio)'],
  ['schema', (d) => d.schema === undefined || (typeof d.schema === 'number' && d.schema >= MIN_SCHEMA), `schema (número >= ${MIN_SCHEMA})`],
];

export function catalogUrl(base, id, bust) {
  const enc = encodeURIComponent;
  let u = `${base}data/catalog.json`;
  if (id) u += `?v=${enc(id)}`;
  if (bust) u += `${id ? '&' : '?'}r=${enc(bust)}`;
  return u;
}

const isAlt = (a) =>
  isObj(a) && Number.isInteger(a.at) && a.at >= 0 && Array.isArray(a.v) && a.v.length > 0 &&
  a.v.every((x) => Array.isArray(x) && typeof x[0] === 'string' && x[0] !== '' && typeof x[1] === 'number');

// DT-007: item null, sem id ou com alt malformado; aponta o índice (no máximo 3 por tipo, para a mensagem não crescer)
function itemProblems(items) {
  const bad = [];
  const badAlt = [];
  const badAt = [];
  items.forEach((it, k) => {
    if (!isObj(it) || typeof it.i !== 'string' || it.i === '') bad.push(k);
    else if (it.alt !== undefined && !isAlt(it.alt)) badAlt.push(k);
    else if (it.alt !== undefined && !(Array.isArray(it.r) && it.alt.at < it.r.length)) badAt.push(k);
  });
  const fmt = (arr) => arr.slice(0, 3).map((k) => `items[${k}]`).join(', ') + (arr.length > 3 ? ` e mais ${arr.length - 3}` : '');
  const out = [];
  if (bad.length) out.push(`item inválido (esperado objeto com id "i" em texto): ${fmt(bad)}`);
  if (badAlt.length) out.push(`alt malformado (esperado {at, v}): ${fmt(badAlt)}`);
  if (badAt.length) out.push(`alt.at fora da receita (índice maior que a lista r): ${fmt(badAt)}`);
  return out;
}

export function validateCatalog(d) {
  if (!isObj(d)) return { ok: false, problems: ['catálogo não é um objeto'] };
  const problems = REQUIRED.filter(([, test]) => !test(d)).map(([, , msg]) => `campo ausente ou inválido: ${msg}`);
  if (Array.isArray(d.items)) problems.push(...itemProblems(d.items));
  return { ok: problems.length === 0, problems };
}

async function get(fetchFn, url, opts) {
  const r = await (opts ? fetchFn(url, opts) : fetchFn(url));
  if (!r.ok) throw new Error(`Catálogo indisponível (HTTP ${r.status})`);
  try {
    return await r.json();
  } catch {
    throw new Error('A resposta do catálogo não é um JSON válido (resposta cortada ou página de erro). Recarregue a página (Ctrl+F5); se persistir, avise o responsável.');
  }
}

export async function fetchCatalog({ fetchFn, base, id, now = Date.now }) {
  const first = await get(fetchFn, catalogUrl(base, id));
  if (validateCatalog(first).ok) return first;
  const second = await get(fetchFn, catalogUrl(base, id, now()), { cache: 'reload' });
  const v = validateCatalog(second);
  if (v.ok) return second;
  throw new Error(`Catálogo desatualizado ou incompleto (${v.problems.join('; ')}). Recarregue a página (Ctrl+F5); se persistir, avise o responsável.`);
}
