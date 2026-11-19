# Laudo do Tester — IDEIA-031 (Teste de estresse)

Branch `feat/IDEIA-031` (b88a98f). Tester independente; sem merge/push/deploy. Laudo escrito por etapas.

## 1. Escopo (feito)
- Diff contra o merge-base (3dad3a4): exatamente 6 arquivos: `stress.js`, `stress.test.js`, `StressTest.jsx`, `StressTest.test.jsx` (novos) e `Crafting.jsx`/`Refining.jsx` (+4 linhas cada: 2 imports, 1 elemento, 1 linha em branco no Craft). Nenhum teste existente alterado. A fixture e `index.css` NÃO foram tocadas (o plano previa; ficou melhor: reutilizou T4_2H_BOW/PLANKS já existentes).
- Sem persistência nova (`grep` de `usePersisted|localStorage` em stress.js/StressTest*.jsx: vazio). Nenhum `.test.jsx` com `usePersisted('` literal.
- `npm run check` 2x: exit 0 nas duas; 47 arquivos / 1062 testes passando; lint limpo.
- Bundle (gzip, antes -> depois): index 81,86 -> 81,86 (igual); Crafting 8,82 -> 8,85; Refining 5,01 -> 5,06; chunk compartilhado TargetPrice 6,07 -> 7,18 (stress.js + StressTest caem aí); total ~ +1,2 kB gzip, +3,2 kB bruto. Aceitável.
- **Suíte completa com `--sequence.shuffle`, 12 execuções na branch:** 8 falharam, 4 passaram. **Todas as falhas são só em `src/lib/marketRequest.test.js`** (5 testes, "texto dos erros": recebem "A API de ... pediu uma pausa" em vez de "respondeu HTTP 500"/"Resposta inválida"/rede). Causa: `blockedUntil` é estado de módulo em `market.js`; um teste que simula 429 contamina os seguintes quando a ordem muda. Nenhum teste da 031 falhou em nenhuma das 12 execuções. É a instabilidade da IDEIA-078 (teste preexistente, ver confirmação na master abaixo). Sem shuffle: `npm test` 2x verde.

## 2. Oráculo independente (feito)
Script próprio (`wt2/client/src/qa31/oracle.test.js`, fora da branch). O esperado NÃO usa `stress.js`: para cada cenário reexecuto `computeCraft`/`evaluateTier` com os PREÇOS perturbados (preço de venda x(1+dp); todos os preços de material, inclusive artefatos e refinados comprados, x(1+dm)) e comparo o lucro por unidade com `stressProfit(input,{dp,dm})`. Mais fórmulas fechadas do dossiê §2.
- **Números do dossiê §4 (conta própria): todos conferem** (893,60; 683,23; 472,85; 262,48; 52,10; 352,40; -68,35; dp* -16,238%; mínimo 3.769,27; folga 730,73; dm* +20,652%; sem especialização 262,69; cantos -158,27 e -819,92).
- **Erros de conta do PLANO confirmados (o Executor tem razão):** "já em prejuízo" com preço 3.000: dp* = 3.524,2707/(3000x0,935) - 1 = **+0,25642** (não 0,1748) e dm* = **-0,21742**. Refino cenário A: taxas de bancada 7,2 + 2,2785 = **9,4785** (não 9,5316); custo unitário 61,4734 (não 61,5265); lucro (Mercado Negro 140, premium, instantânea) = 140x0,96 - 61,4734 = **72,9266** (não 72,8735).
- **Craft: 9.000 cenários gerados, 3.904 prontos (os demais sem preço: adaptador devolveu `null` em todos eles, 0 erros), 19.520 comparações por perturbação; Refino: 9.000 gerados, 4.257 com preço, 21.285 comparações.** Divergência máxima relativa 4,7e-13; **0 violações** em: lucro (perturbação), k independente (ordem/instantânea/noTax/premium), `variable + fixed = custo total/unidades`, fixo = taxa de bancada + taxas das etapas de produção + despesas extras (por craft x crafts, por lote), `variable >= 0`, **centro da grade = lucro do cartão (lote/unidades; diferença máxima 2,9e-11, i.e. exata a ponto flutuante)**, ruptura (lucro 0 em dp* e em dm*), sinal de dp* (≤0 com lucro, >0 em prejuízo), dm nulo só quando devido.
- Cobertura dos cenários do Craft: noTax 542, despesas extras 2.099, artefato não retornável 1.041, lote > 1 unidade 3.159, premium desligado 1.954, venda instantânea 565, refino produzido (`make`) 477, prejuízo 2.298 / lucro 1.606; foco, diário (craftDaily/refineDaily), RRR manual, matCity, useOrders e crafts 1..1000 sorteados. Refino: noTax 1.116, extras 2.499, instantânea 2.368, premium off 2.133, múltiplas etapas 1.333, prejuízo 362.
- Obs.: nas 40.800 comparações a rota (comprar/produzir) nunca mudou sob ±20% nos meus cenários (0 saltos), então o aviso "rota mantida" não foi testado contra uma virada real (ver item 3).
- Confirmação na `master` (6 execuções com shuffle no checkout limpo da master 809d009): **6 de 6 falharam, só em `marketRequest.test.js`** (mesmos 5 testes). Portanto a instabilidade é anterior à 031 (IDEIA-078) e independe da branch.
- Diferencial do resto da tela (sem usar o cartão): `econ.js`, `craftPlan.js`, `refinePlan.js`, `market.js`, `inputRules.js`, `extras.js`, `catalog*` são **byte a byte iguais** à base (o diff da branch só toca os 6 arquivos acima), logo `computeCraft`/`evaluateTier`/`refinePlan` não mudam. Medi também na tela: 15 perfis x aba (Craft e Refino; premium on/off, foco, diário, extras, noTax, refino produzido, estado antigo 9e1e4a2, tudo `{}`), mesma resposta de API congelada (reproduzida do disco) e relógio congelado, branch x `master`: **texto da tela idêntico, 15 de 15, descontado o cartão**; 0 erros/avisos de console em todos; sem rolagem horizontal da página a 500 px. Provei também que os adaptadores não mutam `c`/`unit` (objetos congelados).

