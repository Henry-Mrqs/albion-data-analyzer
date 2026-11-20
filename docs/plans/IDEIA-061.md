# IDEIA-061 — Ordem de compra × compra instantânea dos materiais: economia, idade da ordem e spread: plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-061`. Comandos `npm` em `client/`. **Pré-requisitos (já na `master`):** `econ.js` (`SETUP_FEE`, `buyQuote`), `market.js` (`quote`, `CITIES`), `craftPlan.js` (`plan`), 060, 069, 070, 005 (auditor). **Depois da 062** (mesma região de `Crafting.jsx`, `audit/craft.js` e a chave `depth` de `core.js`). **Regras do briefing:** teste escrito, **executado e visto falhar** antes de implementar; os de componente em `*.test.jsx`; **nenhum `*.test.jsx` com `usePersisted('chave'` literal** (use `seed()`/`craftCfg()`). Fonte: `docs/research/IDEIA-061.md`.

**Problema:** o app já tem a chave "Comprar com ordens de compra" (`buyQuote` com `useOrders`: maior preço de compra × 1,025), mas **não mostra** quanto se economiza, a **idade** da ordem nem o **spread**. O jogador liga a ordem, o lucro sobe e ele esquece que o preço de compra pode ser de 1 unidade ou de 20 horas atrás.

**Objetivo:** cartão **"Ordem de compra × instantâneo (materiais)"** abaixo do "Plano de compra e produção" (Craft), com, por material e cidade do plano: custo instantâneo, custo por ordem, economia (prata e %), idade da ordem de compra, spread e avisos. **Não altera nenhum número do plano** (informativo; o interruptor existente continua sendo o único que muda o cálculo).

**Arquitetura:** `lib/buyCompare.js` puro (reusa `quote` e `SETUP_FEE`; **nenhuma fórmula de imposto nova**). `components/OrderCompareCard.jsx` desenha. `Crafting.jsx` chama `compareRows({ plan, prices, now })` com os dados **já carregados** (nenhum pedido de rede novo: `prices` já traz `s/sd` e `b/bd` de todas as cidades). **Cartão separado, sem coluna na tabela do plano** (evita conflito com a 062 e a tabela larga a 375 px).

## Regras (dossiê §2)
`custo_instantâneo = sell_price_min` (sem setup e sem imposto: B1); `custo_ordem = buy_price_max × 1,025` (taxa de criação de ordem de compra, B1; **a mesma conta de `buyQuote`**); `economia = instantâneo − ordem` (**negativa** quando a ordem não compensa; mostrada com sinal); `economia% = economia ÷ instantâneo`; `spread = sell_price_min ÷ buy_price_max` (só com os dois > 0). Quantidade por linha = a do plano, **arredondada para cima** (`Math.ceil(q − 1e-9)`, igual à tabela do plano), somada por `mid|cidade`. Avisos (**decisão de produto sem fonte, B5, exibidos como "regra do app"**): ordem com **mais de 6 h** (ou **sem data**) e spread **acima de 1,5** (estrito). Cidade sem ordem de compra (`buy_price_max` 0): "sem ordem de compra: só instantâneo" (**não** é economia).
**NÃO considera (dito na tela e no auditor):** o **tempo e a probabilidade** de a ordem encher (B4: sem fonte; o app nunca promete); a **profundidade**: o AODP não tem e a ordem de compra pode ser de **1 unidade** (B2); reajuste da ordem (cada atualização paga 2,5 % de novo; ver IDEIA-059); o **spread de 1,81x/2,74x** do dossiê (B3) é estatística de terceiro e **não** é usado; ordem a `buy_price_max + 1` (topo da fila) não é calculada; compra em outra cidade que não a do plano.

## Arquivos
**Criados:** `client/src/lib/buyCompare.js`, `buyCompare.test.js`, `client/src/components/OrderCompareCard.jsx`, `OrderCompareCard.test.jsx`, `client/src/components/Crafting.orders.test.jsx`.
**Alterados:** `client/src/components/Crafting.jsx` (cartão após o plano; ~8 linhas), `client/src/lib/audit/craft.js` (Var `order-compare`; `auditCraft` repassa `orderCompare`), `client/src/lib/audit/core.js` (+`orderFill`; **+`depth` só se a 062 ainda não entrou**), `client/src/lib/audit/craft.test.js`.
**NÃO toca:** `persistSchemas.js` (**nenhum campo salvo novo**: os limiares são constantes), `econ.js` (a função fica em arquivo novo, para não disputar o arquivo mais usado do app), `craftPlan.js`, `market.js`, `Refining.jsx` (Refino fora; D-060), `Flipper.jsx`, catálogo.
**Compartilhados:** `Crafting.jsx`/`audit/craft.js`/`core.js` com 062/051/003/009 (um cartão/Var cada; conflito textual); a chave `NOT_CONSIDERED.depth` é **da 062**: se a 061 entrar antes, cria-a com o mesmo texto e a 062 a reaproveita. `Crafting.jsx` também com 012/059/065 (blocos de venda).

