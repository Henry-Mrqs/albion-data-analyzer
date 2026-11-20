# IDEIA-013 — Ranking "o que craftar hoje": plano

> **Para o Executor:** `superpowers:executing-plans` ou `subagent-driven-development`. Branch de integração (D-070). `npm` em `client/`. Teste visto falhar antes de implementar; nenhum `*.test.jsx` com `usePersisted('chave'` literal (use `seed()`). **Pré-requisitos:** 005 (auditor), 010, 060, 069, 086 (contrato de abas: esta ideia cria **uma aba nova** e a 086 exige que ela seja registrada). Dossiê: `docs/research/IDEIA-013.md`. **D-068:** ordenação padrão = **lucro por craft**; lucro por dia é opção e exige giro.

**O que entrega:** aba **"Ranking"** que varre um **recorte** do catálogo (categoria de craft + tier + encanto, escolhidos antes; **nunca** o catálogo inteiro), chama as contas que o Craft já usa (`computeCraft`, `pickExit().bestReal`) e ordena por **lucro por craft** (padrão), **margem** ou **prata por foco**. Nada automático: botão "Varrer". Abrir a linha leva ao Craft com o item. **Nenhuma fórmula nova** (dossiê §1): a única regra de produto é o filtro contra lucro fantasma.

**Filtros contra lucro fantasma (dossiê R5/R7, risco 1):** só entra linha com **todos os materiais com preço** e saída `bestReal` (não ilusória, não velha; idade máxima padrão `DEFAULT_MAX_AGE_H` = 24 h, editável); mostra idade do dado; piso de lucro e de margem (padrões 0, como o Flipper). Item sem `focusOf` **fica fora** do ranking por prata/foco (nunca com 0). Prata por foco é **marginal** (R3), rotulado "ganho marginal do foco, não lucro total". Lucro por dia = lucro por craft × `min(crafts possíveis com o foco/dia, capacidade de giro)`: **só aparece com giro carregado** (`HISTORY_TOP_N` = 30) e o foco/dia vem do campo do usuário; sem giro a opção fica desabilitada com o motivo.

## Arquivos
**Cria:** `client/src/lib/rank.js` + `rank.test.js` (puro), `client/src/components/Ranking.jsx` + `Ranking.test.jsx`, `client/src/lib/audit/rank.js` + `rank.test.js`, `client/src/components/Ranking.audit.test.jsx`.
**Altera:** `client/src/App.jsx` (`TABS` +`rank`, `lazy` próprio; ícone + `aria-label`; **cuidado com a barra de abas a 375/500 px**, regra D-063: só ícone com `aria-label`/`title` e `scrollIntoView`; conferir que a 7ª aba cabe), `client/src/App.tabs.test.jsx` (lista de abas), `client/src/lib/persistSchemas.js` (+`rank:cfg`), `client/src/lib/persistSchemas.test.js` (`FILES` ganha `'Ranking.jsx': 'rank:cfg'`), `client/src/test/savedStates.js`, `client/src/lib/audit/tabs.js` (da 086: aba `rank` → tela `rank`), `client/src/lib/audit/contract.test.js` (importa `./rank` e `SET_FILES['rank:cfg'] = ['Ranking.jsx']`), `client/src/lib/history.js` (`topHistoryRequest` já serve ao Ranking se as linhas tiverem `mid` e `sell`: **só** teste novo; nenhuma mudança de código esperada).
**Conflitos:** `App.jsx` com 054/071 já mescladas e com **nenhuma** pendente além desta e da 036 (Mercado Negro vira sub-seção do Mercado, não aba: ver 036); `persistSchemas.js`/`savedStates.js` com todas; `audit/tabs.js` com 086. **Ordem:** depois de 086, 088, 089, 011 (usa as janelas de giro) e 007 (coluna opcional de tempo: só se `timeOf` existir; se a 007 ainda não entrou, a coluna some).