## 3. Estado antigo, corrompido e bordas (feito)
- 26 perfis (estados históricos reais do `savedStates.js` da 070 para `craft:cfg` e `refine:cfg`; todas as chaves `{}`; `null`; JSON inválido; craft sem `refine` + item `id: 5`; `refine:null`/`recipeVariant '1.5'`; refino sem `tier`/`ench`; extras lixo (`null`, valor texto, negativo, 1e30, escopo inválido, noTax com lixo); crafts `0`/texto/1e9; taxa negativa/1e9; RRR 150/-4; crafts 1e9 com despesas 1e9; premium off; T6 com crafts 100; poção; artefato; barra T5; refino instantâneo com noTax/extras/RRR manual) x 2 abas: **0 tela branca, 0 NaN/undefined/Infinity/[object]**; cartão com 81 células sempre que há preço de venda; sem cartão (e sem erro) quando o item não tem preço de venda em nenhuma cidade (o Craft esconde o bloco, como o Giro).
- Em teste de componente com entradas direto no `StressTest` (preço 0, custo 0, material 0, taxa maior que a receita, lucro exatamente 0, margem fina, prejuízo, 1e300, 1e308, k = 0): sem tela branca; "Preencha os preços ausentes" para `null`; texto coerente ("Sem ruptura de materiais..." quando não há material comprado ou a receita não cobre o fixo; "Preço precisa subir X%" só em prejuízo). **Único defeito de texto:** com valores NÃO finitos (preço = Infinity, material = Infinity/NaN) o resumo imprime "Infinity%" e "NaN%" (a grade usa `fmt` e mostra "valor enorme"; o percentual `P1` não é protegido). Inalcançável pelas telas hoje (entradas limitadas a 1e9 e API devolve finitos): ver D4.
- Material ausente com preço de venda presente: o adaptador devolve `null` (guarda `c.ready`) e a tela mostra o aviso, em 2.648 cenários do oráculo sem exceção (mas ver mutante M29: a guarda não tem teste).
- Lucro base negativo: "Lucro hoje -6.378 por unidade. Preço precisa subir 13,0% (para 57.782). Materiais precisam cair 11,8%." (T6 padrão), centro = cartão de resultado.
- **Rota mantida (conservador, confirmado):** forcei um caso em que +20% nos materiais vira a rota de refino (T3 a 25,25): lucro do cartão 62,45; lucro real recalculado com a rota nova 62,53. O cartão nunca superestima (a rota "melhor" só pode melhorar).

