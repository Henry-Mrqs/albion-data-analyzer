# AUDITORIA-001 — Constantes e fórmulas em produção (D-008)

Pesquisador, 2026-11-17/18. Código auditado: `client/src/lib/econ.js` e `client/src/lib/catalog.js` (master, commit `0ef410a`).

## 0. Resumo executivo (divergências, da mais grave para a menos)

| # | Item | Veredito | Gravidade |
|---|---|---|---|
| 1 | Tabela `CRAFT_CITY` (cidade de bônus de craft) | **DIVERGE em 4 das 6 linhas** (só Fort Sterling confere; Martlock é parcial) | ALTA: o app marca "bônus de especialização" na cidade errada e some com +15% de produção (RRR 24,8% vs 15,3%) |
| 2 | Brecilien ausente; bolsas/capas/poções atribuídas a Caerleon | **DIVERGE** | ALTA: o jogo dá bolsa, capa e poção em Brecilien, não em Caerleon |
| 3 | Taxa de bancada: arredondamento por unidade antes de multiplicar por nº de crafts | **DIVERGE (menor)** | MÉDIA: erro de até ~0,5 prata × crafts; em 100 crafts com taxa baixa chega a ~0,5% |
| 4 | Taxa de bancada: valor do artefato e `amountcrafted` > 1 (poções, comidas) | **NÃO VERIFICADO** | MÉDIA: pode superestimar a taxa de itens de artefato |
| 5 | Regex de "não retorna" (`ARTEFACT\|ARTIFACT\|RUNE\|SOUL\|RELIC\|SHARD`) | **DIVERGE** (faltam tokens, capa-base, `_SET*` de armadura base, `_BP`; sobra RUNE/SOUL/RELIC/SHARD) | MÉDIA |
| 6 | RRR base 18 aplicado a qualquer local | CONFERE para cidades reais; **DIVERGE** para Rests (refino 15), ilhas (0), hideouts | BAIXA hoje (app só tem 6 cidades) |
| 7 | Bônus diário só vale no refino, não no craft | **LACUNA** (o jogo aplica +10/+20 também a categorias de craft) | MÉDIA |
| 8 | RRR (fórmula, 18/40/15/59, +10/+20), imposto 4%/8%, setup 2,5%, 0,1125, cidades de refino | **CONFERE** | — |

Fonte primária principal desta auditoria: os **dumps oficiais do jogo** (`ao-data/ao-bin-dumps`, último commit 2026-11-02; `craftingmodifiers.xml` sem alteração desde 2024-01-08). O wiki oficial (wiki.albiononline.com) devolveu HTTP 403 ao meu cliente em todas as tentativas; só vi trechos dele via resultados de busca, e isso está marcado em cada fonte. Nenhum patch de 2026 que eu tenha encontrado altera economia de craft/refino (a atualização Radiant Wilds, 13/04/2026, "não retrabalhou craft nem refino", segundo albionmarket.gg).

---

## 1. Fórmula do RRR e seus componentes

**Código:** `rrr = PB/(100+PB)`, `PB = 18 + (specialty ? (refine ? 40 : 15) : 0) + (focus ? 59 : 0) + daily`.

| Componente | Código | Segundo as fontes | Veredito |
|---|---|---|---|
| Fórmula | PB/(100+PB) | Wiki (trecho de busca): `1 - 1/(1 + PB/100)` = algebricamente idêntica. AFM 2026: "Return rate = Production bonus / (100 + Production bonus)" | **CONFERE** |
| Base cidade real | 18 | Dump: `<refiningbonus value="0.18">` e `<craftingbonus value="0.18">` em Thetford, Lymhurst, Bridgewatch, Martlock, Fort Sterling, Caerleon, Brecilien | **CONFERE** |
| Bônus de cidade de refino | +40 | Dump: `<craftingmodifier name="ore\|fiber\|rock\|hide\|wood" value="0.40">` na cidade do recurso | **CONFERE** |
| Bônus de cidade de craft | +15 | Dump: modifiers de item = `0.15` | **CONFERE** |
| Foco | +59 | Wiki oficial (trecho de busca): foco soma 59; AFM 2026: "Focus adds 59 points"; albionmarket.gg 2026: "+0,59". **Não está no dump** (regra do servidor) | **CONFERE** (confiança MÉDIA-ALTA) |
| Bônus diário | +10 ou +20 | AFM 2026-11: 2 bônus/dia/servidor, cada um +10% ou +20% numa categoria; versão de 10% é 9x mais provável; reset na manutenção (10:00 UTC Américas/Europa, 23:00 UTC Ásia). Soma-se a cidade e foco | **CONFERE** |

