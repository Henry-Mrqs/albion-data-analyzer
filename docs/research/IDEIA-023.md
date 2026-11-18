# IDEIA-023 — Calculadora de RRR isolada com tabela de referência

## 1. O que faz e por que o jogador usa
O RRR (resource return rate) é a fração dos materiais devolvida após o craft/refino. O jogador não lembra de quantos bônus se somam (base da cidade, especialização, foco, bônus diário) nem o resultado. A funcionalidade: uma tela/painel onde se escolhe local, tipo (refino ou craft), categoria, foco e bônus diário, e aparece o **RRR**, a **tabela de referência** de todos os cenários e "para cada 100 materiais, quanto volta/quanto é gasto". Também serve como espelho de conferência com o que o jogo mostra na janela de produção.

## 2. Regras e fórmulas

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| R1 | `RRR = PB / (100 + PB)` com PB em pontos percentuais (= `1 − 1/(1 + PB/100)`) | AFM 2026-07-17; wiki "Resource return rate" (trecho) | ALTA |
| R2 | `PB = base_local + especialização + foco + diário` (soma simples) | AFM 2026-07/11; albionmarket.gg 2026-07 | ALTA |
| R3 | Base: **18** em Thetford, Lymhurst, Bridgewatch, Martlock, Fort Sterling, Caerleon, Brecilien (craft e refino) | `craftingmodifiers.xml` (dump; inalterado desde 2024-01-08) | ALTA |
| R4 | Especialização de refino: **+40** na cidade do recurso (madeira FS, minério Thetford, couro Martlock, fibra Lymhurst, pedra Bridgewatch) | dump | ALTA |
| R5 | Especialização de craft: **+15** na cidade da categoria do item (ver AUDITORIA-001 §4.2 e a tabela corrigida) | dump | ALTA |
| R6 | Foco: **+59** | AFM 2026; albionmarket.gg 2026; wiki (trecho) | MÉDIA-ALTA |
| R7 | Bônus diário: **+10** (frequente) ou **+20** (raro, 9x menos provável) para uma categoria; 2 bônus por dia por servidor; vale 24 h; reset na manutenção (10:00 UTC Américas/Europa; 23:00 UTC Ásia); categorias sorteadas: linhas de arma/armadura/off-hand, os 5 recursos de refino, ferramentas, equipamento de coleta, comida, poção, bolsa, capa (butcher excluído) | AFM 2026-11-03 (atualizado 11-13) | MÉDIA |
| R8 | Rests de Outlands (Arthur, Merlyn, Morgana): refino base **15** (RRR 13,04%); craft base 18 + 15 em categorias específicas; off-hands só 18 | dump + AFM 2026-11 | ALTA |
| R9 | Ilha real: base **0** (`islandvalue 0`), sem o 18 | dump + AFM | MÉDIA |
| R10 | Hideouts: refino base 15, craft sem base; modificadores 0,01/0,06/0,11/0,16/0,21/0,26 por qualidade de cluster Q1 a Q6 (poder do hideout) | dump | MÉDIA (leitura do XML; sem texto explicativo) |
| R11 | Estradas (TNL-*): refino +10 do recurso local em alguns clusters | dump | MÉDIA |
| R12 | Ingredientes com `maxreturnamount=0` (artefatos, fichas, bases de capa/royal) não retornam; o RRR só vale para os demais | dump; AUDITORIA-001 §5 | MÉDIA-ALTA |
| R13 | A especialização de **personagem** reduz custo de foco, não o RRR | AFM 2026-07/09 | MÉDIA |
| R14 | O retorno é uma taxa esperada (média); cada craft individual varia (a AFM calcula esperado: 100 crafts em Lymhurst = 396,99 barras de retorno sem foco) | AFM 2026-07-17 | MÉDIA |

