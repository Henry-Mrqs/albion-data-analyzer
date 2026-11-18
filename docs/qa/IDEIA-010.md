# QA IDEIA-010 — Liquidez (giro) a partir da API `history`

**Veredito: APROVADO** (com observações; nenhuma bloqueante). Atenção de integração: a `master` já avançou (041) e o merge da branch na `master` **conflita em `client/src/components/Crafting.jsx`** (conferido com `git merge-tree`); precisa de rebase por região antes do deploy.

Branch `feat/IDEIA-010`, testada em 2026-11-18 ~13:00 UTC, servidor Américas (West). Nada foi alterado na branch (`git status` limpo ao final). Temporários em `%TEMP%\qa010`.

## 1. Funcional
| Item | Esperado | Obtido |
|---|---|---|
| `npm run check` | 442 testes | lint limpo, 442/442, build ok |
| `npm test` x2 extras | estável | 442/442 nas duas |

## 2. Escopo
`git diff --name-only master...feat/IDEIA-010`: só Crafting.jsx, Flipper.jsx, Giro.jsx, exits.js(+test), history.js(+test, +historyFetch.test), inputRules.js(+2 testes), liquidity.js(+test), market.js. `econ.js`, `craftPlan.js`, `flip.js`, `catalog*`, `refinePlan.js`, `settings.js`, `build-catalog.mjs`, `vercel.json`, `vite.config.js`, `docs/*`, `scripts/`: sem mudança. `market.js`: diff de 2 linhas, só `export` em `chunk` e `request` (429, fila de concorrência 3, cache de 3 min e parser de preços intactos). Testes existentes: só 1 linha alterada (um `import` ganhou `illusoryHint`); o resto são acréscimos.

## 3. Esperado × obtido (dossiê §4 e dados reais)
| Caso | Esperado | Obtido |
|---|---|---|
| T4_BAG: soma / volume | 690 / 98,57 | 690 / 98,5714 (oráculo e branch) |
| T4_BAG mediana | 4.779 (não a média 6.760,86) | 4.779 |
| T4_MAIN_SWORD | 76, 10,86/dia, mediana 6.309, `low` | idem |
| 300 bolsas a 10% / 25% | 30,4 / 12,2 dias | 30,43 / 12,17 |
| 6.000 vs mediana 4.779 | +25,5% | +25,55% |
| Limiares (soma 34/35/36/104/105/106 em 7 dias) | none / low / low / low / ok / ok | idêntico: 4,857 none, 5,000 low, 14,857 low, 15,000 ok |
| Faixas (plano) | `<5` none, `5..<15` low, `>=15` ok, `<3 dias` sparse | idêntico |

## 4. Oráculo independente
Escrito antes de ler o código (parser e estatística próprios, sem importar `client/src/lib`).
- **13.368 séries** aleatórias/borda (dias duplicados, fora de ordem, 23:59:59/00:00:00 UTC, hoje parcial, futuro, zero, 0/1/2/7/8/14/30 pontos, qualidades e cidades misturadas, `BlackMarket`/`Black Market`, timestamps com e sem `Z`) + **6.000** séries densas com volume em torno dos limiares + 6 bordas exatas: **0 divergências** em estado, volume, nº de pontos, mediana e último registro.
- Repetido em 4 fusos (UTC, America/Sao_Paulo, Asia/Tokyo, Pacific/Kiritimati): 0 divergências (o app usa UTC).
- Divergências de especificação (o plano não diz; a branch é mais conservadora, sem risco): `item_count` negativo é descartado (oráculo aceitava); timestamp com offset `+00:00` é descartado (a API usa sem sufixo); `item_count` string/null/NaN/Infinity descartados (igual ao oráculo); `item_count` 0 conta como dia com dado.
- Observação: com dias duplicados na mesma data (impossível na API real) "dias com dados" conta pontos, não datas distintas.

