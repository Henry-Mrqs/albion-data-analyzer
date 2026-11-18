# IDEIA-048 — Despesas extras no lucro e "venda sem imposto de mercado": plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-048`. Comandos `npm` em `client/`. **Pré-requisitos (assumidos mesclados):** IDEIA-001, 019, 038, 039, 041, 060, 066, 010 e 049, e, **de preferência**, 069 (testes de componente) e 058. **Regra do briefing:** cada teste é escrito, **executado e visto falhar** antes de implementar. **Nenhum valor padrão é inventado** (dossiê §7): a lista de despesas começa vazia e não há "presets".

**Objetivo:** o lucro do craft ignora custos que o jogador paga fora dos materiais (transporte, comida/poção de buff, re-roll, reparo), e há vendas fora do mercado (guilda, troca direta, encomenda) em que **não há imposto de 4%/8% nem taxa de criação de 2,5%**. O problema central do usuário é esquecer variável: este campo é a rede de segurança. Fonte: `docs/research/IDEIA-048.md` (X1 a X4, regra de produto, §4 com a espada T4). Confiança **MÉDIA** (comportamento visível em duas ferramentas; a regra "sem imposto fora do mercado" vem de trecho da wiki: X3). Sem fórmula de jogo nova: **as despesas não mudam RRR nem foco (X4)**.

**Arquitetura:** (1) `econ.js`: `netSale(price, 'none', premium) = price` (modo novo; os modos `order`/`instant` ficam intactos). (2) Módulo puro `lib/extras.js`: totais e rateios das despesas. (3) `inputRules.js` (060): validação da lista e do mapa de saídas sem imposto, dentro de `cleanCraftCfg`/`cleanRefineCfg`. (4) `computeCraft` soma as despesas ao `totalCost` (logo ao `unitCost`, ao preço-alvo, ao plano e a tudo que hoje deriva do custo) e usa `netSale` com `'none'` nas saídas marcadas. (5) `evaluateTier` (Refino) recebe `extrasPerUnit` e `noTax`. Telas: cartão `ExtrasCard.jsx`, coluna "Sem imposto" na tabela "Onde vender", linhas de despesas nas tabelas de custo.

## Regras (dossiê §2 e regra de produto)

```
custo_total        = custo_materiais + taxa_bancada + Σ extras                       // extras NÃO mudam RRR, foco, taxa de bancada
extra por craft    : valor × nº de crafts            extra por lote : valor (uma vez)
extras_total(n)    = Σ (escopo == 'lote' ? valor : valor × n)
extras_por_unidade = extras_total(crafts) / unidades                                 // unidades = rec.amount × crafts (Craft); qty (Refino)
receita_sem_imposto = preço × unidades                                              // netSale(preço, 'none') = preço (sem imposto, sem taxa de criação: X3)
```
O interruptor "sem imposto" é **por saída** (cada linha da tabela "Onde vender": cidade + modo; um item pode vender parte no mercado e parte por contrato). No Refino é um único interruptor (a tela tem uma saída só). **Sem imposto não significa "tem comprador"**: o preço da linha continua sendo a referência de mercado e a linha mantém os selos de saída ilusória/velha (066).

## Arquivos: exclusivos, compartilhados, ordem

**Criados:** `client/src/lib/extras.js`, `client/src/lib/extras.test.js`, `client/src/components/ExtrasCard.jsx`, e **se a 069 já estiver mesclada** `client/src/components/ExtrasCard.test.jsx`.
**Alterados:** `client/src/lib/econ.js` + `econ.test.js` (modo `'none'`), `client/src/lib/craftPlan.js` + `craftPlan.test.js`, `client/src/lib/refinePlan.js` + `refinePlan.test.js`, `client/src/lib/inputRules.js` + `inputRules.test.js`, `client/src/components/Crafting.jsx`, `client/src/components/Refining.jsx`.
**NÃO toca:** `catalog.js`, `build-catalog.mjs`, `catalog.json`, fixture, `market.js`, `exits.js`, `targetPrice.js`, `TargetPrice.jsx` (recebe o custo já com extras por props), `flip.js`, `Flipper.jsx`, `vercel.json`, `vite.config.js`.
**Compartilhados:** `Crafting.jsx` com a 058 (cartão novo; regiões distintas) e com 010/066 (a coluna nova fica ao lado da coluna "Giro"/"Comprador" da mesma tabela: um `th` e um `td`); `inputRules.js` com a 002 (campos de foco; blocos separados); `craftPlan.js` e `econ.js` só com esta ideia. **Herdam as despesas automaticamente, sem editar:** `waitSavings` (041; a economia é a diferença de dois `totalCost`, a despesa cancela), a comparação de cidades (058; mesma despesa em todas as cidades, o ranking não muda) e o resumo de foco (002; mesma lógica). **Ordem recomendada:** 069 → 058 → **048** (a 048 é a mais invasiva: muda o custo central e duas telas; entra por último e já escreve os testes de componente do editor).

