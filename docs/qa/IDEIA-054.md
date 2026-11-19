# QA IDEIA-054 — aba "Premium" (Tester independente)

Branch `feat/IDEIA-054` @ 64b8426 (3 commits sobre 1d59748). Checkout próprio (worktree detached em scratchpad/tester54/wt). Relatório salvo por etapas.

## 1. Escopo e verificações mecânicas — OK
- Arquivos alterados vs merge-base: `App.jsx`, `Premium.jsx`, `gold.js`, `inputRules.js` (só `export` de `br`/`echoValue`), `persistSchemas.js` (+`premium:cfg`), `premium.js`, `savedStates.js`, `persistSchemas.test.js` + testes novos (`premium.test.js`, `gold.test.js`, `Premium.test.jsx`, `App.premium.test.jsx`). Nada fora da lista do plano; `market.js`, `Crafting/Refining/Flipper`, `index.css` intocados.
- Único teste existente alterado: `persistSchemas.test.js` (lista de chaves agora 9 e `FILES` com `Premium.jsx`) — autorizado. `savedStates.js`: +1 `CURRENT_DEFAULTS` e 4 entradas de `SAVED_STATES` (plano dizia 3; desvio trivial).
- Nenhum `*.test.jsx` com `usePersisted('chave'` literal (git grep vazio).
- `npm run check` 2x: verde (lint + 56 arquivos / 1178 testes + build). Suíte `logic` com `--sequence.shuffle` 5x: 39 arquivos / 983 testes, verde nas 5.
- Bundle: `Premium` é chunk lazy (Premium-*.js 7,74 kB / 3,19 gz). `index` 249,87 -> 250,43 kB (+0,56 kB; gzip 81,93 -> 82,15): entrada em TABS + ícone `Coins`. Aceitável, mas "inalterado" não é literal (ver Observação O1). Crafting 30,44 inalterado.

## 5.x Fonte das regras (dossiê vs jogo)
- Wiki oficial `wiki.albiononline.com/wiki/Premium`: **NÃO verificável** pelo Tester (Cloudflare 403 em curl/WebFetch, fandom idem, web.archive bloqueado). Logo, o dossiê P2 (10.000 foco/dia, 30 pts aprendizado, +50% fama, +50% coleta, imposto 8%->4%) continua **não confirmado na fonte primária** por esta QA.
- VERIFICADO hoje (2026-11-19) em `aorefinery.com/gold` (fonte secundária, ao vivo): "30 days of premium (3,750 gold)"; ouro 9.634 (Americas), custo 36,13M; calculadora usa "% of 10,000 a day" de foco (confirma 10.000/dia como padrão de mercado, não do jogo); "Tax saved 800k" com 20M vendidos (= 4% de 20M, confirma 8%->4%); "Not counted: 50% more silver and loot from mobs, more fame, double crop yields on islands, faster animal growth and the extra gathering yield."
- Portanto: o app lista como não contados "pontos de aprendizado" e "ilhas e animais", e diz "(lista da fonte)"; a fonte (AO Refinery) NÃO cita pontos de aprendizado — ver defeito/observação adiante.
- Taxa de criação de ordem 2,5% igual com/sem Premium: confirmado no repo (econ.js, AUDITORIA-001) mas não na wiki; o app não usa isso no cálculo.

## 2. Oráculo independente — OK
Script próprio (fórmulas do dossiê, sem importar constantes de premium.js; roda via vitest só para resolver imports). 9 casos fixos do briefing (G 9.414/V 20M/s 43: custo 35.302.500, imposto 800.000, foco 12.900.000, saldo -21.602.500, V* 560.062.500; s 6,78: foco 2.034.000, V* 831.712.500; G 9.411: 35.291.250; G 10.000: V* 615.000.000; foco 5.000/dia: 6.450.000 e 721.312.500; s 120: paysAlone e +697.500; V 0: -22.402.500; V 5e8: -2.402.500; goldCost 3.000: 28.242.000) todos exatos. **3.500 cenários aleatórios** (G, V, s, foco/dia, goldCost variados; custo/imposto/foco/saldo/V*/paysAlone, tolerância 1e-6 relativa; mais coerência saldo(V*)=0): 0 divergências. TAX_SAVING = 0,04 (dif. de 1e-12), PREMIUM = 3750/30/'2026-11-18'. Os mesmos números aparecem na tela real (E1: 35.302.500 / 800.000 / 12.900.000 / -21.602.500 / 560.062.500; s 120 V 0: +697.500 e "não precisa de vendas"; goldCost 3.000: 28.242.000; s 6,78: 831.712.500; foco 5.000: 721.312.500).

