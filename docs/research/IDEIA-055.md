# IDEIA-055 — Hideout como local de craft (nível de poder, bônus geral/especialista e zona)

## 1. O que faz e por que o jogador usa
Quem tem hideout (esconderijo de guilda) em zona preta/Outlands pode craftar nele e obter RRR diferente das cidades: não há os 18% base das cidades; o bônus vem do **nível de poder** do hideout (geral e especialista) e da **qualidade da zona** para a categoria do item. O app só conhece as 6 cidades reais. A Albion Free Market oferece "Craft Location: uma cidade ou hideout, com nível de poder do hideout" e o Albion Profit Forge filtra por local. Para o crafter que usa hideout, o app hoje não serve; para quem não usa, evita-se confusão. A funcionalidade: opção "Hideout" com nível (1-9), se a categoria é a especialidade do hideout e a qualidade da zona (Q1-Q6, quando a zona dá bônus à categoria).

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| H1 | **Bônus por nível de poder** (`generalistcraftingbonus` / `specialistcraftingbonus`): nível 1: 0 / 0; 2: 0,06 / 0,0375; 3: 0,11 / 0,075; 4: 0,15 / 0,1125; 5: 0,18 / 0,15; 6: 0,20 / 0,1875; 7: 0,22 / 0,225; 8: 0,24 / 0,2625; 9: 0,26 / 0,30 | `hideouts.xml` (ao-bin-dumps), `<powerlevels>` | ALTA (dado do jogo) |
| H2 | Bônus por **qualidade da zona** para a categoria da biome: Q1 0,01, Q2 0,06, Q3 0,11, Q4 0,16, Q5 0,21, Q6 0,26, só para as 5 categorias da biome (Swamp: mace, naturestaff, firestaff, leather_armor, cloth_helmet; Forest: sword, bow, arcanestaff, leather_helmet, leather_shoes; Steppe: crossbow, dagger, cursestaff, plate_armor, cloth_shoes; Highland: axe, quarterstaff, froststaff, plate_shoes, offhand; quinto bloco (hammer, spear, holystaff, plate_helmet, cloth_armor; não li o rótulo da biome, presumivelmente Mountain)) | `craftingmodifiers.xml` (hideouts por `continent="OUTLANDS" biome clusterquality`) | ALTA |
| H3 | Refino em hideout: bônus fixo **0,15** (`refiningbonus` dos blocos de Outlands); o nível de poder **não** se aplica ao refino | `craftingmodifiers.xml`; wiki Resource return rate (trecho); fórum 2022 (trecho) | MÉDIA-ALTA |
| H4 | **Composição**: `PB = geral(nível) + especialista(nível, se o hideout é especializado na categoria do item) + zona(Q, se a categoria é da biome) + foco 59 + diário`, **sem** os 18 de cidade. Exemplo publicado: Broadsword em hideout nível 9, zona florestal Q6: PB 82 -> RRR 45,1% (58,5% com foco) | guia onelifegaming (sem data) e busca; confere com a soma de H1+H2 (26 + 30 + 26 = 82) | MÉDIA (um exemplo; regra "sem 18" inferida do exemplo) |
| H5 | Patch 20.060.1 (14/09/2022) trocou o modelo antigo multiplicativo por bônus **aditivo** por nível de poder (+1% geral / +2% especialista por nível, texto da wiki); os valores do dump (H1) são maiores e mais recentes e prevalecem | wiki Version 20.060.1 (trecho); `hideouts.xml` | MÉDIA (divergência entre wiki em trecho e dump; usar dump) |
| H6 | O nível de poder **decai** com o tempo (`decaydays` de 3,5 dias no nível 1 até 0,5 no nível 9) e exige Power Cores | `hideouts.xml`; wiki Power Cores (trecho) | MÉDIA |
| H7 | Hideouts em zonas T7/T8 dão +10%/+15% (guia onelifegaming); **não verificado** no dump | onelifegaming | BAIXA |

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| Tabela H1 | dump (`hideouts.xml`) |
| Tabela H2 | dump (`craftingmodifiers.xml`) |
| Nível, especialização, qualidade da zona | input do usuário |
| Categoria do item (`craftingcategory`) | IDEIA-038 |

## 4. Exemplo numérico (caso de teste)
Broadsword (`sword`, craft), hideout em zona florestal, sem diário:
- Nível 9, especializado em sword, zona Q6: PB = 0,26 + 0,30 + 0,26 = 0,82 -> **82** pontos. RRR = 82/182 = **45,0549%**; com foco: PB 141, RRR = 141/241 = **58,5062%** (bate com 45,1% / 58,5% do guia).
- Nível 5, especializado, zona Q3: PB = 18 + 15 + 11 = 44; RRR = 44/144 = **30,5556%**; com foco 103/203 = **50,7389%**.
- Nível 9 **sem** ser especialista nesse item, zona Q6: PB = 26 + 26 = 52; RRR = 52/152 = **34,2105%**.
- Compare Lymhurst: PB 33 -> 24,8120%.
Refino no mesmo hideout: PB 15 -> RRR **13,0435%**; com foco PB 74 -> 74/174 = **42,5287%**.

## 5. Encaixe no projeto
- `econ.js`: `rrr()` ganha `base` (0 em hideout), `generalist`, `specialist`, `zone`; tabela H1 embutida (9 linhas).
- UI: opção "Hideout" na lista de cidades de craft; nunca no refino (usa 15 fixo).
- Depende de IDEIA-038 (craftingcategory) e IDEIA-025 (cidades extras). **Atenção ao risco**: a composição (H4) tem uma só fonte de exemplo; liberar com aviso e pedir ao usuário o RRR mostrado em jogo como override.

## 6. Fontes
- https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/hideouts.xml
- https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/craftingmodifiers.xml
- https://onelifegaming.com/en/albion-online/blog/crafting-guide (parcial; página não traz a tabela)
- https://wiki.albiononline.com/wiki/Version_20.060.1 e https://wiki.albiononline.com/wiki/Hideout (trechos de busca)
- https://forum.albiononline.com/index.php/Thread/169206-14-September-2022-Into-the-Fray-Patch-6/ (trecho)

## 7. Confiança
**MÉDIA.** Os números H1/H2 são dado do jogo (ALTA); como eles se **somam** (H4) e se o bônus especialista exige a especialização do hideout vêm de um único exemplo publicado. Pendente: confirmar em jogo uma vez (RRR de uma bancada do hideout).
