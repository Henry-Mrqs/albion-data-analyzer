# Relatório do Loop 1

**Contador: 0 / 50 funcionalidades `VERIFICADA`.** A IDEIA-001 (fundação de testes) está verificada em produção, mas é infraestrutura e não conta (D-001).

**Produção:** https://albion-data-iota.vercel.app (deploy 1, merge `74e1cfd`, `dpl_C2KWaoZxggfV2DbPNi6EpXv5TEiy`, READY). Sem mudança visível: o objetivo era poder testar tudo daqui para frente.

## O que entrou neste loop
- **IDEIA-001 — fundação de testes** (VERIFICADA em produção): Vitest, catálogo injetável, 76 testes, lógica de Craft/Refino/Flipper extraída para módulos puros. Passou por Planejador → Executor → Tester independente → Deployer.

## O que foi reprovado e por quê
- Nenhuma reprovação no QA. Uma ideia rejeitada na triagem: **IDEIA-063** (variância do retorno), CONFIANÇA BAIXA. Uma rejeição parcial: presets de taxa de bancada por cidade (sem fonte).

## Erros de dados encontrados (o que mais importa)
Todos já estão em produção hoje e ainda NÃO foram corrigidos; as correções são a próxima fila (D-011, D-014):
1. **Tabela de cidades de bônus de craft errada em 4 de 6 cidades** (Thetford, Lymhurst, Bridgewatch, Martlock), Brecilien ausente, bolsa/capa/poção atribuídas a Caerleon. Conferido pelo Gerente no dump oficial. → IDEIA-038. *Erro do Gerente (escrita de memória).*
2. **20 recursos brutos aparecem como "craftáveis"** (transmutação lida como receita). Conferido no `catalog.json`. → IDEIA-057.
3. **Itens Royal herdam bônus de cidade e retorno de recursos indevidos** (custo ~24,8% subestimado no exemplo). → IDEIA-038 e IDEIA-039.
4. **Taxa de bancada arredondada por unidade** (100 crafts, taxa 100: 4.300 em vez de 4.320). → IDEIA-019.
5. **Bônus diário não entra no RRR do craft final**, só no refino. → IDEIA-041.
6. **Regex de "não retorna recursos"** incompleto. → IDEIA-039.
7. **O app aceita entradas absurdas sem aviso** (RRR manual 150%, taxa negativa, crafts infinito), achado do Tester. → IDEIA-060.
8. **Preço de venda sem comprador** (ex.: espada T4 a 12.000 em Caerleon sem ordem de compra; só o Mercado Negro compra, com prejuízo). → IDEIA-066.
9. Pontos ainda sem fonte (precisam de medição do usuário): valor do artefato na taxa de bancada, taxa de itens com `amountcrafted` > 1, fama por craft, taxa de encantar.

Conferem com fonte: fórmula do RRR e valores, foco +59, imposto 4%/8%, setup 2,5%, 0,1125 da bancada, cidades de refino por recurso.

## Qualidade do processo
- 9 delegações, todas em `agentes-log.md`: Pesquisador (3 rodadas, 29 dossiês, 1 auditoria, 1 matriz de 14 ferramentas), Planejador (4 planos), Executor, Tester, Deployer.
- O Tester fez recálculo independente (109 valores, diferença 0), teste diferencial antigo × novo (6.000 combinações, 0 diferenças) e 35 mutações; 5 sobreviveram → dívida DT-001 (4 testes a escrever).
- O Gerente conferiu por conta própria os planos, a tabela de cidades, o bug da transmutação e o deploy.
- Decisão de gestão: Pesquisador em espera até a fila baixar de 12 ideias (D-016).

## Próximas prioridades
Em execução agora (Loop 2): **IDEIA-023** (aba RRR) e **IDEIA-030** (preço-alvo). Em planejamento: correções 038 → 057 → 039 (catálogo) e 019 → 041 (cálculo). Depois: 031, 060, 066, 049, 048, 054, 058, 059.

## Medições que só o usuário consegue fazer em jogo
1. Tooltip "Item Value" e taxa mostrada na janela de craft de um item com artefato.
2. O mesmo para uma poção (rende mais de 1 unidade).
3. Fama mostrada ao craftar um T4 .0 e um T4 .2.
4. Print do bônus diário do dia na janela de produção.
5. Custo mostrado para 1 transmutação de recurso.
6. RRR mostrado numa bancada de hideout (nível e zona).
7. Custo em prata de encantar um item T4.
