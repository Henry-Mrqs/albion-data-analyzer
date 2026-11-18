# IDEIA-010 — Liquidez (volume vendido por dia, API `history` do AODP): plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-010`. Comandos `npm` em `client/`. **Pré-requisitos (assumidos mesclados):** IDEIA-001, 019, 023, 030, 038, 057, 060, 066 e 067 (usa `inputRules.js`, `exits.js`, `fmt`/`Money` seguros, URL do catálogo versionada). **Regra do briefing:** escreva cada teste, **rode e veja falhar** antes de implementar (lição de D-033: o TDD pulado na 060 deixou 2 comportamentos sem proteção).

**Objetivo:** mostrar, para o item aberto no Craft (por cidade de venda) e para as linhas do topo do Flipper, quantas unidades se vendem por dia, a mediana dos preços de venda, "dias para vender o lote" e um veredito de giro que **distingue** "sem dados" de "sem giro". Fonte: `docs/research/IDEIA-010.md` (L1 a L8, fórmulas, §4 com dados reais). É regra de produto sobre dado da API, não regra do jogo.

**Arquitetura:** (1) `lib/liquidity.js` puro: estatística da janela, classificação e contas (sem rede, sem React). (2) `lib/history.js`: `parseHistory` (puro, separado do fetch), `historyUrl`, cache próprio do histórico, `fetchHistory` e o hook `useHistory`. (3) **Reuso sem enfraquecer** o cliente de preços: `fetchHistory` chama o mesmo `request()` de `market.js` (mesmo `blockedUntil`: um 429 em preços ou histórico pausa os dois, mesmo tratamento de "Throttled", mesmos erros `MarketError`) e o mesmo `chunk()`; `market.js` só ganha dois `export`. Concorrência do histórico menor que a dos preços (2 contra 3), cap de requisições por chamada e carga **sob demanda**.

## Fatos da API conferidos pelo Planejador (2026-11-18, consulta real à API West, só leitura)
- `GET …/api/v2/stats/history/T4_BAG,T4_MAIN_SWORD?locations=Caerleon,Black%20Market,Lymhurst&time-scale=24&qualities=1` → 200, gzip, `etag`, linhas `{location, item_id, quality, data:[{item_count, avg_price, timestamp}]}` (dossiê L2). A localização do Mercado Negro volta como **`"Black Market"`** (com espaço), e o pedido com `Black%20Market` funciona (igual ao `fetchPrices`).
- A janela devolvida é de ~30 dias (de 2026-10-19 a 2026-11-17 no `T4_BAG`); **dias sem registro de venda não aparecem** (Caerleon/`T4_MAIN_SWORD`: 26 pontos, último em 2026-11-13; Lymhurst: 23 pontos, último em 2026-11-10, ou seja, **8 dias sem nenhum ponto**). Isto fixa o desenho do "sem dados × sem giro" abaixo.
- Os números do dossiê (82, 61, 100… e 4.403, 4.779…) são de uma consulta anterior; a API ao vivo já mostra 80 e 4.421 para o primeiro dia. Os testes usam as **constantes do dossiê**, nunca a API ao vivo.

## Regras do produto (todas sem fonte de jogo; constantes nomeadas em `liquidity.js`)

```js
export const HISTORY_DAYS = 7;              // janela (dossiê §2: N = 7 padrão); dias COMPLETOS: a janela termina ontem (UTC), hoje (parcial) fica fora
export const NO_TURNOVER_PER_DAY = 5;       // abaixo disto: "sem giro" (dossiê §2: sugestão 5/dia, precisa de calibração)
export const LOW_TURNOVER_PER_DAY = 15;     // abaixo disto: "pouco giro" (dossiê §4: exemplo de limiar 15/dia)
export const MIN_POINTS_IN_WINDOW = 3;      // menos dias com venda registrada que isto: "dado esparso", sem veredito de giro (decisão de produto)
export const DEFAULT_SHARE_PCT = 10;        // fatia do volume que você espera capturar (dossiê: padrão 10 a 20%)
export const PRICE_ABOVE_MEDIAN_WARN = 0.2; // alerta "preço acima da mediana" a partir de +20% (decisão de produto)
```
Todas ficam num único bloco, fáceis de mudar; os testes importam as constantes (não repetem os números) **e** há testes de borda com os valores atuais.