## O que **não** muda (diferencial obrigatório)
Sem despesas e sem saída marcada, **todos** os números do Craft e do Refino são idênticos aos de antes (`totalCost`, `unitCost`, `options[].net/profit`, `best`, `plan`, preço-alvo, `waitSavings`). O Tester roda o diferencial com `master` em dezenas de combinações; qualquer diferença reprova.

## Interfaces

```js
// econ.js
netSale(price, mode, premium)          // mode 'none' => price; 'order' e 'instant' como hoje
// extras.js (puro)
export const MAX_EXTRAS = 20                                   // limite de linhas da lista (decisão de produto, técnica)
extrasTotal(list, crafts): number                              // Σ (scope === 'lote' ? value : value × crafts)
extrasPerUnit(list, units, crafts): number                     // extrasTotal / units; 0 se units <= 0
// inputRules.js
validateExtras(list): { values: Extra[], issues: Issue[] }     // Extra = { name: string, value: number, scope: 'craft'|'lote' }
// cleanCraftCfg / cleanRefineCfg devolvem cfg.extras limpa e cfg.noTax como mapa { 'Cidade|modo': true }
// craftPlan.js: computeCraft devolve também { extras, extrasList }; options[i] ganha { noTax: boolean }
// refinePlan.js: evaluateTier({..., extrasPerUnit = 0, noTax = false }) devolve também { extrasPerUnit }
```
Validação de `validateExtras` (cada regra com teste): lista que não é array → `[]`; mais de `MAX_EXTRAS` → corta com `warn`; `name` não texto → `''`, espaços aparados, máximo 60 caracteres (corta com `warn`); `value` vazio/`null` → 0 **sem aviso** (linha em branco), texto/NaN → 0 (`error`), **negativo → 0 (`error`)**, `> MAX_QTY` (1e9, 060) → `MAX_QTY` (`warn`); `scope` fora de `craft|lote` → `'craft'` (`error`); idempotente. `noTax`: só chaves `Cidade|order` ou `Cidade|instant` com valor `true` sobrevivem (o resto é descartado em silêncio).

## Onde aparece e UI

- **Craft, novo cartão "Despesas extras":** lista editável (nome, valor, **por craft / por lote**, remover) e botão "Adicionar despesa" (sem linhas pré-preenchidas e sem valores sugeridos); resumo "Despesas: 230 por craft (2.300 no lote de 10)"; o texto fixo diz "Não mudam RRR, foco nem taxa de bancada".
- **Tabelas de custo do Craft:** linha **"Despesas extras"** antes de "Custo total" (tabela de materiais) e no total do plano de compra; o cartão **Preço-alvo** passa a considerar o custo com despesas.
- **Craft, "Onde vender":** nova coluna **"Sem imposto"** com uma caixa por linha; marcada, o líquido da linha vira o preço cheio (sem 4%/8% e sem 2,5%) e a linha leva a nota "venda fora do mercado".
- **Refino:** o mesmo cartão (rótulos "por unidade / por lote", lote ÷ quantidade a refinar) e um interruptor **"Venda sem imposto (fora do mercado)"** ao lado de "Venda do refinado"; o lucro por unidade e o total usam os dois.
- Valores fora da faixa mostram o aviso da 060 sob o campo (`InputIssues`) e o selo "N valores corrigidos".

## Tasks (1 commit cada; testes primeiro, vistos falhar)

