# IDEIA-036 — Mercado Negro: filtros por tier, encantamento, qualidade e giro

## 1. O que faz e por que o jogador usa
O Mercado Negro (Black Market, Caerleon) é a saída de equipamento mais usada por craftadores. Um item craftado vira "T6 .2, qualidade 2": a ordem de compra e o giro mudam por **tier, encantamento e qualidade**. Funcionalidade: lista do Black Market com filtros (tier, encanto, qualidade, categoria, giro mínimo), mostrando preço, idade do dado e vendas/dia por combinação, e o lucro de craftar para ele. Hoje o app só lê qualidade 1 e trata o Black Market como "só ordem de compra instantânea" (`exits.js`, `flip.js`).

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| B1 | O Black Market compra equipamento (não recurso bruto/refinado nem a maioria dos consumíveis); só ordens de compra "de NPC" | IDEIA-066 X1/X7 (albionsnipe/albioncodex 2026, trechos) | MÉDIA |
| B2 | Qualidade no Black Market: a ordem aceita a qualidade pedida **ou superior**; em cidades é qualidade exata. Fontes comerciais divergem em detalhes | IDEIA-066 X5 | MÉDIA-BAIXA |
| B3 | Imposto e taxa: venda instantânea numa ordem de compra paga só o imposto (4% premium / 8%), sem taxa de criação de 2,5% | `econ.js` `netSale('instant')` | ALTA |
| B4 | IDs do AODP: encantamento = sufixo `@n` (`T4_MAIN_SWORD@1`), qualidade é campo separado 1 a 5; `stats/prices` e `stats/history` aceitam `qualities=1,2,3,4,5`; `locations=Black Market` (com espaço, URL-encoded); `locations=BlackMarket` **não** casou (0 linhas com preço) | chamadas reais (2026-11-19) | ALTA (observado) |
| B5 | O histórico existe por qualidade (séries distintas). `T4_MAIN_SWORD@1`, Black Market, 29 dias: q1 = 29 pontos, q2 = 26, q3 = 21, q4 = 14, q5 = 3. Na janela de 7 dias (12 a 18/11): q1 = **387** vendas em 7 dias com dado (média de preço 15.324), q2 = **234** vendas em 4 dias com dado (15.394), q3 a q5 sem dia na janela (`idle`) | chamada real | ALTA |
| B6 | O Black Market tem giro alto: `T4_MAIN_SWORD` q1 (sem encanto) = 1.853 vendas em 7 dias (264,71/dia) | IDEIA-011 §4 | ALTA (observado) |
| B7 | `parseHistory` ignora qualidade ≠ 1 hoje; `quote()` aceita `quality`; `normalize()` já guarda por qualidade | `history.js`, `market.js` | ALTA |
| B8 | **Divergência de campo (alerta):** no mesmo instante (2026-11-20T02:20Z, API West) `T4_MAIN_SWORD` Black Market q1 tinha `buy_price_max` = **2.607** e `sell_price_min` = **10.854**; o preço médio realizado no histórico (7 dias) é ~10.299 e a média de 29 dias 8.788. O preço realizado bate com o `sell_price_min`, **não** com o `buy_price_max`. Para `T5_MAIN_SWORD` q2: `buy_price_max` 11.376, `sell_price_min` 18.620 | chamada real `stats/prices` sem `locations` | ALTA (como observação); **semântica NÃO VERIFICADA** |

Fórmula (produto): por (item, encanto, qualidade): `liquido = netSale(preço_ref, 'instant', premium)`; `lucro = liquido − custo_craft`; `giro = windowStats(série da qualidade)`; filtro de giro usa os limiares do `liquidity.js` (`none` < 5/dia, `low` < 15/dia, `sparse` < 3 dias com dado).

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| Preço do Black Market por item/encanto/qualidade | API `stats/prices` (campos `buy_price_max`, `sell_price_min`, datas) |
| Vendas/dia por qualidade | API `stats/history?qualities=…` |
| Tier, encanto, categoria | catálogo (`tierOf`, `splitUniq`, `cc`) |
| Custo de craft | `computeCraft` |
| Qualidade desejada, filtros | input do usuário |

## 4. Exemplo numérico (caso de teste, conferível à mão)
Item `T4_MAIN_SWORD` (.0), custo do craft hipotético 3.524,27 (caso IDEIA-002/048), premium (imposto 4%, sem taxa de criação).
- Com o preço **realizado** (média de 7 dias 10.299): líquido = 10.299 × 0,96 = **9.887,04** -> lucro = 9.887,04 − 3.524,27 = **6.362,77**.
- Com o `buy_price_max` observado 2.607: líquido = 2.607 × 0,96 = **2.502,72** -> lucro = **−1.021,55** (prejuízo).
- Sem premium (8%): 10.299 × 0,92 = **9.475,08** -> lucro = **5.950,81**.
- O mesmo item mostra lucro de **+6.362,77** ou **−1.021,55** conforme o campo usado: por isso o ranking do Black Market precisa mostrar **de qual campo** vem o preço e cruzar com o histórico.
- Filtros (sobre `T4_MAIN_SWORD@1`, janela 12 a 18/11): q1 = 387/7 = **55,29/dia** (7 dias com dado: `ok`); q2 = 234/7 = **33,43/dia** (4 dias com dado ≥ 3: `ok`, mas só 4 dias); q3, q4, q5 = `idle` (série existe, nenhum dia na janela, **não** é "sem giro" provado).
- Filtro "giro ≥ 15/dia" deixa q1 e q2; "qualidade ≥ q2" mantém q2 (234) e remove q1.