## 4. UI real (feito; Chrome headless próprio, viewport de 500 px; servidores 5261/5262 parados ao fim)
- Craft T4_MAIN_SWORD (preços ao vivo): "Lucro hoje 1.556 por unidade. Aguenta queda de 32,6% (preço mínimo 3.356, 1.621 de folga) e alta de 54,1% nos materiais"; **centro 1.556 = "+1.556" do cartão "Melhor destino"**. Cartão entre "Onde vender" e "Giro".
- Centro x resultado conferidos na tela em: Craft com 7 crafts + despesa por craft e por lote (7.792/7 = 1.113); noTax Mercado Negro (1.755 = resultado); RRR manual 50% + foco + 3 crafts (7.733/3); refino produzido + diário 20 + foco, 12 crafts (30.886/12); poção, 4 crafts de 5 (5.803/20 = 290); arco com premium desligado e 2 crafts (-144/2 = -72). Refino: barra T5 (337 = "+337"; premium off: 291 = "+291", Venda líquida 1.070 para 1.024); planks T4 instantâneo com extra por lote + noTax (49); planks T3 rota "all" RRR 30 + foco + diário (126). Alternar Premium na tela muda a grade na hora.
- O cartão do Craft mostra o lucro **por unidade** e o cartão de resultado mostra o **lote**: o texto diz "por unidade", mas com crafts > 1 o número do cartão difere do resultado (o centro é resultado/unidades, exato). Não é erro; ver O2.
- Cores: verde/amarelo/vermelho legíveis; limiar de 5% do custo do cenário (amarelo aparece nas bordas, ex.: 169 e 25 no T4). O fundo do app fica escuro também com `prefers-color-scheme: light`.
- **Largura:** a 500 px a grade (670 px de tabela, 434 px visíveis) rola na horizontal dentro do cartão e mostra só 4 das 9 colunas; a coluna 0% (destaque do centro) fica meio fora da vista; a 375 px a área é 309 px. A página nunca rola na horizontal (500/375). Ver D3.
- Console: 0 erros e 0 avisos em todas as telas e perfis.
- **Texto honesto:** o cartão diz "Taxa de bancada, despesas e RRR não mudam; a rota (comprar/produzir) é mantida" e "por unidade" (ok). **Não diz** que o ±N% dos materiais vale para TODOS os materiais, inclusive artefatos, nem **qual saída** de venda está sendo variada (ex.: "Mercado Negro, ordem de compra"; pode ser uma saída "ilusória", que o cartão de resultado já alerta). Ver D1.

## 5. Mutação (50 mutantes em cópia descartável; suíte: stress.test.js, StressTest.test.jsx, Crafting.test.jsx, Crafting.extras.test.jsx, Refining.extras.test.jsx)
**31 mortos, 19 sobreviventes.**
Mortos (exemplos): sinais de dp/dm; sem `k`; fixo variando com dm; dp* sem `-1` ou ignorando o fixo; dm* ignorando fixo; `variable >= 0` (divisão por zero); minPrice `* k`; priceDrop invertido; grade transposta; passo 10%; limiar 10% e 0; `<=` no loss e no thin; craft sem tirar `makeFees`/sem `makeFees`/sem extras/sem taxa/sem dividir por unidades; craft ignorando noTax; refino sem tirar taxas, sem extras, ignorando noTax, taxa com rrr 0; refino sem guarda `missing`; `price >= 0` no refino; UI sem destaque do centro; UI nunca "prejuízo"; UI com 0 casas.
Sobreviventes:
- **Equivalentes/inalcançáveis (3):** M07 `rev >= fixed` (só muda no empate exato), M32 `best.price >= 0` e M33 sem guarda de `units` (opções só existem com preço > 0 e `units >= 1`).
- **Lacunas reais do núcleo (2):** **M29** (remover `!c.ready`: com material sem preço e preço de venda presente o cartão mostraria lucro inflado; nenhum teste cobre "material faltando COM preço de venda") e **M23** (k do Craft ignorando premium: o teste do adaptador só usa `premium = true`).
- **UI (5):** M34 (cor da célula usa o custo do cenário), M36 (`loss` com `<=` no lucro exatamente 0), M38 (sinal `+` nos cabeçalhos), M40/M41 (cores amarelo/verde e do resumo).
- **Integração Craft/Refino (9; nenhum teste de componente exercita o cartão nelas):** M42 premium invertido no Craft, M43 cartão da variante 0 em vez da escolhida, M44 cartão removido do Craft, M45 Refino sem extras, M46 sem noTax, M47 premium fixo, M48 RRR automático em vez do manual, M49 modo fixo 'order', M50 cartão removido do Refino. **Verifiquei esses fios na tela real (item 4) e estão corretos hoje**; o risco é regressão futura (cabe à IDEIA-074/069).

