# QA IDEIA-057 — transmutação de recursos brutos sai de `r` e vai para `tm`

**Veredito: APROVADO**

Branch `feat/IDEIA-057` (4 commits sobre master), worktree `.claude/worktrees/agent-a1a847e72668f2f78`. Dump `0483dd97f1581dfaf02eed42f25f5ea2a3cb75e5`. Nada foi editado na branch (worktree limpo no fim); temporários fora do repositório.

## 1. Funcional
| Item | Resultado |
|---|---|
| `npm run check` | lint OK, 9 arquivos, **205 testes passando**, build OK |
| `npm test` x2 | 205/205 nas duas execuções |

## 2. Escopo
`git diff --stat master...feat/IDEIA-057 -- client scripts`: 6 arquivos, exatamente os do plano: `scripts/build-catalog.mjs`, `scripts/build-test-fixture.mjs`, `client/public/data/catalog.json`, `client/src/lib/catalog.real.test.js`, `client/src/lib/catalog.test.js`, `client/src/test/catalog.fixture.json`. `catalog.js`, `econ.js`, `market.js`, `settings.js`, `vercel.json`, `vite.config.js`, `docs/*` intactos; fórmulas de RRR, imposto, taxa e retorno de recursos, e cidades de bônus, sem alteração (nenhum arquivo de código de app mudou).

## 3. Oráculo independente (parser próprio sobre `items.json` do dump em cache, sem o script do projeto)
Parser: recursos `T\d_(WOOD|ORE|HIDE|FIBER|ROCK)(_LEVELn)?` com `craftingrequirements`; transmutação = `@craftbuttonlocaoverride` contendo `TRANSMUTE`. Achados do dump: 133 ids brutos, 115 com requisitos; **todos** os requisitos dos brutos são transmutação (nenhum requisito comum); toda entrada é 1 unidade de 1 ingrediente; T2 e T3 não têm requisitos (nenhum craft nem transmutação).

**25 recursos comparados (T4 a T8 x 5 tipos, base e `_LEVEL1..4`, ordem do dump, prata, ingrediente): 0 divergências.**

| Tabela de prata (nível 0) | T5 | T6 | T7 | T8 | Catálogo |
|---|---|---|---|---|---|
| Madeira / Minério / Couro / Fibra | 781 | 1.250 | 2.500 | 5.000 | igual ao oráculo |
| Pedra | 1.180 | 2.640 | 5.640 | 14.080 | igual ao oráculo (difere da madeira, como o plano previa) |

Casos com 2 requisitos conferidos: `T5_ORE.tm[1]` = `T4_ORE_LEVEL1` 1.563 + `T5_ORE` 2.000; `T8_ROCK.tm[2]` = `T7_ROCK_LEVEL2` 20.480 + `T8_ROCK_LEVEL1` 15.360; `T8_ROCK.tm[3]` = 40.960 + 30.720. (20.480 e 15.360 são a prata, não quantidades; todas as quantidades são 1.) T4 só tem `tm[1..4]` (pedra só `1..3`, sem nível 4 no dump).
Quem perde o quê (master × branch): **20 perdem `r`, `a`, `f`, `er`** (T5 a T8 de WOOD, ROCK, ORE, HIDE, FIBER); **5 perdem só `er`** (T4 dos cinco tipos); mais nenhum item mudou campo algum.

## 4. Diferencial do catálogo (master × branch)
- Itens: 2.292 x 2.292, mesmos ids e mesma ordem. Itens fora dos 25 com `tm`: **0 diferenças** em qualquer campo (nomes, `r`, `er`, `a`, `f`, `cc`, `x`, `w`, `v`, `c`, `t`).
- Nos 25 com `tm`: só mudam `r/a/f/er` (saem) e `tm` (entra); `built`, `src`, `cityOf`, `extra`, `encNames` idênticos.
- `vals`: 1.207 x 1.209 chaves; **só** `T8_ROCK_LEVEL1` = 51,2 e `T8_ROCK_LEVEL2` = 102,4 (D-029).
- Nenhuma receita (`r`/`er`) de nenhum item, em nenhum dos dois catálogos, usa `T8_ROCK_LEVEL1` ou `T8_ROCK_LEVEL2` como ingrediente; só `T8_ROCK.tm` os referencia. Confirma D-029.
- `ingredientValue` master x branch (catálogo real, `Object.is`): **1.311 ids comparados** (todos de `vals` nos dois catálogos, todos os ingredientes de `r`/`er`/`tm`, e as variantes `_LEVEL1..4` dos recursos de regra): **0 diferenças bit a bit**. Os 2 ids novos já valiam 51,2 e 102,4 no fallback.
- `recipeOf` para todos os 2.292 itens x encantos 0..4 (11.460 pares): 100 diferenças = exatamente os 20 recursos x 5 encantos (esperado).
- Reprodutibilidade: build rodado 2x em cópia descartável fora do worktree (mesmo cache): saída 1 = saída 2 = `catalog.json` commitado, byte a byte (`cmp`).

