# IDEIA-013 — Ranking "o que craftar hoje" (varre todos os itens craftáveis por lucro, margem ou lucro/foco)

## 1. O que faz e por que o jogador usa
Hoje o jogador escolhe o item e o app calcula (Craft). A pergunta real do dia é a inversa: "qual item vale a pena craftar agora?". O ranking calcula, para cada item craftável do catálogo, custo, melhor saída e lucro, e ordena por **lucro**, **margem** ou **prata por ponto de foco**. Não há regra de jogo nova: é uma varredura que reaproveita as contas existentes (`computeCraft`) sobre o catálogo inteiro, mais filtros contra falsos positivos (preço velho, saída ilusória, sem giro).

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| R1 | Lucro por craft = líquido da venda × unidades − (materiais líquidos de RRR + taxa de bancada + extras). Líquido: ordem de venda `P×(1−imposto−2,5%)`; venda instantânea `P×(1−imposto)`; imposto 4% premium / 8% sem premium | `econ.js` (`netSale`, `salesTax`, `SETUP_FEE`); AUDITORIA-001 | ALTA |
| R2 | RRR = PB/(100+PB); foco soma +59 ao PB; custo base de foco por receita/encanto = `@craftingfocus` do dump; custo real = base × 0,5^(eficiência/10000) | AUDITORIA-001; IDEIA-002 §2 (F1–F3) | MÉDIA-ALTA |
| R3 | Prata por foco (definição de produto): `(custo_sem_foco − custo_com_foco) / custo_real_de_foco`. É o ganho **marginal** do foco, não o lucro total | IDEIA-002 §2 | produto |
| R4 | Orçamento diário de foco: Premium dá 10.000/dia, teto de 30.000 acumulado. Sem premium não há fonte neste dossiê | IDEIA-002 F6 | MÉDIA |
| R5 | Saída "ilusória" (ordem de venda sem ordem de compra visível) e dado velho não podem liderar o ranking: usar `pickExit().bestReal` (`exits.js`), com `maxAgeH` padrão 24 h | `exits.js`, IDEIA-066 | produto |
| R6 | Giro: dado de `stats/history` (vendas/dia); `none` < 5/dia, `low` < 15/dia, `sparse` (< 3 dias com dado) não classifica | `liquidity.js` (D-034), IDEIA-010 | produto |
| R7 | Dados da API são colaborativos: o preço de um item pouco negociado pode ser um outlier e inflar o topo do ranking | IDEIA-010 L4/L5 | MÉDIA |
| R8 | Limites da API AODP: 180 req/min e 300 req/5 min por IP; `Throttled` com horário de reset | IDEIA-010 L6 (página oficial da API, trecho) | MÉDIA |

Fórmulas do ranking:
```
lucro_craft(i)   = net(i) − custo(i)                   // custo(i) por unidade = totalCost/units
margem(i)        = lucro_craft / custo × 100
prata_foco(i)    = (custo_sem − custo_com) / foco_real(i)   // só com foco do dump (focusOf) e eficiência informada
lucro_dia(i)     = lucro_craft × min(crafts_por_foco_disponivel, capacidade_de_giro)  // opcional
```
Ordenação: chave escolhida; empate por lucro. Itens sem foco no dump (`focusOf = null`) ficam **fora** do ranking por prata/foco (nunca com 0).

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| Receita, valor, categoria, foco por encanto | catálogo (dump ao-bin-dumps, commit 0483dd97f1581dfaf02eed42f25f5ea2a3cb75e5): `recipeOf`, `focusOf` |
| Preços (compra de materiais, venda do item) | API AODP `stats/prices` via `fetchPrices` |
| Giro | API AODP `stats/history` (só do top N) |
| Cidade de craft, RRR, foco ligado, eficiência, taxa de bancada, premium, idade máxima, filtros | input do usuário (mesmos campos do Craft) |

## 4. Exemplo numérico (caso de teste, conferível à mão)
Premium (k = 0,935 em venda por ordem), taxa de bancada 216/craft, 1 craft, 1 unidade.
- **A** = Broadsword T4 Lymhurst, preços hipotéticos de IDEIA-002/048: venda 4.500, líquido = 4.500×0,935 = **4.207,50**. Sem foco: custo 3.308,27 + 216 = 3.524,27 -> lucro **683,23**, margem 683,23/3.524,27 = **19,39%**. Com foco: 2.291,67 + 216 = 2.507,67 -> lucro **1.699,83**, margem **67,8%**. Foco real (eficiência 31.000) = 1.286×0,5^3,1 = **149,99** -> prata/foco = 1.016,60/149,99 = **6,78**.
- **B** (hipotético): líquido 1.300, custo sem foco 1.000 (lucro 300, margem 30%), custo com foco 900, foco real 20 -> prata/foco = 100/20 = **5,0**. Volume 40/dia.
- **C** (hipotético): líquido 11.000, custo 10.000 (lucro 1.000, margem 10%), sem foco no dump. Volume 2/dia.

