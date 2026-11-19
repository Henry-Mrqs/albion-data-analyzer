# IDEIA-059 — Ciclo de vida da ordem de venda: cada atualização cobra 2,5% de novo e cancelar não devolve: plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-059`, a partir da `master` atual. Comandos `npm` em `client/`. **Pré-requisitos (já na `master`):** 060 (`validateInputs` com `relists`/`maxRelists`), 048 (`noTax`, extras), 031 (`stress.js`), 069 (project `ui`, `src/test/ui.js`), 070 (`persistSchemas.js`). **Regras do briefing:** cada teste é escrito, **executado e visto falhar** antes de implementar; os de componente em `*.test.jsx`; **nenhum `*.test.jsx` pode conter `usePersisted('chave'` literal** (`persistSchemas.test.js` varre `src/components/` e exige as chaves do código; use `seed()` de `src/test/ui.js`); todo campo novo gravado por `set({...})` entra em `persistSchemas.js` **no mesmo commit**; todo teste novo de tela tem um caso "estado antigo salvo" e um "estado corrompido".

**Dossiê:** `docs/research/IDEIA-059.md`. **Fonte e confiança de cada regra:** O1 (setup fee 2,5% ao criar **ou atualizar**), O2 (cancelar não devolve) e O3 (imposto só na venda concluída), O6 (vender numa ordem de compra existente não cria ordem: sem setup): MÉDIA-ALTA, entram como fato. **O4 (base do fee na atualização) é BAIXA e sem fonte:** o app assume "sobre o preço novo × quantidade" como **decisão de produto, configurável**, e a tela diz isso. **O5 (duração/expiração da ordem) sem fonte: não é modelada**, e a tela diz que não está considerada.

**Problema:** o Craft e o Refino calculam a venda por ordem como um evento único (`netSale(preço,'order') = preço × (1 − imposto − 2,5%)`). Quem corrige o preço (undercut) até vender paga 2,5% de novo a cada correção, e o lucro mostrado some sem aviso. O cartão Preço-alvo já tem um campo "Relistagens (estimativa)" (`target:cfg.relists`), mas ele só vale ali; o lucro do Craft, o líquido da tabela "Onde vender", o Refino e o estresse (031) ignoram.

**Objetivo:** campos "Atualizações da ordem de venda" (padrão 0), "Queda de preço por atualização" (padrão 0) e "Base da taxa na atualização" (padrão: preço novo) no Craft e no Refino; o líquido de **toda saída em ordem de venda** desconta as taxas extras; um cartão mostra a taxa de criação acumulada; o estresse concorda com a tela; **com 0 atualizações o resultado é idêntico bit a bit ao de hoje** (todo teste existente passa sem alteração).

**Arquitetura:** `lib/relist.js` (puro) com a fórmula e a validação; `netSale` **não muda** (fonte única do líquido base). `computeCraft`, `evaluateTier` e os adaptadores de `stress.js` só **subtraem** o custo de relistagem do líquido que já calculavam (e `stress.js` o separa em parte proporcional ao preço e parte fixa, para o modelo `k` + `fixed` continuar igual ao da tela). Componente novo `OrderLifeCard.jsx` (só apresenta).

## Fórmula (dossiê §2, O4 assumido) e demonstração

`k = u + 1` listagens (1 criação + `u` atualizações), venda final em `Pk`, queda `s` por atualização (a ordem começa em `P1 = Pk + u·s`), quantidade `n`. Base "preço novo": `setup_total = 0,025 · n · Σ Pi = 0,025 · n · ((u+1)·Pk + s·u·(u+1)/2)`. O líquido base já desconta `0,025 · n · Pk`, então o **extra** é `0,025 · n · (u·Pk + s·u·(u+1)/2)` (confere com o dossiê: u=3, s=10, Pk=4.470 → 336,75). Base "diferença" (alternativa, também sem fonte): a criação cobra `P1` cheio e cada atualização cobra só `s`: extra = `2 · 0,025 · n · s · u` (a diferença `P1 − Pk = u·s` mais as `u` atualizações). Em ambas: `extra = n · (perPrice · Pk + flat)`, com `perPrice = u·0,025` e `flat = 0,025·s·u(u+1)/2` (preço novo) ou `perPrice = 0` e `flat = 2·0,025·s·u` (diferença). Só ordem de venda (`mode 'order'`) e **não** quando a saída está marcada "Sem imposto" (`'none'`: sem taxa de criação, 048/D-056) nem em ordem de compra na hora (`'instant'`, O6).

