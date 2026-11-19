# IDEIA-005 — Auditor de variáveis: o que entrou (e o que ficou de fora) em cada cálculo: plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-005`, a partir da `master` atual. Comandos `npm` em `client/`. **PRIMEIRA a executar entre as novas (D-059):** as outras (059, 065, 054, 012) criam linhas neste auditor. **Pré-requisitos (já na `master`):** 060 (`issues`), 041 (`dailyBonus.js`), 048, 049 (`recipeAlt.js`), 058, 031, 069, 070. **Regras do briefing:** teste escrito, **executado e visto falhar** antes de implementar; **nenhum `*.test.jsx` pode conter `usePersisted('chave'` literal** (use `seed()` de `src/test/ui.js`); o auditor **não grava estado** (nenhum campo novo em `persistSchemas.js`); todo teste de tela tem caso "estado antigo salvo" e "estado corrompido"; todo texto diz o que está e o que **não** está considerado.

**Dossiê:** `docs/research/IDEIA-005.md` (inventário §3, desenho §4, casos §5). **Regras:** V1 (o auditor só lê o que o cálculo usou; nunca recalcula por fórmula própria), V2 (toda linha tem origem e estado), V3 (variável não modelada é listada) são decisão de produto; V4 (constantes do jogo com fonte curta) vem de AUDITORIA-001 (ALTA para a fórmula, 18, 40, 15; MÉDIA-ALTA para 59, diário e imposto); V5 (foco +59 não está no dump) MÉDIA-ALTA; V6 (NÃO VERIFICADO) mantém as marcas existentes. **Termo (D-059):** "bônus diário" do app é o bônus de produção +10/+20 que já existe; o **diário de ofício (journal)** não é modelado e entra como linha **"NÃO considerada"**.

**Problema:** o usuário confia num lucro sem ver o conjunto do que entrou (taxa 400 é padrão do app, bônus diário expirou e virou 0, receita escolhida pela mais barata, preço velho) nem o que não entrou (relistagens, transporte, qualidade, journal).

**Objetivo:** cartão **"Variáveis deste cálculo"** (recolhido, com contagens no cabeçalho) no Craft, no Refino e na aba RRR; uma linha por variável com nome, valor usado, origem e estado; **contrato de registro**: cada tela declara suas variáveis em um módulo e um teste de contrato reprova campo salvo sem linha; **teste de sensibilidade** do dossiê §4.2 reprova linha "aplicada" que não muda o cálculo (e "não considerada" que muda).

**Arquitetura:** `lib/audit/core.js` (construtor de linha com validação, `apiRow`), `lib/audit/registry.js` (declaração de tela e montagem), um módulo por tela (`craft.js`, `refine.js`, `rrr.js`) e `components/VarAuditCard.jsx` (só apresenta). Cada `build(ctx)` **lê** o resultado já calculado (`computeCraft`, `evaluateTier`, `rrrFor`, `effectiveDaily`, `exits`); nenhuma fórmula é copiada. A decomposição do PB vem de uma função exportada de `rrrCalc.js` (extraída do `rrrFor`).

## Contrato de registro (o que as outras ideias fazem)
```js
// registry.js
registerScreen(id, { cfgKeys: ['craft:cfg', 'target:cfg'], ignoredFields: { [campo]: 'motivo curto' }, vars: Var[] })
Var = { id, label, section?, fields: string[],            // campos da cfg que esta linha cobre ([] para linha sem campo)
        kind: 'applied' | 'info-only' | 'not-considered', // o cálculo principal USA, só mostra, ou não modela
        affects: 'cost' | 'profit' | 'none',               // o que o teste de sensibilidade mede
        probe?: { cfg: { campo: novoValor }, settings?: {...} },  // alteração de teste (obrigatória se kind 'applied')
        build(ctx) -> Row }                                 // ctx = { cfg, result, premium, server, now, feeCeiling, issues, item }
Row = { id, label, value, unit, origin, status, source?, date?, note? }
origin in 'game' | 'app-default' | 'user' | 'api' | 'derived'; status in 'applied' | 'unconfirmed' | 'stale' | 'not-considered' | 'info-only'
```
**Regra para toda ideia nova:** campo novo em `craft:cfg`/`refine:cfg`/`rrr:cfg`/`target:cfg` (esquema ou padrão) **ou** em `set({...})` das telas cobertas exige, no mesmo commit, um `Var` com esse campo em `fields` (ou uma entrada em `ignoredFields` com motivo). O teste de contrato (Task 1/2) falha dizendo o nome do campo. Variável nova do jogo que o app **não** modela entra como `kind: 'not-considered'` sem campo.

