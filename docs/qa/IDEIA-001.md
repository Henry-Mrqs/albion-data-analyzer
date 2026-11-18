# QA IDEIA-001: Fundação de testes (Vitest + refatoração sem mudar números)

**Veredito: APROVADO**

Branch `feat/IDEIA-001` (HEAD `e5fb2ca`), comparada com a base `7fe574e`. Nenhuma divergência numérica entre o código antigo e o novo; as 109 contas independentes batem com o código e com os testes. Há 5 lacunas de cobertura (mutações sobreviventes, seção 5) e algumas observações de comportamento herdado (seção 6). Nenhuma reprova a promessa "nada mudou".

## 1. Funcional

| Verificação | Resultado |
|---|---|
| `npm run check` (lint + test + build) | código 0. Lint sem saída (limpo); 5 arquivos de teste, **76 testes passando**; build Vite 8 ok (1470 módulos, 0,6 s) |
| `npm test` 3 vezes seguidas (1 dentro do check + 2 extras) | 76/76 nas três, ~0,45 s cada (critério do plano: menos de 10 s) |
| Ambiente | Vitest 5.1.0, `environment: node`, sem jsdom |
| Árvore após os testes | `git status` limpo na worktree |

## 2. Escopo

`git diff --stat 7fe574e..feat/IDEIA-001`: 20 arquivos, +1874 / -228. Todos estão na lista "Arquivos" do plano: `client/README.md`, `package.json`, `package-lock.json`, `vitest.config.js`, `catalog.js` (só `setCatalog`/`resetCatalog`/`loadCatalog`), `econ.js` (só `+resolveRRR`, 6 linhas), `craftPlan.js`, `refinePlan.js`, `flip.js` e os `*.test.js`, `catalog.fixture.json` (8,2 KB), `helpers.js`, `scripts/build-test-fixture.mjs`, `Crafting.jsx`, `Refining.jsx`, `Flipper.jsx`.

Proibidos: `catalog.json`, `market.js`, `settings.js`, `ui.jsx`, `Market.jsx`, `PriceMatrix.jsx`, `ItemSelector.jsx`, `App.jsx`, `docs/manager|research|qa|deploy`: **nenhum mudou** (diff vazio contra 7fe574e). `package.json`: só `vitest` em devDependencies e os 3 scripts. Módulos novos não importam React, fetch, localStorage nem import.meta. Os três componentes não contêm mais `stationFee`, `netSale`, `refineUnit`, `materialPlan`, `buyQuote` nem `1 - rrr`. Seis commits (Tasks 1 a 6).

Observação cosmética: em `Refining.jsx` ficou `used={usedCellSet}useOrders={...}` sem espaço entre atributos JSX. O parser aceita e o lint passou.

## 3. Recálculo independente (esperado × obtido)

Script próprio (`indep.mjs`, sem importar nada de `client/src/lib`; só as fórmulas do plano e receitas/valores escritos à mão) gerou a coluna "independente". A coluna "código" é o que `computeCraft`, `refineUnit`, `evaluateTier`, `flipRows`, `rrr`, `stationFee` e `netSale` da branch devolvem com a fixture. Os testes do Executor passam com esses mesmos valores (coincidem com o plano). **109 valores comparados; maior diferença absoluta: 0.**

