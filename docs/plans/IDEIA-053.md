# IDEIA-053 — Confiança da rota por histórico: "quantos dos últimos 14 dias essa rota teria dado lucro": plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-053`. Comandos `npm` em `client/`. **Pré-requisitos (já na `master`):** 010 (`history.js`: `fetchHistory`, `mergeHistory`; `liquidity.js`: `windowOf`), 060, 069, 070. **Regras do briefing:** teste escrito, **executado e visto falhar** antes de implementar; os de componente em `*.test.jsx`; **nenhum `*.test.jsx` com `usePersisted('chave'` literal** (use `seed()` de `src/test/ui.js`). Fonte: `docs/research/IDEIA-053.md`.

**Problema:** o Flipper mostra o spread **de agora**; um spread isolado ou dia atípico engana. O jogador quer saber se a rota **costuma** dar lucro.

**Objetivo:** coluna **"Histórico da rota"** no Flipper: `x/14 dias` em que a rota (cidade de compra → cidade de venda da linha) teria dado lucro, mais a **mediana** das margens diárias, só para as primeiras `HISTORY_TOP_N` (30) linhas e **só sob clique** (o botão "Carregar giro" já existente passa a buscar também o histórico da cidade de **compra**), com ordenação pelo placar.

**Arquitetura:** `lib/routeScore.js` (puro; recebe duas séries do formato de `parseHistory` e devolve o placar; **sem** rede/React). `lib/history.js` ganha `topRouteHistoryRequest(rows, n)` (ids e **união** de cidades de compra e venda). `Flipper.jsx` usa as duas funções; `loadGiro` pede as cidades da união (um só `fetchHistory`, o Giro atual não muda: as cidades de venda continuam incluídas). Nenhum campo salvo novo: lucro mínimo **reusa** `cfg.minProfit` do Flipper.

## Regra (dossiê §2, produto sem fonte de jogo)
Para cada dia UTC `d` dos **14 últimos dias completos** (`windowOf(now, 14)`: termina na véspera) com dado nas **duas** cidades: `margem_d = netSale(avg_destino_d, modo, premium) − custo_origem_d`, com `custo_origem_d = avg_origem_d` se `buyMode` = `instant`, ou `avg_origem_d × (1 + SETUP_FEE)` se `order`; `modo` = o da linha (`order` ⇒ × (1−t−s); `instant` ⇒ × (1−t)). Dia lucrativo = `margem_d ≥ lucro_mínimo`. Placar = lucrativos ÷ dias com dado. **Mínimo de 7 dias com dado** (`MIN_ROUTE_DAYS`) para exibir; abaixo ⇒ "histórico insuficiente". **Mediana** das margens junto do placar (a média é distorcida por outliers, dossiê §4(3)).
**NÃO considera (dito na tela, no `title` e aqui):** que a média diária mistura ordens de preços diferentes: o placar **aproxima** o flip, não prova que você compraria ao preço médio; **absorção** do destino (venda de 59 a 222 un./dia contra 743 a 1.112 na origem no exemplo): veja a coluna Giro; tendência e previsão (o placar "só informa, não prevê"); impostos de listagem repetida; frete e peso.

## Arquivos
**Criados:** `client/src/lib/routeScore.js`, `routeScore.test.js`, `client/src/components/RouteScore.jsx` (célula), `RouteScore.test.jsx`, `client/src/components/Flipper.route.test.jsx`.
**Alterados:** `client/src/lib/history.js` (+`topRouteHistoryRequest`), `history.test.js` (se existir; senão o teste fica em `routeScore.test.js`), `client/src/components/Flipper.jsx` (`loadGiro`, coluna, ordenação).
**NÃO toca:** `persistSchemas.js` (nenhum campo novo; `flip:cfg` intacto), `flip.js`, `market.js`, `liquidity.js`, `inputRules.js`, `lib/audit/*` (**o Flipper não é tela do auditor**: v1 = Craft/Refino/RRR; D-060/D-064 deixam o Flipper fora; este plano **não registra linhas**), `catalog`.
**Compartilhados:** `Flipper.jsx` com nenhuma ideia em andamento que o altere (verificar `docs/plans/*` antes). **Ordem:** independente; precisa só da 010 (na `master`).

