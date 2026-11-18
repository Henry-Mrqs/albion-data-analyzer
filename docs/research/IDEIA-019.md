# IDEIA-019 — Taxa de bancada: presets por cidade e auditoria da fórmula

## 1. O que faz e por que o jogador usa
Cada bancada de craft/refino cobra uma **taxa de uso**: silver por 100 de nutrição consumida. O dono da bancada define o valor. O jogador esquece de incluir esse custo, ou usa um valor que não é o da cidade em que vai craftar. A funcionalidade: (a) fórmula auditada e exibida ("como foi calculado"), (b) campo de taxa **por cidade** salvo localmente (preset do usuário), (c) mostrar a taxa como parte do custo por unidade e como % do lucro, e (d) comparar a taxa entre cidades. O resultado da auditoria já está em AUDITORIA-001 §2; este dossiê traz a regra completa e os casos de teste.

## 2. Regras de negócio e fórmulas

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| T1 | `Nutrição consumida = ItemValue × 0,1125` (por item/craft) | Patch "Lands Awakened", 24/11/2021: "Nutrition Cost = Item Value * 0.1125" | ALTA |
| T2 | `Taxa (prata) = Nutrição × taxa_por_100_nutrição / 100` | Mesmo patch ("amount of Silver per 100 Nutrition consumed"); AFM 10/09/2026 | ALTA |
| T3 | A taxa antiga em % foi convertida: 1% antigo = 44,44 no sistema novo | Patch 2021 | ALTA (histórico) |
| T4 | `ItemValue` de equipamento = Σ (ItemValue do ingrediente × quantidade). Para o Broadsword T4: (16×16)+(8×16) = 384. Preço de mercado não entra | AFM 2026-09; albionmarket.gg 2026-07 ("soma de valor x qtd, dividida pela quantidade produzida") | ALTA (equipamento comum) |
| T5 | `ItemValue` dos recursos dobra por tier e por encanto (T2 4 → hoje: refinado T2 4, T3 8, T4 16, T5 32, T6 64, T7 128, T8 256; .1 = ×2, .2 = ×4, .3 = ×8, .4 = ×16) | `items.json` (dump 2026-11-02); patch 2021 ("double with each Tier or Enchantment") | ALTA |
| T6 | Valor do refino de 1 unidade = `ItemValue` do refinado (= soma dos ingredientes: T4 prancha 16 = 2×4 + 8) | `items.json` | ALTA |
| T7 | Taxa **não** é reduzida por foco nem por retorno de recursos | AFM 2026-09-10 (100 Broadswords: 21.600 com ou sem foco) | MÉDIA-ALTA |
| T8 | Arredondar **só no total**: `taxa_lote = round(ItemValue × 0,1125 × n × taxa/100)` | AFM 2026-09-10 | MÉDIA |
| T9 | Faixa da taxa: 0 a 1.000 por 100 de nutrição, fixada pelo dono da bancada | albiondatabase.com (calculadora) | MÉDIA |
| T10 | T1 e T2 são isentos de taxa | AFM 2026-09-10 | MÉDIA |
| T11 | Valor de **artefato** na soma (para itens de artefato): `items.json` dá `@itemvalue` ao artefato (T4_ARTEFACT_2H_ARCANESTAFF_HELL = 384), mas nenhuma fonte diz se ele compõe o ItemValue do item | — | **NÃO VERIFICADO** |
| T12 | Itens com `amountcrafted` > 1 (poções 5 ou 10, comida 10): albionmarket.gg diz "dividida pela quantidade produzida"; AFM diz só "itens craftados" | divergência | **NÃO VERIFICADO** |
| T13 | Comida/poção: patch 2021 diz que o **foco** desses itens usa a nutrição dos ingredientes; o dump tem `@nutrition` em comidas (T4_MEAL_SALAD 252) | patch 2021; dump | **NÃO VERIFICADO** para a taxa |
| T14 | Custo fixo em prata na receita: não existe para equipamento e refinados (`@silver="0"`); existe em itens de ilha/laboradores/mapas | `items.json` | ALTA |
| T15 | **Presets por cidade: não existe fonte.** A taxa é definida pelo dono da bancada e muda. Nenhuma API (AODP incluso) a publica | busca em wiki/AFM/albiondatabase sem tabela de valores | **BAIXA**: o preset só pode ser do usuário (padrão 0 ou valor digitado), sem dados "oficiais" |

