# Backlog

Status possíveis: `NOVA → TRIADA → PLANEJADA → EM_EXECUÇÃO → EM_QA → REPROVADA → APROVADA → EM_PRODUÇÃO → VERIFICADA`.

**Pontuação (1–5):** Imp = impacto no lucro do jogador · Fid = fidelidade/precisão do cálculo · Esf = esforço **invertido** (5 = pouco esforço) · Dif = diferencial de mercado. **Prioridade = soma** (máx. 20).

> As pontuações abaixo são **provisórias** (feitas pelo Gerente na Fase 0 a partir do diagnóstico). Cada ideia só vira `TRIADA` depois que o Pesquisador entrega o dossiê e o Gerente confirma ou ajusta a nota. Nenhuma fórmula daqui tem fonte ainda (gate de dados).
>
> A lista de sementes vem só do diagnóstico interno. O Pesquisador deve **acrescentar** ideias de mercado (ver `docs/research/`), sem duplicar estas. A meta é 50 verificadas, então o backlog precisa chegar a bem mais de 50 para absorver reprovações e rejeições.

## Infra (não conta para a meta de 50 — ver D-001)

| ID | Título | Imp | Fid | Esf | Dif | Prio | Status |
|---|---|---|---|---|---|---|---|
| IDEIA-001 | **Fundação de testes**: Vitest + `npm test`, extrair a lógica de cálculo (RRR, taxas, cadeia de refino, plano de craft) de `Crafting.jsx`/`Refining.jsx` para módulos puros testáveis, casos numéricos de regressão do que já existe, script `npm run check` (lint+test+build) | — | — | — | — | **GATE** | EM_QA (Tester #6) |

## Funcionalidades (contam para a meta)

| ID | Título | Imp | Fid | Esf | Dif | Prio | Status |
|---|---|---|---|---|---|---|---|
| IDEIA-005 | **Auditor de variáveis**: painel em cada cálculo listando TODAS as variáveis consideradas (RRR, foco, bônus de cidade, taxa de bancada, imposto, setup fee, premium…) e as ignoradas/pressupostas, com avisos ("sem foco", "sem diário"), para resolver o problema de esquecer variável | 5 | 5 | 3 | 5 | 18 | NOVA |
| IDEIA-006 | **Ponto de equilíbrio comprar × produzir**: preço máximo que compensa pagar pela barra/couro pronto em cada tier | 5 | 5 | 4 | 4 | 18 | NOVA |
| IDEIA-002 | **Foco**: pontos de foco gastos por craft/refino, prata/lucro por ponto de foco, "vale usar foco?" | 5 | 5 | 3 | 4 | 17 | TRIADA (dossiê MÉDIA-ALTA; valor de foco do jogo como override opcional) |
| IDEIA-010 | **Liquidez**: volume vendido por dia (API history) em Craft/Flipper/Mercado, aviso de item sem giro | 5 | 4 | 3 | 5 | 17 | TRIADA (dossiê MÉDIA, observado na API real) |
| IDEIA-012 | **Confiança do preço**: detecção de outlier, dado velho e preço isolado; selo de confiança por célula | 4 | 5 | 4 | 4 | 17 | NOVA |
| IDEIA-003 | **Diários de trabalho (journals)**: diário vazio/cheio, prata por craft, entra no lucro | 5 | 4 | 3 | 4 | 16 | TRIADA (escopo reduzido: capacidade, IDs e preço do diário; **fama fora** por confiança BAIXA) |
| IDEIA-009 | **Encantar**: runa/alma/relíquia — comprar .0 e encantar × craftar já encantado | 5 | 4 | 2 | 5 | 16 | TRIADA (escopo reduzido: quantidades por passo e IDs; **taxa de encantar fora**, sem fonte) |
| IDEIA-017 | **Peso e transporte**: peso total do plano, lucro por kg, capacidade de montaria | 4 | 4 | 4 | 4 | 16 | NOVA |
| IDEIA-019 | **Taxa de bancada**: presets por cidade e auditoria da fórmula (qual "item value" o jogo usa) | 4 | 5 | 4 | 3 | 16 | TRIADA (**redefinida**: arredondar a taxa só no total + override do usuário; **presets por cidade REJEITADOS**, sem fonte, ver D-010) |
| IDEIA-023 | **Calculadora de RRR** isolada com tabela de referência de todos os bônus | 3 | 5 | 5 | 3 | 16 | TRIADA (dossiê ALTA) |
| IDEIA-029 | **Craft em lote multi-item**: vários itens somando materiais e compras | 5 | 4 | 2 | 5 | 16 | NOVA |
| IDEIA-030 | **Preço-alvo reverso**: por quanto preciso vender para lucrar X | 4 | 5 | 4 | 3 | 16 | TRIADA (dossiê ALTA) |
| IDEIA-031 | **Teste de estresse**: lucro se o preço de venda cair/subir ±N% | 4 | 4 | 4 | 4 | 16 | TRIADA (dossiê ALTA) |
| IDEIA-034 | **"Como foi calculado"**: tooltip com a fórmula e os números de cada valor da tela | 4 | 5 | 4 | 3 | 16 | NOVA |
| IDEIA-007 | **Lucro por hora**: tempo de produção e fila | 4 | 4 | 3 | 4 | 15 | NOVA |
| IDEIA-011 | **Tendência e médias** 7/30 dias (API history) | 4 | 4 | 3 | 4 | 15 | NOVA |
| IDEIA-013 | **Ranking "o que craftar hoje"**: varre todos os itens craftáveis por lucro, margem ou lucro/foco | 5 | 3 | 2 | 5 | 15 | NOVA |
| IDEIA-020 | **Vender o bruto × refinar**: custo de oportunidade do recurso | 4 | 4 | 4 | 3 | 15 | NOVA |
| IDEIA-021 | **Preço sugerido de ordem** (compra e venda) e lucro por ordem | 4 | 4 | 4 | 3 | 15 | NOVA |
| IDEIA-032 | **Estoque**: colar inventário e abater do plano de compra | 4 | 4 | 3 | 4 | 15 | NOVA |
| IDEIA-036 | **Mercado Negro**: filtros por tier/encantamento/qualidade e giro | 4 | 4 | 3 | 4 | 15 | NOVA |
| IDEIA-014 | **Lista de compras** exportável (copiar/CSV) por cidade | 3 | 3 | 5 | 3 | 14 | NOVA |
| IDEIA-035 | **Frescor da base** por servidor/categoria (quantos itens atualizados nas últimas horas) | 3 | 4 | 4 | 3 | 14 | NOVA |
| IDEIA-004 | **Fama/XP** por craft e fama por prata | 3 | 3 | 4 | 3 | 13 | NOVA |
| IDEIA-025 | **Cidades extras** (Brecilien etc.) com bônus corretos | 3 | 4 | 3 | 3 | 13 | NOVA |
| IDEIA-008 | **Qualidade** do item produzido (chances) e preço por qualidade | 3 | 4 | 2 | 3 | 12 | NOVA |
| IDEIA-015 | **Receitas salvas e favoritos** | 3 | 2 | 5 | 2 | 12 | NOVA |
| IDEIA-016 | **Comparação lado a lado** de N itens | 3 | 3 | 3 | 3 | 12 | NOVA |
| IDEIA-018 | **Risco de rota** (zonas) e filtro de cidades seguras | 3 | 3 | 3 | 3 | 12 | NOVA |
| IDEIA-022 | **Vendas parciais / preço de listagem** abaixo do mínimo | 3 | 3 | 3 | 3 | 12 | NOVA |
| IDEIA-024 | **Cobertura do catálogo**: montarias, ferramentas de coleta, mobília, comida | 3 | 3 | 3 | 3 | 12 | NOVA |
| IDEIA-026 | **Compartilhar configuração por link** | 3 | 2 | 4 | 3 | 12 | NOVA |
| IDEIA-028 | **Alertas de preço** (notificação no navegador) | 3 | 2 | 2 | 4 | 11 | NOVA |
| IDEIA-027 | **Histórico de cálculos** local | 2 | 2 | 4 | 2 | 10 | NOVA |
| IDEIA-033 | **PWA / instalável / offline do catálogo** | 2 | 1 | 3 | 2 | 8 | NOVA |

Total de sementes funcionais: 34 + 9 acrescentadas no Loop 1 = 43. Meta: 50 `VERIFICADA`. O Pesquisador precisa acrescentar pelo menos ~30 ideias para sobrar margem.

## Ideias acrescentadas no Loop 1 (origem: AUDITORIA-001 e Pesquisador)

| ID | Título | Imp | Fid | Esf | Dif | Prio | Status |
|---|---|---|---|---|---|---|---|
| IDEIA-038 | **Corrigir a tabela de cidades de bônus de craft** (4 de 6 linhas erradas em produção), incluir Brecilien e passar a usar o `craftingcategory` do dump em vez de subcategoria de loja. Base: AUDITORIA-001 §4.2, conferida pelo Gerente no dump | 5 | 5 | 4 | 3 | 17 | NOVA (dossiê formal pedido; **correção de bug em produção, 1ª da fila**) |
| IDEIA-041 | **Bônus diário também no RRR do craft final** (hoje só entra no refino) e alerta "vale esperar o bônus do dia" | 4 | 5 | 4 | 3 | 16 | NOVA (dossiê formal pedido) |
| IDEIA-039 | **"Não retorna recursos" por ingrediente** lido do dump (`maxreturnamount=0`) no lugar do regex | 4 | 5 | 4 | 2 | 15 | NOVA (dossiê formal pedido) |
| IDEIA-044 | **Custo de viagem/teleporte** no lucro de transporte | 3 | 3 | 4 | 3 | 13 | NOVA |
| IDEIA-046 | **Culinária e poções** com custo de nutrição | 4 | 3 | 2 | 4 | 13 | NOVA (fórmula de foco por nutrição NÃO VERIFICADA) |
| IDEIA-042 | **Itens Royal e capas de cidade** (base e tokens não retornam) | 3 | 4 | 2 | 3 | 12 | NOVA |
| IDEIA-043 | **Fragmentos** (runa → alma → relíquia) com retorno parcial | 3 | 3 | 2 | 3 | 11 | NOVA |
| IDEIA-047 | **Fazenda e animais**: lucro por plantação/cria | 3 | 2 | 2 | 4 | 11 | NOVA |
| IDEIA-045 | **Reciclagem (salvage) e reparo/durabilidade** | 2 | 3 | 2 | 3 | 10 | NOVA |
