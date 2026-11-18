# QA IDEIA-019 + DT-001 — laudo do Tester

**VEREDITO: APROVADO** (com 2 ressalvas não bloqueantes, ver §9)

Branch `feat/IDEIA-019` (HEAD `c2bf11e`), base `master` (`bde8c5d`). Worktree `.claude/worktrees/agent-a8a18c4e9a3b227d6`. Nada foi editado na branch; temporários ficaram fora do repositório (scratchpad).

## 1. Funcional
| Item | Resultado |
|---|---|
| `npm run check` | lint limpo; **96 testes** passando (5 arquivos); build OK |
| `npm test` x2 adicionais | 96/96 nas duas rodadas (~0,5 s) |
| Worktree depois do build | limpa (dist ignorado) |

## 2. Escopo (git)
3 commits: `1f8bec6` (DT-001), `09d722e` (taxa exata), `c2bf11e` (campo e aviso).
- **DT-001 (`1f8bec6`)**: só `craftPlan.test.js`, `econ.test.js`, `flip.test.js` (+58 linhas). Nenhum arquivo de produção. OK.
- Produção alterada: `econ.js`, `craftPlan.js`, `refinePlan.js`, `Crafting.jsx`, `Refining.jsx`, `FeeField.jsx` (novo). Todos previstos no plano.
- **Não mudaram**: `catalog.json`, `market.js`, `settings.js`, `docs/manager|research|qa|deploy`.
- Imposto, taxa de criação e RRR **intactos**: no diff de `econ.js` só `stationFee`, `roundFee` (novo) e a linha `fee` de `refineUnit`/`materialPlan` mudam; `SETUP_FEE`, `salesTax`, `rrr`, `resolveRRR`, `netSale` não aparecem no diff.

## 3. Recálculo independente (script próprio, aritmética racional BigInt, sem importar `client/src/lib`)
Fórmula: `taxa_lote = round_meio_sobe(valor × 0,1125 × crafts × taxa/100)`, um arredondamento.

| Caso | Valor | n | taxa | Exato | Esperado novo | Obtido (testes+UI) | Antigo |
|---|---|---|---|---|---|---|---|
| 1 Broadsword T4 | 384 | 100 | 100 | 4.320 | 4.320 | 4.320 (teste) | 4.300 |
| 2 Broadsword x1 | 384 | 1 | 100 | 43,2 | 43 | 43 | 43 |
| 3 Refino 1.000 pranchas T4 | 16 | 1000 | 100 | 1.800 | 1.800 | 1.800 (teste e UI) | 2.000 |
| 4 Broadsword x7 | 384 | 7 | 333 | 1.006,992 | 1.007 | 1.007 | 1.008 |
| 5 Broadsword x100 | 384 | 100 | 500 | 21.600 | 21.600 | 21.600 | 21.600 |
| Espada T6 (fixture) | 1.536 | 100 | 100 | 17.280 | 17.280 | 17.280 (teste e UI) | 17.300 |
| Espada T6 | 1.536 | 7 | 333 | 4.027,968 | 4.028 | 4.028 (teste e UI) | 4.025 |
| Espada T6 | 1.536 | 1 | 400 | 691,2 | 691 | 691 (teste e UI) | 691 |
| Arco 1.000 crafts | 512 | 1000 | 400 | 230.400 | 230.400 | 230.400 | 230.000 |
| Poção C5 | 2.160 | 3 | 150 | 1.093,5 | 1.094 | 1.094 | 1.095 |
| Espada T6, UI | 1.536 | 100 | 400 | 69.120 | 69.120 | 69.120 (UI) | 69.200 |
| Espada T6, UI | 1.536 | 1000 | 400 | 691.200 | 691.200 | 691.200 (UI) | 691.000 |

**Poção C5 refeita à mão da fixture**: valor da receita (24+12+12+6)×40 = 2.160; por craft 2.160×0,1125×1,5 = 364,5; x3 = 1.093,5 -> **1.094**. Material = (72×10+36×20+36×30+18×40)×100/133 = 2.436,0902. Total = **3.530,0902** (o enunciado diz 3.530,09: confere); unidades 15; custo/un 235,3393; venda líquida 400×0,935×15 = 5.610; lucro 2.079,9098; margem 58,9195%. Testes: iguais.
**Arco**: 512×0,1125×4 = 230,4 por craft; x1.000 = 230.400 exato (o antigo dava 230.000).
**Lote refino rota all** (1.000 un., taxa 100, RRR 58/158): 1.800 + 569,6203 + 180,2596 = 2.549,88 -> 2.550. Teste e UI: 2.550 (e 10.200 com taxa 400, que é 4 x 2.549,88 = 10.199,5 -> 10.200).
Limite do erro antigo, demonstrado: |n·round(x) − round(n·x)| ≤ (n+1)/2; varredura (valores 4..7.296, n 1..1000, taxas 0..1000): máximo |dif|/n = 0,5, sem violação.