```
janela(now)        = os HISTORY_DAYS dias UTC completos que terminam na véspera de now
pontos(janela)     = pontos da série cujo timestamp (UTC, sem 'Z' = UTC) cai na janela
volume_dia         = soma(item_count dos pontos da janela) / HISTORY_DAYS         // dia sem ponto conta 0 (a API só registra dias com venda)
mediana_preço      = mediana(avg_price dos pontos da janela)                       // par: média dos 2 centrais
dias_para_vender(q, share) = q / (volume_dia × share/100)                          // null se volume_dia = 0
preço_vs_mediana(p, mediana) = p / mediana − 1
estado(série, now):
  'nodata'  se a série não existe ou está vazia                  // item/cidade sem histórico: NÃO é "sem giro"
  'idle'    se há série, mas nenhum ponto na janela              // "sem venda registrada em 7 dias (último registro: dd/mm)"
  'sparse'  se 1 ≤ pontos < MIN_POINTS_IN_WINDOW
  'none'    se volume_dia < NO_TURNOVER_PER_DAY                  // "sem giro"
  'low'     se volume_dia < LOW_TURNOVER_PER_DAY                 // "pouco giro"
  'ok'      caso contrário
```
`idle` não afirma "sem demanda": a tela diz "sem venda registrada" (os dados do AODP são colaborativos, dossiê L4).

## Arquivos: exclusivos, compartilhados, ordem

**Criados:** `client/src/lib/liquidity.js`, `liquidity.test.js`, `client/src/lib/history.js`, `history.test.js`, `client/src/components/Giro.jsx` (apresentação do cartão/células).
**Alterados:** `client/src/lib/market.js` (**só** `export` em `request` e `chunk`), `client/src/lib/exits.js` (+ função `illusoryHint`, sem mudar regra) e `exits.test.js` (DT-003, DT-004), `client/src/lib/inputRules.js` + `inputRules.test.js` (campo `share`; DT-008 se ainda aberta), `client/src/components/Crafting.jsx`, `client/src/components/Flipper.jsx`.
**NÃO toca:** `settings.js` (a ideia só lê `server`), `econ.js`, `craftPlan.js`, `flip.js`, `catalog.js`, `build-catalog.mjs`, `catalog.json`, fixture, `refinePlan.js`, `Refining.jsx`, `Market.jsx`, `vercel.json`, `vite.config.js`.
**Compartilhados com 002 e 049:** `Crafting.jsx` (010: tabela "Onde vender" e cartão "Giro"; 002: bloco Produção e cartão "Foco"; 049: seletor de receita no topo e `ids`): regiões distintas. `inputRules.js` (010: `share`; 002: `efficiency`, `focusPoints`, `focusBudget`): acréscimos separados no mesmo `validateInputs`; rebase simples. `exits.js`: só a 010 (DT-004).
**Compartilhado com 060/041:** nada novo.
**Ordem recomendada:** a 010 não depende de catálogo: pode rodar **em paralelo com a 039** (grupo catálogo). Ordem entre as três deste lote: **010 → (039 →) 049 → 002**, porque 049 e 002 regeneram o catálogo e disputam `build-catalog.mjs`/fixture, enquanto a 010 não toca nesses arquivos. 010 é base de 062, 053 e 065.

## Interfaces

```js
// liquidity.js (puro)
windowOf(now, days = HISTORY_DAYS): { fromMs, toMs }                      // [início do 1º dia, início de hoje) em UTC
windowStats(series /* [{t, n, p}] */, { now, days }): { state, volumePerDay, points, medianPrice, lastRecord }   // state como acima
daysToSell(qty, volumePerDay, sharePct): number | null
priceVsMedian(price, median): number | null
verdictLabel(state): string           // textos curtos para a tela ("sem dados", "sem venda registrada", "dado esparso", "sem giro", "pouco giro", "giro ok")
// history.js
parseHistory(rows): { [mid]: { [city]: Array<{ t: number, n: number, p: number }> } }   // só quality 1; t em ms UTC, ordenado; 'BlackMarket' -> 'Black Market'; linha com data:[] vira []
historyUrl({ server, ids, cities, scale = 24, qualities = '1' }): string
fetchHistory(ids, { cities = SELL_CITIES, force, signal, onProgress, server = getSettings().server, now = Date.now(), requestFn = request }):
  Promise<{ data: { [mid]: { [city]: series } }, truncated: boolean }>   // série [] = pedido e sem registros; ausente = não pedido/falhou
useHistory(ids, { cities, enabled }): { history, loading, error }
// Giro.jsx: <GiroCell stats /> e <GiroCard rows units sharePct /> (só apresentação)
```
Constantes de `history.js`: `HISTORY_TTL_MS = 60 * 60 * 1000` (dado diário; decisão de produto), `HISTORY_CONCURRENCY = 2`, `HISTORY_MAX_REQUESTS = 5` (por chamada), `HISTORY_TOP_N = 30` (Flipper).

