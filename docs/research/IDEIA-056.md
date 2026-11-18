# IDEIA-056 — Diário de operações: lucro realizado (custo FIFO), flips e crafts concluídos

## 1. O que faz e por que o jogador usa
Todo cálculo do app é **previsão**. O jogador também quer saber o **realizado**: "quanto ganhei de fato esta semana?" e se o lucro previsto se confirmou. Várias ferramentas fazem isso: o **Portfolio Tracker** da Albion Free Market (custo FIFO do estoque, registro de consumo, "Add to Portfolio" ao fim de um craft), a aba "Your Flips"/sessões do Flipper da AFM (resultado: sucesso, falha, perdido), o "Order Tracker" com P&L do Albion Online Hub, os "Craft Runs"/"Your Crafts" do Albion Terminal e o "Journal" com P&L do AlbionSnipe. É diferente de IDEIA-027 (histórico de **cálculos**, não de execuções) e de IDEIA-032 (estoque para abater do plano). Aqui a unidade é a **operação concluída**: lote comprado, lote craftado, lote vendido.

## 2. Regras de negócio

| # | Regra | Fonte | Confiança |
|---|---|---|---|
| J1 | Custo FIFO: o custo da venda consome os lotes de estoque do mais antigo para o mais novo | AFM (Portfolio "FIFO stock cost") | MÉDIA (descrição da ferramenta) |
| J2 | Entrada do craft no estoque: unidades produzidas ao **custo de produção** (materiais líquidos + taxa de bancada + extras); a AFM ajusta a quantidade real por qualidade | albionfreemarket.com/crafting (consulta 2026-11-18) | MÉDIA |
| J3 | Saídas: venda por ordem (preço × (1 − imposto − setup)), instantânea (preço × (1 − imposto)), consumo próprio, perda | AUDITORIA-001 §3 | MÉDIA-ALTA |
| J4 | Resultado de um flip: sucesso, falha, perdido; sessões agrupam flips | albionfreemarket.com/flipper | MÉDIA |
| J5 | O AlbionSnipe avisa que seu P&L é "estimativa, não vendas auditadas" (o jogo não expõe isso à API) | albionsnipe.com | MÉDIA |
| J6 | **Não existe API pública** do jogo com as vendas do jogador; os dados vêm do usuário (digitação) ou de clientes que leem o tráfego do jogo (ex. StatisticsAnalysisTool) | AODP developer page; github Triky313 | MÉDIA |

Regra de produto: `lucro_realizado = Σ (receita_líquida − custo_FIFO)`; cada lote `{id, qtd, custo_unit, data}`; venda `{id, qtd, preço, modo}`.

## 3. Variáveis e origem
Todas do usuário (localStorage/export): lotes, quantidade, preço pago, preço vendido, modo, data. Imposto e setup: AUDITORIA-001.

## 4. Exemplo numérico (caso de teste)
Item X, premium (imposto 4%, setup 2,5%).
- Lote A: 100 unidades a 10 (dia 1). Lote B: 100 unidades a 14 (dia 2).
- Venda: 150 unidades a 20, por ordem (k = 0,935).
1. Receita líquida = 150 × 20 × 0,935 = **2.805**.
2. Custo FIFO = 100 × 10 + 50 × 14 = 1.000 + 700 = **1.700**.
3. Lucro realizado = **1.105** (margem 65%). Estoque restante: 50 unidades a 14.
4. Pelo custo médio (12): custo 1.800, lucro **1.005**: a diferença é de método (100); a ferramenta deve mostrar qual método usou.
Caso de craft: 10 Broadswords produzidas ao custo unitário 3.524,27 + extras 23 = 3.547,27 -> estoque de 10 a 3.547,27; vender 4 a 4.500 por ordem rende 4 × 4.500 × 0,935 = 16.830 contra custo 14.189,08: lucro **2.640,92**.

## 5. Encaixe no projeto
- Novo módulo "Diário" (aba): lista de lotes e vendas em localStorage, exportar/importar JSON/CSV; botão "registrar este craft" nas telas Craft/Refino e "registrar este flip" no Flipper.
- `econ.js`: `fifo(lots, sale)` puro. Dependências: IDEIA-001 (testes) e IDEIA-048 (extras).
- Risco: dados só locais; incluir exportação antes de qualquer recurso de nuvem.

## 6. Fontes
- https://albionfreemarket.com/crafting e https://albionfreemarket.com/flipper (2026-11-18)
- https://albionsnipe.com/ (Journal e P&L)
- https://albionterminal.com/ (Craft Runs / Your Crafts)
- https://www.albion-online-data.com/3rd-party-tools (Order Tracker do Albion Online Hub)
- https://github.com/Triky313/AlbionOnline-StatisticsAnalysis (leitura do tráfego do jogo)

## 7. Confiança
**MÉDIA.** Nenhuma constante de jogo nova; é função de contabilidade. A utilidade está documentada em quatro ferramentas; o esforço (persistência, exportação) é alto e o ganho é o acompanhamento do real, não a precisão do cálculo.
