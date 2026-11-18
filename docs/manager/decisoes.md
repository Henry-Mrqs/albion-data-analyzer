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

## D-017 — Planos 038, 057, 019, 041 aprovados; 039 aprovado com ajuste conservador
Conferi no dump (cache local de `items.json`): `T4_MAIN_SWORD`=sword, `T4_2H_BOW`=bow, `T4_ARMOR_PLATE_SET1`=plate_armor, `T4_OFF_SHIELD` e `T4_OFF_BOOK`=offhand, `T4_BAG`=bag, `T4_POTION_HEAL`=potion, `T4_SHOES_CLOTH_SET1`=cloth_shoes; `T4_ARMOR_PLATE_ROYAL`, `T4_HEAD_CLOTH_ROYAL` e capas de cidade **sem** `craftingcategory`. São 132 itens de equipamento sem categoria: passam a ter "sem cidade de bônus", que é o correto. Respostas às perguntas do Planejador:
1. **039 (765 itens "Artefato" passariam a retornar):** NÃO aplicar sem confirmação. Um erro aqui subestima o custo (otimista), que é a direção perigosa. A regra do app passa a ser **união**: não retorna se o dump marcar `maxreturnamount=0` **ou** se o ingrediente casar com os tokens antigos RUNE/SOUL/RELIC/SHARD. Os 765 itens ficam como estão, marcados "NÃO VERIFICADO" no plano e no relatório, até haver medição em jogo. O dossiê 039 dá MÉDIA-ALTA e a inferência "atributo ausente = retorna" não cobre esse caso.
2. **019:** mantém o padrão 400 com aviso visível "valor padrão, confira o da sua bancada".
3. **041:** confirmado: as colunas de bônus diário são cenários absolutos que substituem o valor escolhido (não somam), igual ao que já existe no refino.
4. **023:** sem adendo. A 038 já lista `rrrCalc.js` entre os arquivos que altera; a ordem é 023 mesclada antes da 038.
5. **Dossiê 050:** o Pesquisador corrige (a prata de transmutação difere por recurso; pedra T5 = 1.180). A 057 usa o valor do dump, então não é afetada.
**Fila e WIP (limite 3):** em execução 023 e 030; entra a 019 (carrega a dívida DT-001: 4 testes de borda, só arquivos de teste). A 038 espera a 023 estar mesclada. 057 e 039 vêm depois da 038 (mesmos arquivos). 041 depois da 019.

## D-018 — Dois testes da 001 mudam fora da tabela do plano da 019 (aprovado)
O Executor da 019 parou por regra do briefing (correto): 2 testes da fundação mudaram de valor e não estavam na tabela do plano. Conferi à mão: (1) poção C5, 3 crafts, taxa 150: 1.095 → 1.094 (364,5 × 3 = 1.093,5 arredonda no total); (2) `refineUnit` de 1 unidade, valor 16, taxa 400: taxa 7 → 7,2 (exata; o arredondamento passa a ser só no total do lote). Mesma regra aprovada, plano incompleto na tabela. O Tester da 019 deve conferir explicitamente esses dois casos e a lista completa de testes alterados.
**Registro de processo:** a regra "parar se um teste mudar fora do plano" funcionou como projetada e evitou uma alteração silenciosa.

## D-019 — IDEIA-030 aprovada; observações do Tester
**Aprovada.** Observações registradas, nenhuma bloqueia:
1. **Aviso "difícil de vender" enganoso:** compara o preço-alvo com o MENOR preço de venda global (como o plano pedia). Na poção T4 o menor é 1.275 em Caerleon, mas Martlock paga 3.796, e o aviso dispara com alvo 2.924. Parece alarme sem sentido. É a mesma família de problema das ideias **066** (saída ilusória) e **065** (preço de saída realista): o aviso deve olhar a cidade de venda que o usuário escolheu, ou o melhor comprador real. Anotado para a 066; não corrijo antes, para não mexer em plano aprovado sem dossiê.
2. A lib aceita relistagens negativas/decimais e trata modo inválido como instantâneo; só a UI sanitiza. Cobre-se pela **IDEIA-060** (validação de entradas).
3. Aviso de processo: o navegador embutido é compartilhado entre Testers que rodam em paralelo (um chegou a ser redirecionado para a porta de outro). Passo a pedir portas distintas e que cada Tester confira a porta a cada leitura.
**Deploy 2 (lote):** sobe quando 023 e 019 também estiverem aprovadas (agrupar reduz custo de verificação em produção).