## Interfaces
```js
// buyCompare.js (puro)
export const BUY_ORDER_STALE_H = 6, BUY_SPREAD_WARN = 1.5;                       // regra do app (sem fonte)
buyCompare(prices, mid, city, { now = Date.now() } = {}):
  { city, instant, order, savings, savingsPct, spread, orderAgeMs, flags }
  // instant = s (>0) ou null; order = b×(1+SETUP_FEE) (b>0) ou null; savings = instant−order se ambos, senão null; savingsPct = savings/instant;
  // spread = s/b se ambos > 0; orderAgeMs = now − bd (bd ausente ⇒ null)
  // flags = { noInstant, noOrder, staleOrder, wideSpread, orderWorse }
  //   staleOrder: order existe E (bd ausente OU idade > 6 h); wideSpread: spread > 1,5; orderWorse: savings < 0
compareRows({ plan, prices, now }): { rows, totals }
  // plan: linhas de computeCraft().plan; usa só kind==='buy' com mid string, city string em CITIES (Black Market fora), qty finita > 0
  // row = { mid, city, qty, ...buyCompare, instantTotal, orderTotal, savingsTotal }  (totais = preço × qty inteira; null se o preço for null)
  // totals = { instant, order, savings, savingsPct, noOrder: n, comparable: n }  (soma só das linhas com os dois preços; savingsPct sobre `instant` somado)
```
Qualidade 1 apenas (como o resto do app).

## Mensagens (texto final)
Título **"Ordem de compra × instantâneo (materiais)"**. Dica: "Compara, na cidade que o plano usa, comprar já (menor preço de venda) com criar uma ordem de compra (maior preço de compra + 2,5% de taxa de criação). A ordem pode demorar ou nunca encher, e o preço de compra pode ser de 1 unidade ou de horas atrás: o app não vê a profundidade das ordens nem o prazo de preenchimento. Avisos (regra do app, sem fonte): ordem com mais de 6 h e spread acima de 1,5." Cabeçalho do plano: "O plano acima compra {instantâneo | com ordens de compra}" (lê `cfg.useOrders`). Avisos por linha: "ordem de {N} h atrás" / "ordem sem data", "spread {2,05}x: o preço de compra pode ser de 1 unidade", "a ordem custa mais que comprar já", "sem ordem de compra: só instantâneo". Rodapé: "Economia possível (não garantida): {X} ({Y}%) em {N} de {M} materiais; {K} sem ordem de compra." Sem linhas comparáveis: "Nenhum material com preço de compra e de venda nas cidades do plano."

## Tasks (1 commit cada; teste primeiro e visto falhar)