## Arquivos: exclusivos, compartilhados, ordem
**Criados:** `client/src/lib/audit/{core,registry,craft,refine,rrr}.js` e `*.test.js` correspondentes, `client/src/lib/audit/contract.test.js`, `client/src/lib/audit/sensitivity.test.js`, `client/src/test/setFields.js`, `client/src/components/VarAuditCard.jsx`, `VarAuditCard.test.jsx`, `client/src/components/Crafting.audit.test.jsx`, `Refining.audit.test.jsx`, `RrrCalculator.audit.test.jsx`.
**Alterados:** `client/src/lib/rrrCalc.js` (exporta `pbParts`, extraída; `rrrFor` passa a usá-la, mesma saída), `client/src/lib/persistSchemas.test.js` (importa `setFields` de `src/test/setFields.js`, sem mudar o que testa), `client/src/components/Crafting.jsx`, `Refining.jsx`, `RrrCalculator.jsx` (1 import e 1 elemento no fim de cada tela).
**NÃO toca:** `computeCraft`, `evaluateTier`, `econ.js`, `persistSchemas.js`, `inputRules.js`, `TargetPrice.jsx` (075), `Flipper.jsx`, `Market.jsx`, `index.css`.
**Conflitos:** só uma linha em `Crafting.jsx`/`Refining.jsx` (fim da coluna direita): trivial com 059/065/012. **Ordem: esta primeiro.** Se 059/065 entrarem antes, o Executor da 005 adiciona as linhas delas (ver adendos nos planos 059 e 065).