## 3. gold.js — OK (API real, 2026-11-19 ~21:46 UTC)
- Endpoint existe POR SERVIDOR e responde: west (9.644, 21:00), europe (9.911, 21:00), east (15.504, 16:00). O preço difere muito por servidor (east ~15,5k), logo usar o servidor do cabeçalho (D-062) faz sentido e é necessário. Formato `[{price:int, timestamp:"YYYY-MM-DDTHH:00:00"}]` (sem Z; o parser trata como UTC, correto). `count=3` vem do mais novo para o mais velho; SEM `count` a API devolve ~30 dias em ordem CRESCENTE; `count=0` devolve `[]`. `parseGold` escolhe o ponto de maior timestamp em qualquer ordem (testado nas duas ordens com linhas reais).
- parseGold: price 0/negativo/NaN/Infinity/texto/ausente, timestamp ausente/lixo/número, null/objeto/texto/array vazio, linha null no meio: ignorados ou null, sem lançar.
- fetchGold (requestFn injetado e também chamando a API real nos 3 servidores): cache por servidor; TTL exatamente 180 s (179.999 ms = cache, 180.000 = refaz); servidor diferente não compartilha; `force` ignora; erro NÃO entra no cache; `[]` -> "A API não devolveu o preço do ouro." e não cacheia; rótulo 'ouro'. Mensagem de erro de 429 vem do `request()` compartilhado (lê "resets at", compartilha o bloqueio com market.js: tela mostrou "Liberado em 90s").
- A API ficou em 429 ("Throttle resets at 21:45") quando comecei: aconteceu de verdade (vários testers em paralelo); após o reset funcionou. 
- Preço NUNCA preenchido sem clique: na tela real o campo "Preço do ouro" abre vazio (placeholder "ex.: 9414") com o botão "Usar o preço atual (9.644 · 48 min)"; só o clique grava `gold:"9644"` em `premium:cfg`. Nos modos 429, offline, `[]` e lixo: sem botão, banner "Não foi possível buscar o preço do ouro" com a mensagem e "Você pode digitar o preço", aba utilizável (digitar 9414 calcula). Sem exceção de página.
- Pergunta do Executor (servidor): confirmado: endpoint por servidor, preços distintos, faz sentido.

## 4. Estado antigo/corrompido de `premium:cfg` — OK (com observações)
26 estados semeados em localStorage antes do carregamento (null, [], texto, número, true, {}, [1], JSON inválido, campos número, 1e9, 1e15, 1e16/1e300, -1 (número e texto), "NaN", "Infinity", 1e999 cru, strings de 100 KB, objetos/arrays/null/true nos campos, `__proto__`/`constructor`, `_v` 99 e "abc", "0x10", "1,5", "1e", tudo 0, 1e-300): **0 telas brancas, 0 exceções, 0 `[object`, 0 NaN/Infinity calculados**. Avisos corretos por campo, sem eco de objeto. Os "NaN"/"Infinity" visíveis em `nanstr`/`infstr` são só o eco do texto digitado entre aspas no aviso ("Preço do ouro "NaN" não é um número"), não resultado. Números enormes saem como `3e19`/`1e18` (o plano dizia "valor enorme"; ver O3).
- Observações: (a) `"0x10"` salvo é aceito como 16 (Number()); só por estado salvo, a UI numérica não permite; convenção geral do app. (b) Texto de 100 KB salvo é ecoado inteiro nos avisos (5x no DOM, `echoValue` sem truncar); só por estado corrompido; sem travamento visível. (c) `gold:"1e-300"` é aceito (>0): custo "0 prata", paysAlone; irreal. Nenhum afeta usuário real.