### Task 1: `buyCompare` (puro, project `logic`)
**Files:** Create `buyCompare.test.js`, `buyCompare.js` (`buyCompare` e constantes).
- [ ] **Step 1: testes falhando** (dados reais do dossiê §4, `T4_METALBAR`, API West, qualidade 1, **constantes do teste**; `now = Date.UTC(2026, 10, 18, 1, 15)`; datas `sd`/`bd` em ms UTC; valores recalculados com `node -e`):
```js
const T = (d, h, m) => Date.UTC(2026, 10, d, h, m);
const prices = mkPrices({ T4_METALBAR: {
  Lymhurst:        { s: 267, sd: T(17, 19, 25), b: 201, bd: T(17, 8, 55) },
  Caerleon:        { s: 410, sd: T(17, 21, 5),  b: 306, bd: T(17, 21, 5) },
  Thetford:        { s: 248, sd: T(17, 19, 45), b: 217, bd: T(17, 5, 30) },
  'Fort Sterling': { s: 220, sd: T(17, 20, 0) },
} });
it('Lymhurst: ordem 206,025 · economia 60,975 por barra (22,84%) · spread 1,3284 · idade 16,33 h => ordem velha, sem aviso de spread', () => {
  const r = buyCompare(prices, 'T4_METALBAR', 'Lymhurst', { now });
  expect(r.order).toBeCloseTo(206.025, 3); expect(r.savings).toBeCloseTo(60.975, 3); expect(r.savingsPct).toBeCloseTo(0.2284, 4);
  expect(r.spread).toBeCloseTo(1.3284, 4); expect(r.orderAgeMs / 3600000).toBeCloseTo(16.333, 3);
  expect(r.flags).toMatchObject({ staleOrder: true, wideSpread: false, noOrder: false, orderWorse: false });
});
it('Caerleon: ordem 313,65 · economia 96,35 (23,5%) · spread 1,3399 · idade 4,17 h => sem aviso nenhum', () => {});
it('Thetford: ordem 222,425 · economia 25,575 (10,31%) · spread 1,1429 · idade 19,75 h => ordem velha', () => {});
it('Fort Sterling (sem ordem de compra): order null, savings null, spread null, flags.noOrder true, staleOrder false', () => {});
```
Mais: limites **estritos** (um `it.each`): spread exatamente 1,5 (`s 300, b 200`) ⇒ `wideSpread` **falso**, 1,5001 ⇒ verdadeiro; idade exatamente 6 h ⇒ `staleOrder` **falso**, 6 h + 1 ms ⇒ verdadeiro; `bd` ausente com `b > 0` ⇒ `staleOrder` verdadeiro e `orderAgeMs` `null`; `b > 0` sem `s` ⇒ `noInstant`, sem economia/spread, e **sem** exceção; `s` 100 e `b` 99 ⇒ ordem 101,475, economia −1,475, `orderWorse` verdadeiro; preços `NaN`/negativos/`undefined`/string ⇒ tratados como ausentes; `prices` `null`/`undefined`, `mid`/`city` inexistentes ⇒ tudo `null` e flags `noInstant`+`noOrder`, sem lançar; data **no futuro** (`bd > now`) ⇒ idade 0 (não negativa); `now` ausente usa `Date.now()`.
- [ ] **Step 2:** `npm run test:logic -- src/lib/buyCompare.test.js` → FAIL. **Step 3:** implementar com `quote(prices, mid, city, 'sell'|'buy')` e `SETUP_FEE`. **Step 4:** PASS.
- [ ] **Mutações (cópia fora do repo):** taxa 2,5 % esquecida; `>` → `>=` em 6 h e em 1,5; spread invertido (`b/s`); idade em minutos; `noOrder` tratado como economia 100 %: derrubadas. **Step 5: Commit** `feat: comparação ordem × instantâneo (IDEIA-061)`.

### Task 2: linhas e totais do plano (puro)
**Files:** Modify `buyCompare.test.js`, `buyCompare.js` (`compareRows`).
- [ ] **Step 1: testes falhando.** Caso do dossiê §4: plano com 1 linha `{ kind: 'buy', mid: 'T4_METALBAR', city: 'Lymhurst', qty: 1203 }` ⇒ `instantTotal` **321.201**, `orderTotal` **247.848,075**, `savingsTotal` **73.352,925** (22,84 %); com `qty: 1203.01` (o que o plano realmente tem: 1.203,01) ⇒ arredonda **para cima** para 1.204 ⇒ **321.468 · 248.054,1 · 73.413,9**. Várias cidades: Lymhurst (1.203), Thetford (100), Fort Sterling (50) ⇒ `totals.noOrder = 1`, `comparable = 2`. Duas linhas do plano com o mesmo `mid|cidade` (`qty` 1,5 e 1,5) somam **antes** de arredondar: 3 unidades (arredondar por linha daria 2 + 2 = 4). `totals.instant`/`order`/`savings` somam **só as linhas comparáveis** (as sem ordem de compra ficam fora, e entram só em `noOrder`), para o % fechar. Ignoradas **sem lançar**: `kind: 'make'`, `city` ausente ou `'Black Market'`, `qty` 0/negativa/`NaN`/`Infinity`/string, `mid` não string; `plan`/`prices` `null`/`undefined` ⇒ `{ rows: [], totals: { instant: 0, order: 0, savings: 0, savingsPct: null, noOrder: 0, comparable: 0 } }`; quantidade enorme (`1e12`) ⇒ totais finitos ou `null` (nunca `NaN` na tela); ordem das linhas = ordem do plano.
- [ ] **Steps 2–5:** FAIL → implementar → PASS → mutações (arredondar por linha antes de somar; incluir Black Market; incluir não comparáveis no total): derrubadas → **Commit** `feat: totais da comparação de compra do plano (IDEIA-061)`.

