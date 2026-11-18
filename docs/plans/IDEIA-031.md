# IDEIA-031 — Teste de estresse: plano de implementação

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-031`. Comandos `npm` em `client/`. **Pré-requisito:** IDEIA-001 mesclada.

**Objetivo:** mostrar quanto o lucro aguenta se o preço de venda variar (dp) e/ou os materiais variarem (dm): grade 9×9 de −20% a +20% em passos de 5%, pontos de ruptura (queda máxima de preço, alta máxima de material, em % e em prata) e semáforo.

**Arquitetura:** módulo puro `lib/stress.js`. O modelo é **por unidade** e separa o custo em `variable` (compras a preço de mercado, já líquidas de RRR) e `fixed` (taxas de bancada de craft e de refino). Dois adaptadores extraem `variable`/`fixed` dos resultados já calculados: `craftStressInput(c, premium)` a partir de `computeCraft` e `refineStressInput(...)` a partir de `refineUnit`/`materialPlan`. A rota (comprar x produzir) é **mantida** durante o estresse (simplificação declarada na UI). Componente de apresentação `StressTest.jsx` encaixado com uma linha em Craft e Refino.

**Spec:** `docs/research/IDEIA-031.md` (§2 fórmulas, §4 caso de teste) e `docs/research/AUDITORIA-001.md` §1 (RRR), §2 (bancada não varia com preço), §3 (imposto).

## Fidelidade: funções consumidas

- `netSale(1, mode, premium)` para `k` (nunca `0.04/0.08/0.025`); `fmt`, `pct` de `econ.js`.
- `computeCraft(...)` (campos `matCost`, `fee`, `units`, `plan` com `kind: 'make'`/`total`, `best.price`/`best.mode`) e `refineUnit`/`materialPlan(unit, 1, rrr)` para separar taxa e material. A **taxa de bancada nunca é recalculada aqui**: o plano usa o que o app já calculou, então 019 (arredondamento) e 041 (diário no craft) se propagam sozinhos. `rrr()` também só é consumido indiretamente (o RRR já está dentro do custo).
- **Não corrige** 038/019/041 e não hardcoda cidades.

## Onde aparece e UI (sem código)

Cartão **"Teste de estresse"** nas abas **Craft** (abaixo de "Onde vender") e **Refino** (abaixo do resultado do tier).
- Linha de resumo com semáforo: "Lucro hoje 683 por unidade. Aguenta queda de 16,2% no preço (preço mínimo 3.769) e alta de 20,7% nos materiais."
- Grade 9×9: linhas = variação dos materiais (+20% a −20%), colunas = variação do preço de venda (−20% a +20%), célula = lucro por unidade colorida (vermelho prejuízo, amarelo apertado, verde folgado); a célula (0, 0) destacada.
- Duas fichas de ruptura: "Preço pode cair até X% (Y prata)" e "Materiais podem subir até X%"; se já há prejuízo o texto vira "Preço precisa subir X%" / "Materiais precisam cair X%".
- Nota fixa: "Taxa de bancada e RRR não mudam; a rota (comprar/produzir) é mantida."

## Arquivos afetados (exatos)

**Criados:** `client/src/lib/stress.js`, `client/src/lib/stress.test.js`, `client/src/components/StressTest.jsx`.
**Alterados:** `client/src/components/Crafting.jsx` (1 import + 1 elemento), `client/src/components/Refining.jsx` (1 import + 1 elemento), `scripts/build-test-fixture.mjs` (acrescentar `T4_MAIN_SWORD`, `T4_METALBAR`, `T4_LEATHER` a `IDS`), `client/src/test/catalog.fixture.json` (regenerado; só acrescenta itens), `client/src/index.css` (classes de cor do semáforo da grade; se preferir evitar CSS, usar apenas `.good`/`.bad` e remover este arquivo da lista).
**NÃO toca:** `econ.js`, `catalog.js`, `craftPlan.js`, `refinePlan.js`, `market.js`, `build-catalog.mjs`, `App.jsx`, `Flipper.jsx`.
**Paralelismo:** livre com 038/039 e com 019/041 em lógica (só **lê** campos de `computeCraft`/`refineUnit`). **Acoplamento:** `craftStressInput` depende do formato de retorno de `computeCraft` (`matCost`, `fee`, `units`, `plan`, `best`); se 041 renomear algum, ajustar só o adaptador (o teste de adaptador pega). Conflito textual de uma linha em `Crafting.jsx`/`Refining.jsx` com 030 e 041. A fixture é compartilhada: qualquer ideia que mexa em `IDS` do gerador deve rebasear (a regeneração só acrescenta).

**Modelo de dados:** nenhum catálogo. `usePersisted('stress:cfg', { step: 0.05 })` opcional (passo fixo em 5%; pode ser removido se não houver seletor).

## Fórmulas (dossiê §2; por unidade)

```
k          = netSale(1, mode, premium)
custo(dm)  = variable * (1 + dm) + fixed          // dossiê: G*(1+dm)*(1-R) + F, com variable = G*(1-R)
receita(dp)= price * (1 + dp) * k
lucro(dp,dm) = receita(dp) - custo(dm)
dp* = (variable + fixed) / (price * k) - 1        // ruptura de preço (negativa se há lucro); mínimo = (variable+fixed)/k
dm* = ((price * k - fixed) / variable) - 1        // ruptura de material; null se variable <= 0 ou price*k <= fixed
veredito(lucro, custo): 'loss' se lucro < 0; 'thin' se lucro < 5% do custo; 'ok' nos demais   // limiar: ver pergunta 2
adaptador craft:  makeFees = soma(plan[kind=='make'].total);  fixed = (fee + makeFees)/units;  variable = (matCost - makeFees)/units
adaptador refino: makeFees = soma(materialPlan(unit,1,rrr).makes.fee);  fixed = makeFees;  variable = unit.cost - makeFees
```
A taxa de bancada é fixa porque depende do valor do item, não do preço de mercado (AUDITORIA §2). O adaptador separa a taxa do material usando os próprios números do app; invariante testada: `variable + fixed === custo total por unidade`.

## Interfaces (`stress.js`)

```js
stressProfit(input: { variable, fixed, price, k }, { dp = 0, dm = 0 }): number
breakEven(input): { dp: number|null, dm: number|null, minPrice: number, priceDrop: number }   // priceDrop em prata = price - minPrice
stressGrid(input, steps = [-0.2,-0.15,-0.1,-0.05,0,0.05,0.1,0.15,0.2]): { steps, cells: number[][] }  // cells[iDm][iDp]
verdict(profit: number, cost: number): 'loss' | 'thin' | 'ok'
craftStressInput(c /* retorno de computeCraft */, premium: boolean): { variable, fixed, price, k, mode, units } | null   // null se !c.ready
refineStressInput(unit, rrr: number, sell: { price: number, mode: 'order'|'instant' }, premium): { variable, fixed, price, k, mode } | null   // null se unit.missing.length ou sell.price <= 0
```

## Tasks (1 commit cada; testes primeiro)

### Task 1: núcleo puro (`stressProfit`, `breakEven`, `stressGrid`, `verdict`)
**Files:** Create `stress.test.js`, `stress.js`.
- [ ] **Step 1: teste falhando** (módulo inexistente). Entrada do dossiê §4: Broadsword T4 em Lymhurst, `variable = 4400 × 100/133 = 3308,2707` (G × (1 − R), R = 33/133), `fixed = 216` (384 × 0,1125 × 5), `price = 4500`, `k = 0,935` (premium, ordem). Custo base **3.524,2707**.

```js
const IN = { variable: 4400 * (100 / 133), fixed: 216, price: 4500, k: 0.935 };
it.each([[0.05, 893.60], [0, 683.23], [-0.05, 472.85], [-0.10, 262.48], [-0.15, 52.10]])(
  'só preço dp=%s -> lucro %s', (dp, lucro) => expect(stressProfit(IN, { dp })).toBeCloseTo(lucro, 2));
