// Extrator de campos gravados por `set({ ... })` no texto de um componente (movido de persistSchemas.test.js na IDEIA-005).
// Usado pelos testes de contrato (persistSchemas.test.js e audit/contract.test.js). Só texto: não importa o app.

/** Campos de primeiro nível de cada `set({ ... })` do texto. */
export function setFields(src) {
  const out = new Set();
  for (const m of src.matchAll(/\bset\(\{/g)) {
    let i = m.index + m[0].length;
    let depth = 0;
    let expectKey = true;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (depth === 0 && expectKey) {
        const id = /^\s*([A-Za-z_]\w*)\s*:/.exec(src.slice(i, i + 80));
        if (id) out.add(id[1]);
        expectKey = false;
      }
      if ('{[('.includes(ch)) depth++;
      else if ('}])'.includes(ch)) {
        if (depth === 0) break;
        depth--;
      } else if (ch === ',' && depth === 0) expectKey = true;
    }
  }
  return out;
}