Não há valor "100% garantido": o jogo sorteia por unidade; o app deve exibir "esperado".

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| Local (cidade/rest/ilha/hideout) e categoria | input + tabela corrigida (dump) |
| Foco sim/não | input |
| Bônus diário (0/10/20) | input (a AFM publica o do dia, mas não há API oficial; **não prometer automação**) |
| Qtd de materiais da receita | catálogo |

## 4. Exemplo numérico (caso de teste)
Fórmula R1 em cada linha (PB -> RRR):

| Cenário | PB | RRR | Devolve de 100 |
|---|---|---|---|
| Cidade sem bônus, sem foco | 18 | 15,2542% | 15,25 |
| Craft em cidade de bônus | 18+15 = 33 | 24,8120% | 24,81 |
| Refino em cidade de bônus | 18+40 = 58 | 36,7089% | 36,71 |
| Foco em cidade sem bônus | 18+59 = 77 | 43,5028% | 43,50 |
| Craft em cidade de bônus + foco | 18+15+59 = 92 | 47,9167% | 47,92 |
| Refino em cidade de bônus + foco | 18+40+59 = 117 | 53,9171% | 53,92 |
| Craft bônus + foco + dia +20 | 18+15+59+20 = 112 | 52,8302% | 52,83 |
| Craft bônus + foco + dia +10 | 102 | 50,4950% | 50,50 |
| Refino bônus + foco + dia +20 | 137 | 57,8059% | 57,81 |
| Refino bônus + dia +10, sem foco | 68 | 40,4762% | 40,48 |
| Rest, refino sem foco | 15 | 13,0435% | 13,04 |
| Ilha real, craft sem foco | 0 | 0% | 0 |
| Ilha real, com foco | 59 | 37,1069% | 37,11 |

Caso de lote (AFM 2026-07-17, Broadsword 16 barras + 8 couro, 100 crafts em Lymhurst):
- Sem foco (RRR 24,8120%): bruto 1.600 barras e 800 couro; retorno esperado 396,99 barras e 198,50 couro; líquido 1.203,01 e 601,50.
- Com foco (RRR 47,9167%): retorno 766,67 barras e 383,33 couro; líquido 833,33 e 416,67.
Revisor recalcula: 1.600 × 0,248120 = 396,99; 1.600 × 0,479167 = 766,67; 800 × 0,479167 = 383,33.

Os valores de ilha (0%, 37,11%) conferem com a tabela "Royal Island" da guia albion-8l9 (0% sem foco, 37,1% com foco) — fonte fraca, só como concordância.

## 5. Encaixe no projeto
- `econ.js`: `rrr()` já implementa R1/R2 para cidade real; estender com `base` por local (18, 15, 0), `specialty` por categoria correta e `daily` também no craft.
- Nova aba "RRR" (ou painel na aba Craft) usando `rrr()`; tabela de referência estática gerada da mesma função (garante consistência).
- Depende da correção da tabela de cidades (AUDITORIA-001 §4). Encaixa com IDEIA-005 (auditor) e IDEIA-002 (foco).
- Hoje: `rrr()` aceita `kind`, `specialty`, `focus`, `daily`; o craft ainda não repassa `daily`.

## 6. Fontes
- https://albionfreemarket.com/articles/view/how-resource-return-rate-is-calculated-in-albion-online
- https://albionfreemarket.com/articles/view/albion-online-crafting-and-refining-city-bonuses
- https://albionmarket.gg/guides/best-refining-city-setup (2026-07-09)
- https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/craftingmodifiers.xml
- https://wiki.albiononline.com/wiki/Resource_return_rate (403; trecho de busca)
- https://albion-8l9.pages.dev/posts/albion-online-what-is-focus (fraca, 2023)

## 7. Confiança
**ALTA** para R1 a R5 e R8; **MÉDIA-ALTA** para o foco +59 (não está no dump); **MÉDIA** para bônus diário (categorias e pesos vêm de uma fonte, a AFM) e para ilha/hideout. Divergência entre fontes: guias antigos citam 15,3% em vez de 15,2% (arredondamento de 15,254%); o valor exato é 15,2542%.