it('só materiais +10% -> 352,40', () => expect(stressProfit(IN, { dm: 0.1 })).toBeCloseTo(352.40, 2));
it('combinado preço -10% e material +10% -> -68,35', () => expect(stressProfit(IN, { dp: -0.1, dm: 0.1 })).toBeCloseTo(-68.35, 2));
it('ruptura', () => {
  const b = breakEven(IN);
  expect(b.dp).toBeCloseTo(-0.1624, 4);        // -16,24%
  expect(b.minPrice).toBeCloseTo(3769.27, 2);
  expect(b.priceDrop).toBeCloseTo(730.73, 2);  // 4500 - 3769,27
  expect(b.dm).toBeCloseTo(0.2065, 4);         // +20,65%
});
it('sem especialização (RRR 18/118): lucro 262,69', () =>
  expect(stressProfit({ ...IN, variable: 4400 * (100 / 118) }, {})).toBeCloseTo(262.69, 2));
it('grade: [dm=0][dp=0] = lucro base; cantos', () => {
  const g = stressGrid(IN);
  expect(g.cells[4][4]).toBeCloseTo(683.23, 2);
  expect(g.cells[4][0]).toBeCloseTo(-158.27, 2);   // dp -20% (recalculado do dossiê, não listado nele)
  expect(g.cells[8][0]).toBeCloseTo(-819.92, 2);   // dp -20%, dm +20%: 3366 - (3308,2707*1,2 + 216)
  expect(g.cells.length).toBe(9); expect(g.cells[0].length).toBe(9);
});
it('já em prejuízo: dp* positivo e dm* negativo', () => { /* price 3000: breakEven.dp ≈ +0.1748 (3524,2707/(3000*0,935)-1); dm ≈ ((2805-216)/3308,2707)-1 = -0,2174 */ });
it('dm null quando taxa >= receita ou sem material', () => { /* fixed 5000 -> dm null; variable 0 -> dm null */ });
it('verdict', () => { /* verdict(-1,100)='loss'; verdict(0,100)='thin'; verdict(4.99,100)='thin'; verdict(5,100)='ok' */ });
```
  Conta do canto (derivada do dossiê, não listada nele): `lucro(dp=−20%, dm=+20%) = 4500 × 0,8 × 0,935 − (3308,2707 × 1,2 + 216) = 3366 − 4185,92 = −819,92`; `lucro(dp=−20%, dm=0) = 3366 − 3524,27 = −158,27`. Todos os demais valores vêm do dossiê §4: +5%: 893,60; 0: 683,23; −5%: 472,85; −10%: 262,48; −15%: 52,10; materiais +10%: 352,40; combinado: −68,35; ruptura −16,24% e +20,65%; sem especialização 262,69.
- [ ] **Step 2:** `npx vitest run src/lib/stress.test.js` → FAIL (`Failed to resolve import "./stress"`).
- [ ] **Step 3: implementar** as quatro funções conforme as fórmulas. **Step 4:** PASS. **Step 5:** `npm run check`. **Step 6: Commit:** `feat: núcleo do teste de estresse (lucro, ruptura, grade, semáforo)`.

### Task 2: fixture e adaptador do Craft
**Files:** Modify `scripts/build-test-fixture.mjs`, `catalog.fixture.json` (regenerar), `stress.test.js`, `stress.js`.
- [ ] **Step 1:** acrescentar `T4_MAIN_SWORD T4_METALBAR T4_LEATHER` a `IDS` e rodar `node scripts/build-test-fixture.mjs`; `npm test` continua verde (a regeneração só acrescenta). Conferir `ingredientValue('T4_METALBAR') === 16` e `T4_LEATHER === 16` (valor da receita da espada = 16×16 + 8×16 = **384**).
- [ ] **Step 2: testes falhando do adaptador.** Caso do dossiê via `computeCraft` (padrão do teste da IDEIA-001): `rec = recipeOf('T4_MAIN_SWORD')`, `cfg` = `craftCfg({ specialty: true, feePer100: 500, refine: { METALBAR: 'buy', LEATHER: 'buy' } })` (`specialty: true` explícito para não depender da tabela de cidades), `prices = mkPrices({ T4_METALBAR: 200, T4_LEATHER: 150, T4_MAIN_SWORD: { Caerleon: { s: 4500 } } })`, `premium: true`:

```js
it('craftStressInput reproduz a base do dossiê', () => {
  const c = computeCraft({ rec, targetMid: 'T4_MAIN_SWORD', prices, cfg, premium: true, bonusCity: null });
  const inp = craftStressInput(c, true);
  expect(inp.variable).toBeCloseTo(3308.2707, 3); expect(inp.fixed).toBe(216);
  expect(inp).toMatchObject({ price: 4500, mode: 'order', units: 1 }); expect(inp.k).toBeCloseTo(0.935, 6);
  expect(stressProfit(inp, {})).toBeCloseTo(683.23, 2);
  expect(inp.variable + inp.fixed).toBeCloseTo(c.totalCost / c.units, 6);
});
it('com refino produzido (rota best) separa a taxa das etapas', () => {
  // arco T4, 1000 crafts, preços do Cenário A + arco (IDEIA-001, C2): variable ≈ 1251,0045; fixed ≈ 459,3328 (por unidade)
  //   fixed = (230000 + 168421,0526 + 60911,7731) / 1000 ; variable = (1480337,2797 - 229332,8257) / 1000
  //   invariante: variable + fixed ≈ 1710,3373 ; stressProfit(inp,{}) ≈ c.best.profit / 1000 ≈ 7172,1627
});
it('retorna null se o craft não está pronto', () => { /* prices null, ou item sem preço (missing) -> null */ });
it('unidades > 1: valores por unidade (poção, amount 5)', () => { /* variable+fixed === totalCost/units e price é o preço unitário */ });
```
  (O caso de poção usa o item de poção que a IDEIA-001 acrescentou à fixture (D-009); a asserção é a invariante `variable + fixed = totalCost/units`, sem número novo à mão.)
- [ ] **Step 3:** rodar → FAIL (`craftStressInput is not a function`). **Step 4:** implementar. **Step 5:** PASS; `npm run check`. **Step 6: Commit:** `feat: adaptador do estresse para o Craft (separa taxa e material) e fixture da espada T4`.

### Task 3: adaptador do Refino
**Files:** Modify `stress.test.js`, `stress.js`.
- [ ] **Step 1: teste falhando.** Cenário A da IDEIA-001 (`planksSpec()` + `T4_PLANKS: { 'Fort Sterling': { s: 120 }, Martlock: { s: 135 }, 'Black Market': { b: 140 } }`), `unit = refineUnit('T4_PLANKS', { prices, city: 'best', useOrders: false, rrr: 58/158, feePer100: 400, route: 'best' })` (custo **61,5265**); `sell = { price: 140, mode: 'instant' }`, premium:

```js
it('refineStressInput separa taxas das etapas de refino', () => {
  const inp = refineStressInput(unit, 58 / 158, { price: 140, mode: 'instant' }, true);
  expect(inp.fixed).toBeCloseTo(9.5316, 4);       // 7 + 4 * 0,632911
  expect(inp.variable).toBeCloseTo(51.9949, 4);   // 61,5265 - 9,5316
  expect(inp.k).toBeCloseTo(0.96, 6);
  expect(stressProfit(inp, {})).toBeCloseTo(72.8735, 4);   // igual ao lucro por unidade de evaluateTier (IDEIA-001)
});
it('null com preço faltando ou sem preço de venda', () => { /* planksSpec({T3_WOOD:null}) rota all -> null; sell.price 0 -> null */ });
```
- [ ] **Step 2:** FAIL; **Step 3:** implementar (usa `materialPlan`); **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: adaptador do estresse para o Refino`.