| Conta | Independente | Código da branch | Diferença |
|---|---|---|---|
| RRR refine/false/false/0 | 0.1525 | 0.1525 | 0 |
| RRR refine/true/false/0 | 0.3671 | 0.3671 | 0 |
| RRR craft/true/false/0 | 0.2481 | 0.2481 | 0 |
| RRR craft/true/true/0 | 0.4792 | 0.4792 | 0 |
| RRR refine/true/true/0 | 0.5392 | 0.5392 | 0 |
| RRR refine/true/false/20 | 0.4382 | 0.4382 | 0 |
| RRR refine/true/true/20 | 0.5781 | 0.5781 | 0 |
| RRR craft/false/true/0 | 0.435 | 0.435 | 0 |
| fee(16,400) | 7 | 7 | 0 |
| fee(8,400) | 4 | 4 | 0 |
| fee(4,400) | 2 | 2 | 0 |
| fee(7296,400) | 3283 | 3283 | 0 |
| fee(1024,400) | 461 | 461 | 0 |
| fee(40,100) | 5 | 5 | 0 |
| fee(100,0) | 0 | 0 | 0 |
| net1000 order prem=true | 935 | 935 | 0 |
| net1000 instant prem=true | 960 | 960 | 0 |
| net1000 order prem=false | 895 | 895 | 0 |
| net1000 instant prem=false | 920 | 920 | 0 |
| A buy | 76.6203 | 76.6203 | 0 |
| A all | 62.353 | 62.353 | 0 |
| A best | 61.5265 | 61.5265 | 0 |
| B buy | 57.6329 | 57.6329 | 0 |
| B all | 62.353 | 62.353 | 0 |
| B best | 57.6329 | 57.6329 | 0 |
| semT3_WOOD all | 50.3357 | 50.3357 | 0 |
| semT3_WOOD best | 76.6203 | 76.6203 | 0 |
| semT4_WOOD buy | 38.6456 | 38.6456 | 0 |
| refino BM net/profit/margin[0] | 134.4 | 134.4 | 0 |
| refino BM net/profit/margin[1] | 72.8735 | 72.8735 | 0 |
| refino BM net/profit/margin[2] | 118.4424 | 118.4424 | 0 |
| refino Martlock net/profit[0] | 126.225 | 126.225 | 0 |
| refino Martlock net/profit[1] | 64.6985 | 64.6985 | 0 |
| refino BM sem premium net/profit[0] | 128.8 | 128.8 | 0 |
| refino BM sem premium net/profit[1] | 67.2735 | 67.2735 | 0 |
| C1 RRR craft | 0.2481 | 0.2481 | 0 |
| C1 qty | 24060.1504 | 24060.1504 | 0 |
| C1 material | 2887218.0451 | 2887218.0451 | 0 |
| C1 taxa | 230000 | 230000 | 0 |
| C1 custo total | 3117218.0451 | 3117218.0451 | 0 |
| C1 custo/un | 3117.218 | 3117.218 | 0 |
| C1 premium Lymhurst/order net,lucro,margem[0] | 8882500 | 8882500 | 0 |
| C1 premium Lymhurst/order net,lucro,margem[1] | 5765281.9549 | 5765281.9549 | 0 |
| C1 premium Lymhurst/order net,lucro,margem[2] | 184.9496 | 184.9496 | 0 |
| C1 premium Caerleon/order net,lucro,margem[0] | 8415000 | 8415000 | 0 |
| C1 premium Caerleon/order net,lucro,margem[1] | 5297781.9549 | 5297781.9549 | 0 |
| C1 premium Caerleon/order net,lucro,margem[2] | 169.9522 | 169.9522 | 0 |
| C1 premium Black Market/instant net,lucro,margem[0] | 8160000 | 8160000 | 0 |
| C1 premium Black Market/instant net,lucro,margem[1] | 5042781.9549 | 5042781.9549 | 0 |
| C1 premium Black Market/instant net,lucro,margem[2] | 161.7719 | 161.7719 | 0 |
| C1 premium Caerleon/instant net,lucro,margem[0] | 7680000 | 7680000 | 0 |
| C1 premium Caerleon/instant net,lucro,margem[1] | 4562781.9549 | 4562781.9549 | 0 |
| C1 premium Caerleon/instant net,lucro,margem[2] | 146.3735 | 146.3735 | 0 |
| C1 sem premium Lymhurst/order net,lucro,margem[0] | 8502500 | 8502500 | 0 |
| C1 sem premium Lymhurst/order net,lucro,margem[1] | 5385281.9549 | 5385281.9549 | 0 |
| C1 sem premium Lymhurst/order net,lucro,margem[2] | 172.7592 | 172.7592 | 0 |
| C1 sem premium Caerleon/order net,lucro,margem[0] | 8055000 | 8055000 | 0 |
| C1 sem premium Caerleon/order net,lucro,margem[1] | 4937781.9549 | 4937781.9549 | 0 |
| C1 sem premium Caerleon/order net,lucro,margem[2] | 158.4035 | 158.4035 | 0 |
| C1 sem premium Black Market/instant net,lucro,margem[0] | 7820000 | 7820000 | 0 |
| C1 sem premium Black Market/instant net,lucro,margem[1] | 4702781.9549 | 4702781.9549 | 0 |
| C1 sem premium Black Market/instant net,lucro,margem[2] | 150.8647 | 150.8647 | 0 |
| C1 sem premium Caerleon/instant net,lucro,margem[0] | 7360000 | 7360000 | 0 |
| C1 sem premium Caerleon/instant net,lucro,margem[1] | 4242781.9549 | 4242781.9549 | 0 |
| C1 sem premium Caerleon/instant net,lucro,margem[2] | 136.108 | 136.108 | 0 |
| C2 material | 1480337.2797 | 1480337.2797 | 0 |
| C2 total | 1710337.2797 | 1710337.2797 | 0 |
| C2 melhor net,lucro,margem[0] | 8882500 | 8882500 | 0 |
| C2 melhor net,lucro,margem[1] | 7172162.7203 | 7172162.7203 | 0 |
| C2 melhor net,lucro,margem[2] | 419.342 | 419.342 | 0 |
| C2 cmp buy/all/best/d10/d20[0] | 120 | 120 | 0 |
| C2 cmp buy/all/best/d10/d20[1] | 62.353 | 62.353 | 0 |
| C2 cmp buy/all/best/d10/d20[2] | 61.5265 | 61.5265 | 0 |
| C2 cmp buy/all/best/d10/d20[3] | 57.496 | 57.496 | 0 |
| C2 cmp buy/all/best/d10/d20[4] | 54.0016 | 54.0016 | 0 |
| C2 plano taxa T4 | 168421.0526 | 168421.0526 | 0 |
| C2 plano T3 qty | 15227.9433 | 15227.9433 | 0 |
| C2 plano T3 taxa | 60911.7731 | 60911.7731 | 0 |
| C2 plano T4_WOOD qty,tot[0] | 30455.8866 | 30455.8866 | 0 |
| C2 plano T4_WOOD qty,tot[1] | 913676.5966 | 913676.5966 | 0 |
| C2 plano T3_WOOD qty,tot[0] | 19275.8776 | 19275.8776 | 0 |
| C2 plano T3_WOOD qty,tot[1] | 289138.1635 | 289138.1635 | 0 |
| C2 plano T2_PLANKS qty,tot[0] | 9637.9388 | 9637.9388 | 0 |
| C2 plano T2_PLANKS qty,tot[1] | 48189.6939 | 48189.6939 | 0 |
| C3 taxa | 3283 | 3283 | 0 |
| C3 qty barra/couro[0] | 12.0301 | 12.0301 | 0 |
| C3 qty barra/couro[1] | 6.015 | 6.015 | 0 |
| C3 qty artefato | 1 | 1 | 0 |
| C3 material | 93308.2707 | 93308.2707 | 0 |
| C3 total | 96591.2707 | 96591.2707 | 0 |
| C3 RRR (cidade bonus espada) | 0.2481 | 0.2481 | 0 |
| C5 material | 2436.0902 | 2436.0902 | 0 |
| C5 taxa (por craft arredondada x3) | 1095 | 1095 | 0 |
| C5 total | 3531.0902 | 3531.0902 | 0 |
| C5 custo/un | 235.406 | 235.406 | 0 |
| C5 net/lucro/margem[0] | 5610 | 5610 | 0 |
| C5 net/lucro/margem[1] | 2078.9098 | 2078.9098 | 0 |
| C5 net/lucro/margem[2] | 58.8744 | 58.8744 | 0 |
| Flip BM instantanea lucro/margem[0] | 632 | 632 | 0 |
| Flip BM instantanea lucro/margem[1] | 63.2 | 63.2 | 0 |
| Flip Caerleon ordem (melhor que instantanea)[0] | 496 | 496 | 0 |
| Flip Caerleon ordem (melhor que instantanea)[1] | 49.6 | 49.6 | 0 |
| Flip Caerleon instantanea[0] | 440 | 440 | 0 |
| Flip Caerleon instantanea[1] | 44 | 44 | 0 |
| Flip compra por ordem custo | 922.5 | 922.5 | 0 |
| Flip compra ordem BM lucro/margem[0] | 709.5 | 709.5 | 0 |
| Flip compra ordem BM lucro/margem[1] | 76.9106 | 76.9106 | 0 |
| Flip sem premium BM lucro/margem[0] | 564 | 564 | 0 |
| Flip sem premium BM lucro/margem[1] | 56.4 | 56.4 | 0 |

