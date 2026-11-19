# Relatório do Loop 2 (deploys 13 a 21)

**Contador: 21 / 50 VERIFICADAS** (eram 12 no fim do loop 1).

## O que entrou em produção (todas verificadas, nenhum rollback)
- 070 estados salvos antigos migrados e com aviso (deploy 13)
- 002 foco: pontos por craft/refino e prata por ponto, `ef` do dump no catálogo (deploy 14)
- 058 comparar cidades de craft (deploy 15)
- 069 infra de testes de componente (deploy 16; bundle inalterado)
- 048 despesas extras e venda sem imposto (deploy 17)
- 071 limite de erro e restaurar configurações; aviso de migração com texto corrigido (deploy 18)
- 076 acabamento das despesas: seletor legível em 375px, avisos sem lixo, coluna Despesas no comparador (deploy 19)
- 078 teste instável corrigido (deploy 20; bundle inalterado)
- 031 teste de estresse de preço e material (deploy 21)

## O que falhou e por quê
- Nenhuma reprovação. Duas aprovações com ressalvas exigiram retrabalho antes do deploy: 019 (loop 1) e 031 (texto não dizia que o ±N% vale para todos os materiais, inclusive artefatos, nem qual saída de venda era variada; grade 0% fora da vista).
- Infraestrutura: o limite de 5h da API cortou Testers/Executores várias vezes; ao retomar, agentes antigos falharam com `model_not_found`. Reiniciei do zero com agentes novos e briefing completo (sem perda de laudo, mas com retrabalho de tempo).

## Erros de dados achados pelo Tester
- No app: nenhum. Cada Tester recalculou por oráculo próprio (milhares de cenários, differential master×branch, mutação 40–56 mutantes) sem divergência.
- Em planos/dossiês/texto: typo "diário 20: 112/212" (058), "última variante" (069, o código está certo), dp*=0,2564 e taxa 9,4785 (031), texto "RRR +40" confundindo bônus de produção com RRR (070, corrigido na 071), rótulo "por craft" da taxa que era total do lote (corrigido na 076).
- Teste instável da master (`marketRequest.test.js`, estado de módulo `blockedUntil`) achado pelo Tester da 031 e corrigido na 078.

## URL de produção
https://albion-data-iota.vercel.app (deploy 21, bundle index-BMIlwWvE.js, catálogo c0f66cb0bd)

## Próximas prioridades
1. 075 Preço-alvo respeita "Sem imposto" (plano pronto; destrava agora que a 031 está na master).
2. Planejar e executar o lote de TRIADA de maior prioridade (003, 009, 054, 059, 061, 062, 064, 065, 053, 051) e dossiê da 068.
3. Acabamentos: 072 (foco), 073 (cartão de cidades), 074 (testes de ligação), 077 (limite de erro), 079 (textos longos), 080 (grade de estresse).

## Medições no jogo que o usuário precisa fazer (bloqueiam ideias NÃO VERIFICADAS)
Taxa de artefato / Item Value no tooltip, taxa de poção (quantidade > 1), fama T4 .0/.2, captura do bônus diário, custo de 1 transmutação, RRR da bancada de hideout, custo de encantar T4, foco mostrado pelo jogo (para validar a eficiência por etapa do refino na 002).