## Linhas do Craft (inventário §3.1; `kind`/`affects`; `probe` na coluna da direita; base: espada T4, venda Caerleon 4.500, custo 3.524,27)
| Linha (campos) | kind | affects | probe |
|---|---|---|---|
| Receita escolhida (`recipeVariant`) | applied | cost | (testado no `computeCraft` por variante; sem probe de cfg) |
| Nº de crafts (`crafts`) | applied | cost | `crafts: 5` |
| Cidade de craft e especialização (`craftCity`, `specialty`) | applied | cost | `specialty: false` |
| Foco do craft (`focus`) | applied | cost | `focus: true` |
| Bônus diário do craft (`craftDaily`, `craftDailyAt`) | applied | cost | `craftDaily: 20, craftDailyAt: agora` |
| RRR manual (`customRRR`) | applied | cost | `customRRR: '30'` |
| RRR do refino dos materiais (`refineCity`, `refineFocus`, `refineDaily`) | applied | cost | `refineFocus: true` (com material refinável) |
| Ingredientes que não retornam | derived | — | — |
| Taxa de bancada e valor do artefato (`feePer100`, `feeSet`) | applied | cost | `feePer100: 600` |
| Taxa de bancada do refino (`refineFee`, `refineFeeSet`) | applied | cost | `refineFee: 600` (com refino) |
| Rota por material (`refine`) | applied | cost | `refine: { METALBAR: 'all' }` |
| Cidade e ordens de compra (`matCity`, `useOrders`) | applied | cost | `useOrders: true` |
| Preço e idade de cada material | applied (origem api) | cost | — |
| Premium, imposto e taxa de criação (settings `premium`) | applied | profit | `settings.premium: false` |
| Saída (cidade, modo, preço, idade, "ilusória", "velha") | applied | profit | — |
| Venda sem imposto (`noTax`) | applied | profit | `noTax: { 'Caerleon|order': true }` |
| Despesas extras (`extras`) | applied | cost | `extras: [{ value: '230', scope: 'craft' }]` |
| Foco como custo em pontos (`focusEff`, `focusPoints`, `focusBudget`, `focusRef`) | info-only | none | `focusEff: '10000'` |
| Giro e parte do mercado (`share`) | info-only | none | `share: '5'` |
| Custo de esperar (`waitCost`) | info-only | none | `waitCost: '100'` |
| Comparar cidades (`cityScenario`, `feeByCity`) | info-only | none | `cityScenario: 'own'` |
| Servidor (settings `server`) | applied (origem api) | — | — |
| **NÃO consideradas** (sem campo): relistagens da ordem de venda (o Preço-alvo tem estimativa própria), transporte entre cidades (só despesa extra), qualidade do item e do material (`qualities=1`), **diário de ofício (journal)**, custo do foco em prata (a referência é digitada), estoque que você já tem, mudança de preço durante a produção, moeda/ficha de facção (068) | not-considered | none | — |
Seção "Preço-alvo" (`target:cfg`: `goal`, `profit`, `margin`, `mode`, `relists`): `applied` ao próprio cartão; linha "venda sem imposto **não** considerada neste alvo" (not-considered, até a 075); "herda custo, RRR, taxa e despesas do Craft". Seção "Estresse": passos ±5% a ±20% e limiar de margem fina 5% (`app-default`), "não varia RRR, taxa, despesas nem a cidade de saída". Seção "Comparar cidades": `customRRR` da tela principal **ignorado** (not-considered quando preenchido) e taxa geral × por cidade. Nenhum campo fica em `ignoredFields` na v1.

## Mensagens (texto final, em português)
**Título:** "Variáveis deste cálculo". **Cabeçalho (sempre visível):** "{a} aplicadas · {u} não confirmadas · {s} velhas/expiradas · {n} não consideradas". **Origens:** "jogo", "padrão do app", "digitado", "API", "derivado". **Estados:** "aplicada", "padrão não confirmado", "velha/expirada", "NÃO considerada", "informativa (não muda o lucro)". **Abertas por padrão:** só `unconfirmed`, `stale` e `not-considered`; as `applied` ficam num `<details>` "Ver as {a} variáveis aplicadas". **Nota fixa:** "Este quadro só lê o que o cálculo usou; ele não calcula nada. ‘Bônus diário’ aqui é o bônus de produção +10/+20 que você informa; o diário de ofício (journal) não é modelado." **Linhas de exemplo:** "Taxa da bancada: 400 (padrão do app, NÃO confirmado)"; "Bônus diário: usando 0 (informado 20, passou do reset do servidor)"; "Foco +59: fonte média-alta, regra do servidor (não está no dump)". Constantes do jogo mostram a fonte curta (V4).

## Tasks (1 commit cada; teste primeiro e visto falhar; cada passo tem comando e saída esperada)