### Task 1: `netSale` com modo `'none'` (`econ.js`)
**Files:** Modify `econ.test.js`, `econ.js`.
- [ ] **Step 1: testes falhando** (acrescentar): `netSale(4500, 'none', true)` = **4500** e `netSale(4500, 'none', false)` = 4500; `netSale(4500, 'order', true)` = **4207,5** (4.500 × 0,935) e `'instant'` = 4.320 (inalterados); `netSale(4500, 'none', true) > netSale(4500, 'instant', true) > netSale(4500, 'order', true)`; `netSale(0, 'none', true)` = 0; o modo desconhecido continua se comportando como hoje (documentado por um teste de caracterização: `'foo'` = instantâneo; não corrigir aqui).
- [ ] **Step 2:** FAIL (`'none'` hoje cai no ramo instantâneo e dá 4.320). **Step 3:** `mode === 'none' ? price : …`. **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: netSale com modo none (venda sem imposto de mercado)`.

### Task 2: totais das despesas (`extras.js`), números do dossiê §4
**Files:** Create `extras.test.js`, `extras.js`.
- [ ] **Step 1: testes falhando:**

```js
const L = [{ name: 'Transporte', value: 150, scope: 'craft' }, { name: 'Comida de buff', value: 80, scope: 'craft' }];
it('dossiê §4: transporte 150 + comida 80 = 230 por craft', () => expect(extrasTotal(L, 1)).toBe(230));
it('por craft multiplica: 10 crafts = 2.300; por lote não: 230 uma vez', () => { expect(extrasTotal(L, 10)).toBe(2300); expect(extrasTotal([{ value: 230, scope: 'lote' }], 10)).toBe(230); });
it('misto: 150 por craft + 80 por lote com 10 crafts = 1.580', () => expect(extrasTotal([{ value: 150, scope: 'craft' }, { value: 80, scope: 'lote' }], 10)).toBe(1580));
it('por unidade: lote de 230 em 10 crafts de 1 unidade = 23 por craft (dossiê §4)', () => expect(extrasPerUnit([{ value: 230, scope: 'lote' }], 10, 10)).toBe(23));
it('item que rende 5 por craft: 3 crafts (15 unidades) com 150 por craft = 450 / 15 = 30 por unidade', () => expect(extrasPerUnit([{ value: 150, scope: 'craft' }], 15, 3)).toBe(30));
it('lista vazia, indefinida ou unidades 0: 0 e nunca NaN', () => { expect(extrasTotal([], 5)).toBe(0); expect(extrasTotal(undefined, 5)).toBe(0); expect(extrasPerUnit(L, 0, 1)).toBe(0); });
it('escopo desconhecido conta como por craft (a validação já corrige antes)', () => expect(extrasTotal([{ value: 10, scope: 'x' }], 3)).toBe(30));
```
- [ ] **Step 2:** FAIL; **Step 3:** implementar; **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: extras.js, totais e rateio das despesas extras`.

### Task 3: validação (`inputRules.js`)
**Files:** Modify `inputRules.test.js`, `inputRules.js`.
- [ ] **Step 1: testes falhando:** as regras de `validateExtras` listadas acima (cada uma com o caso e a mutação óbvia: `<` por `<=` no negativo, teto `MAX_QTY`, truncar nome em 60, `MAX_EXTRAS` 20 e 21 linhas); idempotência; `cleanCraftCfg` e `cleanRefineCfg` devolvem `extras` limpa e `noTax` filtrado e **não mutam** a configuração original; linha em branco (`value: ''`) não gera aviso e vale 0; campos ausentes (`cfg` sem `extras`/`noTax`) viram `[]` e `{}`; os `issues` têm `field` `extras[0].value` (sob o campo certo) e entram no selo de valores corrigidos (`CorrectedBadge` conta `warn`/`error`).
- [ ] **Step 2:** FAIL. **Step 3:** implementar `validateExtras` e ligá-la às duas funções `clean*Cfg` (mesma estrutura dos campos existentes). **Step 4:** PASS; `npm test` inteiro. **Step 5: Commit:** `feat: validação das despesas extras e das saídas sem imposto (060)`.

### Task 4: `computeCraft` com despesas e saída sem imposto
**Files:** Modify `craftPlan.test.js`, `craftPlan.js`.
- [ ] **Step 1: testes falhando.** Item `T4_MAIN_SWORD` da fixture, `specialty: true` (RRR 33/133), `feePer100: 500` (valor 384 → taxa **216**), refino dos materiais `buy`, preços `T4_METALBAR` 200, `T4_LEATHER` 150 e venda `T4_MAIN_SWORD: { Caerleon: { s: 4500 } }` (ordem de venda a 4.500), `premium: true`, `bonusCity: null`; helpers da 001. Material líquido 4.400 × 0,751880 = **3.308,27**; **custo C = 3.524,27** (dossiê §4):

