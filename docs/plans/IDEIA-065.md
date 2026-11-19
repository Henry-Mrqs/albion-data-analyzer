# IDEIA-065 — Preço de saída realista ancorado no histórico quando a oferta é isolada: plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-065`, a partir da `master` atual (**e, se já mesclada, depois da 059**). Comandos `npm` em `client/`. **Pré-requisitos (já na `master`):** 010 (`history.js`, `liquidity.js`: `windowStats`, `loadedStats`, `MIN_POINTS_IN_WINDOW`), 060, 048, 031, 069, 070. **Regras do briefing:** teste escrito, **executado e visto falhar** antes de implementar; **nenhum `*.test.jsx` pode conter `usePersisted('chave'` literal** (use `seed()` de `src/test/ui.js`); campo novo gravado por `set({...})` entra em `persistSchemas.js` no mesmo commit; todo teste de tela tem caso "estado antigo salvo" e "estado corrompido"; a tela diz com honestidade o que está e o que não está considerado.

**Dossiê:** `docs/research/IDEIA-065.md`. **Fonte de cada regra:** E1 (histórico diário `item_count`/`avg_price`) ALTA; E2 (preferir **mediana** dos dias) MÉDIA; E3 (ferramenta de referência ancora em histórico e marca na tela) MÉDIA; E5 (preços fantasma 9.999.999 existem) MÉDIA; E6 (menos de 3 dias com dado: não ancorar) decisão de produto, e coincide com `MIN_POINTS_IN_WINDOW = 3`. **Decisão de produto, sem fonte:** `P_real = min(P_lista, k × mediana)` com **k = 1,25** e **N = 7 dias**, ambos editáveis; padrão **ligado**; só ordem de venda.

**Correção de conta do dossiê (recalculada com `node -e`; o plano usa estes valores, não os do dossiê):** Caso 1: teto 7.886,25 (ok), líquido do realista = 7.886,25 × 0,935 = **7.373,64** (dossiê: 7.373,67), lucro realista = **3.849,37** (dossiê: 3.849,40), lucro listado **7.695,73**, diferença **3.846,36** = 49,98% (dossiê: 3.846,33 / 50%). Caso 2: mediana 603, teto 753,75, 1.840 = 2,44 × o teto (ok).

**Problema:** o lucro do Craft usa o menor preço de venda atual. Uma única listagem aspiracional (ou fantasma) vira lucro de fantasia e ainda escolhe a "melhor saída". Dado real: Broadsword T4 em Caerleon a 12.000 contra mediana de 7 dias 6.309. O Craft já carrega o histórico do item final (010), mas só o mostra no Giro.

**Objetivo:** no Craft, a saída em **ordem de venda** passa a usar `min(listado, k × mediana)` quando há histórico suficiente; a tela mostra os **dois** valores e marca "realista"; um interruptor volta ao listado; `k` e `N` editáveis; sem histórico, o preço listado vale e a tela diz que não foi ancorado.

**Arquitetura:** `lib/anchor.js` puro (`realisticPrice`, `cleanAnchor`) sobre o `windowStats` que já existe (a mediana do Giro é a mesma conta, com `days` parametrizável). `computeCraft` recebe `anchor = { history, now }`: troca `o.price` da opção e guarda `listed` e o estado; quem usa `best.price` (estresse, quadro, foco) herda o realista sem fórmula nova. Fora de escopo: Refino e Flipper (o dossiê cita o Flipper; ver perguntas).

## Arquivos: exclusivos, compartilhados, ordem
**Criados:** `client/src/lib/anchor.js`, `anchor.test.js`, `craftPlan.anchor.test.js`, `client/src/components/AnchorControls.jsx`, `AnchorControls.test.jsx`, `Crafting.anchor.test.jsx`.
**Alterados:** `client/src/lib/craftPlan.js` (bloco de opções e retorno), `client/src/lib/focus.js` (`craftFocusSummary` repassa `anchor`), `client/src/components/Crafting.jsx`, `client/src/lib/persistSchemas.js` (`anchorOn` bool, `anchorK` e `anchorDays` numText em `craft:cfg`), `client/src/lib/inputRules.js` (só `export` de `br`/`echoValue`, se ainda não).
**NÃO toca:** `liquidity.js`, `history.js`, `market.js`, `econ.js`, `exits.js`, `Giro.jsx` (só a prop passada pelo Crafting), `Refining.jsx`, `Flipper.jsx`, `TargetPrice.jsx`.
**Conflitos:** `craftPlan.js`, `Crafting.jsx` e `persistSchemas.js` com a **059** (mesmo bloco de opções); `Crafting.jsx` com a 075/080 (linhas distantes). **Ordem: 059 antes da 065.** Depois da 059 a linha do líquido já é `netSaleWithRelists({ price: o.price, … })` e a 065 só troca `o.price` antes dela (ver o caso combinado na Task 2).