## 5. API real (5 chamadas de `history`, 2 s de intervalo; ver também item 6)
| Chamada | Resultado |
|---|---|
| `T4_MAIN_SWORD` (7 cidades) | 200, 7 linhas, 9 KB, formato `{location,item_id,quality,data:[{item_count,avg_price,timestamp}]}` como no dossiê, timestamp `…T00:00:00` sem Z |
| `T4_POTION_HEAL` | 200, 6 linhas (Mercado Negro sem linha = `nodata`) |
| `T8_ARMOR_PLATE_SET3@4` (sem histórico) | 200, `[]` → tudo `nodata` |
| 3 ids juntos (`T4_MAIN_SWORD,T4_POTION_HEAL,T6_BAG%402`) | 200, 17 linhas, vírgula e `%40` aceitos |
| App, Craft `T6_MAIN_SWORD` | 1 requisição `history` |

Classificação branch × meu oráculo nos dados reais: 7 cidades × 4 respostas, **todas IGUAIS**. Exemplos de hoje: T4_MAIN_SWORD Caerleon 1,71/dia, 3 de 7 dias (`none`); Mercado Negro 83,1/dia, 3 de 7 dias (`ok`); Lymhurst/Bridgewatch/Martlock/Thetford/Fort Sterling `idle` (último 10/11, 04/11, 29/10, 29/10, 27/10); T4_POTION_HEAL Bridgewatch 2.046,6/dia, 7 de 7.

## 6. Carga na API (build de produção, `vite preview`; histórico respondido por mock local com dados reais, exceto a 1ª chamada)
| Tela / ação | Requisições `history` |
|---|---|
| Craft, abrir 1 item | **1** (por item, 1 só em `vite preview`; sem duplicata) |
| Craft, reabrir item dentro de 1 h | 0 (cache) |
| Flipper, abrir aba e varrer o mercado (9 de preços) | **0** de histórico |
| Flipper, "Carregar giro das 30 primeiras" | **1** (30 ids, 2 cidades, URL de 746 caracteres; cap 5 por chamada) |
| Flipper, 2º clique | **0** (cache de 1 h) |
Throttle: com 429 simulado (`window.fetch` substituído, API real não tocada) o Craft mostra "Giro indisponível: Limite de requisições da API atingido. Liberado em 60s.", nada fica em "carregando…", e "Atualizar preços" logo depois mostra "A API de preços pediu uma pausa. Tente de novo em 51s." sem nova requisição: o `blockedUntil` é compartilhado nos dois sentidos. HTML no lugar de JSON: "Giro indisponível: Resposta inválida da API de preços." (texto fala em "preços" mesmo sendo histórico: polimento). 500/JSON truncado passam pelo mesmo `request()` (mensagens existentes). AbortController e sem requisição por re-render conferidos por leitura (`useHistory` usa chave string estável) e por contagem (nenhuma duplicata). StrictMode de dev NÃO foi medido.
Nenhuma varredura do catálogo: ids só do item aberto ou das 30 primeiras linhas. Console: sem erros (apenas avisos de acessibilidade de campos sem label, preexistentes).