## 4. Diferencial master × branch
Método: cópia de `master` (git archive) em pasta temporária, mais um **oráculo** (`ref` = master com apenas a taxa por unidade exata e, no Craft, o arredondamento exato do total por BigInt). Rodei `computeCraft`, `refineUnit`, `materialPlan`, `evaluateTier`, `compareRoutes` e `lotFee` com preços aleatórios (15% de itens ausentes, cidades ausentes, preços 0, escalas x1/x10/x100, `prices=null` em 3%).

- **Combinações: 7.400** (4.200 de craft + 3.200 de refino). Craft: 8 itens/receitas (espada, espada com artefato, armadura, poção amount 5, arco .0/.1/.3, espada .2), crafts {1,2,3,7,100,1000}, taxa e taxa de refino {0,1,100,400,1000}, premium sim/não, rotas buy/all/best, ordem/instantâneo, RRR manual/foco/especialidade. Refino: 6 uniqs (T2, T3, T4, .1, .2, .4), RRR {0, 58/158, 0,3, 0,435}, taxa {0,1,100,400,1000}, qtd {1,2,3,7,100,1000}.
- **branch == oráculo, bit a bit, em 100% (0 diferenças)**; `c.fee` == fórmula BigInt em 100% das 4.200.
- **Taxa 0 (craft e refino)**: master == branch **bit a bit** em todos (nenhuma diferença).
- **Campos independentes da taxa** (`units`, preços/modo/cidade/líquido das opções de venda): idênticos em 100%.
- Campos que diferem de master (todos dependentes da taxa): `fee`, `totalCost`, `unitCost`, `matCost` (via refino), `options[].profit/margin`, `best.*`, `lines[].unit/total/cmp.*`, `sub.cost/fee`, `plan[].fee/total`, `alt`, `refinable`. Nenhum campo fora dessa lista.
- **Limite**: |fee antigo − fee novo| ≤ (n+1)/2 em 100% (0 violações); máximo observado = 0,5 x crafts (430 num caso). Taxa unitária do refino: erro antigo ≤ 0,5 em 100% (máx 0,5). Lote do refino: |antigo − exato| ≤ Σ 0,5 x qtd_etapa em 100% (0 violações; razão máxima 1,00).
- Em casos limítrofes a decisão comprar×produzir muda (10 casos de craft alteraram `missing.length`; 1 de refino alterou `choice`): é consequência da taxa exata (com taxa 0 não ocorre; branch == oráculo).

## 5. Testes alterados (`git diff master...feat/IDEIA-019 -- '*.test.js'`)
Todos batem com a tabela "Valores que mudam" do plano; conferi à mão: A buy 110×0,632911+7,2 = **76,8203**; C1 taxa 512×0,1125×4×1000 = **230.400**; totais C1/C2 = material + taxa; T3 feito 26,9312 e T2 6,8633 (via oráculo); `materialPlan` 7.200 e 2.278,481 (632,9114×3,6).

| Teste | Antes | Depois | Veredito |
|---|---|---|---|
| bloco `stationFee` (7 asserções) | inteiro por unidade | exato + `roundFee` (caso 1 a 5, linearidade, meio sobe), asserções AUMENTARAM | OK (tabela) |
| refineUnit A buy/all/best, B, sem T3/T4, deep legado | 76,6203 / 62,353 / 61,5265 ... | 76,8203 / 62,2197 / 61,4734 ... | OK (tabela) |
| materialPlan n=1000 | 7.000 e 2.531,6456 | 7.200 e 2.278,481 | OK (tabela) |
| C1 / C1 sem premium / C2 (+ `cmp` e `plan`) | 230.000, 3.117.218,05 ... | 230.400, 3.117.618,05 ... | OK (tabela) |
| evaluateTier BM, Martlock, sem premium; compareRoutes A/B | 61,5265 ... | 61,4734 ... | OK (tabela) |
| **Poção C5** (aprovado fora da tabela) | taxa 1.095, total 3.531,0902 | 1.094, 3.530,0902 | OK (conta §3) |
| **refineUnit "prices null"** (aprovado fora da tabela) | custo 7 | 7,2 | OK (16×0,1125×4) |
| C3 (artefato) | 3.283 | 3.283 | não mudou, correto |

