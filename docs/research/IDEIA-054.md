# IDEIA-054 — "Vale pagar Premium?" (ponto de equilíbrio com o preço do ouro)

## 1. O que faz e por que o jogador usa
O app tem só um interruptor Premium (imposto 4% vs 8%). O jogador de craft se pergunta se o Premium se paga: ele custa ouro (3.750 por 30 dias), e o ouro tem preço em prata flutuante. Benefícios mensuráveis em prata: imposto de mercado menor e **10.000 de foco por dia** (que vale prata por ponto, ver IDEIA-002). Ferramentas como a Albion Online Refinery têm uma calculadora de "ouro e Premium". A funcionalidade: calcular, com o preço atual do ouro, quanto de vendas e quanto foco aproveitado por mês fazem o Premium empatar.

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| P1 | Premium 30 dias custa **3.750 ouro** | AO Refinery "gold" (consulta 2026-11-18); busca (outro site) idem | MÉDIA (preço muda por patch: existe post do fórum "Price Changes for Premium and Gold on Nov 28th") |
| P2 | Benefícios: 10.000 de foco por dia, 30 pontos de aprendizado/dia, +50% de fama, +50% de rendimento de coleta, 50% de redução do imposto de mercado (8% -> 4%) | Wiki "Premium" (trecho de busca) | MÉDIA |
| P3 | Preço do ouro: `GET {servidor}.albion-online-data.com/api/v2/stats/gold?count=N` devolve `[{price, timestamp}]`, um ponto por hora. Observado em 2026-11-18: 9.411 (01:00 UTC), 9.414 (00:00), 9.416 (23:00 do dia anterior) | consulta real à API | ALTA (dado observado) |
| P4 | Custo em prata = `3.750 × preço_do_ouro` (9.414 -> 35.302.500) | cálculo; bate com AO Refinery (35,30 M a 9.414) | ALTA |
| P5 | Economia de imposto = `0,04 × volume_vendido_no_mês` (a diferença 8% − 4%; o setup fee de 2,5% não muda com o Premium) | AUDITORIA-001 §3 | MÉDIA-ALTA |
| P6 | Valor do foco = `10.000 × 30 × prata_por_foco` (IDEIA-002), só se o jogador **usa** todo o foco | IDEIA-002 | MÉDIA |
| P7 | A AO Refinery **não conta** o +50% de silver/loot de mobs, fama extra, dobra de colheita em ilha, crescimento de animais e rendimento de coleta; o resultado dela é só "imposto + foco − custo" | AO Refinery gold | MÉDIA |
| P8 | Divergência de conclusão: a AO Refinery conclui que o Premium não se paga só com imposto+foco; um guia (topgamecarry) conclui que os bônus combinados costumam compensar, principalmente se financiado com prata de jogo | AO Refinery; guia (trecho) | opinião, não fórmula |

Fórmula de produto: `saldo_30d = 0,04 × V + 300.000 × s − 3.750 × G` onde `V` = prata vendida no mercado/mês, `s` = prata por ponto de foco, `G` = preço do ouro. Ponto de equilíbrio em V: `V* = (3.750 × G − 300.000 × s) / 0,04`.

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| `G` | API AODP `stats/gold` |
| Custo do Premium em ouro (3.750) | constante com data; **input editável** |
| `V` | input (vendas por mês) ou histórico do usuário |
| `s` | IDEIA-002 (calculado) ou input |

## 4. Exemplo numérico (caso de teste)
Exemplo da AO Refinery (reprodutível): `G = 9.414`, `V = 20.000.000`, `s = 43`.
1. Custo = 3.750 × 9.414 = **35.302.500**.
2. Imposto economizado = 0,04 × 20.000.000 = **800.000**.
3. Foco = 10.000 × 30 × 43 = **12.900.000**.
4. Saldo = 800.000 + 12.900.000 − 35.302.500 = **−21.602.500** (a página mostra −21,60 M).
5. Ponto de equilíbrio em V com `s = 43`: V* = (35.302.500 − 12.900.000)/0,04 = **560.062.500** de prata vendida por mês.
6. Com `s = 6,78` (exemplo do Broadsword da IDEIA-002, foco com spec 100/100): foco = 300.000 × 6,78 = 2.034.000; V* = (35.302.500 − 2.034.000)/0,04 = **831.712.500**.
Lição: sem contar os demais benefícios, o Premium só se paga para quem usa o foco com alto retorno ou vende muito; os benefícios não-prata têm que aparecer como "não contados".

## 5. Encaixe no projeto
- Novo cartão no cabeçalho ou aba "Premium": busca o ouro na API (`stats/gold?count=1`), campo de volume e prata por foco, mostra saldo e V*.
- `market.js`: `fetchGold(server)`. Cache de 3 min como os demais.
- Cuidado de produto: **não recomendar** compra; mostrar números e a lista "benefícios não contados" (P7). Fora do escopo de aconselhamento financeiro: é cálculo de economia de jogo.

## 6. Fontes
- https://aorefinery.com/gold (consulta 2026-11-18)
- https://wiki.albiononline.com/wiki/Premium (403; trecho de busca)
- https://forum.albiononline.com/index.php/Thread/171797-Price-Changes-for-Premium-and-Gold-on-Nov-28th/ (trecho de busca)
- AODP gold: `https://west.albion-online-data.com/api/v2/stats/gold?count=3` (2026-11-18)
- https://topgamecarry.com/guides/albion-online-premium-guide/ (opinião)

## 7. Confiança
**MÉDIA.** A conta é determinística, o preço do ouro é observado; o custo de 3.750 ouro e a lista de benefícios vêm de fontes secundárias (wiki em trecho) e podem mudar por patch: tornar editável com data.
