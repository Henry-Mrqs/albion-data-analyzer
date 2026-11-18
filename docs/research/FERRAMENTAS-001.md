# FERRAMENTAS-001 — Varredura das ferramentas da comunidade (o que elas fazem e o app não faz)

Pesquisador, 2026-11-18. Método: leitura das páginas públicas (WebFetch) e do diretório oficial de ferramentas de terceiros do AODP (https://www.albion-online-data.com/3rd-party-tools). **Tudo aqui é o que a ferramenta diz fazer**; não testei nenhuma logada nem validei cálculos. Páginas que devolveram 403/429 (Albion Codex, AO MCT) ou vazias (AlbionCrafts) estão marcadas. Não achei threads de Reddit nem planilhas confiáveis nas buscas; ranking de popularidade **não verificado**.

O app hoje: Mercado (preço por cidade, melhor transporte), Refino (custo, rota comprar/produzir, plano), Craft (receita, RRR, bancada, rota por material, plano, tabela de preços), Flipper (varredura, filtros, tabela). Itens já no backlog (001-047) estão citados por ID e não viram dossiê novo.

## Matriz

| Ferramenta (fonte) | O que faz que o app NÃO faz | Ideia / backlog |
|---|---|---|
| **Albion Free Market** (albionfreemarket.com/crafting, /flipper) | Planner multi-craft (grupos por item/tier/encanto), nível de especialização do jogador (foco e qualidade), rota de receita (direto ou craft-and-upgrade), local = cidade ou **hideout com poder**, runs calculados por vendas diárias/foco/montaria/materiais, tipos de preço (ordem de venda, de compra, média, EMV, custo FIFO, manual), diário, consumíveis, bônus diário, despesas extras, "sem imposto", **qualidade esperada e re-rolls**, cards comparativos ordenáveis por lucro, ROI, vendas/dia, lucro/foco, fama/prata, fama/foco, lista de compras e de vendas com **peso**, salvar/clonar/histórico, Portfolio FIFO, flipper com sessões e resultado (sucesso/falha/perdido), upgrade flips com runas, taxa de contrabandista, janela de frescor 180 min (venda) / 45 min (compra) | 003, 002, 009, 017, 029, 032; novos 048, 051, 052, 055, 056 |
| **AlbionUtil** (albionutil.com/en/calculator-crafting, /guide) | Masteries do jogador, diários, extras (transporte, reroll, comida), "plannings" (vários crafts numa lista de compras), **ranking de melhores crafts**, exibe o bônus diário do dia, cartão compartilhável | 013, 029, 026; novos 048 |
| **ScanAlbion** (scanalbion.com, 11 ferramentas) | Black Market Scanner com **cross-quality**, price checker com profundidade e spread histórico, ranking de traders, crafting com **prata por foco**, refino com foco, comida e poções (rendimento em lote, impostos de fazenda), **solver de re-roll (cadeia de Markov)**, **otimizador de carga (mochila por montaria e orçamento)**, divisor de loot, tracker de energia, catálogo de venda | 017, 036, 046, 008; (loot e tracker fora de escopo) |
| **Albion Terminal** (albionterminal.com) | Flips com **confiança = histórico de 30 dias**, rotas via Caerleon/BM/Brecilien com sinalização de estrada arriscada, transporte por **montaria (Mula 360 kg até Mamute selado 22.521 kg)**, orçamento e vagas, absorção por dia do destino, "o que craftar" e "o que refinar" por especialização/cidade/foco, lista de compras pela cidade mais barata, buffs de comida e valor esperado de qualidade, alertas no Discord com recheck de preço, **proveniência**: mede x digitado, nunca mistura | 013, 017, 018, 028, 012; novo 053 |
| **AlbionSnipe** (albionsnipe.com) | Compara listagens do jogo (app desktop) com média de 7/30 dias, **usa o campo certo do Black Market (ordem de compra; "o BM não tem venda")**, idade e fonte em cada preço, margem "ao vivo" vs "snapshot", journal e P&L | 011, 012, 036; novo 056 |
| **Albion Profit Forge** (albionprofitforge.com) | **Busca reversa**: ~1.000.000 rotas comprar-aqui/craftar-ali/vender-lá em 8 mercados, **Cross-City Shopping**, comparação **Enchant-Up**, calculadoras de gear, refino, alquimia, culinária, misc, flip, BM, **salvage, melding, transmute, economia de pesca**, re-roll de qualidade com multiplicadores (×1,00 Good, ×2,43 Outstanding, ×4,94 Excellent, segundo o site), modelo de foco "+250 próprio, +15 irmão, +30 mastery", "Realistic Revenue" (preço ancorado em histórico ponderado por volume quando a oferta é outlier), exportação CSV (pago) | 013, 045, 043, 008, 012; novos 050, 052 |
| **Albion Online Hub** (albiononlinehub.com) | Arbitrage Radar, "demand spikes" no BM, **Order Tracker com P&L**, crafts rentáveis por cidade com ROI, planos salvos, favoritos, **sincronização do Destiny Board**, calculadoras de fazenda, criação de animais e fama | 015, 028, 004, 047; novo 056 |
| **Albion Online Builds** (albiononlinebuilds.com/tools/craft-calculator) | Modo **multi-cidade** (compra, craft e venda em cidades diferentes), grade de lucro por tier e encanto, preço manual por item, servidor selecionável (o app já seleciona servidor) | 013; Craft já tem cidade de material |
| **Albion Profit** (Icaruk, github.com/Icaruk/albion-profit) | Qualquer **produto com N ingredientes** (receita livre), lista de compras, **melhor qualidade de venda** (preços e contagem vendida por qualidade), salva no navegador | 008, 014, 015 |
| **StatisticsAnalysisTool** (Triky313, github, Windows) | Lê o tráfego do jogo (Npcap): preços exatos da janela do mercado, loot logger, damage meter, dungeon tracker, crafting calculator (sem detalhe publicado), diário de mapa | fora de escopo (cliente local, não é app web); mostra o limite da API colaborativa |
| **Tools4Albion** (diretório AODP) | calculadoras de crafting, **farming e reprocessing** (reprocessamento) | 047; "reprocessing" não está no backlog |
| **AlbionCrafts, Albion CraftPath, Albion Terminal "Blackmarket Reader"** | profit de crafting, refino, culinária, **transmutação**, flip com receita; CraftPath: ranking "mais negociados" e navegação por tier/categoria | 013; novo 050 |
| **Albion Online Refinery / refinestation** (aorefinery.com, refinestation.com) | guia e calculadora de **transmutação** com fator de servidor calibrável; calculadora de **ouro/Premium** | novos 050, 054 |
| **Albion Codex, AO MCT** | **não lidas** (429); resultado de busca diz: calculadoras de gear/comida/poção/refino, sync de Destiny Board, flipping analyzer | — |
| **Albion Online Grind** (diretório AODP) | ilhas, armazenamento, timers, **custos de encantamento**, lucro de fazenda | 009, 047 |

## O que apareceu e confirma o rumo do backlog
- Quase todas as ferramentas oferecem: qualidade esperada/re-roll (008), diário (003), foco com especialização (002), volume (010), lista de compras (014).
- O app já cobre bem: servidor, Premium, rota por material (comprar × produzir), flip filtrável, bônus diário de refino.

## Surpresas e riscos
1. **Modelo de eficiência de foco diverge entre fontes**: AFM usa 30 (nó) + 30 (compartilhado) + 250 (específico) = 280 por nível; Profit Forge usa +250 próprio, +15 irmão, +30 mastery; AlbionUtil +280 / +265 artefato / +30 / +15. Impacta IDEIA-002: oferecer valores digitados do jogo como override.
2. **O Flipper do app trata o Black Market corretamente** (usa `buy_price_max` e não oferece venda por ordem no BM); o concorrente AlbionSnipe faz disso um argumento ("ler o campo errado infla a margem mediana em 74%"). Falta só **qualidade**: o app só lê qualidade 1.
3. **Transmutação aparece como "receita" no dump e entra no Craft**: bug do catálogo (IDEIA-050).
4. **Itens com mais de uma receita** (artefato ou ficha de favor; Royal SET1-3) são lidos só pela primeira (IDEIA-049).
5. **Janela de frescor assimétrica**: a AFM considera ordens de venda válidas por 180 min e de compra por 45 min. O app usa um único limiar de idade.
6. As ferramentas pagas (Hub €6,99/mês, Profit Forge US$6/mês) vendem frescor e exportação, mas o núcleo de cálculo é gratuito; não há dado que o app não possa obter da mesma API pública.

## Fontes
- https://www.albion-online-data.com/3rd-party-tools
- https://albionfreemarket.com/crafting · https://albionfreemarket.com/flipper
- https://albionutil.com/en/calculator-crafting · https://albionutil.com/en/guide
- https://scanalbion.com/ · https://albionterminal.com/ · https://albionsnipe.com/
- https://albionprofitforge.com/ · https://albiononlinehub.com/
- https://www.albiononlinebuilds.com/tools/craft-calculator · https://albioncraftpath.com/en
- https://github.com/Icaruk/albion-profit · https://github.com/Triky313/AlbionOnline-StatisticsAnalysis
- https://aorefinery.com/guides/transmutation · https://aorefinery.com/gold

Confiança: **MÉDIA** como inventário (descrições de produto de terceiros, sem teste); as ideias derivadas têm confiança própria nos dossiês 048-056.
