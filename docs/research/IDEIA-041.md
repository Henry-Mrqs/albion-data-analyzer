# IDEIA-041 — Bônus diário também no RRR do craft final + alerta "vale esperar"

## 1. O que faz e por que o jogador usa
Todo dia o jogo sorteia categorias com bônus de produção (+10% ou +20%). O app aceita o bônus diário apenas no refino dos materiais (`refineDaily` em `Crafting.jsx`, `daily` em `Refining.jsx`); o RRR do **craft final** (`autoRRR = calcRRR({kind:'craft', specialty, focus})`) ignora o diário. O jogador que craftar uma espada em dia de bônus de espada vê um custo maior que o real. A funcionalidade: campo "bônus diário do item" (0, +10, +20) no craft, mais um cartão "vale esperar o bônus": quanto se economiza no lote se o bônus for +10 ou +20 em relação ao atual.

## 2. Regras de negócio (com fonte)

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| D1 | O bônus diário **soma ao bônus de produção** de qualquer categoria sorteada, craft **ou** refino; `PB = base + especialização + foco + diário` | AFM RRR 2026-07-17: exemplo "Lymhurst, com foco + dia de espada +20 (112%): 52,8302%"; AFM cidades 2026-11-03: "Adds to city and Focus bonuses" | MÉDIA-ALTA (uma fonte detalhada, 2 artigos; wiki só em trecho) |
| D2 | Por dia e por servidor há **2** bônus; cada um dura 24 h; cada um é +10% ou +20% para **uma** categoria | AFM 2026-11-03 | MÉDIA |
| D3 | O de 10% é 9 vezes mais provável que o de 20% | AFM 2026-11-03 | MÉDIA |
| D4 | Pool de categorias: linhas de armas e armaduras, off-hands, os cinco recursos de refino, ferramentas, equipamento de coleta, comida, poção, bolsa e capa; butcher não participa. Um site de busca fala em "38 categorias" no pool | AFM 2026-11-03; resultado de busca de terceiro (sem data) | MÉDIA |
| D5 | Reset na manutenção do servidor: 10:00 UTC (Américas e Europa), 23:00 UTC (Ásia) | AFM 2026-11-03 | MÉDIA |
| D6 | O bônus diário também multiplica a fama de **estudo** da categoria | AFM 2026-11-03; patch notes (trecho de busca, "Daily Production Bonus events still apply a multiplier to Studying Fame") | MÉDIA |
| D7 | Não existe API oficial do bônus do dia no AODP; a AFM o mostra por cliente de dados próprio. O app deve tratá-lo como **input do usuário** | AODP developer page (não documenta); AFM | MÉDIA |
| D8 | A "categoria" do bônus usa as mesmas chaves que as cidades de especialização (ex.: `sword`, `plate_armor`, `offhand`, `cape`, `bag`, `potion`, `food`, `tools`, `gatherergear` e os recursos `wood/ore/hide/fiber/rock`): é a hipótese natural a partir do pool descrito, **não confirmada** por fonte | inferência | BAIXA |

Fórmula: `RRR = PB/(100+PB)`, com `PB_craft = 18 + (cidade especialista ? 15 : 0) + (foco ? 59 : 0) + diário_item` e, nos materiais refinados, `PB_refino = 18 + (40 se cidade do recurso) + (59 se foco) + diário_recurso` (o diário de refino e o de craft são independentes: categorias diferentes).

Alerta "vale esperar" (regra de produto): `economia_espera(d) = custo_materiais(PB atual) − custo_materiais(PB + d)` por craft, vezes o nº de crafts; recomenda esperar quando `economia × crafts` > custo de oportunidade informado pelo usuário (padrão 0, campo "custo de esperar").

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| `diário_item` (0/10/20) | input do usuário por categoria |
| `diário_recurso` por tipo (refino) | já existe (`refineDaily`) |
| Materiais brutos, RRR sem diário | cálculo do app |

## 4. Exemplo numérico (caso de teste)
Broadsword T4 em Lymhurst (cidade de bônus de `sword`). Materiais brutos (preços hipotéticos: barra 200, couro 150): 16×200 + 8×150 = **4.400**. Taxa de bancada fora (não muda).

| Cenário | PB | RRR | Material líquido |
|---|---|---|---|
| Sem foco, sem diário | 33 | 24,8120% | 3.308,27 |
| Sem foco, +10 | 43 | 30,0699% | 3.076,92 |
| Sem foco, +20 | 53 | 34,6405% | 2.875,82 |
| Foco, sem diário | 92 | 47,9167% | 2.291,67 |
| Foco, +10 | 102 | 50,4950% | 2.178,22 |
| Foco, +20 | 112 | **52,8302%** (igual ao exemplo da AFM) | 2.075,47 |

Economia por craft de esperar o +20 com foco: 2.291,67 − 2.075,47 = **216,20**; o +10: **113,45**. Sem foco: **432,45** (+20) e **231,35** (+10). Num lote de 100 crafts com foco: **21.620** (+20).

Erro de hoje (sem o campo): em dia de espada +20 com foco o app usa 47,9167% (custo 2.291,67) quando o jogo dá 52,8302% (custo 2.075,47): superestima o custo em 216,20 por craft (10,4%).

## 5. Encaixe no projeto
- `Crafting.jsx`: `autoRRR = calcRRR({ kind:'craft', specialty, focus, daily: +cfg.craftDaily })`; novo `Select` ao lado do toggle de foco. O cálculo do alerta reaproveita `refineRRRFor` (já existe o padrão "quanto economiza esperando +10%/+20%" nos materiais).
- `econ.js`: `rrr()` já aceita `daily`; só falta passar. Teste: tabela §4.
- Persistência: o bônus muda a cada dia; guardar com data e zerar após o reset (D5), ou avisar "bônus de ontem".
- Interage com IDEIA-005 (auditor: aviso "sem bônus diário informado") e IDEIA-023.

## 6. Fontes
- https://albionfreemarket.com/articles/view/how-resource-return-rate-is-calculated-in-albion-online (2026-07-17)
- https://albionfreemarket.com/articles/view/albion-online-crafting-and-refining-city-bonuses (2026-11-03, atualizado 11-13)
- https://wiki.albiononline.com/wiki/Resource_return_rate (403; trecho de busca)
- https://europe.albion-online-data.com/developer (não há endpoint do bônus)

## 7. Confiança
**MÉDIA.** A soma do diário ao PB do craft final tem exemplo numérico explícito na AFM; o que não consegui confirmar em fonte oficial é a lista exata de categorias (D8) e os pesos 9:1. Pedir ao usuário um print do bônus do dia na janela de produção para validar uma vez.
