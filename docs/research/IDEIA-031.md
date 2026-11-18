# IDEIA-031 — Teste de estresse: lucro se preço de venda ou de material variar ±N%

## 1. O que faz e por que o jogador usa
Os preços do AODP são colaborativos e voláteis: o preço de venda cai quando mais gente lista, o de material sobe quando se compra em volume. O jogador quer saber **o quanto a margem aguenta**: "se eu vender 10% mais barato, ainda lucro?", "se a barra subir 10%?". A funcionalidade mostra uma tabela de sensibilidade (cenários de −20% a +20% no preço de venda e nos materiais), o **ponto de ruptura** (variação que zera o lucro) e um semáforo. Não é regra de jogo: é recálculo do modelo com preços perturbados. As constantes vêm de AUDITORIA-001.

## 2. Regras e fórmulas

Definições: `P` preço de venda, `G` custo bruto de materiais (antes do RRR), `R` RRR, `F` taxa de bancada, `k = 1 − t − s` (ordem) ou `1 − t` (instantâneo), `u` unidades por craft.

```
custo(dm)     = G × (1 + dm) × (1 − R) + F          // dm = variação dos materiais
receita(dp)   = P × (1 + dp) × k
lucro(dp, dm) = receita(dp) − custo(dm)
queda máx. de preço (ruptura) dp* = custo(0) / (P × k) − 1        // negativa
alta máx. de material  dm* = ((P × k − F) / (1 − R)) / G − 1      // positiva
```
Regras de produto (sem fonte de jogo): (a) a taxa de bancada **não varia** com preço de mercado (depende do ItemValue fixo; AUDITORIA-001 §2); (b) o RRR não muda com o cenário; (c) se `dm` aplica só a materiais comprados, não aplicar a artefatos já fixos se o usuário os informou como preço fixo; (d) mostrar o ruptura em % e em prata; (e) escolher passos de 5%.

Fontes das constantes: imposto/setup, RRR e taxa de bancada = AUDITORIA-001. Confiança: **ALTA** (álgebra) / **MÉDIA-ALTA** (constantes).

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| `G`, `R`, `F`, `P`, `k` | calculados pelo app (preços AODP, RRR, bancada, imposto) |
| `dp`, `dm` | input / grade fixa (±5, 10, 15, 20%) |
| Volatilidade histórica opcional (desvio do `avg_price` em 7 dias) | API history (IDEIA-010/011); permite sugerir o ±N% a partir do dado em vez de chute |

## 4. Exemplo numérico (caso de teste)
Mesmo caso das IDEIA-002/030: Broadsword T4 em Lymhurst. `G` = 16×200 + 8×150 = 4.400; `R` = 33/133 = 0,248120; `F` = 216 (taxa 500); `P` = 4.500; premium, venda por ordem: `k` = 0,935.

Base:
1. Custo = 4.400 × 0,751880 + 216 = 3.308,27 + 216 = **3.524,27**.
2. Receita = 4.500 × 0,935 = **4.207,50**. Lucro = **683,23**.

Variando só o preço de venda (receita = P(1+dp) × 0,935):
| dp | Preço | Receita | Lucro |
|---|---|---|---|
| +5% | 4.725 | 4.417,88 | **893,60** |
| 0 | 4.500 | 4.207,50 | **683,23** |
| −5% | 4.275 | 3.997,13 | **472,85** |
| −10% | 4.050 | 3.786,75 | **262,48** |
| −15% | 3.825 | 3.576,38 | **52,10** |

Variando só os materiais (+10%): G = 4.840 -> líquido = 4.840 × 0,751880 = 3.639,10; custo = 3.855,10; lucro = 4.207,50 − 3.855,10 = **352,40**.

Combinado (preço −10% e materiais +10%): 3.786,75 − 3.855,10 = **−68,35** (prejuízo).

Pontos de ruptura:
- Preço: dp* = 3.524,27 / 4.207,50 − 1 = **−16,24%** (preço mínimo equivalente 3.769,27).
- Material: ((4.207,50 − 216) / 0,751880) / 4.400 − 1 = 5.308,70 / 4.400 − 1 = **+20,65%**.

Teste de RRR (variante opcional "sem especialização", RRR 15,2542%): líquido = 4.400 × 0,847458 = 3.728,81; custo = 3.944,81; lucro = **262,69** (cai 420 só por errar a cidade).

## 5. Encaixe no projeto
- `econ.js`: `stress({G, R, F, P, k, dp, dm})` pura e testável; reutiliza `netSale`, `rrr`.
- **Craft**: painel "Estresse" com grade 2D (dp × dm) e cores; **Refino**: igual; **Flipper**: coluna "ruptura %" (dp* já resume o risco do flip).
- Cruza com IDEIA-012 (confiança do preço) e IDEIA-011 (tendência): usar o desvio histórico para sugerir ±N%.
- Hoje não existe sensibilidade nenhuma; a base de cálculo (`refineUnit`, `netSale`) já é suficiente.

## 6. Fontes
- Código: `client/src/lib/econ.js` (`netSale`, `rrr`, `stationFee`)
- AUDITORIA-001 (§1 RRR, §2 bancada, §3 imposto)
- https://albionfreemarket.com/articles/view/how-resource-return-rate-is-calculated-in-albion-online (exemplo de RRR para o caso base)

## 7. Confiança
**ALTA** na modelagem (algebra verificada à mão acima); **MÉDIA-ALTA** nas constantes. Escolha dos passos ±5/10/15/20% é decisão de produto.