## Interfaces
```js
// routeScore.js (puro)
export const ROUTE_DAYS = 14, MIN_ROUTE_DAYS = 7;                        // constantes de produto (dossiê C1/regra de produto)
routeScore(origin, dest, { mode, buyMode, premium, minProfit = 0, now = Date.now() })
  // origin/dest: [{ t, n, p }] ou undefined; mode: 'order'|'instant'; buyMode: 'instant'|'order'
  // -> { state: 'unloaded'|'nodata'|'sparse'|'ok', days, profitable, ratio, median, margins }
  //    unloaded: origin ou dest undefined (histórico não pedido); nodata: algum [] ou nenhuma data em comum;
  //    sparse: 1..MIN_ROUTE_DAYS-1 dias comuns; ok: >= MIN_ROUTE_DAYS. ratio = profitable/days; median = mediana(margins)
// history.js
topRouteHistoryRequest(rows, n = HISTORY_TOP_N): { ids: string[], cities: string[] }   // cities = união de r.buy e r.sell das n primeiras linhas
```
`minProfit` inválido (`''`, texto, `NaN`, negativo) ⇒ `0` (mesma leitura do `flipRows`: `+cfg.minProfit || 0`; negativo vira 0 também aqui).

## Tasks (1 commit cada; teste primeiro e visto falhar)

### Task 1: `routeScore` (puro, project `logic`)
**Files:** Create `routeScore.test.js`, `routeScore.js`.
- [ ] **Step 1: testes falhando.** Fixture = os 14 dias do dossiê §4 (`T4_BAG` Lymhurst → Caerleon, 19/10 a 01/11/2026), `now = Date.UTC(2026, 10, 2, 12)` (janela 19/10 a 01/11); cada dia `{ t: Date.UTC(2026, 9, 19 + i), n, p }`:
```js
const L = [[843,3229],[869,3378],[882,3266],[885,3349],[812,3347],[1112,3185],[840,3195],[945,3254],[743,3311],[808,3404],[949,3171],[960,3484],[1063,3579],[865,3356]];
const C = [[82,4403],[61,4779],[100,4445],[141,4733],[131,5751],[116,12621],[59,10594],[65,7909],[96,7961],[150,7170],[149,7031],[121,6940],[190,6722],[222,6584]];
const opts = { mode: 'order', buyMode: 'instant', premium: true, now };
it('margens do dossiê (valores recalculados): 887,805 · 1.090,365 · 8.615,635 (24/10, outlier) · 2.800,04', () => {
  const r = routeScore(orig, dest, { ...opts, minProfit: 0 });
  expect(r.state).toBe('ok'); expect(r.days).toBe(14);
  expect(r.margins[0]).toBeCloseTo(887.805, 3); expect(r.margins[1]).toBeCloseTo(1090.365, 3);
  expect(r.margins[5]).toBeCloseTo(8615.635, 3); expect(r.margins[13]).toBeCloseTo(2800.04, 3);
});
it('lucro > 0: 14 de 14 (100%), mediana 2.902,47 (a média, 3.199,16, é distorcida pelo dia 24/10)', () => { /* profitable 14, ratio 1, median 2902.47 (3 casas) */ });
it('lucro mínimo 1.000: 12 de 14 (87%); 19/10 e 21/10 ficam abaixo', () => { /* profitable 12, ratio 12/14 */ });
it('lucro mínimo 3.000: 7 de 14 (limite exato: 3.004,9 conta, 2.800,04 não)', () => { /* profitable 7 */ });
it('sem Premium (k = 0,895): 14/14, 10 com margem >= 1.000, mediana 2.631,99', () => {});
it('venda instantânea (k = 0,96): 14/14, 13 com margem >= 1.000, mediana 3.071,52', () => {});
it('compra por ordem (custo × 1,025) com venda por ordem: 14/14, 11 >= 1.000, mediana 2.816,97', () => {});
it('dia 24/10 ausente na origem: 13 dias comuns (união por dia, não por posição); mediana 2.800,04; 11 >= 1.000', () => {});
```
Bordas (cada uma um `it`): 6 dias comuns ⇒ `sparse` (nenhum `ratio`); exatamente 7 ⇒ `ok`; `origin`/`dest` `undefined` ⇒ `unloaded`; `[]` em qualquer lado ⇒ `nodata`; séries sem dia em comum ⇒ `nodata`; dia **de hoje** (parcial) e dias antes da janela ficam **fora**; pontos duplicados no mesmo `t` não contam duas vezes (vale o último); `minProfit` `''`, `'abc'`, `NaN`, `-5`, `null` ⇒ tratado como 0; `mode`/`buyMode` fora da lista ⇒ `state:'nodata'` sem lançar (nunca "lucrativo" por engano); `premium` não booleano ⇒ falso (sem Premium, 8%).
- [ ] **Step 2:** `npm run test:logic -- src/lib/routeScore.test.js` → FAIL. **Step 3:** implementar com `netSale`/`SETUP_FEE` de `econ.js` e `windowOf` de `liquidity.js` (nenhum imposto escrito aqui). **Step 4:** PASS.
- [ ] **Mutações (cópia fora do repo):** `≥` → `>` no lucro mínimo; imposto 0,04 fixo; janela 7; alinhar por índice em vez de `t`; média no lugar da mediana; contar `sparse` como `ok`: todas derrubadas. **Step 5: Commit** `feat: placar histórico da rota (IDEIA-053)`.

