# IDEIA-019 — Taxa de bancada arredondada só no total + taxa informada pelo usuário: plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-019`. Comandos `npm` em `client/`. **Pré-requisito:** IDEIA-001 mesclada. **GRUPO ECON (1º de 2): 019 → 041.** Este plano é o primeiro do grupo; a 041 assume este mesclado.

**Objetivo:** (1) a taxa de bancada deixa de ser arredondada por unidade antes de multiplicar pelo nº de crafts/unidades; é calculada exata e **arredondada uma só vez, no total do lote**; (2) o campo "taxa por 100 de nutrição" fica explícito como valor informado pelo usuário (sem presets por cidade, sem tabela) e a tela avisa quando ainda é o padrão do app.

**Arquitetura:** `econ.js`: `stationFee(itemValue, feePer100, n = 1)` passa a devolver o valor **exato** (sem `Math.round`), com `n` opcional; nova `roundFee(x)` é o **único** ponto de arredondamento. `refineUnit` passa a carregar `fee` exata por unidade (já multiplica por quantidades em `materialPlan`). `craftPlan.js` usa `roundFee(stationFee(valor, taxa, crafts))` para a taxa do craft. Um componente pequeno `FeeField.jsx` unifica os três campos de taxa e o aviso.

**Spec:** `docs/research/IDEIA-019.md` (versão revista: T1 a T6, fórmula de produto, casos 1 a 5) e `docs/research/AUDITORIA-001.md` §2. **Fora de escopo (dossiê T6, D-012):** valor do artefato na soma, itens com `amountcrafted` > 1, comida/poção por nutrição; **presets por cidade rejeitados (D-010)**. O cálculo desses itens **não muda**; a tela continua mostrando o aviso de que não foram verificados (Banner já previsto na IDEIA-005).

## Grupos, arquivos exclusivos e compartilhados

**Exclusivos do grupo ECON (019/041):** `client/src/lib/econ.js`, `client/src/lib/econ.test.js`, `client/src/lib/craftPlan.js`, `client/src/lib/craftPlan.test.js`, `client/src/lib/refinePlan.js`, `client/src/lib/refinePlan.test.js`, `client/src/components/FeeField.jsx` (novo).
**Compartilhados com o grupo CATÁLOGO (038/057/039):**
- `client/src/components/Crafting.jsx`: 019 troca os dois campos de taxa por `FeeField`; 038 mexe no seletor "Craftar em" e na linha `bonusCity`; 041 acrescenta um select e um cartão. Regiões distintas: merge textual simples.
- `client/src/lib/craftPlan.test.js`: 038 altera uma linha (`bonusCity`); 019 e 041 **não devem chamar `craftBonusCity`** (usam `specialty: true` e `bonusCity: null`, evitando acoplamento).
- Fixture: **019 não altera a fixture** (casos puros em número ou com itens já presentes: `T4_PLANKS`, `T6_MAIN_SWORD`, `T4_2H_BOW`).
**Impacto em planos aprovados (valores que mudam, ver tabela):** os testes da IDEIA-001 (`econ.test.js`, `craftPlan.test.js`, `refinePlan.test.js`) são **reescritos nesta ideia**; a IDEIA-031 (refino e craft: `fixed` do adaptador) terá os números abaixo (variável não muda); IDEIA-030 e IDEIA-023 não são afetadas.

## Fórmulas (dossiê §2 T1 a T4; fórmula de produto)

```
nutrição(n)        = itemValue * 0.1125 * n                    // T1 (Lands Awakened 2021; AFM 2026-09-10)
fee_exata(n)       = itemValue * 0.1125 * n * feePer100 / 100  // T2: "full precision"
roundFee(x)        = Math.round(x)                             // único arredondamento; Math.round (meio sobe)
stationFee(v,r,n=1)= fee_exata(n)                              // sem arredondar
craft:   fee_craft = roundFee(stationFee(recipeValue(rec), rate, crafts))
refino:  unit.fee  = stationFee(valorDoRefinado, rate)          // exata, por unidade
         fee_lote  = roundFee( soma(materialPlan(unit, qty, rrr).makes[i].fee) )
```
Sem mudança: itemValue (soma da receita; refinado = valor do refinado), foco e RRR não alteram a taxa (T4).

## Valores que mudam nos testes existentes (recalculados à mão; `feePer100 = 400`)

Taxas exatas: valor 16 → **7,2**; 8 → **3,6**; 4 → **1,8**; T6 espada (1.536) → 691,2; arco T4 (512) → 230,4 por craft.

