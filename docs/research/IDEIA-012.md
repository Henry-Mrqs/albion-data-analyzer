# IDEIA-012 — Confiança do preço: outlier, dado velho e preço isolado, com selo por célula

## 1. O que faz e por que o jogador usa
O AODP é **colaborativo**: um preço só existe se algum jogador com o cliente de dados abriu aquele mercado. Cada célula (item x cidade) pode estar velha, ser uma única ordem aspiracional (ex.: Broadsword T4 listada a 12.000 em Caerleon contra mediana 6.309, IDEIA-065) ou lixo (`buy_price_min` de 1 ou 3 prata aparece em quase toda linha real). O app hoje já tem **peças soltas**: idade colorida (`market.js::ageClass`), "velha" e "ilusória" (`exits.js`), giro e mediana (`liquidity.js`, `history.js`). Falta **um selo único por célula** que junte as razões e diga em português por que desconfiar. A funcionalidade: `priceConfidence(cell, hist, opts) -> { level, reasons[] }` mostrado na tabela de preços, na "onde vender" e nos materiais do Craft/Refino.

Diferença para as vizinhas: **065** (preço de saída realista) **usa** a mediana para trocar o preço no lucro; **010** (liquidez, já no app) mede volume; **012 só detecta e marca** e **nunca muda um número**. 012 fornece os sinais; 065 decide se ancora.

## 2. Campos reais da API (observados em 2026-11-19, West)
`GET /api/v2/stats/prices/{ids}?locations=…&qualities=1` devolve por linha: `item_id`, `city`, `quality`, `sell_price_min`, `sell_price_min_date`, `sell_price_max`, `sell_price_max_date`, `buy_price_min`, `buy_price_min_date`, `buy_price_max`, `buy_price_max_date`. Data sem registro = `"0001-01-01T00:00:00"` e preço 0 (o `parseDate` do app já trata). Timestamps vêm **sem `Z`** e são UTC. O app usa só `sell_price_min` e `buy_price_max` (e as datas); `sell_price_max` e `buy_price_min` são ignorados hoje.

`GET /api/v2/stats/history/{ids}?locations=…&time-scale=24&qualities=1` devolve `{location, item_id, quality, data:[{item_count, avg_price, timestamp}]}`, um ponto por dia (meia-noite UTC), **só dias com registro**.

| # | Fato | Fonte | Confiança |
|---|---|---|---|
| C1 | `stats/prices` **não** informa quantas ordens existem; só menor venda, maior venda, menor compra, maior compra e as datas | resposta real (2026-11-19) | ALTA |
| C2 | `buy_price_min` é lixo recorrente (1, 3, 4, 12 prata em itens de milhares): **não usar**; `buy_price_max` é o que importa e também pode ser lixo (ver C6) | resposta real: ex. `T4_PLANKS` Thetford `buy_price_min` 150 vs `buy_price_max` 213; `T4_METALBAR` Fort Sterling `buy_price_max` 61 vs `sell_price_min` 230 | ALTA (como observação) |
| C3 | A idade do dado varia de minutos a dias; célula com data `0001` = nunca vista | respostas reais | ALTA |
| C4 | O histórico **também tem buracos e fica velho**: Cajado Oculto do Adepto (`T4_ARTEFACT_2H_ARCANESTAFF_HELL`), Caerleon, último ponto em 2026-11-04 (15 dias antes da consulta), com dias ausentes (28/10, 30/10); `T4_MAIN_SWORD` Caerleon último ponto 2026-11-13 | resposta real 2026-11-19 | ALTA |
| C5 | `avg_price` diário sofre com venda atípica (um dia a 1.508 numa série de 603; outro a 1.500 numa série de ~9.000) | IDEIA-010 L5, resposta real | ALTA |
| C6 | Há ordens-fantasma (9.999.999) e ordens de compra de 1 prata em listagens reais | lilmarket.io (2026-06-03) e AlbionSnipe via IDEIA-065 E5; `buy_price_min` de 1 na resposta real | MÉDIA |
| C7 | Dados são enviados por jogadores; não há garantia de cobertura completa | site AODP / IDEIA-010 L4 | MÉDIA |

## 3. Sinais e limiares (o que tem justificativa e o que é decisão)
Notação: `P` = preço da célula; `d` = data; `now`; `H` = série de `avg_price` dos últimos `N` dias completos com dado (a mesma janela de `liquidity.js::windowStats`: 7 dias UTC completos, `MIN_POINTS_IN_WINDOW` = 3); `med` = mediana de `H` (função `median` de `liquidity.js`).

