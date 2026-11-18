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

## D-010 — Triagem do lote 1 do Pesquisador
**Aceitas (TRIADA):** 002, 003, 009, 010, 019, 023, 030, 031. **Escopo reduzido** por confiança BAIXA (gate de dados): 003 sem fama por craft; 009 sem taxa de encantar; 019 sem presets de taxa por cidade (nenhuma fonte publica; a taxa é definida por cada dono de bancada) — o item vira "arredondar só no total + valor do usuário". Registrado como **rejeição parcial**: presets por cidade.
**Acrescentadas por achados da auditoria:** 038, 039, 041 (correções de fidelidade) e 042–047 (ideias de mercado do Pesquisador).
**Verificação independente do Gerente:** conferi `craftingmodifiers.xml` do dump oficial (`ao-data/ao-bin-dumps`): Thetford = cloth_helmet, Lymhurst = leather_shoes, Bridgewatch = cloth_shoes, Martlock = `offhand`, Brecilien = cape/bag/potion, Caerleon = gatherergear/tools/food/knuckles/shapeshifterstaff. A `CRAFT_CITY` do app (escrita por mim de memória) estava errada em 4 de 6 cidades. **Erro meu, em produção.**

## D-011 — Correções de fidelidade contam para a meta e furam a fila
Correções de cálculo que passam pelo pipeline completo (dossiê, plano, QA, deploy, verificação) contam como melhoria (não são infra). Têm prioridade sobre funcionalidades novas, porque deixam o usuário decidindo com número errado. Ordem após a IDEIA-001: **038 → 019 → 041 → 039**, depois as funcionalidades TRIADAS. 038 e 039 mexem em `build-catalog.mjs`/`catalog.js` (sequenciais entre si); 019 e 041 mexem em `econ.js`/`craftPlan.js` (sequenciais entre si); os dois grupos podem rodar em paralelo.

## D-012 — Pontos que só o usuário consegue conferir em jogo
O Pesquisador não achou fonte para: valor do artefato na taxa de bancada, taxa de itens com `amountcrafted` > 1 (poção/comida) e fama por craft. Isso vai para o usuário como pedido de medição (ver relatório do loop). Enquanto não houver medição, o app mostra o valor atual com aviso, sem mudar o cálculo.

## D-013 — Planos 023, 030 e 031 aprovados; IDEIA-001 sobe primeiro
Conferi de forma independente os números da 030 (C = 3.524,27; equilíbrio 3.770; lucro 1.000 por ordem 4.839, instantâneo 4.713; relistagem 4.972) e o exemplo da 031 (lucro 683 → preço mínimo 3.769, queda máxima de 16,2%). Batem. Respostas às perguntas do Planejador:
1. **023:** Rest (base 15) e Ilha (base 0) ficam FORA: exigiriam mudar `rrr()` e conflitam com 019/041. Entram depois, como ideia própria, se o usuário usar essas zonas.
2. **023:** nova aba "RRR", como o plano propõe.
3. **030:** mantém o campo de relistagens (é exatamente o tipo de variável que o jogador esquece). Fonte só da wiki (MÉDIA-ALTA) e o caso 4.972 é derivado do texto: o Tester refaz à mão e a UI rotula o campo como "estimativa". Flipper fora.
4. **031:** o "preço fixo de material" do dossiê é ambíguo; fica a interpretação do plano (perturba todos os materiais comprados), escrita com clareza na tela.
5. **031 semáforo:** vermelho abaixo de 0, amarelo abaixo de 5% do custo, verde acima. **Decisão de produto do Gerente, sem fonte de jogo** (não é fórmula).
6. **031:** Flipper e histórico fora, confirmado.
**Ordem de entrega:** a IDEIA-001 (infra) sobe sozinha como o deploy 1, assim que o Tester aprovar, para que todas as outras branches partam de uma `master` com testes. Só então entram 038/019 etc.
**Paralelismo:** 023 (só `App.jsx` + arquivos novos) é livre com tudo. 030 e 031 tocam `Crafting.jsx`/`Refining.jsx` em uma linha cada: rodam em sequência ou com merge simples, nunca junto de 038/019/041 no mesmo arquivo sem ordem.

