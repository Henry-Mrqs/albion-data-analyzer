# IDEIA-049 — Receitas alternativas (artefato **ou** ficha de favor; base Royal SET1/2/3) e escolha da mais barata

## 1. O que faz e por que o jogador usa
Muitos itens têm **mais de uma receita válida** no jogo: a de artefato (artefato dropado) e a de ficha de favor (`ARTEFACT_TOKEN_FAVOR_n`, comprada); os itens Royal aceitam três peças-base diferentes. O catálogo atual lê só a **primeira** receita (`arr(cr)[0]` em `build-catalog.mjs`), então: (a) o app nunca considera a alternativa mais barata; (b) para itens Royal assume sempre a peça `SET1`. O jogador que paga por artefato pode estar ignorando que a ficha de favor sai mais barata (ou o inverso). A funcionalidade: oferecer as receitas alternativas e marcar a mais barata com os preços atuais.

## 2. Regras de negócio

| # | Regra | Fonte |
|---|---|---|
| A1 | No `items.json`, `craftingrequirements` é **array** quando há mais de uma receita; cada elemento tem seu `craftresource` | `items.json` (ao-bin-dumps, 2026-11-02) |
| A2 | Contagem no dump (todos os tiers): 560 itens com receitas alternativas contendo `ARTEFACT` (artefato ou ficha de favor), 45 itens `*_ROYAL` (SET1/SET2/SET3), 218 outros (resíduos: `T1_FISHCHOPS` com 41 receitas, recursos brutos/encantados com 2 receitas de **transmutação**, ver IDEIA-050) | contagem própria em `items.json` |
| A3 | Receitas de artefato têm **mesmo foco, tempo e demais ingredientes**; só muda o item sem retorno (artefato vs `ARTEFACT_TOKEN_FAVOR_n`, n=1..4 por tier de raridade) | `items.json` (T4_2H_ARCANESTAFF_HELL: ambas `@craftingfocus 1715`, `@time 1.333`) |
| A4 | Ambos (artefato e ficha) têm `@maxreturnamount="0"`: não retornam (ver IDEIA-039) | `items.json` |
| A5 | `ARTEFACT_TOKEN_FAVOR_1..4` e os artefatos têm id de mercado no AODP (ex. `T4_ARTEFACT_TOKEN_FAVOR_2`, `T4_ARTEFACT_2H_ARCANESTAFF_HELL`) | consulta real à API 2026-11-18 |
| A6 | Itens Royal: cada variante exige 1 peça-base distinta (`T4_ARMOR_PLATE_SET1`, `_SET2` ou `_SET3`) + `QUESTITEM_TOKEN_ROYAL_Tn` (4 na armadura, 2 no elmo/botas conforme o dump); sem foco (`@craftingfocus 0`) | `items.json` (T4_ARMOR_PLATE_ROYAL, T4_HEAD_PLATE_ROYAL) |
| A7 | A receita por encanto repete a estrutura (ex. T4_2H_ARCANESTAFF_HELL .1 tem as duas variantes com `*_LEVEL1`) | `items.json` |

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| Lista de receitas por item/encanto | dump (precisa mudar o parser: guardar todas, não só a primeira) |
| Preço de cada ingrediente variável | API AODP |
| Preferência do usuário (forçar uma receita) | input |

## 4. Exemplo numérico (caso de teste)
Item `T4_2H_ARCANESTAFF_HELL` (Cajado Oculto do Adepto), receita: 20 `T4_PLANKS` + 12 `T4_METALBAR` + (A) 1 `T4_ARTEFACT_2H_ARCANESTAFF_HELL` **ou** (B) 1 `T4_ARTEFACT_TOKEN_FAVOR_2`. Foco 1.715 nas duas.
Preços reais (API West, `sell_price_min`, qualidade 1, consulta 2026-11-18): artefato 1.840 (Caerleon, 2026-11-17 15:00); ficha de favor 18.498 (Martlock, 2026-11-17 16:55).
1. Materiais comuns iguais nas duas: 20 pranchas e 12 barras (retorno RRR normal; mesmo valor).
2. Custo do ingrediente especial: A = **1.840**; B = **18.498**. Diferença **16.658** a favor de A.
3. Taxa de bancada: valor de item inclui o ingrediente especial? NÃO VERIFICADO (AUDITORIA-001 §2); se incluir, o artefato tem item value 384 e a ficha tem outro valor (a conferir no dump) — a escolha da receita pode mudar a taxa.
4. O app atual usa só a receita A (1ª do array). Para itens cuja ficha de favor seja mais barata, o app superestimaria o custo.
Caso Royal: `T4_ARMOR_PLATE_ROYAL` tem três receitas (SET1, SET2, SET3 + 4 tokens); o app usa só SET1. O teste: para os preços de SET1, SET2, SET3 (a consultar), a receita mais barata é `min(SET1, SET2, SET3) + 4 × token`.

Teste de contagem do parser: `T4_2H_ARCANESTAFF_HELL` -> 2 receitas; `T4_ARMOR_PLATE_ROYAL` -> 3 receitas; `T4_MAIN_SWORD` -> 1.

## 5. Encaixe no projeto
- `build-catalog.mjs`: `parseRecipe` devolver array de receitas (campo `alt`), mantendo `r` como a primeira para compatibilidade.
- `Crafting.jsx`: seletor "Receita" quando `alt.length > 1`, com "mais barata agora" calculada via `buyQuote`.
- Interage com IDEIA-039 (flag de retorno) e IDEIA-042 (Itens Royal).

## 6. Fontes
- ao-bin-dumps `items.json`: https://github.com/ao-data/ao-bin-dumps
- AODP preços: `https://west.albion-online-data.com/api/v2/stats/prices/T4_ARTEFACT_2H_ARCANESTAFF_HELL,T4_ARTEFACT_TOKEN_FAVOR_2?locations=Caerleon,Lymhurst,Martlock&qualities=1` (2026-11-18)
- Albion Free Market (opção "Recipe Route" por item): https://albionfreemarket.com/crafting
- Código: `scripts/build-catalog.mjs` (linha `arr(cr)[0]`)

## 7. Confiança
**ALTA** para a estrutura (dado do jogo). **MÉDIA** para a comparação de preço (preços de mercado são esparsos: a ficha de favor foi vista numa só cidade). Pendente: como a taxa de bancada e o foco tratam o ingrediente especial (NÃO VERIFICADO).
