# Backlog

Status possíveis: `NOVA → TRIADA → PLANEJADA → EM_EXECUÇÃO → EM_QA → REPROVADA → APROVADA → EM_PRODUÇÃO → VERIFICADA`.

**Pontuação (1–5):** Imp = impacto no lucro do jogador · Fid = fidelidade/precisão do cálculo · Esf = esforço **invertido** (5 = pouco esforço) · Dif = diferencial de mercado. **Prioridade = soma** (máx. 20).

> As pontuações abaixo são **provisórias** (feitas pelo Gerente na Fase 0 a partir do diagnóstico). Cada ideia só vira `TRIADA` depois que o Pesquisador entrega o dossiê e o Gerente confirma ou ajusta a nota. Nenhuma fórmula daqui tem fonte ainda (gate de dados).
>
> A lista de sementes vem só do diagnóstico interno. O Pesquisador deve **acrescentar** ideias de mercado (ver `docs/research/`), sem duplicar estas. A meta é 50 verificadas, então o backlog precisa chegar a bem mais de 50 para absorver reprovações e rejeições.

## Infra (não conta para a meta de 50 — ver D-001)

| ID | Título | Imp | Fid | Esf | Dif | Prio | Status |
|---|---|---|---|---|---|---|---|
| IDEIA-001 | **Fundação de testes**: Vitest + `npm test`, extrair a lógica de cálculo (RRR, taxas, cadeia de refino, plano de craft) de `Crafting.jsx`/`Refining.jsx` para módulos puros testáveis, casos numéricos de regressão do que já existe, script `npm run check` (lint+test+build) | — | — | — | — | **GATE** | **VERIFICADA em produção (infra, não conta para os 50)**; deploy 1 |

## Funcionalidades (contam para a meta)

| ID | Título | Imp | Fid | Esf | Dif | Prio | Status |
|---|---|---|---|---|---|---|---|
| IDEIA-005 | **Auditor de variáveis**: painel em cada cálculo listando TODAS as variáveis consideradas (RRR, foco, bônus de cidade, taxa de bancada, imposto, setup fee, premium…) e as ignoradas/pressupostas, com avisos ("sem foco", "sem diário"), para resolver o problema de esquecer variável | 5 | 5 | 3 | 5 | 18 | NOVA |
| IDEIA-006 | **Ponto de equilíbrio comprar × produzir**: preço máximo que compensa pagar pela barra/couro pronto em cada tier | 5 | 5 | 4 | 4 | 18 | NOVA |
| IDEIA-002 | **Foco**: pontos de foco gastos por craft/refino, prata/lucro por ponto de foco, "vale usar foco?" | 5 | 5 | 3 | 4 | 17 | PLANEJADA (plano aprovado, D-034; depois da 049) |
| IDEIA-010 | **Liquidez**: volume vendido por dia (API history) em Craft/Flipper/Mercado, aviso de item sem giro | 5 | 4 | 3 | 5 | 17 | APROVADA c/ observações; conflito com a 041 + retrabalho 1 em curso (D-038) |
| IDEIA-012 | **Confiança do preço**: detecção de outlier, dado velho e preço isolado; selo de confiança por célula | 4 | 5 | 4 | 4 | 17 | NOVA |
| IDEIA-003 | **Diários de trabalho (journals)**: diário vazio/cheio, prata por craft, entra no lucro | 5 | 4 | 3 | 4 | 16 | TRIADA (escopo reduzido: capacidade, IDs e preço do diário; **fama fora** por confiança BAIXA) |
| IDEIA-009 | **Encantar**: runa/alma/relíquia — comprar .0 e encantar × craftar já encantado | 5 | 4 | 2 | 5 | 16 | TRIADA (escopo reduzido: quantidades por passo e IDs; **taxa de encantar fora**, sem fonte) |
| IDEIA-017 | **Peso e transporte**: peso total do plano, lucro por kg, capacidade de montaria | 4 | 4 | 4 | 4 | 16 | NOVA |
| IDEIA-019 | **Taxa de bancada**: presets por cidade e auditoria da fórmula (qual "item value" o jogo usa) | 4 | 5 | 4 | 3 | 16 | **VERIFICADA** (deploy 3; DT-001 quitada) |
| IDEIA-023 | **Calculadora de RRR** isolada com tabela de referência de todos os bônus | 3 | 5 | 5 | 3 | 16 | **VERIFICADA** (deploy 2) |
| IDEIA-029 | **Craft em lote multi-item**: vários itens somando materiais e compras | 5 | 4 | 2 | 5 | 16 | NOVA |
| IDEIA-030 | **Preço-alvo reverso**: por quanto preciso vender para lucrar X | 4 | 5 | 4 | 3 | 16 | **VERIFICADA** (deploy 2) |
| IDEIA-031 | **Teste de estresse**: lucro se o preço de venda cair/subir ±N% | 4 | 4 | 4 | 4 | 16 | PLANEJADA (plano aprovado, D-013) |
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