## Arquivos: exclusivos, compartilhados, ordem

**Criados:** `client/src/lib/relist.js`, `relist.test.js`, `craftPlan.relist.test.js`, `client/src/components/OrderLifeCard.jsx`, `OrderLifeCard.test.jsx`, `Crafting.relist.test.jsx`, `Refining.relist.test.jsx`.
**Alterados:** `client/src/lib/craftPlan.js` (bloco de opções de venda e retorno), `client/src/lib/refinePlan.js` (`evaluateTier`), `client/src/lib/stress.js` (`craftStressInput`, `refineStressInput`), `client/src/components/Crafting.jsx` e `Refining.jsx` (cartão novo, nota na tabela, argumento do estresse), `client/src/lib/persistSchemas.js` (3 campos em `craft:cfg` e 3 em `refine:cfg`), `client/src/lib/inputRules.js` (**só** `export` em `br` e `echoValue`, 2 palavras; se a 054/065 já exportaram, nada a fazer).
**NÃO toca:** `econ.js`, `targetPrice.js`/`TargetPrice.jsx` (075 em execução: a estimativa do cartão Preço-alvo continua separada, e a tela diz isso), `flip.js`/`Flipper.jsx`, `exits.js`, `extras.js`, `cityCompare.js`, catálogo, `index.css`.
**Conflitos (ver ordem no fim):** `Crafting.jsx`, `craftPlan.js` e `persistSchemas.js` com a **065**; `Refining.jsx` com a 075 (uma linha do `TargetPrice`) e com a 080 (se mexer em `StressTest`); `stress.js` com a 080 (testes). **Ordem sugerida: 059 antes da 065** (a 065 troca o `price` da opção; a 059 subtrai do líquido calculado sobre ele; nessa ordem a 065 só troca uma variável).

## Interfaces

```js
// relist.js (puro)
export const SETUP_BASES = ['price', 'diff']                      // 'price' = padrão (suposição O4)
cleanRelist(cfg, { premium = true }) -> { values: { updates: int, step: number, base: 'price'|'diff' }, issues }
  // lê cfg.relists, cfg.relistStep, cfg.relistBase; issues no formato de inputRules ({ field, level, code, msg, raw, used }),
  // field: 'relists' | 'relistStep' | 'relistBase'. `relists` valida por validateInputs (já existente: máx 37 com premium, 35 sem).
relistParts({ updates = 0, step = 0, base = 'price' }) -> { perPrice, flat }   // não finito/negativo -> 0 (defesa)
relistCost({ price, qty = 1, updates, step, base }) -> number     // extra em prata do lote: qty * (perPrice*price + flat)
netSaleWithRelists({ price, qty = 1, mode, premium, updates, step, base }) -> { net, relistCost, setupTotal }
  // net = netSale(price, mode, premium) * qty - relistCost; relistCost = 0 e setupTotal = 0 fora de 'order';
  // setupTotal (só 'order') = SETUP_FEE * qty * price + relistCost (taxa de criação acumulada do lote)
// craftPlan.computeCraft: cada opção de venda ganha relistCost e setupTotal (lote); o retorno ganha relist: { updates, step, base } (valores LIMPOS)
//   e os avisos de cleanRelist entram em `issues`.
// refinePlan.evaluateTier({ ..., relist }) com relist = { updates, step, base } (default 0): net por unidade já desconta; devolve relistCost e setupTotal por unidade.
// stress.js: craftStressInput(c, premium) lê c.relist; refineStressInput(unit, rrr, sell, premium, { extrasPerUnit, noTax, relist }).
```

