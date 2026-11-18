// Resume a diferença entre dois catalog.json.
// Uso: node scripts/catalog-diff.mjs <antigo.json> <novo.json>
import fs from 'node:fs';

const [a, b] = process.argv.slice(2).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
if (!a || !b) {
  console.error('uso: node scripts/catalog-diff.mjs <antigo.json> <novo.json>');
  process.exit(1);
}

const count = (cat, f) => cat.items.filter(f).length;
const stats = {
  itens: (c) => c.items.length,
  'com r (craftáveis)': (c) => count(c, (i) => i.r),
  'com cc': (c) => count(c, (i) => i.cc),
  'com tm': (c) => count(c, (i) => i.tm),
  'ingredientes com 3º elemento': (c) => count(c, (i) => (i.r ?? []).some((x) => x.length > 2)),
  'entradas em cityOf': (c) => Object.keys(c.cityOf ?? {}).length,
};
for (const [k, f] of Object.entries(stats)) console.log(`${k}: ${f(a)} -> ${f(b)}`);
console.log(`itens ${a.items.length} -> ${b.items.length}`);
console.log(`chaves de topo: [${Object.keys(a)}] -> [${Object.keys(b)}]`);
console.log(`built: ${a.built} -> ${b.built}; src: ${a.src ?? '-'} -> ${b.src ?? '-'}`);

const byA = new Map(a.items.map((i) => [i.i, i]));
const byB = new Map(b.items.map((i) => [i.i, i]));
const agg = new Map(); // `${c}|${campo}|${tipo}` -> ids
const bump = (c, field, kind, id) => {
  const k = `${c}\t${field}\t${kind}`;
  if (!agg.has(k)) agg.set(k, []);
  agg.get(k).push(id);
};
for (const [id, nb] of byB) {
  const na = byA.get(id);
  if (!na) {
    bump(nb.c, '(item)', 'adicionado', id);
    continue;
  }
  for (const f of new Set([...Object.keys(na), ...Object.keys(nb)])) {
    if (f === '_s') continue;
    const x = JSON.stringify(na[f]);
    const y = JSON.stringify(nb[f]);
    if (x === y) continue;
    bump(nb.c, f, x === undefined ? 'adicionado' : y === undefined ? 'removido' : 'alterado', id);
  }
}
for (const [id, na] of byA) if (!byB.has(id)) bump(na.c, '(item)', 'removido', id);

if (!agg.size) console.log('nenhuma diferença por item');
else {
  console.log('\ncategoria\tcampo\ttipo\tqtd\texemplos (até 20)');
  for (const [k, ids] of [...agg].sort()) console.log(`${k}\t${ids.length}\t${ids.slice(0, 20).join(' ')}`);
}