## 5. UI real (porta 5301, parada ao fim; puppeteer + Chrome)
- #premium abre direto a aba; aba lazy; as 5 outras abas abrem pelo hash e mostram conteúdo sem NaN/undefined/∞; console sem erros (exceto o "Failed to load resource" do próprio 429/offline simulado). Editar constantes/valores persiste (`albion:premium:cfg` com `_v:1`; recarregar mantém "9414,,0,43,5000"). Sem rolagem horizontal da PÁGINA a 1000/500/375/360/320 (`scrollWidth == clientWidth`).
- **D1 (a 6ª aba NÃO cabe a 500 nem a 375 px):** a barra `.tabs` (overflow-x:auto, scrollbar oculta) tem 567 px de conteúdo; navegação útil é 468 px a 500 e 343 a 375. A 500 px "Premium" (477-583) fica cortada com ~7 px visíveis; a 375 e abaixo não aparece (nem RRR a 375, que já estava cortada na master; a 5ª aba cabia a 500: 458 px). Abrindo por `#premium` a aba ativa NÃO é rolada para a vista (scrollLeft 0, `activeVisible:false`). Pela D-060/D-062 aplica-se "ícone sem rótulo" como retrabalho. Medido: com só ícone cada aba tem 44 px e a barra inteira (6x44 + 5x4) = 284 px, cabe a 500, 375, 360 e até 320 (nav 288). Exigir `aria-label`/`title` nas abas só-ícone, e/ou rolar a aba ativa para a vista.

## 6. Honestidade dos textos
- Tela não recomenda: nenhuma ocorrência de "compre"/"vale a pena"/"não vale"; a introdução diz "não uma recomendação" e o rodapé "o app não recomenda a compra". O título "Vale pagar Premium?" é pergunta, mas o resultado é só saldo, sem veredito.
- Pressupostos visíveis: custo 3.750 ouro "conferido em 2026-11-18 em fonte secundária (AO Refinery). Pode mudar por patch"; foco/dia 10.000 "padrão do app, não confirmado"; "Só conta o foco que você realmente gasta"; rodapé "O resultado é só imposto + foco − custo". Bom.
- "Não conta": +50% de prata e saque de monstros, fama extra, pontos de aprendizado, +50% de rendimento de coleta, ilhas e animais. A AO Refinery (ao vivo hoje) lista: +50% de prata e loot de mobs, mais fama, dobro de colheita em ilhas, crescimento de animais mais rápido, rendimento de coleta extra. **D2 (baixa):** o rodapé atribui a lista à fonte ("lista da fonte"), mas "pontos de aprendizado" não está na lista da AO Refinery (vem do dossiê P2, wiki não verificada). Não há menção a diário/journal de ofício nem a bônus de velocidade de coleta: não consegui confirmar na wiki oficial se o Premium dá algo nisso (Cloudflare 403), portanto não afirmo que falte; sugere-se trocar "(lista da fonte)" por "(AO Refinery; confira no jogo)".
- Taxa de criação de ordem 2,5%: igual com/sem Premium (regra do app/AUDITORIA-001); a tela só usa a diferença de 4 pontos, correto se for verdade.
- **Verificado x não verificado nas regras do jogo:** VERIFICADO (AO Refinery ao vivo, fonte secundária): 3.750 ouro por 30 dias; foco tratado como "% de 10.000 por dia"; economia de imposto = 4% do volume (800k sobre 20M); lista de não contados; custo = 3.750 x preço do ouro (36,13M a 9.634). NÃO VERIFICADO (wiki oficial inacessível, WebSearch indisponível): que 30 dias custa 3.750 ouro no jogo hoje; 10.000 foco/dia como benefício do Premium (e se é incremental ou o total do pool); +50% fama/coleta; 30 pontos de aprendizado; imposto 4% vs 8%. Dossiê P1/P2 continuam MÉDIA, como declarado.