## 6. Passo RED pulado (TDD junto)
Aceitável para o núcleo: 28 dos 33 mutantes aplicáveis a `stress.js` (fórmulas, sinais, limiar, ruptura, k de noTax, fixed) foram mortos, e os 2 reais restantes são M29/M23 (omissões de caso, não de fórmula; mais 3 equivalentes). Não aceitável como cobertura da integração de UI: 0 de 9 mutantes de ligação (M42-M50) morrem e 3 de 8 de apresentação morrem. Recomendo como dívida (junto da 074), não como bloqueio.

## 7. ERROS DE DADOS
**Nenhum erro de dados no app.** Todos os números do dossiê §4 conferem; 40.800 comparações contra o oráculo por perturbação sem divergência; centro = resultado exato. **Dois erros de conta do PLANO (não do dossiê, não do código) confirmados:** "já em prejuízo" com preço 3.000 dá dp* = +0,2564 (plano: 0,1748) e dm* = -0,2174 (esse estava certo no plano); Refino cenário A: taxa de bancada 7,2 + 2,2785 = 9,4785 (plano 9,5316), custo 61,4733 (plano 61,5265), lucro 72,9266 (plano 72,8735). O Executor está certo nos dois e seus testes usam os valores corretos.

## Defeitos
- **D1 (média-baixa, texto):** o cartão não diz (a) que o ±N% dos materiais vale para todos os materiais, inclusive artefatos, nem (b) qual saída de venda (cidade/modo) está sendo variada, nem que ela pode ser "ilusória". A decisão D-055 aceitou o comportamento; o texto precisa declará-lo (2 frases na nota e o destino no resumo). Corrigir antes do deploy (barato).
- **D2 (média, testes):** sobreviventes M29, M23 (núcleo), M34/M36/M38/M40/M41 (UI) e M42-M50 (ligação Craft/Refino). O fio está certo hoje (verificado na tela), mas nada o protege.
- **D3 (baixa, UX):** a 500 px (e pior a 375) a grade 9x9 rola na horizontal dentro do cartão e a coluna central 0% fica parcialmente fora da vista, sem dica de rolagem.
- **D4 (baixa):** `P1` do `StressTest` imprime "Infinity%"/"NaN%" com entradas não finitas (inalcançável pela UI hoje; contraria o princípio "nunca ∞/NaN na tela").
- **Observações (não defeitos):** O1 a grade tem os materiais de -20% (em cima) a +20% (embaixo); o plano descrevia +20% a -20%. O2 o Craft mostra lucro por unidade no cartão e do lote no resultado (rótulo "por unidade" presente). O3 células com lucro negativo menor que 0,5 em módulo mostram "-0" (comportamento do `fmt`, já visto na 058 O6). O4 a fixture e o `index.css` não foram alterados (o plano previa; não eram necessários). O5 bundle +1,2 kB gzip no chunk compartilhado (TargetPrice 6,07 para 7,18 kB), chunk principal igual. O6 `marketRequest.test.js` instável com shuffle (IDEIA-078): 8/12 na branch, 6/6 na master.

## VEREDITO: APROVADO (com D1 recomendado antes do deploy e D2 como dívida)
Cálculo, adaptadores, fidelidade ao jogo (taxa de bancada e despesas fixas, RRR constante, k de noTax/premium/ordem) e ausência de regressão na tela estão provados; os defeitos são de texto, cobertura de teste e usabilidade em tela estreita, e nenhum altera um número exibido.

---

# Re-QA (retrabalho 1) — commit 255ba80 sobre b88a98f