| Sinal | Regra | Limiar | Justificativa | Tipo |
|---|---|---|---|---|
| **S1 velho** | `now − d > maxAgeH` | 24 h (já em `exits.js::DEFAULT_MAX_AGE_H`; reusar `isFresh`) | O AODP só atualiza quando alguém abre o mercado; 24 h = "pode ter mudado de dia". Sem fonte de jogo | **decisão de produto** (já aprovada) |
| **S1b muito velho** | `now − d > 72 h` | 72 h | 3 dias cobre um fim de semana sem visita; valor novo | decisão de produto |
| **S1c sem data** | `d` nulo ou `0001` | — | célula nunca vista | fato |
| **S2 sem comprador** | célula de venda sem ordem de compra fresca na cidade | — | já é `exits.js::cityBuyer` ("ilusória"); reusar | já no app |
| **S3 isolado (proxy)** | `sell_price_min == sell_price_max` **e** sem comprador fresco | — | A API não informa o nº de ordens (C1). Se min = max há um **único nível de preço** (uma ordem ou várias iguais); sem comprador, ninguém valida o preço. É **proxy**, nunca diga "uma única oferta" como fato: diga "nível de preço único" | proxy honesto |
| **S4 acima/abaixo da mediana** | `P/med − 1 > +20%` (já `PRICE_ABOVE_MEDIAN_WARN`) ; lado barato: `P/med − 1 < −50%` | +20% (existente) e −50% (novo) | +20% já aprovado (D-034/010). O lado **barato** importa para **custo** de material: uma venda a 1 prata (lixo) infla o lucro. −50% = decisão | +20% existente; −50% decisão |
| **S5 outlier robusto** | `z = 0,6745 × (P − med) / max(MAD, 0,05 × med)`; flag se `|z| > 3,5` | 3,5 e piso 5% | **Fundamento estatístico:** mediana e MAD (desvio absoluto mediano) têm ponto de quebra de 50% e funcionam com n pequeno, ao contrário de média e desvio padrão (Hampel 1974; Iglewicz & Hoaglin 1993, "How to Detect and Handle Outliers": z modificado, corte 3,5; Leys et al. 2013 recomenda 2,5 a 3, mais rigoroso). O **piso** `0,05 × med` evita divisão por ~0 quando a série é quase constante (MAD = 0 no Cajado: ver caso 2). Citações de memória, **não reabertas nesta pesquisa** | corte 3,5 = literatura (confiança MÉDIA); piso 5% = decisão |
| **S6 histórico instável** | `MAD / med > 0,25` | 25% | Quando a própria série é dispersa, "outlier" perde sentido e o selo deve dizer "preço instável" em vez de acusar um ponto. Caso real: Broadsword T4 `MAD/med = 2.007 / 6.309 = 31,8%` | decisão de produto |
| **S7 histórico ralo** | `points < 3` (existente) ou série vazia | 3 | `MIN_POINTS_IN_WINDOW` já aprovado; sem histórico não há S4/S5/S6 | já no app |
| **S8 histórico velho** | último ponto da série mais velho que 7 dias | 7 dias | caso real (C4): mediana de dias antigos não representa o preço de hoje | decisão |

Por que **MAD e não IQR**: com n = 7 a 14 o IQR depende de como se calculam os quartis (n pequeno -> poucas observações por quartil) e a cerca de Tukey (1,5 × IQR, Tukey 1977) é menos estável; MAD usa uma mediana só. No caso real de 14 dias (§5 caso 3) as duas dão a mesma conclusão (nenhuma marca o ponto 1.500), então a escolha é por simplicidade e por reusar `median`. **Não** ponderar por `item_count` na v1 (dia com 2 vendas vale o mesmo que dia com 21): decisão de produto, alternativa registrada.

### Selo (agregação)
| Nível | Condição | Rótulo |
|---|---|---|
| `alta` | histórico carregado **e** nenhum de S1, S1b, S2, S3, S4 (acima), S5, S6, S7, S8 | "preço confiável" |
| `media` | só S1 (velho) ou S4 moderado, ou histórico **não carregado** com S1/S2/S3 limpos | "confira" |
| `baixa` | S1b, S2+S3, S4 acima de +100%, S5, S1c, ou S4 barato | "desconfie" |
| `nenhuma` | sem preço | "sem preço" |
O nível **máximo sem histórico carregado é `media`** ("histórico não carregado: sem verificação de outlier"): o Flipper só busca histórico das 30 primeiras linhas (`HISTORY_TOP_N`) e no máximo 5 requisições (`HISTORY_MAX_REQUESTS`) por causa do limite de ~180 req/min, então o selo precisa degradar sem mentir. O mesmo "nunca dizer sem histórico quando não pediu" já existe em `liquidity.js` (`unloaded` x `nodata`). Cortes de nível (+100%, "moderado") = decisão de produto.

