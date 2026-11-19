# IDEIA-068 — Receitas alternativas do refino com coração de facção (e receitas em lote do bloco de pedra)

## 1. O que faz e por que o jogador usa
O refino de T4 a T8 tem, no dump do jogo, uma **segunda receita** que troca **1 unidade do recurso bruto por 1 coração de facção** (`T1_FACTION_*_TOKEN_1`). A IDEIA-049 cobriu artefato/ficha de favor/Royal e deixou os refinados de fora (D-034 item 1); `build-catalog.mjs` marca esses casos como `ignored` e `parseRecipe` pega só a primeira receita, então o Refino e a cadeia do Craft **nunca consideram** essa receita. A funcionalidade: oferecer a receita com coração no Refino (e nas etapas de refino do Craft), com o preço do coração **digitado pelo usuário** (custo dele em pontos de facção), e dizer quando compensa.

Achado que muda a prioridade: no mercado (AODP, 2026-11-18/19) o coração custa **23 mil a 37 mil de prata**, e o bruto que ele substitui custa **cerca de 100 (T4) a 9.000 (T8)**. Comprando o coração no mercado, a receita com coração **nunca** compensa; ela só faz sentido para quem **ganha corações com pontos de facção** (custo de oportunidade próprio). Valor para o produto: baixo-médio, mas serve ao problema central (variável esquecida: o jogador que tem corações sobrando não vê a economia). A nota do Gerente (D-041) está certa: os "30 excluídos" são **25 refinados base + 5 capas `DEMON_BP`**; contando encantos, são **85 receitas**.

## 2. Regras de negócio (dump `ao-data/ao-bin-dumps`, commit `0483dd97f1581dfaf02eed42f25f5ea2a3cb75e5`, `items.json`)

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| R1 | Há **85 refinados com receita alternativa** (excluindo transmutação): PLANKS 20, METALBAR 20, LEATHER 20, CLOTH 20 (T4 a T8 x níveis 0, .1, .2, .3) e STONEBLOCK 5 (T4 a T8, só nível 0). O nível `.4` tem **uma** receita só. T1 a T3 não têm | contagem própria em `items.json` (script no scratchpad, filtrando `TRANSMUTE`) | ALTA |
| R2 | A receita com coração difere da base em **exatamente um ingrediente**: bruto `n` -> `n−1` e `+1 coração`; o refinado do tier anterior, foco, tempo, `@silver 0` e `@amountcrafted 1` **iguais** | dump | ALTA |
| R3 | A regra "1 madeira + 1 ficha + 1 tábua T3" do backlog vale **só no T4**; T5: 3 -> 2; T6: 4 -> 3; T7: 5 -> 4; T8: 5 -> 4 | dump | ALTA |
| R4 | Coração por tipo: PLANKS = `T1_FACTION_FOREST_TOKEN_1` (Coração Arbóreo / Treeheart); METALBAR = `..._MOUNTAIN_...` (Coração Montanhoso / Mountainheart); LEATHER = `..._STEPPE_...` (Coração Bestial / Beastheart); CLOTH = `..._SWAMP_...` (Coração Videira / Vineheart); STONEBLOCK = `..._HIGHLAND_...` (Coração Empedrado / Rockheart). `..._CAERLEON_...` (Shadowheart) não é usado em refino | dump (`items.json` e `formatted/items.json`) | ALTA |
| R5 | Descrição no dump: "A local resource which can be bought in <cidade> for Faction Points" (Treeheart em Lymhurst, Mountainheart em Fort Sterling, Beastheart em Bridgewatch, Vineheart em Thetford, Rockheart em Martlock; Shadowheart em Caerleon) | `formatted/items.json` | ALTA (texto do jogo); como se obtém na prática NÃO VERIFICADO |
| R6 | Os corações **não têm `@maxreturnamount="0"`** nas receitas de refino (nenhuma das 85): pelo dump, **retornam com o RRR**. (Nas receitas de capas de facção eles **têm** `maxreturnamount 0`.) Comportamento real no jogo | dump | dump ALTA; jogo **NÃO VERIFICADO** |
| R7 | O coração não tem `@itemvalue` no dump (catálogo: `vals = 0`). A taxa de bancada do refino do app usa o `itemvalue` do **refinado** (T4_PLANKS = 16), igual nas duas receitas; se o jogo calcula pelos ingredientes, a receita com coração teria outro valor | dump; AUDITORIA-001 §2 | app ALTA; jogo **NÃO VERIFICADO** |
| R8 | Foco: mesmo `@craftingfocus` nas duas (54, 94, 164, 287, 503 no nível 0; 94 a 880 em .1 etc.) | dump | ALTA |
| R9 | Preços AODP dos corações (West, `sell_price_min`, qualidade 1): Treeheart Fort Sterling 32.937 (2026-11-19 16:20); Mountainheart Fort Sterling 28.000 (11-18 22:05), Thetford 32.979, Lymhurst 35.890; Vineheart Thetford 30.997 (11-19 04:00); Rockheart Martlock 23.119 (11-18 23:25), Fort Sterling 27.892. Poucas células, dado esparso | consulta real | MÉDIA |