## 5. Diferencial de comportamento (master x branch, preços fictícios, semente fixa)
- **Refino: 4.200 combinações** (5 tipos x T2..T8 x encanto 0..4 x rota buy/all/best x premium sim/não x ordens sim/não x 2 sorteios; buracos de preço 0/25/60%, cidade best/Martlock, RRR e taxa aleatórios). Em cada uma: `refineUnit`, `evaluateTier`, `compareRoutes`, `materialPlan`, `lotFee`, `usedCells`, `refineChainIds` (deep e raso). 
- **Craft: 2.500 sorteios de item craftável (sem brutos) x encanto 0..4**, `computeCraft` (cfg aleatória: cidade, especialização, foco, taxa, RRR, modos de refino buy/refine/best/all, crafts 1..100, ordens, premium), `craftChainIds`, `recipeOf`, `craftBonusCity`, `weightOf`, `nameOf`, `craftCategoryLabel`.
- Total: **51.100 comparações JSON, 0 diferenças** (incluindo Infinity/NaN serializados).

### Busca (`searchItems`, limite sem teto)
Craftáveis: master 2.186, branch 2.166; removidos **exatamente os 20 recursos** (lista abaixo), 0 novos, ordem dos demais preservada. Sem `onlyCraftable` (Mercado) todas as consultas dão lista idêntica nas duas versões.
Removidos: T5/T6/T7/T8 de WOOD, ROCK, ORE, HIDE, FIBER.

| Consulta (onlyCraftable) | master | branch | removidos |
|---|---|---|---|
| madeira, fibra, T5 madeira | 0 | 0 | 0 (os nomes PT-BR são "Troncos"/"Fibra" de nome próprio; já eram 0 na master) |
| minério / minerio | 4 | 0 | 4 brutos |
| t8 minério / t6.2 minério | 1 / 1 | 0 / 0 | 1 / 1 |
| couro, pedra | 22, 10 | 22, 10 | 0 |
| wood / ore | 5 / 41 | 1 / 36 | 4 / 5 (todos brutos) |
| espada, armadura, bolsa, poção | 16, 46, 6, 38 | iguais | 0 |
| tábua, barra, capa, arco, t4 | 7, 7, 76, 46, 421 | iguais | 0 |

Brutos continuam: Mercado acha "T5 Troncos" (Troncos de Cedro T5, Recurso Bruto); Refino usa `T4_WOOD`, `T5_WOOD` etc. como ingredientes (`T5_PLANKS` = `T5_WOOD` + `T4_PLANKS`); 25 itens `r` (T4 a T8 PLANKS etc.) usam brutos `tm` como ingrediente (na master eram 45 = 25 refinados + 20 brutos que se referenciavam).

## 6. Testes alterados
`git diff master...feat/IDEIA-057 -- '*.test.js'`: única linha removida de assert é `2186` → `2166` em `catalog.real.test.js` (+ import ampliado em `catalog.test.js`). O resto são testes novos (transmutação, pedra com prata própria, 25 `tm`, 35 refinados intactos, `er` de refinados, `ingredientValue` de `T8_ROCK_LEVEL1/2`, `searchItems`, nome/peso, cadeia do Refino). Fixture: `T4_WOOD.er` → `tm` e `T5_WOOD` acrescentado. Nenhum teste enfraquecido ou com valor alterado.

