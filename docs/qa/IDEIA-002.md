# QA IDEIA-002 (Foco): laudo do Tester

**Veredito: APROVADO** (com 3 pendências menores, nenhuma de numero errado; ver "Pendências").

Branch `feat/IDEIA-002` (HEAD c572630), worktree do agente. Nada foi editado na branch; mutações e cenários rodaram numa cópia descartável em %TEMP%.

## 1. Funcional
| Item | Esperado | Obtido |
|---|---|---|
| `npm run check` (lint, test, build) | 660 testes | 660 passam, lint limpo, build ok |
| `npm test` 2 vezes | estável | 21 arquivos / 660 testes, 2x iguais |
| Escopo (`git diff --stat master...`) | só arquivos do plano | 15 arquivos, todos do plano; `econ.js`, `craftPlan.js`, `refinePlan.js`, `market.js`, `settings.js`, `vite.config.js`, `vercel.json`, `docs/*` sem diff |
| Testes existentes | só acréscimos | única linha removida é um `import` em `catalog.test.js` (acrescentado `focusOf`) |

## 2. `ef` contra oráculo independente (parser próprio do dump 0483dd97, sem o build do projeto)
| Medida | Esperado | Obtido |
|---|---|---|
| Itens com `ef` | 1.240 | **1.240** (1.220 equipamentos/consumíveis + 20 refinados via `_LEVELn`) |
| Entradas `ef` | 4.869 | **4.869** (4.789 + 80) |
| Divergências de valor `ef` (todos os 2.292 itens × níveis 1 a 4) | 0 | **0** |
| `f` (foco base) comparado ao dump | igual | **0 divergências** |
| Itens sem foco (Royal etc.) | `f 0`, sem `ef` | `T4_ARMOR_PLATE_ROYAL` f 0, sem `ef`; 881 itens craftáveis com f 0 |
| Receita alternativa (049) | foco igual na base e na alternativa | 605 itens com `alt`: **0** casos em que a alternativa tem foco diferente; o código usa o mesmo foco (coerente com plano e dossiê) |
| Build 2x | iguais entre si e ao commitado | idênticos; `git status` limpo após regenerar |

## 3. Diferencial do catálogo (master × branch)
- 2.292 itens: tudo igual exceto o campo novo `ef` (campos `r, er, alt, tm, cc, cityOf, encNames, extra, vals`, nomes: 0 diferenças; topo `built`, `src` iguais).
- `recipeOf`, `recipeVariants`, `ingredientValue`, `recipeValue` para 2.292 ids × encantos 0 a 4 (11.460 pares): **idênticos**.
- Tamanho: 628.165 → 682.974 bytes (+54.809, +8,7%); gzip 57.373 → 59.834 (+2.461, +4,3%). O custo real de carregamento é bem menor que o bruto, por causa do gzip.
- `validateCatalog`: aceita o catálogo novo e o da master. **Achado:** não valida `ef` (aceita `ef` string, array, negativo, NaN, nível 9); o runtime tolera (`focusOf` devolve null), então não quebra, mas o critério de pronto do plano diz "validado pela 067" (ver pendência 3).

## 4. Fórmula: cálculo independente
Escrevi o modelo SÓ do texto do dossiê/plano (custo = base × 0,5^(E/10000); economia = Σ(qtd×preço dos ingredientes que retornam) × (RRR com foco − RRR sem foco), PB = 18 + 15 se especialização + 59 se foco + diário; prata por ponto = economia ÷ pontos; vale se prata/ponto ≥ referência; orçamento = floor(foco ÷ pontos)), e comparei com `craftFocusSummary`:
- **6.000 cenários** (espada .0 a .4, poção T4 e .2, Royal, base 0; E 0, 1, 300, 5.000, 10.000, 15.500, 20.000,5, 29.999,9, 31.000 e aleatórios; override; orçamento 0 a 1e6; referência vazia/0/0,01/5/6,78/100/1e12; crafts 1, 3, 7, 50, 1000; RRR com e sem foco +59, diário 0/10/20, premium sim/não, taxa 0/400/500): **0 divergências** em pontos, economia, prata/ponto, orçamento, pontos por unidade e do lote, taxa igual com e sem foco, lucro com − sem = economia × crafts, veredito.
- Casos do dossiê refeitos à mão: 149,99; 1.259,53; 439,18; economia 1.016,60 (4.400 × (92/192 − 33/133)); 6,78; 0,81; 60 e 7 crafts com 9.000; taxa 216 com e sem foco (384 × 0,1125 × 5); espada T4 1.286 com E 31.000 = 149,99. Todos batem.
- Catálogo: espada T4 .0 = 1.286 e .1 a .4 = 2.251/3.939/6.893/12.064 (igual ao dump).
- Interação com o RRR: o cartão chama `computeCraft` com foco ligado e desligado. Na tela, com "Usar foco" ligado, RRR 47,9% (92/192) e lucro principal +3.392 = "lucro com foco" do cartão. Coerente. Com RRR manual digitado, o RRR é fixo, a economia do foco fica 0 (por leitura do código: `resolveRRR`); é coerente com a tela, mas o cartão mostraria "0 prata por ponto" sem explicar.