**Valores de referência do prompt (15,2 / 24,8 / 36,7 / 53,9): conferem**, com mais casas:

| Cenário | PB | RRR exato |
|---|---|---|
| Base (cidade sem bônus) | 18 | 15,2542% |
| Craft em cidade de bônus | 33 | 24,8120% |
| Refino em cidade de bônus | 58 | 36,7089% |
| Foco, sem bônus | 77 | 43,5028% |
| Craft, cidade de bônus + foco | 92 | 47,9167% |
| Refino, cidade de bônus + foco | 117 | 53,9171% |
| Craft, bônus + foco + dia +20 | 112 | 52,8302% (bate com o exemplo da AFM) |
| Refino, bônus + foco + dia +20 | 137 | 57,8059% (bate com exemplo "57,8%" do guia heaven-guardian/AFM) |
| Rest (Outlands), refino sem foco | 15 | 13,0435% (AFM: "13,0%") |

Atenção: o site `albion-8l9.pages.dev` publica uma tabela confusa (24,8/47,9 rotulado "Royal City with Bonus" para craft e 36,7/53,9 como "Farming"); é fonte fraca, não usar. As demais fontes concordam entre si.

**Divergências de escopo (código assume 18 sempre):**
- Rests de Outlands (Arthur/Merlyn/Morgana): `refiningbonus 0.15` (dump) -> RRR de refino 13,04%, craft base 18. O app só tem as 6 cidades, então não afeta hoje (afeta IDEIA-025).
- Ilha real: `islandvalue 0` (dump) -> sem os 18. Hideouts: `refiningbonus 0.15` + modificador de craft 0,01 a 0,26 por qualidade do cluster (dump), sem `craftingbonus` de base.
- Estradas (TNL-*): refino +10 só de `hide`/`fiber` etc. (dump). Irrelevante hoje.

**Lacuna:** `Crafting.jsx` passa `daily` apenas ao RRR de refino dos materiais; o RRR do craft final não aceita bônus diário, embora o jogo sorteie bônus diário também para categorias de armas/armaduras/off-hands/ferramentas/comida/poção/bolsa/capa (AFM 2026-11).

Fontes: S1 (dump craftingmodifiers), S4 (AFM RRR), S5 (AFM cidades/diário), S6 (albionmarket.gg), S9 (wiki trecho). Confiança: **ALTA** (fórmula, 18, 40, 15), **MÉDIA-ALTA** (59, diário).

---

## 2. Taxa de uso da bancada

**Código:** `Math.round(valor × 0,1125 × taxa/100)`; no craft `valor = Σ(valor_ingrediente × qtd)`; no refino `valor = itemvalue do refinado` (com fallback à receita).