### Task 1: `core.js`, `registry.js` e contrato (puros, project `logic`)
**Files:** Create `audit/core.js`, `core.test.js`, `audit/registry.js`, `registry.test.js`, `audit/contract.test.js`, `test/setFields.js`; Modify `persistSchemas.test.js` (só o import).
- [ ] **Step 1: testes falhando:**
```js
it('row: sem origem, origem fora da lista, sem estado, estado fora da lista ou sem label LANÇA (V2); com tudo, devolve o objeto', () => {});
it('apiRow(preço 4.500, data now − 2 h, maxAgeH 24): origin "api", status "applied"; 25 h: "stale"; sem data: "stale" com nota "sem data"; preço 0/NaN: status "not-considered" com nota "sem preço"; maxAgeH 0 desliga o limite', () => {});
it('registerScreen duplicada, var sem fields (array), kind inválido ou "applied" sem probe LANÇA', () => {});
it('auditScreen devolve rows na ordem declarada e counts { applied, unconfirmed, stale, notConsidered, infoOnly } exatos; build que lança vira linha "não foi possível ler" sem derrubar o cartão (nunca propaga)', () => {});
it('setFields (movido de persistSchemas.test.js) enxerga craftCity, feeSet, craftDaily, waitCost em Crafting.jsx; persistSchemas.test.js continua verde', () => {});
// contract.test.js: para cada tela registrada e cada cfgKey: todo campo de PERSISTED[cfgKey].schema ∪ Object.keys(CURRENT_DEFAULTS[cfgKey]) ∪ setFields(arquivos da tela) está em algum var.fields ou em ignoredFields (com motivo não vazio); a mensagem de falha NOMEIA o campo e a tela
it('contrato: campo novo sem linha reprova (simular com um esquema falso injetado: falha nomeando o campo)', () => {});
```
- [ ] **Step 2:** `npx vitest run --project logic src/lib/audit` → FAIL (`Failed to resolve import`). **Step 3:** implementar; mover `setFields` para `src/test/setFields.js` (exporta; sem JSX). **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: núcleo e contrato do auditor de variáveis (IDEIA-005)`.
- Mutações: `row` sem validar origem; contagem de `stale` somada a `applied`; `build` que lança propagando; contrato que ignora `target:cfg`.

### Task 2: Craft: `audit/craft.js`, `pbParts` e sensibilidade
**Files:** Create `audit/craft.js`, `craft.test.js`, `sensitivity.test.js`; Modify `rrrCalc.js` (+ `rrrCalc.test.js` ganha o teste de `pbParts`).
- [ ] **Step 1: testes falhando** (números recalculados com `node -e`):
```js
it('pbParts({kind:"craft", specialty:true, focus:true, daily:20}) = { base: 18, specialty: 15, focus: 59, daily: 20 } (soma 112); rrrFor continua devolvendo as mesmas partes (testes existentes intactos)', () => {});
it('RRR (AUDITORIA-001 §1): bônus de cidade, sem foco: 24,8120%; com foco: 47,9167%; com foco e diário 20: 52,8302%; a linha "RRR final" mostra o valor de c.rates.craftRRR e as linhas de componentes somam PB 112', () => {});
it('taxa padrão: feePer100 400 sem feeSet -> origin "app-default", status "unconfirmed"; com feeSet true e 400 -> "user"/"applied"; 500 sem feeSet -> "user"/"applied"; item de valor 384 -> 172,8 (arredonda 173 no lote)', () => {});
it('bônus diário expirado (servidor west, reset 10:00 UTC): craftDaily 20 informado às 09:00 de 19/11 com now 12:00 -> valor usado 0, status "stale", nota "digitado 20"; informado às 10:30 -> 20 "applied"; data > now + 5 min -> usado 0 com nota de data no futuro', () => {});
it('imposto: premium + ordem de venda -> 0,935 (4% + 2,5%); sem premium 0,895; venda instantânea premium 0,96; noTax -> 1,0 e a linha de taxa de criação vira "não cobrada (venda sem imposto)"', () => {});
it('preço do material com data de 30 h (maxAgeH 24): status "stale"; "ilusória" e "velha" vêm de annotateOptions (mesmo objeto da tela)', () => {});
it('"NÃO consideradas" aparecem SEMPRE com a cfg padrão: relistagens, transporte, qualidade, diário de ofício (journal), estoque, mudança de preço, ficha de facção; a nota de "bônus diário" diz que é o bônus +10/+20', () => {});
it('issues da 060: feePer100 "abc" corrigido para 400 -> a linha traz nota "corrigido de abc para 400" sem eco de objeto', () => {});
it('estado antigo (craftCfg() sem campos novos) e corrompido (campos null/{}/texto lixo direto na lib): build não lança; a linha mostra o valor realmente usado', () => {});
// sensitivity.test.js (dossiê §4.2): para cada Var com probe: aplica o probe e compara
it('kind "applied" com affects "cost": totalCost muda; "profit": best.profit muda; kind "info-only"/"not-considered" com probe: totalCost E best.profit IGUAIS (toEqual)', () => {});
it('cada Var "applied" do Craft tem probe; mutação (linha trocada de "info-only" para "applied" sem efeito) reprova', () => {});
```
- [ ] **Step 2:** FAIL. **Step 3:** `rrrCalc.js`: extrair `pbParts({ kind, specialty, focus, daily })` (a decomposição que `rrrFor` já faz) e usá-la em `rrrFor`; `audit/craft.js` declara as linhas da tabela acima registrando `craft` com `cfgKeys ['craft:cfg','target:cfg']`. **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: auditor do Craft e teste de sensibilidade (IDEIA-005)`.
- Mutações: valor exibido recalculado em vez de lido; estado "stale" invertido; linha `noTax` ainda mostrando 2,5%; "NÃO considerada" removida; probe de `focus` sem efeito marcado como applied.

