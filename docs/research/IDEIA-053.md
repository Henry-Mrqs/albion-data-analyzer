# IDEIA-053 — Confiança da rota por histórico: "quantos dos últimos N dias essa rota teria dado lucro"

## 1. O que faz e por que o jogador usa
O Flipper mostra o spread **de agora**. Um spread de hoje pode ser um preço isolado ou um dia atípico; o jogador quer saber se a rota **costuma** dar lucro. O Albion Terminal (listado no diretório do AODP) ordena flips por "confiança", definida como a frequência com que aquela rota exata foi lucrativa nos últimos 30 dias de dados de ordens ("um histórico, não uma previsão"). O app pode obter algo equivalente com a API `history` (média diária por cidade), sem depender de dados de ordens. Diferença para IDEIA-012 (confiança do preço: outlier/dado velho no **preço atual**): aqui o foco é a **recorrência histórica da rota**; diferença para IDEIA-011 (tendência): aqui o resultado é um placar "x de N dias".

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| C1 | Definição da ferramenta de referência: confiança = frequência em que a rota foi lucrativa nos últimos 30 dias; "não é previsão". Também mostra "quanto o mercado de destino absorve por dia" | albionterminal.com (consulta 2026-11-18) | MÉDIA (descrição do site) |
| C2 | A API `history` com `time-scale=24` traz um ponto por dia e cidade: `item_count` (unidades) e `avg_price` | IDEIA-010 (observado na API real) | ALTA |
| C3 | Imposto e setup: premium 4% e 2,5% (AUDITORIA-001 §3) | AUDITORIA-001 | MÉDIA-ALTA |
| C4 | A média diária mistura preços de ordens diferentes; por isso o placar é uma **aproximação** da realidade do flip (não prova que você conseguiria comprar ao preço médio) | observação dos dados | ALTA (como limitação) |
| C5 | O volume do **destino** limita quanto dá para vender (ver L4 da IDEIA-051) | IDEIA-010 | MÉDIA |

Regra de produto (sem fonte de jogo):
```
para cada dia d em N dias com dado nas duas cidades:
   margem_d = avg_destino_d × (1 − t − s) − avg_origem_d        // compra por venda direta (sem setup); venda por ordem
   lucrativo_d = margem_d ≥ lucro_mínimo
placar = (nº de dias lucrativos) / (nº de dias com dado)
```
Exigir mínimo de dias com dado (ex. 7 de N) para exibir o placar; caso contrário "sem histórico".

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| `avg_price`, `item_count` diários por cidade | API `stats/history` (limite 180/min, 300/5 min; usar lote e só nas linhas candidatas) |
| `t`, `s` | Premium e constante |
| `lucro_mínimo`, N | input / padrão de produto |

## 4. Exemplo numérico (caso de teste)
Rota `T4_BAG` Lymhurst -> Caerleon, qualidade 1, dados **reais** (API West, `history`, `time-scale=24`, consulta 2026-11-18), primeiros 14 dias (19/10 a 01/11/2026). Premium, venda por ordem no destino (k = 0,935); compra no preço médio de origem.

| Dia | Lymhurst (un., média) | Caerleon (un., média) | margem = média_Caerleon × 0,935 − média_Lymhurst |
|---|---|---|---|
| 19/10 | 843, 3.229 | 82, 4.403 | **887,8** |
| 20/10 | 869, 3.378 | 61, 4.779 | **1.090,4** |
| 21/10 | 882, 3.266 | 100, 4.445 | **890,1** |
| 22/10 | 885, 3.349 | 141, 4.733 | **1.076,4** |
| 23/10 | 812, 3.347 | 131, 5.751 | **2.030,2** |
| 24/10 | 1.112, 3.185 | 116, 12.621 | **8.615,6** |
| 25/10 | 840, 3.195 | 59, 10.594 | **6.710,4** |
| 26/10 | 945, 3.254 | 65, 7.909 | **4.140,9** |
| 27/10 | 743, 3.311 | 96, 7.961 | **4.132,5** |
| 28/10 | 808, 3.404 | 150, 7.170 | **3.300,0** |
| 29/10 | 949, 3.171 | 149, 7.031 | **3.403,0** |
| 30/10 | 960, 3.484 | 121, 6.940 | **3.004,9** |
| 31/10 | 1.063, 3.579 | 190, 6.722 | **2.706,1** |
| 01/11 | 865, 3.356 | 222, 6.584 | **2.800,0** |

(1) Lucro > 0: **14 de 14** dias = 100%. (2) Com lucro mínimo 1.000: dias com margem ≥ 1.000 = **12 de 14** (87%; os dois de 19/10 e 21/10 ficam abaixo). (3) Média das margens = 44.788,3/14 = **3.199,2**; **mediana = 2.902,5** — o dia 24/10 (Caerleon 12.621 contra ~5.751 no dia anterior) é outlier e distorce a média; o placar deve acompanhar a **mediana**. (4) Absorção: Caerleon vendeu 59 a 222 unidades/dia contra 743 a 1.112 em Lymhurst: o destino é o gargalo.

Nota: o resultado "100%" convive com a indicação de que a série de Caerleon quase dobra de preço em 5 dias: o placar não prevê, só informa.

## 5. Encaixe no projeto
- `lib/market.js`: `fetchHistory` (IDEIA-010) + função pura `routeScore(histOrigem, histDestino, {premium, minProfit, days})`.
- **Flipper**: coluna "Histórico (x/N)" para as top-N linhas (para respeitar o limite de requisições), ordenação por placar.
- Mercado Negro (IDEIA-036): o histórico do Black Market usa a mesma API; verificar disponibilidade.

## 6. Fontes
- https://albionterminal.com/ (definição de confiança e absorção por dia)
- https://www.albion-online-data.com/3rd-party-tools
- AODP `history` real: `https://west.albion-online-data.com/api/v2/stats/history/T4_BAG?locations=Caerleon,Lymhurst&time-scale=24&qualities=1` (2026-11-18)
- IDEIA-010

## 7. Confiança
**MÉDIA.** Os números são reais e refazíveis; o método (média diária como proxy do flip) é aproximação e é decisão de produto. A definição "confiança de 30 dias de ordens" vem do site do Terminal, sem acesso ao método interno.