### 2.1 Lista exata (25 refinados base; encantados repetem a regra com `_LEVEL1..3` nos dois ingredientes e foco maior)
| Tier | PLANKS (madeira) | METALBAR (minério) | LEATHER (couro) | CLOTH (fibra) | STONEBLOCK (pedra) | anterior |
|---|---|---|---|---|---|---|
| T4 | 2 -> 1 + coração | 2 -> 1 | 2 -> 1 | 2 -> 1 | 2 -> 1 | 1 do T3 |
| T5 | 3 -> 2 | 3 -> 2 | 3 -> 2 | 3 -> 2 | 3 -> 2 | 1 do T4 |
| T6 | 4 -> 3 | 4 -> 3 | 4 -> 3 | 4 -> 3 | 4 -> 3 | 1 do T5 |
| T7 | 5 -> 4 | 5 -> 4 | 5 -> 4 | 5 -> 4 | 5 -> 4 | 1 do T6 |
| T8 | 5 -> 4 | 5 -> 4 | 5 -> 4 | 5 -> 4 | 5 -> 4 | 1 do T7 |
Ex.: `T4_PLANKS` = {2 `T4_WOOD` + 1 `T3_PLANKS`} **ou** {1 `T4_WOOD` + 1 `T1_FACTION_FOREST_TOKEN_1` + 1 `T3_PLANKS`}, foco 54, tempo 0,04167. `T8_PLANKS_LEVEL3` = {5 `T8_WOOD_LEVEL3` + 1 `T7_PLANKS_LEVEL3`} ou {4 `T8_WOOD_LEVEL3` + 1 coração + 1 `T7_PLANKS_LEVEL3`}, foco 2.694. O coração **não é encantado**: no encanto .3 a economia é um bruto .3 (mais caro), mas o coração custa o mesmo.

## 3. Segundo achado: receitas em lote do bloco de pedra (não são facção)
`T4..T8_STONEBLOCK` têm, além das duas acima, **3 receitas** com rocha encantada que rendem vários blocos por craft, usando o item base (não existe `STONEBLOCK_LEVEL1`):
`T4`: 2 `T4_ROCK_LEVEL1` + 2 `T3_STONEBLOCK` -> **2** blocos (tempo 0,08334); 2 `T4_ROCK_LEVEL2` + 4 `T3_STONEBLOCK` -> **4** (0,16668); 2 `T4_ROCK_LEVEL3` + 8 `T3_STONEBLOCK` -> **8** (0,33336); foco **54 por craft** em todas. Em T5 a T8 a rocha por craft é 3, 4, 5, 5 (mantém o padrão).
Por bloco (T4, .3): 0,25 rocha .3 + 1 `T3_STONEBLOCK` e foco 6,75, contra 2 rochas + 1 T3 e foco 54 da base. O app hoje trava `STONEBLOCK` em encanto 0 (`noEnch`) e usa só a 1ª receita: **ignora 15 receitas** (3 x 5 tiers). Comportamento no jogo (rocha encantada rende mais blocos): **NÃO VERIFICADO** fora do dump; o parser de 049 lançaria erro nesse formato (`amountcrafted` diferente), por isso precisa tratamento próprio. Recomendo **separar numa ideia 068b** ou decidir aqui; o impacto no foco e no RRR por unidade é grande.