## Mensagens (texto final, em português)

**Título do cartão:** "Ordem de venda: atualizações". **Texto:** "Cada vez que você atualiza o preço de uma ordem de venda, o jogo cobra a taxa de criação (2,5%) de novo; cancelar não devolve a taxa. Informe quantas atualizações espera fazer até vender. Vale só para saídas em “Ordem de venda”: não vale para ordem de compra na hora nem para saídas marcadas “Sem imposto”." **Campos:** "Atualizações da ordem (relistagens)"; "Queda de preço por atualização (prata)" com a dica "Sua ordem começa acima do preço de venda mostrado: preço inicial = preço de venda + atualizações × queda. Vazio = 0 (todas as taxas sobre o mesmo preço)."; "Base da taxa na atualização" com opções "Sobre o preço novo (suposição do app)" e "Sobre a diferença de preço" e a dica **"Como o jogo calcula a taxa de uma atualização NÃO foi confirmado em fonte. Para conferir: liste 1 item a 1.000 (taxa 25) e atualize para 990; se cobrar 24,75 a base é o preço novo, se cobrar 0,25 é a diferença."** **Resumo** (só com atualizações > 0 e a melhor saída em ordem de venda sem imposto): "{u+1} listagens: taxa de criação acumulada {x} no lote, dos quais {y} são das atualizações (duas casas decimais)." **Quando não se aplica** (melhor saída é ordem de compra ou "sem imposto"): "A melhor saída não é uma ordem de venda com imposto: as atualizações não se aplicam a ela." **Rodapé honesto (sempre que o cartão aparece):** "Considera o lote inteiro numa única ordem. Não considera a duração/expiração da ordem nem vendas parciais (sem fonte). O cartão Preço-alvo tem a sua própria estimativa de relistagens e não usa este campo." **Nota na tabela "Onde vender"/Refino** (só com atualizações > 0): "O líquido das ordens de venda já desconta {u} atualização(ões) da ordem."

## Tasks (1 commit cada; teste primeiro e visto falhar; cada passo tem comando e saída esperada)

### Task 1: `relist.js` (puro, project `logic`)
**Files:** Create `relist.test.js`, `relist.js`; Modify `inputRules.js` (export de `br`/`echoValue`, se ainda não).
- [ ] **Step 1: testes falhando** (números recalculados com `node -e`; premium = 4%, `SETUP_FEE` = 0,025):