Conferência com o plano: A buy 76,6203 / all 62,3530 / best 61,5265; B best 57,6329; sem T3_WOOD all 50,3357 (missing T3_WOOD) e best 76,6203; sem T4_WOOD buy 38,6456; BM 72,8735 / 118,44%; C1 custo 3.117.218,0451, lucro 5.765.281,9549, margem 184,9496%, sem premium 5.385.281,9549 / 172,7592%; C2 custo 1.710.337,2797, lucro 7.172.162,7203, margem 419,3420%; C3 total 96.591,2707; Flipper 632 / 496 / 440 / 709,5 / 564. Todos coincidem. A soma do plano de compra do C2 (materiais mais taxas de refino) fecha em 1.480.337,2797, igual ao material.

**Caso de poção (C5, acrescentado pelo Executor)**, refeito à mão: `T6_POTION_COOLDOWN` 24+12+12+6 ingredientes, valor 40 cada (fixture) = 2160; RRR craft 33/133; material = (720+720+1080+720)·100/133 = 2436,0902; taxa = round(2160·0,1125·1,5) = round(364,5) = 365 (Math.round sobe no meio) por craft, ×3 = 1095 (arredondando depois seria 1093,5); total 3531,0902; 15 unidades (amount 5 × 3 crafts); 235,4060 por unidade; venda por ordem 400·0,935·15 = 5610; lucro 2078,9098; margem 58,8744%. Bate com o código e com o teste. Premissa que não verifiquei: `consumables/potions` ter bônus em Caerleon (vem do catálogo; o teste a assume).

