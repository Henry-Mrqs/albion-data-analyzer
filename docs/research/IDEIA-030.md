# IDEIA-030 — Preço-alvo reverso: "por quanto preciso vender para lucrar X"

## 1. O que faz e por que o jogador usa
Hoje a ferramenta mostra o lucro dado um preço de venda. O jogador pergunta o inverso: "quero ganhar 1.000 por craft (ou 20% de margem): por quanto devo listar?" e "qual é o preço mínimo para não ter prejuízo?". Evita listar abaixo do ponto de equilíbrio por esquecer imposto, setup fee ou taxa de bancada. **Não é regra de jogo nova**: é a inversão algébrica da venda líquida que já existe (`netSale`) sobre o custo calculado pelo app. Por isso a "fonte" das constantes é a AUDITORIA-001 (imposto 4%/8%, setup 2,5%).

## 2. Regras e fórmulas

Definições: `C` = custo total por unidade (materiais líquidos de RRR + taxa de bancada + compras por ordem, já calculado pelo app), `t` = imposto (0,04 premium, 0,08 sem), `s` = setup fee 0,025, `L` = lucro alvo por unidade.

| Modo de venda | Líquido | Preço-alvo `P` (mínimo) |
|---|---|---|
| Ordem de venda (cria listagem) | `P × (1 − t − s)` | `P = (C + L) / (1 − t − s)` |
| Venda instantânea numa ordem de compra | `P × (1 − t)` | `P = (C + L) / (1 − t)` |
| Margem `m` sobre o custo | `L = C × m` | `P = C × (1 + m) / (1 − t − s)` |
| Equilíbrio | `L = 0` | `P = C / (1 − t − s)` |

Regras de produto (sem fonte de jogo):
- Preço em prata é inteiro: **arredondar para cima** (`ceil`) o preço-alvo, para o líquido nunca ficar abaixo do alvo.
- Se a receita rende `n` unidades por craft (`amountcrafted` > 1), `C` e `L` são por unidade (`C = custo_do_craft / n`).
- Se o usuário atualiza a ordem, o setup fee é cobrado de novo (wiki Marketplace, trecho): oferecer campo opcional "nº de relistagens" que soma `s × P` por relistagem.
- O preço-alvo deve ser mostrado junto do menor preço de venda atual (`sell_price_min`) e da idade do dado; indicar "alvo acima do mercado em X%" (cruza com IDEIA-010/012).

Fontes das constantes: imposto/setup (AUDITORIA-001 §3: wiki Marketplace trecho; Patch 6, 14/09/2022; guias 2026). Confiança: **ALTA** para a álgebra; **MÉDIA-ALTA** para as constantes.

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| `C` (custo unitário) | calculado pelo app (RRR, bancada, preços AODP) |
| `t` | Premium (global) |
| `s` | constante do jogo (2,5%) |
| `L` ou `m` | input do usuário |
| Modo (ordem/instantâneo) | input (já existe) |

## 4. Exemplo numérico (caso de teste)
Base de custo (mesmos números da IDEIA-002/031): Broadsword T4 em Lymhurst, barra 200 e couro 150, RRR 24,8120%, taxa de bancada 500.
1. Bruto = 16×200 + 8×150 = 4.400. Líquido = 4.400 × 0,751880 = 3.308,27.
2. Taxa = 384 × 0,1125 × 5 = 216. **C = 3.308,27 + 216 = 3.524,27.**

Premium (t = 0,04, s = 0,025 -> 1 − t − s = 0,935):
| Pedido | Conta | P exato | P a listar |
|---|---|---|---|
| Equilíbrio (ordem) | 3.524,27 / 0,935 | 3.769,27 | **3.770** |
| Lucro 1.000 (ordem) | (3.524,27 + 1.000) / 0,935 | 4.838,79 | **4.839** (líquido 4.524,47 ≥ 4.524,27) |
| Lucro 1.000 (instantâneo) | 4.524,27 / 0,96 | 4.712,78 | **4.713** |
| Margem 20% (ordem) | 3.524,27 × 1,2 / 0,935 | 4.523,13 | **4.524** |
| Equilíbrio (instantâneo) | 3.524,27 / 0,96 | 3.671,12 | **3.672** |

Sem premium (t = 0,08, 1 − t − s = 0,895): lucro 1.000 por ordem: 4.524,27 / 0,895 = **5.055,05 -> 5.056**.

Verificação reversa (deve devolver ~1.000): P = 4.839 × 0,935 = 4.524,465; menos C = **1.000,19**.

## 5. Encaixe no projeto
- `econ.js`: `targetPrice({cost, profit, margin, premium, mode, relists})`, simétrica de `netSale`; função de teste: `netSale(targetPrice(...)) >= cost + profit`.
- **Craft** (preço de venda do item) e **Refino** (preço do refinado): campo "lucro alvo" ou "margem alvo" ao lado do preço de venda; chip "preço-alvo".
- **Flipper**: "para comprar a X e lucrar Y, preciso vender a Z". Cruza com IDEIA-006 (ponto de equilíbrio comprar × produzir, que inverte o lado do material) e IDEIA-021 (preço sugerido).
- Depende só de `netSale` e `salesTax`; sem dependência de API nova.

## 6. Fontes
- https://wiki.albiononline.com/wiki/Marketplace (403 no fetch; trecho de busca)
- https://forum.albiononline.com/index.php/Thread/169206-14-September-2022-Into-the-Fray-Patch-6/ (trecho de busca)
- https://albionmarket.gg/guides/crafting-and-refining-profit (2026-07-11); https://albiononlinegrind.com/guides/market-flipping-guide
- Código: `client/src/lib/econ.js` (`netSale`, `salesTax`, `SETUP_FEE`)

## 7. Confiança
**ALTA** na álgebra; **MÉDIA-ALTA** nas constantes. Divergência: um guia fala em "5% de setup fee" (outlier descartado, contradiz wiki e 3 guias de 2026). O comportamento de relistagem (2,5% a cada atualização) vem só da wiki (trecho).
