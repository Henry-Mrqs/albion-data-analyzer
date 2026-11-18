# IDEIA-062 — Checagem de oferta do material: o plano de compra cabe no mercado?

## 1. O que faz e por que o jogador usa
O plano de compra do app multiplica quantidade × **menor preço de venda** da cidade. Esse preço vale para 1 unidade (o AODP não informa profundidade de ordens). Para materiais comuns isso não importa; para ingredientes raros (artefatos, fichas de favor, barras T8 encantadas) o plano pode ser maior que o que o mercado vende em dias, e o preço real sobe conforme se compra. O jogador esquece de olhar o volume. A funcionalidade: comparar a **quantidade do plano** com o **volume diário** da cidade (API `history`) e avisar "plano = N dias de todo o volume da cidade; o preço real será maior". Também sugere a cidade com maior volume quando a mais barata tem pouco giro.

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| S1 | O AODP não traz profundidade de ordens; `stats/prices` só dá o menor preço de venda e o maior de compra | AlbionSnipe 2026-07-30 (limitações); albioncodex (trecho) | MÉDIA |
| S2 | `stats/history` traz `item_count` por dia e cidade (unidades negociadas segundo os dados recebidos) | IDEIA-010 (observado) | ALTA |
| S3 | `razão = quantidade_do_plano / volume_médio_diário_14d`; a ferramenta avisa quando a razão passa de um limiar. **Limiar = decisão de produto** (sugestão: aviso ≥ 0,25; crítico ≥ 1,0) sem fonte | decisão de produto | — |
| S4 | A média diária do `item_count` e as contagens são de unidades negociadas, **não** da oferta disponível agora; a contagem pode ser sub-registrada (dados colaborativos) | IDEIA-010 L4 | MÉDIA |
| S5 | Um estudo comercial de 2026 usa `score = lucro × √volume × frescor` e filtra mercado fino; sinaliza que mercado "fino" distorce lucro | lilmarket.io guide (03/06/2026) | MÉDIA (fórmula de terceiro) |

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| Quantidade por material no plano | `materialPlan` (já existe) |
| `item_count` diário (14 dias) por material/cidade | API `history` (IDEIA-010) |
| Limiar | input / padrão de produto |

## 4. Exemplo numérico (caso de teste)
Dados reais (API West, qualidade 1, `history time-scale=24`, consulta 2026-11-18); médias de 7 dias nas barras T4 e de 14 dias nas demais linhas:

| Material | Cidade | Volume/dia | Observação |
|---|---|---|---|
| `T4_METALBAR` | Fort Sterling | 132.489 (média de 7 dias: 927.424/7) | comum |
| `T4_METALBAR` | Lymhurst | 60.977 (7 dias: 426.840/7) | comum |
| `T8_METALBAR_LEVEL3@3` | Martlock | **36,36** (509/14) | raro |
| `T8_METALBAR_LEVEL3@3` | Lymhurst | **44,71** (626/14) | raro |
| `T4_ARTEFACT_2H_ARCANESTAFF_HELL` | Caerleon | **4,29** (60/14) | raro |
| `T4_ARTEFACT_2H_ARCANESTAFF_HELL` | Lymhurst | **59,93** (839/14) | |

Casos:
1. 100 Broadswords T4 (IDEIA-001/058): compra líquida 1.203 barras em Fort Sterling: 1.203 / 132.489 = **0,009** dias de volume -> sem aviso.
2. 5 Broadswords T8.3 (16 barras `T8_METALBAR_LEVEL3@3` cada; cidade de bônus; RRR 24,8120%): bruto 80; líquido = 80 × 0,751880 = **60,15** barras; em Martlock: 60,15 / 36,36 = **1,65** dias de todo o volume -> **crítico** (a barra custa ~660.000; o preço real vai subir). Em Lymhurst: 60,15 / 44,71 = **1,35**.
3. 20 cajados `T4_2H_ARCANESTAFF_HELL` (1 artefato cada, sem retorno): 20 artefatos. Em Caerleon (preço médio diário ~603 em 12 dos 14 dias): 20 / 4,29 = **4,66** dias -> crítico; em Lymhurst (preço médio diário ~910-1.130 na maioria dos dias): 20 / 59,93 = **0,33** dias -> aviso. O aviso sugere Lymhurst, mesmo que o preço de tabela de Caerleon seja menor.
Revisor refaz: soma das contagens (60 e 839 nos 14 dias da API; ver tabela) / 14.

## 5. Encaixe no projeto
- `lib/market.js`: usar `fetchHistory` (IDEIA-010) só para os materiais do plano (poucos ids), com o mesmo cache de 3 min.
- `Crafting.jsx` (tabela do plano de compra): coluna "dias de volume" e ícone de aviso. `econ.js`: `supplyRatio(qty, vol14)`.
- Relação: IDEIA-051 (dimensionar o lote) usa a demanda do **produto**; aqui é a **oferta do material**. Sem duplicar IDEIA-032 (estoque).

## 6. Fontes
- AODP history real: `https://west.albion-online-data.com/api/v2/stats/history/T4_METALBAR,T4_LEATHER?locations=Fort Sterling,Lymhurst&time-scale=24` e `.../T4_ARTEFACT_2H_ARCANESTAFF_HELL,T4_ARTEFACT_TOKEN_FAVOR_2,T8_METALBAR_LEVEL3@3?locations=Caerleon,Martlock,Lymhurst&time-scale=24` (2026-11-18)
- https://albionsnipe.com/guides/black-market-flipping (limitações de dados)
- https://lilmarket.io/guides/albion-crafting-profit-explained/ (2026-06-03)
- IDEIA-010

## 7. Confiança
**MÉDIA.** A leitura dos dados é real e refazível; o limiar é decisão de produto e o volume negociado é só uma aproximação da oferta (S4). Se o jogador puder, medir em jogo: ao comprar 20 unidades de um material raro, anotar o preço da 1ª e da 20ª unidade para calibrar o limiar.