**Bug de arredondamento no código atual** (`econ.js`): `stationFee()` faz `Math.round` por unidade e `Crafting.jsx` multiplica por `crafts` (`unit.fee * n` no plano de refino). Correto: arredondar uma vez no total. Caso: valor 384, taxa 100: 43,2 por unidade; 100 crafts = 4.320 (correto) vs 4.300 (código).

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| ItemValue por ingrediente | dump (`vals` no catálogo) |
| Quantidades e rendimento (`amountcrafted`) | dump (`a` no catálogo) |
| Taxa por 100 de nutrição | **input do usuário**, por cidade (localStorage) |
| nº de crafts | input |

## 4. Exemplo numérico (caso de teste)
Todos com 0,1125 e `taxa/100`; valores de ItemValue do dump.

| Caso | Valor | Taxa/100 | Nutrição | Taxa exata | Esperado (total) |
|---|---|---|---|---|---|
| Broadsword T4.0 ×1 | 384 | 100 | 43,2 | 43,2 | **43,2** (exibe 43) |
| Broadsword ×1 | 384 | 500 | 43,2 | 216 | **216** |
| Broadsword ×1 | 384 | 1000 | 43,2 | 432 | **432** |
| Broadsword ×100 | 384 | 100 | 4.320 | 4.320 | **4.320** (código atual: 4.300) |
| Broadsword ×100 | 384 | 500 | 4.320 | 21.600 | **21.600** |
| Prancha T4 (refino ×1) | 16 | 500 | 1,8 | 9 | **9** |
| Prancha T8 ×1 | 256 | 500 | 28,8 | 144 | **144** |
| Barra T4 .3 ×1 | 128 | 500 | 14,4 | 72 | **72** |
| Cajado arcano T4 de artefato (20 prancha + 12 barra) sem artefato | 512 | 500 | 57,6 | 288 | só se o artefato não contar |
| Mesmo, com artefato (384) | 896 | 500 | 100,8 | 504 | só se o artefato contar (**é o que o código faz hoje**) |

Passo a passo do primeiro caso: 16×16 + 8×16 = 384 -> 384 × 0,1125 = 43,2 -> 43,2 × (100/100) = 43,2.

## 5. Encaixe no projeto
- `econ.js`: `stationFee(itemValue, rate, units = 1)` sem arredondar até o final; `Math.round` apenas na apresentação. Atualizar `refineUnit` e `materialPlan` para carregar `fee` como número real.
- `Crafting.jsx`: já usa `feePer100` único; trocar por mapa `{cidade: taxa}` salvo em `albion:*`, com a cidade de craft escolhendo a taxa. `Refining.jsx` idem.
- Mostrar "taxa por unidade" e "taxa/lucro %". Interage com IDEIA-005 (auditor) e IDEIA-034 (como foi calculado).
- Pendente de verificação em jogo (T11, T12, T13) antes de mexer em itens de artefato, poção e comida.

## 6. Fontes
- https://devtrackers.gg/albion/p/510446ae-usage-fee-and-crafting-changes-lands-awakened-update (2021-11-24)
- https://albionfreemarket.com/articles/view/how-crafting-station-fees-are-calculated-in-albion-online (2026-09-10, atualizado 2026-09-19)
- https://albionmarket.gg/guides/crafting-and-refining-profit (2026-07-11)
- https://www.albiondatabase.com/tools/crafting-calculator (403 no fetch; trecho de busca: exemplo 384 / 500 / 216)
- ao-bin-dumps `items.json`: https://github.com/ao-data/ao-bin-dumps

## 7. Confiança
**ALTA** na fórmula e em T4/T5/T6 (3 fontes independentes e coerência numérica no dump). **BAIXA** em presets por cidade (inexistem fontes). **NÃO VERIFICADO** em artefato, rendimento > 1 e consumíveis. Pedir ao usuário: tooltip "Item Value" e taxa mostrada na janela de craft para (1) um item de artefato, (2) uma poção; com isso fecha-se T11 a T13.