```js
const run = (o) => computeCraft({ ...base, cfg: craftCfg({ specialty: true, feePer100: 500, refine: BUY, ...o }) });
it('sem despesas e sem marca: números de antes (custo 3.524,27; lucro 683,23)', () => { const c = run({}); expect(c.totalCost).toBeCloseTo(3524.27, 2); expect(c.best.profit).toBeCloseTo(683.23, 2); expect(c.extras).toBe(0); });
it('dossiê §4: despesas 150 + 80 = 230 por craft → custo 3.754,27 e lucro no mercado 453,23 (antes 683,23)', () => { const c = run({ extras: L }); expect(c.extras).toBe(230); expect(c.totalCost).toBeCloseTo(3754.27, 2); expect(c.best.profit).toBeCloseTo(453.23, 2); });
it('dossiê §4: venda sem imposto por contrato → lucro 745,73', () => { const c = run({ extras: L, noTax: { 'Caerleon|order': true } }); expect(c.options[0].net).toBeCloseTo(4500, 2); expect(c.best.profit).toBeCloseTo(745.73, 2); expect(c.options[0].noTax).toBe(true); });
it('dossiê §4: lote de 10 crafts com 230 por lote → 23 por craft, custo 3.547,27 por unidade e lucro 660,23 por unidade', () => {
  const c = run({ crafts: 10, extras: [{ name: 'Lote', value: 230, scope: 'lote' }] });
  expect(c.units).toBe(10); expect(c.unitCost).toBeCloseTo(3547.27, 2); expect(c.best.profit / c.units).toBeCloseTo(660.23, 2); });   // net 42.075 − 35.472,71 = 6.602,29
it('mesmas despesas por craft em 10 crafts = 2.300', () => expect(run({ crafts: 10, extras: L }).extras).toBe(2300));
it('despesas não mudam RRR, foco, taxa nem material', () => { const a = run({}), b = run({ extras: L }); expect(b.rates.craftRRR).toBe(a.rates.craftRRR); expect(b.fee).toBe(a.fee); expect(b.matCost).toBe(a.matCost); });
it('sem imposto também remove a taxa de criação de 2,5% da ordem de venda', () => expect(run({ noTax: { 'Caerleon|order': true } }).best.net).toBeCloseTo(4500, 2));   // com imposto 4.207,50
it('marcar uma linha não muda as outras (BM instantânea e outra cidade)', () => { /* com 2 saídas: a não marcada mantém netSale(…, mode, premium) */ });
it('a saída sem imposto pode virar a melhor (ordenação por lucro)', () => {});
it('entrada inválida: despesa negativa vira 0 com aviso; noTax com chave desconhecida é ignorado', () => { const c = run({ extras: [{ value: -50, scope: 'craft' }], noTax: { 'Lugar|order': true } }); expect(c.extras).toBe(0); expect(c.issues.some((i) => i.field.startsWith('extras'))).toBe(true); });
it('waitSavings e preço-alvo herdam: a economia de esperar o bônus não muda com despesas; unitCost inclui as despesas', () => { /* waitSavings igual com e sem extras; unitCost com extras = totalCost / units */ });
it('GAIN_THRESHOLD continua nomeado (0,5 prata) e inalterado', () => expect(GAIN_THRESHOLD).toBe(0.5));
```
  Contas do dossiê §4: 3.524,27 + 230 = **3.754,27**; 4.500 × 0,935 = 4.207,50 → **453,23**; sem imposto 4.500 − 3.754,27 = **745,73**; lote: 3.524,27 + 23 = **3.547,27**, lucro **4.207,50 − 3.547,27 = 660,23** por craft. (Exato: 33.082,71 + 2.160 + 230 = 35.472,71; 42.075 − 35.472,71 = 6.602,29.)
- [ ] **Step 2:** FAIL. **Step 3:** em `computeCraft`: `extras = extrasTotal(cfg.extras, crafts)` (com a configuração já limpa pela 060), `totalCost = matCost + fee + extras`, `netSale(o.price, cfg.noTax?.[`${o.city}|${o.mode}`] ? 'none' : o.mode, premium)`, `o.noTax`, e `extras`/`extrasList` no retorno. **Step 4:** PASS; `npm test` inteiro (nenhum teste anterior muda). **Step 5: Commit:** `feat: despesas extras e saída sem imposto no cálculo do Craft`.

