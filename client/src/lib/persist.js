// Núcleo PURO do estado salvo (IDEIA-070): sem React, sem localStorage, sem rede.
// mergeSaved mescla o que estava salvo com os padrões da versão atual; loadPersisted lê o texto
// salvo (versão, migrações, mescla); serializePersisted grava com o campo reservado `_v`.

const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const clone = (v) => (v !== null && typeof v === 'object' ? structuredClone(v) : v);

const issue = (key, field, code, message) => ({ key, field, code, message });

/** Tipo do campo a partir do valor padrão (quando o esquema não diz nada). */
function inferType(def) {
  if (typeof def === 'boolean') return { type: 'bool' };
  if (typeof def === 'number') return { type: 'numText' }; // campos de NumberInput viram texto; a 060 cuida do valor
  if (typeof def === 'string') return { type: 'str' };
  if (Array.isArray(def)) return { type: 'list' };
  if (isObj(def)) return Object.keys(def).length ? { type: 'struct', fields: {} } : { type: 'obj' };
  return { type: 'passthrough' };
}

/** Normaliza o descritor do esquema (string, { enum }, { list }, { map }, { fields }, { type }). */
function resolve(desc, def) {
  if (desc === undefined) return inferType(def);
  if (typeof desc === 'string') return { type: desc };
  if ('enum' in desc) return { type: 'enum', values: desc.enum };
  if ('list' in desc) return { type: 'list', of: desc.list, allowed: desc.allowed };
  if ('map' in desc) return { type: 'map', of: desc.map };
  if ('fields' in desc) return isObj(def) && Object.keys(def).length ? { type: 'struct', fields: desc.fields } : { type: 'obj' };
  return desc;
}

const VARIANT = /^\d+$/;

/** Valida `v` contra o descritor; devolve { ok, value } (a lista e o mapa podem ser filtrados). */
function check(v, d, def, ctx) {
  switch (d.type) {
    case 'bool':
      return { ok: typeof v === 'boolean', value: v };
    case 'boolOrNull':
      return { ok: v === null || typeof v === 'boolean', value: v };
    case 'num':
      return { ok: isNum(v), value: v };
    case 'numText':
      return { ok: isNum(v) || typeof v === 'string', value: v };
    case 'str':
      return { ok: typeof v === 'string', value: v };
    case 'enum':
      return { ok: d.values.includes(v), value: v };
    case 'passthrough':
      return { ok: true, value: v };
    case 'obj':
      return { ok: isObj(v), value: v };
    case 'objOrNull':
      return { ok: v === null || isObj(v), value: v };
    case 'itemRef': // { id: texto, ench: número } (ench ausente = 0)
    case 'itemRefOrNull': {
      if (v === null && d.type === 'itemRefOrNull') return { ok: true, value: null };
      if (!isObj(v) || typeof v.id !== 'string') return { ok: false };
      if (v.ench !== undefined && !isNum(v.ench)) return { ok: false };
      return { ok: true, value: { ...v, ench: v.ench ?? 0 } };
    }
    case 'recipeVariant':
      return { ok: v === 'auto' || (isNum(v) && Number.isInteger(v) && v >= 0) || (typeof v === 'string' && VARIANT.test(v)), value: v };
    case 'list': {
      if (!Array.isArray(v)) return { ok: false };
      const out = v.filter((x) => {
        if (d.of === 'str' && typeof x !== 'string') return false;
        if (d.of === 'num' && !isNum(x)) return false;
        if (!d.of && typeof x !== 'string' && !isNum(x)) return false;
        return !d.allowed || d.allowed.includes(x);
      });
      return { ok: true, value: out };
    }
    case 'map': {
      if (!isObj(v)) return { ok: false };
      const inner = resolve(d.of, undefined);
      const out = {};
      for (const k of Object.keys(v)) {
        if (BAD_KEYS.has(k)) continue;
        if (check(v[k], inner, undefined, ctx).ok) out[k] = v[k];
      }
      return { ok: true, value: out };
    }
    case 'struct': {
      if (!isObj(v)) return { ok: false };
      const r = mergeSaved(v, def, d.fields, ctx.key, ctx.path);
      ctx.issues.push(...r.issues);
      return { ok: true, value: r.value };
    }
    default:
      return { ok: true, value: v };
  }
}

/**
 * Mescla o salvo com os padrões. Campo ausente ganha o padrão; presente e válido mantém o valor salvo
 * SEM coerção; tipo errado volta ao padrão só daquele campo; desconhecidos são preservados (exceto
 * __proto__/constructor/prototype). Não muta as entradas; o resultado não compartilha objetos com os padrões.
 */