### Task 4: Componente e CSS
**Files:** Create `components/StressTest.jsx`; Modify `index.css` (se usado).
- [ ] Props `{ input }` (saída de um adaptador, ou `null` → mostra "Preencha os preços ausentes"). Usa `stressGrid`, `breakEven`, `stressProfit`, `verdict`, `fmt`, `pct`. UI conforme a descrição acima; passo fixo 5%.
- [ ] `npm run check` → 0. **Commit:** `feat: cartão Teste de estresse`.

### Task 5: Encaixe no Craft e no Refino
**Files:** Modify `Crafting.jsx`, `Refining.jsx`.
- [ ] Craft: `<StressTest input={craftStressInput(c, premium)} />` abaixo de "Onde vender". Refino: `<StressTest input={cur && refineStressInput(cur.unit, rrrValue, { price: cur.sell.price, mode: cur.mode }, premium)} />` abaixo do resultado.
- [ ] `npm run check`; smoke no navegador (`T6_MAIN_SWORD` em Craft; Tábua T4 em Refino): célula central da grade = lucro por unidade do cartão de resultado; trocar premium muda a grade; sem preços mostra o aviso. **Commit:** `feat: teste de estresse nas abas Craft e Refino`.

## Como o Tester valida (conta própria, sem importar `econ.js`)

