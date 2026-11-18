# QA IDEIA-038: cidade de bônus de craft pelo `@craftingcategory`

**VEREDITO: APROVADO** (zero divergências contra o oráculo independente; 0 mutações sobreviventes; 3 observações de baixa gravidade, nenhuma bloqueante)

Branch `feat/IDEIA-038` (3 commits), worktree `.claude/worktrees/agent-abcdb4a235fc2d25a`. Dump: `ao-data/ao-bin-dumps@0483dd97f1581dfaf02eed42f25f5ea2a3cb75e5` (SHA completo confirmado por `gh api`). Nada foi editado na branch; temporários ficaram fora do repositório (scratchpad).

## 1. Funcional

| Verificação | Esperado | Obtido |
|---|---|---|
| `npm run check` (lint + testes + build) | 158 testes, verde | 158 passados, lint limpo, build ok (1474 módulos) |
| `npm test` ×2 | estável | 158/158 nas duas execuções |
| Merge de teste com `master` atual (`git merge-tree`) | sem conflito | sem conflito; árvore mesclada: 182 testes passam, lint limpo |

Observação: a branch saiu de `817846763` (antes da IDEIA-019). Por isso o diferencial de comportamento foi feito contra o **merge-base**; contra a ponta da `master` a taxa de bancada difere em 1 unidade (arredondamento da 019), o que nada tem a ver com a 038.

## 2. Escopo

`git diff --stat master...feat/IDEIA-038`: 13 arquivos, todos do plano: `catalog.json`, `Crafting.jsx`, `RrrCalculator.jsx`, `catalog.js`, `catalog.real.test.js` (novo), `catalog.test.js`, `craftPlan.test.js`, `rrrCalc.js`, `rrrCalc.test.js`, `catalog.fixture.json`, `build-catalog.mjs`, `build-test-fixture.mjs`, `catalog-diff.mjs` (novo).
- NÃO alterados: `econ.js`, `craftPlan.js`, `market.js`, `settings.js`, `docs/*`. Nenhuma fórmula de RRR, imposto ou taxa de bancada mudou.
- `CRAFT_CITY`: zero ocorrências em `client/src` e `scripts`. Não há tabela categoria→cidade escrita à mão. O que existe: `CRAFT_CITIES` (lista de 7 nomes), `CRAFT_CATEGORY_LABELS` (rótulos por categoria, sem cidade) e `CRAFT_CLUSTERS` no build (clusterid→nome da cidade, vindo dos comentários do próprio XML, previsto no plano).
- `RrrCalculator.jsx` não está na lista "Arquivos afetados" do plano, mas é consequência direta da Task 4, passo 4 (categoria da aba RRR) e do pedido de mostrar a categoria do item. Registro como desvio formal menor.

## 3. Oráculo independente (parser próprio, sem importar `client/src/lib` nem o build do projeto)

Parser do XML: leitura linha a linha; a cidade vem do **comentário** `<!--cidade-->` anterior a cada `craftinglocation` (não usa o mapa clusterid do build); só `value=0.15`; erro em duplicata. Parser do `items.json`: todas as classes (simpleitem, equipmentitem, weapon, consumableitem, farmableitem etc.), 6.060 uniquenames.

| Item | Esperado | Obtido |
|---|---|---|
| Itens do catálogo comparados (`cc` e cidade via `cityOf[cc]`) | 2.292, 0 divergências | **2.292 comparados, 0 divergências** |
| Itens com `cc` / sem `cc` | 1.286 / 1.006 | 1.286 / 1.006 |
| `_ROYAL` | 45 sem `cc` | 45, todos sem `cc` |
| Capas de cidade/facção (`CAPEITEM`) | 70 sem `cc` | 70 sem `cc` |
| Equipamento sem `cc` fora dos Royal e capas | 0 | 0 (os 115 sem `cc` entre armas/armaduras/capas/bolsas são exatamente 45 Royal + 70 capas) |
| Artefatos (`artefacts/*`, 440+75+80+80+80+20+70 = 845), recursos brutos (38), consumíveis "other" (8) | sem `cc` | sem `cc` |
| `cityOf` do catálogo × XML no SHA fixado | 33 entradas iguais | 33 iguais |