### Task 3: cartão (jsdom)
**Files:** Create `OrderCompareCard.test.jsx`, `OrderCompareCard.jsx`. Props: `{ rows, totals, useOrders, now }`.
- [ ] **Step 1: testes falhando:** com as 3 linhas do dossiê (Lymhurst 1.203, Thetford 100, Fort Sterling 50): "321.201" e "247.848" na linha de Lymhurst, "22,8%"; avisos: Lymhurst "ordem de 16 h atrás" (formato inteiro de horas), Thetford "ordem de 20 h atrás", Fort Sterling "sem ordem de compra: só instantâneo"; **nenhum** aviso de spread (1,33 e 1,14 < 1,5); linha com spread 2,05 mostra "spread 2,05x: o preço de compra pode ser de 1 unidade"; linha `orderWorse` mostra "a ordem custa mais que comprar já" e a economia **negativa com sinal**; cabeçalho muda com `useOrders` ("compra instantâneo" × "com ordens de compra"); rodapé "Economia possível (não garantida): 73.353 (22,8%) em 2 de 3 materiais; 1 sem ordem de compra" (valores do teste de totais); sem linhas ⇒ a mensagem vazia; a dica cita "profundidade", "prazo" e "regra do app"; nenhuma palavra "garantida" sem o "não".
- [ ] **Steps 2–5:** FAIL → implementar (sem conta; só formata `rows`/`totals` com `fmt`) → PASS → **Commit** `feat: cartão Ordem × instantâneo (IDEIA-061)`.

### Task 4: ligar no Craft (jsdom; mocks de `usePrices`/`useHistory` como `Crafting.targetNoTax.test.jsx`; `freezeNow`)
**Files:** Create `Crafting.orders.test.jsx`; Modify `Crafting.jsx`.
- [ ] **Step 1: testes falhando.** Cenário: espada T4, `refine: { METALBAR: 'buy', LEATHER: 'buy' }`, preços com `sd`/`bd` e `s`/`b` por cidade para `T4_METALBAR` e `T4_LEATHER` (só Lymhurst, valores escolhidos pelo teste: barra `s 267, b 201, bd` 16 h atrás; couro `s 322, b 0`): o cartão existe; `T4_METALBAR` mostra economia e aviso de idade; `T4_LEATHER` mostra "sem ordem de compra"; os **números do plano** (tabela, custo total, lucro) são **idênticos** com e sem o cartão (compara o texto da tabela antes/depois de montar com `useOrders: true`/`false`: só o interruptor muda o plano, nunca o cartão); com `useOrders: true` o cabeçalho do cartão diz "com ordens de compra"; **nenhuma chamada nova** de `usePrices`/`useHistory` (conta chamadas e argumentos iguais aos de antes); sem `prices` ⇒ sem cartão; **estado antigo** (`craftCfg()` sem campos novos) ⇒ cartão renderiza e `localStorage` fica **inalterado**; **corrompido** (`useOrders: 'x'`, `matCity: 42`) ⇒ sem tela branca (o cálculo principal já sanitiza).
- [ ] **Steps 2–4:** implementar (`compareRows({ plan, prices, now })` com o `now` já existente em `Crafting.jsx`); `npm run test:ui` verde. **Step 5: Commit** `feat: Ordem × instantâneo no Craft (IDEIA-061)`.

### Task 5: auditor (contrato `registerScreen`)
**Linhas que este plano registra** (**nenhum campo salvo novo** ⇒ `contract.test.js` não muda):
| Var (tela `craft`) | `fields` | kind / affects | Linha |
|---|---|---|---|
| `order-compare` | `[]` | `info-only` / `none` | "Ordem × instantâneo dos materiais": valor "N de M materiais com ordem mais barata, economia X (não garantida)" ou "sem comparação (sem preços)"; origem `derived`; nota "Não muda o lucro. Avisos (6 h, spread 1,5): regra do app, sem fonte." |
| `nc-orderFill` (via `notConsideredRows(['orderFill'])`) | `[]` | `not-considered` / `none` | `NOT_CONSIDERED.orderFill = ['Prazo e probabilidade de a ordem de compra encher', 'O app não sabe se nem quando a ordem enche; o preço de ordem é o último visto e pode ser de 1 unidade.']` |
| `nc-depth` | `[]` | `not-considered` / `none` | texto da 062 (se ainda não existir, criar igual) |
**Files:** Modify `audit/craft.js` (`auditCraft` repassa `orderCompare: i.orderCompare`), `core.js`, `Crafting.jsx` (passa `{ rows, totals }`), `craft.test.js`.
- [ ] **Step 1: testes falhando** em `craft.test.js`: com as 3 linhas do dossiê ⇒ linha `order-compare` com **os mesmos** números do cartão (monta por `compareRows`, nunca recalcula); sem `orderCompare` ⇒ "sem comparação"; `nc-orderFill` e `nc-depth` presentes; `ctx.orderCompare` lixo (`{rows: 5}`, `'x'`) ⇒ "não foi possível ler" sem lançar; `sensitivity.test.js` sem probe (sem campo) segue verde; mutação: marcar `order-compare` como `applied` ⇒ o registro exige `probe` ⇒ reprova. `Crafting.audit.test.jsx`: o quadro mostra as linhas. **Se `craft.test.js` fixa contagens de linhas, atualizar só as contagens e declarar.**
- [ ] **Steps 2–5:** FAIL → implementar → `npm run check` verde. **Commit** `feat: auditor lê a comparação ordem × instantâneo (IDEIA-061)`.