Tester independente; worktrees próprios (br = 255ba80, base = b88a98f). Sem merge/push/deploy. Escrito por etapas.

## R1. Escopo (feito)
- `git diff b88a98f..255ba80 --stat`: 5 arquivos, +124/-4: `stress.js` (+6), `StressTest.jsx` (+24/-3), `Refining.jsx` (1 linha: `city: cur.sell.city`), 2 testes NOVOS (`stress.honest.test.js`, `StressTest.honest.test.jsx`). Nenhum teste existente alterado.
- `npm run check` 2x: exit 0 nas duas; 49 arquivos / **1074 testes** passando; lint e build ok. Nenhum `.test.jsx` com `usePersisted('` literal.

## R2. Regressão numérica (feito)
Script próprio (`qa31b/qa.test.jsx`, fora da branch; PRNG com semente; NÃO importa `stress.js` para o esperado do oráculo): 3.200 cenários Craft prontos (10 itens-alvo incl. artefato, poção, bolsa, armadura; preços aleatórios em 7 cidades x ordem/instantânea; premium on/off; noTax por saída; despesas por craft/lote; foco; diário; RRR manual; matCity; useOrders; refino comprar/produzir/melhor) e 3.200 cenários Refino (T2/T3/T4 tábuas, barra, couro; rota best/all/buy; cidade fixa ou "best"; ordem/instantânea; noTax; extras; RRR 0-60%).
- Oráculo por perturbação: preço de venda x(1+dp) e TODOS os demais preços x(1+dm), recomputando `computeCraft`/`evaluateTier` com a MESMA saída: 9.600 comparações no Craft + 9.600 no Refino; divergência máxima relativa 2,3e-13; 0 violações e 0 trocas de rota. Cenários com artefato nos materiais (Craft): 881 (o oráculo escala também o preço do artefato).
- Diferencial b88a98f x 255ba80: os adaptadores (`craftStressInput` 3.200 / `refineStressInput` 3.200) devolvem objetos IGUAIS aos do commit anterior, descontados os 3 campos novos (`city`, `label`, `noTax`); `stressProfit`, `breakEven`, `stressGrid`, `verdict`, `STEPS`, `THIN_MARGIN` idênticos em 6.000 entradas aleatórias (inclui zeros e k = 0): `toBe`/`toEqual` exatos. **Núcleo numérico não mudou.**
- Centro da grade = lucro da saída (lote/unidades; Refino = `row.profit`) em todos os 6.400 cenários (< 1e-9).

## R3. D1: texto honesto (feito; CORRIGIDO)
Em cada um dos 3.200 + 3.200 cenários renderizei `StressTest` e extraí "Saída de venda variada: X." do cartão; o esperado vem de um argmax INDEPENDENTE (para cada cidade x modo: preço x líquido próprio 1-4%/8%-2,5% ou 1 se noTax, x unidades, menos custo total; empates aceitos). Resultado: **0 divergências** de cidade, modo (Ordem de venda/Ordem de compra, Mercado Negro sempre compra) e ", sem imposto"; o preço usado na grade = preço da saída descrita.
- Variedade: Craft: 26 combinações cidade|modo|noTax distintas como melhor saída, 610 com noTax, 1.839 ordem de venda / 1.361 de compra, 302 Mercado Negro, 181 casos em que a melhor saída NÃO é a de maior preço nominal (muda por imposto/noTax). Refino: 26 textos distintos, 824 noTax, 414 Mercado Negro, 805 com cidade fixa, 2.258 em que há preços diferentes entre cidades. 
- "inclusive artefatos" é verdade: o oráculo, que multiplica TODOS os preços de material (881 cenários com artefato), casa com `stressProfit`. "Taxa de bancada, despesas e RRR não mudam" também: o recálculo real do `computeCraft`/`evaluateTier` com preços perturbados mantém taxa/extras/RRR e bate com o cartão. Ambas as frases presentes em todos os cartões.