## Interfaces
```js
// anchor.js (puro)
export const ANCHOR_K = 1.25, ANCHOR_DAYS = HISTORY_DAYS (7), ANCHOR_DEFAULT_ON = true   // decisão de produto, sem fonte; uma linha para virar o padrão
cleanAnchor(cfg) -> { values: { on: bool, k: number, days: int }, issues }   // cfg.anchorOn|anchorK|anchorDays; field dos avisos = o nome do campo
realisticPrice({ listed, stats, k }) -> { price, listed, state, ceiling, median, points }
  // stats = saída de windowStats/loadedStats. state: 'anchored' (listed > k*mediana: price = teto) | 'listed' (listed <= teto)
  //   | 'nohistory' (nodata, idle, sparse, ou mediana <= 0) | 'unloaded' (série não pedida) | 'invalid' (listed não é número > 0; price = listed ou 0)
// craftPlan.computeCraft({ ..., anchor }) : opção em ordem de venda ganha listed, anchorState, ceiling, median, points; o.price = realista só se values.on && state 'anchored'.
//   Sem `anchor` (histórico ainda não carregado) nada muda. Retorno ganha anchor: { on, k, days, anchoredCount }. Opção 'instant' nunca é ancorada.
// focus.craftFocusSummary({ ..., anchor }) repassa aos dois computeCraft.
```

## Mensagens (texto final)
**Interruptor:** "Usar preço de saída realista (ordem de venda)". **Dica:** "Se o menor preço listado passa de k × a mediana dos preços médios diários dos últimos N dias completos, o lucro usa k × mediana. É uma regra do app, não do jogo: k = 1,25 e N = 7 são escolhas de produto, sem fonte. O teto pode esconder uma alta de preço real: desligue para ver o listado." Campos "k (teto = k × mediana)" e "N (dias da mediana)". **Por linha (coluna Preço):** anchored: "realista · listado 12.000" (tom de aviso); nohistory: "sem histórico suficiente: usando o listado"; unloaded: "histórico não carregado: usando o listado"; histórico carregando: "ancoragem pendente (histórico carregando)". **Quadro Melhor destino:** "(realista; listado 12.000)". **Abaixo da tabela, se houver ancorada:** "{n} saída(s) com preço ancorado: o preço listado parecia isolado. A venda instantânea (ordem de compra) não é ancorada." **Dados:** "Mediana de preços médios diários (colaborativo); dia sem registro não conta; hoje fica de fora."

## Tasks (1 commit cada; teste primeiro e visto falhar; cada passo tem comando e saída esperada)

