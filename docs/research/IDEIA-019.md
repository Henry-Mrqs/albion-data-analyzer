# IDEIA-019 — Taxa de bancada: arredondar só no total + valor informado pelo usuário (revisão 2)

**Escopo redefinido (pedido do Gerente, rodada 2):** (1) calcular a taxa de bancada **sem arredondar por unidade**, arredondando só no total do lote; (2) a taxa por 100 de nutrição é **sempre informada pelo usuário**. **Presets por cidade: REJEITADOS** (não existe fonte: a taxa é definida pelo dono de cada bancada e nenhuma API ou página a publica). Os itens NÃO VERIFICADOS (artefato, `amountcrafted` > 1, comida/poção) ficam **fora** do escopo desta ideia.

## 1. O que faz e por que o jogador usa
Hoje `stationFee()` arredonda para inteiro por unidade e o app multiplica pelo nº de crafts, o que erra o total (no refino com taxa baixa chega a 11%). O jogador que craftar em lote vê a taxa errada e, sem perceber, um lucro por lote errado. A funcionalidade: taxa exata, arredondada uma vez no total; campo da taxa (por 100 de nutrição) por cálculo, salvo localmente, sem valor "padrão da cidade".

## 2. Regras e fórmulas

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| T1 | `Nutrição = ItemValue × 0,1125 × nº de itens` | Patch "Lands Awakened" 24/11/2021: "Nutrition Cost = Item Value * 0.1125"; AFM 2026-09-10 | ALTA |
| T2 | `Taxa = Nutrição × taxa_por_100 / 100`; **arredondar só o total** ("full precision, round only the final silver charge") | Patch 2021; AFM 2026-09-10 (atualizado 09-19) | ALTA |
| T3 | `ItemValue` de equipamento comum = Σ(valor do ingrediente × qtd); refinado = valor do próprio refinado (= soma dos ingredientes: T4 prancha 16 = 2×4 + 8). Valores: refinado T4 16, T5 32, T6 64, T7 128, T8 256; .1 ×2, .2 ×4, .3 ×8, .4 ×16 | `items.json` (2026-11-02); AFM 2026-09 | ALTA |
| T4 | Foco e retorno de recursos **não** mudam a taxa | AFM 2026-09-10 | MÉDIA-ALTA |
| T5 | A taxa por 100 de nutrição vai de 0 a 1.000, definida pelo dono; sem tabela pública por cidade | albiondatabase.com (trecho de busca); busca sem resultado de tabela | MÉDIA / **BAIXA** para presets |
| T6 | Fora de escopo, NÃO VERIFICADO: valor do artefato na soma; itens com `amountcrafted` > 1; comida/poção por nutrição própria (`@nutrition` no dump) | AUDITORIA-001 §2 | NÃO VERIFICADO |

Fórmula de produto:
```
fee_lote(itemValue, rate, n) = Math.round(itemValue * 0.1125 * n * rate / 100)   // 1 arredondamento, no total
fee_unit(itemValue, rate)     = itemValue * 0.1125 * rate / 100                    // sem arredondar; só apresentar com casas decimais
```
No plano de refino (`materialPlan`), `fee` de cada etapa é a soma exata de `n_etapa × fee_unit` e arredonda-se apenas ao exibir ou no total do plano.

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| `itemValue` | dump (`vals` do catálogo; soma da receita) |
| `n` | input (nº de crafts, ou unidades de refinado do plano) |
| `rate` | **input do usuário** (campo livre, localStorage); nenhum preset por cidade |

## 4. Casos de teste

| # | Caso | Conta | Esperado (novo) | Código atual |
|---|---|---|---|---|
| 1 | **Broadsword T4.0 × 100, taxa 100** (valor 384) | 384 × 0,1125 × 100 × 100/100 = 4.320 | **4.320** | `round(43,2)=43` × 100 = **4.300** (erro −20, −0,46%) |
| 2 | Broadsword × 1, taxa 100 | 43,2 | exibe **43** (a conta total de 1 craft é 43) | 43 |
| 3 | **Refino de 1.000 pranchas T4, taxa 100** (valor 16) | 16 × 0,1125 × 1.000 × 100/100 = 1.800 | **1.800** | `round(1,8)=2` × 1.000 = **2.000** (erro +200, +11,1%) |
| 4 | **Broadsword × 7, taxa 333** (valor 384) | 384 × 0,1125 × 7 × 3,33 = 1.006,992 | **1.007** | `round(143,856)=144` × 7 = **1.008** (erro +1) |
| 5 | Broadsword × 100, taxa 500 | 21.600 | **21.600** | 21.600 (igual: valor múltiplo exato) |

Passo a passo do caso 1: `384 × 0,1125 = 43,2` (nutrição por item) → × 100 itens = 4.320 de nutrição → × 100/100 = 4.320 de prata.
Passo a passo do caso 3: prancha T4 tem valor 16 (dump); `16 × 0,1125 = 1,8` por prancha; × 1.000 = 1.800 de nutrição; taxa 100/100 = 1 → 1.800.
Passo a passo do caso 4: `384 × 0,1125 = 43,2`; × 7 = 302,4; × 333/100 = 1.006,992 → arredonda no fim → 1.007.

## 5. Encaixe no projeto
- `econ.js`: `stationFee(itemValue, rate, n = 1)` retorna número exato (sem `Math.round`); novo helper de apresentação `fmt`. Em `refineUnit`, `fee` fica sem arredondar; `materialPlan` já multiplica `fee × n` (agora exato).
- `Crafting.jsx` linha `stationFee(recipeValue(rec), +cfg.feePer100 || 0) * crafts` → `stationFee(recipeValue(rec), rate, crafts)`.
- Teste (IDEIA-001): os 5 casos acima.
- Sem mudança de UI além de manter o campo `feePer100` (já existe, padrão 400): **rever o padrão 400**: é um valor do app, não do jogo; sugerir deixar vazio com aviso "informe a taxa da sua bancada" (impede cálculo silenciosamente errado; cruza com IDEIA-005).

## 6. Fontes
- https://devtrackers.gg/albion/p/510446ae-usage-fee-and-crafting-changes-lands-awakened-update (2021-11-24)
- https://albionfreemarket.com/articles/view/how-crafting-station-fees-are-calculated-in-albion-online (2026-09-10, atualizado 2026-09-19)
- ao-bin-dumps `items.json`: https://github.com/ao-data/ao-bin-dumps
- Código: `client/src/lib/econ.js`, `client/src/components/Crafting.jsx` (linha 103)

## 7. Confiança
**ALTA** na fórmula e no arredondamento (duas fontes; AFM dá o mesmo exemplo 4.320 vs 4.300). Presets por cidade rejeitados por falta de fonte. Sem pendência de verificação em jogo para este escopo.
