# IDEIA-063 — Faixa de variação do retorno de recursos em lotes pequenos

## 1. O que faz e por que o jogador usa
O app mostra o custo com o retorno **esperado** (RRR médio). Em lote pequeno o retorno real varia, e o jogador que craftou 3 vezes e recebeu menos que o esperado acha que o app está errado, ou assume o pior caso e deixa de craftar algo lucrativo. A funcionalidade: mostrar, junto do custo esperado, uma **faixa** (por exemplo 90% de confiança) do retorno e do lucro, e o tamanho de lote em que a faixa fica estreita. **Condição crítica:** isso só faz sentido se o retorno for sorteado por unidade; nenhuma fonte que achei diz como o jogo sorteia (por unidade, por tipo de material ou fixo). Por isso o dossiê é CONFIANÇA BAIXA e define a medição que decide se a ideia vale.

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| R1 | O RRR é a **taxa** (fração) de materiais devolvidos; as fontes tratam o valor como esperança (a AFM calcula "retorno esperado": 100 crafts a 24,8120% devolvem ≈ 396,99 barras) | AFM 2026-07-17 | MÉDIA |
| R2 | Como o jogo sorteia o retorno (por unidade independente, por tipo de ingrediente ou valor fixo/arredondado): **sem fonte** (busca sem resultado) | busca (2026-11-18) | **BAIXA** |
| R3 | Se cada unidade devolvida for um sorteio independente com probabilidade p = RRR (hipótese H1), o retorno de `N` unidades ~ Binomial(N, p): média `N·p`, desvio `√(N·p·(1−p))` | estatística | só vale sob H1 |
| R4 | A hipótese H0 (retorno determinístico por arredondamento de `N × RRR`) leva a variância ≈ 0 e a ideia **não faz sentido** | estatística | — |

## 3. Variáveis e origem
`N` (unidades brutas do lote), `p` (RRR do app). Observações do usuário (R2) para decidir H0/H1.

## 4. Exemplo numérico (caso de teste, sob H1)
Broadsword (16 barras + 8 couro), Lymhurst, RRR `p = 0,248120`.
- **Lote de 1 craft** (16 barras): média = 16 × 0,24812 = **3,97**; desvio = √(16 × 0,24812 × 0,75188) = **1,73**; P(retorno 0) = 0,75188^16 = **1,04%**; faixa ~ 95%: 3,97 ± 3,39 (0 a 7).
- **Lote de 100 crafts** (1.600 barras): média = **396,99** (bate com a AFM); desvio = √(1.600 × 0,24812 × 0,75188) = **17,28**; faixa ~ 95%: 396,99 ± 33,87 (363 a 431), ou ±8,5% da média.
- Desvio relativo cai com `1/√N`: 1 craft ≈ 44% da média; 100 crafts ≈ 4,4%.
- Efeito no custo das barras (preço 267): 100 crafts: ±33,87 barras × 267 = **±9.043** sobre o custo líquido de barras esperado 1.203,01 × 267 = 321.203 (**±2,8%**). 1 craft: ±3,39 barras × 267 = **±905** sobre 16 × 0,75188 × 267 = 3.212 (**±28%**).

**O que o usuário deve medir (decide H0 × H1):** craftar a mesma receita 20 vezes (ex.: 20 Broadswords, cada uma gasta 16 barras e 8 couro), anotando em cada craft quantas barras e couro **voltaram**. Se os 20 valores forem quase todos iguais (± 0-1), é H0; se variarem de 0 a 7 barras (média ≈ 4), é H1. Anotar também se couro e barra variam de forma independente.

## 5. Encaixe no projeto
- Só implementar depois da medição. `econ.js`: `returnBand(N, p, z)` (aproximação normal, `z = 1,645` para 90%). UI: faixa em cinza ao lado do custo; texto "variação esperada em lotes pequenos".
- Complementa IDEIA-031 (teste de estresse) sem duplicar: aqui a incerteza vem do **sorteio do retorno**, não do preço.

## 6. Fontes
- https://albionfreemarket.com/articles/view/how-resource-return-rate-is-calculated-in-albion-online (retorno esperado; 2026-07-17)
- IDEIA-023 (RRR)
- Busca de 2026-11-18 sem resultado sobre a mecânica de sorteio

## 7. Confiança
**BAIXA.** A estatística é exata sob H1, mas H1 não está comprovada. Prioridade baixa até haver medição.
