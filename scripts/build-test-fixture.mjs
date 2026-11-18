// Gera client/src/test/catalog.fixture.json: corte fixo do catálogo real para os testes.
// Uso (na raiz do repositório): node scripts/build-test-fixture.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'client', 'public', 'data', 'catalog.json');
const OUT = path.join(ROOT, 'client', 'src', 'test', 'catalog.fixture.json');

// Lista fixa de ids. Cadeias de T6_METALBAR/T6_LEATHER abaixo do T6 ficam ausentes de propósito.
const IDS = [
  'T2_WOOD', 'T3_WOOD', 'T4_WOOD', 'T2_PLANKS', 'T3_PLANKS', 'T4_PLANKS',
  'T4_2H_BOW', 'T6_MAIN_SWORD', 'T6_MAIN_SWORD_CRYSTAL', 'T6_ARTEFACT_MAIN_SWORD_CRYSTAL',
  'T6_ARMOR_PLATE_SET1', 'T6_METALBAR', 'T6_LEATHER',
  'T6_POTION_COOLDOWN', // poção com 4 ingredientes e amount 5
  // IDEIA-038: casos 1 a 16 do dossiê (cidade de bônus por craftingcategory)
  'T4_MAIN_SWORD', 'T4_ARMOR_CLOTH_SET1', 'T4_HEAD_CLOTH_SET1', 'T4_SHOES_LEATHER_SET1', 'T4_SHOES_CLOTH_SET1',
  'T4_OFF_BOOK', 'T4_OFF_TORCH', 'T4_OFF_SHIELD', 'T4_BAG', 'T4_BAG_INSIGHT', 'T4_CAPE', 'T4_POTION_HEAL',
  'T4_MEAL_SALAD', 'T4_2H_KNUCKLES_SET1', 'T4_CAPEITEM_FW_LYMHURST', 'T4_ARMOR_PLATE_ROYAL',
];
const ids = new Set(IDS);
const baseOf = (k) => k.replace(/@\d$/, '').replace(/_LEVEL\d$/, '');

const cat = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const items = cat.items.filter((it) => ids.has(it.i)).sort((a, b) => (a.i < b.i ? -1 : 1));

const ingredients = new Set();
for (const it of items) {
  for (const [id] of it.r ?? []) ingredients.add(baseOf(id));
  for (const lvl of Object.values(it.er ?? {})) for (const [id] of lvl) ingredients.add(baseOf(id));
}

const pick = (obj, keep) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => keep(k)).sort(([a], [b]) => (a < b ? -1 : 1)));

const out = {
  built: cat.built,
  src: cat.src,
  cityOf: cat.cityOf,
  items,
  extra: pick(cat.extra, (k) => ids.has(k)),
  vals: pick(cat.vals, (k) => ids.has(baseOf(k)) || ingredients.has(baseOf(k))),
  encNames: pick(cat.encNames, (k) => ids.has(baseOf(k))),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`fixture: ${items.length} itens, ${Object.keys(out.vals).length} vals`);