### Task 6: conferência manual
- [ ] Com a API real: Craft de Broadsword T4 ×100 em Lymhurst: o cartão mostra economia na ordem de grandeza do dossiê (valores mudam com o mercado, **não são asserções**), idade da ordem, "sem ordem de compra" nas cidades sem ordem; ligar "Comprar com ordens de compra" muda **só** o plano, e o cartão continua igual. **Commit** `docs: conferência da 061`.

## Como o Tester valida
1. **Casos concretos:** 321.201 · 247.848,075 · 73.352,925 (22,84 %) com 1.203; 321.468 · 248.054,1 · 73.413,9 com 1.204 (arredondamento da tabela); Thetford 222,425 / 25,575; Caerleon 313,65 / 96,35; limites estritos 1,5 e 6 h; ordem pior que o instantâneo ⇒ sinal negativo.
2. **Mutações** das Tasks 1 e 2 (cópia fora do repo): sobrevivente reprova. Conferir a mão: `201 × 1,025 = 206,025`.
3. **Plano intacto:** a tabela do plano, o custo e o lucro não mudam com a presença do cartão.
4. **Estado antigo/corrompido:** `craft:cfg` do `9e1e4a2`; `prices` com células sem `bd`, `NaN`, negativas; plano sem linhas `buy`; sem tela branca (perfis do laudo 070).
5. **Honestidade:** o texto diz "não garantida", "1 unidade", "regra do app", e **nunca** promete o preenchimento. **O que o usuário estranharia:** economia mostrada para uma cidade sem ordem de compra; "22 %" sem a idade da ordem ao lado; o cartão alterando o plano.

## Riscos
1. **Preço de ordem de compra ralo** (só 17 % das células têm ordem, segundo uma ferramenta comercial; B3, terceiros): muitas linhas dirão "sem ordem de compra"; correto.
2. **Cidade do plano ≠ cidade da ordem mais alta:** a comparação é **na cidade do plano**; a ordem mais barata pode estar em outra cidade (fora do escopo; pergunta 3).
3. **Limiares sem fonte** (6 h, 1,5): constantes com nome, exibidas como "regra do app".
4. **Conflito textual** em `Crafting.jsx`, `audit/craft.js`, `core.js` com 062/051/003/009/012/059/065.

## Critério de pronto
`npm run check` verde sem alterar teste existente (exceto contagens de linhas de `craft.test.js`, declaradas); mutações derrubadas; só os arquivos listados alterados; nenhum campo novo em `persistSchemas.js`; linhas `order-compare`, `nc-orderFill` e `nc-depth` no auditor; conferência manual registrada.

## PERGUNTAS PARA O GERENTE
1. **Limiares** (ordem > 6 h; spread > 1,5; sem fonte, sugestão do dossiê): aprova como constantes do app, exibidas como "regra do app"?
2. **Cartão informativo** que não muda o plano (o interruptor existente segue como o único que muda): aceita?
3. A comparação é **na cidade que o plano já usa**. Quer também "a melhor cidade por ordem de compra" (pode ser outra cidade, com transporte não modelado)?
4. **Refino** (plano de compra do Refino) fica fora: quer uma ideia separada?
5. O dossiê cita `(buy_price_max + 1) × 1,025` (topo da fila): fora desta versão (só `buy_price_max`, como o app já faz). Ok?
6. Falta fonte para o **prazo de preenchimento** (B4): o usuário pode medir em jogo (quanto tempo uma ordem de compra de material leva) para virar dado?