## D-020 — IDEIA-023 aprovada; observações do Tester
**Aprovada.** Observações (nenhuma bloqueia):
1. N = 1e308 mostra "∞" e "NaN" na tela; N <= 0 ou vazio vira 1 em silêncio enquanto o campo mostra o que foi digitado. → entra no escopo da **IDEIA-060** (limitar quantidade e avisar quando um valor é corrigido).
2. A categoria do RRR é um seletor separado do item escolhido na receita: escolher um escudo com categoria "Espada" usa a cidade da espada. Decisão de produto: aceitável por ora (a aba é uma calculadora de referência), mas a **IDEIA-038** deve mostrar na aba qual categoria do jogo o item escolhido tem, para o usuário não errar.
3. A aba herda o erro da tabela de cidades de craft até a 038 (esperado e já previsto na ordem de deploy).
4. 1 mutação sobrevive (`floor` por `round` com N decimal): vira teste na 060, junto com a regra de N.
**Fila do deploy 2:** 023 e 030 aprovadas; falta o laudo da 019.
**Aproveitamento da espera:** o Planejador escreve os planos da 060 e da 066 (as duas de maior impacto sobre "esqueci uma variável" ainda sem plano), absorvendo as observações das aprovações até aqui.

## D-021 — Planos 060 e 066 aprovados; respostas ao Planejador
**060 (validação de entradas):**
1. `MAX_QTY = 1e9` para crafts/quantidades: decisão de produto do Gerente (sem fonte de jogo; o dossiê não dá teto). Fica como constante nomeada, fácil de mudar.
2. **Corrige e avisa**, não bloqueia: o cálculo usa o valor corrigido que a tela mostra e o resultado leva um aviso visível "calculado com valor corrigido". Divergência consciente do dossiê (que diz bloquear): bloquear deixaria a tela em branco; um aviso permanente é mais honesto e menos hostil.
3. Taxa acima de 1.000 usa 1.000, com botão para aceitar um novo teto (o teto vem de um post de desenvolvedor, MÉDIA, então precisa ser ajustável).
4. Taxa vazia passa de 0 para o padrão 400, **com aviso visível** ("taxa vazia: usando o padrão 400"), coerente com a 019.
**066 (saída ilusória):**
5. Refino e Flipper ficam fora desta entrega (o Flipper já vende em ordem de compra real). Anoto como possível extensão (066b) se o Tester ou o usuário vir o problema neles.
6. Limite de 24 h igual ao do Flipper, **reutilizando a mesma constante**, sem duplicar o literal.
7. O preço-alvo compara com o melhor comprador de todas as cidades, sem seletor: aceito e documentado como limitação.
8. Pode remover `lowestListing` e seus testes, já que fica sem uso. Os testes removidos devem ser listados no commit e o Tester confere que nenhuma asserção de comportamento sumiu sem substituta.
**Ordem de execução depois do deploy 2:** WIP 3 = **038** (catálogo, 057 e 039 em seguida) + **060** + **066** (060 e 066 tocam `Crafting.jsx`/`TargetPrice.jsx` em regiões distintas). A **041** espera a 060 estar mesclada, porque ambas editam `craftPlan.js`; o Executor da 041 parte da `master` já atualizada.

