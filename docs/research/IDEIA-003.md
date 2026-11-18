# IDEIA-003 — Diários de trabalho (journals)

## 1. O que faz e por que o jogador usa
Quem faz craft ganha **fama de craft**. Se o jogador carrega um **diário vazio** da classe certa (Ferreiro/Blacksmith, Fletcher, Imbuer, Tinker) no inventário, a fama de cada craft enche o diário. O diário **cheio** vale mais que o vazio no mercado (ou rende materiais em ilha com laboradores). É uma fonte de lucro extra por craft que o app ignora. A funcionalidade: marcar "usar diário", ver qual diário serve ao item, quantos crafts enchem um, e somar ao lucro a fração do ganho do diário correspondente a cada craft.

## 2. Regras de negócio e fórmulas

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| J1 | Diários de craft por classe: `WARRIOR` (Blacksmith: placas/armas pesadas/escudos), `HUNTER` (Fletcher: couro, arcos, tochas), `MAGE` (Imbuer: tecido, cajados, livros), `TOOLMAKER` (Tinker: capas, bolsas, equipamento de coleta, ferramentas). A lista de itens que enchem cada diário está em `famefillingmissions/craftitemfame/validitem` | `items.json` (ao-bin-dumps, 2026-11-02), `journalitem` | ALTA |
| J2 | **Capacidade** (`@maxfame`) por tier (Blacksmith/Hunter/Mage/Toolmaker): T4 3.600; T5 7.200; T6 14.400; T7 28.380; T8 58.590 | `items.json` (dump). Confirmado para T4=3.600 e T5=7.200 pela página albiondatabase.com | ALTA |
| J3 | Divergência: albionutil.com lista T4 900, T5 1.800, T6 3.600, T7 7.200, T8 14.400 (um quarto do dump) | albionutil (sem data) | descartar (dump é fonte primária) |
| J4 | **IDs de mercado (AODP):** `T4_JOURNAL_WARRIOR_EMPTY` e `T4_JOURNAL_WARRIOR_FULL` (idem `_HUNTER_`, `_MAGE_`, `_TOOLMAKER_`; tiers T2 a T8). O estado parcial não é negociável | `formatted/items.txt` do ao-bin-dumps e consulta real à API em 2026-11-18 | ALTA |
| J5 | Diários vazios no inventário enchem sozinhos durante o craft, sem custo extra | albionutil (sem data) | MÉDIA |
| J6 | Venda do diário cheio paga só o imposto de venda (4% premium, 8% sem) (+2,5% se listar ordem) | albionutil + AUDITORIA-001 §3 | MÉDIA |
| J7 | **Fama por craft (a descobrir):** wiki (trecho de busca) diz que a fama base de craft = nº de materiais **não artefato** × valor fixo do tier, ajustado por tipo/encanto. Tabela citada num post do fórum de 2024: T4 22,5; T5 90; T6 270; T7 645; T8 1395 (por material). Fórmula de jogador: `materiais × fator_tier × 2^encanto` (exemplo T4.2 espada de 24 materiais: 24×22,5×4 = 2160). Regra antiga do fórum: fama = ItemValue/10 | wiki (trecho), fórum 2024, fórum antigo | **BAIXA** |
| J8 | O dump traz `craftitemfame @value` = 1200 (T4), 2400 (T5), 4800 (T6), 9600 (T7), 19200 (T8) dentro de `famefillingmissions` e `@destinyandjournalcraftfamefactor` (1,1 a 1,4) nos itens. Relação com a fama real por craft **não confirmada** | dump | BAIXA |
| J9 | Diário cheio também pode ser entregue a laboradores em ilha para gerar recursos refinados (não precisa vender) | albionutil | MÉDIA |

**Fórmula de produto proposta** (comportamento, sem constante nova de jogo):
```
fracao_por_craft  = fama_por_craft / capacidade_diario        // J7 e J2
ganho_diario      = liquido_venda(cheio, premium, modo) - preco_vazio   // pode ser negativo
ganho_por_craft   = fracao_por_craft * ganho_diario
lucro_total       = lucro_sem_diario + ganho_por_craft * crafts
```
`fama_por_craft` deve ser **input do usuário** (lido na janela do jogo) com sugestão calculada por J7 e marcada "estimativa". Não há fonte sólida para automatizar.