## R4. D4: valores não finitos (feito; CORRIGIDO para o alcançável)
1.125 combinações em componente (`variable` em {0, 1, 216, 3308, 1e9, 1e308, +-Infinity, NaN} x `fixed` x `price` x `k` incluindo Infinity/NaN): em NENHUMA com entrada não finita aparece "Infinity", "NaN", "undefined", "null" ou "∞" em qualquer ponto do cartão (resumo, cabeçalhos, 81 células da grade, dicas): 0 ocorrências; os casos aparecem como "valor enorme". Exemplos: preço Infinity -> "Lucro hoje valor enorme por unidade. Aguenta queda de 100,0% ... Aguenta alta de valor enorme nos materiais."; material NaN/Infinity -> "Preço precisa subir valor enorme (para valor enorme)...".
- **Resíduo (muito baixo, inalcançável):** com entradas FINITAS na ordem de 1e308 (preço 1e308 e material 1) `P1` faz `n*100` estourar para Infinity e imprime "Infinity%" (4 das 1.125 combinações; só |n| > 1,8e306). As telas limitam entradas a 1e9 e a API devolve finitos; não bloqueia.

## R5. Mutação do retrabalho (feito; 22 mutantes em cópia descartável; suítes stress*, StressTest*, Crafting*, Refining*)
**M29 e M23 mortos** (remover `!c.ready` e k do Craft ignorando premium: ambos agora quebram o teste novo). Dos 20 mutantes novos: **12 mortos, 8 sobreviventes.**
- Mortos: N01/N02 (rótulo de modo trocado, 2 sentidos), N03 (cityLabel removido: "Black Market" cru), N04 (sem ", sem imposto"), N05 (sem imposto invertido), N06 (noTax sempre false no adaptador), N10 (Refino com rótulo fixo), N14 (P1 sem guarda de finitude), N15 (texto "inclusive artefatos" alterado), N16 (modo omitido), N18 (cityLabel desligado), N19 (Craft ignorando `c.best.noTax`).
- Sobreviventes: **N07** (Craft com rótulo fixo 'Ordem de venda') e **N08** (Craft usando a cidade da ÚLTIMA opção em vez de `c.best`): o teste do adaptador só tem UMA opção de venda (Caerleon, ordem de venda), então não distinguem; **N09** (Refining.jsx sem `city`) e **N13** (Refining.jsx com noTax fixo false): nenhum teste de componente exercita a linha do Refino (o teste novo reproduz a chamada à mão, então a LIGAÇÃO em `Refining.jsx` continua sem proteção; verificada na tela, abaixo e nos 3.200 cenários que usam a mesma chamada); **N11/N12/N20** (centralização): jsdom não tem layout, esperado; verificada em Chrome real abaixo; **N17** (hint sem `input.city`): equivalente na prática (adaptadores sempre fornecem a cidade quando há preço).
- Avaliação: a parte de TEXTO (rótulo, cidade traduzida, sem imposto, artefatos, finitude) está bem coberta; os sobreviventes são lacunas de ligação/seleção, já listadas na D2 original (dívida para a 074), e não afetam um número exibido.

## R6. D3: grade em tela estreita (feito; CORRIGIDO)
Chrome real (puppeteer, API congelada, dev server do commit 255ba80). Ao montar, `scrollLeft` do `.table-wrap` já deixa a coluna 0% centralizada:
| Tela | área visível / tabela | scrollLeft | centro da coluna 0% vs meio da área | coluna 0% inteira visível | rolagem horizontal da página |
|---|---|---|---|---|---|
| Craft 500 px | 434 / 670 | 212 | 217 = 217 | sim | não (500 = 500) |
| Craft 375 px | 309 / 670 | 275 | 154 ~ 155 | sim | não (375) |
| Craft 900 px | 834 / 834 (sem rolagem) | 0 | n/a | sim | não |
| Refino 500 px | 434 / 633 | 188 | 217 = 217 | sim | não |
| Refino 375 px | 309 / 633 | 251 | 154 ~ 155 | sim | não |
Screenshots conferidos (`shot_craft_500.png`, `shot_refino_375.png`): célula central destacada no meio, 3-4 colunas de cada lado. A dica "Em tela estreita, role a grade para os lados" aparece. `scrollY` da janela = 0 ao carregar; com a página rolada a 500 px e um re-render (digitando em campo), `scrollY` fica 500 -> 500: **a página não salta** (o efeito só mexe no `scrollLeft` do contêiner). SSR: `renderToString` (ambiente node, sem DOM) não quebra (o efeito não roda no servidor); em jsdom os testes passam (a guarda `scrollWidth > clientWidth` é falsa).
- **Observações novas (baixas, não bloqueiam):** (O7) o efeito depende de `[input]`, que é um objeto novo a cada render do pai: se o usuário rola a grade e depois digita em qualquer campo da tela, a grade volta ao centro (medido: 0 -> 212). (O8) Centralizado, a coluna de rótulos das linhas (variação dos materiais) sai da vista e não é "sticky"; o usuário precisa rolar à esquerda para ler qual linha é qual (antes da correção ela ficava visível e o centro, escondido). Trade-off aceitável; um cabeçalho de linha fixo (`position: sticky; left: 0`) resolveria (sugestão, não defeito).

