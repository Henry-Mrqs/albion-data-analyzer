# IDEIA-038 — Corrigir CRAFT_CITY, incluir Brecilien e usar `@craftingcategory` do dump

## 1. O que faz e por que o jogador usa
A cidade que dá +15% de produção (RRR 24,8% em vez de 15,3%) depende da **categoria de craft** do item. O app mapeia a categoria errada em 4 de 6 cidades (AUDITORIA-001 §4.2) e atribui bolsa, capa e poção a Caerleon. Resultado: o crafter vê "bônus ativo" na cidade errada, ou o app não avisa quando o bônus existe. A correção é: ler `@craftingcategory` de cada item no `items.json`, gravar no catálogo e usar uma tabela `craftingcategory -> cidade` que é cópia fiel do `craftingmodifiers.xml`.

## 2. Regras de negócio (cada uma com fonte)

| # | Regra | Fonte |
|---|---|---|
| C1 | O jogo casa o bônus por **nome de modificador = `@craftingcategory` do item** (o comentário do XML diz "shopcategory ou subcategory", mas todos os modificadores usados existem como `@craftingcategory` nos itens; ex.: `offhand` não é subcategoria de loja, é craftingcategory de escudos, livros e tochas) | `craftingmodifiers.xml` e `items.json` (ao-bin-dumps, 2026-11-02; XML sem mudança desde 2024-01-08) |
| C2 | Bônus de especialização de craft = **+0,15** sobre a base **0,18** (PB 33 → RRR 24,812%) | `craftingmodifiers.xml` |
| C3 | **Item sem `@craftingcategory` não recebe nenhum bônus de especialização**: só a base 18 da cidade (e foco/diário). Vale para itens Royal (`*_ROYAL`), capas de cidade/facção (`CAPEITEM_*`), artefatos-fragmento, vanity | `items.json`: esses itens não têm o atributo; confere com o fato de o XML não ter modificador para eles |
| C4 | Dois itens com o mesmo nome de subcategoria podem ter `craftingcategory` diferente: `T4_2H_IRONGAUNTLETS_HELL` (loja: `weapons/knuckles`) tem `craftingcategory="dagger"` → Bridgewatch, enquanto os demais knuckles têm `knuckles` → Caerleon | `items.json` |
| C5 | Brecilien (clusterid 5000) tem base 18 e bônus +15 em `cape`, `bag`, `potion` | `craftingmodifiers.xml` |
| C6 | Confirmação independente da divisão por cidade (Thetford "Cloth Cowls", Lymhurst "Leather Shoes", Bridgewatch "Cloth Sandals", Martlock "Off-hands", Caerleon "War Gloves, Shapeshifter Staffs, Tools, Gathering Gear, Food", Brecilien "Capes, Bags, Potions") | AFM 2026-11-03 (atualizado 11-13) |

### Tabela canônica (cidade -> craftingcategory), cópia do XML
| Cidade | craftingcategory com +15 |
|---|---|
| Martlock | axe, quarterstaff, froststaff, plate_shoes, **offhand** |
| Thetford | mace, naturestaff, firestaff, leather_armor, cloth_helmet |
| Fort Sterling | hammer, spear, holystaff, plate_helmet, cloth_armor |
| Lymhurst | sword, bow, arcanestaff, leather_helmet, leather_shoes |
| Bridgewatch | crossbow, dagger, cursestaff, plate_armor, cloth_shoes |
| Caerleon | gatherergear, tools, food, knuckles, shapeshifterstaff |
| Brecilien | cape, bag, potion |
| (Rests, fora do app) Arthur: axe, crossbow, hammer, mace, sword, knuckles, plate_helmet, plate_armor, plate_shoes · Merlyn: bow, dagger, quarterstaff, spear, naturestaff, shapeshifterstaff, leather_helmet, leather_armor, leather_shoes · Morgana: arcanestaff, cursestaff, firestaff, froststaff, holystaff, cloth_helmet, cloth_armor, cloth_shoes | idem |