**Fontes:**
- Patch "Lands Awakened" (24/11/2021, dev PrintsKaspian): "Nutrition Cost = Item Value × 0.1125"; taxa agora é "silver per 100 Nutrition consumed"; 1% da taxa antiga = 44,44 na nova.
- AFM (10/09/2026, atualizado 19/09/2026): `Nutrição = ItemValue × 0,1125 × itens craftados`; `Taxa = Nutrição × taxa/100`; "Item Value" de equipamento = soma (valor do ingrediente × qtd); preço de mercado não entra; arredondar só no fim. Exemplo: Adept's Broadsword T4 = 16 barras + 8 couro, valor 16 cada: (16×16)+(8×16) = **384**; nutrição 43,2; taxa 100 = 43,2 / 500 = 216 / 1000 = 432; 100 crafts a 500 = 21.600. Foco não reduz a taxa. T1/T2 isentos.
- albionmarket.gg (11/07/2026): "soma de cada ingrediente x qtd, dividida pela quantidade produzida; dobra a cada tier/encanto".
- Dump `items.json` (2026-11-02): `@itemvalue` existe só em recursos (T4 prancha 16, T5 32, T6 64, T7 128, T8 256; bruto T4 = 4) e artefatos (T4_ARTEFACT_2H_ARCANESTAFF_HELL = 384). Equipamento **não** tem `@itemvalue` no dump, então o valor é calculado pela receita.

**Verificação do refino:** `T4_PLANKS` tem itemvalue 16; a receita é 2×T4_WOOD(4) + 1×T3_PLANKS(8) = 16 (confere). T5: 3×5,34 + 16 = 32,02 ≈ 32. Logo usar o `itemvalue` do refinado ou a soma dos ingredientes dá o mesmo.

| Ponto | Veredito |
|---|---|
| 0,1125 e `taxa/100` | **CONFERE** |
| Valor = soma dos ingredientes (equipamento comum) | **CONFERE** (exemplo 384) |
| Refino usa itemvalue do refinado | **CONFERE** (igual à soma) |
| Arredondar por unidade e depois × crafts (`stationFee(...) × crafts`, `unit.fee × n`) | **DIVERGE (menor).** AFM: arredondar só no total. Ex.: Broadsword, taxa 100, 100 crafts: código 43×100 = 4.300; correto 4.320 |
| Valor do **artefato** entra na soma? (código inclui) | **NÃO VERIFICADO.** T4 Cajado Arcano (Hell): 20 pranchas + 12 barras = 512; com artefato (384) = 896. Taxa a 500: 288 vs 504. Precisa conferir no jogo (tooltip "Item Value" do item) |
| Itens com `amountcrafted` > 1 (poção 5 ou 10, comida 10, flechas) | **NÃO VERIFICADO.** albionmarket.gg diz "dividida pela quantidade produzida"; AFM diz que escala por "itens craftados" sem detalhar. Código cobra a soma por ação de craft |
| Comidas e poções | **NÃO VERIFICADO.** O patch de 2021 diz que o foco de comida/poção é baseado na **nutrição** dos ingredientes; o dump tem `@nutrition` em comidas (T4_MEAL_SALAD = 252) |

Confiança: **ALTA** na fórmula, **BAIXA** nos três pontos NÃO VERIFICADOS. Pedir ao usuário uma conferência em jogo (tooltip de item de artefato e de uma poção) antes de IDEIA-019.

---

## 3. Imposto de venda e setup fee

**Código:** `salesTax = premium ? 4% : 8%`; `SETUP_FEE = 2,5%`; venda por ordem = preço × (1 - imposto - 2,5%); venda instantânea (em ordem de compra) = preço × (1 - imposto); compra por ordem = preço × 1,025.

**Fontes:**
- Wiki oficial "Marketplace" (só trecho de busca; 403 no meu fetch; página ~287 dias antiga): setup fee de 2,5% do preço listado, pago ao criar **ou atualizar** ordem de compra ou venda; imposto de transação de 8% do preço final, cobrado na venda concluída; Premium paga 4%; ordem cancelada não devolve o setup fee.
- Patch notes "Into the Fray Patch 6" (14/09/2022, fórum oficial; trecho de busca): taxa de setup e de venda subiram 1 ponto (2 para quem não tem Premium) -> 1,5->2,5; 3->4 (premium) e 6->8. Consistente com os valores atuais.
- Guias 2026 (albionmarket.gg, albiononlinegrind, albioncodex): 2,5%; 4%/8%; total de 6,5% (premium) e 10,5% (sem) numa ordem de venda.
- Buscas por mudanças em 2026: nenhuma encontrada (Radiant Wilds não mexeu).