## 7. Mutação (47 mutantes executados em premium.js, gold.js, Premium.jsx, App.jsx, persistSchemas.js; 5 arquivos de teste da 054 + persistSchemas.test.js)
Mortos 42. Sobreviventes reais:
- **u04** remover `res.paysAlone ? 'não precisa de vendas' :` da célula "Volume de vendas de equilíbrio": a célula passaria a mostrar "0 prata por mês" e nenhum teste pega (a frase "já cobre o custo" é testada; o texto da célula não).
- **u14** botão "Atualizar" sem efeito (`onClick={() => {}}`): nenhum teste de UI exercita o refresh.
- **a02** `Premium` importado sem `lazy` em App.jsx: nenhum teste; verifiquei no build que o chunk `Premium-*.js` (7,74 kB) é separado.
- **s01** `focusPerDay` fora do esquema de `persistSchemas`: sobrevive (equivalente na prática: campos desconhecidos são preservados pelo merge; o teste de contrato não pega).
- (u01 primeira versão, "preenche sozinho" via setTimeout, sobreviveu por ser mutante fraco; a versão síncrona u01b foi morta.)
Mortos incluem: days 31; TAX_SAVING escrito 0,05; goldCost 3700; `<` por `<=` em paysAlone; V* sem foco; saldo sem foco / sinal do imposto; foco fixo 10.000; custo sem goldCost editável; ouro 0 aceito; teto de volume; lixo -> 0 sem aviso; V* sem dividir; gold<=0 ; goldCost vazio=0; focus sem days; TTL 30 min; TTL `<=`; ponto mais antigo; price 0; cache sem servidor; `force` ignorado; resposta vazia sem erro; count errado; rótulo; timestamp sem Z; botão "Usar" preenchendo sozinho; rodapé Não conta removido/não exibido; item da lista removido; aviso paysAlone removido; saldo sem foco na tela; preço errado no botão; chave errada; sem banner de erro; sem avisos do ouro; dica sem data; campo errado; sem texto de não recomendação; sem aba; id da aba.

## 8. ERROS DE DADOS
**Nenhum erro numérico.** Todas as contas conferem com o oráculo (3.500 cenários + 9 casos do briefing + tela real). Pontos de dado/fonte a registrar (não são erros de cálculo): constantes 3.750 ouro e 10.000 foco/dia dependem de fonte secundária (declarado e datado na tela); atribuição "lista da fonte" com item que a fonte não cita (D2).

## Defeitos
- **D1 (média, retrabalho conforme D-060/D-062):** a 6ª aba não cabe a 500 px nem a 375 px; a 500 px a 5ª aba cabia e agora "Premium" some (7 px visíveis); a 375/360/320 não aparece e, abrindo `#premium`, a aba ativa não é rolada para a vista. Medido: só ícone (44 px cada, total 284 px) cabe até 320 px. Aplicar ícone sem rótulo (com `aria-label`/`title`) e/ou `scrollIntoView` da aba ativa. (RRR já estava cortada a 375 na master; fora do escopo.)
- **D2 (baixa):** "(lista da fonte)" no rodapé inclui "pontos de aprendizado", que a AO Refinery não lista; reformular a atribuição.
- **D3 (baixa, testes):** sobreviventes u04, u14, a02 (s01 equivalente): faltam testes para o texto "não precisa de vendas" na célula, o botão Atualizar e o carregamento lazy.
- Observações: O1 `index` +0,56 kB (aba + ícone, esperado); O2 números enormes aparecem como `3e19` em vez de "valor enorme" do plano (sem NaN/∞); O3 eco de texto salvo muito longo nos avisos sem truncar (só estado corrompido); `"0x10"` salvo vira 16; SAVED_STATES com 4 entradas (plano: 3). Merge de teste com a master atual (a5fe2af, inclui 075): sem conflito (`git merge-tree`).

