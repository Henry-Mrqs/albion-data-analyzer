# Decisões do Gerente (ADR curto)

## D-001 — O que conta para a meta de 50
Só conta funcionalidade com status `VERIFICADA` (passou por ideia → plano → implementação → QA → deploy → verificação em produção). **IDEIA-001 (fundação de testes) é infraestrutura e não conta**, mas é pré-requisito de todo o resto. O usuário pode rever esta regra.
*Por quê:* sem teste automatizado o Executor não consegue fazer TDD e o Tester não tem o que rodar.

## D-002 — Fundação de testes antes do primeiro lote
Antes de qualquer funcionalidade, IDEIA-001 entra primeiro (Planejador → Executor → Tester → Deploy). Escolha de ferramenta: **Vitest** (já é Vite; zero configuração de bundler). *Escolha do Gerente, não do usuário.*

## D-003 — Isolamento de trabalho
Cada ideia: branch `feat/IDEIA-XXX` em worktree própria (`git worktree`). `node_modules` por worktree custa tempo; o Executor usa `npm ci --prefer-offline`. Merge em `master` só pelo Deployer.

## D-004 — Deploy
O projeto Vercel já está ligado ao GitHub (`Henry-Mrqs/albion-data-analyzer`): **push em `master` = deploy de produção**. O Deployer faz o merge das branches aprovadas em `master`, aguarda o status do commit e verifica em produção. Rollback = revert do commit de merge (ou `request_rollback` da Vercel) e novo push.

## D-005 — Verificação em produção com SSO
A produção está atrás do SSO da Vercel. O Deployer verifica com o navegador embutido do app (sessão do usuário) ou, se não houver sessão, pelo preview local servindo o `dist` **e** pelo status HTTP/arquivos via MCP da Vercel. Se não for possível abrir a página real, o item não vira `VERIFICADA`; fica `EM_PRODUÇÃO` e eu aviso.

## D-006 — Limite de WIP = 3
No máximo 3 ideias `EM_EXECUÇÃO`. Como quase tudo mexe em `Crafting.jsx`/`Refining.jsx`, só rodo em paralelo ideias que toquem módulos diferentes (verificado no plano, campo "arquivos afetados").

## D-007 — Independência do Tester
O Tester recebe apenas: dossiê, plano e o nome da branch. Não recebe o resumo do Executor, nem o histórico da conversa. Ele recalcula os exemplos por conta própria (planilha/script independente, sem importar `econ.js`).

## D-008 — Fórmulas existentes sem fonte
O que já está em produção (RRR, taxa de bancada, imposto, setup fee, tabela de cidades) **não tem fonte citada**. O Pesquisador faz um dossiê de auditoria dessas constantes **antes** de qualquer ideia nova que dependa delas (IDEIA-019, IDEIA-023, IDEIA-005). Se alguma estiver errada, vira correção prioritária e entra no relatório.

## D-009 — Revisão do plano IDEIA-001 (Loop 1)
Plano aprovado. Conferi de forma independente (script próprio, sem usar o código do projeto) o Cenário A (T4 comprar/produzir/melhor = 76,6203 / 62,3530 / 61,5265), o craft C1 (custo 3.117.218,05, lucro 5.765.281,95, margem 184,95%), o C2 (lucro 7.172.162,72) e a taxa da espada (3.283): batem com o plano. Respostas às perguntas do Planejador:
1. Vitest 5.x; cair para 4.1.12 só se o Node exigir.
2. Pode substituir `client/README.md` (é o texto padrão do template).
3. Task 6 (Flipper) fica: as próximas ideias de liquidez e confiança de preço mexem nele.
4. Manter a espada com artefato e **acrescentar um caso de poção** (4 ingredientes, `amount` 5) em Task 4: unidades produzidas = amount × crafts é uma variável do cálculo que nada cobre. Conta feita à mão no teste.
5. Confirmado: não há CI; `npm run check` é a porta de entrada.

## Exceções registradas (Gerente escreveu algo que não é gestão)
- Nenhuma até aqui nesta fase. O código atual (Mercado, Refino, Craft, Flipper) foi escrito por mim **antes** de este processo existir e não passou pelo pipeline; por isso suas fórmulas entram na auditoria de D-008.