## 5. Foco desligado idêntico à master
3.500 combinações de `computeCraft` (item, encanto, preços, RRR/foco/diário, crafts, ordens, refino com foco) e 11.460 receitas, rodadas com o catálogo da master e o da branch no mesmo código: **0 diferenças**. `econ.js`, `craftPlan.js`, `refinePlan.js` sem diff no git. Na UI, os números do resto da tela não mudam com os campos de foco vazios.

## 6. Validação (060) e estado salvo (D-039)
- `focusValues`: negativo, texto, NaN, objeto, booleano, vírgula ("1,5"), −Infinity → valor corrigido com aviso `error` (eficiência 0, orçamento 10.000, referência/override ausentes); 99.999 e 31.001 → 31.000 com `warn`; Infinity → teto com aviso; decimal e "1e3" aceitos; vazio/null/undefined (estado antigo) → padrão sem aviso; `{}`, `null`, `undefined` como cfg inteira não lançam; nenhum NaN/∞ em nenhum caso. Um aviso por campo (sem duplicata), confirmado na tela (99.999, −5 e "abc" geraram 3 avisos, um por campo).
- Estado antigo completo (sem campos novos) abre normalmente nas duas telas (UI). 
- **Falha menor:** o selo "N valores corrigidos" (`CorrectedBadge`) usa só os avisos de `cleanCraftCfg`/`cleanRefineCfg`; os avisos do foco aparecem sob cada campo mas **não entram na contagem** (3 correções de foco, selo ausente).

## 7. Honestidade da tela
- Rótulos "Foco (suas entradas)", "Entrada sua", "fórmula da fonte: custo base do dump × 0,5^(eficiência ÷ 10.000)" e "valor digitado do jogo (vence a fórmula)" separam bem o que é do usuário e o que é da fonte.
- Confiança "média-alta, ainda não conferida em jogo" e "A eficiência não é calculada dos níveis de especialização: digite a sua": clara, sem alarmismo, não finge saber a eficiência do jogador. Não há conversão por maestria.
- Royal: "O dump do jogo não traz custo de foco para este item... digite o foco do jogo" (confirmado). Sem referência: "use o foco no item com a maior prata por ponto" (sem veredito inventado). Com referência 5 e 6,41 por ponto: "Vale usar foco".
- Poção: mostra pontos por craft e por unidade produzida (148,49 e 29,7 com E 5.000), rotulado. A regra de foco por nutrição (dossiê F9) não é citada na tela nem no plano; o dossiê diz que o `@craftingfocus` do dump já a considera. Aceitável, mas sem aviso.
- Refino: nota "a mesma eficiência vale para todas as etapas da rota e o foco do jogo vale só para a etapa final". O cartão não mostra o detalhe por etapa e não exibe `stepsWithoutData` (etapa sem dado conta 0 em silêncio; hoje todas as etapas têm dado).

## 8. Decisão do Executor no Refino
Razoável como aproximação declarada, não exata. No jogo a eficiência de foco do refino vem da maestria/especialização de cada recurso e tier (cada etapa tem a sua), então a mesma E em todas as etapas é uma simplificação; erra pouco porque as etapas abaixo da final pesam menos (Tábua T4, E 10.000: 27 dos 36,05 pontos são da etapa final) e o override do jogo corrige a etapa final. A nota na tela deixa isso à vista. Recomendo manter e registrar como medição pendente com o usuário (foco mostrado pelo jogo por etapa).