### Task 3: Refino e RRR
**Files:** Create `audit/refine.js`, `refine.test.js`, `audit/rrr.js`, `rrr.test.js`.
- [ ] **Step 1: testes falhando:** Refino (cenário A: tábua T4, custo 61,4734, venda Martlock 135 em ordem): linhas de cidade de refino com a **regra que valeu** ("especialização +40 aplicada: refina na cidade de bônus", ou "sem especialização"), RRR de refino sem especialização 15,2542% (18/118) e com 36,7089% (58/158) e com foco 53,9171% (PB 117), diário, taxa 400 `unconfirmed`, rota, saída e modo, despesas por unidade, `noTax`, quantidade, e as "NÃO consideradas" do Refino (receita com ficha de facção/068, transporte compra→refino, relistagens, qualidade); **sensibilidade** do Refino igual à do Craft sobre `evaluateTier`; RRR (aba): linhas tipo, cidade, categoria (vinda do dump `item.cc`), foco, diário (com `DAILY_NOTE`), nº de crafts; "não considera taxa, preços nem imposto" (info). Estado antigo/corrompido: sem lançar.
- [ ] **Step 2:** FAIL. **Step 3:** implementar `refine` (`cfgKeys ['refine:cfg','target:cfg']`) e `rrr` (`['rrr:cfg']`). **Step 4:** PASS; `npm run check` (o contrato cobre as 3 telas). **Step 5: Commit:** `feat: auditor do Refino e da aba RRR (IDEIA-005)`.
- Mutações: especialização do Refino lida de `cfg.refineCity` bruto em vez de `specialty`; `DAILY_NOTE` ausente; origem da categoria "digitado".

