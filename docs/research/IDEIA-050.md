# IDEIA-050 — Transmutação de recursos brutos (calculadora) e correção do catálogo

## 1. O que faz e por que o jogador usa
Na aba "Transmute" de uma estação de refino, **1 recurso bruto + prata -> 1 recurso bruto melhor do mesmo tipo**: subir de tier (T5.2 -> T6.2) ou subir de encanto (T6 -> T6.1). Serve para fabricar o bruto que está caro. A calculadora diz se vale transmutar ou simplesmente comprar o resultado. Ferramentas da comunidade (Albion Profit Forge, Albion Online Refinery, AlbionCrafts, refinestation) têm calculadora de transmutação; o app não tem.

**Bug de catálogo relacionado (ação imediata):** o `items.json` guarda a transmutação como se fosse uma "receita" do recurso bruto (`@craftbuttonlocaoverride=...TRANSMUTE`, `@silver`). O `build-catalog.mjs` importa os recursos brutos (`crafting/resources`) com essa receita e **descarta o `@silver`**; o catálogo atual tem **20** itens `crafting/resources` com `r`, por exemplo `T5_ORE` = `[["T4_ORE",1]]`, `f: 0`. Como `searchItems({onlyCraftable:true})` filtra por `it.r`, o seletor do Craft deve oferecer `T5_ORE` como "craftável" por 1 minério T4, sem os 781 de prata (leitura do código; não executei a UI).

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| R1 | Só recursos **brutos** (madeira, minério, couro bruto, fibra, pedra); 1 unidade de entrada -> 1 de saída. Pedra para em .3 | AO Refinery guia de transmutação (2026-10-27) | MÉDIA |
| R2 | Dois sentidos: **tier up** (mantém o encanto) e **enchant up** (mantém o tier) | AO Refinery; `items.json` (T5_ORE_LEVEL1 tem 2 receitas: de `T4_ORE_LEVEL1` por 1.563 e de `T5_ORE` por 2.000) | ALTA |
| R3 | **Prata base por passo** no dump (`@silver` da receita de transmutação), igual para minério, madeira, couro, fibra: tier up T5 781; T6 1.250; T7 2.500; T8 5.000; enchant up (.0 -> .1): T4 1.500; T4 .1 -> .2 3.000 (T4_WOOD_LEVEL2) etc. | `items.json` (T5_ORE 781, T6_WOOD 1250, T7_ORE 2500, T8_ORE 5000/T8_WOOD 5000, T4_ORE_LEVEL1 1500, T4_WOOD_LEVEL2 3000) | ALTA |
| R4 | Tabela completa (AO Refinery) por tier e encanto: T4 1.500/3.000/6.000/24.000; T5 781 + 2.000/4.000/8.000/32.000; T6 1.250 + 3.000/6.000/19.800/79.200; T7 2.500 + 4.800/15.120/49.896/199.584; T8 5.000 + 14.400/45.360/149.688/748.440 (tier up de recurso encantado custa bem mais; ex. T7 -> T8 a .3 = 155.925) | AO Refinery (2026-10-27) | MÉDIA (bate nos pontos do dump que conferi) |
| R5 | **Custo real = base × fator de preço do servidor**, que não é publicado; calibrar dividindo o custo mostrado em jogo pela base. Outro site mede ×1,156 num servidor | AO Refinery; refinestation.com (trechos) | MÉDIA |
| R6 | A entrada tem `@maxreturnamount="0"` (não há retorno) e `@craftingfocus 0` (não usa foco); sem RRR | `items.json` | ALTA |
| R7 | Divergência: posts antigos de fórum (2023) mostram custos como T4 1.500 e T8 14.400 por passo; posts de 2020 falavam de componente em ouro. O guia de 2026 e o dump não têm ouro | fórum (trecho); AO Refinery | MÉDIA (preferir dump e guia de 2026) |
| R8 | O post oficial do desenvolvedor "Overhaul: Refining and Transmutation" descreve a regra "subir de tier exige o tier anterior e não muita prata"; **403** no meu fetch | albiononline.com/news/overhaul-refining-transmutation | não lido |

Fórmula de produto: `lucro = netSale(preço_saída) − (preço_entrada + base × fator)`, onde `netSale` já existe. Valor "vale transmutar" = `preço_saída_líquido − (entrada + fee) > 0`.

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| Entrada(s) e saída (id do bruto, tier, encanto) | catálogo |
| Prata base por passo | dump (`@silver`) |
| Fator do servidor | **input do usuário** (padrão 1,0, com aviso) |
| Preços de entrada/saída | AODP |

## 4. Exemplo numérico (caso de teste)
Dados do guia (Américas, 2026-10-27, preços como constantes de teste): `T4_ORE` -> `T5_ORE`:
1. Entrada: minério T4 a **113**. Fee base do dump (`T5_ORE`): **781**. Fator 1,0.
2. Saída: minério T5 vende a **393**. Líquido da venda (premium, ordem): 393 × 0,935 = **367,46**.
3. Custo total = 113 + 781 = **894**. Lucro = 367,46 − 894 = **−526,54** (o guia diz "perda de cerca de 500").
4. **Efeito do bug do catálogo:** o Craft atual mostraria custo ≈ 113 (1 × `T4_ORE`, ignorando 781 e, por falta de flag, aplicando RRR) e lucro ≈ +254,46 sem RRR: erro de **781** (o próprio fee).
5. Caso enchant-up do guia: `T4.3` -> `T4.4` ore: entrada 4.392, fee base 24.000, saída 36.621; líquido a 6,5%: 36.621 × 0,935 = 34.240,64; lucro = 34.240,64 − 28.392 = **5.848,64** (guia: "cerca de 5.800").
Teste de dado: `catalog.items.find('T8_ORE').silver === 5000`.

## 5. Encaixe no projeto
- `build-catalog.mjs`: reconhecer `@craftbuttonlocaoverride` contendo `TRANSMUTE` e **separar** esse tipo de receita (campo `tm: {from, silver}`); parar de gravar `r` em `crafting/resources` para não aparecer no Craft.
- Nova aba/seção "Transmutação" ou dentro de Refino; `econ.js`: `transmuteProfit({inPrice, outPrice, baseFee, factor, premium})`.
- Hoje não existe; o bug de catálogo afeta o Craft agora. Depende de IDEIA-039/049 (parser de receitas).

## 6. Fontes
- ao-bin-dumps `items.json` (T5_ORE, T6_WOOD, T7_ORE, T8_ORE, T4_ORE_LEVEL1, T4_WOOD_LEVEL2, T5_ORE_LEVEL1), 2026-11-02
- https://aorefinery.com/guides/transmutation (2026-10-27)
- https://refinestation.com/?tool=refine (trecho de busca)
- https://albiononline.com/news/overhaul-refining-transmutation (403)
- https://forum.albiononline.com/index.php/Thread/187902-new-Transmutation-Cost/ (trecho de busca)

## 7. Confiança
**ALTA** para o dado do dump e para o bug de catálogo (código lido); **MÉDIA** para o fator de servidor e a tabela completa (fonte única de terceiros, mas coerente com 6 pontos do dump). Pedir ao usuário o custo mostrado em jogo para 1 transmutação para calibrar o fator.