### Task 1: `anchor.js` (puro, project `logic`)
**Files:** Create `anchor.test.js`, `anchor.js`.
- [ ] **Step 1: testes falhando.** Séries (`{ t: Date.UTC(2026,9,19+i), n, p }`) e `now = Date.UTC(2026,9,26,12)`: **Caso 1** p = 8.431, 5.381, 2.009, 5.498, 8.316, 10.999, 6.309; **Caso 2** (14 dias de 12/11 a 25/11, `now = Date.UTC(2026,10,26,10)`) p = 602, 602, 602, 1.028, 602, 602, 602, 602, 603, 603, 603, 603, 1.508, 603.
```js
it('caso 1: listed 12.000, k 1,25 -> anchored, mediana 6.309, teto 7.886,25, price 7.886,25, points 7', () => {});
it('caso 2 (N 7): mediana 603 (a média 732,14 seria distorcida), teto 753,75, listed 1.840 -> price 753,75', () => {});
it('caso 2 com days 14: mediana 602,5 e teto 753,125 (N editável muda a janela)', () => {});
it('listed 7.000 (abaixo do teto 7.886,25) -> state listed, price 7.000; listed = 7.886,25 exato -> listed (não ancora na borda)', () => {});
it('fantasma 9.999.999 -> anchored a 7.886,25', () => {});
it('k 1 -> teto 6.309; k 1,5 -> 9.463,5', () => {});
it('2 dias com dado -> nohistory e price = listed; exatamente 3 dias -> ancora (MIN_POINTS_IN_WINDOW)', () => {});
it('série ausente (stats unloaded) -> unloaded; [] -> nohistory; dias só fora da janela -> nohistory; todos os p = 0 (mediana 0) -> nohistory (nunca preço 0)', () => {});
it('listed 0, negativo, NaN, texto, null -> invalid sem lançar', () => {});
it('cleanAnchor: sem campos -> { on: true, k: 1,25, days: 7 } sem aviso (estado antigo); anchorOn false -> on false; anchorOn "x"/null -> padrão com aviso só se não for null/undefined', () => {});
it('cleanAnchor k: "1,5" não é número -> 1,25 com aviso; 0,9 e 0 e -1 -> 1,25 com aviso (k < 1 colocaria o teto abaixo da mediana); 11 e 1e9 -> 10 com aviso; "" -> 1,25 sem aviso; { } e [2] não aparecem ecoados no texto', () => {});
it('cleanAnchor days: "3" ok; 2, 0, -5, "abc" -> 7 com aviso; 31 e 1e9 -> 30 com aviso; 7,5 -> 7 com aviso', () => {});
it('cleanAnchor com cfg null/undefined/array/texto: padrões, sem lançar', () => {});
```
- [ ] **Step 2:** `npx vitest run --project logic src/lib/anchor.test.js` → FAIL. **Step 3:** implementar (`realisticPrice` só decide pelo `stats.state` e pela `medianPrice`; `price = Math.min(listed, k * median)` só em 'anchored'; avisos no formato de `inputRules`, eco só por `echoValue`). **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: anchor.js, preço de saída realista (IDEIA-065)`.
- Mutações: `>=` no lugar de `>` na borda; `max` no lugar de `min`; média no lugar de mediana; `points < 2`; k < 1 aceito; mediana 0 aceita; `days` ignorado.

### Task 2: `computeCraft` e foco (project `logic`)
**Files:** Create `craftPlan.anchor.test.js`; Modify `craftPlan.js`, `focus.js`.
- [ ] **Step 1: testes falhando** (montagem da 048 em nível de lib: `loadFixtureCatalog()`, T4_MAIN_SWORD, METALBAR 200, LEATHER 150 comprados prontos, bancada 500, especialização; custo **3.524,27**, premium; histórico do Caso 1 em `history.T4_MAIN_SWORD.Caerleon`):
```js
it('sem anchor (histórico não carregado): options idênticas às de hoje (toEqual) e lucro 7.695,73 com Caerleon 12.000', () => {});
it('com anchor e on: price 7.886,25, listed 12.000, net 7.373,64, lucro 3.849,37, anchorState anchored; c.anchor = { on: true, k: 1.25, days: 7, anchoredCount: 1 }', () => {});
it('anchorOn false: price 12.000 e lucro 7.695,73, mas anchorState continua "anchored" e ceiling 7.886,25 (a tela mostra "seria ancorado")', () => {});
it('listed 7.000: não ancora, lucro 3.020,73', () => {});
it('a melhor saída muda: Caerleon 12.000 (histórico caso 1) e Martlock 8.500 com série []: sem anchor/off melhor = Caerleon; com anchor a melhor = Martlock, lucro 4.423,23 (Caerleon realista 3.849,37)', () => {});
it('opção instant (ordem de compra 12.000 em Caerleon) nunca é ancorada, nem com histórico', () => {});
it('saída marcada Sem imposto: o preço ancorado entra no líquido sem imposto (7.886,25 − 3.524,27 = 4.361,98)', () => {});
it('cfg corrompida direto na lib: anchorK null/{}/"abc"/0/1e9, anchorDays "x"/1, anchorOn "sim" -> sem lançar, padrões, avisos em issues com field anchorK/anchorDays/anchorOn', () => {});
it('craftStressInput usa o preço realista (price 7.886,25) e stressProfit ≈ lucro 3.849,37', () => {});
it('craftFocusSummary com anchor: profitOn/profitOff usam o preço realista (mesma melhor saída do computeCraft principal); sem anchor idêntico a hoje', () => {});
it('[só se a 059 já estiver na master] atualizações 2, step 0 sobre o preço realista: lucro 3.455,06 (7.886,25 × 0,935 − 0,025 × 2 × 7.886,25 − 3.524,27)', () => {});
```
- [ ] **Step 2:** FAIL. **Step 3:** `computeCraft`: `const an = cleanAnchor(cfg)` (sobre o `cfg` bruto; avisos em `issues`); no laço das opções, antes de `noTax`/`net`, para `mode === 'order'` e `anchor`: `stats = loadedStats(anchor.history, targetMid, o.city, { now: anchor.now, days: an.values.days })`, `r = realisticPrice({ listed: o.price, stats, k: an.values.k })`, guardar os campos e `o.price = an.values.on && r.state === 'anchored' ? r.price : o.price`. `craftFocusSummary` aceita e repassa `anchor`. **Step 4:** PASS; `npm run test:logic` (nenhum teste existente muda). **Step 5: Commit:** `feat: Craft usa o preço de saída realista quando a oferta é isolada (IDEIA-065)`.
- Mutações: ancorar `instant`; ancorar sem checar `on`; `listed` perdido; `anchor` não repassado ao foco; `days` fixo em 7; `cfg` limpo no lugar do bruto (perde avisos).

### Task 3: tela do Craft + esquema salvo
**Files:** Create `AnchorControls.jsx`, `AnchorControls.test.jsx`, `Crafting.anchor.test.jsx`; Modify `Crafting.jsx`, `persistSchemas.js`.
- [ ] **Step 1: testes falhando** (project `ui`; mocks de `usePrices`/`useHistory` como em `Crafting.extras.test.jsx`; `freezeNow('2026-10-26T12:00:00Z')` e `histHook.mockReturnValue({ history: { T4_MAIN_SWORD: { Caerleon: CASO1, Martlock: [] } }, loading: false, error: null })`; `craftCfg({ specialty: true, feePer100: 500, refine: BUY })`):
```js
it('AnchorControls isolado: interruptor, k e N com os textos honestos ("regra do app, não do jogo", "sem fonte")', () => {});
it('Caerleon 12.000: quadro mostra lucro +3.849 e "(realista; listado 12.000)"; a linha da tabela mostra 7.886 e "realista · listado 12.000"; líquido 7.374', () => {});
it('desligar o interruptor: grava anchorOn false em craft:cfg, lucro +7.696 e a linha diz que o teto seria 7.886', () => {});
it('estado antigo (craftCfg() sem anchorOn/anchorK/anchorDays): comporta-se como ligado, sem aviso de valor corrigido', () => {});
it('mudar k para 1,5 grava anchorK; com listado 12.000 o teto é 9.463,5, o preço usado é 9.464 e o lucro +5.324 (9.463,5 × 0,935 − 3.524,27 = 5.324,10)', () => {});
it('estado corrompido: anchorK "abc" -> aviso sob o campo e usa 1,25; anchorK null no armazenamento (descartado no carregamento) e anchorOn "x" -> sem exceção e padrão', () => {});
it('histórico carregando (history null, loading true): "ancoragem pendente" e o lucro usa o listado; erro de histórico: o aviso existente de Giro e lucro com o listado', () => {});
it('histórico sem a cidade (Caerleon ausente): "histórico não carregado: usando o listado"', () => {});
it('Martlock 8.500 sem histórico ([]): "sem histórico suficiente"; a melhor saída passa a Martlock (+4.423)', () => {});
it('o aviso do cartão Giro "acima da mediana" usa o preço LISTADO (12.000 = 90% acima de 6.309), não o realista; sem ele o aviso diria 25%', () => {});
it('o cartão Foco e o estresse mostram o lucro realista (3.849)', () => {});
```
- [ ] **Step 2:** FAIL. **Step 3:** `Crafting.jsx`: subir o `useHistory` para antes do cálculo (`enabled: variants.length > 0 && !!prices`, mesma semântica de `!!rec && !!prices`); `const anchor = history ? { history, now } : undefined` passado a **todas** as chamadas de `computeCraft` do componente (variantes, `c`) e a `craftFocusSummary`; `<AnchorControls/>` dentro do cartão "Onde vender" acima da tabela; célula Preço e quadro Melhor destino com os textos; `GiroCard best={best && { city: best.city, price: best.listed ?? best.price }}`. `persistSchemas.js`: `anchorOn: 'bool'`, `anchorK: 'numText'`, `anchorDays: 'numText'` em `craft:cfg` (padrões de `usePersisted` **não** mudam). **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: tela do Craft mostra preço listado e realista (IDEIA-065)`.
- Mutações: Giro com o preço realista; interruptor sem efeito; histórico que não chega ao foco; campos fora do esquema; texto sem "regra do app".