## 4. Variáveis e origem
| Variável | Origem |
|---|---|
| `P`, `d`, `sell_price_max`, `buy_price_max` | AODP `stats/prices` (estender `market.js::normalize` para guardar `sell_price_max` como `sM`; hoje descartado) |
| `H`, `med`, `MAD`, `points`, último ponto | AODP `stats/history` via `history.js` e `liquidity.js::windowStats` (acrescentar `mad` e `lastRecord` já existe) |
| `maxAgeH`, +20%, −50%, 25%, 3,5, 5%, 72 h, 7 dias | constantes nomeadas de produto, num módulo só (`confidence.js`) |

## 5. Casos de teste (números reais, conferíveis à mão)
Fórmula: `z = 0,6745 × (P − med) / max(MAD, 0,05 × med)`.

**Caso 1: Broadsword T4 Caerleon, listagem 12.000** (dados de IDEIA-065: preços diários 8.431, 5.381, 2.009, 5.498, 8.316, 10.999, 6.309).
- Ordenado: 2.009, 5.381, 5.498, **6.309**, 8.316, 8.431, 10.999 -> `med = 6.309`.
- Desvios absolutos: 2.122, 928, 4.300, 811, 2.007, 4.690, 0 -> ordenados 0, 811, 928, **2.007**, 2.122, 4.300, 4.690 -> `MAD = 2.007`; piso 0,05 × 6.309 = 315,45 (não atua).
- `z = 0,6745 × (12.000 − 6.309) / 2.007 = 1,91` -> **S5 não dispara** (corte 3,5).
- `S4`: 12.000 / 6.309 − 1 = **+90,2%** -> dispara (> +20%). `S6`: 2.007 / 6.309 = **31,8%** -> "preço instável".
- Veredito: `baixa` por S4 > +20% **sem** S5; o rótulo diz "90% acima da mediana de 7 dias; histórico instável". **Lição:** o z robusto sozinho **não pega** este caso porque o histórico é ruidoso; o que pega é a razão contra a mediana (S4). Por isso o selo combina S4, S5 e S6 e não depende só de um teste estatístico.

**Caso 2: Cajado Oculto do Adepto (`T4_ARTEFACT_2H_ARCANESTAFF_HELL`) Caerleon, listagem 1.840** (últimos 7 valores 602, 603, 603, 603, 603, 1.508, 603, de IDEIA-065).
- `med = 603`; desvios 1, 0, 0, 0, 0, 905, 0 -> `MAD = 0` (mediana dos desvios ordenados 0,0,0,0,0,1,905 é 0).
- **Sem piso** o z divide por zero; com piso: `0,05 × 603 = 30,15` -> `z = 0,6745 × (1.840 − 603) / 30,15 = 27,67` -> **S5 dispara**. S4: +205,1%. Este caso é o motivo do piso.
- No histórico real de 2026-11-19 o último ponto é 2026-11-04: **S8 (histórico velho) dispara** (15 dias) e o selo cai para `baixa` mesmo que o z fosse baixo.

**Caso 3: ponto de série (sensibilidade do corte).** Broadsword T4 Caerleon, 14 dias de 31/10 a 13/11 (resposta real 2026-11-19): 8.752, 10.144, 9.811, 8.728, 10.562, 9.022, 10.190, 6.636, 7.862, 9.601, 3.014, 6.263, 1.500, 6.262.
- Ordenado: 1.500, 3.014, 6.262, 6.263, 6.636, 7.862, 8.728, 8.752, 9.022, 9.601, 9.811, 10.144, 10.190, 10.562 -> `med = (8.728 + 8.752)/2 = 8.740`.
- Desvios: 7.240, 5.726, 2.478, 2.477, 2.104, 878, 12, 12, 282, 861, 1.071, 1.404, 1.450, 1.822 -> ordenados 12, 12, 282, 861, 878, 1.071, **1.404**, **1.450**, 1.822, 2.104, 2.477, 2.478, 5.726, 7.240 -> `MAD = 1.427`.
- `z(1.500) = 0,6745 × (1.500 − 8.740) / 1.427 = −3,42` -> **abaixo do corte 3,5, não é marcado**; com corte 3,0 seria. `z(3.014) = −2,71`. IQR (dobradiças de Tukey: Q1 = 6.263, Q3 = 9.811, IQR = 3.548): cercas 941 e 15.133 -> 1.500 também **não** é marcado. Registrar no teste que o corte 3,5 deixa passar este ponto: **é decisão consciente** (série com 14 pontos de n = 2 a 21 vendas).

**Caso 4 (isolado, proxy): `T1_FACTION_MOUNTAIN_TOKEN_1` Lymhurst** (resposta real 2026-11-18/19): `sell_price_min = sell_price_max = 35.890` (05:25), `buy_price_max = 0`. Fort Sterling: `sell_price_min` 28.000 (2026-11-18 22:05), `buy_price_max` 26.500. S3 dispara em Lymhurst (nível único, sem comprador); em Fort Sterling não (min ≠ max não é garantido, mas há comprador). Deve render "nível de preço único e sem comprador visível".