```js
it('relistParts preço novo: u=2,s=10 -> flat 0,75 e perPrice 0,05; u=4,s=10 -> flat 2,5 (flat do preço novo ≠ flat da diferença: u=2 -> 1, u=4 -> 2)', () => {});
it('relistParts diferença: u=2,s=10 -> { perPrice: 0, flat: 1 }; u=4 -> flat 2', () => {});
it('relistParts defende: updates/step NaN, null, texto, negativo ou Infinity -> { perPrice: 0, flat: 0 }; base desconhecida = preço novo', () => {});
it('netSaleWithRelists dossiê: 4.470, n 1, order, premium, u 3, s 10 -> net 3.842,70, relistCost 336,75, setupTotal 448,50 (112,50+112,25+112,00+111,75)', () => {});
it('n = 5 (mesma conta): relistCost 1.683,75, setupTotal 2.242,50, net 19.213,50', () => {});
it('u = 0: net = netSale(4470,"order",true) = 4.179,45, relistCost 0, setupTotal 111,75 (identidade com a conta de hoje)', () => {});
it('u 2, s 10: preço novo -> relistCost 224,25 e net 3.955,20; diferença -> relistCost 1 e net 4.178,45', () => {});
it('sem premium (8%): 4.470, u 1, s 0 -> net 3.888,90 (4.000,65 − 111,75)', () => {});
it('instant e none: u = 3 não muda nada: instant 4.291,20 (4.470 × 0,96); none 4.470; relistCost 0 e setupTotal 0', () => {});
it('cleanRelist: "3" -> 3 sem aviso; "" , undefined -> 0 sem aviso; "abc" -> 0 e aviso field relists; -1 -> 0; 2,7 -> 2 com aviso relists-decimal; 100 -> 37 (premium) e 35 (sem premium) com aviso relists-max', () => {});
it('cleanRelist step: "10" -> 10; "" -> 0 sem aviso; "x" / -5 / NaN -> 0 com aviso relistStep (mensagem sem eco de objeto: { } e [3] não aparecem no texto); 1e12 -> 1e9 com aviso', () => {});
it('cleanRelist base: undefined -> "price" sem aviso; "diff" -> "diff"; "foo", 3, null... -> "price" com aviso relistBase (null = ausente, sem aviso)', () => {});
it('cleanRelist com cfg null/undefined/array/texto: valores padrão sem lançar', () => {});
```
- [ ] **Step 2:** `npx vitest run --project logic src/lib/relist.test.js` → FAIL (`Failed to resolve import`). **Step 3:** implementar as quatro funções (`relistCost` e `netSaleWithRelists` chamam `relistParts` e `netSale` de `econ.js`; `cleanRelist` chama `validateInputs({ relists })` e acrescenta as regras de `step` e `base`; eco de valor só via `echoValue`). **Step 4:** mesmo comando → PASS; `npm run check`. **Step 5: Commit:** `feat: relist.js, custo de atualização da ordem de venda (IDEIA-059)`.
- Mutações a derrubar (cópia fora do repositório): fórmulas de `flat` trocadas entre as bases; `u` no lugar de `u+1` no somatório; extra aplicado a `instant`/`none`; `qty` ignorado; `step` somado em `perPrice`; remover o teto de 37; `SETUP_FEE` no lugar de `SETUP_FEE * qty`.

### Task 2: Craft: `computeCraft` e `craftStressInput` (project `logic`)
**Files:** Create `craftPlan.relist.test.js`; Modify `craftPlan.js`, `stress.js`.
- [ ] **Step 1: testes falhando** (montagem de `Crafting.extras.test.jsx` em nível de lib: `loadFixtureCatalog()`, `T4_MAIN_SWORD`, receita da fixture, `refine` BUY, bancada 500, especialização, METALBAR 200, LEATHER 150; custo total **3.524,27**, `premium` true; venda **Caerleon 4.470** em ordem de venda):