`cc` por shopcategory (resumo): armas 41 cada (16 tipos) com cc; armaduras/elmos/botas 41 a 47 com cc e 5 sem (os Royal); offhands 31+31+31 = 93 com cc `offhand`; bolsas 6, satchels 5, capa simples 6, poções 41, comida 51; `crafting/refinedresources` 35 com `cc` de refino (`wood`, `rock`, `ore`, `hide`, `fiber`, sem cidade em `cityOf`, igual ao comportamento antigo); `head/other` 1 (`T8_HEAD_CLOTH_PROTOTYPE`, cloth_helmet, Thetford, risco 2 do plano).

## 4. Cidades (`cityOf`, 33 entradas, conferidas contra o XML no SHA fixado)

Thetford: mace, naturestaff, firestaff, leather_armor, **cloth_helmet**. Lymhurst: sword, bow, arcanestaff, leather_helmet, **leather_shoes**. Bridgewatch: crossbow, dagger, cursestaff, plate_armor, **cloth_shoes**. Martlock: axe, quarterstaff, froststaff, plate_shoes, **offhand**. Fort Sterling: hammer, spear, holystaff, plate_helmet, cloth_armor (inalterada). Caerleon: gatherergear, tools, food, knuckles, shapeshifterstaff. Brecilien: **cape, bag, potion**. Tudo igual ao esperado; nada mudou entre o `master` conferido pelo Gerente e o SHA fixado. Refino (oráculo): ore Thetford, fiber Lymhurst, rock Bridgewatch, hide Martlock, wood Fort Sterling, igual ao `REFINING` (não tocado). Rests (Arthur, Merlyn, Morgana) e hideouts ignorados (fora de escopo, IDEIA-025).

## 5. Diferencial do catálogo (merge-base × branch)

| Item | Resultado |
|---|---|
| nº de itens, ordem dos ids | 2.292 = 2.292, mesma ordem |
| `r` (craftáveis) | 2.186 = 2.186 |
| `extra`, `vals`, `encNames` | idênticos byte a byte (JSON) |
| Itens: tudo exceto `cc` | **0 diferenças** (receitas `r`, `er`, `a`, `f`, nomes, valores, ordem das chaves); `cc` adicionado em 1.286 |
| Chaves de topo | `+src`, `+cityOf`; `built` 2026-11-17 → 2026-11-02 (data do commit do dump) |
| Reprodutibilidade | build rodado 2× em cópia descartável com o mesmo cache: SHA-256 da saída idêntico entre si **e** ao `catalog.json` comitado |
| `catalog-diff.mjs` | `itens 2292→2292`, `r 2186→2186`, `cc 0→1286`, `cityOf 0→33` |

## 6. Diferencial de comportamento (`computeCraft`, merge-base × branch, preços fictícios determinísticos)

Itens craftáveis × encantamentos {0, 2 quando existe} = 3.561 itens/encantos × 7 cidades de craft × foco {não, sim} × crafts {1, 7} = **99.708 combinações**. Saídas comparadas bit a bit: `specialty`, `craftRRR`, `totalCost`, `unitCost`, `fee`, `matCost`.

| Grupo | Itens/encantos | Combinações | Resultado |
|---|---|---|---|
| `bonusCity` não mudou | 2.976 | 83.328 | **0 diferenças bit a bit** |
| `bonusCity` mudou | 585 (296 itens base, igual ao plano) | 16.380 | 0 erros: cada nova cidade bate com o oráculo do item 3, e em cada combinação `specialty == (cidadeOráculo == cidade de craft)`; combinações em que `specialty` coincide nas duas versões são idênticas |

