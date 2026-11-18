# IDEIA-039 — "Não retorna recursos" lido por ingrediente do dump (`maxreturnamount`)

## 1. O que faz e por que o jogador usa
O RRR só devolve ingredientes que o jogo permite devolver. Artefatos, tokens, a peça-base de itens Royal e capas etc. são sempre consumidos. O app decide isso por regex no id (`/ARTEFACT|ARTIFACT|RUNE|SOUL|RELIC|SHARD/`), que erra para vários casos (AUDITORIA-001 §5). A correção: o `items.json` marca cada ingrediente com `@maxreturnamount="0"` quando ele não pode retornar; o catálogo passa a gravar esse flag por ingrediente, sem heurística. Efeito para o jogador: custo de itens Royal, capas, itens de artefato e bolsa Satchel deixa de ficar subestimado (o app hoje aplica RRR a ingredientes que não retornam).

## 2. Regras de negócio

| # | Regra | Fonte |
|---|---|---|
| M1 | Um `<craftresource>` com `@maxreturnamount="0"` nunca retorna; sem o atributo, o ingrediente é elegível ao RRR. (Semântica "ausente = retorna" inferida: todas as 9.958 ocorrências do atributo no dump valem `"0"`, e os exemplos de retorno de barras/couro/tecido/pranchas, que não têm o atributo, batem com os cálculos da AFM) | `items.json` (ao-bin-dumps, 2026-11-02), contagem própria; AFM 2026-07-17 (100 crafts, retorno só de barras e couro) |
| M2 | Artefatos de arma/off-hand/elmo/armadura/botas e fichas de favor (`ARTEFACT_TOKEN_FAVOR_*`) nunca retornam | dump; wiki (trecho): "artefatos são sempre consumidos" |
| M3 | A peça-base consumida na criação de itens `*_ROYAL` (`T4_ARMOR_PLATE_SET1/2/3`, etc.) e o `QUESTITEM_TOKEN_ROYAL_Tn` não retornam | dump |
| M4 | Em capas de cidade/facção, a capa-base `T4_CAPE`, o blueprint `*_BP` e o token `FACTION_*_TOKEN_1` não retornam | dump |
| M5 | `T4_SKILLBOOK_STANDARD` (Satchel/Insight) não retorna, mas as 8 telas + 8 couro da `T4_BAG_INSIGHT` retornam | dump |
| M6 | Fragmentos: `RUNE/SOUL/RELIC/SHARD_AVALONIAN` **retornam** quando usados como ingrediente na receita de artefatos (sem flag), e **não retornam** quando são ingredientes da criação do próximo fragmento (flag = 0) | dump (ver itens abaixo) |
| M7 | Itens com duas receitas alternativas (artefato **ou** ficha de favor) têm o flag nas duas | dump (T4_2H_ARCANESTAFF_HELL) |
| M8 | Receita única aparece como objeto; várias como array (ver "formato") | dump |

### Formato exato no `items.json`
Tudo é prefixado com `@` (conversão XML→JSON). Em `craftingrequirements` e `craftresource`, **um elemento vira objeto, vários viram array** (o `build-catalog.mjs` já normaliza com `arr()`). O atributo é string `"0"`.

Exemplo A, receita comum (sem flag), `T4_MAIN_SWORD`:
```json
"craftingrequirements": { "@silver": "0", "@time": "1", "@craftingfocus": "1286",
  "craftresource": [ { "@uniquename": "T4_METALBAR", "@count": "16" },
                     { "@uniquename": "T4_LEATHER",  "@count": "8"  } ] }
```
Exemplo B, artefato, `T4_2H_ARCANESTAFF_HELL` (duas receitas alternativas: array de `craftingrequirements`):
```json
"craftingrequirements": [
  { "@silver":"0","@time":"1.333","@craftingfocus":"1715","craftresource":[
      {"@uniquename":"T4_PLANKS","@count":"20"},
      {"@uniquename":"T4_METALBAR","@count":"12"},
      {"@uniquename":"T4_ARTEFACT_2H_ARCANESTAFF_HELL","@count":"1","@maxreturnamount":"0"} ] },
  { "@craftingfocus":"1715","@time":"1.333","craftresource":[
      {"@uniquename":"T4_PLANKS","@count":"20"},
      {"@uniquename":"T4_METALBAR","@count":"12"},
      {"@uniquename":"T4_ARTEFACT_TOKEN_FAVOR_2","@count":"1","@maxreturnamount":"0"} ] } ]
```
O atributo também aparece em receitas encantadas (`enchantments/enchantment[n]/craftingrequirements`): `T4_2H_ARCANESTAFF_HELL` .1 usa `T4_PLANKS_LEVEL1`, `T4_METALBAR_LEVEL1` (retornam) e o artefato com `@maxreturnamount:"0"`.

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| flag `noReturn` por ingrediente | `@maxreturnamount === "0"` no `items.json` |
| Receita escolhida (qual das alternativas) | ver IDEIA-049 (hoje o catálogo usa só a 1ª) |

## 4. Exemplos reais e casos de teste