### Task 4: conferência manual (sem commit)
- [ ] `npm run dev`, Broadsword T4 com preços reais: dois valores visíveis, interruptor funciona, 375 px sem rolagem horizontal. Estado antigo: gravar `craft:cfg` sem os campos. **Conferir `location.port` antes de gravar em `localStorage`.**

## Review Focus (não coberto pelas tasks de lógica; cada linha tem teste acima)
1. Mediana 0 ou série só de zeros: nunca virar preço 0 (Task 1).
2. Histórico chegando depois dos preços: número muda; a tela avisa "ancoragem pendente" (Task 3).
3. Cidade sem histórico ou erro do histórico: preço listado e texto honesto (Task 3).
4. Valores salvos de `k`/`N` inválidos não derrubam nem calam (Tasks 1-3).
5. Foco, estresse e aviso do Giro concordando com o número principal (Tasks 2-3).

## Como o Tester valida
1. Casos concretos acima (Caso 1 e 2 do dossiê com as contas corrigidas), com oráculo próprio da mediana e do teto em ≥ 2.000 séries; diferencial `master` × branch sem histórico e com `anchorOn` false: 0 diferença.
2. Mutações das Tasks; sobrevivente reprova. 3. Estado antigo (`SAVED_STATES`) e corrompido. 4. O que um usuário estranharia: lucro que muda sem explicação; "realista" sem mostrar o listado; ancoragem em ordem de compra; k < 1; texto que apresente k e N como fato do jogo.

