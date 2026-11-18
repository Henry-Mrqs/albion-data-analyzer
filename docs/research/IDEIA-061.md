# IDEIA-061 — Ordem de compra de material × compra instantânea: economia, idade do dado e spread

## 1. O que faz e por que o jogador usa
Comprar material por **ordem de compra** é mais barato que comprar na venda mais baixa, mas a ordem pode demorar ou nunca encher, e o preço que o app usa (`buy_price_max`) pode ser de horas atrás ou de uma única unidade. O app já tem a chave "usar ordens" (`buyQuote` com `useOrders`: preço de compra máximo × 1,025), porém **não mostra** o quanto se economiza, a idade da ordem de compra nem o tamanho do spread; o jogador escolhe a ordem, o lucro sobe e ele esquece que o preço pode não ser alcançável. A funcionalidade: mostrar lado a lado "instantâneo × ordem", a economia em prata e %, a idade da ordem e um aviso quando o spread é muito grande ou a ordem é velha.

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| B1 | Comprar de uma ordem de venda existente (instantâneo) não paga setup fee nem imposto; criar uma ordem de compra paga setup fee de 2,5% sobre o valor | AUDITORIA-001 §3; albionfreemarket.com/faq (trecho: "Buying from a BUY ORDER, set by you, can offer better prices but incurs a SETUP FEE") | MÉDIA-ALTA |
| B2 | O AODP **não tem profundidade de ordens**: uma ordem de compra pode ser de 1 unidade; uma célula sem ordem de compra pode significar apenas que ninguém visitou o mercado recentemente | AlbionSnipe 2026-07-30 e "buy-order-or-sell-order"; albioncodex (trecho de busca) | MÉDIA |
| B3 | Em dados públicos de 2026 (Europa, 7.637 células de equipamento): spread venda/compra da cidade tem mediana 1,81x; 35% das células com razão ≥ 2x; Caerleon mediana 2,74x; só 17% das células têm alguma ordem de compra. **Estatística de uma ferramenta comercial, metodologia própria** | albionsnipe.com/guides/buy-order-or-sell-order (30/07/2026) | MÉDIA-BAIXA |
| B4 | Ordem de compra não preenchida "sobe com o tempo" (o jogador reajusta o preço, pagando setup a cada atualização); prazo de preenchimento **sem fonte** | albioncodex (trecho); IDEIA-059 | BAIXA |
| B5 | Limiares de aviso (idade da ordem, spread) são **decisão de produto**; o Flipper já usa `fresh()` para ordens; o Craft/Refino não aplica idade ao preço de ordem | código | — |

Fórmulas:
```
custo_instantâneo = sell_price_min
custo_ordem       = buy_price_max × 1,025          // como o app faz; opcional: (buy_price_max + 1) × 1,025 para ficar no topo da fila
economia          = custo_instantâneo − custo_ordem ;  economia% = economia / custo_instantâneo
spread            = sell_price_min / buy_price_max
```

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| `sell_price_min`, `buy_price_max` e as datas | AODP (`stats/prices`) |
| Limiar de idade e de spread | input / decisão de produto (padrão sugerido: idade da ordem > 6 h e spread > 1,5 geram aviso; **sem fonte**, ajustável) |

## 4. Exemplo numérico (caso de teste)
Dados reais (API West, qualidade 1, consulta 2026-11-18 ~01:15 UTC), `T4_METALBAR`:
| Cidade | `sell_price_min` (idade) | `buy_price_max` (idade) | spread |
|---|---|---|---|
| Lymhurst | 267 (2026-11-17 19:25) | 201 (2026-11-17 08:55, **~16 h**) | 267/201 = **1,33** |
| Caerleon | 410 (21:05) | 306 (21:05) | 410/306 = **1,34** |
| Thetford | 248 (19:45) | 217 (05:30, **~20 h**) | **1,14** |
| Fort Sterling | 220 | 0 (sem ordem de compra) | indefinido: ordem não disponível |

Plano: 100 Broadswords em Lymhurst = 1.600 barras brutas, RRR 24,8120% -> compra líquida **1.203,01 barras** (arredondar 1.204). Uso 1.203 para a conta:
1. Instantâneo: 1.203 × 267 = **321.201**.
2. Ordem: 1.203 × 201 × 1,025 = **247.848,08** (preço por barra 206,03).
3. Economia = 73.352,92 (**22,8%**; por barra 60,98).
4. Avisos esperados: idade da ordem de compra ~16 h (> 6 h): "preço de ordem de 16 h atrás"; Fort Sterling: "sem ordem de compra: só instantâneo"; spread 1,33 abaixo do limiar, sem aviso de spread.
5. Teste de lote: 1.203 barras contra volume do dia (ver IDEIA-062): sem aviso (mercado de ~61 mil barras/dia).

## 5. Encaixe no projeto
- `econ.js`: `buyCompare(prices, mid, city)` devolve `{instant, order, savings, spread, orderAgeMs}`; reaproveita `buyQuote` (hoje devolve só um preço).
- Craft/Refino: no plano de compra, colunas "instantâneo", "ordem" e "idade da ordem"; nota "preço de ordem não garantido". O avanço da fila de compra do dia fica em IDEIA-021/059.
- Não duplica IDEIA-021 (preço sugerido de ordem: calcula o preço a listar) nem IDEIA-012 (confiança do preço: selo por célula); aqui é a **comparação de custo com aviso**.

## 6. Fontes
- AODP: `.../stats/prices/T4_METALBAR,...?locations=...&qualities=1` (2026-11-18)
- https://albionsnipe.com/guides/buy-order-or-sell-order (2026-07-30)
- https://albionfreemarket.com/faq (trecho)
- AUDITORIA-001 §3, IDEIA-059

## 7. Confiança
**MÉDIA.** A economia é aritmética exata sobre dados reais; a probabilidade/tempo de preenchimento **não tem fonte** e não deve ser prometida pelo app. O spread de 1,81x/2,74x é estatística de terceiro.