Total de sementes funcionais: 34 + 9 acrescentadas no Loop 1 = 43 + 10 do lote 2 + 9 do lote 3 = 62 (1 rejeitada). Meta: 50 `VERIFICADA`. O Pesquisador precisa acrescentar pelo menos ~30 ideias para sobrar margem.

## Ideias acrescentadas no Loop 1 (origem: AUDITORIA-001 e Pesquisador)

| ID | Título | Imp | Fid | Esf | Dif | Prio | Status |
|---|---|---|---|---|---|---|---|
| IDEIA-038 | **Corrigir a tabela de cidades de bônus de craft** (4 de 6 linhas erradas em produção), incluir Brecilien e passar a usar o `craftingcategory` do dump em vez de subcategoria de loja. Base: AUDITORIA-001 §4.2, conferida pelo Gerente no dump | 5 | 5 | 4 | 3 | 17 | **VERIFICADA** (deploy 5) |
| IDEIA-041 | **Bônus diário também no RRR do craft final** (hoje só entra no refino) e alerta "vale esperar o bônus do dia" | 4 | 5 | 4 | 3 | 16 | **VERIFICADA** (deploy 10) |
| IDEIA-039 | **"Não retorna recursos" por ingrediente** lido do dump (`maxreturnamount=0`) no lugar do regex | 4 | 5 | 4 | 2 | 15 | **VERIFICADA** (deploy 9) |
| IDEIA-044 | **Custo de viagem/teleporte** no lucro de transporte | 3 | 3 | 4 | 3 | 13 | NOVA |
| IDEIA-046 | **Culinária e poções** com custo de nutrição | 4 | 3 | 2 | 4 | 13 | NOVA (fórmula de foco por nutrição NÃO VERIFICADA) |
| IDEIA-042 | **Itens Royal e capas de cidade** (base e tokens não retornam) | 3 | 4 | 2 | 3 | 12 | NOVA |
| IDEIA-043 | **Fragmentos** (runa → alma → relíquia) com retorno parcial | 3 | 3 | 2 | 3 | 11 | NOVA |
| IDEIA-047 | **Fazenda e animais**: lucro por plantação/cria | 3 | 2 | 2 | 4 | 11 | NOVA |
| IDEIA-045 | **Reciclagem (salvage) e reparo/durabilidade** | 2 | 3 | 2 | 3 | 10 | NOVA |

## Ideias acrescentadas no lote 2 do Pesquisador