**Veredito: CONFERE** (valores e a lógica instantâneo x ordem). **Lacuna não coberta:** cada atualização/relistagem de ordem cobra 2,5% de novo e o fee não volta ao cancelar (fonte wiki). Confiança: **MÉDIA-ALTA** (wiki não lido diretamente; coerência entre 4 fontes + histórico de patch).

---

## 4. Cidades de bônus

### 4.1 Refino por recurso — **CONFERE (5/5)**

Fonte primária: `craftingmodifiers.xml` (dump).

| Recurso | Cidade (dump) | Código |
|---|---|---|
| Madeira (wood) | Fort Sterling (clusterid 4000) | Fort Sterling OK |
| Minério (ore) | Thetford (0000) | Thetford OK |
| Couro bruto (hide) | Martlock (3004) | Martlock OK |
| Fibra (fiber) | Lymhurst (1000) | Lymhurst OK |
| Pedra (rock) | Bridgewatch (2000) | Bridgewatch OK |

Caerleon e Brecilien: base 18, sem especialização de refino. Também confirmado por AFM (2026-11) e albionmarket.gg (2026-07).

### 4.2 Craft por tipo de item — **DIVERGE**

A chave do bônus no jogo é o atributo `@craftingcategory` de cada item no `items.json` (não a subcategoria de loja). Nomes: `offhand` (escudo, livro, tocha e demais secundárias), `cape`, `bag`, `potion`, `food`, `tools`, `gatherergear`, `knuckles`, `shapeshifterstaff`, `cloth_helmet`, etc.

| Cidade | Código (`CRAFT_CITY`) | Dump (`craftingmodifiers.xml`, +0,15) | Veredito / correção |
|---|---|---|---|
| Martlock | axe, quarterstaff, froststaff, plate_shoes, shieldtype | axe, quarterstaff, froststaff, plate_shoes, **offhand** | PARCIAL: `booktype` e `torchtype` (e demais secundárias) também são Martlock |
| Thetford | mace, naturestaff, firestaff, leather_armor, **cloth_shoes** | mace, naturestaff, firestaff, leather_armor, **cloth_helmet** | DIVERGE: trocar cloth_shoes por cloth_helmet |
| Fort Sterling | hammer, spear, holystaff, plate_helmet, cloth_armor | idem | **CONFERE** |
| Lymhurst | sword, bow, arcanestaff, leather_helmet, **cloth_helmet, booktype** | sword, bow, arcanestaff, leather_helmet, **leather_shoes** | DIVERGE: remover cloth_helmet e booktype; incluir leather_shoes |
| Bridgewatch | crossbow, dagger, cursestaff, plate_armor, **leather_shoes, torchtype** | crossbow, dagger, cursestaff, plate_armor, **cloth_shoes** | DIVERGE: remover leather_shoes e torchtype; incluir cloth_shoes |
| Caerleon | knuckles, **bags, satchels, potions, food, capes** | gatherergear, tools, food, knuckles, shapeshifterstaff | DIVERGE: bags, satchels, potions, capes NÃO são Caerleon; faltam gatherergear, tools, shapeshifterstaff |
| **Brecilien** (cluster 5000) | ausente | cape, bag, potion | FALTA: bolsa, satchel, capa, poção = Brecilien |
| Arthur's Rest (4300) | ausente | axe, crossbow, hammer, mace, sword, knuckles, plate_helmet/armor/shoes | fora do escopo atual |
| Merlyn's Rest (1012) | ausente | bow, dagger, quarterstaff, spear, naturestaff, shapeshifterstaff, leather_helmet/armor/shoes | idem |
| Morgana's Rest (0008) | ausente | arcane/curse/fire/frost/holy staff, cloth_helmet/armor/shoes | idem |

