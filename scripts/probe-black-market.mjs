// IDEIA-088, Task 1: sonda do preço do Mercado Negro com a API real. Autônomo (Node >= 18, só fetch), não importa o client/.
// Uso: node scripts/probe-black-market.mjs [saida.md]   (padrão: docs/research/IDEIA-088-probe.md)
// Compara, por (servidor, cidade, item, qualidade), buy_price_max e sell_price_min com o preço REALIZADO do histórico (7 dias completos).
// Limiares 15% / 80% / 70% = decisão de produto (sem fonte). Dado colaborativo: NÃO prova o que o jogador recebe.
import { writeFileSync } from 'node:fs';

const SERVERS = ['west', 'east', 'europe'];
const IDS = ['T4_MAIN_SWORD', 'T4_MAIN_SWORD@1', 'T5_MAIN_SWORD', 'T6_MAIN_SWORD', 'T4_2H_CLAYMORE', 'T4_ARMOR_PLATE_SET1', 'T4_BAG', 'T4_CAPE', 'T4_POTION_HEAL'];
const LOCS = ['Black Market', 'Caerleon', 'Lymhurst'];
const QUALS = '1,2,3,4,5';
const DAY = 86400000;
const TOL = 0.15;
const out = process.argv[2] ?? new URL('../docs/research/IDEIA-088-probe.md', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, tries = 6) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url);
    if (res.status === 429) {
      await sleep(15000 * (i + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
  }
  throw new Error(`429 persistente: ${url}`);
}
const enc = (s) => encodeURIComponent(s);
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const classify = (buy, list, med) => {
  const lb = med > 0 && buy > 0 && Math.abs(buy / med - 1) <= TOL;
  const ll = med > 0 && list > 0 && Math.abs(list / med - 1) <= TOL;
  if (ll && !lb) return 'lista bate';
  if (lb && !ll) return 'compra bate';
  if (lb && ll) return 'ambas batem';
  return 'nenhuma';
};

const nowMs = Date.now();
const toMs = Math.floor(nowMs / DAY) * DAY;
const fromMs = toMs - 7 * DAY;
const rows = [];
for (const server of SERVERS) {
  const base = `https://${server}.albion-online-data.com/api/v2/stats`;
  const q = `locations=${enc(LOCS.join(','))}&qualities=${QUALS}`;
  const prices = await get(`${base}/prices/${IDS.join(',')}?${q}`);
  await sleep(1500);
  const hist = await get(`${base}/history/${IDS.join(',')}?${q}&time-scale=24`);
  await sleep(1500);
  const hmap = new Map();
  for (const h of hist) hmap.set(`${h.location}|${h.item_id}|${h.quality}`, h.data ?? []);
  for (const p of prices) {
    const data = (hmap.get(`${p.city}|${p.item_id}|${p.quality}`) ?? []).filter((d) => {
      const t = Date.parse(d.timestamp.endsWith('Z') ? d.timestamp : `${d.timestamp}Z`);
      return t >= fromMs && t < toMs;
    });
    if (data.length < 3) continue;
    const med = median(data.map((d) => d.avg_price));
    const cnt = data.reduce((a, d) => a + d.item_count, 0);
    const wavg = data.reduce((a, d) => a + d.avg_price * d.item_count, 0) / (cnt || 1);
    rows.push({
      server, city: p.city, id: p.item_id, q: p.quality, buy: p.buy_price_max, list: p.sell_price_min, buyMin: p.buy_price_min, listMax: p.sell_price_max,
      med, wavg, vol: cnt / 7, cls: classify(p.buy_price_max, p.sell_price_min, med), days: data.length,
    });
  }
}

const f = (n) => Math.round(n).toLocaleString('pt-BR');
const table = (list) =>
  ['| servidor | cidade | item | q | buy_price_max | sell_price_min | mediana 7d | média pond. | vol/dia | dias | classe |', '|---|---|---|---|---|---|---|---|---|---|---|']
    .concat(list.map((r) => `| ${r.server} | ${r.city} | ${r.id} | ${r.q} | ${f(r.buy)} | ${f(r.list)} | ${f(r.med)} | ${f(r.wavg)} | ${r.vol.toFixed(1)} | ${r.days} | ${r.cls} |`))
    .join('\n');
const count = (list) => {
  const c = {};
  for (const r of list) c[r.cls] = (c[r.cls] ?? 0) + 1;
  return Object.entries(c).map(([k, v]) => `${k}: ${v}`).join('; ') || '(sem linhas)';
};
const bm = rows.filter((r) => r.city === 'Black Market');
const ctl = rows.filter((r) => r.city !== 'Black Market');
const bmLista = bm.filter((r) => r.cls === 'lista bate' && r.buy < 0.7 * r.med).length;
const bmCompra = bm.filter((r) => r.cls === 'compra bate').length;
const rule = bm.length >= 20 || bm.length > 0 ? (bmLista / bm.length >= 0.8 ? 'R-A' : bmCompra / bm.length >= 0.8 ? 'R-B' : 'R-C') : 'R-C';

const md = `# IDEIA-088: sonda do preço do Mercado Negro (API real)

Gerado em ${new Date(nowMs).toISOString()} por \`scripts/probe-black-market.mjs\`. Servidores: ${SERVERS.join(', ')}. Janela: 7 dias completos UTC (${new Date(fromMs).toISOString().slice(0, 10)} a ${new Date(toMs - DAY).toISOString().slice(0, 10)}), linhas com pelo menos 3 dias.
Dado colaborativo da API: observação, NÃO prova do que o jogador recebe. Limiares 15% / 80% / 70% = decisão de produto, sem fonte.

## Contagens
- Mercado Negro (${bm.length} linhas): ${count(bm)}
- Cidades de controle, Caerleon e Lymhurst (${ctl.length} linhas): ${count(ctl)}
- Mercado Negro com "lista bate" e buy < 70% do realizado: ${bmLista} de ${bm.length}; "compra bate": ${bmCompra} de ${bm.length}.

## Mercado Negro
${table(bm)}

## Controle (cidades normais)
${table(ctl)}

## Regra adotada
**${rule}**. Em qualquer caso \`BM_READING_VERIFIED\` continua \`null\`: o app mostra as duas leituras rotuladas "NÃO VERIFICADO em jogo" e usa a menor no cálculo principal.
`;
writeFileSync(out, md);
console.log(md.split('## Mercado Negro')[0]);
console.log(`Regra: ${rule}; relatório em ${out}`);