## Interfaces
```js
// rank.js (puro; sem rede, sem React, sem localStorage)
export const RANK_KEYS = ['profit', 'margin', 'silverPerFocus', 'profitPerDay'];
rankRow({ baseId, ench, prices, cfg, premium, now, maxAgeH }) -> row | null
//   row = { id, mid, ench, cost, unitCost, net, profit, margin, silverPerFocus: number|null, exit: {city, mode, price, date}, ready }
//   null se não há receita, falta preço de algum material ou não há saída bestReal. Usa computeCraft + pickExit + annotateOptions (NADA reimplementado); silverPerFocus via craftFocusSummary (focus.js), null sem focusOf
rankCrafts({ items, prices, cfg, premium, now, maxAgeH, key, minProfit, minMargin, history, focusPerDay }) -> { rows: row[], skipped: { noRecipe, missingPrice, noRealExit, noFocus } }
//   ordena por `key` (desempate por lucro desc, depois id); itens fora do critério vão para `skipped` (contados, não somem em silêncio)
sliceCatalog({ category, tiers, enchants, limit = 400 }) -> item[]        // recorte; `limit` protege a varredura
rankIds(items, ench[]) -> string[]                                          // ids de mercado a pedir: alvo + materiais (craftChainIds)
cleanRankCfg(cfg) -> { values, issues }                                     // category ∈ craftCategories(), tiers ⊂ 2..8, enchants ⊂ 0..4, key ∈ RANK_KEYS, piso ≥ 0; lixo → padrão com aviso
```
`rank:cfg` (esquema): `{ category: {enum:['', ...CRAFT_CATEGORIES]}, tiers: 'passthrough' (validado por cleanRankCfg), enchants: 'passthrough', key: {enum: RANK_KEYS}, minProfit: 'numText', minMargin: 'numText', maxAge: 'numText', focusPerDay: 'numText' }`. Padrão: categoria `''` (**obriga escolher antes de varrer**), tiers `[4,5,6]`, encantos `[0]`, `key:'profit'`, pisos `''`, `maxAge:'24'`, `focusPerDay:''`.

## Task 1: `rankRow`/`rankCrafts`/`sliceCatalog` (project `logic`)
**Files:** Create `rank.test.js`, `rank.js`.
- [ ] **Step 1: testes falhando.** (a) **Ordenação pura** com as linhas A/B/C do dossiê §4 (premium, k=0,935, taxa 216, 1 craft): A = líquido **4.207,50**, custo 3.524,27 → lucro **683,23**, margem **19,39%**, com foco: custo 2.507,67 → lucro 1.699,83, margem 67,79%, foco real 1.286×0,5^3,1 = **149,99**, prata/foco = 1.016,60/149,99 = **6,78**; B: lucro 300, margem 30%, prata/foco 5,0, giro 40/dia; C: líquido 11.000, custo 10.000 → lucro 1.000, margem 10%, **sem foco**, giro 2/dia. Ordem por lucro **C, A, B**; por margem **B, A, C**; por prata/foco **A, B** (C em `skipped.noFocus`); com filtro de giro ≥ 5/dia (`NO_TURNOVER_PER_DAY`) por lucro: **A, B** (C sai: 2/dia = `none`). Orçamento de foco 9.000/dia no A: 9.000/149,99 = 60,004 → **60 crafts**, ganho marginal 60 × 1.016,60 = **60.996** (usa `craftsWithBudget`, não conta própria). Estes números são fixture literal de `rankCrafts` recebendo linhas já calculadas via injeção (`rowFn`), isolando a ordenação da conta.
  (b) **Diferencial contra `computeCraft`** (catálogo fixture, `T4_MAIN_SWORD` e uma poção com preços sorteados fixos): para cada item do recorte, `rankRow(...).profit` = `computeCraft(...).best.profit/units`… use exatamente os campos que o Craft mostra e compare `toBeCloseTo(…, 9)`; **zero** divergência em 100 itens × 3 configs de foco/diário/taxa (sem número solto: o oráculo é o próprio Craft, que já foi auditado nas ideias 002/038/041/048).
  (c) **Filtros:** preço de material ausente → `skipped.missingPrice` (nunca lucro 0); só saída ilusória (ordem de venda sem comprador) → `skipped.noRealExit`; dado com 30 h e `maxAgeH 24` → fora; `maxAgeH 0` desliga o limite; `minProfit`/`minMargin` cortam; empate desempata por lucro e depois por id (determinístico); `limit` respeitado.
  (d) `sliceCatalog`: categoria `sword`, tiers [4], encanto [0] = só espadas T4 do fixture; categoria vazia → `[]` (obriga escolher); `rankIds` sem ids repetidos e com os materiais.
  (e) `cleanRankCfg`: `{}`/`undefined` → padrão sem aviso; `tiers:[1,9,'x']` → padrão com aviso; `key:'lucro'` → `profit` com aviso; `minProfit:'-5'` → 0 com aviso; objeto sem eco.