Observações:
- AFM (2026-11-13) lista a mesma divisão do dump: Thetford "Cloth Cowls" (cloth_helmet), Lymhurst "Leather Shoes", Bridgewatch "Cloth Sandals", Martlock "Off-hands", Caerleon "War Gloves, Shapeshifter Staffs, Tools, Gathering Gear, Food", Brecilien "Capes, Bags, Potions". Duas fontes independentes (dump + AFM) batem.
- Armadilha de mapeamento: `T4_2H_IRONGAUNTLETS_HELL` tem subcategoria de loja `knuckles` mas `craftingcategory = dagger` (Bridgewatch). O código, que usa `item.c` (shopcategory/subcategoria), mandaria esse item para Caerleon. Correção: exportar `@craftingcategory` no `build-catalog.mjs` e usar a tabela por craftingcategory.
- Carne (meat_*, ingrediente de comida) tem +0,10 nas cidades reais (Fort Sterling: frango e carneiro; Lymhurst: ganso; Bridgewatch: cabra; Martlock: vaca; Thetford: porco). Irrelevante ao app hoje.
- Comida (`food`) e `tools`/`gatherergear` são Caerleon, mas o app marca `Caerleon` para `consumables/food` ok e `potions` incorretamente.

Confiança: **ALTA** (dump oficial atual + AFM 2026 concordam).

---

## 5. Ingredientes que NÃO retornam recursos

**Código:** `returnable = !/ARTEFACT|ARTIFACT|RUNE|SOUL|RELIC|SHARD/.test(uniq)`.

**Fonte primária:** no `items.json` cada `<craftresource>` pode ter `maxreturnamount="0"`. Varri 100% das receitas (inclusive encantadas). Tipos com `maxreturnamount=0`:

| Tipo de ingrediente (nome no dump) | Cobre o regex? |
|---|---|
| `T*_ARTEFACT_*` (artefatos de arma/off-hand/elmo/armadura/botas), `T*_ARTEFACT_TOKEN_FAVOR_*` | Sim |
| `*_QUESTITEM_TOKEN_*` (sigilos reais, Avalon, Mists, etc.) | **Não** |
| `FACTION_*_TOKEN_1` (tokens de facção) | **Não** |
| `CAPEITEM_*_BP` (blueprints de capa de cidade/facção) | **Não** |
| `T*_CAPE` como base de capa de facção/cidade | **Não** |
| `T*_HEAD/ARMOR/SHOES_{PLATE,LEATHER,CLOTH}_SET1..3` como base de item "ROYAL" | **Não** |
| `ALCHEMY_RARE_*`, `ALCHEMY_COMMON` (essências raras), `SKILLBOOK_STANDARD`, tokens de dungeon, `UNIQUE_*TOKEN*` | **Não** |
| `T*_RUNE/SOUL/RELIC/SHARD_AVALONIAN` **como ingrediente na criação do próximo fragmento** (ex.: T4_SOUL feito de RUNE) | Sim (e é correto) |

Em contrapartida, `RUNE/SOUL/RELIC/SHARD` aparecem como ingrediente **sem** `maxreturnamount=0` nas receitas de ~170 artefatos (ex.: `T4_ARTEFACT_2H_COMBATSTAFF_MORGANA`) — ou seja, nesses casos o jogo permite retorno e o regex marca como "não retorna" (erro), mas só afeta a produção de artefatos, que o app mostra na categoria "Artefato".

**Veredito:** DIVERGE. Os casos práticos para quem faz craft de equipamento são: artefato e token de favor (cobertos), e as bases de itens Royal e de capas (não cobertos). Sugestão de correção, sem regex: exportar do dump o flag `maxreturnamount==0` por ingrediente no `build-catalog.mjs` e usar o dado. Confiança: **MÉDIA-ALTA** (dado do jogo, mas não vi texto de wiki explicando; a semântica "atributo ausente = retorna" é inferida de receitas comuns que têm retorno comprovado pelos exemplos da AFM). Wiki (trecho): "artefatos são sempre consumidos"; fórum 2019 (jogador): fragmentos de coração de cidade também não retornam.