## 4. O que o catálogo atual já tem e o que falta
Catálogo (`client/public/data/catalog.json`, built 2026-11-02, src = o commit acima):
- Cada refinado base (T4_PLANKS etc.) tem `r` (1ª receita, ex.: `[["T4_WOOD",2],["T3_PLANKS",1]]`), `er` por encanto (`{"1":[["T4_WOOD_LEVEL1",2],...]}`) e `ef` (foco por encanto). `x` = nº de encantos (4; STONEBLOCK 0). Existem **25** entradas base T4-T8 (+ T1 a T3).
- **Não tem** `alt` em nenhum refinado: `catalog.real.test.js` fixa "refinados NÃO têm alt (ficha de facção fica de fora)". O campo `alt` (`{at, v}`, 049) existe para artefato/Royal e `recipeAlt.js` (`variantLabel`, `pickCheapest`, `feeDecides`, `resolveVariant`) serve ao Craft.
- Os 6 corações **já estão em `extra`** e em `vals` (valor 0), vindos das capas de facção; `nameOf` resolve o nome pt-BR.
- `parseAlternatives` marca esses itens `ignored`; `altOf` exige 1 ingrediente diferente em **todos** os níveis (vale aqui: o diferente é bruto `n` vs `n−1` mais o coração, que na posição não bate -> **o formato atual de `alt` NÃO serve**, porque a variante muda **dois** ingredientes: a quantidade do bruto e a adição do coração).
Falta:
1. Formato novo (ex.: `alt2: {from:[idxBruto, n−1], add:[tokenId, 1]}` por tipo/tier, ou receita completa por nível em `ar[n]`) mantendo `r`/`er` intocados.
2. `build-catalog.mjs`: tratar refinados com regra própria (não pelo `altOf`), com verificação que **erra o build** se a hipótese R2 falhar (mesmo padrão da 049).
3. `refineUnit` (`econ.js`): aceitar variante (`ctx.variant`) e preço do coração como entrada; a rota "melhor" passa a comparar 3 opções por nível (comprar pronto, produzir normal, produzir com coração).
4. `materialPlan`/lista de compras: linha "coração" e `maxreturn` conforme R6 (**decisão**: tratar como retornável por padrão do dump e avisar NÃO VERIFICADO, como `returnBadge`).
5. UI: campo "custo do coração (prata)" digitado, **sem padrão** (como as despesas da 048); vazio = não oferecer a variante; botão opcional "usar preço de mercado" lendo `buyQuote` do id do coração.
6. Persistência (070): esquema do campo novo no `refine:cfg`/`craft:cfg`.
7. Estresse e auditor: o coração é custo variável/fixo? (preço do coração digitado = fixo; entra como linha em 005.)

## 5. Fórmulas
Custo por unidade (o que `refineUnit` faz hoje): `custo = (Σ qtd_i × preço_i) × (1 − RRR) + taxa`, `taxa = valor × 0,1125 × (feePer100/100)`.
Variante com coração, tier n, bruto `R`, refinado anterior `A`, coração `H`: `custo_H = ((R_n−1)×pR + pH + pA) × (1 − RRR) + taxa` se o coração retorna; se **não** retorna: `((R_n−1)×pR + pA) × (1 − RRR) + pH + taxa`.
Ponto de equilíbrio (coração retornável): compensa se `pH < pR` (o RRR cancela dos dois lados). Coração não retornável: `pH < pR × (1 − RRR)`.

## 6. Casos de teste (conferíveis à mão)
Preços de mercado reais 2026-11-19 (West). RRR do refino em cidade de bônus sem foco: PB 58 -> 58/158 = **36,7089%**, fator 1 − RRR = **0,632911**. Taxa 400 (padrão, não confirmado).

**Caso 1: `T4_PLANKS`, comprando o coração no mercado.** Fort Sterling: `T4_WOOD` 102 (11-19 14:20), `T3_PLANKS` 189 (14:20), Treeheart 32.937.
- Base: bruto 2 × 102 + 189 = **393**; líquido de RRR 393 × 0,632911 = **248,73**; taxa 16 × 0,1125 × 400/100 = **7,20** -> custo **255,93**.
- Com coração (retornável): (102 + 32.937 + 189) = **33.228**; × 0,632911 = **21.030,38**; + 7,20 = **21.037,58**. Diferença **+20.781,65** (pior). Isso é `(32.937 − 102) × 0,632911`.
- Equilíbrio: coração precisa custar menos que **102**.

**Caso 2: `T8_PLANKS`, coração "ganho" (custo digitado 0).** `T8_WOOD` Fort Sterling 9.095. Economia por unidade = 9.095 × 0,632911 = **5.756,33** (o coração retornável a custo 0 elimina 1 bruto). Com o coração a 32.937 a variante fica **+15.089,87** pior: (32.937 − 9.095) × 0,632911.