## 5. O que NÃO é verificado
- NÃO VERIFICADO: qual campo do `stats/prices` representa o que o jogador recebe ao vender no Black Market (B8). A hipótese de que `sell_price_min` é lixo (IDEIA-066 X1, amostra de uma fonte comercial) **conflita** com o histórico realizado deste exemplo; não há como decidir só com dado da API.
- NÃO VERIFICADO: se a ordem do Black Market aceita qualidade igual **ou superior** (B2); é preciso 1 teste em jogo (vender um item q3 numa ordem q1).
- NÃO VERIFICADO: qualidade do item craftado (resultado aleatório; o app não a modela).
- NÃO VERIFICADO: lista oficial de categorias/tiers aceitos pelo Black Market (hipótese T4 a T8, equipamento).
- NÃO VERIFICADO: comportamento em East/Europe.

## 6. Riscos
1. **Preço-ilusão (B8)**: usar `sell_price_min` do BM (como "venda") inflaria o lucro; usar `buy_price_max` pode subestimar. Mitigar: mostrar os dois e o histórico (mediana 7 dias) lado a lado e deixar o usuário escolher a referência; nunca esconder a divergência.
2. **Custo de API**: 5 qualidades × 5 encantos × todos os itens multiplica ids; só sob demanda, por tier/categoria escolhida e `HISTORY_MAX_REQUESTS` = 5 (limite 180 req/min).
3. Séries curtas em q3 a q5 (14 e 3 pontos): `idle`/`sparse` não é "sem giro".
4. `parseHistory`/`normalize` hoje só consideram q1; ao generalizar, não quebrar cache (chave por qualidade) nem os testes de `history`.
5. Dado colaborativo: o preço do BM pode estar velho; usar `ageLabel`/`isFresh` com limite de idade.

## 7. Desenho mínimo
- `history.js`: `parseHistory(rows, {qualities})` (parâmetro; padrão `[1]` mantém o comportamento) e `fetchHistory(..., {qualities})` com a qualidade na chave de cache (`${server}|${cities}|${id}|${q}`).
- `market.js`: nenhuma mudança (`quote(prices, id, 'Black Market', mode, quality)` já suporta qualidade; só `fetchPrices` precisa receber `qualities='1,2,3,4,5'`).
- `lib/blackMarket.js` (puro): `bmRows({prices, history, catalogItems, filters, premium, cost})` -> linhas `{ id, ench, quality, price, priceField, realized, age, perDay, state, profit }`; usa `netSale('instant')`, `windowStats`, `tierOf`, `splitUniq`.
- UI: sub-aba "Mercado Negro" no Flipper/Mercado com filtros (tier, encanto, qualidade, giro mínimo, categoria); coluna "vendas/dia" só nas linhas visíveis (top N).
- `exits.js`/Craft: opção de saída "Mercado Negro (qualidade X)" reutilizando `cityBuyer`; fica ligado à IDEIA-066.
- Auditor (IDEIA-005): campos novos de cfg (qualidade, filtros, referência de preço) com `Var`; variável "qualidade do craft" como `not-considered`.
- Testes: o caso `T4_MAIN_SWORD@1` e as contas de líquido acima como literais.

## 8. Fontes
- Chamadas reais (2026-11-19): `https://west.albion-online-data.com/api/v2/stats/history/T4_MAIN_SWORD@1?locations=Black%20Market&time-scale=24&qualities=1,2,3,4,5` e `.../stats/prices/T4_MAIN_SWORD,T5_MAIN_SWORD,T4_MAIN_SWORD@1?qualities=1,2,3,4,5`
- IDEIA-066 (X1, X5, X7: albionsnipe.com, albioncodex.com, 2026), IDEIA-010, IDEIA-011
- `client/src/lib` (`exits.js`, `flip.js`, `history.js`, `liquidity.js`, `market.js`, `econ.js`)
- Pesquisa na web indisponível neste dossiê: nenhuma fonte oficial (wiki) nova sobre regras do Black Market.

## 9. Confiança
**MÉDIA.** Mecânica de IDs/qualidade e dados de giro foram observados na API real; a semântica dos campos de preço do Black Market e a regra de qualidade "ou superior" não estão confirmadas. Perguntas essenciais: (1) o dono consegue conferir em jogo o que o Black Market paga hoje por um T4 q1 (ordem de ~2.600 ou ~10.800)? (2) aceita-se mostrar os dois preços até haver confirmação?