### Task 2: pedido de histórico com origem e destino
**Files:** Modify `history.js` (+`topRouteHistoryRequest`); Test no `routeScore.test.js` ou `history.test.js`.
- [ ] **Step 1: testes falhando:** 3 linhas `{mid:'A',buy:'Lymhurst',sell:'Caerleon'}`, `{mid:'B',buy:'Martlock',sell:'Caerleon'}`, `{mid:'A',buy:'Thetford',sell:'Black Market'}` ⇒ `ids ['A','B']`, `cities` com as 5 cidades sem repetir, ordem de primeira aparição; `n = 1` considera só a 1ª linha (`['A']`, `['Lymhurst','Caerleon']`); `[]` ⇒ `{ ids: [], cities: [] }`; `topHistoryRequest` existente **continua igual** (teste de regressão: mesmo resultado de antes).
- [ ] **Steps 2–5:** FAIL → implementar → PASS. **Commit** `feat: pedido de histórico da rota (IDEIA-053)`.

### Task 3: célula e coluna no Flipper (jsdom)
**Files:** Create `RouteScore.test.jsx`, `RouteScore.jsx` (props `{ score }`), `Flipper.route.test.jsx`; Modify `Flipper.jsx`.
- [ ] **Step 1: testes falhando.** `RouteScore`: `ok` ⇒ "12/14" + "mediana 2.902" e `title` com "não é previsão" e "média diária"; `sparse` ⇒ "histórico insuficiente (6 de 14 dias)"; `nodata` ⇒ "sem histórico"; `unloaded` ⇒ "—". `Flipper.route.test.jsx` (mock `fetchHistory` via `vi.mock('../lib/history', ...)` e `flipRows` real com preços semeados): antes do clique a coluna mostra "—" e **nenhum** `fetchHistory`; o clique chama `fetchHistory` **uma vez** com `cities` = união (inclui a cidade de compra); após resolver, a célula mostra o placar do dossiê (12/14 com `minProfit` 1000 salvo em `flip:cfg`); ordenar pela coluna põe as linhas sem placar **por último** nos dois sentidos; trocar `minProfit` recalcula o placar **sem** novo pedido; rodapé/legenda da tabela cita "aproximação" e "absorção".
- [ ] **Steps 2–4:** implementar: `rows` ganha `score` (memo com `hist.data`, `premium`, `cfg.minProfit`, `histNow`); coluna sortável "Histórico da rota (x/14)" com chave `routeRatio` (`ratio` ou `-1`); `loadGiro` usa `topRouteHistoryRequest`. PASS; `npm run test:ui` verde.
- [ ] **Step 5: Commit** `feat: Histórico da rota no Flipper (IDEIA-053)`.