| Teste (IDEIA-001) | Antes | Depois |
|---|---|---|
| `stationFee(16,400)`, `(8,400)`, `(4,400)` | 7, 4, 2 | **7,2; 3,6; 1,8** (`toBeCloseTo`) |
| `stationFee(7296,400)`, `(1024,400)`, `(40,100)`, `(100,0)` | 3283, 461, 5, 0 | 3283,2; 460,8; 4,5; 0. E `roundFee(...)` = **3283; 461; 5; 0** |
| Cenário A `buy` / `all` / `best` (custo T4) | 76,6203 / 62,3530 / 61,5265 | **76,8203 / 62,2197 / 61,4734** |
| Cenário B (`best`=`buy`) / `all` | 57,6329 / 62,3530 | **57,8329 / 62,2197** |
| `fee` do T4 na rota `buy` | 7 | **7,2** |
| T3 feito (A `all` / `best`) | 27,4578 / 26,1519 | **26,9312 / 25,7519** |
| T2 feito (`alt`) | 7,0633 | **6,8633** |
| sem T3_WOOD: `all` / `best` | 50,3357 / 76,6203 | **50,2024 / 76,8203** |
| sem T4_WOOD, rota `buy` | 38,6456 | **38,8456** |
| `materialPlan` best A, n = 1000: fees | 7.000 e 2.531,6456 | **7.200 e 2.278,4810**; quantidades e compras iguais |
| C1 (arco, 1000 crafts, `buy`): `fee` / total / unitário | 230.000 / 3.117.218,0451 / 3.117,2180 | **230.400 / 3.117.618,0451 / 3.117,6180** |
| C1 lucro / margem (premium) | 5.765.281,9549 / 184,9496% | **5.764.881,9549 / 184,9130%** |
| C1 sem premium | 5.385.281,9549 / 172,7592% | **5.384.881,9549 / 172,7242%** |
| C1 `cmp`: all / best / d10 / d20 | 62,3530 / 61,5265 / 57,4960 / 54,0016 | **62,2197 / 61,4734 / 57,4579 / 53,9769** |
| C2 (modo `best`): custo unitário / material / total | 61,5265 / 1.480.337,2797 / 1.710.337,2797 | **61,4734 / 1.479.058,1324 / 1.709.458,1324** |
| C2 lucro / margem | 7.172.162,7203 / 419,3420% | **7.173.041,8676 / 419,6091%** |
| C2 plano: taxas T4 / T3 | 168.421,0526 / 60.911,7731 | **173.233,0827 / 54.820,5958**; compras iguais (913.676,5966; 289.138,1635; 48.189,6939); soma do plano = material = 1.479.058,1324 |
| C3 (espada T6 com artefato): `fee`/total | 3283 / 96.591,2707 | **3283 / 96.591,2707** (1 craft: 3283,2 arredonda para 3283; não muda) |
| `evaluateTier` BM 140 (premium): custo / lucro / margem | 61,5265 / 72,8735 / 118,44% | **61,4734 / 72,9266 / 118,63%** |
| `evaluateTier` Martlock 135 ordem / sem premium | 64,6985 / 67,2735 | **64,7516 / 67,3266** |
| `compareRoutes` A / B | [76,6203; 62,3530; 61,5265] / [57,6329; 62,3530; 57,6329] | **[76,8203; 62,2197; 61,4734] / [57,8329; 62,2197; 57,8329]** |
Nada muda nas **decisões** de rota (comprar/produzir) dos cenários A e B, nem em `qty`, `used`, `routePath`, `usedCells`. Os valores novos foram calculados pelo Planejador com script próprio (taxa exata em cada etapa); o Executor deve **conferir à mão ao menos dois** (A `buy` = 110 × 0,632911 + 7,2 = 76,8203; C1 taxa = 512 × 0,1125 × 400/100 × 1.000 = 230.400).

## Onde aparece e UI

Abas **Craft** (campos "Taxa da bancada" do craft e do refino dos materiais) e **Refino** (campo da taxa e uma linha nova **"Taxa da bancada do lote"**).
- Cada campo de taxa ganha, enquanto o usuário não o editar, a nota "Valor padrão do app (400), não do jogo. Informe a taxa da sua bancada (prata por 100 de nutrição)."; ao editar, a nota some.
- Craft: a linha "Taxa da bancada" da tabela e do plano mostra o total do lote arredondado uma vez (ex.: 100 crafts, taxa 100: 17.280, não 17.300).
- Refino: nova linha "Taxa da bancada do lote (N un.)" (quantidade já existente na tela) com o total arredondado uma vez (ex.: 1.000 pranchas T4, taxa 100: 1.800).
- Nenhum preset, nenhuma lista de cidades de taxa.