## 4. Teste diferencial antigo × novo

Código antigo = `client/src/lib` de `7fe574e` (git archive) mais a lógica copiada dos componentes de `7fe574e` para o script (`diff.t.mjs`). O que foi copiado, literalmente:
- `Crafting.jsx`: de `specialty` até `allBest` (rates, `modeOf`, `keyOf`, `canRefineUniq`, `ids`, `lines` com `cmp`/`sub`, custos, `missing`/`sub0`, `options`, `best`, `ready`, `plan`, `used`, `refinable`, `allBest`).
- `Refining.jsx`: `routePath`, `evaluate`, `rows`, `bestTier`, `missing`, `ready`, `routes`, `bestRoute`, `path`, `usedCells`, `rrrValue`.
- `Flipper.jsx`: corpo do `useMemo` das linhas. Única troca: `now` fixo como parâmetro no lugar de `Date.now()`, e sem o `sort`.
- Código novo = módulos da branch, com a cola dos componentes novos reproduzida (`resolveRRR`, `evaluateTier`, `compareRoutes`, `pickBestTier`, `usedCells`).
- Catálogo real completo (`catalog.json`, 2292 itens) nos dois lados; preços aleatórios com semente (cidades ausentes, preço 0, datas nulas ou velhas, qualidade 2, item sem preço em cidade nenhuma, `prices = null`).

| Parte | Combinações |
|---|---|
| Craft (item x encanto x cidade x especialização x foco x taxa x RRR manual x cidade de compra x useOrders x crafts {1,7,1000,0,-3,'','2.5','12'} x modo por recurso (buy/all/refine/best/indefinido) x foco/taxa/cidade/diário de refino x premium x preços) | 2400 |
| Refino (tipo x tier x encanto x cidades x foco x diário x taxa x RRR manual x useOrders x rota {buy,all,best,indefinida} x `deep` legado x modo de venda x premium x preços) | 2400 |
| Flipper (cidades de compra/venda x modos x minProfit x minMargin x maxAge x orçamento x premium x preços) | 1200 |
| **Total** | **6000** |

Resultado: **0 diferenças, 0 exceções.** Maior diferença numérica: 0. 1.019.370 números comparados, todos idênticos bit a bit. Cobertura: 1082 casos de craft com refino embutido, 1013 prontos, 159 com `prices=null`; 1366 refinos com melhor tier e 1112 com material faltando; 788 flippers com linhas. Prova de sensibilidade: trocar `0.1125` por `0.1126` só na cópia nova fez o diferencial acusar 29.956 diferenças.

## 5. Os testes protegem? Mutações

Feitas numa cópia descartável (`src` copiada para pasta temporária; cada mutação aplicada, `vitest run`, restaurada). Nada foi tocado na branch.