## 3. Variáveis e origem
| Variável | Origem |
|---|---|
| Capacidade por tier/classe | dump (`@maxfame`) via catálogo |
| Classe do diário de um item | dump (`validitem`) via catálogo |
| Preço `_EMPTY` e `_FULL` | API AODP (mesmo endpoint de preços) |
| Fama por craft | input do usuário (estimativa J7) |
| Imposto / setup | AUDITORIA-001 |

## 4. Exemplo numérico (caso de teste)
Dados reais da API (servidor West, consulta em 2026-11-18, Caerleon, qualidade 1; use como **valores fixos** do teste):
- `T4_JOURNAL_WARRIOR_EMPTY`: sell_price_min = 3.480 (2026-11-17 21:05)
- `T4_JOURNAL_WARRIOR_FULL`: sell_price_min = 3.642 (2026-11-17 21:20); buy_price_max = 2.200

Cálculo (premium, vender por ordem, comprar vazio comprando da ordem de venda sem setup):
1. Líquido do cheio = 3.642 × (1 − 0,04 − 0,025) = 3.642 × 0,935 = **3.405,27**.
2. Ganho do diário = 3.405,27 − 3.480 = **−74,73** (negativo).
3. Premium, venda instantânea numa ordem de compra a 2.200: 2.200 × 0,96 = 2.112 -> −1.368.
4. Sem premium, ordem: 3.642 × (1 − 0,08 − 0,025) = 3.259,59 -> −220,41.
5. Com fama por craft = 540 (24 materiais × 22,5, estimativa J7) e capacidade 3.600: fração = 0,15; ganho por craft = 0,15 × (−74,73) = **−11,21**; para 10 crafts = **−112,10**.
6. Cenário hipotético de teste (preços inventados): vazio 3.000, cheio 4.500, premium, ordem: líquido = 4.500×0,935 = 4.207,5; ganho = 1.207,5; fração 0,15 -> **181,13 por craft**.

Lição do exemplo real: o spread entre vazio e cheio pode ser menor que impostos; o app **não deve somar** o diário por padrão, e sim mostrar o ganho (positivo ou negativo) e deixar o usuário ativar.

## 5. Encaixe no projeto
- `build-catalog.mjs`: exportar para cada item de craft a classe do diário (`validitem` -> classe) e a tabela `@maxfame` por tier.
- `Crafting.jsx`: switch "Usar diário" + campos "fama por craft" e preços empty/full (um pedido de preços extra). Linha de lucro "diário".
- `econ.js`: `journalGainPerCraft({fame, capacity, priceEmpty, priceFull, premium, mode})`.
- Combina com IDEIA-005 (auditor: "sem diário") e IDEIA-013 (ranking).

## 6. Fontes
- ao-bin-dumps `items.json` (journalitem, 2026-11-02): https://github.com/ao-data/ao-bin-dumps
- ao-bin-dumps `formatted/items.txt`: https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.txt
- AODP `GET /api/v2/stats/prices/T4_JOURNAL_WARRIOR_EMPTY,T4_JOURNAL_WARRIOR_FULL?locations=Caerleon&qualities=1` (consulta 2026-11-18)
- https://albionutil.com/en/guide (sem data)
- https://www.albiondatabase.com/items/adept-fletchers-journal-partially-full (T4 capacidade 3.600)
- https://wiki.albiononline.com/wiki/Fame (403 no fetch; só trecho de busca)
- https://forum.albiononline.com/index.php/Thread/167786-Crafting-fame-and-journal-fame-calculation/ (403; trecho de busca)

## 7. Confiança
**MÉDIA** para capacidade, IDs e mecânica geral; **BAIXA** para a fama por craft (fórmulas de fonte secundária divergem entre si e do dump). Não implementar cálculo automático de fama sem validação em jogo: pedir ao usuário 2 medições (fama mostrada ao craftar um item T4 .0 e um T4 .2) para validar J7. A faixa de preço de `_EMPTY` (comprado) e `_FULL` também é rala na API (ordens lixo com 5 ou 12 de preço mínimo de compra apareceram na consulta): usar `sell_price_min`, não `buy_price_min`.