### Task 5: Refino (`evaluateTier`)
**Files:** Modify `refinePlan.test.js`, `refinePlan.js`.
- [ ] **Step 1: testes falhando** (Cenário A da 001 com as taxas exatas da 019: rota `best`, custo **61,4734**; venda no Mercado Negro a 140, instantânea, premium → líquido 134,4; lucro de antes **72,9266**):

```js
it('sem despesas: igual a antes (lucro 72,9266)', () => expect(ev({}).profit).toBeCloseTo(72.9266, 4));
it('despesas de 10 por unidade: lucro 62,9266 e margem 88,04% (sobre o custo com despesas 71,4734)', () => { const r = ev({ extrasPerUnit: 10 }); expect(r.profit).toBeCloseTo(62.9266, 4); expect(r.margin).toBeCloseTo(88.04, 2); expect(r.extrasPerUnit).toBe(10); });
it('venda sem imposto: líquido 140 (sem os 4%) e lucro 78,5266', () => { const r = ev({ noTax: true }); expect(r.net).toBe(140); expect(r.profit).toBeCloseTo(78.5266, 4); });
it('os dois: 140 − 71,4734 = 68,5266', () => expect(ev({ extrasPerUnit: 10, noTax: true }).profit).toBeCloseTo(68.5266, 4));
it('o custo de produção (unit.cost) e a rota não mudam com despesas', () => expect(ev({ extrasPerUnit: 10 }).unit.cost).toBeCloseTo(61.4734, 4));
it('lote ÷ quantidade: 100 por lote em 50 unidades = 2 por unidade (extrasPerUnit com units = crafts = 50)', () => expect(extrasPerUnit([{ value: 100, scope: 'lote' }], 50, 50)).toBe(2));
```
- [ ] **Step 2:** FAIL. **Step 3:** `evaluateTier` ganha `extrasPerUnit = 0` e `noTax = false`: `net = netSale(price, noTax ? 'none' : mode, premium)`, `profit = net − (unit.cost + extrasPerUnit)`, `margin = profit / (unit.cost + extrasPerUnit)`. **Step 4:** PASS; `npm test`. **Step 5: Commit:** `feat: despesas extras e venda sem imposto no Refino (evaluateTier)`.

### Task 6: telas
**Files:** Create `components/ExtrasCard.jsx` (+ `ExtrasCard.test.jsx` se a 069 existir); Modify `Crafting.jsx`, `Refining.jsx`.
- [ ] **Step 1:** `ExtrasCard({ list, onChange, unitLabels, issues, summary })` só apresenta (linhas editáveis, "Adicionar despesa" desligado em `MAX_EXTRAS`, resumo). Em `Crafting.jsx`: `cfg.extras` e `cfg.noTax` em `craft:cfg` (padrão `[]` e `{}`), cartão abaixo do bloco de produção ou dos resultados, linha "Despesas extras" nas tabelas de custo e do plano (total do plano soma `extras`), coluna "Sem imposto" em "Onde vender" (`set({ noTax: { ...cfg.noTax, [key]: checked } })`), e `InputIssues` sob cada linha. Em `Refining.jsx`: `refine:cfg.extras`/`noTax` (interruptor único), `extrasPerUnit(vcfg.extras, qty, qty)` passado a `evaluateTier` e somado ao custo entregue ao `TargetPrice`.
- [ ] **Step 2:** `npm run check`; smoke (`npm run dev`): Craft de `T4_MAIN_SWORD`: adicionar 150 e 80 por craft muda "Custo total" e o lucro em 230 por craft; marcar "Sem imposto" na linha melhora o lucro em 4%+2,5% do preço; recarregar mantém a lista; nada de default. **Step 3 (se 069 mesclada):** testes de componente: adicionar/remover linha, valor negativo mostra aviso e conta 0, 21ª linha bloqueada, caixa "Sem imposto" grava a chave `Cidade|modo`. Mutações a derrubar: botão sem limite, remover a linha errada, chave sem o modo. **Step 4: Commit:** `feat: despesas extras e venda sem imposto nas telas de Craft e Refino`.