---

## 6. Bônus de especialização na cidade

Já coberto pelo dump (item 4). Resumo:

| Contexto | Bônus | Fonte |
|---|---|---|
| Refino do recurso da cidade (5 cidades reais) | +40 sobre base 18 -> PB 58 | dump |
| Craft das categorias da cidade (reais, Caerleon, Brecilien) | +15 sobre base 18 -> PB 33 | dump |
| Rests: categorias específicas | +15 craft, base 18; refino base 15 | dump |
| Hideouts Outlands | craft +1/+6/+11/+16/+21/+26 por qualidade Q1-Q6, refino 15 | dump |
| Carne (butcher) em cidades reais | +10 | dump |
| Caerleon / Brecilien no refino | nenhum bônus de especialização (só 18) | dump |
| Ilha real | base 0 | dump (`islandvalue`) |

**Veredito do código:** +40 e +15 CONFEREM. O que diverge é a lista de categorias (item 4.2) e a ausência de Brecilien, Rests e hideouts. Observação: as guias dizem que a **especialização do jogador** (nível nas árvores de craft) reduz o custo de foco, mas **não** aumenta o RRR (AFM 2026). Não existe "bônus de especialização do personagem" no RRR.

---

## 7. Itens "NÃO VERIFICADO" restantes (pedir verificação em jogo)

1. Valor do artefato dentro do "item value" da taxa de bancada.
2. Taxa de bancada para itens com `amountcrafted` > 1 e para comida/poção (nutrição).
3. Foco +59: conferir no jogo na janela de produção (o dump não traz a constante).

## 8. Fontes

- S1 `craftingmodifiers.xml` (ao-bin-dumps): https://github.com/ao-data/ao-bin-dumps/blob/master/craftingmodifiers.xml (último commit do arquivo 2024-01-08; repo atualizado 2026-11-02)
- S2 `items.json` (ao-bin-dumps), baixado em 2026-11-17: https://github.com/ao-data/ao-bin-dumps
- S3 Patch Lands Awakened, 24/11/2021: https://devtrackers.gg/albion/p/510446ae-usage-fee-and-crafting-changes-lands-awakened-update
- S4 AFM, RRR (17/07/2026, atualizado 19/09/2026): https://albionfreemarket.com/articles/view/how-resource-return-rate-is-calculated-in-albion-online
- S5 AFM, cidades e bônus diário (03/11/2026, atualizado 13/11/2026): https://albionfreemarket.com/articles/view/albion-online-crafting-and-refining-city-bonuses
- S6 AFM, taxa de bancada (10/09/2026, atualizado 19/09/2026): https://albionfreemarket.com/articles/view/how-crafting-station-fees-are-calculated-in-albion-online
- S7 albionmarket.gg refino (09/07/2026): https://albionmarket.gg/guides/best-refining-city-setup ; produção (11/07/2026): https://albionmarket.gg/guides/crafting-and-refining-profit
- S8 Wiki oficial (403 no fetch; só trechos de busca): https://wiki.albiononline.com/wiki/Resource_return_rate , https://wiki.albiononline.com/wiki/Marketplace
- S9 Patch notes Into the Fray Patch 6, 14/09/2022 (trecho de busca): https://forum.albiononline.com/index.php/Thread/169206-14-September-2022-Into-the-Fray-Patch-6/
- S10 albionmarket.gg Radiant Wilds, 13/04/2026: https://albionmarket.gg/guides/radiant-wilds-update
- S11 Fórum, artefatos e foco (2019, trecho): https://forum.albiononline.com/index.php/Thread/108611-Crafting-Artifacts-with-focus/