Base (dossiê §4): G = 16×200 + 8×150 = 4.400; R = 33/133 = 0,248120; custo = 4.400 × 0,751880 + 216 = **3.524,27**; receita = 4.500 × 0,935 = **4.207,50**; lucro **683,23**.
Preço: +5% 893,60; −5% 472,85; −10% 262,48; −15% 52,10. Materiais +10%: G = 4.840 → líquido 3.639,10; custo 3.855,10; lucro **352,40**. Combinado (−10% preço, +10% material): 3.786,75 − 3.855,10 = **−68,35**. Ruptura de preço: 3.524,27 / 4.207,50 − 1 = **−16,24%** (preço mínimo 3.769,27). Ruptura de material: ((4.207,50 − 216) / 0,751880) / 4.400 − 1 = **+20,65%**. Sem especialização (RRR 15,2542%): lucro **262,69**. Para o refino: a célula (0, 0) tem de igualar o "Lucro por unidade" do cartão de resultado do tier.
**O que um jogador experiente estranharia:** a taxa de bancada mudando quando o preço muda (não deve); a grade não ter a célula (0,0) igual ao lucro mostrado no resultado; lucro subindo quando os materiais sobem; ruptura de preço positiva num item lucrativo (só pode ser positiva se já há prejuízo, e o texto deve avisar); margens absurdas (> 300% em item comum) vindas de preço de material faltando; ruptura de material "infinita" ou `NaN` quando o material é zero; item de artefato (não retorna) tratado como se o RRR reduzisse seu custo; estresse que "esconde" prejuízo por trocar de rota por baixo dos panos (a rota é mantida, e a nota diz isso).