## Como o Tester valida (recalcular sem importar `econ.js`)

1. **Dossiê §4 (espada T4 em Lymhurst):** C = 3.308,27 + 216 = **3.524,27**; despesas 150 + 80 = **230**; custo **3.754,27**; venda por ordem a 4.500 × 0,935 = 4.207,50 → lucro **453,23** (antes **683,23**: o app superestimaria em 230); venda por contrato sem imposto → **745,73**; lote de 10 crafts com 230 **por lote** → **23** por craft, custo **3.547,27**, lucro **660,23** por craft.
2. **Regras X3 e X4:** sem imposto remove o imposto **e** a taxa de criação; despesas não alteram RRR, foco, material nem taxa de bancada (compare as linhas de material e o RRR com e sem despesas).
3. **Diferencial:** sem despesas e sem saída marcada, **zero diferenças** contra a `master` (Craft: `totalCost`, `options`, `best`, `plan`; Refino: custo e lucro) em dezenas de combinações; cartão Preço-alvo, "vale esperar" (041), comparação de cidades (058) e foco (002), se mescladas, só mudam pelo custo adicional esperado.
4. **Validação (060):** despesa negativa, texto, `1e308`, 21 linhas, nome de 200 caracteres, escopo inválido: sempre aviso visível, valor corrigido, nada de `NaN`/`∞`; linha em branco vale 0 sem aviso.
5. **Refino:** lucro por unidade e total com extras por unidade/por lote ÷ quantidade; interruptor sem imposto muda só o líquido.
6. **Mutações a rodar:** `value × crafts` aplicado também ao "por lote"; despesas somadas só ao `unitCost` e não ao `totalCost`; `'none'` descontando o imposto; chave `noTax` sem o modo (marcar `order` marca `instant`); despesas na taxa de bancada ou no RRR; remover a validação do negativo; `MAX_EXTRAS` 21; o selo "valores corrigidos" não contar as despesas. Todas devem derrubar teste.
7. **O que um jogador experiente estranharia:** lucro que **sobe** ao adicionar despesa; despesa contada duas vezes (tabela e plano); uma linha sem imposto alterando outras linhas; valores sugeridos ou preenchidos sozinhos; preço-alvo que ignora as despesas; despesa "por lote" multiplicada pelos crafts; diferença entre o lucro do cartão e o da tabela.

## Riscos

1. **Regra X3 de confiança MÉDIA-ALTA** (trecho da wiki): "sem imposto" vale para venda fora do Marketplace; o app não sabe se existe comprador e diz isso na linha.
2. **`computeCraft` é o núcleo do Craft:** o diferencial sem despesas é o critério principal; a mudança no cálculo é de uma soma e de um argumento de `netSale`.
3. **Persistência:** `craft:cfg` antigo sem `extras`/`noTax` deve renderizar normalmente (testado); um `extras` salvo corrompido (string, números) é limpo pela validação.
4. **`Crafting.jsx` e `Refining.jsx` são pontos quentes** (058, 010, 066, 002): rebase por região.
5. **Escopo "por craft" no Refino** significa "por unidade refinada" (a tela rotula assim).

## Critério de pronto

`npm run check` verde; todos os casos do dossiê §4 em teste; diferencial com `master` sem diferenças quando não há despesas nem marcas; validação da 060 cobrindo a lista; nenhum valor padrão de despesa em código (`grep` limpo); só os arquivos listados alterados.

## PERGUNTAS PARA O GERENTE

1. **Refino na mesma ideia?** O dossiê §5 inclui o Refino; o plano o cobre (Tasks 5 e 6) e é a parte mais separável. Mantém, ou a 048 entrega só o Craft e o Refino vira uma ideia à parte?
2. **Interruptor por linha:** no Craft ele é por saída (cidade + modo), como no dossiê §1; no Refino é um só. Aceita essa assimetria?
3. **Extras "por craft" no Refino** viram "por unidade refinada". Aceita o rótulo?
4. **Despesa negativa** (um desconto) é tratada como inválida (0, com aviso). Quer permitir negativa (ex.: reembolso de guilda) com um aviso, ou manter o bloqueio?
5. **Dívidas:** esta ideia **não** fecha nenhuma DT (a DT-010 já tem `GAIN_THRESHOLD` nomeado; "now capturado uma vez" fica aberta). Confirma?