## 7. Mutações (cópia descartável; build regenerado a cada uma; 10 mutações, 10 mortas, 0 sobreviventes)
| Mutação | Testes que falham |
|---|---|
| M1 manter `r` nos 20 (não pular requisito de transmutação) | 3 (contagens, "nenhum bruto craftável", 20 saíram) |
| M2 apagar `tm` | 4 |
| M3 prata da pedra = prata do minério (min 781) | 1 (pedra tem tabela própria) |
| M4 só o 1º requisito de transmutação | 2 (`tm` do dump, vals de T8_ROCK_LEVEL1/2) |
| M5 manter `r` + esconder brutos só no filtro da busca | 3 |
| M6 regra de detecção `TRANSMUTE\|REFINE` | 4 (refinados perdem `r`) |
| M7 `tm` fora de `needed` (sem `vals` novos) | 1 (teste D-029) |
| M8 sem `tm` das variantes `_LEVEL` | 3 |
| M9 `searchItems` aceita `!it.r && !it.tm` | 1 (busca `onlyCraftable`) |
| M10 variante com requisito de transmutação lido como `er` | 1 |

## 8. Casos-limite
- Encantados `T5_WOOD_LEVEL1..4`: não são itens do catálogo (só variantes em `tm`); `getItem` = undefined, `recipeOf` = null, `ingredientValue('T5_WOOD_LEVEL2')` = 21,34 (5,34 x 4), nome e peso do base.
- T2/T3 brutos: sem transmutação no dump, sem `tm`, sem `r`; `recipeOf` = null (igual à master).
- Recurso com `tm` como ingrediente (T4_PLANKS usa T4_WOOD): `recipeOf` e Refino normais.
- Item ausente (`NAO_EXISTE`): `recipeOf` null, valor 0, nome = id, sem exceção.
- `refineUnit('T5_WOOD')` na branch: "sem receita" (`missing: ['T5_WOOD']`, custo 0); na master devolvia receita falsa (1 `T4_WOOD`). Só ocorre se o chamador pedir; o Refino só oferece PLANKS/METALBAR/LEATHER/CLOTH/STONEBLOCK.

## 9. Parece erro para um jogador experiente?
- Madeira/minério/couro/fibra/pedra T5+ no Craft: não aparecem mais (correto).
- Tábuas e barras no Craft: master e branch iguais (7 resultados em "tábua", 7 em "barra", mesmas listas); a branch não mudou isso. São craftáveis no catálogo (`r` de refino), como na master; o Refino segue calculando-os.
- Prata de pedra igual à de minério: não; pedra tem tabela própria (1.180 / 2.640 / 5.640 / 14.080), conferida no dump.
- Nenhum outro item sumiu.

## 10. UI (`npx vite --port 5198` na worktree, aba nova, host `localhost:5198` conferido; servidor parado, aba fechada)
Craft: "Minério" e "Madeira" e "T5 Madeira" = "Nenhum item encontrado"; "espada" lista Espadas Largas T3..T8 e Espadas Duplas; "bolsa" lista Bolsas T3..T8. Refino: Tábua T4 (cadeia com Troncos de Pinho/Castanheira/Bétula, custo líquido 174, lucro +197 com preços ao vivo) e Barra de Metal T5 (3x Minério de Titânio + Barra de Aço, custo 672) calculam. RRR e Mercado abrem; Mercado acha "Troncos de Cedro T5 / Recurso Bruto". Console: sem erros. (Valores de preço são ao vivo, portanto a igualdade numérica com a master é a do diferencial da seção 5.)

## Observações
1. Plano x dossiê: dossiê 050 R3 ("prata igual para todos") não vale para pedra; o plano já sinaliza e o dump confirma (Gerente decide a correção do 050).
2. Plano previa `vals` idêntico; o D-029 (2 chaves) é confirmado de forma independente: sem uso em receitas, valor idêntico ao fallback.
3. Nota de usabilidade (fora do escopo, já igual na master): a busca "Madeira" não acha nada porque os itens se chamam "Troncos de ...".

## Evidências
Scripts e saídas em `C:/Users/henry/AppData/Local/Temp/claude/957f91f7a64c930e/6e1f11d4-084e-4248-9930-f6512436786e/scratchpad/` (`oracle.mjs`, `catdiff.mjs`, `ivdiff.mjs`, `behav.mjs`, `mutate.mjs`, `mut/`).