| ID | Título | Imp | Fid | Esf | Dif | Prio | Status |
|---|---|---|---|---|---|---|---|
| IDEIA-049 | **Receitas alternativas**: artefato **ou** ficha de favor; base Royal SET1/2/3; escolhe a mais barata (560 itens com artefato/ficha + 45 Royal) | 4 | 5 | 3 | 5 | 17 | EM_QA (Tester #52) |
| IDEIA-048 | **Despesas extras** no lucro e "venda sem imposto de mercado" | 4 | 4 | 4 | 4 | 16 | TRIADA (MÉDIA; sem valores padrão inventados) |
| IDEIA-054 | **"Vale pagar Premium?"**: ponto de equilíbrio com o preço do ouro (constantes editáveis e datadas) | 3 | 4 | 4 | 4 | 15 | TRIADA (MÉDIA) |
| IDEIA-057 | **Corrigir transmutação listada como receita de craft**: 20 recursos brutos (`T5_WOOD` ← `T4_WOOD`...) aparecem como craftáveis no catálogo. Confirmado pelo Gerente em `catalog.json` | 3 | 5 | 5 | 2 | 15 | **VERIFICADA** (deploy 7) |
| IDEIA-050 | **Calculadora de transmutação** de recursos brutos | 3 | 4 | 3 | 4 | 14 | NOVA (bloqueada: fator do servidor precisa de 1 medição do usuário) |
| IDEIA-051 | **Dimensionar o lote**: limites de foco, demanda, materiais e prata | 4 | 3 | 2 | 5 | 14 | TRIADA (MÉDIA, depende de 002) |
| IDEIA-053 | **Confiança da rota por histórico** ("quantos dos últimos N dias deu lucro") | 4 | 3 | 2 | 5 | 14 | TRIADA (MÉDIA, depende de 010) |
| IDEIA-055 | **Hideout como local de craft** (nível de poder, bônus geral/especialista, zona) | 3 | 4 | 3 | 4 | 14 | NOVA (pede 1 confirmação em jogo do RRR de uma bancada) |
| IDEIA-052 | **Flip de encantamento** no Flipper | 4 | 3 | 2 | 5 | 14 | NOVA (**BLOQUEADA**: taxa de encantar sem fonte; lucro seria enganoso, D-014) |
| IDEIA-056 | **Diário de operações** e lucro realizado (custo FIFO) | 3 | 2 | 1 | 4 | 10 | NOVA (esforço alto, baixa fidelidade; fica para o fim) |

## Ideias acrescentadas no lote 3 do Pesquisador

| ID | Título | Imp | Fid | Esf | Dif | Prio | Status |
|---|---|---|---|---|---|---|---|
| IDEIA-060 | **Validação das entradas pelas faixas do jogo**: taxa de bancada 0–1.000, bônus diário só 0/10/20, RRR máximo (57,81% refino, 52,83% craft). Evita lucro absurdo por digitação (inclui o achado do Tester, D-015) | 4 | 5 | 5 | 3 | 17 | **VERIFICADA** (deploy 8) |
| IDEIA-066 | **Aviso de saída ilusória**: preço de venda sem comprador (Caerleon, cidade sem ordem de compra); exemplo real `T4_MAIN_SWORD`: só o Mercado Negro tem comprador e dá prejuízo | 5 | 4 | 3 | 5 | 17 | **VERIFICADA** (deploy 4) |
| IDEIA-058 | **Comparar cidades de craft**: qual cidade dá o menor custo para o item (taxa por cidade obrigatória) | 4 | 4 | 3 | 5 | 16 | TRIADA (conta ALTA, preços MÉDIA) |
| IDEIA-065 | **Preço de saída realista** ancorado no histórico quando a oferta é isolada | 4 | 3 | 3 | 5 | 15 | TRIADA (MÉDIA; depende de 010; `k` e `N` são decisão de produto) |
| IDEIA-059 | **Ciclo de vida da ordem**: cada atualização cobra 2,5% de novo e cancelar não devolve (3 correções = 336,75 por unidade no exemplo) | 4 | 3 | 3 | 4 | 14 | TRIADA (escopo reduzido: só O1–O3; base do fee na atualização configurável, BAIXA) |
| IDEIA-061 | **Ordem de compra × compra instantânea** de material: economia, idade do dado e spread (sem prometer tempo de preenchimento) | 3 | 4 | 4 | 3 | 14 | TRIADA (MÉDIA) |
| IDEIA-062 | **Checagem de oferta do material**: o plano de compra cabe no volume diário? | 4 | 3 | 3 | 4 | 14 | TRIADA (MÉDIA; depende de 010; limiar é decisão de produto) |
| IDEIA-064 | **Perfil do crafter** (especializações e tiers que sei fazer, uma entrada para tudo) | 3 | 3 | 3 | 4 | 13 | TRIADA (MÉDIA; sem automação por regra de desbloqueio) |
| IDEIA-063 | **Variância do retorno em lote pequeno** | 2 | 2 | 3 | 3 | 10 | **REJEITADA por ora** (CONFIANÇA BAIXA: a hipótese H1 do sorteio não está comprovada; ver D-016) |

## Ideia acrescentada no Loop 4 (achado do Deployer no deploy 5)

| ID | Título | Imp | Fid | Esf | Dif | Prio | Status |
|---|---|---|---|---|---|---|---|
| IDEIA-067 | **Cache do catálogo**: `/data/*` com `max-age=3600` + `stale-while-revalidate=86400` deixa o navegador com o catálogo ANTIGO por até 1 h (24 h) depois de um deploy, enquanto o código novo já espera o formato novo (ex.: sem `cc` mostra "sem cidade de bônus" errado). Versionar a URL e/ou revalidar sempre, e checar o formato ao carregar | 5 | 5 | 4 | 2 | 16 | **VERIFICADA** (deploy 6) |

## Ideia acrescentada no Loop 5 (achado do Planejador ao planejar a 049)

| ID | Título | Imp | Fid | Esf | Dif | Prio | Status |
|---|---|---|---|---|---|---|---|
| IDEIA-068 | **Receitas alternativas do refino** com ficha de facção (30 refinados; ex.: `T4_PLANKS` = 1 madeira + 1 ficha + 1 tábua T3): hoje o Refino ignora essa receita. Precisa de dossiê (o Pesquisador está em espera) | 3 | 4 | 3 | 4 | 14 | NOVA (sem dossiê; D-034) |

## Infra acrescentada no Loop 6 (padrão repetido nos laudos)

| ID | Título | Imp | Fid | Esf | Dif | Prio | Status |
|---|---|---|---|---|---|---|---|
| IDEIA-069 | **Testes de componente (jsdom + Testing Library)**: o mesmo buraco apareceu em 4 ideias (060 `CeilingNotice`/botão "Aceitar", 039 selo "não verificado", 041 avisos e nota no JSX, 049 seletor): mutantes que só a UI revela sobrevivem porque não há teste de componente. Infra, não conta para os 50 (D-001) | — | — | — | — | GATE de qualidade | NOVA (D-037; planejar depois de 010 e 049) |