Mudanças (por shopcategory, itens/encantos): poções Caerleon→Brecilien 82; capas simples Caerleon→Brecilien 11; bolsas 11 e satchels 10 Caerleon→Brecilien; livros Lymhurst→Martlock 61; tochas Bridgewatch→Martlock 61; botas de couro Bridgewatch→Lymhurst 93; elmos de tecido Lymhurst→Thetford 81; botas de tecido Thetford→Bridgewatch 83; Royal → sem bônus: 10 por categoria × 9 (elmo/armadura/botas de tecido, couro e placa) = 90 itens/encantos (45 itens base); `T8_HEAD_CLOTH_PROTOTYPE` (nenhuma→Thetford) 2. Escudos, espadas, arcos etc. não mudaram (a lista antiga já acertava). Soma de itens base: 41+31+31+6+6+5+47+41+42+45+1 = 296.

Caso numérico do dossiê (§4 caso 3): Thetford, cloth_helmet: PB 33 → RRR 33/133 = 24,8120%; antes (Lymhurst) PB 18 → 18/118 = 15,2542%; diferença 9,56 pontos. A poção T6 em Caerleon agora dá 18/118 (teste novo e conferido na UI: 15,3%).

## 7. Testes alterados (`git diff` merge-base..branch)

| Teste | Mudança | Avaliação |
|---|---|---|
| `craftPlan.test.js` C5 poção | `craftCity` Caerleon → Brecilien, mesmos números (33/133, matCost 2436,0902, fee 1095, total 3531,0902, margem 58,8744) | aprovado pelo Gerente |
| `craftPlan.test.js` novo "038: poção T6 em Caerleon" | `specialty false`, RRR 18/118 | aprovado (regressão) |
| `craftPlan.test.js` (arco, espada) | só assinatura `craftBonusCity(getItem(...))` | ok |
| `catalog.test.js` | 3 asserções antigas por string de categoria trocadas por: 16 casos do dossiê, arco, recurso refinado, `{}`/`undefined`, Royal, `cityOfCategory`, `CRAFT_CITIES`, rótulos, catálogo sem `cityOf` | mais fortes |
| `rrrCalc.test.js` | `category` passa de `'weapons/sword'` para `'sword'` (cc); a asserção `refinedresources` vira `undefined`/`''`; acrescenta Brecilien/bag e `itemCraftInfo` | só assinatura da 023 + novos casos; nenhum enfraquecido |
| `catalog.real.test.js` (novo) | lê `catalog.json` real; 16 casos + caso 17 + tabela de 33 + contagens 2.292/1.286/Royal | novo |

Nenhum valor numérico de teste existente mudou além da poção C5 (mesmos números). Nenhum teste removido sem substituto equivalente ou mais forte.

## 8. Mutações (cópia descartável; baseline 158/158)

| Mutação | Testes que falham | Resultado |
|---|---|---|
| `craftBonusCity` usando a shopcategory (`item.c`) | 10 | morta |
| trocar cidade de `cloth_helmet` (catálogo e fixture) | 3 (real + fixture) | morta |
| mesma troca só no `catalog.json` real | 2 (`catalog.real`) | morta |
| esquecer Brecilien em `CRAFT_CITIES` | 1 | morta |
| esquecer Brecilien no `cityOf` (cape/bag/potion) | 12 | morta |
| item sem `cc` com bônus (fallback pela shopcategory) | 2 | morta |
| item sem `cc` com bônus fixo (`?? 'plate_armor'`) | 4 | morta |
| `specialty` sempre true em `craftRates` | 2 | morta |
| trocar `offhand` Martlock → Bridgewatch | 9 | morta |

**Sobreviventes: 0.**

## 9. Casos-limite