export function mergeSaved(saved, defaults, schema = {}, key = '', path = '') {
  const issues = [];
  if (!isObj(saved)) {
    issues.push(issue(key, path, 'not-object', 'o valor salvo não é um objeto; usando os padrões'));
    return { value: clone(defaults), issues };
  }
  const value = {};
  const ctx = { key, issues, path };
  for (const f of Object.keys(defaults)) {
    if (BAD_KEYS.has(f)) continue;
    const fieldPath = path ? `${path}.${f}` : f;
    if (!has(saved, f)) {
      value[f] = clone(defaults[f]);
      continue;
    }
    const d = resolve(schema[f], defaults[f]);
    const r = check(saved[f], d, defaults[f], { ...ctx, path: fieldPath });
    if (r.ok) value[f] = r.value;
    else {
      value[f] = clone(defaults[f]);
      issues.push(issue(key, fieldPath, 'bad-type', `campo ${fieldPath} com tipo inválido; usando o padrão`));
    }
  }
  for (const f of Object.keys(saved)) {
    if (has(defaults, f)) continue;
    const fieldPath = path ? `${path}.${f}` : f;
    if (BAD_KEYS.has(f)) {
      issues.push(issue(key, fieldPath, 'dropped-unknown-proto', `campo ${f} descartado`));
      continue;
    }
    if (schema[f] === undefined) {
      value[f] = clone(saved[f]); // desconhecido: preservado (feeSet, craftDaily, ...)
      continue;
    }
    const r = check(saved[f], resolve(schema[f], undefined), undefined, { ...ctx, path: fieldPath });
    if (r.ok) value[f] = r.value;
    else issues.push(issue(key, fieldPath, 'bad-type', `campo ${fieldPath} com tipo inválido; removido`));
  }
  return { value, issues };
}

const versionOf = (o) => (isNum(o._v) && Number.isInteger(o._v) && o._v >= 0 ? o._v : 0);

/**
 * Lê o texto salvo. Devolve { value, fromVersion, issues, notes }; nunca lança.
 * Objeto: lê `_v` (ausente/inválido = 0), migra em ordem, mescla e devolve SEM `_v`.
 * Primitivo (padrão que não é objeto): valida o tipo contra o padrão (ou schema.$self).
 */
export function loadPersisted(raw, { defaults, version = 1, migrations = {}, schema = {}, notes, key = '' } = {}) {
  const fallback = (issues, fromVersion = 0) => ({ value: clone(defaults), fromVersion, issues, notes: [] });
  if (raw === null || raw === undefined) return fallback([]);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback([issue(key, '', 'invalid-json', 'JSON salvo inválido; usando os padrões')]);
  }

  if (!isObj(defaults)) {
    const d = schema.$self ? resolve(schema.$self, defaults) : { type: typeof defaults === 'number' ? 'num' : typeof defaults === 'string' ? 'str' : typeof defaults === 'boolean' ? 'bool' : 'passthrough' };
    const ctx = { key, issues: [], path: '' };
    const r = check(parsed, d, defaults, ctx);
    if (r.ok) return { value: r.value, fromVersion: 0, issues: [], notes: [] };
    return fallback([issue(key, '', 'bad-type', 'valor salvo com tipo inválido; usando o padrão')]);
  }

  if (!isObj(parsed)) return fallback([issue(key, '', 'not-object', 'o valor salvo não é um objeto; usando os padrões')]);

  const fromVersion = versionOf(parsed);
  const { _v, ...body } = parsed; // eslint-disable-line no-unused-vars
  let noteList;
  try {
    noteList = notes ? notes(body, fromVersion) ?? [] : [];
  } catch {
    noteList = [];
  }
  let obj = body;
  try {
    for (let v = fromVersion + 1; v <= version; v++) {
      if (!migrations[v]) continue;
      obj = migrations[v](structuredClone(obj));
      if (!isObj(obj)) throw new Error('a migração não devolveu um objeto');
    }
  } catch (e) {
    return { ...fallback([issue(key, '', 'migration-failed', `migração falhou: ${e.message}`)], fromVersion), notes: noteList };
  }
  const merged = mergeSaved(obj, defaults, schema, key);
  return { value: merged.value, fromVersion, issues: merged.issues, notes: noteList };
}

/** Texto a gravar: objeto ganha `_v`; primitivo (ou lista) sai puro. */
export function serializePersisted(value, version) {
  return JSON.stringify(isObj(value) ? { ...value, _v: version } : value);
}
