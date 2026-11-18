# IDEIA-051 — Dimensionar o lote: quantos crafts fazer (limites de foco, demanda, materiais e prata)

## 1. O que faz e por que o jogador usa
O lucro por craft não diz quantos crafts fazer. O lote é limitado por **foco do dia**, **demanda** (itens vendidos por dia no destino), **materiais em mãos** e **prata disponível**. Sem isso o jogador craftea 200 unidades de um item que vende 10 por dia, ou gasta o foco inteiro num item de baixo ganho. A Albion Free Market calcula "Runs" automaticamente a partir de vendas diárias, foco disponível, capacidade da montaria ou materiais em mãos. A funcionalidade: um campo "nº de crafts sugerido" com o fator limitante explicado.

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| L1 | A AFM define `Runs` "manualmente ou calculados a partir de vendas diárias, foco disponível, capacidade da montaria ou materiais em mãos" | albionfreemarket.com/crafting (consulta 2026-11-18) | MÉDIA (comportamento da ferramenta) |
| L2 | Limite de foco: `n_foco = floor(foco_disponível / foco_por_craft)`; `foco_por_craft = base × 0,5^(eficiência/10000)` | IDEIA-002 (AFM 2026-07-21; dump) | MÉDIA-ALTA |
| L3 | Foco disponível: Premium 10.000/dia, teto 30.000 | IDEIA-002 (cheatsheet 2017; AFM) | MÉDIA |
| L4 | Limite de demanda: `n_demanda = floor(volume_dia × dias × fatia / unidades_por_craft)`, com `volume_dia` de `stats/history` | IDEIA-010 (dado da API real) | MÉDIA |
| L5 | Limite de materiais: consumo esperado por craft = `Σ qtd × (1 − RRR)` dos ingredientes retornáveis + `qtd` dos não retornáveis; `n_mat = floor(em_mãos / consumo)` (aproximação: o jogo sorteia o retorno; a AFM usa esperança) | AFM 2026-07-17 (usa retorno esperado) | MÉDIA |
| L6 | Limite de prata: `n_prata = floor(orçamento / custo_por_craft)` | álgebra | ALTA |
| L7 | Limite de peso: ver IDEIA-017 (peso e transporte); não duplicar aqui | backlog | — |

`n = min(n_foco*, n_demanda, n_mat, n_prata)` (foco só entra se "usar foco" ligado). Mostrar **qual limite manda** ("limitado por prata").

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| foco base, eficiência | dump + input (IDEIA-002) |
| foco disponível | input |
| volume/dia | API history (IDEIA-010) |
| fatia do mercado, dias de venda | input (padrão 20%, 3 dias: **escolha de produto**) |
| materiais em mãos, orçamento | input |
| custo por craft | cálculo do app |

## 4. Exemplo numérico (caso de teste)
Broadsword T4 em Lymhurst, foco ligado, spec 100/100 (eficiência 31.000), custo por craft C = 3.524,27 (sem foco; com foco o app recalcula, usar aqui o valor sem foco só para o exemplo).
1. `foco_por_craft = 1.286 × 0,5^3,1 = 149,99`; foco disponível 10.000 -> `n_foco = floor(10.000/149,99) = floor(66,67) = 66`.
2. Demanda: `T4_MAIN_SWORD` em Caerleon vendeu 76 unidades em 7 dias (IDEIA-010, dados reais 19-25/10/2026) = 10,86/dia; fatia 25%, 3 dias: `n_demanda = floor(10,86 × 0,25 × 3 / 1) = floor(8,14) = 8`.
3. Materiais: 16 barras + 8 couro; RRR 24,8120%; consumo esperado = 16 × 0,75188 = 12,03 barras e 6,02 couro por craft; em mãos 100 barras e 60 couro -> `n_mat = min(floor(100/12,03), floor(60/6,02)) = min(8, 9) = 8`.
4. Prata: orçamento 20.000 -> `n_prata = floor(20.000/3.524,27) = 5`.
5. `n = min(66, 8, 8, 5) = 5`, **limitado por prata**. Com orçamento 40.000 -> n_prata = 11 e `n = 8` (limitado por demanda e materiais).

## 5. Encaixe no projeto
- `Crafting.jsx`: campo "Nº de crafts" já existe (`cfg.crafts`); adicionar botão "sugerir" e o aviso do fator limitante. `econ.js`: `suggestRuns({...})` puro.
- Depende de IDEIA-002 (foco) e IDEIA-010 (volume). Combina com IDEIA-032 (estoque = materiais em mãos).

## 6. Fontes
- https://albionfreemarket.com/crafting (Runs)
- IDEIA-002, IDEIA-010 (dossiês desta pasta)
- https://albionfreemarket.com/articles/view/how-crafting-specialization-reduces-focus-costs-in-albion-online (60 crafts a 9.000 foco)

## 7. Confiança
**MÉDIA.** As partes de jogo (foco, RRR) herdam a confiança dos dossiês 002/023; os padrões de fatia/dias são decisão de produto sem fonte.