| Caso | Resultado |
|---|---|
| item sem `cc` (Royal, capa de cidade, artefato) | `null`; Craft mostra "Sem cidade de bônus conhecida para este item", interruptor desligado (conferido na UI com `T4_ARMOR_PLATE_ROYAL`) |
| `cc` desconhecido / `cityOf` ausente | `null`, sem erro (teste existente) |
| item ausente do catálogo | `Crafting.jsx` usa `item ? ... : null` (sem erro) |
| `craftBonusCity(undefined)`, `({})` | `null`; `craftBonusCity(null)` também `null` (`item?.cc`) |
| cidade de craft diferente da de bônus | RRR 18/118 (verificado nas 99.708 combinações) |
| Brecilien escolhida para item de outra cidade | `specialty false`, sem bônus (espada em Brecilien: 18/118); incluído nas combinações |
| `craft:cfg` salvo com `craftCity: 'Caerleon'` e poção | não quebra: dica "Brecilien", RRR 15,3%, interruptor desligado (conferido na UI) |
| `rrr:cfg` salvo com `category: 'weapons/sword'` (formato antigo) | não quebra: cai em `sword`; ao escolher item a categoria acompanha o item |
| `craft:cfg` salvo com `specialty: true` | continua forçando o bônus (comportamento preexistente, só some ao trocar item/cidade) |

## 10. Parece erro para um jogador experiente?

Nada de errado nas cidades: espada Lymhurst, armadura de placa Bridgewatch, escudo/livro/tocha Martlock, bolsa/poção Brecilien, Royal sem bônus, elmo de tecido Thetford (conferido na UI e pelo oráculo). Observações (baixa gravidade, não bloqueiam):
1. **Aba RRR, recursos refinados** (ex.: `T6_PLANKS`): mostra "Categoria de craft deste item no jogo: **wood** · sem cidade de bônus · atenção: a categoria selecionada à esquerda é outra". O rótulo é o código cru em inglês (`wood/rock/ore/hide/fiber` não têm rótulo) e "sem cidade de bônus" pode confundir, porque o refino da tábua tem bônus em Fort Sterling (+40%, tratado no modo Refino). 35 itens.
2. **Texto do Craft**: o plano (seção UI) fala "Sem cidade de bônus para este item", e o código mantém "Sem cidade de bônus **conhecida**" (a própria Task 4, passo 2, diz que permanece). Plano internamente inconsistente; comportamento coerente com a Task 4.
3. **Aviso "a categoria selecionada à esquerda é outra"** aparece quando o item guardado e a categoria guardada divergem (ex.: carregar um `rrr:cfg` salvo, ou mudar a categoria à mão). Faz sentido, mas o texto aparece também quando o usuário escolheu a categoria de propósito para simular outro caso. Aceitável.
Também: o cabeçalho do Craft para Royal continua dizendo "Armadura de Placa" (shopcategory), ao lado de "Sem cidade de bônus"; correto pelo dump, mas pode parecer contraditório sem a nota do dossiê.

Plano × dossiê: sem discordância nos números (296 itens, 33 entradas, 1.286 `cc`).

## 11. UI (`npx vite --port 5196` na worktree; servidor parado ao final)

- Craft: espada T6 (Lymhurst), armadura de placa T6 (Bridgewatch (bônus)), escudo T6 (Martlock (bônus)), bolsa T6 (Brecilien (bônus), Brecilien no seletor), poção T6 (Brecilien (bônus)), Royal T4 (sem bônus, interruptor desligado). Seletor com 7 cidades.
- RRR: bolsa "Bolsa · cidade de bônus: Brecilien", Royal "Sem categoria de craft (Royal, capa de cidade, artefato) · sem cidade de bônus", tocha "Mão secundária (escudo, livro, tocha) · cidade de bônus: Martlock".
- Mercado, Refino, Flipper, Craft e RRR abrem; sem erros no console nem exceções.
- Incidente de ambiente: a aba do navegador compartilhado foi redirecionada por outro agente para a produção (`albion-data-iota.vercel.app`) no meio da leitura; descartei as leituras feitas lá (voltavam com poção em Caerleon, que é o código antigo de produção, como esperado), removi as chaves `albion:craft:item`/`albion:craft:cfg` que gravei naquele domínio e repeti as leituras em `localhost:5196`.

## Evidências

Oráculo e comparações: `scratchpad/oracle.mjs`, `cmp.mjs`, `cmp2.mjs`, `qa.test.js` (fora do repositório). Pontos de comparação: merge-base `817846763a7a7b124cffa55f8fab605bf72cf19d`; catálogo comitado e reconstruído com SHA-256 igual.