### Task 4: estado antigo/corrompido e conferência
- [ ] **Teste:** `seed('flip:cfg', ...)` do estado antigo de `CURRENT_DEFAULTS` **e** com `minProfit: 'abc'`, `maxAge: null`, listas vazias ⇒ tela sem erro; placar usa `minProfit` 0; `buyCities: []` ⇒ nenhuma linha, botão desabilitado (comportamento já existente), sem exceção.
- [ ] **Manual (API real, o Executor registra):** Flipper com `T4_BAG` Lymhurst→Caerleon: 14/14 ou próximo; valores mudam com o mercado (não são asserções). 375 px: coluna dentro do `table-wrap`. **Commit** `test: Flipper com estado salvo antigo (IDEIA-053)`.

## Como o Tester valida
1. **Casos concretos:** 14/14 e mediana 2.902,47; 12/14 (mínimo 1.000); 7/14 (mínimo 3.000); sem Premium 2.631,99; instantânea 3.071,52; compra por ordem 2.816,97; 13 dias com furo; `sparse` com 6 dias; limites 6 vs 7.
2. **Mutações** da Task 1 (sobrevivente reprova); conferir a conta à mão: `4403 × 0,935 − 3229 = 887,805`.
3. **Estado ruim:** `flip:cfg` e `settings` corrompidos (perfis C1 a C10 do laudo 070) sem tela branca; histórico com `NaN`/negativo (descartado por `parseHistory`); 429 no histórico ⇒ banner "Giro interrompido" já existente, sem placar inventado.
4. **Requisições:** sem clique, nenhuma; com clique, ≤ 5 (`HISTORY_MAX_REQUESTS`), `truncated` mostra o aviso já existente.
5. **Honestidade:** coluna e `title` dizem "aproximação" e "não é previsão"; nunca "confiança de X%" nem "garantido". **O que o usuário estranharia:** "100%" sem a mediana ao lado; placar em linha com 3 dias de dado; ordenar mandando linhas sem histórico para o topo.

## Riscos
1. **Mercado Negro como destino:** a venda é **instantânea** (só ordens de compra); o histórico de `Black Market` depende da API; se vier vazio, `nodata` ("sem histórico"), nunca zero.
2. **Cidade de compra a mais no pedido:** a URL cresce; `chunk()` já divide e `truncated` avisa.
3. **Cache:** `fetchHistory` guarda por `cidades|id`; a chave com a nova união é outra do Giro antigo: o primeiro clique após o deploy refaz o pedido (1 h de cache depois).
4. **`avg_price` mistura ordens**: limitação C4, dita na tela.

## Critério de pronto
`npm run check` verde; mutações derrubadas; só os arquivos listados; nenhum campo em `persistSchemas.js`; Flipper sem linhas no auditor (declarado); conferência manual registrada.

## PERGUNTAS PARA O GERENTE
1. **N = 14 dias e mínimo 7** (dossiê sugere "ex. 7 de N"; sem fonte): aprova? O Albion Terminal usa 30 dias de dados de **ordens**, que o AODP não dá.
2. **Lucro mínimo** reusa o `minProfit` do Flipper (2.000 por padrão): ok, ou um campo próprio?
3. **Mediana ao lado do placar** (em vez de só x/N): ok? 
4. O botão "Carregar giro" passa a buscar **também** a cidade de compra (um clique só): ok, ou botão separado?
5. Ordenar por placar com empate ⇒ por lucro atual: aprova?