## Veredito: **REPROVADO** (retrabalho D1; D2/D3 baixos). Cálculo, gold.js, persistência, estado corrompido, textos e escopo estão corretos; reprovo apenas porque a sexta aba corta a 500/375 px, o gatilho que o plano (Task 4) e a D-062 definem como retrabalho (ícone sem rótulo). Nada foi mergeado, enviado ou implantado; servidor da porta 5301 parado.

---

# Re-QA (retrabalho 1) — 3fd872e (sobre 64b8426; commits f4fc57c e 3fd872e)

## R1. Escopo e verificações mecânicas — OK
- `git diff 64b8426..3fd872e`: só `App.jsx`, `index.css`, `Premium.jsx` e 3 testes NOVOS (`App.lazy.test.jsx`, `App.tabs.test.jsx`, `Premium.extras.test.jsx`). Nenhum teste existente alterado.
- `npm run check` 2x: verde, 59 arquivos / **1187 testes** nas duas; build ok (index 250,65 kB / 82,23 gz; +0,22 kB sobre a 1ª entrega, só os atributos e o efeito). Suíte `logic` com `--sequence.shuffle` 5x: 39 arquivos / 983 testes, verde nas 5.
- Merge de teste com a master atual (a5fe2af, inclui 075): `git merge-tree` sem conflito.

## R2. Medição de largura (puppeteer, Chrome, porta 5301, reload com #premium e #rrr em cada largura)
Larguras: 320, 360, 375, 500, 641, 660, 700, 701, 768, 940, 960, 961, 1000, 1280. Em TODAS: 6/6 abas dentro da barra (`allVis`), `.tabs` scrollWidth == clientWidth (288 a 320 px; 343 a 375; 468 a 500; 609-668 a 641-700; 329-396 a 701-768; 568-588 a 940-960; 589-868 a 961+), **`documentElement.scrollWidth == clientWidth`** (sem rolagem horizontal da página), aba ativa visível em `#premium` e `#rrr`, 6/6 abas clicáveis (clique real em cada uma ativa a aba certa). Rótulos: ocultos (`display:none`) até 960 px inclusive e visíveis em todas as abas a partir de 961 px (barra de 589 px cabe exatamente: tabs 149-737, ferramentas 753-945 sem sobreposição). A 701-960 px a barra de ícones ocupa menos que o espaço disponível (poderia mostrar rótulo a partir de ~940 px; escolha do Executor, sem efeito ruim).
- Screenshots 641, 700, 701 e 960 olhadas: a 641-700 px a linha 1 tem marca + servidor + Premium e a linha 2 a barra de 6 ícones alinhada à esquerda, sem quebra feia; 701 e 960 em linha única (marca, 6 ícones, ferramentas à direita). A 320 px as ferramentas vão para uma linha própria (cabeçalho com 3 linhas, 129 px), aceitável.