## Onde aparece e UI

- **Craft, tabela "Onde vender":** nova coluna **Giro** com "98,6/dia" (cor por veredito) ou "sem dados" / "sem venda registrada (último 10/11)" / "dado esparso"; o tooltip mostra a mediana de 7 dias do preço.
- **Craft, cartão "Giro do item":** por cidade de venda, volume/dia, mediana de 7 dias, **dias para vender o lote** (`units` do cálculo) e o campo "Parte do mercado que você espera capturar (%)" (padrão 10); alerta amarelo "preço acima da mediana de 7 dias em 25%" quando o melhor destino ultrapassa o limiar.
- **Flipper:** coluna **Giro (un./dia)** (vazia até carregar) e botão **"Carregar giro das 30 primeiras"**, com barra de progresso; nada é buscado sem o clique. O catálogo inteiro nunca é consultado.
- A nota "Giro (vendas/dia): sem dado" da dica da tabela é removida (agora há dado), e o "24 h" fixo vira `DEFAULT_MAX_AGE_H` (DT-003).

## Tasks (1 commit cada; testes primeiro, vistos falhar)

### Task 1: estatística da janela (`liquidity.js`), dados reais do dossiê §4
**Files:** Create `liquidity.test.js`, `liquidity.js`.
- [ ] **Step 1: testes falhando** (`Failed to resolve import "./liquidity"`). Séries do dossiê (constantes); `now = Date.parse('2026-10-26T03:00:00Z')` (a janela é 19 a 25/10):

```js
const D = (day) => Date.parse(`2026-10-${day}T00:00:00Z`);
const series = (counts, prices, start = 19) => counts.map((n, i) => ({ t: D(start + i), n, p: prices[i] }));
const BAG = series([82, 61, 100, 141, 131, 116, 59], [4403, 4779, 4445, 4733, 5751, 12621, 10594]);
const SWORD = series([7, 8, 21, 4, 6, 7, 23], [8431, 5381, 2009, 5498, 8316, 10999, 6309]);
const now = Date.parse('2026-10-26T03:00:00Z');
it('T4_BAG: 690 / 7 = 98,57 un./dia; mediana 4.779; giro ok', () => {
  const s = windowStats(BAG, { now }); expect(s.volumePerDay).toBeCloseTo(98.5714, 4); expect(s.medianPrice).toBe(4779); expect(s.points).toBe(7); expect(s.state).toBe('ok'); });
it('T4_MAIN_SWORD: 76 / 7 = 10,86; mediana 6.309; passa o limiar 5 e cai em "pouco giro" (< 15)', () => {
  const s = windowStats(SWORD, { now }); expect(s.volumePerDay).toBeCloseTo(10.8571, 4); expect(s.medianPrice).toBe(6309); expect(s.state).toBe('low'); });
it('dias para vender 300 bolsas: 30,4 dias a 10% e 12,2 a 25%', () => { expect(daysToSell(300, 690 / 7, 10)).toBeCloseTo(30.4348, 4); expect(daysToSell(300, 690 / 7, 25)).toBeCloseTo(12.1739, 4); });
it('preço planejado 6.000 contra a mediana 4.779 = +25,5%', () => expect(priceVsMedian(6000, 4779)).toBeCloseTo(0.2555, 4));
it('mediana com quantidade par é a média dos dois centrais', () => expect(windowStats(series([1, 1, 1, 1], [10, 40, 20, 30]), { now: D(23) + 3600e3 }).medianPrice).toBe(25));
it('média simples (6.760,86) e ponderada (6.676,64) NÃO são a mediana: o código usa a mediana (dossiê L5)', () => expect(windowStats(BAG, { now }).medianPrice).not.toBeCloseTo(6760.86, 1));
describe('estados: sem dados × sem giro', () => {
  it('série ausente, [] ou undefined = nodata (não é sem giro)', () => { for (const s of [undefined, null, []]) expect(windowStats(s, { now }).state).toBe('nodata'); });
  it('série com dados antigos e nenhum ponto na janela = idle, com o último registro', () => {
    const old = [{ t: Date.parse('2026-10-10T00:00:00Z'), n: 50, p: 100 }]; const s = windowStats(old, { now }); expect(s.state).toBe('idle'); expect(s.lastRecord).toBe(old[0].t); expect(s.volumePerDay).toBe(0); });
  it('caso real de hoje: Lymhurst/T4_MAIN_SWORD, último ponto 10/11, janela 11 a 17/11 => idle', () => expect(windowStats([{ t: Date.parse('2026-11-10T00:00:00Z'), n: 3, p: 5000 }], { now: Date.parse('2026-11-18T11:00:00Z') }).state).toBe('idle'));
  it('1 a 2 pontos na janela = sparse, mesmo com volume baixo', () => expect(windowStats(series([1, 2], [10, 10]), { now: D(21) + 1e6 }).state).toBe('sparse'));
});
describe('bordas (matam < × <=)', () => {
  it('volume exatamente 5 não é "none"; 4,99 é; exatamente 15 é "ok"; 14,99 é "low"', () => { /* 7 pontos somando 35 → 5/dia = 'low'; 34 → 'none'; 105 → 15/dia = 'ok'; 104 → 'low' */ });
  it('janela: o dia de hoje (parcial) fica fora; o primeiro dia (há 7 dias) entra; o de há 8 dias não', () => { /* pontos em now-0d, now-1d, now-7d, now-8d */ });
  it('série desordenada e ponto com timestamp sem Z são tratados como UTC', () => { /* embaralhar BAG: mesmo resultado */ });
  it('MIN_POINTS_IN_WINDOW: 2 pontos = sparse, 3 = classifica', () => {});
});
```
  Contas do dossiê §4: BAG soma 82+61+100+141+131+116+59 = **690** → **98,57**; mediana (ordenados 4.403, 4.445, 4.733, 4.779, 5.751, 10.594, 12.621) = **4.779**; 300 / (98,57 × 0,10) = **30,4**; × 0,25 → **12,2**. SWORD soma **76** → **10,86**; mediana **6.309**. 6.000 / 4.779 − 1 = **0,2555**.