Nenhum outro teste mudou. Enfraquecimento: 0 `.skip/.only/.todo`; asserções removidas 55, adicionadas 93 (saldo +38); nenhuma tolerância aumentada (`toBeCloseTo` com os mesmos dígitos); as remoções são só as de valores substituídos.

## 6. DT-001: os 6 testes derrubam suas mutações
Mutação aplicada em cópia descartável de `feat/IDEIA-019`; suíte inteira rodada; sempre exatamente 1 teste falhou.

| # | Mutação | Teste que derrubou | Resultado |
|---|---|---|---|
| DT1 | `refineUnit`: `s.cost < q.price` -> `<=` | econ: "DT-001 empate exato ... rota best" | DERRUBADA |
| DT2 | `craftPlan` sBest `<` -> `<=` | craftPlan: "DT-001 empate exato ... modo best" | DERRUBADA |
| DT3a | craftPlan: Black Market sem exclusão em ordem de venda | craftPlan: "DT-001 Black Market nunca é ordem de venda" | DERRUBADA |
| DT3b | flip: idem | flip: "DT-001 Black Market nunca..." | DERRUBADA |
| DT4 | flip: remover `s === b` | flip: "DT-001 mesma cidade ... lucro positivo" | DERRUBADA |
| DT5 | flip: `now - d <= maxAgeMs` -> `<` | flip: "DT-001 borda da idade" | DERRUBADA |

Mutações extras (taxa) nos módulos tocados:

| Mutação | Resultado |
|---|---|
| 0,1125 -> 0,1126 | DERRUBADA (32 testes) |
| arredondar por unidade de novo | DERRUBADA (30) |
| esquecer fator crafts | DERRUBADA (7) |
| craft ignora a taxa do usuário (400 fixo) | DERRUBADA (3) |
| `roundFee` floor / ceil | DERRUBADA (6 / 4) |
| lotFee sem arredondar / só 1ª etapa | DERRUBADA (1 / 1) |
| materialPlan fee sem n | DERRUBADA (5) |
| refineUnit com fee arredondada / ignora `ctx.feePer100` / taxa /10 | DERRUBADA (19 / 3 / 33) |
| craft: fee sem arredondar | DERRUBADA (4) |
| **`refineFee` do craft ignorado (fixo 400, `craftPlan.js` `refCtx`)** | **SOBREVIVEU** (96/96) |
| **aviso do padrão sempre visível / ignora `touched` (`FeeField`)** | **SOBREVIVEU** (sem teste de componente; verificado só na UI, §7) |

Sobreviventes (não bloqueantes): os testes de craft só usam `refineFee: 400`, igual ao padrão; falta um teste com `refineFee` diferente de 400 (ex.: 100). FeeField não tem teste (o projeto não tem testes de componente).

## 7. UI (vite na worktree, porta 5193, servidor parado ao final; preços reais da API)
- **Craft, espada T6**: 100 crafts/taxa 100 = **17.280**; 100/400 = **69.120**; 7/333 = **4.028**; 1/400 = **691**; 1.000/400 = **691.200**. Batem com o script. Rótulo "Taxa da bancada (craft)" é total do lote (custo total 5.114.851 = materiais + 17.280).
- **Refino, Tábua T4, 1.000 un.**: rota Comprar pronto, taxa 100 = **1.800**, taxa 400 = 7.200; rota Produzir tudo = **2.550** / **10.200**; rota Melhor = 2.370 / 9.478 (1.800 + 569,62; confere com T3 produzido e T2 comprado); 1 un./400: 7, 10, 9. 7 un./333 = 42; 100 un./1000 = 1.800.
- **Aviso**: aparece nos 3 campos enquanto não editados ("Valor padrão do app (400), não do jogo..."); some ao editar e fica gravado (`feeSet`/`refineFeeSet`); o campo do usuário prevalece sobre o 400 (testado 0, 100, 250, 333, 1000).
- Mercado, Flipper, Craft e Refino abrem; 0 erros de console; nenhum NaN/Infinity/undefined em nenhuma tela. **Não existe aba RRR nesta worktree.**

## 8. Casos-limite (registro; validação formal é a IDEIA-060)
| Entrada | Craft | Refino |
|---|---|---|
| taxa vazia / texto / 1e400 | campo fica "" -> taxa 0, sem aviso | idem (0) |
| taxa 0 | 0 | 0 |
| taxa negativa (-5) | **taxa negativa** (-864 p/ 100 crafts), custo total diminui | lote -90; unitário exibe "-0" |
| taxa decimal (2,5) | 432 (172,8 x 2,5) | 45 |
| taxa 1001 | aceita (dossiê: máx 1.000) | idem |
| taxa 1e12 | 172,8 trilhões, sem NaN | 18 bilhões/un. |
| crafts / qtd 0, vazio, negativo | Craft trata como 1 craft (`Math.max(1,...)`) | lote mostra 0 (qtd 0) ou **valor negativo** (qtd -3 = -5) |
| crafts / qtd decimal (2,5) | 2,5 crafts, taxa 432 | rótulo "(3 un.)" com taxa 5 (4,5 arredondado) |
| crafts 1e12 | taxa 172,8 trilhões, sem NaN | 1,8 trilhão |
| item sem valor de receita (ex.: armadura da fixture, valor 0) | taxa 0 sem exceção (coberto no diferencial) | n/a |
Sem exceção e sem NaN/Infinity em nenhum caso.