**Caso 5 (lixo do lado barato):** `T4_METALBAR` Fort Sterling `buy_price_max = 61` com `sell_price_min = 230` (2026-11-19 10:50): `61/230` -> para o lado compra, S4 barato não se aplica a `sell`; mas como saída "instantânea" a 61 é −73% da venda: marcar "ordem de compra muito abaixo da venda" (S4 barato sobre a razão compra/venda). Teste de unidade: `P = 1` com `med = 4.000` -> S4 barato e `baixa`.

**Caso 6 (sem histórico):** série ausente -> `unloaded`, selo máximo `media`, rótulo "histórico não carregado". Série `[]` -> `nodata` ("sem histórico"), mesmo teto.

**Caso 7 (idade):** `now − d = 23 h 59` -> fresco; `24 h 01` -> S1; `72 h 01` -> S1b; `d = 0001-01-01` -> S1c. Limite exato 24 h = fresco (igual a `isFresh`: `<=`).

## 6. Encaixe no projeto (sem duplicar)
- `lib/confidence.js` (novo, puro): `priceConfidence({ price, date, sellMax, buyer }, stats, { now, maxAgeH })`, onde `stats` é o retorno de `liquidity.js::windowStats` estendido com `mad`. **Reusar**: `exits.js` (`isFresh`, `cityBuyer`, `annotateOptions` já dão `stale`, `buyer`, `illusory`), `liquidity.js` (`median`, `windowStats`, `priceVsMedian`, `PRICE_ABOVE_MEDIAN_WARN`, `MIN_POINTS_IN_WINDOW`), `history.js` (fetch, cache de 1 h). Não criar segundo cache nem segunda mediana.
- UI: selo na `PriceMatrix` (por célula), nas linhas de "onde vender" do Craft e em cada material; tooltip com `reasons`. O alerta "+20% acima da mediana" que a 010 já mostra passa a vir do mesmo módulo (uma fonte).
- 065 consome `reasons` (S4/S5) para decidir quando mostrar o preço ancorado; 005 (auditor) lista o selo como linha `api`.
- Persistência (070): nenhum estado novo se os limiares forem constantes; se virarem configuráveis, entram no esquema de `settings`.

## 7. NÃO VERIFICADO / riscos
- **NÃO VERIFICADO**: existência de endpoint do AODP com contagem de ordens por nível de preço (a documentação oficial não foi legível, IDEIA-010 L1); por isso S3 é proxy.
- **NÃO VERIFICADO**: as referências estatísticas foram citadas de memória (Hampel 1974, Tukey 1977, Iglewicz & Hoaglin 1993, Leys et al. 2013); o corte 3,5 e a constante 0,6745 são os da literatura clássica, mas conferir a fonte antes de citar na tela.
- Risco: falso positivo em mercado que realmente subiu (patch, evento). Mitigação: o selo **marca**, não esconde nem corrige; a 065 mostra os dois valores.
- Risco: custo de requisições do histórico (limite ~180 req/min, 300 por 5 min, IDEIA-010 L6). Mitigação: teto `max=media` sem histórico e carga só do topo.
- Risco: série com dias ausentes tratada como zero distorce MAD; usar **só dias com dado**, como a 010 já decide.
- Os limiares da §3 marcados "decisão" precisam de aprovação do Gerente e entrar como constantes nomeadas (padrão D-034).

## 8. Fontes
- Respostas reais da API West em 2026-11-19: `…/stats/prices/T1_FACTION_MOUNTAIN_TOKEN_1,T4_METALBAR,T4_PLANKS,…?locations=…&qualities=1` e `…/stats/history/T4_MAIN_SWORD,T4_ARTEFACT_2H_ARCANESTAFF_HELL?locations=Caerleon&time-scale=24&qualities=1`.
- IDEIA-010 (história/liquidez), IDEIA-065 (preço realista e dados do Broadsword/Cajado), código `exits.js`, `history.js`, `liquidity.js`, `market.js`.
- Terceiros: https://albionsnipe.com/ (médias 7/30 dias), https://albionprofitforge.com/ ("Realistic Revenue"), https://lilmarket.io/guides/albion-crafting-profit-explained/ (preço fantasma), via 065; não reabertos aqui.
- Estatística (de memória, ver §7): Hampel (1974); Tukey (1977) *Exploratory Data Analysis*; Iglewicz e Hoaglin (1993); Leys et al. (2013), *J. Exp. Social Psychology*.

## 9. Confiança
**ALTA** nos campos da API e nos casos numéricos (dados reais e aritmética). **MÉDIA** na escolha MAD/corte 3,5 (literatura de memória). **Decisão de produto** em quase todos os limiares (24 h existente, 72 h, 7 dias, −50%, 25%, piso 5%, níveis do selo).