- [ ] **Step 2:** `npx vitest run --project logic src/lib/rank.test.js` → FAIL. **Step 3:** implementar (chama `computeCraft`/`pickExit`/`annotateOptions`/`craftFocusSummary`; **proibido** copiar RRR, imposto ou foco). **Step 4:** PASS; `npm run test:logic`. **Step 5: Commit** `feat: rank.js (varredura do recorte com as contas do Craft) (IDEIA-013)`.
- Mutações: ordenar crescente; margem sobre o líquido em vez do custo; incluir `missingPrice` como custo 0; esquecer `bestReal` (lucro fantasma entra); `silverPerFocus` 0 para item sem foco; desempate instável; ignorar `limit`.

## Task 2: esquema salvo `rank:cfg`
**Files:** Modify `persistSchemas.js`, `persistSchemas.test.js`, `savedStates.js`. Padrão da Task 2 da 011: estados `atual`, `número no lugar de texto`, `lixo` (`tiers:'abc'`, `key:42`, `category:{}`) e `null` carregam sem exceção; lixo → padrão. Commit `feat: rank:cfg no esquema salvo (IDEIA-013)`.

## Task 3: aba "Ranking" (`Ranking.jsx`, `App.jsx`)
**Files:** Create `Ranking.test.jsx`, `Ranking.jsx`; Modify `App.jsx`, `App.tabs.test.jsx`.
- [ ] **Step 1: testes falhando** (project `ui`; `usePrices`/`useHistory` mockados como em `App.errors.test.jsx`; `resetApp`; `seed('rank:cfg', …)`): (1) sem categoria escolhida o botão "Varrer" fica desabilitado e o texto diz "Escolha uma categoria: a varredura nunca roda no catálogo inteiro"; (2) nada é pedido à API antes do clique (`fetchPrices` não chamado ao montar); (3) após "Varrer" com preços mockados, a tabela mostra a ordem **C, A, B** por lucro e muda para **B, A, C** ao escolher "Margem", e a coluna de prata/foco só lista A e B (C mostra "sem foco no dump", não 0); (4) cada linha mostra a idade do dado (`Age`) e a saída (cidade/modo); (5) "Lucro por dia" desabilitado com a dica "Carregue o giro (botão) e informe o foco por dia" até haver `history` e `focusPerDay`; com ambos, mostra a coluna; (6) rodapé "Preço-ilusão: linhas sem saída real (N) e sem preço de material (M) ficaram de fora" com os contadores de `skipped`; (7) clique no nome da linha navega para `#crafting` e grava `craft:item` com o item (verifica via `localStorage`, sem literal de `usePersisted`); (8) estado `rank:cfg` corrompido: aviso e padrão, sem tela branca; (9) 375 px: tabela dentro de `.table-wrap`, sem rolagem horizontal da página; (10) rótulo fixo: "Dados colaborativos da API: item pouco negociado pode ter preço atípico; confira o giro antes de craftar." e "Prata por foco = ganho marginal do foco, não lucro total.".
  `App.tabs.test.jsx`: 7 abas; a barra tem `aria-label` em todas; `#rank` abre a aba e rola a ativa para a vista.
- [ ] **Step 2:** FAIL. **Step 3:** `Ranking.jsx` (estado `usePersisted('rank:cfg', …)`, `fetchPrices(rankIds(...), { qualities:'1' })` num `async` disparado só pelo botão com `AbortController`, progresso e `Throttled` mostrados como no `usePrices`; giro opcional por botão via `fetchHistory(topHistoryRequest(rows).ids)`); `App.jsx` +aba `lazy`. **Step 4:** PASS; `npm run check`; **conferir a 375 e 500 px** (D-063). **Step 5: Commit** `feat: aba Ranking "o que craftar hoje" (IDEIA-013)`.
- Mutações: varrer ao montar; botão habilitado sem categoria; ordem invertida; linha de C com prata/foco 0; link que não grava o item; `skipped` omitido.