```js
it('sem os campos novos (estado antigo) e com relists 0 / "" / undefined: options, best e totalCost idênticos entre si (toEqual) e lucro 655,18 (4.179,45 − 3.524,27)', () => {});
it('relists 3, step 10 (dossiê): net da opção 3.842,70, relistCost 336,75, setupTotal 448,50, lucro 318,43; c.relist = { updates: 3, step: 10, base: "price" }', () => {});
it('relists 3, step 0: lucro 319,93 (335,25 de extra)', () => {});
it('base "diff", relists 2, step 10: net 4.178,45 e lucro 654,18 (4.178,45 − 3.524,27); com a base preço novo, mesmos u e s: net 3.955,20 e lucro 430,93', () => {});
it('saída marcada Sem imposto (noTax Caerleon|order): net 4.470, lucro 945,73, relistCost 0 mesmo com relists 3', () => {});
it('opção instant (ordem de compra 4.300): relists 3 não muda: lucro 603,73 (4.300 × 0,96 − 3.524,27)', () => {});
it('a melhor saída usa o líquido com atualizações: com Caerleon ordem 4.470 e Martlock instantânea (ordem de compra) 4.300, relists 0 -> melhor Caerleon (655,18); relists 3, step 10 -> melhor Martlock (603,73 > 318,43)', () => {});
it('cfg corrompida direto na lib: relists null, {}, [3], NaN, Infinity, "abc", -2 -> trata como 0 e NÃO lança; relists "abc" devolve aviso em issues com field "relists"; relistBase "foo" -> price e aviso', () => {});
it('craftStressInput (c com relists 3, step 10, base price): k = 0,935 − 0,075 = 0,86 e fixed inclui + 1,5; stressProfit(input, {}) ≈ 318,43 = lucro da tela', () => {});
it('craftStressInput com saída noTax ou instant: k e fixed iguais aos de hoje (relist ignorado)', () => {});
it('invariante: para relists ∈ {0,1,2,5}, step ∈ {0,10}, base ∈ {price,diff}: stressProfit(craftStressInput(c))·units ≈ c.best.profit (a grade do estresse e a tela nunca discordam)', () => {});
```
- [ ] **Step 2:** `npx vitest run --project logic src/lib/craftPlan.relist.test.js` → FAIL. **Step 3:** em `computeCraft`: `const rl = cleanRelist(cfg, { premium })` (sobre o `cfg` **bruto** recebido; os avisos entram em `issues`); no laço `options.forEach` trocar a linha de `o.net` por `netSaleWithRelists({ price: o.price, qty: units, mode: o.noTax ? 'none' : o.mode, premium, ...rl.values })` guardando `o.net`, `o.relistCost`, `o.setupTotal`; retornar `relist: rl.values`. Em `craftStressInput`: `const rp = relistParts(c.relist)`; `k = netSale(1, mode, premium) - (mode === 'order' ? rp.perPrice : 0)`; `fixed` soma `mode === 'order' ? rp.flat : 0`. **Step 4:** PASS; `npm run test:logic` (nada existente muda). **Step 5: Commit:** `feat: líquido do Craft e estresse descontam as atualizações da ordem (IDEIA-059)`.
- Mutações: relist aplicado a `instant`/`noTax`; `cfg` limpo (`cleanCraftCfg`) em vez do bruto (perderia o aviso); `stress` sem `flat`; `perPrice` ignorado no estresse; ordenar as opções antes de calcular o líquido.

### Task 3: Refino: `evaluateTier` e `refineStressInput` (project `logic`)
**Files:** Modify `refinePlan.js`, `stress.js`; Create `refinePlan.relist.test.js` (ou acrescentar a `craftPlan.relist.test.js`: escolher um e dizer no commit).
- [ ] **Step 1: testes falhando** (cenário A: tábua T4, custo 61,4734; venda em **Martlock, ordem, 135**; premium):

