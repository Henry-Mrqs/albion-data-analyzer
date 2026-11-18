# IDEIA-066 — Aviso de saída ilusória: preço de venda sem comprador (Caerleon, Black Market, cidade sem ordem de compra)

## 1. O que faz e por que o jogador usa
O app calcula o lucro do item usando o preço de venda de uma cidade. Há três formas de sair do estoque, com custos e riscos muito diferentes: (a) **vender instantaneamente** numa ordem de compra existente (só imposto); (b) **listar uma ordem de venda** (imposto + 2,5% e esperar comprador); (c) **vender no Black Market**, que só tem ordens de compra de NPC, nunca de venda. O jogador esquece de perguntar "existe alguém comprando?" e escolhe a saída mais bonita no papel (ex. Caerleon a 12.000). O Flipper já trata o BM corretamente (usa `buy_price_max`, não oferece "ordem" lá), mas o Craft e a tabela "onde vender" não mostram qual saída é possível e em quanto tempo. A funcionalidade: para cada cidade de venda, uma linha por **saída possível** com preço, idade, existência de ordem de compra, volume/dia e aviso de "saída ilusória" quando só há ordem de venda de uma unidade sem comprador.

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| X1 | O Black Market só gera **ordens de compra**; o preço de venda mostrado nele (quando aparece) é lixo: "menos de 1 em 5 células do BM mostram preço de venda (14% e 18%); quando aparece, mediana 1,4x a ordem de compra, até 54x" | albionsnipe.com/guides/buy-order-or-sell-order (30/07/2026; amostra comercial, Europa) | MÉDIA |
| X2 | Vender instantaneamente numa ordem de compra: só imposto (4% ou 8%), sem setup fee | AUDITORIA-001 §3; AlbionSnipe | MÉDIA-ALTA |
| X3 | Item em ordem de venda própria no BM: "esperar até 30 dias" (AlbionSnipe), sem confirmação oficial | albionsnipe.com (30/07/2026) | BAIXA |
| X4 | Na cidade (não BM), só 17% das células têm alguma ordem de compra; a razão mediana venda/compra é 1,81x e em Caerleon 2,74x (mesma fonte, Europa) | albionsnipe.com (30/07/2026) | MÉDIA-BAIXA |
| X5 | Qualidade no Black Market: a ordem aceita a qualidade pedida **ou superior**; em ordens de cidade a regra é por qualidade exata, segundo guias de 2026 (duas fontes comerciais; **divergem em detalhes**) | albionsnipe.com e albioncodex.com (2026) | MÉDIA-BAIXA |
| X6 | Itens normais costumam ser o foco do BM: mediana de preços T5-T8 Good = 1,01× Normal, Outstanding 1,01×, Excellent 1,02× (janela 30 dias); pagar prêmio por qualidade num flip não se recupera | albionsnipe.com (30/07/2026) | MÉDIA-BAIXA |
| X7 | O Black Market **não** compra recursos brutos/refinados nem a maioria dos consumíveis, só equipamento | albioncodex.com (2026, trecho de busca) | MÉDIA |

Regra de produto: para cada cidade c, listar `saídas(c) = {instantânea se buy_price_max>0 e idade<limite; ordem se sell_price_min>0 e c ≠ BM}`; marcar **ilusória** quando a única saída é `ordem`, a cidade não tem `buy_price_max` e o volume/dia é baixo (IDEIA-010).

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| `sell_price_min`, `buy_price_max` e datas, qualidade | AODP `stats/prices` (qualities 1 hoje) |
| Volume/dia | `stats/history` (IDEIA-010) |
| Limite de idade | decisão de produto (o Flipper já tem `fresh()`) |

## 4. Exemplo numérico (caso de teste)
Dados reais (API West, qualidade 1, consulta 2026-11-18 ~01:15 UTC), `T4_MAIN_SWORD`; premium (t = 0,04, s = 0,025); custo C = 3.524,27 (IDEIA-030):

| Local | `sell_price_min` (idade) | `buy_price_max` (idade) | Saídas possíveis |
|---|---|---|---|
| Caerleon | 12.000 (10:45 do dia 17, ~14,5 h) | 0 | só ordem de venda |
| Lymhurst | 5.525 (15:00 do dia 17, ~10 h) | 0 | só ordem de venda |
| Black Market | 0 | 1.185 (23:20 do dia 17, ~2 h) | só instantânea |
| Bridgewatch, Fort Sterling, Martlock, Thetford | 0 | 0 | nenhuma |

Contas:
1. BM instantânea: 1.185 × 0,96 = **1.137,60** -> lucro = 1.137,60 − 3.524,27 = **−2.386,67** (prejuízo certo).
2. Caerleon ordem a 12.000: 12.000 × 0,935 = **11.220** -> lucro nominal **7.695,73**, mas **sem ordem de compra** (e o histórico de Caerleon tem mediana 6.309, IDEIA-065): saída marcada **ilusória**.
3. Lymhurst ordem a 5.525: 5.525 × 0,935 = **5.165,88** -> lucro **1.641,61**, também sem comprador visível.
4. Conclusão a mostrar: "única saída com comprador visível é o Black Market e dá prejuízo; as outras dependem de alguém comprar sua ordem" — o jogador decide, o app não esconde o prejuízo.

**O que o usuário deve medir (X3 e X5):** (a) quantos dias uma ordem de venda de um item T4 normal leva para vender em Caerleon; (b) se o Black Market aceita sua qualidade em ordens de qualidade menor (testar com 1 item de qualidade Good).

## 5. Encaixe no projeto
- `Crafting.jsx` (tabela "onde vender"): linhas por saída, coluna "comprador?" e selo "ilusória". `econ.js`: `exits(prices, mid)` puro; testes com a tabela acima.
- Já existe no Flipper a regra "BM só instantânea" (verificada em `Flipper.jsx`): extrair para `econ.js` e reusar.
- Interage com IDEIA-036 (filtros do Mercado Negro: qualidade/giro), IDEIA-065 (preço realista) e IDEIA-053 (confiança da rota); não os duplica.

## 6. Fontes
- AODP: `https://west.albion-online-data.com/api/v2/stats/prices/T4_MAIN_SWORD?locations=...,BlackMarket&qualities=1` (2026-11-18)
- https://albionsnipe.com/guides/buy-order-or-sell-order e /black-market-flipping (2026-07-30)
- https://www.albioncodex.com/guides/albion-online-black-market-crafting (trecho de busca)
- AUDITORIA-001, IDEIA-065

## 7. Confiança
**MÉDIA.** A análise de saídas é determinística sobre dados reais; as estatísticas de mercado (X1, X4, X6) são de uma ferramenta comercial (Europa), e o tempo de espera (X3) não tem fonte oficial.