## Task 4: auditor (`registerScreen('rank', …)`)
**Files:** Create `audit/rank.js`, `audit/rank.test.js`, `Ranking.audit.test.jsx`; Modify `audit/tabs.js`, `audit/contract.test.js`, `Ranking.jsx` (`VarAuditCard`).
- [ ] **Step 1: testes falhando.** `registerScreen('rank', { cfgKeys:['rank:cfg'], ignoredFields:{}, vars })`, com Vars (cada uma com `fields` e `probe`):
  | Var | fields | kind | affects | O que mostra |
  |---|---|---|---|---|
  | `scope` | `category`,`tiers`,`enchants` | applied | none | recorte varrido e nº de itens (afeta **quais** linhas, não o lucro de cada) |
  | `key` | `key` | applied | none | critério de ordenação (e que prata/foco é marginal) |
  | `floors` | `minProfit`,`minMargin` | applied | none | pisos (linhas cortadas: N) |
  | `max-age` | `maxAge` | applied | none | idade máxima, "padrão do app, decisão de produto" |
  | `focus-day` | `focusPerDay` | info-only | none | foco/dia digitado; vazio = lucro/dia indisponível |
  | `exit-rule` | — | applied | profit | "saída = melhor ordem de compra/venda **com comprador real e dado fresco**" (regra da 066) |
  | `premium`/`server` | — | applied | profit | os do Craft (mesmo texto) |
  | `nc-*` | — | not-considered | none | **qualidade do craft**, **transporte**, **estoque**, **mudança de preço**, **fila e tempo** (`queue`), **diário de ofício** (`journal`): reusar `notConsideredRows`; acrescentar `NOT_CONSIDERED.rankOutliers = ['Preço atípico de item pouco negociado','O preço é colaborativo; a confiança do preço (IDEIA-012) não filtra o ranking.']` |
  O contrato (`contract.test.js`) passa a cobrir `rank:cfg` (campo novo sem linha reprova) e `tabs.js` mapeia `rank → 'rank'`. Teste da tela: `VarAuditCard` aparece **recolhido** e conta as linhas; o teste de sensibilidade (`sensitivity.test.js`) ganha o cenário `rank` onde mudar `minProfit` muda o **nº de linhas**, e `maxAge` com dado de 30 h remove a linha. Se o harness só mede custo/lucro por item, acrescentar `affects: 'rows'` ao `AFFECTS` do `registry.js` (é o único ponto em que a 013 altera o registro) e um medidor de nº de linhas.
- [ ] **Step 2–4:** FAIL → implementar → PASS; `npm run check`. **Step 5: Commit** `feat: auditor da aba Ranking (IDEIA-013)`.

## Como o Tester valida
1. Os números A/B/C do dossiê (683,23; 19,39%; 1.699,83; 67,79%; 149,99; 6,78; 60 crafts; 60.996). 2. **Oráculo independente:** reimplementar a conta por item em script próprio (fora do repo) para o recorte `sword` T4–T6 .0 com preços reais da API (West) e comparar com a aba: 0 divergência. 3. **Lucro fantasma:** forjar um item com só ordem de venda sem comprador e outro com dado de 30 h: nenhum aparece. 4. **Rede:** nada é pedido ao abrir a aba; um clique = no máximo `ceil(ids/80)` requisições (estimativa do dossiê: ~31 para encanto .0 de tudo; o Tester **mede** e registra o número real, que o dossiê lista como NÃO VERIFICADO); `Throttled` mostra a mensagem do `market.js` e pausa. 5. Tempo de CPU da varredura de 400 itens (relatar). 6. Estados corrompidos de `rank:cfg`. 7. 375/500 px, 7 abas visíveis. 8. Mutações.

## Riscos
1. Rate limit (180/min, 300/5 min): recorte obrigatório + `limit` 400. 2. Outlier de preço lidera o ranking (R7): o rótulo avisa e o giro valida depois (nunca esconde item por falta de histórico: `nodata` ≠ sem giro). 3. Prata/foco marginal ≠ lucro total (rótulo). 4. `Crafting.jsx` não é tocado por esta ideia; o link só grava `craft:item` e muda o hash. 5. Barra de abas: 7ª aba pode cortar (D-063).

## PERGUNTAS PARA O GERENTE
1. Recorte obrigatório (categoria + tier + encanto), nunca o catálogo inteiro: aceita? (varredura total ~135 requisições, ~45% do teto de 5 min; dossiê §4, não medido).
2. Padrão `tiers [4,5,6]`, `encantos [0]`, `limit` 400 são decisão de produto sem fonte. Aceita como "regra do app"?
3. Lucro por dia só com giro carregado e foco/dia digitado (nenhum padrão de foco sem premium tem fonte, dossiê R4). Aceita?