## Arquivos afetados (exatos)

**Criados:** `client/src/components/FeeField.jsx`.
**Alterados:** `client/src/lib/econ.js`, `client/src/lib/econ.test.js`, `client/src/lib/craftPlan.js`, `client/src/lib/craftPlan.test.js`, `client/src/lib/refinePlan.js`, `client/src/lib/refinePlan.test.js`, `client/src/components/Crafting.jsx`, `client/src/components/Refining.jsx`.
**NÃO toca:** `catalog.js`, `build-catalog.mjs`, fixture, `market.js`, `Flipper.jsx`, `flip.js`, `App.jsx`.
**Modelo de dados:** `localStorage` `albion:craft:cfg` ganha `feeSet` e `refineFeeSet` (booleans, ausentes = `false`); `albion:refine:cfg` ganha `feeSet`. O padrão `feePer100: 400` **não muda** (ver pergunta 1).

## Interfaces

```js
// econ.js
export const stationFee = (itemValue: number, feePer100: number, n = 1): number   // exata
export const roundFee = (x: number): number                                        // Math.round, único ponto
// refinePlan.js
export function lotFee(unit, qty: number, rrr: number): number    // roundFee(Σ makes[i].fee de materialPlan(unit, qty, rrr))
// FeeField.jsx  props: { label, value, onChange(v), touched: boolean, onTouch() }
```

## Tasks (1 commit cada; testes primeiro)

### Task 1: `stationFee` exata e `roundFee` (casos 1 a 5 do dossiê)
**Files:** Modify `econ.test.js`, `econ.js`.
- [ ] **Step 1: testes falhando** (substituem os de `stationFee` da IDEIA-001; `import { stationFee, roundFee }`):

```js
// dossiê §4: valor de item 384 (Broadsword T4 = 16*16 + 8*16), prancha T4 = 16
it('caso 1: 100 crafts, taxa 100 = 4.320 (antes 4.300)', () => expect(roundFee(stationFee(384, 100, 100))).toBe(4320));
it('caso 2: 1 craft, taxa 100 = 43 (43,2 arredondado no total)', () => { expect(stationFee(384, 100)).toBeCloseTo(43.2, 6); expect(roundFee(stationFee(384, 100, 1))).toBe(43); });
it('caso 3: 1.000 pranchas T4, taxa 100 = 1.800 (antes 2.000)', () => expect(roundFee(stationFee(16, 100, 1000))).toBe(1800));
it('caso 4: 7 crafts, taxa 333 = 1.007 (antes 1.008)', () => { expect(stationFee(384, 333, 7)).toBeCloseTo(1006.992, 3); expect(roundFee(stationFee(384, 333, 7))).toBe(1007); });
it('caso 5: 100 crafts, taxa 500 = 21.600 (igual)', () => expect(roundFee(stationFee(384, 500, 100))).toBe(21600));
it('por unidade é exata e n=1 por padrão', () => { expect(stationFee(16, 400)).toBeCloseTo(7.2, 9); expect(stationFee(8, 400)).toBeCloseTo(3.6, 9); expect(stationFee(4, 400)).toBeCloseTo(1.8, 9); });
it('taxa zero e meio sobe', () => { expect(stationFee(100, 0, 5)).toBe(0); expect(roundFee(stationFee(40, 100))).toBe(5); /* 4,5 */ });
it('linearidade: stationFee(v, r, n) === n * stationFee(v, r)', () => expect(stationFee(384, 333, 7)).toBeCloseTo(7 * stationFee(384, 333), 9));
```
  As contas do dossiê: nutrição por item 384 × 0,1125 = 43,2; × 100 = 4.320 (caso 1); 16 × 0,1125 × 1.000 = 1.800 (caso 3); 43,2 × 7 × 3,33 = 1.006,992 (caso 4).