## Riscos

1. **Material fixo (regra (c) do dossiê):** o app não tem entrada de "preço fixo informado pelo usuário"; este plano perturba **todos** os materiais comprados a mercado, incluindo artefatos. Ver pergunta 1.
2. A rota é mantida sob estresse; numa rota "melhor" em ponto de virada, a rota real poderia mudar e o lucro real ser maior. Documentado na UI.
3. Dependência do formato de `computeCraft` (ver Acoplamento); coberta pelo teste do adaptador.
4. Fixture compartilhada: rebase se outra ideia também acrescentar ids.
5. 019 pode mudar o arredondamento (taxa passa a ser calculada no total): a base `fixed` acompanha, mas o caso do dossiê (taxa 216, 1 craft) não depende de arredondamento.

## Critério de pronto

`npm run check` verde; todos os números do dossiê §4 em teste; invariante `variable + fixed = custo total por unidade` testada nos dois adaptadores; nenhum literal `0.04/0.08/0.025/0.1125` em `stress.js`/`StressTest.jsx`; célula central igual ao lucro da tela em Craft e Refino; só os arquivos listados alterados.

## PERGUNTAS PARA O GERENTE

1. **Preço fixo de material (regra (c)):** o plano perturba todos os materiais comprados (inclusive artefato). Quer um campo "este material tem preço fixo" ou basta o ±N% global? (Dossiê só diz "se o usuário informou como preço fixo".)
2. **Limiares do semáforo:** o dossiê cita "semáforo" sem regra. Usei: vermelho lucro < 0; amarelo lucro < 5% do custo; verde nos demais. Confirma ou define outro limiar?
3. **Flipper (coluna "ruptura %", dossiê §5)** e **sugestão de ±N% pelo histórico (IDEIA-010/011)**: fora deste plano. Confirma?
4. **Escopo de preço de venda:** o estresse usa o melhor destino do Craft (`best`) e a melhor cidade do Refino. Quer escolher o destino na grade?