## 7. D-034, honestidade da tela (`giroText`/`coverageLabel`, mais a tela do Craft)
| Situação | Tela |
|---|---|
| Sem histórico (`[]`) | "sem histórico" (sem linha de cobertura; D-034 define assim) |
| Sem venda na janela | "sem venda registrada (último 10/11)" + "0 de 7 dias com dados" |
| 1 dia / 2 dias | "dados insuficientes" + "1 de 7" / "2 de 7 dias com dados" |
| 2 dias, volume alto (400+300) | "dados insuficientes" (nunca "sem giro" nem "giro ok") |
| 3 dias, média alta | "31,4/dia" + "3 de 7 dias com dados" |
| 7 de 7 / muito líquido | "10,0/dia" (pouco giro) e "2.014,3/dia" (ok) + "7 de 7 dias com dados" |
Nunca aparece "sem giro"/"pouco giro" com 1 ou 2 dias de dado. Observações (não reprovam; o rótulo diz o que é): (a) com exatamente 3 dias a classificação já é dada: 3 dias de 1 venda = "0,4/dia" em vermelho, e hoje T4_MAIN_SWORD em Caerleon mostra 1,7/dia com 3 de 7 dias; é a decisão de produto `MIN_POINTS_IN_WINDOW = 3` e o contador está visível. (b) "31,4/dia, 3 de 7 dias" é média sobre 7 dias (dia ausente = 0), o que subestima o ritmo dos dias com venda e pode surpreender quem lê "dias para vender o lote 0,3 dias" no Mercado Negro; o cartão explica a regra no texto. Sugestão: mostrar também "no dia com venda" ou a soma. (c) 2 dias com volume enorme caem em "dados insuficientes" (seguro, mas esconde um item líquido).

## 8. DT-004: 8 mutantes de `exits.js` (cópia descartável, nome do teste que falha)
| Mutante | Teste que falha |
|---|---|
| M2 compra 0 aceita | "M2: compra 0 com data fresca não é comprador" |
| M9b `bestReal` ignora stale | "M9b: bestReal pula a saída VELHA mesmo sendo a primeira não ilusória" |
| M11 instantânea buyer=false | "M11: saída instantânea anotada sempre tem comprador" |
| M12 `annotateOptions` muta a entrada | "M12: annotateOptions não muta a entrada (buyer e illusory ausentes na original)" |
| M15 comprador velho com valor maior vence | "M15: comprador VELHO com valor MAIOR que o fresco não vence em bestBuyer" |
| M16 empate: último vence | "M16: empate de preço de compra: vence a primeira cidade na ordem de SELL_CITIES" |
| M18 `annotateOptions` ignora idade da compra | "M18: ordem de venda cuja compra da cidade é VELHA fica ilusória" |
| M19 stale da ordem usa data da compra | "M19: stale da ordem usa a data da ordem, não a da compra" (+1 teste extra) |
Todos os 8 mortos (e M12b e a variante "24 fixo" de `illusoryHint`, morta por "DT-003: illusoryHint … usa o limite recebido"). DT-003: literal 24 de idade só em `DEFAULT_MAX_AGE_H` (Flipper importa; `exits.js`; `illusoryHint`). Restam 2 literais de 24 fora do escopo: `Market.jsx:146` ("Dados com mais de 24 h aparecem em amarelo") e `ageClass` (`h < 24`) em `market.js`; são outra regra (cor da idade), mas valem anotação.

## 9. DT-008 (fmt) e `share`
- `fmt`: `>=`→`>` morto, remoção do `Math.abs` morta, limite 1e16 morto (teste "DT-008: o limite é inclusivo…").
- `share`: vazio→10 sem aviso, 25, 0,5, 100 aceitos; 0, −5, "abc", NaN, "-1" → 10 com erro `share-invalid`; 150, 100,01, Infinity → 100 com aviso `share-max`; idempotente. Mutantes `n<=0`→`n<0`, `n>100`→`>=`, teto removido, padrão 10→20 e vazio com aviso: todos mortos.