- [ ] **Step 2:** `npx vitest run src/lib/econ.test.js` → FAIL (`roundFee is not a function`; `stationFee(16,400)` devolve 7).
- [ ] **Step 3:** em `econ.js`: remover `Math.round` de `stationFee`, aceitar `n = 1`, exportar `roundFee`. Atualizar também no mesmo arquivo de teste os casos de `refineUnit` e `materialPlan` conforme a tabela "Valores que mudam" (cenário A/B, T3_WOOD/T4_WOOD ausentes, `materialPlan` n = 1000).
- [ ] **Step 4:** PASS (`econ.test.js`). Outros testes ainda falham (craftPlan/refinePlan): tratados nas Tasks 2 e 3. **Step 5: Commit** só quando `npm test` estiver verde (juntar as Tasks 1 a 3 num único commit se necessário; ver nota).Mensagem: `fix: taxa de bancada exata, arredondada só no total (stationFee, roundFee)`.
  *Nota de ordem:* como `refineUnit` e `computeCraft` dependem de `stationFee`, os commits das Tasks 1 e 2 devem sair juntos se a suíte não ficar verde entre eles.

### Task 2: taxa do craft arredondada no total (`craftPlan.js`)
**Files:** Modify `craftPlan.test.js`, `craftPlan.js`.
- [ ] **Step 1: testes** (atualizar C1, C2, `cmp` e `plan` conforme a tabela; **novos**, com `T6_MAIN_SWORD` da fixture, valor da receita 16×64 + 8×64 = 1.536, refino em modo `buy`, `specialty: true`, preços `T6_METALBAR` 200 e `T6_LEATHER` 150, `feePer100` informado):

```js
it('lote: 100 crafts, taxa 100 → 17.280 (antes 17.300)', () => expect(computeCraft({ ...base, cfg: craftCfg({ crafts: 100, feePer100: 100, specialty: true, refine: BUY }) }).fee).toBe(17280));   // 1536*0,1125*100*1
it('lote: 7 crafts, taxa 333 → 4.028 (antes 4.025)', () => expect(computeCraft({ ...base, cfg: craftCfg({ crafts: 7, feePer100: 333, specialty: true, refine: BUY }) }).fee).toBe(4028));  // 172,8 × 3,33 × 7 = 4027,968
it('1 craft: 691 (691,2 arredondado no total)', () => expect(computeCraft({ ...base, cfg: craftCfg({ crafts: 1, feePer100: 400, specialty: true, refine: BUY }) }).fee).toBe(691));
it('fee do plano de refino fica exato e soma ao total', () => { /* C2: plan make fees 173233,0827 e 54820,5958; totalCost = matCost + c.fee com c.fee = 230400 */ });
```
  (`base` = rec/targetMid/prices/premium/bonusCity: null; as duas últimas são casos **derivados** do dossiê 019 com item da fixture, não números do dossiê; o Tester refaz.)
- [ ] **Step 2:** FAIL. **Step 3:** em `craftPlan.js` trocar `stationFee(recipeValue(rec), +cfg.feePer100 || 0) * crafts` por `roundFee(stationFee(recipeValue(rec), +cfg.feePer100 || 0, crafts))`. **Step 4:** PASS (`craftPlan.test.js`). **Step 5:** `npm test` completo ainda pode falhar em `refinePlan.test.js`: Task 3.

### Task 3: `lotFee` e testes do refino
**Files:** Modify `refinePlan.test.js`, `refinePlan.js`.
- [ ] **Step 1: testes falhando:**

```js
it('caso 3 do dossiê no refino: 1.000 pranchas T4, taxa 100, rota buy = 1.800', () => {
  const u = refineUnit('T4_PLANKS', { prices, city: 'best', useOrders: false, rrr: 58 / 158, feePer100: 100, route: 'buy' });
  expect(u.fee).toBeCloseTo(1.8, 9); expect(lotFee(u, 1000, 58 / 158)).toBe(1800); });
it('rota all, taxa 100, 1.000 un.: soma exata das etapas, arredondada uma vez', () => { /* 1,8·1000 + 0,9·632,9114 + 0,45·400,5768 = 2.549,88 → 2.550 */ });
it('evaluateTier e compareRoutes com taxas exatas', () => { /* BM 140: custo 61,4734; lucro 72,9266; margem 118,63%; rotas [76,8203; 62,2197; 61,4734]; B: [57,8329; 62,2197; 57,8329] */ });
```
- [ ] **Step 2:** FAIL (`lotFee` inexistente). **Step 3:** implementar `lotFee` em `refinePlan.js`. **Step 4:** `npm test` → tudo verde. **Step 5: Commit:** `fix: taxa de bancada exata e arredondada só no total do lote (econ, craft e refino)` (inclui Tasks 1 a 3).

