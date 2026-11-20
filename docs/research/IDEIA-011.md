# IDEIA-011 — Tendência e médias de 7/30 dias (API history)

## 1. O que faz e por que o jogador usa
O preço de hoje pode ser um pico ou um vale. Comparar com a média/mediana de 7 e 30 dias e com a semana anterior mostra se o preço está alto/baixo, subindo/caindo e se o volume muda. Reaproveita a API `history` já usada para liquidez (IDEIA-010): nenhuma chamada nova, só mais janelas e a série completa. Mostra "preço atual vs mediana", variação semanal de preço e volume e um gráfico simples.

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| H1 | `GET https://{west\|east\|europe}.albion-online-data.com/api/v2/stats/history/{ids}?locations=…&time-scale=24&qualities=…`; resposta `[{location, item_id, quality, data:[{item_count, avg_price, timestamp}]}]`, um ponto por dia (meia-noite UTC) | chamada real (2026-11-19) + IDEIA-010 L1/L2 | ALTA |
| H2 | **A API devolve ~29 dias, não 30**: `T4_MAIN_SWORD`, Black Market, q1: 29 pontos, 2026-10-21 a 2026-11-18, sem lacunas; q2 = 26, q3 = 21, q4 = 14, q5 = 3 pontos (qualidade rara tem menos dias) | chamada real (2026-11-19) | ALTA (observado numa chamada) |
| H3 | Só há ponto nos dias com registro; dia ausente = sem registro, não necessariamente zero venda (`MIN_POINTS_IN_WINDOW` = 3 evita falso "sem giro") | `liquidity.js`; IDEIA-010 | produto |
| H4 | `avg_price` é média simples do dia e sofre com vendas atípicas; preferir mediana dos dias (IDEIA-010 L5) | IDEIA-010 | ALTA |
| H5 | `item_count` = unidades vendidas segundo os clientes de dados (colaborativo, não 100%) | IDEIA-010 L4 | MÉDIA |
| H6 | `time-scale=1` devolve pontos por hora (observado: `timestamp` `…T19:00:00`, `…T20:00:00`), mas **não** foi usado; `time-scale=6` não verificado | chamada real | MÉDIA / NÃO VERIFICADO (6) |
| H7 | Existe também `stats/charts/{id}?…&date=…` com formato em vetores (`timestamps`, `prices_avg`, `item_count`); devolveu 5 pontos para `date=2026-11-10`; semântica de `date` e alcance NÃO VERIFICADOS | chamada real | MÉDIA |
| H8 | O app já tem: `parseHistory` (qualidade 1, ordena, ms UTC), `fetchHistory` (cache 1 h, máx. 5 requisições, concorrência 2), `windowStats(series, {now, days})` com `days` parametrizável (janela de dias UTC completos terminando na véspera) e `median` (não exportada) | `history.js`, `liquidity.js` | ALTA |

Fórmulas (produto; janela W de `days` dias completos terminando na véspera UTC):
```
vol_dia(W)   = soma(item_count em W) / divisor           // divisor: ver risco 1
preco_med(W) = média simples de avg_price em W
preco_pond(W)= Σ(count·avg) / Σ(count)
preco_mediana(W) = mediana de avg_price em W              // padrão para comparar
tendência_preço = mediana/média(W atual) / (mesma da W anterior) − 1
tendência_volume = vol(W atual) / vol(W anterior) − 1
desvio_vs_mediana = preço_atual / mediana(W) − 1         // alerta ≥ +20% (PRICE_ABOVE_MEDIAN_WARN)
```

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| Série diária por cidade/qualidade | API AODP `stats/history` |
| Janelas (7 e 30), qualidade | input / padrão (7 já é `HISTORY_DAYS`) |
| Preço atual | `stats/prices` (`quote`) |