### Task 4: `VarAuditCard` e ligação nas telas
**Files:** Create `VarAuditCard.jsx`, `VarAuditCard.test.jsx`, `Crafting.audit.test.jsx`, `Refining.audit.test.jsx`, `RrrCalculator.audit.test.jsx`; Modify `Crafting.jsx`, `Refining.jsx`, `RrrCalculator.jsx`.
- [ ] **Step 1: testes falhando** (project `ui`; `beforeEach(resetApp)`; mocks de `usePrices`/`useHistory`; `seed(...)`):
```js
it('cartão isolado: cabeçalho com as 4 contagens; unconfirmed/stale/not-considered abertas; applied dentro de <details>; cada linha mostra origem e estado em português', () => {});
it('Craft, cfg padrão (espada T4, venda 4.500): o cabeçalho mostra "não confirmadas" ≥ 1 (taxa 400) e a linha "diário de ofício (journal)" com "NÃO considerada"', () => {});
it('digitar a taxa 500: a linha da taxa muda de "padrão não confirmado" para "digitado"; marcar noTax: a linha da taxa de criação vira "não cobrada"', () => {});
it('estado antigo (craftCfg() de 9e1e4a2, sem campos novos): cartão renderiza, sem lançar; estado corrompido (campos lixo): idem, e o limite de erro NÃO aparece', () => {});
it('Refino e RRR: cartão presente com as linhas do inventário; trocar a cidade de refino muda a linha de especialização', () => {});
it('o cartão não altera nenhum número da tela (texto da tela sem o cartão = com o cartão, fora dele)', () => {});
```
- [ ] **Step 2:** `npx vitest run --project ui src/components/VarAuditCard.test.jsx src/components/Crafting.audit.test.jsx src/components/Refining.audit.test.jsx src/components/RrrCalculator.audit.test.jsx` → FAIL. **Step 3:** `VarAuditCard({ audit })` (`<details>` recolhido por padrão, `data-testid="var-audit"`); cada tela monta `auditScreen('craft'|'refine'|'rrr', ctx)` com os objetos que já tem. **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: cartão "Variáveis deste cálculo" no Craft, Refino e RRR (IDEIA-005)`.
- Mutações: cartão aberto por padrão com 30 linhas; contagens fixas; `applied` fora do `<details>`; origem em inglês.

### Task 5: conferência manual (sem commit)
- [ ] 375 px sem rolagem horizontal; cartão recolhido mostra o cabeçalho; abrir/fechar. Estado antigo e corrompido no navegador. **Conferir `location.port` antes de gravar em `localStorage`.**

## Review Focus
1. Variável nova em tela sem linha no auditor (contrato, Tasks 1-2). 2. Linha "aplicada" que o cálculo ignora (sensibilidade, Task 2). 3. Valor exibido ≠ valor usado quando a 060 corrige entrada (Task 2). 4. Estado salvo antigo/corrompido derrubando o cartão (Tasks 2-4). 5. Ruído: 30 linhas abertas (Task 4).

## Como o Tester valida
1. Casos §5 do dossiê (RRR 24,8120/47,9167/52,8302%; taxa 172,8; diário expirado; k 0,935/0,895/0,96/1,0; Preço-alvo 3.770 e 3.983 com 2 relistagens (herdados, só lidos); RRR manual ignorado na comparação; "NÃO consideradas" sempre presentes) conferidos à mão. 2. Sensibilidade e contrato com mutações em cópia fora do repositório. 3. Diferencial: nenhuma tela muda número com o cartão ligado. 4. O que um usuário estranharia: linha dizendo "aplicada" para algo que não muda o lucro; "journal" tratado como o bônus diário; cartão aberto e barulhento.

## Riscos
1. **Manutenção da lista "não consideradas":** é manual; mitigação: contrato por campo e regra para ideias novas (acima). 2. **Linhas com `build` que lê muito do resultado:** acopla ao formato de `computeCraft`; mitigado por `build` que nunca propaga exceção. 3. **Ruído:** colapsado por padrão.

## Critério de pronto
`npm run check` verde sem alterar teste existente (exceto o import de `persistSchemas.test.js` e o teste novo de `pbParts`); mutações derrubadas; contrato e sensibilidade verdes; só os arquivos listados; conferência registrada.

## PERGUNTAS PARA O GERENTE
1. **Telas da v1:** Craft (com seções Preço-alvo, Estresse e Comparar cidades), Refino e RRR. O Mercado e o Flipper ficam de fora. Confirma?
2. **Linhas das ideias em voo:** se 059/065 entrarem antes, a 005 já nasce com as linhas delas; se depois, o contrato as força. Qual ordem você quer?
3. A "NÃO considerada" do Preço-alvo para `noTax` some quando a 075 entrar: o Executor da 075 atualiza a linha (o contrato não detecta mudança de estado, só campo novo). Aceita?
4. Cartão **recolhido por padrão** com contagens no cabeçalho (mitigação de ruído). Ou prefere aberto só quando houver linha `unconfirmed`/`stale`?
5. A aba Premium (054) e o Giro não registram tela. OK?