## D-014 — Triagem do lote 2
**Verificado pelo Gerente em `client/public/data/catalog.json`:** (a) 20 recursos brutos têm "receita" (`T5_WOOD` = 1 `T4_WOOD`, `T6_WOOD` = 1 `T5_WOOD`...), que é transmutação, não craft: o Craft os oferece como craftáveis (bug em produção, vira IDEIA-057); (b) itens `*_ROYAL` entram com categoria de loja de armadura de placa/capuz e ingredientes `*_SET1` + `QUESTITEM_TOKEN_ROYAL_*`: herdam o bônus de cidade indevidamente e retornam recursos que não deveriam (038 e 039); (c) 715 itens têm artefato/ficha de favor na receita lida (primeira receita só).
**Aceitas:** 038 (ampliada), 039, 041, 019, 049, 048, 054, 057 (nova), 051 e 053 (dependem de 002 e 010).
**Bloqueadas por falta de fonte (gate de dados):** 052 (taxa de encantar), 050 e 055 (precisam de 1 medição do usuário). Não entram em execução até chegar a medição.
**Fim da fila:** 056 (diário de operações): esforço alto e não melhora a precisão do cálculo.
**Ordem de execução (continua D-011):** 038 → 057 → 039 (grupo catálogo, sequenciais: mesmos arquivos) em paralelo com 019 → 041 (grupo econ/craftPlan). Depois 023, 030, 031, 049, 048, 054.
**Medições pedidas ao usuário** (somam-se às de D-012): (i) print do bônus diário do dia na janela de produção (041); (ii) custo mostrado em jogo para 1 transmutação (050); (iii) RRR mostrado numa bancada de hideout com nível e zona conhecidos (055); (iv) custo em prata de encantar um item T4 (009/052).

## D-015 — IDEIA-001 aprovada; dívida técnica DT-001
O Tester aprovou. Cinco mutações sobreviveram, ou seja, faltam testes para: (1) empate exato na rota `best` (`<` × `<=`); (2) Black Market nunca em "ordem de venda" no Craft e no Flipper (o BM dos testes não tem preço `s`, então a regra não é exercitada); (3) comprar e vender na mesma cidade no Flipper (o teste atual é vazio); (4) borda do filtro de idade do Flipper (`<=` × `<`). **DT-001:** essas quatro lacunas viram testes obrigatórios no primeiro plano que tocar `flip.js`/`craftPlan.js` depois do deploy 1 (Executor da 019 ou da 031). Não bloqueiam o deploy porque o comportamento hoje está correto (o diferencial antigo × novo deu 0 diferenças).
**Validação de entrada ausente (herdada do código antigo, não é regressão):** RRR manual vazio/`' '` vira 0, RRR manual de 150% gera quantidade negativa, `crafts=Infinity` gera custo infinito, taxa de bancada negativa gera taxa negativa. Vira a **IDEIA-060 (validação de entradas, dossiê do lote 3)**, de baixo esforço: números fora de faixa devem gerar aviso e não cálculo absurdo. Prioridade alta para a dor do usuário (resultado absurdo sem aviso).

## D-016 — Triagem do lote 3 e Pesquisador em espera
**Aceitas:** 060 (funde o achado do Tester de D-015), 066, 058, 065, 059 (escopo O1–O3), 061, 062, 064. **Rejeitada:** 063 (variância do retorno): CONFIANÇA BAIXA, a hipótese do sorteio não está comprovada, não vale mostrar uma faixa estatística que pode estar errada. Reabre se aparecer fonte ou medição.
**Coordenação 030 × 059:** a 030 já tem o campo "relistagens" (2,5% por atualização). A 059 estende essa conta ao ciclo completo (cancelar, esperar). O Planejador da 059 deve **reutilizar** a função da 030, sem duplicar.
**Pesquisador em espera (decisão do Gerente, o usuário pode reverter):** o backlog tem 62 ideias funcionais, 20 delas já com dossiê e bloqueios de dados. O gargalo agora é executar, não achar ideias. Enquanto houver mais de 12 ideias `TRIADA`/`PLANEJADA` esperando execução, o Pesquisador não gera dossiês novos; volta a rodar quando a fila cair abaixo disso, ou antes, se o Tester achar um erro de dados que precise de fonte. Isso muda o "sempre rodando" do briefing original para evitar dossiês que envelhecem (o jogo muda por patch).

## Exceções registradas (Gerente escreveu algo que não é gestão)
- Nenhuma até aqui nesta fase. O código atual (Mercado, Refino, Craft, Flipper) foi escrito por mim **antes** de este processo existir e não passou pelo pipeline; por isso suas fórmulas entram na auditoria de D-008.
