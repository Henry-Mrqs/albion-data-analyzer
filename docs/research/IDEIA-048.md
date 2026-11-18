# IDEIA-048 — Despesas extras no lucro e "venda sem imposto de mercado"

## 1. O que faz e por que o jogador usa
O lucro do craft ignora custos que o jogador paga fora dos materiais: transporte (pedágio de teleporte, aluguel), comida/poção de buff, re-roll de qualidade, reparo, diário. Também há vendas fora do mercado (para guilda, troca direta, encomenda) em que **não há imposto nem setup fee**. O problema central do usuário é esquecer variável; este campo é a rede de segurança. A funcionalidade: lista de "despesas extras" (nome, valor, por craft ou por lote) somada ao custo, e um interruptor "venda sem imposto de mercado" por saída.

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| X1 | A AlbionUtil oferece "Extra Costs" em três tipos: **Transports, Rerolls, Foods**, cada um somado ao investimento | albionutil.com/en/calculator-crafting (sem data) | MÉDIA (descrição da ferramenta, não regra de jogo) |
| X2 | A Albion Free Market tem por craft: **Consumables** (comida e itens usados no craft), **Daily Bonus and Extra Expenses** e o interruptor **No Sales Tax** ("para itens vendidos fora do mercado"); o interruptor **não remove taxas de diário** | albionfreemarket.com/crafting (consulta 2026-11-18) | MÉDIA |
| X3 | Venda fora do mercado: sem imposto de 4%/8% e sem setup fee de 2,5% (esses só existem na criação/venda por ordem no Marketplace) | Wiki Marketplace (trecho de busca): imposto de transação cobrado "quando um item é vendido com sucesso" no mercado; setup fee na criação/atualização de ordem | MÉDIA-ALTA |
| X4 | Taxa de bancada e custo de materiais já existem no app; os extras **não** alteram RRR nem foco | AUDITORIA-001 | ALTA |

Não há fórmula de jogo nova. Regras de produto: `custo_total = custo_materiais + taxa_bancada + Σ extras`; extras "por craft" multiplicam por nº de crafts, extras "por lote" não; `receita_sem_imposto = P × unidades`; o modo "sem imposto" se aplica por saída (um item pode vender metade no mercado e metade por contrato).

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| Extras (descrição, valor, escopo) | input do usuário (localStorage) |
| Interruptor sem imposto | input |
| Demais (custo, P, tax, setup) | cálculo do app |

## 4. Exemplo numérico (caso de teste)
Broadsword T4 em Lymhurst (mesmo caso das IDEIA-002/030/031): custo do app C = 3.308,27 (materiais líquidos) + 216 (bancada) = **3.524,27**; preço de venda P = 4.500; premium, venda por ordem (k = 0,935).
- Extras: transporte 150 + comida de buff 80 = **230** por craft.
- Custo total = 3.524,27 + 230 = **3.754,27**.
- Vendendo no mercado: receita 4.500 × 0,935 = 4.207,50 -> lucro = **453,23** (antes: 683,23; o app superestimaria em 230).
- Vendendo por contrato sem imposto: receita 4.500 -> lucro = **745,73**.
- Em lote de 10 crafts com extras "por lote" de 230: custo extra por craft = 23 -> lucro no mercado = 4.207,50 − 3.547,27... (3.524,27 + 23 = 3.547,27) = **660,23** por craft.

## 5. Encaixe no projeto
- Craft e Refino: seção "Despesas extras" (lista editável) e interruptor por saída; o resultado entra em `lucro`, no plano e na planilha de compras.
- `econ.js`: `totalCost({materials, fee, extras, crafts})`, `netSale(price, 'none', premium)` (modo novo sem imposto). Hoje `netSale` só conhece `order` e `instant`.
- Reforça IDEIA-005 (auditor: "extras não informados"). Não duplica 044 (viagem), que calcula teleporte automaticamente; aqui é valor livre.

## 6. Fontes
- https://albionutil.com/en/calculator-crafting
- https://albionfreemarket.com/crafting
- https://wiki.albiononline.com/wiki/Marketplace (403; trecho de busca)

## 7. Confiança
**MÉDIA.** O comportamento das ferramentas é visível em duas fontes; a regra "sem imposto fora do mercado" vem de trecho da wiki. Nenhum número de jogo novo. Decisões de produto: escopo por craft/lote e presets de extras comuns (não propor valores padrão: não há fonte).
