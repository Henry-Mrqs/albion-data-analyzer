// Gera client/public/data/catalog.json a partir dos dumps oficiais do jogo (ao-bin-dumps).
// Uso: node scripts/build-catalog.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'client', 'public', 'data', 'catalog.json');
// Dump fixado (SHA = HEAD de master em 2026-11-02): a geração do catálogo é reprodutível.
const REF = '0483dd97f1581dfaf02eed42f25f5ea2a3cb75e5';
const REF_DATE = '2026-11-02';
const BASE = `https://raw.githubusercontent.com/ao-data/ao-bin-dumps/${REF}`;

async function download(url, name) {
  const file = path.join(os.tmpdir(), `albion-${REF.slice(0, 8)}-${name}`);
  if (!fs.existsSync(file)) {
    console.log('baixando', url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return fs.readFileSync(file, 'utf8');
}
const cached = async (url, name) => JSON.parse(await download(url, name));

const arr = (x) => (x === undefined ? [] : Array.isArray(x) ? x : [x]);
const num = (x, d = 0) => (x === undefined || x === '' || isNaN(+x) ? d : +x);

const raw = (await cached(`${BASE}/items.json`, 'items.json')).items;
const loc = await cached(`${BASE}/formatted/items.json`, 'loc.json');
const names = new Map(loc.map((l) => [l.UniqueName, l.LocalizedNames || {}]));

const nameOf = (id) => {
  const n = names.get(id) || names.get(id.replace(/@\d$/, '')) || {};
  return [n['PT-BR'] || n['EN-US'] || id, n['EN-US'] || id];
};

// categoria de craft -> cidade com +15% de produção, lida do craftingmodifiers.xml do dump.
// clusterid -> cidade: comentários do próprio XML (<!--thetford--> 0000, ...); Rests ficam de fora.
const CRAFT_CLUSTERS = {
  '0000': 'Thetford', '1000': 'Lymhurst', '2000': 'Bridgewatch', '3004': 'Martlock',
  '4000': 'Fort Sterling', '3003': 'Caerleon', '5000': 'Brecilien',
};
function parseCityOf(xml) {
  const cityOf = {};
  for (const m of xml.matchAll(/<craftinglocation\s+clusterid="(\d+)"[^>]*>([\s\S]*?)<\/craftinglocation>/g)) {
    const city = CRAFT_CLUSTERS[m[1]];
    if (!city) continue;
    for (const mod of m[2].matchAll(/<craftingmodifier\s+name="([^"]+)"\s+value="([\d.]+)"/g)) {
      if (+mod[2] !== 0.15) continue; // ignora +40 (refino) e carne (0.10)
      if (cityOf[mod[1]] && cityOf[mod[1]] !== city) throw new Error(`categoria ${mod[1]} em duas cidades: ${cityOf[mod[1]]} e ${city}`);
      cityOf[mod[1]] = city;
    }
  }
  const n = Object.keys(cityOf).length;
  if (n !== 33) throw new Error(`cityOf deveria ter 33 categorias, tem ${n}: o XML mudou?`);
  return cityOf;
}
const cityOf = parseCityOf(await download(`${BASE}/craftingmodifiers.xml`, 'craftingmodifiers.xml'));

const KINDS = ['simpleitem', 'consumableitem', 'equipmentitem', 'weapon', 'farmableitem'];
const all = new Map();
for (const k of KINDS) for (const it of arr(raw[k])) all.set(it['@uniquename'], { k, it });

// categorias que interessam como produto final
const PRODUCT_CATS = new Set([
  'weapons', 'armors', 'head', 'shoes', 'offhands', 'capes', 'bags', 'consumables', 'artefacts',
]);
const RESOURCE_RE = /^T\d_(PLANKS|METALBAR|LEATHER|CLOTH|STONEBLOCK|WOOD|ORE|HIDE|FIBER|ROCK)$/;

// Transmutação (T4_ORE -> T5_ORE) vem no dump como "receita"; só o texto do botão a distingue.
const isTransmute = (r) => /TRANSMUTE/.test(r['@craftbuttonlocaoverride'] ?? '');

// [[uniqueNameDaEntrada, prata], ...] de todos os requisitos de transmutação, na ordem do dump
function parseTransmute(cr) {
  return arr(cr)
    .filter(isTransmute)
    .map((r) => [arr(r.craftresource)[0]['@uniquename'], num(r['@silver'])]);
}

function parseRecipe(cr) {
  const r = arr(cr).find((x) => !isTransmute(x));
  if (!r) return null;
  const res = arr(r.craftresource).map((c) => [c['@uniquename'], num(c['@count'], 1)]);
  if (!res.length) return null;
  return { a: num(r['@amountcrafted'], 1), f: num(r['@craftingfocus']), s: num(r['@silver']), r: res };
}

// regra: item encantado usa recursos básicos encantados
const ruleRes = (res, n) => res.map(([id, c]) => [RESOURCE_RE.test(id) ? `${id}_LEVEL${n}` : id, c]);
const sameRes = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const items = [];
const needed = new Set();
let deviations = 0;

for (const [id, { it }] of all) {
  if (!/^T\d_/.test(id)) continue;
  const tier = num(it['@tier']);
  const cat1 = it['@shopcategory'];
  const sub = it['@shopsubcategory1'];
  const isResource = RESOURCE_RE.test(id);
  const isProduct = PRODUCT_CATS.has(cat1) && tier >= 3;
  if (!isProduct && !isResource) continue;
  if (id.includes('_LEVEL')) continue;
  if (cat1 === 'artefacts' && sub === 'fragments') continue;
  if (it['@showinmarketplace'] === 'false') continue;

  const base = parseRecipe(it.craftingrequirements);
  const [pt, en] = nameOf(id);
  const entry = {
    i: id,
    p: pt,
    e: en,
    c: `${cat1}/${sub}`,
    t: tier,
    w: num(it['@weight']),
    v: num(it['@itemvalue']),
  };
  if (it['@craftingcategory']) entry.cc = it['@craftingcategory'];
  const enchs = arr(it.enchantments?.enchantment);
  entry.x = enchs.length;
  if (base) {
    entry.a = base.a;
    entry.f = base.f;
    entry.r = base.r;
    base.r.forEach(([rid]) => needed.add(rid));
    const er = {};
    for (const en of enchs) {
      const n = num(en['@enchantmentlevel']);
      const rec = parseRecipe(en.craftingrequirements);
      if (!rec) continue;
      rec.r.forEach(([rid]) => needed.add(rid));
      if (!sameRes(rec.r, ruleRes(base.r, n))) {
        er[n] = rec.r;
        deviations++;
      }
    }
    if (Object.keys(er).length) entry.er = er;
  }
  if (isResource) {
    // recursos encantados são itens próprios (T4_PLANKS_LEVEL1) com receita própria
    const er = {};
    const tm = {};
    const tm0 = parseTransmute(it.craftingrequirements);
    if (tm0.length) {
      tm[0] = tm0;
      tm0.forEach(([rid]) => needed.add(rid));
    }
    for (let n = 1; n <= 4; n++) {
      const v = all.get(`${id}_LEVEL${n}`);
      if (!v) continue;
      entry.x = n;
      const tmn = parseTransmute(v.it.craftingrequirements);
      if (tmn.length) {
        tm[n] = tmn;
        tmn.forEach(([rid]) => needed.add(rid));
      }
      const rec = parseRecipe(v.it.craftingrequirements);
      if (rec) {
        er[n] = rec.r;
        rec.r.forEach(([rid]) => needed.add(rid));
      }
    }
    if (Object.keys(er).length) entry.er = er;
    if (Object.keys(tm).length) entry.tm = tm;
  }
  items.push(entry);
}

// ingredientes citados (artefatos, extratos, runas...) sem receita
const have = new Set(items.map((x) => x.i));
const extra = {};
const vals = {};
for (const rid of needed) {
  vals[rid] = num(all.get(rid)?.it?.['@itemvalue']);
  const baseId = rid.replace(/_LEVEL\d$/, '');
  if (have.has(baseId) || extra[baseId]) continue;
  const [pt, en] = nameOf(baseId);
  extra[baseId] = [pt, en, num(all.get(baseId)?.it?.['@weight'])];
}

// nomes dos recursos encantados (variações "Incomum", "Raro"...) vêm do próprio dump
const encNames = {};
for (const e of items) {
  if (!RESOURCE_RE.test(e.i)) continue;
  for (let n = 1; n <= 4; n++) {
    const [pt] = nameOf(`${e.i}_LEVEL${n}@${n}`);
    if (pt && pt !== `${e.i}_LEVEL${n}@${n}`) encNames[`${e.i}@${n}`] = pt;
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ built: REF_DATE, src: REF, cityOf, items, extra, vals, encNames }));
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`ok: ${items.length} itens, ${Object.keys(extra).length} extras, ${deviations} receitas encantadas fora da regra, ${kb} KB`);