| Mutação | Testes que falharam | Exemplos |
|---|---|---|
| M01 0.1125 -> 0.1126 (taxa de bancada) | 5 | craftPlan.test.js: computeCraft C1: 1000 arcos, planks comprado pronto; craftPlan.test.js: computeCraft C1 sem premium; craftPlan.test.js: computeCraft C2: modo best (produz T3, compra T2) e plano |
| M02 refino especializado 40 -> 41 | 8 | craftPlan.test.js: craftRates refineRRRFor: auto = cidade do recurso; cidade fixa só bate no recurso dela; diário soma; craftPlan.test.js: computeCraft C1: 1000 arcos, planks comprado pronto; craftPlan.test.js: computeCraft C2: modo best (produz T3, compra T2) e plano |
| M03 craft especializado 15 -> 16 | 10 | craftPlan.test.js: craftRates especialização automática quando a cidade é a de bônus; craftPlan.test.js: craftRates foco e RRR manual; craftPlan.test.js: computeCraft C1: 1000 arcos, planks comprado pronto |
| M04 foco 59 -> 60 | 7 | craftPlan.test.js: craftRates foco e RRR manual; craftPlan.test.js: craftRates refineRRRFor: auto = cidade do recurso; cidade fixa só bate no recurso dela; diário soma; econ.test.js: rrr rrr {"kind":"craft","specialty":true,"focus":true} |
| M05 base 18 -> 19 | 18 | craftPlan.test.js: craftRates especialização automática quando a cidade é a de bônus; craftPlan.test.js: craftRates cidade errada = sem bônus; specialty explícito vence; craftPlan.test.js: craftRates foco e RRR manual |
| M06 imposto premium 0.04 -> 0.05 | 11 | craftPlan.test.js: computeCraft C1: 1000 arcos, planks comprado pronto; craftPlan.test.js: computeCraft C2: modo best (produz T3, compra T2) e plano; craftPlan.test.js: computeCraft C5: poção T6 com 4 ingredientes e amount 5 (3 crafts, conta à mão) |
| M07 imposto sem premium 0.08 -> 0.09 | 4 | craftPlan.test.js: computeCraft C1 sem premium; econ.test.js: netSale (1000) ordem/instantânea, com e sem premium; flip.test.js: flipRows sem premium: BM 564 |
| M08 SETUP_FEE 0.025 -> 0.03 | 11 | craftPlan.test.js: computeCraft C1: 1000 arcos, planks comprado pronto; craftPlan.test.js: computeCraft C1 sem premium; craftPlan.test.js: computeCraft C2: modo best (produz T3, compra T2) e plano |
| M09 arredondar taxa de craft DEPOIS de multiplicar por crafts | 4 | craftPlan.test.js: computeCraft C1: 1000 arcos, planks comprado pronto; craftPlan.test.js: computeCraft C1 sem premium; craftPlan.test.js: computeCraft C2: modo best (produz T3, compra T2) e plano |
| M10 stationFee Math.round -> Math.floor | 15 | craftPlan.test.js: computeCraft C1: 1000 arcos, planks comprado pronto; craftPlan.test.js: computeCraft C2: modo best (produz T3, compra T2) e plano; craftPlan.test.js: computeCraft C5: poção T6 com 4 ingredientes e amount 5 (3 crafts, conta à mão) |
| M11 rota best: < vira <= | 0 (**SOBREVIVEU**) |  |
| M12 rota best: < vira > | 12 | craftPlan.test.js: computeCraft C1: 1000 arcos, planks comprado pronto; craftPlan.test.js: computeCraft C2: modo best (produz T3, compra T2) e plano; econ.test.js: refineUnit (rota de refino) A best: faz T3, compra T2 |
| M13 craftPlan: sem fator (1 - craftRRR) na quantidade | 5 | craftPlan.test.js: computeCraft C1: 1000 arcos, planks comprado pronto; craftPlan.test.js: computeCraft C1 sem premium; craftPlan.test.js: computeCraft C2: modo best (produz T3, compra T2) e plano |
| M14 craftPlan: artefato tambem retorna | 1 | craftPlan.test.js: computeCraft C3: espada T6 com artefato (3 ingredientes), refinados em modo buy |
| M15 craftPlan: Black Market tambem em ordem de venda | 0 (**SOBREVIVEU**) |  |
| M16 flip: Black Market tambem em ordem de venda | 0 (**SOBREVIVEU**) |  |
| M17 refinePlan: BM vende por ordem (sem forcar compra) | 2 | refinePlan.test.js: evaluateTier melhor cidade de venda (Black Market, instantânea); refinePlan.test.js: evaluateTier sem premium |
| M18 refinePlan: modo BM nao forca instantanea | 2 | refinePlan.test.js: evaluateTier melhor cidade de venda (Black Market, instantânea); refinePlan.test.js: evaluateTier sem premium |
| M19 econ: buyQuote useOrders sem taxa 2.5% | 1 | econ.test.js: buyQuote useOrders: menor ordem de compra mais 2,5% |
| M20 flip: compra por ordem sem taxa 2.5% | 2 | flip.test.js: flipRows compra por ordem: custo 922.5 e lucro BM 709.5; flip.test.js: flipRows budget 950 barra compra instantânea (1000) mas aceita ordem (922.5) |
| M21 flip: dado velho <= vira < | 0 (**SOBREVIVEU**) |  |
| M22 flip: filtro de idade desligado | 1 | flip.test.js: flipRows dado velho some; maxAge 0 desliga o filtro |
| M23 flip: orcamento ignorado | 1 | flip.test.js: flipRows budget 950 barra compra instantânea (1000) mas aceita ordem (922.5) |
| M24 flip: permite vender na cidade de compra | 0 (**SOBREVIVEU**) |  |
| M25 econ.resolveRRR: vazio conta como manual | 7 | craftPlan.test.js: craftRates especialização automática quando a cidade é a de bônus; craftPlan.test.js: computeCraft C1: 1000 arcos, planks comprado pronto; craftPlan.test.js: computeCraft C1 sem premium |
| M26 craftPlan: crafts sem minimo 1 | 1 | craftPlan.test.js: craftRates crafts: mínimo 1; aceita decimal (comportamento atual) |
| M27 craftPlan: cidade de bonus nao detectada (specialty sempre false) | 7 | craftPlan.test.js: craftRates especialização automática quando a cidade é a de bônus; craftPlan.test.js: craftRates foco e RRR manual; craftPlan.test.js: computeCraft C1: 1000 arcos, planks comprado pronto |
| M28 refinePlan: empate de rotas favorece a ultima | 2 | refinePlan.test.js: compareRoutes B: empate buy = best, vence a primeira (buy); refinePlan.test.js: compareRoutes rota incompleta é excluída do best |
| M29 econ: refino especializado ignora diario | 5 | craftPlan.test.js: craftRates refineRRRFor: auto = cidade do recurso; cidade fixa só bate no recurso dela; diário soma; craftPlan.test.js: computeCraft C1: 1000 arcos, planks comprado pronto; econ.test.js: rrr rrr {"kind":"refine","specialty":true,"focus":false,"daily":20} |
| M30 craftPlan: refineRRRFor ignora cidade fixa (sempre especializado) | 1 | craftPlan.test.js: craftRates refineRRRFor: auto = cidade do recurso; cidade fixa só bate no recurso dela; diário soma |
| M31 craftPlan: unidades ignoram rec.amount | 1 | craftPlan.test.js: computeCraft C5: poção T6 com 4 ingredientes e amount 5 (3 crafts, conta à mão) |
| M32 craftPlan: margem sobre venda e nao sobre custo | 4 | craftPlan.test.js: computeCraft C1: 1000 arcos, planks comprado pronto; craftPlan.test.js: computeCraft C1 sem premium; craftPlan.test.js: computeCraft C2: modo best (produz T3, compra T2) e plano |
| M33 refinePlan: pickBestTier escolhe menor lucro | 1 | refinePlan.test.js: pickBestTier ignora linhas sem preço ou com missing e escolhe o maior lucro |
| M34 econ: refineUnit ignora taxa de bancada | 15 | craftPlan.test.js: computeCraft C1: 1000 arcos, planks comprado pronto; craftPlan.test.js: computeCraft C2: modo best (produz T3, compra T2) e plano; econ.test.js: refineUnit (rota de refino) A buy |
| M35 econ: materialPlan ignora RRR nas quantidades | 2 | craftPlan.test.js: computeCraft C2: modo best (produz T3, compra T2) e plano; econ.test.js: refineUnit (rota de refino) materialPlan(best A, n=1000) |
| M36 craftPlan: opcao instantanea usa preco de venda | 4 | craftPlan.test.js: computeCraft C1: 1000 arcos, planks comprado pronto; craftPlan.test.js: computeCraft C1 sem premium; craftPlan.test.js: computeCraft C2: modo best (produz T3, compra T2) e plano |
| M37 econ: buyQuote escolhe o MAIOR preco | 4 | craftPlan.test.js: computeCraft C1: 1000 arcos, planks comprado pronto; craftPlan.test.js: computeCraft C1 sem premium; econ.test.js: buyQuote 'best' pega o menor preço de venda > 0 |
| M38 refinePlan: evaluateTier - margem /0 sem guarda | 1 | refinePlan.test.js: evaluateTier tier sem receita no catálogo (T5) não estoura |
| M39 craftPlan: bestAt(10) usa 20 | 1 | craftPlan.test.js: computeCraft C1: 1000 arcos, planks comprado pronto |