- [ ] **Step 2:** `npx vitest run src/lib/liquidity.test.js` → FAIL. **Step 3:** implementar `windowOf`, `windowStats`, `daysToSell`, `priceVsMedian`, `verdictLabel` e as constantes. **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: liquidity.js, estatística de giro por janela com estados nodata/idle/sparse/none/low/ok`.

### Task 2: `parseHistory` e `historyUrl` (puros, separados do fetch)
**Files:** Create `history.test.js`, `history.js` (parte pura).
- [ ] **Step 1: testes falhando** com linhas no formato real (L2), sem rede:

```js
const rows = [
  { location: 'Caerleon', item_id: 'T4_BAG', quality: 1, data: [{ item_count: 61, avg_price: 4779, timestamp: '2026-10-20T00:00:00' }, { item_count: 82, avg_price: 4403, timestamp: '2026-10-19T00:00:00' }] },
  { location: 'Black Market', item_id: 'T4_BAG', quality: 1, data: [] },
  { location: 'BlackMarket', item_id: 'T4_MAIN_SWORD', quality: 1, data: [{ item_count: 2, avg_price: 9000, timestamp: '2026-10-19T00:00:00' }] },
  { location: 'Caerleon', item_id: 'T4_BAG', quality: 2, data: [{ item_count: 9, avg_price: 1, timestamp: '2026-10-19T00:00:00' }] },
];
it('agrupa por item e cidade, ordena por data e lê o timestamp sem Z como UTC', () => {
  const h = parseHistory(rows); expect(h.T4_BAG.Caerleon).toEqual([{ t: Date.parse('2026-10-19T00:00:00Z'), n: 82, p: 4403 }, { t: Date.parse('2026-10-20T00:00:00Z'), n: 61, p: 4779 }]); });