## D-022 — IDEIA-019 aprovada com ressalvas; deploys separados; retrabalho nº 1
**Laudo:** APROVADO. Mas exijo corrigir antes do deploy: (1) **bug de migração**: quem já tinha taxa salva (sem `feeSet`) vê "Valor padrão (400)" com outro número no campo; inclui o usuário deste projeto e é informação errada na tela, mesmo sem afetar o cálculo; (2) uma mutação real sobrevive: o `refineFee` do Craft pode ser ignorado sem falhar teste (os testes só usam 400); (3) rótulos do Refino confundem taxa da última etapa × taxa do lote. A ressalva de "sem teste de componente do aviso" fica como **DT-002** (não há jsdom no projeto; resolver pela função pura do item 1).
**Deploys separados:** 023 e 030 são independentes da 019, então sobem agora como deploy 2; a 019 sobe no deploy 3 depois do retrabalho e de um re-teste curto. Consequência na fila: 038 (precisa da 023) e 066 (precisa da 030) podem começar após o deploy 2; 060 e 041 esperam o deploy 3 (060 edita `FeeField.jsx` e `craftPlan.js` da 019).
**Retrabalho:** 1 de no máximo 2 (regra do briefing do usuário).

## D-023 — IDEIA-038: teste da poção muda de cidade (aprovado)
O Executor da 038 parou (corretamente) porque o teste C5 da 001 (poção T6 em Caerleon) deixa de ter bônus: a 038 corrige poção, bolsa e capa para **Brecilien**. Aprovado trocar a cidade do teste para Brecilien (números esperados idênticos: a intenção do teste é "craft em cidade de bônus") **e acrescentar** um teste de regressão que mostra a mesma poção em Caerleon sem bônus (RRR 18/118). É o segundo caso do processo em que um teste herdado muda por uma premissa errada da fundação, resolvido por parada e decisão, sem alteração silenciosa. Contagem de itens sem `cc` (1.006 no relato do Executor) será comparada por shopcategory com a minha de 132 itens de equipamento (o restante deve ser artefato, consumível e recurso).

## D-024 — DT-003: constante de idade do dado do Flipper
O Flipper só tem o literal `maxAge: 24` em `Flipper.jsx`. O Executor da 066 criou `DEFAULT_MAX_AGE_H = 24` em `exits.js` (comentário aponta o Flipper). Hoje as duas fontes valem 24 e não divergem, mas são duas. **DT-003:** o Flipper passa a importar a constante de `exits.js` no primeiro plano que tocar `Flipper.jsx` (IDEIA-053 ou 062). Não bloqueia a 066.

## D-025 — IDEIA-066 aprovada; observações do Tester
**Aprovada** (deploy 4). Registro:
1. **Correção ao D-019 (erro de premissa do Gerente):** o "Martlock paga 3.796" da poção T4 que o Tester da 030 citou era um preço de VENDA, não uma ordem de compra. O melhor comprador real da poção é Lymhurst a 1.225, e o alerta do preço-alvo, que agora compara com ele, dispara com sentido. A premissa do teste sintético da 030 não se confirma com dados reais; o teste continua válido como cenário construído.
2. **Falso conforto (decisão de produto):** por regra do dossiê, uma ordem de venda nunca é "ilusória" se houver qualquer compra fresca na cidade, mesmo muito abaixo (poção em Lymhurst: venda 1.555, compra 1.225). Isso é um buraco de informação: a diferença entre o preço de venda e o melhor comprador é o risco real. Vai para a **IDEIA-065** (preço de saída realista) e a **061** (spread), que já tratam do tema; a 065 deve mostrar o spread ao lado do selo.
3. **Texto do aviso do preço-alvo no modo ordem de venda** compara com o melhor comprador e a redação confunde: revisão de texto fica na 065.
4. **DT-004:** 8 mutantes sobrevivem na `exits.js` (M2, M9b, M11, M12, M15, M16, M18, M19). O mais relevante é M15 (o teste de comprador velho usa valor menor que o fresco e não distingue). O código está certo (0 divergências em 5.000 cenários), mas os testes precisam ficar mais fortes: fecham na próxima ideia que tocar `exits.js` (062, 053 ou 065).
5. **DT-003 ampliada:** além do `maxAge: 24` do Flipper, há "24 h" fixo no texto da dica da tabela. Resolver junto.

