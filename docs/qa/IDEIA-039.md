# QA IDEIA-039 — "não retorna" por ingrediente (maxreturnamount)

**Veredito: APROVADO**

Branch `feat/IDEIA-039` (HEAD f9062cb), worktree `agent-a47797c3e804acdae`. Nada foi editado na branch; temporários fora do repositório.

## 1. Funcional
| Item | Esperado | Obtido |
|---|---|---|
| `npm run check` (lint + test + build) | 328 testes | 328 passam, lint limpo, build ok (1479 módulos) |
| `npm test` x2 | estável | 328/328 nas duas execuções |

## 2. Escopo
`git diff --stat master...feat/IDEIA-039`: 9 arquivos, todos do plano: `catalog.json`, `Crafting.jsx`, `catalog.js`, 3 testes (`catalog.real`, `catalog`, `craftPlan.returns`), `catalog.fixture.json`, `build-catalog.mjs`, `build-test-fixture.mjs`. Zero mudança em `econ.js`, `market.js`, `settings.js`, `inputRules.js`, `vercel.json`, `vite.config.js`, `docs/*`. RRR, imposto, taxa de bancada, validação 060 e cidades de bônus intactos (confirmado também pelo diferencial: taxa/fee idêntica em todas as combinações).

## 3. Oráculo independente (meu parser, sem o script do projeto)
Fonte: `items.json` do commit 0483dd97 (cache em %TEMP%). Para cada item do catálogo com `r`, li `craftresource/@maxreturnamount` da receita base (primeira `craftingrequirements` sem TRANSMUTE) e de cada `enchantment`, e comparei com o 3º elemento do catálogo da branch (receita efetiva do encanto = `er[n]` ou regra de recursos `_LEVELn`).

| Medida | Esperado | Obtido |
|---|---|---|
| Itens com receita comparados | 2.166 | 2.166 |
| Receitas base | 2.166 | 2.166 |
| Receitas encantadas (efetivas) | — | 5.249 |
| **Ingredientes comparados (base + encantadas)** | — | **16.681** |
| Ocorrências com `maxreturnamount=0` nas receitas base | 1.053 | 1.053 em 868 itens |
| **Divergências** | 0 | **0** |
| Valores de `maxreturnamount` no dump | só "0" ou ausente | só "0" (1.053) e ausente (2.999); nenhum "1" |

Mudaram em relação à master: **153 itens** na receita base. Ingredientes que passam de "retorna" para "não retorna": `CAPE` (70), `QUESTITEM_TOKEN_AVALON` (14), 6 tokens de facção `FACTION_*_TOKEN_1` (10 cada), `QUESTITEM_TOKEN_ROYAL_T4..T8` (9 cada), `*_BP` de capas (5 cada), peças-base Royal `*_SET1`, `ALCHEMY_RARE_*` (poções), `SKILLBOOK_STANDARD` (satchel). Nenhum ingrediente passou de "não retorna" para "retorna" (monotonia verificada com o regex antigo ARTEFACT|ARTIFACT|RUNE|SOUL|RELIC|SHARD contra a regra nova, em todos os itens).

## 4. Diferencial do catálogo (master x branch, 2.292 itens)
- Ordem e ids iguais; `name/cc/cityOf/tm/vals/extra/encNames`, `built`, `src`: **idênticos** (0 diferenças de metadados).
- Receitas `r`/`er` iguais depois de remover o 3º elemento: 0 diferenças. Master não tinha nenhum 3º elemento.
- Artefatos: 715 itens com ingrediente `ARTEFACT/ARTIFACT` mantêm ids e quantidades, todos com `nr` do dump (continuam "não retorna"). 765 itens com fragmento (`RUNE` 170, `SOUL` 145, `RELIC` 190, `SHARD` 260 ocorrências): mesmos ids e quantidades, nenhum marcado no dump, continuam "não retorna" e marcados `unverified` (0 fragmentos com `returnable=true`; 0 `unverified` fora dos 4 tokens).
- Reprodutibilidade: build rodado 2x em cópia descartável: bytes idênticos entre si e com o `catalog.json` commitado.
- Tamanho: 588.712 B -> 591.016 B (+2.304 B, +0,39%); gzip -9: 53.099 B -> 53.137 B (+38 B). Efeito no carregamento: desprezível. URL versionada confirmada no Network: `/data/catalog.json?v=707148ff5c` (200).