## R7. Ligação na tela e estado antigo (feito)
- Ligação real: Refino (barra T5) melhor saída/ordem: "Caerleon, Ordem de venda" (= "Preço em Caerleon"; centro 32 = "+32"); melhor/instantânea: "Bridgewatch, Ordem de compra" (-119 = -119); cidade fixa Caerleon + noTax: "Caerleon, Ordem de venda, sem imposto" (107 = +107); Martlock/instantânea: "Martlock, Ordem de compra" (-172); melhor/instantânea + noTax: "Bridgewatch, Ordem de compra, sem imposto" (-80). Craft T4 espada: "Mercado Negro, Ordem de compra" (1.556 = +1.556); noTax em Mercado Negro|compra: "..., sem imposto" (1.755 = +1.755); noTax em Caerleon|venda (não é a melhor saída): texto SEM "sem imposto", correto.
- Estado antigo/corrompido: 10 perfis históricos da 070 (6 `craft:cfg`, 4 `refine:cfg`) + 10 corrompidos (`{bad`, `null`, `"x"`, `[]`, `{"crafts":"abc","feePer100":-5,"extras":"x"}` x 2 abas): **0 telas brancas, 0 NaN/undefined/Infinity/[object], 0 erros/avisos de console, 0 rolagem horizontal da página**; cartão com 81 células ou "Preencha os preços ausentes" (item sem preço na API congelada).
- Console: 0 erros e 0 avisos em todas as telas e perfis acima.

## R8. Suíte completa com shuffle (feito)
6 execuções de `vitest run --sequence.shuffle` na branch (1074 testes): 1 passou limpa; **5 falharam, todas e somente em `src/lib/marketRequest.test.js`** (1 a 5 testes de "texto dos erros"; a IDEIA-078 já em conserto noutra branch). Nenhum teste da 031, nem de qualquer outro arquivo, falhou em nenhuma execução. Não conta contra a 031. Sem shuffle: `npm run check` 2x verde (1074).

## R9. ERROS DE DADOS
**Nenhum.** Núcleo idêntico ao commit anterior (6.000 entradas + 6.400 cenários), números do cartão iguais ao oráculo independente (19.200 comparações, 2,3e-13) e o texto da saída de venda corresponde exatamente à saída usada no cálculo em 6.400 cenários.

## R10. Estado dos defeitos
- D1 CORRIGIDO e verificado (texto honesto; 0 divergências em 6.400 cenários).
- D2 PARCIAL: M29 e M23 mortos (o pedido deste retrabalho); seguem como dívida N07/N08 (Craft com 1 opção), N09/N13 (ligação em Refining.jsx), M34/M36/M38/M40/M41 (UI) e M42-M50 (ligação Craft/Refino), para a 074.
- D3 CORRIGIDO e verificado em Chrome real (500 e 375 px).
- D4 CORRIGIDO para o alcançável (resíduo inalcançável: finitos ~1e308 viram "Infinity%").
- Novas observações (baixas): O7 (re-centraliza a cada re-render), O8 (rótulos das linhas fora da vista quando centralizado).

## VEREDITO (Re-QA retrabalho 1): APROVADO
Escopo exato (5 arquivos, nenhum teste existente alterado), 1074 testes verdes 2x, núcleo numérico inalterado, textos verdadeiros (D1), sem Infinity/NaN (D4), centro visível a 500 e 375 px sem rolagem da página nem salto (D3), M29/M23 mortos, console limpo, estado antigo/corrompido sem tela branca. A única falha de suíte com shuffle é a IDEIA-078 (`marketRequest.test.js`), fora do escopo.