## D-026 — IDEIA-038 aprovada; observações e ordem de deploy
**Aprovada.** Este era o maior erro de dados em produção da auditoria (cidade de bônus de craft errada em 4 de 6 cidades). Observações, nenhuma bloqueia:
1. **DT-005:** na aba RRR, 35 recursos refinados (ex.: `T6_PLANKS`) mostram a categoria crua "wood" com "sem cidade de bônus" e o aviso de categoria divergente. Um refinado usa o RRR de REFINO (cidade do recurso), não a categoria de craft de equipamento. A aba deve tratar refinados como refino. Entra no plano da 057 (mesmos arquivos de catálogo e RRR) ou em uma correção própria, a decidir ao planejar.
2. O texto do plano ("Sem cidade de bônus") difere do código ("conhecida"): vale o do código (a própria Task 4 manda manter).
3. `RrrCalculator.jsx` mudou sem estar na lista do plano; decorre da Task 4 e foi aprovado em D-020.
**Registro de processo:** o Tester gravou por engano chaves de localStorage na produção porque o navegador embutido é compartilhado e foi redirecionado por outro agente; descartou as leituras, limpou as chaves e repetiu em localhost. Passo a exigir, em todo briefing, que o Tester verifique o host ANTES de gravar qualquer coisa no armazenamento.
**Ordem de deploy:** deploy 4 (066) está em curso; deploy 5 = **038**. A 060 tem conflito provável com a 038 (`RrrCalculator.jsx`, `Crafting.jsx`, `craftPlan.test.js`): se a 060 for aprovada, o Executor dela faz rebase sobre a `master` já com 038 e 066, resolve com testes e o Tester confere o resultado do rebase. A 057 e a 039 começam depois do deploy 5.

## D-027 — Deploy 5 verificado; cache do catálogo vira correção prioritária (IDEIA-067)
O Deployer achou que `vercel.json` serve `/data/*` com `max-age=3600, stale-while-revalidate=86400`: depois do deploy 5, um navegador com o catálogo antigo em cache mostrou "Sem cidade de bônus" até forçar a busca nova. Conferi o cabeçalho em produção e o catálogo servido (correto: 2.292 itens, 1.286 `cc`, 33 `cityOf`). **Gravidade:** o app não quebra, mas mostra a MESMA informação errada que a 038 corrigiu, por até 1 h (24 h pelo stale-while-revalidate), para quem já visitou o site, **inclusive o usuário deste projeto**. E se repete em cada mudança de formato do catálogo (057 e 039 vêm aí). **Decisão:** entra como IDEIA-067, correção, pelo pipeline completo; o plano considera URL versionada com id de build, revalidação e checagem defensiva do formato. Enquanto não sai: forçar a atualização com Ctrl+F5.
**057 em paralelo:** mexe em `build-catalog.mjs`, `catalog.json` e fixture; a 067 em `catalog.js` (URL), `vite.config.js` e `vercel.json`. Sem sobreposição.
**Contador: 5 / 50** (023, 030, 019, 066, 038).
**Registro de processo:** uma atualização minha dos documentos falhou no meio (um padrão de busca não achava o status da 057) e o commit saiu parcial; refeito em seguida. Passo a verificar o resultado dos scripts de documentação antes de commitar.

## Exceções registradas (Gerente escreveu algo que não é gestão)
- Nenhuma até aqui nesta fase. O código atual (Mercado, Refino, Craft, Flipper) foi escrito por mim **antes** de este processo existir e não passou pelo pipeline; por isso suas fórmulas entram na auditoria de D-008.