## 10. Mutações novas (cópia descartável, suíte completa de `src/lib`)
Rodadas 62 mutações em `liquidity.js` e `history.js` (mais fmt e share, itens 9). **Sobreviveram 5** (todos de baixo risco):
| Mutante | Avaliação |
|---|---|
| L10b `getUTCMonth`→`getMonth` (fuso −11) | teste de dd/mm não cobre virada de mês; o dia (L10) é morto |
| L15b "dias com dado" ignora pontos com `item_count` 0 | spec ambígua (0 conta como dia com dado) |
| L20 `coverageLabel` com "7" fixo | equivalente (a janela é sempre 7) |
| H2 TTL `<`→`<=` | só a borda exata de 1 h; testes usam ±1 ms |
| H13 worker continua após erro | equivalente na prática (`request()` já falha rápido sob `blockedUntil`) |
Mortos, entre outros: janela 6/8, incluir hoje (2 formas), borda inicial, `<`/`<=` em 5, 15 e MIN_POINTS, MIN_POINTS 2 e 4, divisão por dias com dado, UTC→local (janela, dd/mm dia, timestamp), mediana, `idle`/`nodata` virando `none`, contador +1, `daysToSell`, `priceVsMedian`, constantes 5/15 ±1, TTL 2 h/3 min, cache negativo, `force`, chave do cache sem servidor/cidades, cap removido/6, concorrência 3, qualidade, BlackMarket, ordenação, `n<0`, time-scale, qualities, encode de `@` e vírgula, top N, dedupe, `truncated`, `onProgress`.

## 11. Diferencial master × branch
Arquivos de cálculo (`econ`, `craftPlan`, `flip`, `catalog`, `refinePlan`, `targetPrice`, `settings`) são **byte a byte idênticos** ao ponto de partida (`git diff master...`). Mesmo assim, comparei o código da `master` com o da branch em **5.000 combinações** (3.000 de `exitsFor`/`bestBuyer`/`annotateOptions`/`pickExit` com idades 0/12/24/48 h e 2.000 de `flipRows`, 2.941 linhas): **JSON idêntico, 0 diferenças**. `computeCraft` não foi rodado por ser arquivo idêntico.

## 12. Casos-limite
| Caso | Resultado |
|---|---|
| Item sem histórico / API `[]` | `nodata`: "sem histórico", nunca "sem giro" |
| Cidade sem linha na resposta (Mercado Negro da poção) | `nodata` (o giro é por cidade; a tela mostra as cidades das ofertas) |
| HTML / 429 | aviso claro, sem travar em "carregando…" |
| `item_count` string / NaN / negativo / timestamp inválido | pulado, sem exceção |
| Fuso do navegador ≠ UTC | 0 divergências em 4 fusos; dd/mm do "último registro" em UTC (matado L10 em −11) |
| Relógio no futuro/passado | janela se desloca; série existente cai em `idle` (sem exceção) |
| Item encantado (`T6_BAG@2`) | URL com `%40`, aceito pela API; 4 cidades `idle/nodata/none/ok` conferidas |
| 2º clique / reabrir item | cache de 1 h, 0 requisições |

## 13. Parece erro para um jogador experiente?
- Giro 2.014/dia em poção T4 e 83/dia no Mercado Negro da espada: dados reais; o BM soma compras de muita gente, plausível.
- "Sem venda registrada" em cidades de preço listado (ordem de venda "ilusória"): coerente com a 066.
- Risco menor, só por leitura de código, não reproduzido: no Flipper os dados de giro persistem após trocar as cidades de venda; se um `mid` já carregado passar a ter outra cidade de venda não pedida, a célula mostra "sem histórico" (ausente = não pedido é tratado como `nodata`). Uma busca nova resolve.
- Mensagem de erro do histórico cita "API de preços" (polimento).
- Tabela "Onde vender" larga: a coluna Giro fica fora da tela em ~1250 px e exige rolagem horizontal.

## 14. UI
Rodado `vite` (5212) e `vite preview` (5213), ambos parados ao final. Craft (3 itens: T6_MAIN_SWORD real; T4_MAIN_SWORD e T4_POTION_HEAL com dados reais servidos localmente), Flipper (varredura, 2 cliques), console sem erros; Mercado, Refino e RRR não alterados (arquivos idênticos) e Mercado abriu normalmente. O navegador embutido recusou a navegação; usei o chrome-devtools em aba nova.

## Evidências
`C:\Users\henry\AppData\Local\Temp\qa010\` (oracle.mjs, diff.qa.mjs, dense.qa.mjs, real*.json, mut-*.log/json, diff-master.txt).