| Ordenar por | 1º | 2º | 3º |
|---|---|---|---|
| lucro | C (1.000) | A (683,23) | B (300) |
| margem | B (30%) | A (19,39%) | C (10%) |
| prata/foco | A (6,78) | B (5,0) | C fora (sem foco) |
| lucro, com filtro "giro ≥ 5/dia" | A | B | (C sai: 2/dia = `none`) |

Orçamento de foco 9.000/dia no item A: 9.000/149,99 = 60,0 -> **60 crafts** (60×149,99 = 8.999,40 ≤ 9.000); ganho marginal do dia = 60 × 1.016,60 = **60.996**.

Tamanho da varredura (estimativa): o catálogo tem 2.166 itens com receita (`catalog.json`); com `MAX_URL` = 1.700 e ids de ~20 caracteres cabem ~80 ids por requisição. Só o encanto .0 + materiais (~2.500 ids) = ~31 requisições; com .1 a .4 (~10.800 ids) = ~135 requisições, quase metade do teto de 300 por 5 min, e concorrência 3 do `market.js`. Cálculo aproximado; **não medido**.

## 5. O que NÃO é verificado
- NÃO VERIFICADO: número real de requisições e tempo da varredura completa (estimativa acima); custo de CPU de `computeCraft` em ~2.200 itens (refino em cadeia é o ponto caro).
- NÃO VERIFICADO: se o preço de venda do tier mais alto (T8, pouco negociado) tem dado fresco suficiente na API; a tendência é o topo do ranking ser dominado por outliers (R7).
- NÃO VERIFICADO: fonte oficial para o limite de foco sem premium.
- Eficiência de foco por item (F4 de IDEIA-002) vem de uma fonte (AFM); o ranking por prata/foco herda essa confiança MÉDIA.

## 6. Riscos
1. **Lucro fantasma**: varrer o catálogo sem filtro lista no topo itens com preço velho/único. Mitigar: só linhas com todos os materiais com preço e saída `bestReal`; mostrar idade do dado.
2. **Rate limit**: varredura cheia pode disparar `Throttled`; reutilizar `blockedUntil` do `market.js` e escopo por categoria/tier (o usuário escolhe o recorte antes de varrer).
3. **Giro só do top N** (`HISTORY_TOP_N` = 30, `HISTORY_MAX_REQUESTS` = 5): o ranking por lucro mostra primeiro, o giro valida depois; nunca esconder o item por falta de histórico (`nodata` ≠ sem giro).
4. Ranking por margem premia itens baratos de lucro absoluto minúsculo; padrão sugerido: lucro, com piso de lucro e de margem (como o Flipper).
5. Prata/foco é marginal (R3): não comparar com lucro total.

## 7. Desenho mínimo (reaproveitando o código)
- `lib/rank.js` (puro): `rankCrafts({ items, prices, cfg, premium, now, key })` chama `computeCraft` por item/encanto (as mesmas regras do Craft) e `pickExit` (`exits.js`); devolve linhas `{ id, ench, cost, net, profit, margin, silverPerFocus, exit, ready }`. Filtros iguais aos do `flipRows` (`minProfit`, `minMargin`, `maxAge`, orçamento). Sem rede nem React.
- Preços: `fetchPrices(ids)` em lotes já limitados (`chunk`, `CONCURRENCY`); recorte obrigatório (categoria de craft, tier, encanto) antes da varredura; botão "varrer" (nada automático).
- Giro: `fetchHistory(topIds)` + `windowStats` (`history.js`, `liquidity.js`) só para `HISTORY_TOP_N`.
- Foco: `focusOf(base, ench)` do catálogo; sem dado = fora do ranking de prata/foco.
- Tela: aba "Ranking"; abrir a linha leva ao Craft com o item (reutiliza a tela existente).
- Auditor (IDEIA-005): campos novos de cfg (chave de ordenação, recorte, pisos) exigem `Var` ou `ignoredFields` no mesmo commit (regra do `registry.js`); variáveis que o ranking NÃO modela entram como `not-considered`.
- Testes: os 3 itens A/B/C acima viram fixture (ordem por lucro/margem/prata-foco e o filtro de giro).

## 8. Fontes
- `client/src/lib` (`econ.js`, `craftPlan.js`, `exits.js`, `flip.js`, `liquidity.js`, `history.js`, `market.js`, `catalog.js`)
- ao-bin-dumps commit 0483dd97f1581dfaf02eed42f25f5ea2a3cb75e5 (`items.json`, `@craftingfocus`)
- AODP: https://west.albion-online-data.com/api/v2/stats/prices/{ids} e `.../stats/history/{ids}`
- Dossiês: AUDITORIA-001, IDEIA-002, IDEIA-010, IDEIA-048, IDEIA-066

## 9. Confiança
**MÉDIA-ALTA** nas fórmulas (herdadas e conferidas por casos de teste dos dossiês anteriores); **MÉDIA** no desempenho da varredura (não medido). Pergunta de produto pendente: o padrão é ordenar por lucro/craft ou por lucro/dia (precisa de giro)?
