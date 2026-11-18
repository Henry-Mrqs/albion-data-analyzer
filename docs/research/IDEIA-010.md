# IDEIA-010 — Liquidez / volume vendido por dia (API history do AODP)

## 1. O que faz e por que o jogador usa
Um item pode ter margem ótima e **não vender**. O preço atual (`stats/prices`) só mostra o menor preço de venda listado, não se alguém compra. A API `stats/history` informa **quantas unidades foram vendidas por dia** e o preço médio dessas vendas. Funcionalidade: mostrar itens/dia por cidade em Craft, Flipper e Mercado, estimar "dias para vender N unidades" e avisar "sem giro". Não é fórmula de jogo; é regra de produto sobre dado da API.

## 2. Regras de negócio e fórmulas

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| L1 | Endpoint: `GET {servidor}.albion-online-data.com/api/v2/stats/history/{ids}?locations=…&time-scale=24&qualities=…` (`time-scale` em horas) | Observado em chamada real (2026-11-17/18) à API West. Documentação oficial (swagger) não foi legível (páginas `/api-docs` só mostram "Explore"). Parâmetros `date`/`end_date` existem em outros endpoints (gold) | MÉDIA |
| L2 | Resposta: lista de `{location, item_id, quality, data:[{item_count, avg_price, timestamp}]}`; com `time-scale=24`, um ponto por dia (`timestamp` à meia-noite UTC, ex. `2026-10-19T00:00:00`) | Observado | ALTA |
| L3 | `time-scale` 1 e 6 (granularidade por hora/6 h) são citados em wrapper de terceiros (oanor.com); **não verificados** na API oficial | oanor.com | BAIXA |
| L4 | `item_count` = unidades vendidas no período segundo os registros vistos pelos clientes de dados; **não é garantia de 100% das vendas** (dados colaborativos). O mesmo vale para `avg_price` | Natureza do AODP (site do projeto: dados enviados por jogadores) | MÉDIA |
| L5 | `avg_price` é média simples do dia e sofre com vendas atípicas (ver exemplo: bolsa T4 subiu de 5.751 para 12.621 num dia). Preferir **mediana** dos dias | Observado | ALTA (como fato dos dados) |
| L6 | Limites: 180 requisições por minuto e 300 por 5 minutos; resposta de throttle `Throttled, be nice to the server, use compression (gzip, deflate, etc)!` com o horário de reset; usar compressão | Página oficial da API (trecho de busca) + resposta real observada | MÉDIA |
| L7 | Mesmo servidor/host de `stats/prices`, aceita lista de ids e `locations` separadas por vírgula | Observado + documentação da API | MÉDIA |
| L8 | Servidores: west (Américas), east (Ásia), europe — o histórico é por servidor | Documentação oficial (trecho) | ALTA |

**Fórmulas propostas (produto):**
```
volume_dia      = média(item_count dos últimos N dias)      // N=7 padrão
preco_ref       = mediana(avg_price dos últimos N dias)
dias_para_vender(q, fatia) = q / (volume_dia * fatia)       // fatia = parte do volume que você espera capturar (padrão 10-20%)
alerta "sem giro" = volume_dia < limiar                     // limiar é decisão de produto (sugestão: 5/dia; precisa de calibração)
```
Os limiares são escolhas de produto, sem fonte de jogo.

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| `item_count`, `avg_price`, `timestamp` por dia/cidade/qualidade | API AODP `stats/history` |
| N dias, fatia de mercado, limiar de giro | input do usuário / padrão do produto |
| Quantidade a vender (nº de crafts × unidades por craft) | Craft (`rec.amount × crafts`) |

## 4. Exemplo numérico (caso de teste)
Dados **reais** (API West, `history?locations=Caerleon&time-scale=24&qualities=1`, consulta 2026-11-17/18), primeiros 7 dias (19 a 25/10/2026), usar como constantes:

**T4_BAG (Caerleon):** contagens 82, 61, 100, 141, 131, 116, 59; preços 4.403, 4.779, 4.445, 4.733, 5.751, 12.621, 10.594.
1. Soma = 82+61+100+141+131+116+59 = **690**; volume/dia = 690/7 = **98,57**.
2. Média simples dos preços = 47.326/7 = **6.760,86**; média ponderada pela contagem = **6.676,64**; **mediana = 4.779** (ordenados: 4.403, 4.445, 4.733, 4.779, 5.751, 10.594, 12.621).
3. Quero vender 300 bolsas capturando 10%: 300 / (98,57 × 0,10) = **30,4 dias**; capturando 25%: **12,2 dias**.

**T4_MAIN_SWORD (Caerleon):** contagens 7, 8, 21, 4, 6, 7, 23; preços 8.431, 5.381, 2.009, 5.498, 8.316, 10.999, 6.309.
1. Soma = **76**; volume/dia = **10,86** (liquidez baixa).
2. Média = 46.943/7 = **6.706,14**; mediana = **6.309** (faixa de 2.009 a 10.999 = preço instável).
3. Com limiar de giro 5/dia o item passa; com limiar 15/dia aparece "pouco giro".

Preço do exemplo vs mediana: o preço de venda planejado de 6.000 sem checar histórico seria 25% acima da mediana na bolsa (4.779) — o alerta "preço acima da mediana de 7 dias" é parte da funcionalidade (cruza com IDEIA-012).

## 5. Encaixe no projeto
- `lib/market.js`: novo `fetchHistory(ids, cities, {days})` com o mesmo cache de 3 min e tratamento de 429 já existente; agrupar ids em lotes (a API aceita lista).
- **Craft**: bloco "Giro" no item final (volume/dia, dias para vender o lote) + coluna na tabela "onde vender".
- **Flipper**: coluna de volume (chamada extra só para as linhas visíveis/top N, por causa do limite de requisições).
- **Mercado**: gráfico simples 7/30 dias (cruza com IDEIA-011).
- Já existe: preço atual e idade do dado; **não existe** nenhuma chamada a `history`.

## 6. Fontes
- Chamada real: `https://west.albion-online-data.com/api/v2/stats/history/T4_BAG?locations=Caerleon&time-scale=24` e `.../T4_MAIN_SWORD?...&qualities=1` (2026-11-17/18)
- Página da API (hosts e limites): https://europe.albion-online-data.com/api e https://www.albion-online-data.com/api-site/api.html (trecho de busca)
- Developer information (NATS e histórico, ticks C#): https://europe.albion-online-data.com/developer
- oanor.com (wrapper de terceiros, só para `scale` 1/6/24): https://oanor.com/api/albion-api/get-v1-history

## 7. Confiança
**MÉDIA.** O formato e o comportamento do `time-scale=24` foram observados na API real; a documentação oficial do endpoint não foi acessível, então parâmetros opcionais (`date`, `end_date`, escalas 1/6) ficam sem confirmação. A semântica exata de `item_count` (unidades vs ordens) não está documentada; no exemplo da bolsa (82 a 150/dia) é compatível com unidades vendidas. Limiares de "sem giro" são decisão de produto.