## Riscos
1. **Padrão ligado muda números para quem já usa** (só quando o histórico carrega e há oferta isolada; os dois valores aparecem). `ANCHOR_DEFAULT_ON` vira `false` numa linha. 2. **O teto pode esconder alta legítima:** dito na tela. 3. **Uma requisição extra de histórico por item já existe (010)**; nenhuma nova. 4. Conflito de arquivos com a 059 (ordem acima).

## Critério de pronto
`npm run check` verde sem alterar teste existente; mutações derrubadas; só os arquivos listados; campos novos em `persistSchemas.js`; conferência registrada.

## PERGUNTAS PARA O GERENTE
1. **Padrão ligado ou desligado?** Ligado muda o lucro mostrado de quem tem oferta isolada (os dois valores aparecem); desligado exige que o usuário ache o interruptor.
2. **Só ordem de venda:** a ordem de compra (venda instantânea) não é ancorada, porque o dossiê só trata `sell_price_min`. Confirma?
3. **Refino e Flipper** (o dossiê cita a coluna de margem realista no Flipper) ficam fora desta ideia: o Refino não tem histórico carregado e o Flipper só tem histórico sob demanda nas top-30. Abrir ideia à parte?
4. **`N` editável:** o dossiê diz "configuráveis"; se preferir menos campos, ficam só `k` e o interruptor (N = 7).
5. **Mediana simples** (E2/Caso 2) em vez de média ponderada por volume (E3, ferramenta de referência). Aceita?

## Adendo D-059: linhas do auditor (IDEIA-005)
Se a 005 já estiver na `master`, a Task 3 acrescenta ao `audit/craft.js` uma linha "Preço de saída realista" (`fields: ['anchorOn','anchorK','anchorDays']`, `kind: 'applied'`, `affects: 'profit'`, `probe: { cfg: { anchorOn: false } }` com histórico do Caso 1 no contexto do teste de sensibilidade, origem `app-default` e estado `unconfirmed` enquanto k e N forem os padrões: "k = 1,25 e N = 7 são escolhas do app, sem fonte"), mostrando quantas saídas foram ancoradas (`c.anchor.anchoredCount`). A linha "Saída" passa a mostrar também o preço listado. O contrato da 005 reprova sem isso.