## 9. Mutações (cópia descartável; teste que falha)
20 mutações; 17 mortas, 3 sobreviveram.
| Mutação | Resultado (primeiro teste que falha) |
|---|---|
| expoente com sinal trocado | morta: "custo de foco... espada T4.0 (base 1286), eficiência 31000 → 149.99" (+9) |
| 10000 → 1000 | morta: mesmo teste (+9) |
| base errada por encanto (usa `f`) | morta: "focusOf nível 0 usa f; nível n usa ef[n]..." (+2) |
| `ef` ignorado | morta: "focusOf nível 0 usa f..." e "refineFocusSummary encanto .1 usa ef" |
| arredondar pontos | morta: "craftFocusSummary pontos e orçamento: 149,99... 60 crafts" |
| "vale" invertido | morta: "veredito: sem referência = info; referência 5 → worth..." |
| orçamento com divisão errada | morta: "orçamento 9.000: 60 crafts a 149,99 e 7 a 1.259,53" |
| eficiência sem teto 31.000 | morta: "efficiency acima de 31.000 → 31.000 com aviso" |
| eficiência negativa aceita | morta: "efficiency negativo ou texto (-1) → 0 com erro" |
| foco ligado sem +59 (Craft) | morta: "economia do foco = 3.308,27 − 2.291,67..." (+6) |
| foco ligado sem +59 (Refino) | morta: "economia por unidade = bruto 110 × (0,632911 − 0,460829)" |
| override ignorado | morta: "override vence a fórmula; base 0 ou null = none" |
| pontos por unidade sem dividir por `amount` | morta: "item rende 5 (poção): pontos por unidade..." |
| taxa entrando na economia | morta: "economia do foco = ... 1.016,60" |
| Refino ignora etapas intermediárias | morta: "rota all soma o foco de cada etapa" |
| lote sem multiplicar crafts | morta: "lote: 100 crafts multiplica pontos e economia" |
| orçamento padrão errado (9.000) | morta: "focusValues... estado salvo antigo ({})" |
| **floor → round no orçamento** | **SOBREVIVEU** (os testes usam 60,0 e 7,15, onde floor e round coincidem; falta caso como 60,6) |
| **`>=` → `>` no veredito** | **SOBREVIVEU** (falta o caso de igualdade exata prata/ponto = referência) |
| **valor de `ef` trocado em item com `alt` (T4_OFF_TOWERSHIELD_UNDEAD .2)** | **SOBREVIVEU** (testes de catálogo só amostram a espada, prancha, poção e Royal; o meu oráculo pega, os testes não) |

## 10. Casos-limite
Royal (sem foco): nota do dump; foco 0 e base null: `nofocus`; E 31.000 nunca zera o custo (mínimo 14,6% da base); crafts 1.000 e orçamento 1e6: sem NaN/∞; poção: por craft e por unidade; encanto .4 da espada = 12.064; receita alternativa: mesmo foco; Refino em cadeia: cada etapa com a sua base (rota all, Tábua T4 com E 10.000 = 36,05 pontos/unidade, 277 unidades com 10.000).

## 11. Parece erro para um jogador experiente?
Nada numericamente estranho: espada T4 1.286 pontos sem eficiência; 149,99 com 31.000. Pontos do T6 espada .0 = 3.939 (igual ao T4 .2, escala do dump). Observação: a prata por ponto depende dos preços ao vivo (6,41 hoje contra 6,78 do dossiê, que usa preços hipotéticos), o que é esperado.

## 12. UI (servidor Vite em :5221 da worktree, já parado)
Craft: espada T4 E 31.000, referência 5: 149,99 pontos, 66 crafts com 10.000, "Vale usar foco" (6,41 ≥ 5); Royal com nota; poção; Refino Tábua T4 com nota das etapas; Mercado, RRR e Flipper abrem sem NaN/undefined; console sem erros (só avisos a11y antigos "form field sem id"). Viewport: o painel não reduziu abaixo de 500 px (pedido 375): sem rolagem horizontal em 500 px (scrollWidth 485); 375 px exato não verificado.

## Pendências (não bloqueiam)
1. Selo "N valores corrigidos" não conta as correções do foco (itens 6).
2. Cobrir os 3 mutantes sobreviventes com testes (arredondamento do orçamento, igualdade no veredito, `ef` de item com `alt`).
3. `validateCatalog` não checa `ef` (formato/faixa), embora o plano diga "validado pela 067"; sem risco de quebra hoje, mas fechar ou ajustar o texto do plano.
4. Opcional: aviso no cartão quando RRR manual está digitado (economia 0 sem explicação) e mostrar etapas sem dado no Refino.

## Evidências
Oráculo e cenários: `C:/Users/henry/AppData/Local/Temp/qa002/` (`oracle.mjs`, `o2.mjs`, `diff.mjs`, `mut.mjs`, `copy/src/qa/*.test.js`). Divergências do oráculo `ef`: 0; cenários da fórmula: 6.000 com 0 divergências; diferencial: 3.500 combinações e 11.460 receitas com 0 diferenças.