it('"BlackMarket" e "Black Market" viram "Black Market"; data:[] vira [] (pedido sem registros)', () => { const h = parseHistory(rows); expect(h.T4_MAIN_SWORD['Black Market']).toHaveLength(1); expect(h.T4_BAG['Black Market']).toEqual([]); });
it('qualidade diferente de 1 é ignorada', () => expect(parseHistory(rows).T4_BAG.Caerleon).toHaveLength(2));
it('entradas ruins: não é array, item_count não numérico, timestamp inválido: linhas puladas, sem exceção', () => { expect(parseHistory(null)).toEqual({}); expect(parseHistory([{ location: 'X', item_id: 'T4_X', quality: 1, data: [{ item_count: 'a', avg_price: 1, timestamp: 'zzz' }] }]).T4_X.X).toEqual([]); });
it('historyUrl: servidor, ids e cidades codificados, time-scale=24, qualities=1', () => expect(historyUrl({ server: 'west', ids: ['T4_BAG', 'T4_PLANKS_LEVEL1@1'], cities: ['Caerleon', 'Black Market'] }))
  .toBe('https://west.albion-online-data.com/api/v2/stats/history/T4_BAG,T4_PLANKS_LEVEL1%401?locations=Caerleon%2CBlack%20Market&time-scale=24&qualities=1'));
```
  (A forma exata da URL segue o padrão de `fetchPrices`: `ids.map(encodeURIComponent).join(',')`, `locations=${encodeURIComponent(cities.join(','))}`; o Executor confere o `@` e a vírgula com uma chamada real e ajusta o teste ao que a API aceita.)
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: parseHistory e historyUrl (puros)`.

### Task 3: `fetchHistory` com cache próprio, reuso do cliente e limites
**Files:** Modify `market.js` (só `export`), `history.test.js`, `history.js`.
- [ ] **Step 1: testes falhando** (`requestFn` falso injetado; `now` injetado):

```js
const R = (n) => [{ location: 'Caerleon', item_id: n, quality: 1, data: [{ item_count: 10, avg_price: 100, timestamp: '2026-10-19T00:00:00' }] }];
it('reusa o request() de market.js por padrão (mesmo throttle e mesmos erros)', () => expect(historyDeps.requestFn).toBe(marketRequest));
it('pede, devolve e CACHEIA por TTL (1 h): 2ª chamada igual não faz requisição', async () => {
  const rq = vi.fn().mockResolvedValue(R('T4_BAG')); const o = { cities: ['Caerleon'], requestFn: rq, now: 1e12 };
  await fetchHistory(['T4_BAG'], o); await fetchHistory(['T4_BAG'], { ...o, now: 1e12 + HISTORY_TTL_MS - 1 }); expect(rq).toHaveBeenCalledTimes(1);
  await fetchHistory(['T4_BAG'], { ...o, now: 1e12 + HISTORY_TTL_MS + 1 }); expect(rq).toHaveBeenCalledTimes(2); });
it('force ignora o cache', async () => { /* 2 chamadas com force */ });
it('cache negativo: id sem registros (resposta vazia) vira [] e não é pedido de novo dentro do TTL', async () => {
  const rq = vi.fn().mockResolvedValue([]); const r = await fetchHistory(['T9_NADA'], { cities: ['Caerleon'], requestFn: rq, now: 1e12 });
  expect(r.data.T9_NADA.Caerleon).toEqual([]); await fetchHistory(['T9_NADA'], { cities: ['Caerleon'], requestFn: rq, now: 1e12 + 1 }); expect(rq).toHaveBeenCalledTimes(1); });
it('cache por servidor e por lista de cidades', async () => { /* west ≠ europe; ['A'] ≠ ['A','B'] => requisições separadas */ });
it('só pede o que falta (parte no cache): ids novos entram numa requisição, os antigos não', async () => {});
it('chunks respeitam MAX_URL e o cap HISTORY_MAX_REQUESTS: 400 ids => 5 requisições, truncated=true, só os ids pedidos entram em data', async () => {});
it('concorrência nunca passa de HISTORY_CONCURRENCY (2)', async () => { /* requestFn com contador de em-voo e await de microtask */ });
it('429/throttle: rejeita com o MarketError original; chunks já concluídos ficam no cache', async () => {
  const err = new MarketError('x', 'throttle', 123); const rq = vi.fn().mockResolvedValueOnce(R('A')).mockRejectedValueOnce(err);
  await expect(fetchHistory(idsDeDoisChunks, { cities: ['Caerleon'], requestFn: rq, now: 1e12 })).rejects.toBe(err); /* a 1ª parte segue cacheada */ });
it('AbortError não vira MarketError e não cacheia', async () => {});
it('onProgress(done, total) é chamado uma vez por chunk', async () => {});
```
- [ ] **Step 2:** FAIL. **Step 3:** em `market.js` trocar `async function request` por `export async function request` e `function chunk` por `export function chunk` (nenhuma outra linha); implementar `fetchHistory`/`useHistory` em `history.js` (mesmo padrão de worker de `fetchPrices`, concorrência 2, `now`/`requestFn` injetáveis; `useHistory` espelha `usePrices`: aborta ao trocar de ids, `enabled`). **Step 4:** PASS; `npm test` inteiro (os testes de preços não podem mudar: prova de que `market.js` não foi enfraquecido). **Step 5: Commit:** `feat: fetchHistory com cache de 1 h, cap de requisições e throttle compartilhado`.