**34 de 39 mutações mortas; 5 sobreviveram (lacunas):**
1. **M11, `<` virar `<=` na rota best (empate refinar x comprar):** nenhum teste tem empate exato entre custo de produção e preço de compra. Efeito real: raro (empate exato de ponto flutuante). A direção que muda o resultado (M12, `>`) é pega.
2. **M15, Black Market em ordem de venda no Craft:** o teste do arco só tem `b` no Black Market (`s` = 0). Se a API trouxer `s > 0` no BM, a regra "BM só instantânea" no `computeCraft` não está travada por teste. O código está correto (verifiquei: com BM `s=99999`, só a opção `instant` aparece), mas nada o protege.
3. **M16, o mesmo no Flipper (`flip.js`):** o teste "sellMode order em Black Market: nenhuma linha" passa porque o BM da fixture não tem `s`, não por causa da regra. Teste vazio quanto à regra.
4. **M24, vender na cidade onde comprou (Flipper):** o teste "não vende na mesma cidade" usa Caerleon com `s` 1600 e `b` 1500; sem a regra o lucro seria negativo e `minProfit 0` já eliminaria a linha. Teste vazio quanto à regra.
5. **M21, borda do filtro de idade (`<=` x `<`):** nenhum teste usa idade exatamente igual a `maxAge`.

