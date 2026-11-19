# Métricas

**Meta: 22 / 50 funcionalidades `VERIFICADA`** (atualizado após o deploy 21).

Verificadas (21): 002 foco, 010 liquidez, 019 taxa de bancada, 023 aba RRR, 030 preço-alvo, 031 teste de estresse, 038 cidades de craft, 039 não retorna por ingrediente, 041 bônus diário no craft final, 048 despesas extras e venda sem imposto, 049 receitas alternativas, 057 transmutação fora do craft, 058 comparar cidades de craft, 060 validação de entradas, 066 saída ilusória, 067 cache do catálogo, 069 testes de componente (infra de testes), 070 estados salvos antigos, 071 limite de erro e restaurar configurações, 076 acabamento das despesas, 078 teste instável (infra), 075 Preço-alvo respeita "Sem imposto". IDEIA-001 (fundação de testes) é infra e não conta.
Observação de contagem: 069 e 078 são infraestrutura de testes (não mudam a tela); se o usuário preferir contar só o que muda o app, o contador é 19/50.

| Indicador | Valor |
|---|---|
| Loops concluídos | 4 (ver relatórios/loop-1.md e loop-2.md) |
| Deploys em produção | 22 (todos VERIFICADOS, nenhum rollback) |
| VERIFICADA | 22 de 50 |
| Testes automatizados | 1.125 (52 arquivos) |
| Reprovações no QA | 0 |
| Aprovações com retrabalho | 2 (019, 031) |
| Erros de dados achados pelos Testers no app | 0 (os Testers recalcularam por oráculos independentes; achados foram erros de plano/texto e a auditoria inicial do Pesquisador: 5 divergências em produção, todas corrigidas) |
| Erros em PLANOS achados na execução | 4 (typo diário 20 da 058; "última variante" da 069; dp* e taxa de refino da 031) |
| Teste instável identificado e corrigido | 1 (078) |
| Falhas de infraestrutura de agentes | limite de 5h da API (8+ vezes) e `model_not_found` ao retomar agentes antigos (contornado recriando o agente) |
| Delegações a sub agentes | 99 |

Atualizado por: Gerente, a cada loop.