## 5. validateCatalog (067)
Catálogo novo: `ok`. Catálogo antigo (master): `ok` (compatível). Sem `items`/`extra`/`vals`/`encNames`/`cityOf`, `items:[]`, `schema:'x'`, `[]`, `null`: rejeitados.

## 6. Consumidores do formato de receita
Todos os leitores de `r`/`er`: `catalog.js recipeOf` (lê `[uniq,count,nr]`; fallback de encanto preserva `nr`), `build-catalog.mjs` (`sameRes` por JSON.stringify compara receitas já com `nr` dos dois lados: ok, e `ruleRes` preserva `nr`), `build-test-fixture.mjs` (`[id]` só), `catalog-diff.mjs` (só conta). `econ.js`, `craftPlan.js`, `refinePlan.js`, `flip.js`, `rrrCalc.js`, componentes só usam `recipeOf().res[].count/returnable`; nenhum desestrutura `[id,count]` cru nem interpreta `nr` como quantidade. `refineUnit` não usa `returnable` (RRR do refino vale para todos), por isso o refino não muda; nenhum recurso refinado tem `nr`. Caminhos de refinados/encantados (`T4_PLANKS_LEVEL1` etc.) cobertos no diferencial.

## 7. Diferencial de comportamento (master x branch, catálogo real, mesmos preços fictícios por hash)
Combinações: **22.485** de `computeCraft` (todos os 2.166 itens craftáveis x todos os encantos 0 a 4 x 3 configs: cidade, especialização, foco, taxa 0/400/1000, RRR manual 0/30/auto, diário, ordens, crafts 1/3/10, premium sim/não, cadeias de refino) + **4.200** de `refineUnit`+`evaluateTier` (todos os refinados, encantos 0 a 4, rotas buy/all/best, RRR 0/36,7/53,9/100%, ordens sim/não) = **26.685**.
- Sem mudança de `nr` (20.289 combinações de Craft): resultado idêntico bit a bit (matCost, fee, totalCost, unitCost, linhas, plano, melhor lucro).
- Com mudança (2.196 combinações, 153 itens distintos): o custo NUNCA diminui (0 casos); a diferença de `matCost` é exatamente `sum(count x crafts x RRR x preço unitário)` das linhas que mudaram (0 desvios acima de 1e-6 relativo); taxa de bancada inalterada. Maior aumento: 92% (capa T7 de facção com RRR 92%... foco+especialização).
- Refino: 4.200 de 4.200 idênticos (0 diferenças).
- Conta à mão (da receita do dump e do RRR da saída): Royal T4 `T4_ARMOR_PLATE_ROYAL` (1 base + 4 tokens, nenhum retorna), 3 crafts, RRR 43,503%: antigo 2.299,24, novo 4.069,66 (batem com o app; subestimava 43,5% do custo naquele RRR). Idem T6 Royal (492,84 -> 872,33). Capa `T4_CAPEITEM_FW_LYMHURST` x10, RRR 24,812%: 23.734,79 -> 31.567,27 (24,81% a menos antes). Poção `T5_POTION_CLEANSE2` (só o `ALCHEMY_RARE_ENT` passa a não retornar): 157.948,23 -> 159.618,13. Escudo `T4_OFF_SHIELD_HELL`: inalterado (artefato já não retornava), 24.520,53 nos dois.
- Caso do dossiê, refeito: Royal base 3000 + token 4x500 = 2000, RRR 24,812%: antigo (3000+2000) x 0,75188 = 3.759,40; novo 5.000 (24,8% a menos antes; teste da branch bate 5000). Divergência plano x dossiê: o plano cita fragmento "500 em vez de 375,94" (50 RUNE x 10 x 0,75188 do dossiê M6); a branch mantém 500 por decisão D-017 (coerente), não é erro.