### Task 4: `share` em `inputRules.js` e DT-008 (se ainda aberta)
**Files:** Modify `inputRules.test.js`, `inputRules.js`.
- [ ] **Step 1: testes falhando:** `validateInputs({ share })`: vazio → `DEFAULT_SHARE_PCT` (10) sem aviso; `25` → 25; `0`, `-5`, `'abc'` → 10 com `error`; `150` → 100 com `warn`; `0,5` → 0,5 (aceita; alvo muito baixo é legítimo); idempotente.
- [ ] **Step 2:** FAIL; **Step 3:** implementar o campo (mesma forma dos outros). **Step 4: DT-008 (só se `grep -n "1e15" client/src/lib/*.test.js` não achar teste de `fmt` no limite):** acrescentar testes de `fmt` para `1e15` exato (notação científica) e `-1e15` (módulo), do botão "Aceitar" (limite 1e6) e de `CeilingNotice`/`Money` **pelas funções puras** (sem jsdom; DT-002). **Step 5:** PASS; `npm run check`. **Step 6: Commit:** `feat: campo share validado; fecha DT-008 (testes de fmt/teto)`.

### Task 5: `exits.js`: `illusoryHint` (DT-003) e testes fortes (DT-004)
**Files:** Modify `exits.test.js`, `exits.js`.
- [ ] **Step 1: testes falhando** (DT-004 fecha os 8 mutantes do laudo da 066; cada teste abaixo mata um deles; `now = 1e12`, `H = 3.6e6`):

```js
it('M15: comprador VELHO com valor MAIOR que o fresco não vence em bestBuyer', () => {
  const p = mkPrices({ T4_X: { Martlock: { b: 9000, bd: now - 30 * H }, Caerleon: { b: 3000, bd: now - H } } });
  expect(bestBuyer(p, 'T4_X', { now })).toMatchObject({ price: 3000, city: 'Caerleon' }); });
it('M2: compra 0 com data fresca não é comprador', () => expect(cityBuyer(mkPrices({ T4_X: { Caerleon: { b: 0, bd: now } } }), 'T4_X', 'Caerleon', { now }).buyer).toBe(false));
it('M9b: bestReal pula a saída VELHA mesmo sendo a primeira não ilusória', () => {
  const opts = [{ city: 'A', mode: 'instant', illusory: false, stale: true }, { city: 'B', mode: 'instant', illusory: false, stale: false }]; expect(pickExit(opts).bestReal.city).toBe('B'); });
it('M11: saída instantânea anotada sempre tem comprador', () => expect(annotateOptions([{ city: 'Caerleon', mode: 'instant', price: 100, date: now }], mkPrices({}), 'T4_X', { now })[0]).toMatchObject({ buyer: true, illusory: false }));
it('M12: annotateOptions não muta a entrada (buyer e illusory ausentes na original)', () => { const o = [{ city: 'Caerleon', mode: 'order', price: 100, date: now }]; annotateOptions(o, mkPrices({}), 'T4_X', { now }); expect(o[0]).not.toHaveProperty('buyer'); expect(o[0]).not.toHaveProperty('illusory'); });
it('M16: empate de preço de compra: vence a primeira cidade na ordem de SELL_CITIES', () => { /* Martlock e Thetford com b igual → Martlock */ });
it('M18: ordem de venda cuja compra da cidade é VELHA fica ilusória', () => {
  const p = mkPrices({ T4_X: { Caerleon: { s: 100, sd: now, b: 90, bd: now - 30 * H } } });
  expect(annotateOptions([{ city: 'Caerleon', mode: 'order', price: 100, date: now }], p, 'T4_X', { now })[0]).toMatchObject({ buyer: false, illusory: true }); });
it('M19: stale da ordem usa a data da ordem, não a da compra', () => {
  const p = mkPrices({ T4_X: { Caerleon: { s: 100, sd: now - 30 * H, b: 90, bd: now } } });
  expect(exitsFor(p, 'T4_X', { now }).find((e) => e.mode === 'order').stale).toBe(true); });
it('DT-003: illusoryHint usa o limite recebido, não 24 fixo', () => { expect(illusoryHint(12)).toMatch(/12 h/); expect(illusoryHint()).toMatch(new RegExp(`${DEFAULT_MAX_AGE_H} h`)); });
```
- [ ] **Step 2:** rodar: M2/M9b/M11/M12/M15/M16/M18/M19 **já passam** (o código está certo, laudo da 066); `illusoryHint` falha (inexistente). Para provar que os testes novos protegem, **mutar a mão** cada trecho correspondente de `exits.js` numa cópia e conferir que o teste falha (script do Executor fora do repositório); registrar a tabela no commit. **Step 3:** implementar `illusoryHint(maxAgeH = DEFAULT_MAX_AGE_H)` em `exits.js` com o texto atual da dica ("Ilusória: ordem de venda sem ordem de compra visível na cidade (dado com menos de {h} h).") **sem** a frase "Giro … sem dado". **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `test: fecha DT-004 (8 mutantes de exits.js) e DT-003 (illusoryHint)`.