## 4. Exemplo numérico (caso de teste: dados reais, conferíveis à mão)
`T4_MAIN_SWORD`, Black Market, q1, servidor West, consulta 2026-11-19. Últimos 7 dias (12 a 18/11) `[contagem, preço]`: [186, 9.586], [322, 9.937], [287, 10.662], [334, 10.717], [340, 9.481], [201, 10.920], [183, 10.790]. 7 dias anteriores (5 a 11/11): [284, 8.248], [278, 8.217], [412, 8.299], [401, 8.481], [222, 8.457], [250, 10.876], [228, 10.396].
1. Semana atual: soma das contagens = **1.853**; vol/dia = 1.853/7 = **264,71**; soma dos preços = 72.093 -> média **10.299**; mediana (ordenados 9.481, 9.586, 9.937, 10.662, 10.717, 10.790, 10.920) = **10.662**; média ponderada = **10.261,85**.
2. Semana anterior: soma = **2.075**; vol/dia = **296,43**; média = 62.974/7 = **8.996,29**; ponderada = **8.874,01**.
3. Tendências: volume 1.853/2.075 − 1 = **−10,7%**; preço (média) 10.299/8.996,29 − 1 = **+14,5%**; (ponderada) **+15,6%**.
4. Janela inteira (29 dias): soma das contagens = **8.986**; média de preço **8.788,21**; mediana **8.248**; ponderada **8.653,28**. Vol/dia = 8.986/29 = **309,86** (com divisor 30 = **299,53**: diferença de 3,4%).
5. Preço atual 10.854 vs mediana de 29 dias 8.248 -> +31,6% (> +20%: alerta "acima da mediana"); vs mediana de 7 dias (10.662) -> +1,8%: **a janela muda o veredito**.
6. Salto visível: 8.457 (09/11) -> 10.876 (10/11) = +28,6% num dia; a tendência de 7 dias captura isso, a de 30 dias dilui.

## 5. O que NÃO é verificado
- NÃO VERIFICADO: se o limite de ~29 dias é fixo da API ou varia por item/servidor (observado só em itens do Black Market e Caerleon da West).
- NÃO VERIFICADO: `time-scale=6` e a semântica de `date`/`end_date` na documentação oficial (swagger ilegível, como em IDEIA-010).
- NÃO VERIFICADO: histórico em East e Europe (assume mesmo formato).
- Preço "atual" e série têm origens diferentes (`prices` ao vivo vs média do dia): a comparação é aproximada.

## 6. Riscos
1. **Janela de 30 dias não existe**: rotular "até ~29 dias (o que a API devolve)"; o divisor deve ser a extensão real da série (de `windowStats(days)` hoje divide por `days`, então 30 subestima 3,4% neste exemplo) ou o rótulo mostra "N dias com dado".
2. Séries curtas/esparsas (qualidades 3 a 5, itens raros): `sparse`/`idle`; nunca tendência com < 3 pontos por janela.
3. Outliers (bolsa T4: 5.751 -> 12.621 num dia, IDEIA-010): usar mediana; média só como informação.
4. Custo de API: janela maior não custa chamada extra (mesma resposta), mas gráficos para muitos itens esbarram em `HISTORY_MAX_REQUESTS` = 5; só o item aberto / top N.
5. Dado colaborativo: preço médio do dia com poucas vendas (item_count 2 a 4) é frágil; mostrar contagem.

## 7. Desenho mínimo
- `liquidity.js`: exportar `median`; novo `trendStats(series, {now, days})` (puro) que chama `windowStats` para a janela atual e a anterior e devolve `{ cur, prev, priceTrend, volumeTrend, state }`; `days` 7 e 14 por padrão; "30" = `Math.min(29, ...)` pela extensão real.
- `history.js`: `parseHistory` hoje só aceita q1; para a série completa não é preciso mudar `fetchHistory` (já devolve a série inteira); `historyUrl` já aceita `scale`/`qualities`.
- UI: Craft (item final) e Mercado: cartão "Tendência" + gráfico simples (SVG, sem biblioteca); Flipper: ícone de tendência só nas `HISTORY_TOP_N` linhas.
- Auditor (IDEIA-005): variável "janela/tendência" `info-only` (não muda lucro); a regra do `registry.js` vale se houver campo salvo novo (ex.: janela escolhida).
- Testes: o exemplo acima vira fixture (valores literais; `now` fixo = 2026-11-19).

## 8. Fontes
- Chamadas reais 2026-11-19: `https://west.albion-online-data.com/api/v2/stats/history/T4_MAIN_SWORD?locations=Black%20Market&time-scale=24&qualities=1` (e `time-scale=1`, `qualities=1,2,3`, `stats/charts/T4_MAIN_SWORD?locations=Caerleon&time-scale=24&date=2026-11-10`)
- `client/src/lib/history.js`, `liquidity.js`; IDEIA-010 (L1 a L8)

## 9. Confiança
**MÉDIA-ALTA** (formato e números observados na API real; limites e documentação oficial não confirmados). Decisão de produto pendente: janela longa fixa em 14 e 29 dias ou configurável?