### Task 4: `FeeField` e aviso do valor informado
**Files:** Create `components/FeeField.jsx`; Modify `Crafting.jsx`, `Refining.jsx`.
- [ ] **Step 1:** `FeeField` = `Field` + `NumberInput` + nota quando `!touched`. Em `Crafting.jsx` substituir os campos `feePer100` e `refineFee` por `FeeField`, `onChange` faz `set({ feePer100: v, feeSet: true })` (e `refineFee`/`refineFeeSet`). Em `Refining.jsx` o campo da taxa idem (`feeSet`), e acrescentar a linha `kv` "Taxa da bancada do lote" com `lotFee(cur.unit, +cfg.qty || 0, rrrValue)`.
- [ ] **Step 2:** `npm run check` → 0. `npm run dev`: Craft com `T6_MAIN_SWORD`, 100 crafts, taxa 100 → "Taxa da bancada" 17.280 e a nota sumindo após editar; Refino Tábua T4, qtd 1.000, taxa 100, rota "Comprar refinado pronto" → "Taxa da bancada do lote 1.800" (usa preços ao vivo: só a taxa é determinística). **Commit:** `feat: campo de taxa informado pelo usuário com aviso e taxa do lote no Refino`.

## Como o Tester valida (conta própria, sem importar `econ.js`)

Casos do dossiê §4 (valor 384; `×0,1125`; `×taxa/100`): **1)** 100 crafts, taxa 100: 384 × 0,1125 = 43,2 → × 100 = **4.320** (código antigo `round(43,2)=43` × 100 = 4.300, erro −20 / −0,46%). **2)** 1 craft: 43,2 → exibe **43**. **3)** 1.000 pranchas T4 (valor 16), taxa 100: 16 × 0,1125 × 1.000 = **1.800** (antigo `round(1,8)=2` × 1.000 = 2.000, +200 / +11,1%). **4)** 7 crafts, taxa 333: 43,2 × 7 × 3,33 = 1.006,992 → **1.007** (antigo 144 × 7 = 1.008). **5)** 100 crafts, taxa 500: **21.600** (igual). Verificação extra com a espada T6 da fixture (valor 1.536, derivado): 100 crafts a taxa 100 = 17.280 (antigo 17.300); 7 crafts a 333 = 4.028 (antigo 4.025).
**O que um jogador experiente estranharia:** taxa total diferente da que o jogo mostra na janela de produção (conferir uma vez com o número em jogo: o dossiê só confirma fórmula e arredondamento); lucro por unidade mudando em centavos entre 1 e 1.000 crafts (agora é consistente); taxa **zero** quando o campo está vazio (aviso presente); taxa por unidade com casas decimais na tela (deve exibir inteiro); rota "melhor" trocando de decisão sem motivo (não deve: os cenários A e B mantêm as mesmas decisões).

## Riscos

1. Muitos números de teste mudam ao mesmo tempo; mitigação: tabela acima e commit único das Tasks 1 a 3 com a suíte verde.
2. `stationFee(...)` pode ter outros chamadores (`Crafting.jsx` importava; após a IDEIA-001 ficou em `craftPlan.js`): `grep -rn stationFee client/src` antes de concluir.
3. O padrão 400 continua ativo (não é dado do jogo). Se o usuário nunca editar o campo, o resultado depende de um valor arbitrário: mitigado só por aviso (pergunta 1).
4. IDEIA-031 ainda não mesclada: seus testes de adaptador devem usar os valores novos (ver "Impacto").

## Critério de pronto

`npm run check` verde; os 5 casos do dossiê em teste; nenhum `Math.round` em `stationFee`; `roundFee` é o único arredondamento da taxa (`grep` limpo); aviso e linha de lote visíveis; tabela de valores novos aplicada aos testes; só os arquivos listados alterados.

## PERGUNTAS PARA O GERENTE

1. **Padrão 400:** o dossiê (§5) sugere deixar o campo **vazio** com aviso, o que bloqueia o cálculo até o usuário informar. O plano mantém 400 (para não mudar números de quem já usa) e só avisa enquanto não houver edição. Prefere o campo vazio?
2. O campo "taxa informada pelo usuário" foi implementado como o campo existente por 100 de nutrição, com o aviso. Se você quis um segundo campo ("taxa total lida na janela do jogo", que substitui o cálculo), isso é outra ideia (não está no dossiê).
3. Itens de artefato, `amountcrafted` > 1 e comida/poção: cálculo inalterado, como manda D-012. Confirmar que o aviso na tela (já previsto pela IDEIA-005) pode ficar para depois.