## R3. scrollIntoView, teclado, acessibilidade — OK
- O cabeçalho é `position: sticky`, então `scrollIntoView({block:'nearest'})` não precisa mover a página. Medi scrollY antes/depois (375 e 1000 px): clicar em "Premium" com scrollY 30 -> 0 (reset normal do conteúdo mais curto); trocar de hash com scrollY 400 -> mantém 400; Voltar com Craft rolado a 500 -> #refining scrollY 0 e Avançar -> #crafting scrollY 500. **Idêntico com o efeito removido (mutante)**: o scrollIntoView não introduz nenhum salto; o scrollY 0 ao voltar é do app (altura do conteúdo), não da 054.
- Teclado: Tab percorre as abas em ordem (5 Tabs de Mercado -> "Premium"); Enter ativa (#premium e `.tab.active` correto).
- Abas só-ícone: `aria-label` e `title` = nome em todas as 6; árvore de acessibilidade lista os botões "Mercado, Refino, Craft, Flipper, RRR, Premium" mesmo com o rótulo oculto; com rótulo visível (≥961) o nome acessível é igual ao texto. `aria-current` não é usado (a aba ativa só tem a classe `active`; já era assim; observação, não regressão). Sem erro de console.

## R4. Regressão visual master x branch — OK
Mesmo navegador, API bloqueada nas duas (conteúdo determinístico), 5 abas x (1000, 1280 px), screenshots de página inteira, diferença de pixels. Corpo (abaixo do cabeçalho): **0 pixels diferentes** em todas, exceto uma diferença única em Craft 1280 px na 1ª rodada que NÃO se reproduziu (3 rodadas extras: master x master, branch x branch e master x branch idênticas, 2144 px de altura iguais; ruído de renderização com 1,5 s de espera). Cabeçalho: a única diferença é o retângulo da nova aba "Premium" (x 624-701 / 644-721, y 20-36). Nada mais mudou nas outras abas nem no cabeçalho.

## R5. Texto do rodapé — OK (observação)
"Não conta: +50% de prata e saque de monstros, fama extra, pontos de aprendizado, +50% de rendimento de coleta, ilhas e animais (AO Refinery; confira no jogo). O resultado é só imposto + foco − custo. Fontes divergem...; o app não recomenda a compra." mais a nota: "Fonte secundária (AO Refinery), não verificada no wiki oficial: 3.750 ouro por 30 dias, 10.000 de foco por dia, +50% de fama e de coleta, 30 pontos de aprendizado, imposto de 4% contra 8%. Confira no jogo." Isso lista exatamente os cinco itens que esta QA também não conseguiu confirmar no wiki oficial. Observação: sob o rótulo "AO Refinery", "30 pontos de aprendizado" e "+50% de coleta" na verdade vêm do dossiê (wiki em trecho), não da AO Refinery; a conclusão (não verificado, confira no jogo) continua honesta e o D2 original (atribuir "lista da fonte") foi corrigido. Sem recomendação de compra.

## R6. Mutação dos testes de guarda e dos novos (19 mutantes, 17 mortos)
Mortos: u04 (célula sem "não precisa de vendas"), u14 (Atualizar sem efeito), a02 (Premium sem lazy), sem `aria-label`, sem `title`, `aria-label` errado, sem scrollIntoView, `block:'start'`, efeito só ao montar (deps `[]`), sem `inline:'nearest'`, efeito na aba errada, classe `tab-label` renomeada, rótulo removido do DOM, `navRef` não ligado, sem a nota de fonte secundária, volta "(lista da fonte)", rótulo nunca oculto (CSS). Os 3 sobreviventes da 1ª QA (u04, u14, a02) agora morrem. Sobreviventes: **r17 e r18** (alterar os pontos de corte do CSS, 960->600 e 700->640): esperado, o jsdom não avalia media queries; os pontos de corte foram verificados por mim em navegador real (R2). Risco residual baixo: mudar o breakpoint no futuro não derruba teste.

## R7. ERROS DE DADOS
**Nenhum.** Nada de cálculo mudou (premium.js/gold.js intocados; 1ª QA continua valendo: oráculo 3.500 cenários e 9 casos fixos).

## Defeitos
- D1 (6ª aba cortada): **CORRIGIDO** (R2/R3). D2 (atribuição "lista da fonte"): **CORRIGIDO** (R5; sobra a observação sobre rótulo "AO Refinery"). D3 (testes u04/u14/a02): **CORRIGIDO** (R6).
- Observações (não bloqueiam): barra só-ícone também entre 701 e 960 px, embora a barra com rótulo caiba a partir de ~940 px; `aria-current` não usado na aba ativa (já era assim); breakpoints de CSS sem teste automatizado (r17/r18).

## Veredito da Re-QA: **APROVADO**
Servidores 5301/5302 parados; nada foi mergeado, enviado ou implantado; a branch não foi editada (mutações feitas e revertidas só no meu worktree).