**Caso 3: coração não retornável (cenário de teste do parâmetro R6).** T4, `pH` = 0 digitado: `custo_H = (1×102 + 189) × 0,632911 + 0 + 7,20 = 184,18 + 7,20 = 191,38` contra base 255,93 -> economia **64,55**. Os dois cenários (retornável/não) devem estar em teste, porque R6 é NÃO VERIFICADO.

**Caso 4 (parser):** `T4_PLANKS` -> 2 receitas; `T4_PLANKS_LEVEL4` -> 1; `T3_PLANKS` -> 1; `T8_CLOTH_LEVEL3` -> 2 (`T8_FIBER_LEVEL3` 5 -> 4 + `T1_FACTION_SWAMP_TOKEN_1`); `T4_STONEBLOCK` -> **5** (2 facção/base + 3 lote); total de refinados com 2+ receitas não-transmutação: 85. Invariante verificável: em todo par base/facção, `foco`, `tempo`, `amountcrafted` iguais; bruto `n−1`; refinado anterior igual.

**Caso 5 (taxa):** `T4_PLANKS` valor 16 nas duas variantes no app -> taxa idêntica (7,20 por unidade, `roundFee` só no lote). Em lote de 100: 7,20 × 100 = **720**.

**Caso 6 (foco):** `T4_PLANKS` 54 pontos nas duas; sem eficiência de foco (0), 100 crafts = 5.400 pontos (a economia por ponto da 002 não muda entre variantes).

## 7. Encaixe no projeto
`scripts/build-catalog.mjs` (novo ramo para refinados), `catalog.js::recipeOf/recipeVariants` (hoje só `alt` de 049), `econ.js::refineUnit/materialPlan`, `craftPlan.js` (cadeia de refino do Craft usa `refineUnit`), `refinePlan.js::compareRoutes`, `Refining.jsx`, `inputRules.js` (validação do preço do coração), `persistSchemas.js`. Interage com 049 (formato `alt`), 002 (foco igual), 048 (despesas: preço do coração é do usuário), 005 (auditor: linha "coração: padrão ausente"), 012 (preço do coração é esparso: 1 a 3 cidades), 070 e 060.

## 8. NÃO VERIFICADO e riscos
- Se o coração **retorna** no RRR (R6) e como o jogo calcula a taxa com o coração (R7).
- Como os corações são obtidos e o "custo" em pontos de facção: não há conversão em prata; por isso o preço é **entrada do usuário**.
- Os 5 itens `*_CAPEITEM_DEMON_BP` aparecem como "multi sem alt" no catálogo atual (2 receitas: uma de `T4_RUNE x50`, outra vazia, dump); **não** são refinados nem facção e ficam fora desta ideia (esquisitice do dump).
- Receitas em lote do bloco de pedra (§3): comportamento no jogo e tela necessária.
- Risco de ruído: 85 receitas que quase nunca compensam no mercado; mitigação: variante só aparece com custo do coração digitado.
- Dump de 2026-11-02; reconferir se o jogo mudou receitas de refino depois (nenhum patch de 2026 que eu tenha achado mexe em refino, AUDITORIA-001).

## 9. Fontes
- ao-bin-dumps `items.json` e `formatted/items.json`, commit `0483dd97f1581dfaf02eed42f25f5ea2a3cb75e5`: https://github.com/ao-data/ao-bin-dumps
- AODP, 2026-11-18/19: `https://west.albion-online-data.com/api/v2/stats/prices/T1_FACTION_FOREST_TOKEN_1,T1_FACTION_MOUNTAIN_TOKEN_1,T4_PLANKS,T4_WOOD,T3_PLANKS,T8_WOOD,…?locations=Martlock,Thetford,Fort%20Sterling,Lymhurst,Bridgewatch,Caerleon&qualities=1`
- Código: `scripts/build-catalog.mjs` (`parseAlternatives`, `altOf`, `ignored`), `client/src/lib/{econ,recipeAlt,catalog}.js`, `catalog.real.test.js` (teste "refinados NÃO têm alt").
- IDEIA-049, AUDITORIA-001 §2, `docs/manager/decisoes.md` D-034 e D-041.

## 10. Confiança
**ALTA** para a estrutura (85 receitas, regra n−1 + coração, lista por tier) e para a aritmética. **MÉDIA** para os preços (células esparsas). **NÃO VERIFICADO** o retorno do coração, a taxa de bancada com ele e as receitas em lote de pedra no jogo.
