# IDEIA-065 — Preço de saída realista: ancorar o preço de venda no histórico quando a oferta é isolada

## 1. O que faz e por que o jogador usa
O lucro do Craft usa o **menor preço de venda atual** da cidade como preço de venda. Se esse preço é de uma única listagem aspiracional (ou fantasma tipo 9.999.999), o lucro mostrado é fantasia. Os dados reais do AODP têm isso: a Broadsword T4 estava listada a 12.000 em Caerleon enquanto o histórico de 7 dias tem mediana 6.309. O Albion Profit Forge chama a solução de "Realistic Revenue" (preço ancorado em histórico ponderado por volume quando a oferta é outlier, marcado na tela) e o AlbionSnipe compara cada listagem com médias de 7 e 30 dias. A funcionalidade: calcular um **preço de saída realista** = menor entre o preço listado e um teto derivado da mediana do histórico, mostrar os dois e usar o realista no lucro (com botão para voltar ao listado). Diferença para IDEIA-012 (confiança do preço: **detecta** e marca) e IDEIA-011 (tendência: **mostra** médias): aqui o valor ancorado **entra no cálculo**.

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| E1 | Histórico diário por cidade: `item_count`, `avg_price` (um ponto/dia, `time-scale=24`) | IDEIA-010 | ALTA |
| E2 | O `avg_price` diário também sofre outlier; preferir **mediana** dos dias (ou média ponderada por `item_count`) | IDEIA-010 L5 | MÉDIA |
| E3 | A ferramenta de referência usa "histórico ponderado por volume" para precificar listagens outlier e marca o resultado | albionprofitforge.com (consulta 2026-11-18) | MÉDIA (descrição de produto) |
| E4 | Fórmula de produto: `P_real = min(P_lista, k × mediana_N dias)`; `k` e `N` **sem fonte** (sugestão: k = 1,25, N = 7), configuráveis | decisão de produto | — |
| E5 | Preços fantasma como 9.999.999 existem em listagens reais | lilmarket.io (03/06/2026); AlbionSnipe | MÉDIA |
| E6 | Se não há histórico (ou menos de 3 dias com dado), não ancorar: mostrar "sem histórico" | decisão de produto | — |

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| `P_lista` (`sell_price_min`) e idade | AODP `stats/prices` |
| `mediana_N` e `item_count` | AODP `stats/history` |
| `k`, `N` | input / padrão |

## 4. Exemplo numérico (caso de teste)
Dados reais (API West, qualidade 1, consulta 2026-11-18). `k = 1,25`, `N = 7`, premium, venda por ordem (k_venda = 0,935).

**Caso 1: `T4_MAIN_SWORD`, Caerleon.** Preço listado `sell_price_min` = 12.000 (2026-11-17 10:45). Histórico de 19 a 25/10 (contagens 7, 8, 21, 4, 6, 7, 23; preços 8.431, 5.381, 2.009, 5.498, 8.316, 10.999, 6.309): mediana = **6.309** (ordenados: 2.009, 5.381, 5.498, 6.309, 8.316, 8.431, 10.999); teto = 1,25 × 6.309 = **7.886,25**.
1. `P_real = min(12.000; 7.886,25) = 7.886,25`.
2. Líquido: listado 12.000 × 0,935 = **11.220**; realista 7.886,25 × 0,935 = **7.373,67**.
3. Com o custo C = 3.524,27 (IDEIA-030): lucro com o listado = **7.695,73**; com o realista = **3.849,40**. A diferença (**3.846,33**, 50%) é lucro fantasma.
(O histórico usado é de 19 a 25/10; o app real deve usar os **últimos** N dias.)

**Caso 2: `T4_ARTEFACT_2H_ARCANESTAFF_HELL`, Caerleon.** `sell_price_min` = 1.840 (2026-11-17 15:00). Histórico dos últimos 14 dias: preços médios diários 602, 602, 602, 1.028, 602, 602, 602, 602, 603, 603, 603, 603, 1.508, 603. Com `N = 7` (últimos 7 valores: 602, 603, 603, 603, 603, 1.508, 603) a mediana é **603** (a média, 732,1, seria distorcida pelo 1.508). Teto = 1,25 × 603 = **753,75**; `P_real = 753,75` contra a listagem de 1.840 (2,44× o teto).

**Caso 3 (sem histórico):** item com menos de 3 dias de dado -> "sem histórico", usa `P_lista` com selo de aviso.

## 5. Encaixe no projeto
- `lib/market.js`: `fetchHistory` (IDEIA-010) + `realisticPrice(listed, hist, {k, n})` puro. Craft: coluna "preço realista" na tabela "onde vender"; `Flipper`: coluna de margem realista para as top-N.
- Selo visual "ancorado" quando `P_real < P_lista` (como o símbolo do Profit Forge). Interage com IDEIA-012, 011, 053.

## 6. Fontes
- https://albionprofitforge.com/ ("Realistic Revenue")
- https://albionsnipe.com/ (médias 7/30 dias) e https://lilmarket.io/guides/albion-crafting-profit-explained/
- AODP: `.../stats/prices/T4_MAIN_SWORD,...` e `.../stats/history/T4_MAIN_SWORD?locations=Caerleon&time-scale=24`; `.../history/T4_ARTEFACT_2H_ARCANESTAFF_HELL?...` (2026-11-18)
- IDEIA-010

## 7. Confiança
**MÉDIA** nos dados e na aritmética; **decisão de produto** em `k` e `N` (sem fonte). O teto pode esconder um aumento legítimo de preço; por isso o app mostra os dois valores e deixa o usuário escolher.