## 8. Testes alterados
`git diff master...feat/IDEIA-039 -- '*.test.js'`: 100 inserções, 0 remoções, 3 arquivos. Só acréscimos; nenhum teste enfraquecido (a fixture ganhou 7 itens, nenhum teste existente mudou).

## 9. Mutações (cópia descartável, suíte completa)
| Mutação | Resultado |
|---|---|
| Ignorar `nr` (só token) | morta: 11 falhas |
| Ignorar tokens RUNE/SOUL/RELIC/SHARD | morta: 3 falhas |
| Regra invertida (OU por E) | morta: 13 falhas |
| `unverified` sempre falso | morta: 1 falha |
| `nr` lido como quantidade (`count: nr?nr:count`) | morta: 1 falha (Royal) |
| Encanto derivado perde `nr` (fallback de `recipeOf`) | morta: 1 falha |
| Build sem escrever `nr` (catálogo reconstruído) | morta: 11 falhas |
| **Selo "não verificado" removido do `Crafting.jsx`** | **SOBREVIVE** (nenhum teste renderiza o componente; verificado manualmente na UI, selo presente) |
| **Remover `SHARD` de `FRAGMENT_RE`** | **SOBREVIVE** (nenhum teste de `recipeOf` usa fragmento SHARD, 260 ocorrências no catálogo) |
| `unverified` sem o `!nr` | sobrevive, equivalente nos dados (nenhum fragmento tem `nr` no dump) |
| `maxreturnamount=1` contado como nr (`!== undefined` no build) | equivalente: catálogo gerado idêntico byte a byte (dump não tem "1") |

Sobreviventes reais: 2 (selo na UI e token SHARD), ambos de baixo risco; sugestão de teste de `recipeOf` com um id `*_SHARD*` e um teste de renderização do selo.

## 10. Casos-limite
- Catálogo antigo (master, pares de 2 elementos) com o código novo: `recipeOf` não lança em nenhum item x encanto 0 a 4; tudo `returnable` conforme regra; teste da branch cobre também.
- Item sem receita / id inexistente / `undefined`: `recipeOf` devolve `null`.
- Receita de 1 ingrediente: 4.818 combinações sem problema. Quantidade fracionária (15.667 combinações): sem NaN em nenhuma saída.
- RRR 0: quantidades cheias (espada: 16 e 8), sem diferença master x branch. RRR manual 100%: rejeitado pela validação 060 (`rrr-impossible`), cai no automático; 99,5%: aviso `rrr-max`, calcula normalmente; refino com RRR 1.0 idêntico à master.

## 11. Parece erro para um jogador experiente?
Nada que pareça erro. Itens Royal e capas ficaram mais caros (corrige subestimativa); artefatos, bases Royal e fragmentos não retornam; nenhum item ficou mais barato. Observação menor: a aba RRR mostra "· não retorna" sem o qualificador "não verificado" para fragmentos (só a tela Craft tem o selo); inconsistência cosmética, fora do plano.

## 12. UI (vite 5208, aba nova, servidor parado ao final, sem escrita em localStorage de outro host)
- Craft `T4_ARMOR_PLATE_ROYAL`: base 1 e Selo Real 4, ambos "não retorna", sem selo "não verificado".
- `T4_2H_ARCANESTAFF_HELL`: Tábuas 15,0 e Barras 9,0 (com retorno), Orbe Oculto "não retorna", sem selo.
- `T4_ARTEFACT_2H_COMBATSTAFF_MORGANA`: Runa "não retorna · não verificado", qtd 50.
- `T4_MAIN_SWORD` Lymhurst: 12,0 barras e 6,0 couro (1 craft, RRR 24,8%).
- Refino (cadeia de Tábuas T4 calcula custo e lucro) e RRR (24,81%, tabela de receita) abrem e calculam. Network: `data/catalog.json?v=707148ff5c` 200. Console sem erros (só mensagens vite/React DevTools).

Scripts do QA (fora do repo): `...\scratchpad\t039\` (oracle.mjs, diff.mjs, cmp.mjs, harness.test.js, hand.mjs, mut.sh).