### Task 6: Craft: coluna Giro, cartão "Giro do item", dica sem "24 h" fixo
**Files:** Create `components/Giro.jsx`; Modify `Crafting.jsx`.
- [ ] **Step 1:** em `Crafting.jsx`: `const { history } = useHistory([targetMid], { cities: SELL_CITIES, enabled: !!rec && !!prices })` (só depois de os preços chegarem; só o item final); `const stats = (city) => windowStats(history?.[targetMid]?.[city], { now })` com `now` de `useState(Date.now)`; coluna **Giro** na tabela "Onde vender" (`<GiroCell stats={stats(o.city)} />`); cartão "Giro do item" abaixo da tabela com o campo `share` (`validateInputs({ share: cfg.share })`, `InputIssues` sob o campo; `cfg.share` novo em `craft:cfg`); `daysToSell(units, volume, share)` e `priceVsMedian(best.price, median)` quando o melhor destino é uma cidade com `state` ≠ `nodata`; trocar o texto da dica por `illusoryHint()`.
- [ ] **Step 2:** `npm run check`; smoke (`npm run dev`, aba Craft, `T4_MAIN_SWORD` e `T4_BAG`): uma única requisição a `…/stats/history/…` por item aberto (aba Rede; segunda abertura do mesmo item dentro de 1 h não requisita); cidades sem série mostram "sem dados", não "sem giro". **Step 3: Commit:** `feat: giro do item no Craft (coluna, cartão e dias para vender o lote)`.

### Task 7: Flipper: constante unificada (DT-003) e coluna Giro sob demanda
**Files:** Modify `Flipper.jsx`.
- [ ] **Step 1:** em `Flipper.jsx`: `maxAge: DEFAULT_MAX_AGE_H` (import de `exits.js`) no estado inicial; `const [hist, setHist] = useState({ running: false, done: 0, total: 0, data: null, error: null })`; botão "Carregar giro das 30 primeiras" que chama `fetchHistory(topIds, { cities: [...unique sell cities of top rows], onProgress })` onde `topIds = rows.slice(0, HISTORY_TOP_N).map((r) => r.mid)`; coluna **Giro (un./dia)** lendo `windowStats(hist.data?.[r.mid]?.[r.sell], { now })` (cidade de venda da linha); erro de throttle mostrado no `Banner` existente com o aviso de pausa (mesma mensagem de `MarketError`).
- [ ] **Step 2:** `npm run check`; smoke: sem clique, nenhuma chamada a `history` (Rede); com clique, ≤ 5 requisições; ordenar a tabela e clicar de novo só pede os ids novos (cache). **Step 3: Commit:** `feat: giro sob demanda no Flipper (top 30) e idade padrão unificada (DT-003)`.

## Como o Tester valida

