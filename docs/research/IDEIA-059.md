# IDEIA-059 — Ciclo de vida da ordem: custo de relistar (undercut), cancelar e esperar

## 1. O que faz e por que o jogador usa
O app trata a ordem de venda como um evento único: preço × (1 − imposto − 2,5%). Na prática o jogador **corrige o preço várias vezes** (undercut) até vender, e cada atualização cobra o setup fee de novo. Cancelar não devolve o setup fee. O lucro "esperado" some sem o jogador perceber. A funcionalidade: campo "nº de atualizações da ordem" no cálculo de venda (e na compra por ordem), mostrando o custo acumulado de setup e o preço mínimo que ainda dá o lucro-alvo.

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| O1 | Setup fee de 2,5% do preço listado, pago **ao criar ou atualizar** uma ordem de compra ou de venda | Wiki "Marketplace" (trecho de busca; 403 no fetch; página ~287 dias antiga) | MÉDIA-ALTA |
| O2 | Ordem cancelada **não** devolve o setup fee | mesma página (trecho); AlbionSnipe 2026-07-30 ("Cancelling does not refund it") | MÉDIA-ALTA |
| O3 | Imposto de venda (8%, 4% premium) só na venda concluída, sobre o preço final | AUDITORIA-001 §3 | MÉDIA-ALTA |
| O4 | **Base do fee na atualização** (sobre o preço novo, sobre a diferença ou sobre o total): NÃO ENCONTRADA em fonte; assumir "sobre o preço novo × quantidade" é decisão de produto | — | **BAIXA** |
| O5 | **Duração/expiração da ordem**: sem fonte (um post do Steam pergunta o que acontece aos 30 dias; AlbionSnipe fala em esperar "até 30 dias" com uma ordem de venda no Black Market). Sem confirmação oficial | steamcommunity (trecho); albionsnipe.com | **BAIXA** |
| O6 | Vender "instantaneamente" numa ordem de compra existente não cria ordem: só imposto, sem setup | AUDITORIA-001 §3; AlbionSnipe | MÉDIA-ALTA |

Fórmula de produto (com O4 assumido): para `k` listagens (1 criação + `k−1` atualizações) com preços `P1..Pk` e venda final em `Pk`, quantidade `n`:
```
setup_total = 0,025 × n × (P1 + P2 + ... + Pk)
receita_liq = n × Pk × (1 − t) − setup_total
```

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| `P1..Pk` | input (preço inicial e passo do undercut) |
| `k` | input |
| `n`, `t`, 2,5% | cálculo/constantes |

## 4. Exemplo numérico (caso de teste)
Uma Broadsword; premium (t = 4%); lista a 4.500 e corrige 3 vezes (4.490, 4.480, 4.470); vende a 4.470.
1. Setup: 112,50 + 112,25 + 112,00 + 111,75 = **448,50** (9,97% de 4.500).
2. Imposto: 4.470 × 0,04 = **178,80**.
3. Receita líquida = 4.470 − 448,50 − 178,80 = **3.842,70**.
4. O app atual (uma listagem, sem atualizações): 4.470 × 0,935 = **4.179,45**. Diferença: **336,75** por unidade (8,1%).
5. Com o custo C = 3.524,27 (IDEIA-030): lucro real = 3.842,70 − 3.524,27 = **318,43**; lucro do app = **655,18**. O preço de equilíbrio com 3 atualizações é maior que o de uma listagem (IDEIA-030: 3.769,27), a calcular por tentativa/numérico (a fórmula depende do passo).

**O que o usuário deve medir em jogo (O4):** listar 1 item a preço 1.000 e anotar o fee (esperado 25); atualizar para 990 e anotar o fee cobrado. Se for 24,75, a base é o preço novo; se for 0,25 (diferença), a base é a diferença.

## 5. Encaixe no projeto
- `econ.js`: `netSaleWithRelists({prices, n, premium})`; interage com `netSale`.
- `Crafting.jsx`/`Refining.jsx`/`Flipper.jsx`: campo "atualizações" (padrão 0) e linha "setup acumulado". Complementa IDEIA-021 (preço sugerido) e IDEIA-022 (listagem abaixo do mínimo), sem duplicá-las.
- Mesma lógica vale para ordem de compra de material (IDEIA-061).

## 6. Fontes
- https://wiki.albiononline.com/wiki/Marketplace (403; trecho de busca)
- https://albionsnipe.com/guides/black-market-flipping (2026-07-30)
- https://steamcommunity.com/app/761890/discussions/0/3144053252443865484 (trecho: pergunta sobre 30 dias)
- IDEIA-030, AUDITORIA-001

## 7. Confiança
**MÉDIA** para O1-O3/O6; **BAIXA** para a base do fee na atualização e para a expiração. Implementar só o que vem de O1-O3 e deixar a base da atualização como configurável até a medição.