Todas as mutações pedidas no briefing (0,1125; 40; 15; 59; 0,04; 0,025; ordem do arredondamento da taxa; `<` da rota best; fator (1 - craftRRR); BM só instantânea no refino) derrubaram pelo menos um teste, com as exceções acima: o `<=` (item 1) e a regra de BM no Craft e no Flipper (itens 2 e 3).

## 6. Casos-limite (módulos novos, catálogo real)

Varredura adicional: **23148 calculos, nao finitos=0** (todos os itens craftáveis, encantos 0 a 4, com `prices` nulo, `{}` e esparso), sem exceção e sem número não finito.

| Caso | Resultado |
|---|---|
| prices null | ok: false |
| prices undefined | ok: 1 |
| prices {} | ok: 1 |
| rec null | ok: 0 |
| rec null + prices null | ok: 0 |
| crafts=0 | ok: crafts=1 total=1710.337279667684 finito=true |
| crafts=-1 | ok: crafts=1 total=1710.337279667684 finito=true |
| crafts= | ok: crafts=1 total=1710.337279667684 finito=true |
| crafts=2.5 | ok: crafts=2.5 total=4275.8431991692105 finito=true |
| crafts=abc | ok: crafts=1 total=1710.337279667684 finito=true |
| crafts=null | ok: crafts=1 total=1710.337279667684 finito=true |
| crafts=undefined | ok: crafts=1 total=1710.337279667684 finito=true |
| crafts=NaN | ok: crafts=1 total=1710.337279667684 finito=true |
| crafts=1000000 | ok: crafts=1000000 total=1710337279.667684 finito=true |
| crafts=1e3 | ok: crafts=1000 total=1710337.2796676839 finito=true |
| crafts=Infinity | ok: crafts=Infinity total=Infinity finito=false |
| customRRR="abc" | ok: RRR=0.24812030075187969 qty0=240.6015037593985 finito=true |
| customRRR="" | ok: RRR=0.24812030075187969 qty0=240.6015037593985 finito=true |
| customRRR=null | ok: RRR=0 qty0=320 finito=true |
| customRRR=undefined | ok: RRR=0.24812030075187969 qty0=240.6015037593985 finito=true |
| customRRR=" " | ok: RRR=0 qty0=320 finito=true |
| customRRR="-5" | ok: RRR=-0.05 qty0=336 finito=true |
| customRRR="0" | ok: RRR=0 qty0=320 finito=true |
| customRRR="100" | ok: RRR=1 qty0=0 finito=true |
| customRRR="150" | ok: RRR=1.5 qty0=-160 finito=true |
| customRRR=33 | ok: RRR=0.33 qty0=214.39999999999998 finito=true |
| customRRR="1e2" | ok: RRR=1 qty0=0 finito=true |
| customRRR="NaN" | ok: RRR=0.24812030075187969 qty0=240.6015037593985 finito=true |
| feePer100="abc" | ok: 0 |
| feePer100="" | ok: 0 |
| feePer100=null | ok: 0 |
| feePer100=undefined | ok: 0 |
| feePer100=-100 | ok: -58 |
| feePer100=0 | ok: 0 |
| cfg.refine undefined (cfg antigo persistido) | **EXCEÇÃO**: Cannot read properties of undefined (reading 'PLANKS') |
| cfg.refineDaily undefined | ok: 1 |
| cfg.refineCity cidade desconhecida | ok: 0.15254237288135594 |
| modo refine legado | ok: all |
| item sem preço em cidade nenhuma (arco) | ok: options=0 best=undefined ready=false |
| item sem preço nenhum (nada) | ok: missing=Tábuas de Pinho ready=false |
| receita ausente na cadeia (T9_PLANKS) | ok: T9_PLANKS |
| refineUnit uniq inexistente | ok: NADA |
| refineUnit prices null | ok: cost=10.78 missing=3 |
| BM em ordem de venda (s>0 no BM) nao vira opcao | ok: instant |
| Premium false | ok: true |
| craftChainIds rec null | ok: 0 |
| craftRates bonusCity null / cfg minimo | ok: 0.15254237288135594 |
| evaluateTier prices null | ok: -7 |
| evaluateTier tier sem receita (T9) | ok: cost=0 margin=0 |
| evaluateTier sellCity inexistente | ok: 0 |
| evaluateTier rrr 1 (100%) | ok: 1502.8571428571427 |
| compareRoutes prices null | ok |
| compareRoutes sem nenhuma rota ok | ok |
| pickBestTier [] | ok |
| usedCells unit sem lines | ok: 0 |
| routePath unit sem receita | ok: 1 |
| routePath refinado sem sub | ok: 1 |
| flipRows {} | ok: 0 |
| flipRows buyCities [] | ok: 0 |
| flipRows sellCities [] | ok: 0 |
| flipRows prices sem qualidade 1 | ok: 0 |
| flipRows datas null com maxAge | ok: 0 |
| flipRows maxAge 0 datas null | ok: 0 |
| flipRows prices null (componente protege; modulo?) | **EXCEÇÃO**: Cannot convert undefined or null to object |
| flipRows cfg.buyCities undefined | **EXCEÇÃO**: cfg.buyCities is not iterable |
| flipRows custo 0 (s=0 b=0) sem divisao por zero | ok: 0 |
| flipRows padrao Date.now() | ok: 0 |
| varredura: todos os itens craftaveis x {null, {}, esparso} | ok: 23148 calculos, nao finitos=0 |