1. **Dossiê §4 com as constantes** (recalcular sem importar a lib): **T4_BAG** Caerleon, 7 dias: soma 82+61+100+141+131+116+59 = **690**, **98,57/dia**; média simples 47.326/7 = 6.760,86; ponderada 6.676,64; **mediana 4.779**; 300 bolsas a 10% = **30,4 dias**, a 25% = **12,2 dias**. **T4_MAIN_SWORD**: soma **76**, **10,86/dia**, média 6.706,14, **mediana 6.309**; com limiar 5 passa, com 15 aparece "pouco giro". Preço planejado 6.000 contra mediana 4.779 = **+25,5%** (alerta).
2. **Dados ao vivo:** `curl` à API (como acima) e conferir, no dia do teste, a classificação de cada cidade: série ausente = "sem dados"; série com último ponto fora dos 7 dias = "sem venda registrada (último dd/mm)" (hoje, Lymhurst/`T4_MAIN_SWORD` é este caso); ≥ 3 pontos = vereditos de giro. A tela e o script devem concordar linha a linha.
3. **Limites da API:** abrir 10 itens diferentes no Craft em 1 minuto e carregar o Flipper duas vezes: contar requisições `history` (Rede/`read_network_requests`): ≤ 1 por item novo; Flipper ≤ 5 por clique; nenhuma ao abrir a aba; nenhuma repetida dentro de 1 h. Simular 429 (resposta `Throttled`): a tela mostra a mensagem de pausa e **preços e histórico param juntos** (`blockedUntil` compartilhado).
4. **Regressão:** `fetchPrices`/`usePrices` inalterados (nenhum teste de preços mudou); a coluna "Comprador/ilusória" da 066 e o resto do Craft iguais; `market.js` só ganhou dois `export`.
5. **Mutações a rodar:** `<` por `<=` em 5 e 15; dias completos (incluir hoje); tratar dia sem ponto como "fora da média"; `idle` virando `none`; `nodata` virando `none`; mediana por média; TTL de 1 h trocado; cache negativo removido; cap 5 removido; concorrência 3; `now` ignorado. Todas devem derrubar teste.
6. **O que um jogador experiente estranharia:** "sem giro" num item que simplesmente não tem histórico; giro "alto" por 1 dia atípico (veredito `sparse` existe para isso); mediana igual à média; "dias para vender" negativo, infinito ou NaN; uma tela do Flipper que dispara dezenas de chamadas sozinha; volume diferente entre o Craft e o Flipper para o mesmo item e cidade.

## Riscos

1. O endpoint `history` não tem documentação oficial legível (dossiê L1/L3); formato e janela de 30 dias foram **observados**. Se o parâmetro mudar, só `historyUrl` e `parseHistory` mudam (testes cobrem o formato).
2. `item_count` pode não ser unidades (dossiê L4); a tela chama de "vendas registradas/dia", nunca de "demanda".
3. A janela de dias completos (decisão de produto) subestima um item cujas vendas só aconteceram hoje; o veredito `sparse`/`idle` cobre.
4. Mesmo `blockedUntil` compartilhado significa que o histórico pode bloquear os preços por alguns segundos num 429: é o comportamento seguro desejado.
5. `Crafting.jsx` e `inputRules.js` são pontos de contato com 002 e 049; rebase por região.
6. As constantes de produto (5, 15, 3, 10, 20%, 1 h, 30) precisam de calibração com uso real (dossiê §2).

## Critério de pronto

`npm run check` verde; casos do dossiê §4 e os estados `nodata`/`idle`/`sparse` em teste; `market.js` com só dois `export` a mais; ≤ 1 requisição `history` por item aberto e ≤ 5 por clique no Flipper; DT-003 e DT-004 fechadas (literal 24 só em `DEFAULT_MAX_AGE_H`; 8 mutantes mortos); só os arquivos listados alterados.

## PERGUNTAS PARA O GERENTE

1. **Janela:** dias completos (termina ontem, hoje fica de fora) e dia sem registro conta 0. Aceita? A alternativa (incluir hoje) dá número maior no início do dia.
2. **Constantes de produto** (`NO_TURNOVER` 5, `LOW_TURNOVER` 15, `MIN_POINTS` 3, `share` 10%, alerta de preço +20%, TTL 1 h, top 30): aprovar ou ajustar. Nenhuma tem fonte de jogo.
3. **`idle`** ("há série, mas nada nos últimos 7 dias") aparece como "sem venda registrada (último dd/mm)" e **não** como "sem giro". Concorda com o texto?
4. **Mercado (gráfico 7/30 dias)** fica para a IDEIA-011. Confirma que não entra aqui?
5. DT-008 (testes de `fmt`/teto) é fechada por quem tocar `inputRules.js` primeiro (010 ou 002). Tudo bem a 010 fechar se vier antes?
