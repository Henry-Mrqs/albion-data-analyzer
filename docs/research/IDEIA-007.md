# IDEIA-007 — Lucro por hora: tempo de produção e fila

## 1. O que faz e por que o jogador usa
Dois itens com o mesmo lucro por craft podem ocupar a estação por tempos muito diferentes. A bancada é recurso limitado (tempo do jogador e fila). Funcionalidade: mostrar o **tempo de produção** do lote, **lucro por hora** de bancada e usar isso para ranquear (IDEIA-013) e comparar encantos (um item .1 rende mais por craft, mas pode render menos por hora). Não é regra nova de preço: é lucro dividido por tempo.

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| T1 | O dump traz tempo-base por receita: atributo `@time` em `craftingrequirements`, por tier e encanto. Exemplos (ao-bin-dumps 0483dd97, `items.json`): T4_MAIN_SWORD .0 = **1**, .1 = **1,5**, .2 = **2**, .3 = **2,5**, .4 = **3,75**; T5_MAIN_SWORD = 1,5; T6 = 2; T8 = 3,75; T4_2H_CLAYMORE = 1,333; T4_BAG = 0,667; T4_PLANKS = 0,04167 (=1/24); T5_PLANKS = 0,0625; T8_PLANKS = 0,15625; T4_PLANKS_LEVEL1 = 0,0625 | leitura direta do dump em cache (2026-11-18) | ALTA (o dado); **unidade NÃO VERIFICADA** |
| T2 | 138 itens craftáveis do dump **não têm** `@time` (3.918 de 4.056 têm; 768 têm `0`) | contagem no mesmo dump | ALTA (como fato do dump) |
| T3 | O `build-catalog.mjs` lê `@time` só para comparar variantes (`levelRecipes`, campo `t`), **não o exporta** para o catálogo; é preciso exportá-lo (por encanto, como o foco `ef`) | `scripts/build-catalog.mjs` | ALTA |
| T4 | Tempo real de craft no jogo depende de modificadores (ex.: estação, bônus) que **não** estão neste dossiê | — | NÃO VERIFICADO |
| T5 | Foco e RRR não alteram o tempo de craft | — | NÃO VERIFICADO (assumido; precisa conferir em jogo) |
| T6 | Tamanho da fila de produção, produção com o jogo fechado e vários itens simultâneos | — | NÃO VERIFICADO |
| T7 | Vender também leva tempo: `dias_para_vender = q/(vol_dia × fatia)` (IDEIA-010); o lucro por hora de **bancada** não inclui isso | `liquidity.js`/IDEIA-010 | produto |

Regra de produto (sem fonte de jogo): a unidade do `@time` não está confirmada, então o app usa o tempo do dump **só como proporção relativa** (comparar itens/encantos entre si) e aceita um **tempo real digitado** (o mostrado na janela de craft do jogo) como override, o mesmo padrão adotado para o foco em IDEIA-002.

Fórmulas:
```
tempo_lote      = tempo_craft × crafts            // tempo_craft = override do usuário, senão dump (relativo)
lucro_hora      = lucro_lote / tempo_lote_em_horas        // só com tempo real
lucro_por_tempo = lucro_craft / @time                      // índice relativo (unidade do dump)
estações em paralelo n: lucro_hora = n × lucro_hora_de_uma   // se o usuário informar n
```

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| `@time` por receita/encanto | dump -> `build-catalog.mjs` (exportar, ex. `tm` / `et[n]`) |
| Tempo real do craft e nº de estações | input do usuário (campo novo; auditor IDEIA-005) |
| Lucro por craft e crafts | `computeCraft` |

## 4. Exemplo numérico (caso de teste, conferível à mão)
1. **Relativo, sem unidade (dump real):** Broadsword T4 .0: lucro/craft 683,23 (caso IDEIA-002/048), `@time` 1 -> **683,23 por unidade de tempo**. O .1 com lucro hipotético 900 e `@time` 1,5 -> 900/1,5 = **600**. Por craft o .1 vence (900 > 683,23); por tempo o .0 vence (683,23 > 600).
2. **Absoluto (tempo digitado):** A: lote de 10 crafts, lucro 683,23 -> lote **6.832,30**; o jogador mede 2 h para o lote -> **3.416,15/h**. B (hipotético): lucro 400/craft, 10 crafts em 0,5 h -> lote 4.000 -> **8.000/h**. Ranking por lucro/craft: A > B; por lucro/hora: **B > A**.
3. **Paralelo:** com 2 estações no caso B -> 16.000/h (premissa do usuário; sem fonte).
4. Item sem `@time` no dump e sem override -> "sem dado de tempo", nunca `0` nem `∞`.

## 5. O que NÃO é verificado
- NÃO VERIFICADO: unidade do `@time` (horas? minutos? fator escalado). A razão entre os valores é consistente com o tier (T5/T4 = 1,5; T6/T4 = 2; T8/T4 = 3,75, igual à razão .1/.2/.4 do mesmo item), mas o valor absoluto não foi comparado com tempo medido em jogo.
- NÃO VERIFICADO: modificadores de tempo (estação, bônus, foco), fila máxima, craft offline.
- NÃO VERIFICADO: tempo de refino por recurso em cadeia (o `@time` de T4_PLANKS existe, 0,04167; somar à cadeia é decisão de produto).
- Pesquisa na web indisponível durante este dossiê (sem fonte externa/wiki consultada para T4–T6).

## 6. Riscos
1. Mostrar "lucro/hora" absoluto com unidade errada seria um número enganoso. Mitigar: sem override, só o índice relativo, com rótulo "por unidade de tempo do dump".
2. Lucro/hora de bancada ignora giro: item de lucro/hora altíssimo e baixo giro encalha (cruzar com `windowStats`; ver IDEIA-013).
3. Itens com `@time` 0 (768) ou ausente (138) entrariam como divisão por zero; tratar como "sem dado".
4. Campo novo de cfg precisa de `Var` no auditor (`registry.js`); o tempo ignorado de variáveis não modeladas entra como `not-considered`.

## 7. Desenho mínimo
- `build-catalog.mjs`: exportar `@time` por encanto (junto de `f`/`ef`); `catalog.js`: `timeOf(baseId, ench)` irmão de `focusOf` (null = sem dado); atualizar `catalogVersion` conforme o padrão do repo.
- `lib/profitRate.js` (puro): `profitPerHour({profit, crafts, hours})` e `profitPerTime({profit, time})`; sem rede.
- Craft: cartão "Tempo" com o override (campo salvo em `craft:cfg`), tempo do lote e lucro/hora; Refino igual; coluna opcional no ranking (IDEIA-013).
- Auditor: `Var` do tempo (origin `user`/`game`), kind `applied`, `affects: 'none'` se só informativo.
- Testes: casos 1–4 acima.

## 8. Fontes
- ao-bin-dumps commit 0483dd97f1581dfaf02eed42f25f5ea2a3cb75e5, `items.json` (`@time`, `@craftingfocus`), lido em cache 2026-11-18
- `scripts/build-catalog.mjs`; `client/src/lib/catalog.js` (`focusOf`); IDEIA-002, IDEIA-010, IDEIA-013

## 9. Confiança
**MÉDIA-BAIXA** no valor absoluto de tempo (unidade desconhecida); **ALTA** na existência e no valor relativo do dado do dump. Pergunta essencial: o dono consegue medir em jogo o tempo de 1 Broadsword T4 (e 1 prancha) para fechar a unidade?