```js
it('sem relist: net 126,225 e lucro 64,7516 por unidade (idêntico à master)', () => {});
it('relist { updates: 2, step: 0, base: "price" }: relistCost 6,75, net 119,475, lucro 58,0016 por unidade (5.800,16 no lote de 100); setupTotal 10,125', () => {});
it('relist em venda instantânea (Mercado Negro 140) e com noTax: sem efeito (lucro 72,93 na instantânea e 78,53 com noTax, como na 048)', () => {});
it('refineStressInput com relist: stressProfit ≈ lucro por unidade (58,0016); sem relist idêntico ao de hoje', () => {});
```
- [ ] **Step 2:** FAIL. **Step 3:** `evaluateTier({ ..., relist = {} })`: `const r = netSaleWithRelists({ price: best.price, mode: noTax ? 'none' : mode, premium, ...relist })`; `net = r.net`; devolver `relistCost` e `setupTotal`. `refineStressInput(..., { extrasPerUnit = 0, noTax = false, relist } = {})` igual ao Craft (`mode` já calculado lá). **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: líquido do Refino e estresse descontam as atualizações da ordem (IDEIA-059)`.
- Mutações: `relist` ignorado em `evaluateTier`; aplicado quando `mode === 'instant'`; `qty` multiplicando duas vezes.

### Task 4: `OrderLifeCard` + telas + esquema salvo
**Files:** Create `OrderLifeCard.jsx`, `OrderLifeCard.test.jsx`, `Crafting.relist.test.jsx`, `Refining.relist.test.jsx`; Modify `Crafting.jsx`, `Refining.jsx`, `persistSchemas.js`.
- [ ] **Step 1: testes falhando** (project `ui`; `beforeEach(resetApp)`; mocks `usePrices`/`useHistory` como em `Crafting.extras.test.jsx`; chaves semeadas com `seed(...)`):

```js
// OrderLifeCard (isolado): props { cfg, set, issues, applies, listings, setupTotal, relistCost }
it('mostra os 3 campos, o texto de escopo e o rodapé "Não considera a duração/expiração da ordem"; sem o texto de base afirmar que é fato (contém "NÃO foi confirmado")', () => {});
it('com applies false mostra "A melhor saída não é uma ordem de venda com imposto"; com applies true e updates 3 mostra "4 listagens" e "448,50"', () => {});
// Crafting (T4_MAIN_SWORD, mesma montagem da 048, venda Caerleon 4.470)
it('estado antigo (craftCfg() sem relists/relistStep/relistBase): lucro +655, nenhum aviso de relistagem; o cartão existe com updates vazio', () => {});
it('digitar 3 em "Atualizações" e 10 em "Queda": grava relists "3" e relistStep "10" em craft:cfg, lucro +318, a linha "Líquido" da tabela 3.843, resumo "4 listagens … 448,50" e a nota do líquido "desconta 3 atualização(ões)"', () => {});
it('trocar a base para "diferença" grava relistBase "diff" e o lucro passa a 654 (u=3,s=10: extra 1,50)', () => {});
it('Sem imposto marcado na saída: o resumo vira "não se aplicam" e o lucro volta a +946', () => {});
it('estado corrompido: relists "abc" -> aviso "Relistagens "abc" inválidas: usando 0." sob o campo e lucro 655; relists null/[3]/{} no armazenamento (o carregamento descarta o campo) -> sem aviso e lucro 655; relistBase "foo" -> sem exceção; relists 100 -> aviso de máximo 37 e o selo "valores corrigidos" conta o aviso', () => {});
it('o Preço-alvo não muda quando as atualizações do Craft mudam (cartões independentes) e o rodapé do cartão diz isso', () => {});
// Refining (cenário A, sellCity Martlock, ordem, qty 100): idem
it('estado antigo: lucro por unidade +65 e total 6.475; com relists 2: +58 e 5.800; nota do líquido e cartão; Sem imposto liga: o cartão diz "não se aplicam"; corrompido: "abc" avisa e usa 0', () => {});
it('persistSchemas: craft:cfg e refine:cfg aceitam relists/relistStep (numText) e relistBase (enum price|diff); valor inválido de relistBase é descartado no carregamento', () => {});
```
- [ ] **Step 2:** `npx vitest run --project ui src/components/OrderLifeCard.test.jsx src/components/Crafting.relist.test.jsx src/components/Refining.relist.test.jsx` → FAIL. **Step 3:** `persistSchemas.js`: `relists: 'numText'`, `relistStep: 'numText'`, `relistBase: { enum: ['price', 'diff'] }` em `craft:cfg` e em `refine:cfg` (nenhum padrão novo em `usePersisted`: `CURRENT_DEFAULTS` não muda). `Crafting.jsx`: `<OrderLifeCard …/>` entre o `FocusCard` e o cartão "Onde vender" (`applies = !!best && best.mode === 'order' && !best.noTax`; `listings = c.relist.updates + 1`; `setupTotal`/`relistCost` de `best`), `issues` do cartão = os de `c.issues` com `field` em `relists|relistStep|relistBase`; nota abaixo da tabela quando `c.relist.updates > 0`; `craftStressInput(c, premium)` não muda de chamada. `Refining.jsx`: `const rl = cleanRelist(cfg, { premium })`, passar `relist: rl.values` ao `evaluateTier` e ao `refineStressInput`, cartão com `cur`, avisos de `rl.issues` somados aos `issues` no selo e nos `InputIssues`; o campo `qty` multiplica `cur.setupTotal`. **Step 4:** PASS; `npm run check` (o contrato `set({...})` de `persistSchemas.test.js` cobre os campos novos). **Step 5: Commit:** `feat: cartão de atualizações da ordem de venda no Craft e no Refino (IDEIA-059)`.
- Mutações: cartão sem `relistBase` ligado ao cálculo; `applies` sempre true; resumo com 3 listagens no lugar de 4; campo novo fora do `persistSchemas.js`; `cfg` limpo sem os avisos.

### Task 5: conferência manual (sem commit)
- [ ] 375 px: o cartão não rola na horizontal e as duas colunas de campos não truncam rótulo (lição da D-053/D2: rótulo "Queda de preço por atualização (prata)" em duas linhas). Estado antigo: gravar `craft:cfg` sem os campos e abrir. **Conferir `location.port` antes de gravar em `localStorage`.**

## Como o Tester valida
1. **Casos concretos do plano** (todos existem, falharam antes): 448,50 / 336,75 / 3.842,70 / lucro 318,43 contra 655,18 (dossiê §4); `u = 0` idêntico à master; `instant` e `noTax` sem efeito; Refino 58,0016; invariante tela × estresse.
2. **Diferencial:** `computeCraft` e `evaluateTier` com os campos ausentes × `master`, ≥ 3.000 combinações, 0 diferença; estado antigo (`SAVED_STATES`) renderiza igual.
3. **Mutações** das Tasks em cópia fora do repositório; sobrevivente reprova.
4. **Texto:** a tela nunca apresenta a base da atualização como fato; diz que expiração e vendas parciais não entram; o Preço-alvo não é alterado.
5. **O que um usuário estranharia:** atualizações > 0 mexendo na saída "ordem de compra na hora"; lucro do estresse diferente do da tela; valor corrompido derrubando a tela; cartão sem avisar que a saída escolhida não é ordem de venda.

## Riscos
1. **A base do fee (O4) pode estar errada:** mitigada pelo seletor e pela instrução de medir em jogo; se a medição mostrar uma terceira regra, só `relistParts` muda.
2. **Duplicidade de conceito** com `target:cfg.relists` (estimativa do Preço-alvo): aceita agora (a 075 mexe naquele arquivo); unificação é a pergunta 2.
3. **`Crafting.jsx`/`craftPlan.js` quentes:** conflito previsível com a 065 (ver ordem).

## Critério de pronto
`npm run check` verde sem alterar teste existente; mutações derrubadas; só os arquivos listados alterados (`econ.js`, `TargetPrice.jsx`, `Flipper.jsx` intactos); campos novos em `persistSchemas.js`; conferência da Task 5 registrada.

## PERGUNTAS PARA O GERENTE
1. **Base padrão da atualização = "preço novo"** (suposição O4, BAIXA). Aprova, ou o padrão deve ser a opção mais barata para o usuário ("diferença") até medir?
2. **Unificar com o Preço-alvo:** depois da 075, o Preço-alvo passa a ler `relists` do Craft em vez de ter o seu campo? (Mudaria `target:cfg` e exigiria migração; fica fora desta ideia.)
3. **Escopo:** Flipper (muitas linhas, sem cfg de ordem) e ordem de compra de material (IDEIA-061) ficam de fora. Confirma?
4. **"Queda de preço por atualização"** é um campo extra que o dossiê só insinua ("passo do undercut"). Mantém (padrão 0) ou fica só o contador?
5. O teto de 37 atualizações vem da regra já existente (`maxRelists`, líquido zerado); com queda > 0 o líquido pode ficar negativo antes disso e a tela só mostra o prejuízo. Aceita?