## 9. Parece erro para um jogador experiente?
- Taxa total sempre = valor x 0,1125 x taxa/100 x crafts (±0,5): confere em 100% das 4.200 combinações. Taxa nunca maior que materiais sem motivo.
- **Ressalva 1 (aviso falso para quem já usava o app)**: o aviso depende só de `feeSet`. Quem tinha taxa customizada salva antes desta versão (sem `feeSet`) vê "Valor padrão do app (400)" mesmo com 250 ou 300 no campo (reproduzido com localStorage antigo). O plano prevê "ausentes = false", mas o requisito "aviso SÓ quando o padrão está em uso" é violado nesse caso. Sem impacto em números. Sugestão: `touched = feeSet || valor !== 400`.
- **Ressalva 2 (rótulos no Refino)**: a linha "Taxa da bancada" é por unidade e só da etapa final, arredondada para inteiro (1,8 aparece "2"), e "Taxa da bancada do lote" soma todas as etapas produzidas. Na rota Melhor com taxa 400 aparecem "7" por unidade e "9.478" para 1.000 un. (não 7.000); o jogador pode estranhar. Aritmeticamente correto.
- Plano x dossiê: sem divergência. O plano mantém o padrão 400 (o dossiê §5 sugeria campo vazio); o plano já registra isso como pergunta aberta ao Gerente.

## 10. Evidências
Scripts (fora do repo): `scratchpad/indep.mjs` (recálculo), `scratchpad/diff/run.diff.js` (diferencial), `scratchpad/mut/run-mut.mjs` (mutações). Causa provável de reprovação: não se aplica.

## Adendo: Re-teste do retrabalho nº 1 (commits a555a91 e 8b88b90; tip anterior c2bf11e)

**Veredito final: APROVADO** (as 2 ressalvas do §9 foram corrigidas; nenhuma nova).

1. **Escopo** (`git diff c2bf11e..feat/IDEIA-019 --stat`): `econ.js` (+5: `DEFAULT_FEE` e `feeIsUnconfirmedDefault`), `econ.test.js`, `craftPlan.test.js`, `Crafting.jsx`, `Refining.jsx`. `stationFee`, `roundFee`, imposto e RRR não mudaram.
2. **`feeIsUnconfirmedDefault`**: oráculo definido antes de ler o código (avisa só se `!feeSet` e valor numericamente 400, nunca para '', null, undefined). Tabela de 11 valores (400, 250, 0, '', null, undefined, '400', 400.0, '400.0', 399.9, '250') x feeSet true/false/undefined/null = 44 combinações, 0 divergências. UI (porta 5194): localStorage antigo com 250 e 300 sem `feeSet` NÃO mostra aviso (bug da ressalva 1 corrigido); 400 sem `feeSet` mostra; editar o campo (401) tira o aviso e grava `feeSet`.
3. **Teste do `refineFee`** (arco, 1 craft, "Produzir tudo"): T4 = 32x100/133 = 24,06015 x (16x0,1125=1,8 por 100) = 43,308 (taxa 100) e 433,08 (taxa 1000); T3 = 24,06015x100/158 = 15,22795 x 0,9 = 13,705 e 137,05. Confere com o teste. Mutações: `refineFee` trocado por `feePer100` e `refineFee` ignorado são derrubadas. **As 14 mutações do laudo (X5 incluída) e as 6 da DT-001 continuam derrubadas; 0 sobreviventes** (mais 3 novas derrubadas, inclusive aviso sempre ativo).
4. **Rótulos do Refino**: "Taxa da última etapa (por unidade)" e "Taxa do lote (todas as etapas, N un.)". Números iguais aos anteriores: Craft 17.280 e 69.120; Refino 1.000 un. = 1.800 (Comprar pronto, taxa 100), 2.550 (Produzir tudo, 100), 9.478 (Melhor, 400).
5. **`npm run check` 2x**: lint limpo, 100/100 testes, build OK. Console da UI limpo, sem NaN. Servidor 5194 parado.