Leitura:
- Todos os casos do briefing (prices null, item sem receita, receita ausente na cadeia, crafts 0/negativo/vazio/decimal, customRRR inválido, item sem preço em cidade nenhuma, BM em ordem de venda, dado velho, array vazio) **não lançam exceção**.
- As 3 exceções são entradas fora do contrato e **idênticas ao código antigo** (não são regressão): `cfg.refine` indefinido (config antiga em `localStorage` sem a chave; `usePersisted` não mescla com os padrões), `flipRows(null)` (o componente protege com `if (!scan.prices) return []`) e `cfg.buyCities` indefinido.
- Comportamentos herdados e estranhos, sem validação: `customRRR = null` ou `' '` vira RRR 0 (o plano só documenta '0'); RRR manual de 150% gera quantidade negativa (-160) sem aviso; `crafts = Infinity` dá custo infinito; `feePer100` negativo dá taxa negativa; `crafts = '2.5'` aceita decimal (documentado). A UI normalmente não deixa digitar isso. Candidatos a ideia própria; não são defeitos desta refatoração.

## 7. Plausibilidade para um jogador experiente

- As constantes conferem com o que se conhece do jogo: RRR 15,3% base, 36,7% refino em cidade de especialização, 24,8% craft em cidade de bônus, 53,9% refino com foco; imposto 4% (premium) e 8%, taxa de ordem 2,5%, Black Market só com ordens de compra (venda instantânea). Isto não é validação (aviso do plano; é a auditoria D-008).
- Margens dos testes (184%, 419%, 118%, 63%, 59%) **não são realistas para mercado real** (um jogador esperaria 5% a 30%), mas decorrem de preços fictícios escolhidos à mão (arco a 9.500 com material a 3.100). Não é erro de cálculo; só não usar como exemplo de lucro. Nenhum lucro negativo sem sentido nem NaN nos testes.

## 8. UI (app da worktree, Vite em localhost, preços reais da API)

| Aba | Resultado |
|---|---|
| Craft (`#crafting`, espada T6) | renderiza: Produção, Materiais, Refino dos materiais, Plano de compra e produção, Comparar rotas, Preços por cidade; 0 erros no console. O aviso "Sem preço de venda deste item" é dado real (a API não tinha preço da espada T6) |
| Refino (`#refining`, Tábua T4) | renderiza: Custo líquido, Venda, Melhor rota, Passo a passo, Comparar tiers, Preços por cidade; cliquei numa linha de tier e troquei a rota para "Produzir tudo": o passo a passo mudou, 0 erros |
| Flipper (`#flipper`) | "Varrer mercado" retornou 67 linhas; 0 erros |

Console sem erros nas três abas. Servidor encerrado ao final.

## 9. Evidências

- `npm run check`: `Test Files 5 passed (5)`, `Tests 76 passed (76)`, `vite v8.0.14 ... built in 625ms`.
- Scripts temporários (fora do repositório, pasta temporária da sessão): `indep.mjs`, `compare.t.mjs`, `diff.t.mjs`, `mut.mjs`, `edge.t.mjs`.
- Nenhum arquivo da branch foi editado; nenhum commit, merge ou push.

## 10. Se reprovado

Não se aplica. Recomendações não bloqueantes: (a) teste com Black Market `s > 0` no Craft e no Flipper, e um com cidade de compra igual à de venda que seja lucrativa, para travar M15, M16 e M24; (b) teste de empate exato refinar x comprar e de idade igual a `maxAge`; (c) validação de entrada (RRR 0 a 100, `crafts` finito) como ideia futura.