**Não retornam (flag = 0)**
| Item | Receita (do dump) | Ingrediente sem retorno |
|---|---|---|
| `T4_2H_ARCANESTAFF_HELL` | 20 `T4_PLANKS` + 12 `T4_METALBAR` + 1 artefato | `T4_ARTEFACT_2H_ARCANESTAFF_HELL` (alt.: `T4_ARTEFACT_TOKEN_FAVOR_2`) |
| `T4_OFF_SHIELD_HELL` | 4 `T4_PLANKS` + 4 `T4_METALBAR` + 1 artefato | `T4_ARTEFACT_OFF_SHIELD_HELL` (alt.: `T4_ARTEFACT_TOKEN_FAVOR_2`) |
| `T6_2H_DUALSCIMITAR_UNDEAD` | 20 `T6_METALBAR` + 12 `T6_LEATHER` + 1 artefato | `T6_ARTEFACT_2H_DUALSCIMITAR_UNDEAD` (alt.: `T6_ARTEFACT_TOKEN_FAVOR_3`) |
| `T4_ARMOR_PLATE_ROYAL` | 1 `T4_ARMOR_PLATE_SET1` + 4 `QUESTITEM_TOKEN_ROYAL_T4` (também variantes SET2 e SET3) | `T4_ARMOR_PLATE_SET1` (base) **e** o token |
| `T4_HEAD_PLATE_ROYAL` | 1 `T4_HEAD_PLATE_SET1` + 2 `QUESTITEM_TOKEN_ROYAL_T4` | base e token |
| `T4_CAPEITEM_FW_BRIDGEWATCH` | 1 `T4_CAPE` + 1 `T4_CAPEITEM_FW_BRIDGEWATCH_BP` + 1 `T1_FACTION_STEPPE_TOKEN_1` | os três |
| `T4_BAG_INSIGHT` | 8 `T4_CLOTH` + 8 `T4_LEATHER` + 1 `T4_SKILLBOOK_STANDARD` | `T4_SKILLBOOK_STANDARD` |

**Retornam normalmente (sem flag)**
| Item | Receita | RRR se aplica a |
|---|---|---|
| `T4_MAIN_SWORD` | 16 `T4_METALBAR` + 8 `T4_LEATHER` | tudo |
| `T4_BAG` / `T4_CAPE` | 8 `T4_CLOTH` + 8 `T4_LEATHER` / 4 + 4 | tudo |
| `T4_POTION_HEAL` | 24 `T4_BURDOCK` + 6 `T3_EGG` | ervas e ovos (no dump não há flag; a política de retorno de poção no jogo é NÃO VERIFICADA, ver IDEIA-046) |

**Caso numérico (revisor refaz à mão):** `T4_OFF_SHIELD_HELL`, craft em Martlock (offhand, PB 33 → RRR 24,8120%), preços hipotéticos prancha 100, barra 200, artefato 5.000:
- Ingredientes retornáveis: 4×100 + 4×200 = **1.200**; líquido = 1.200 × 0,751880 = **902,26**.
- Artefato: **5.000** (sem retorno). Custo de material = 5.902,26.
- Regra do código atual (regex) também dá 5.902,26 aqui, pois `ARTEFACT` está no padrão.
- Item `T4_ARMOR_PLATE_ROYAL` em Bridgewatch: com o regex atual, `T4_ARMOR_PLATE_SET1` (preço hipotético 3.000) e 4 tokens (preço 500 cada = 2.000) recebem RRR 24,8120% (e o bônus de cidade indevido, ver IDEIA-038): custo = (3.000 + 2.000) × 0,751880 = **3.759,40**. Com o flag, nada retorna: custo = **5.000**. Erro de subestimação do código atual: **1.240,60 (24,8%)**.

## 5. Encaixe no projeto
- `build-catalog.mjs`: em `parseRecipe`, gravar o terceiro elemento `nr: 1` quando `@maxreturnamount === "0"` (ex.: `[id, count, 1]`). Recomendo array de flags para manter o JSON pequeno.
- `catalog.js` (`recipeOf`): `returnable = !nr`, removendo o regex. Sem alterar `Crafting.jsx` (já usa `r.returnable`).
- Teste: os 7 itens "não retornam" e 3 "retornam" acima como casos de unidade; teste de contagem: nenhum ingrediente que case com o regex antigo e não tenha flag, exceto os fragmentos de M6.
- Depende de IDEIA-049 (receitas alternativas) para itens com artefato/ficha.

## 6. Fontes
- ao-bin-dumps `items.json`, 2026-11-02 (contagem: 9.958 ocorrências de `"@maxreturnamount": "0"`): https://github.com/ao-data/ao-bin-dumps
- Wiki oficial Resource return rate (403 no fetch; trecho de busca)
- https://albionfreemarket.com/articles/view/how-resource-return-rate-is-calculated-in-albion-online (2026-07-17)
- AUDITORIA-001 §5

## 7. Confiança
**MÉDIA-ALTA.** O dado está no arquivo do jogo e é consistente. A única inferência é "atributo ausente = elegível a retorno" (suportada pelos casos de barra/couro e pelos exemplos da AFM). Poções/comida e ingredientes de fazenda: o dump não marca, mas não há fonte de wiki sobre retorno nesses casos; manter NÃO VERIFICADO.