### Mapeamento por categoria do catálogo (`item.c` = `shopcategory/subcategoria`) -> craftingcategory -> cidade
Verificado em todos os itens T4 do dump (todos os T2-T8 seguem o mesmo padrão).

| `item.c` no catálogo | `@craftingcategory` | Cidade de bônus |
|---|---|---|
| weapons/sword, bow, arcanestaff | = subcategoria | Lymhurst |
| weapons/axe, quarterstaff, froststaff | = subcategoria | Martlock |
| weapons/mace, naturestaff, firestaff | = subcategoria | Thetford |
| weapons/hammer, spear, holystaff | = subcategoria | Fort Sterling |
| weapons/crossbow, dagger, cursestaff | = subcategoria | Bridgewatch |
| weapons/knuckles | `knuckles` (exceção C4: `T4_2H_IRONGAUNTLETS_HELL` = `dagger`) | Caerleon (exceção: Bridgewatch) |
| weapons/shapeshifterstaff | `shapeshifterstaff` | Caerleon |
| armors/plate_armor | plate_armor | Bridgewatch |
| armors/leather_armor | leather_armor | Thetford |
| armors/cloth_armor | cloth_armor | Fort Sterling |
| head/plate_helmet | plate_helmet | Fort Sterling |
| head/leather_helmet | leather_helmet | Lymhurst |
| head/cloth_helmet | cloth_helmet | Thetford |
| shoes/plate_shoes | plate_shoes | Martlock |
| shoes/leather_shoes | leather_shoes | Lymhurst |
| shoes/cloth_shoes | cloth_shoes | Bridgewatch |
| offhands/shieldtype, booktype, torchtype | `offhand` | Martlock (os três) |
| bags/bags, bags/satchels | `bag` | Brecilien |
| capes/accessoires_capes_capes | `cape` | Brecilien |
| capes/accessoires_capes_{bridgewatch, fortsterling, lymhurst, martlock, thetford, caerleon, brecilien, avalon, smuggler, heretic, undead, keeper, morgana, demon} (capas de cidade/facção) | **nenhum** | **nenhuma** (só base 18) |
| consumables/potions | `potion` | Brecilien |
| consumables/food | `food` | Caerleon |
| gathering/* (head, armor, shoes: `gatherergear`; ferramentas: `tools`) | gatherergear / tools | Caerleon (fora do catálogo atual, ver IDEIA-024) |
| armors/*, head/*, shoes/* terminados em `_ROYAL` | **nenhum** | **nenhuma** |
| artefacts/* (fragmentos e artefatos) | **nenhum** | **nenhuma** |

Regra de mapeamento exata: `bonusCity(item) = CITY_OF[item.cc]` onde `item.cc` é o `@craftingcategory` do item; `undefined` (ausente) → sem cidade de bônus (`null`). Não derivar de `item.c`.

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| `@craftingcategory` por item | `items.json` (ao-bin-dumps) → exportar como campo `cc` em `build-catalog.mjs` |
| Tabela `CITY_OF` | `craftingmodifiers.xml` (pode ser gerada por script a partir dele) |
| Cidade escolhida pelo usuário | input (precisa incluir Brecilien) |

## 4. Casos de teste (itens reais do dump)

| # | Item (id) | `item.c` no catálogo | `@craftingcategory` | Cidade correta | Hoje no código |
|---|---|---|---|---|---|
| 1 | `T4_MAIN_SWORD` (Broadsword) | weapons/sword | sword | **Lymhurst** | Lymhurst (ok) |
| 2 | `T4_ARMOR_CLOTH_SET1` | armors/cloth_armor | cloth_armor | **Fort Sterling** | Fort Sterling (ok) |
| 3 | `T4_HEAD_CLOTH_SET1` | head/cloth_helmet | cloth_helmet | **Thetford** | Lymhurst (**errado**) |
| 4 | `T4_SHOES_LEATHER_SET1` | shoes/leather_shoes | leather_shoes | **Lymhurst** | Bridgewatch (**errado**) |
| 5 | `T4_SHOES_CLOTH_SET1` | shoes/cloth_shoes | cloth_shoes | **Bridgewatch** | Thetford (**errado**) |
| 6 | `T4_OFF_BOOK` (Livro) | offhands/booktype | offhand | **Martlock** | Lymhurst (**errado**) |
| 7 | `T4_OFF_TORCH` (Tocha) | offhands/torchtype | offhand | **Martlock** | Bridgewatch (**errado**) |
| 8 | `T4_OFF_SHIELD` (Escudo) | offhands/shieldtype | offhand | **Martlock** | Martlock (ok) |
| 9 | `T4_BAG` (Bolsa) | bags/bags | bag | **Brecilien** | Caerleon (**errado**) |
| 10 | `T4_BAG_INSIGHT` (Satchel) | bags/satchels | bag | **Brecilien** | Caerleon (**errado**) |
| 11 | `T4_CAPE` (Capa) | capes/accessoires_capes_capes | cape | **Brecilien** | Caerleon (**errado**) |
| 12 | `T4_POTION_HEAL` | consumables/potions | potion | **Brecilien** | Caerleon (**errado**) |
| 13 | `T4_MEAL_SALAD` | consumables/food | food | **Caerleon** | Caerleon (ok) |
| 14 | `T4_2H_KNUCKLES_SET1` | weapons/knuckles | knuckles | **Caerleon** | Caerleon (ok) |
| 15 | `T4_CAPEITEM_FW_LYMHURST` (capa de Lymhurst) | capes/accessoires_capes_lymhurst | (ausente) | **nenhuma** (só base 18) | nenhuma (ok) |
| 16 | `T4_ARMOR_PLATE_ROYAL` (Armadura Real) | armors/plate_armor | (ausente) | **nenhuma**, mesmo sendo `plate_armor` na loja | **Bridgewatch (errado)**: o código usa `item.c` e dá +15 |
| 17 | `T4_2H_IRONGAUNTLETS_HELL` | weapons/knuckles | dagger | **Bridgewatch** | (item ausente do catálogo atual, ver §7) |

Números do caso 3 (Thetford vs Lymhurst): craft de `T4_HEAD_CLOTH_SET1` em Thetford: PB 18+15 = 33 → RRR **24,8120%**; em Lymhurst (onde o código manda): PB 18 → **15,2542%** (diferença 9,56 pontos). Com 8 recursos (receita de `T4_HEAD_CLOTH_SET1`, ver dump) a perda é 8 × 0,0956 = 0,77 unidades por craft.

## 5. Encaixe no projeto
- `scripts/build-catalog.mjs`: ler `it['@craftingcategory']` e gravar `cc` (string ou omitido).
- `catalog.js`: substituir `CRAFT_CITY` por tabela `CITY_OF[cc]` (7 cidades); `craftBonusCity(item)` recebe o item inteiro (hoje recebe `item.c`).
- `Crafting.jsx`: `CITIES` precisa incluir Brecilien; mercado/AODP já aceita Brecilien como location.
- Teste (IDEIA-001): tabela dos 17 casos acima como teste de unidade; teste de snapshot que compara `CITY_OF` com `craftingmodifiers.xml` baixado.
- Efeitos colaterais: o botão "Bônus de especialização ativo" muda de default em itens de 4 categorias; é o objetivo.

## 6. Fontes
- https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/craftingmodifiers.xml
- https://github.com/ao-data/ao-bin-dumps (items.json, consulta 2026-11-17)
- https://albionfreemarket.com/articles/view/albion-online-crafting-and-refining-city-bonuses (2026-11-03/13)
- AUDITORIA-001 §4

## 7. Confiança e observações
**ALTA** (dump oficial + AFM concordam). Observações do catálogo atual: (a) `T4_2H_IRONGAUNTLETS_HELL` não está no `catalog.json`; (b) os báculos metamorfos aparecem só como artefatos (`artefacts/weapons`), não como itens craftáveis; o catálogo não cobre `weapons/shapeshifterstaff`, que é Caerleon; (c) itens `*_ROYAL` estão no catálogo como `armors/plate_armor`, etc., e hoje herdam bônus indevido (caso 16).
