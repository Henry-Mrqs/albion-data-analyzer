# QA IDEIA-071: limite de erro, Restaurar configurações, aviso de migração

Tester independente. Branch `feat/IDEIA-071` (HEAD 7fe61f4, base 830fab7). Worktree descartável próprio (removido ao fim); nada editado na branch; servidor dev na porta 5253, parado ao fim. Chrome headless (puppeteer-core) e navegador em 375 px.

**VEREDITO: APROVADO** (com 5 pendências de baixa gravidade, todas de cobertura de teste ou de borda do aviso; nenhuma de comportamento perigoso).

## 1. Escopo e checks
- Diff: 16 arquivos = os 10 criados do plano + main.jsx, App.jsx, persistSchemas.js (só a nota), migrationNotes.js, migrationNotes.test.js, README. Sem toque em settings.js, persist.js, telas, index.css, vercel/vite config. Único teste existente alterado: `migrationNotes.test.js` (1 linha `RRR \+40` -> `\(\+40\)`, o resto é acréscimo). OK.
- `npm run check` 2x verde (lint, 38 arquivos / 959 testes, build). Base: 32 arquivos / 892 testes.
- Nenhum `usePersisted('chave'` literal em `*.test.jsx`.
- Bundle (gzip): chunk `index` 229,84 kB (75,05) -> 247,58 kB (81,09): **+17,7 kB (+6,0 gzip)** no chunk principal; Crafting 28,50 -> 28,48; Refining 15,07 -> 15,08. Causa provável: `migrationNotes.js` importa `catalog`/`craftPlan` estaticamente e é carregado pelo App. Observação (O1), não bloqueia.

## 2. Números do aviso
rrr() = PB/(100+PB): PB 18 -> 18/118 = 15,25%; PB 58 (18+40) -> 58/158 = 36,71%. Texto "cerca de 15% para 37%" confere; fala em bônus de produção (+40), diz que antes era sem o bônus; sem "RRR +40".

## 3. Restaurar em UI real
Semeado `albion:x`, `albion:settings`, `albionx`, `outra:coisa`, `ALBION:y`: abrir mostra "2 itens" (correto); Cancelar fecha, nada apagado, sem recarregar; Apagar e recarregar removeu só `albion:*` (ficaram `ALBION:y`, `albionx`, `outra:coisa`), app voltou ao inicial sem NaN/undefined. Sem nada salvo: "Não há configurações salvas..." e botão de apagar desabilitado. A confirmação cita servidor, Premium e avisos dispensados.

## 4. Limite de erro
- **Estado corrompido:** 24 estados históricos (SAVED_STATES) + 16 corrompidos (todas as chaves `{}`, `null`, lixo, `[]`, `"x"`, `0`, `true`, array misto, aninhados, flip com tipos errados/FOO, craft item id:5 + refine:null/recipeVariant '1.5', refine type FOO, rrr/target/settings inválidos, ids inexistentes, `_v` futuro) x 5 abas = 200 telas: 0 tela branca, 0 fallback, 0 NaN/undefined, 0 erro de console.
- **Erro real de render** (injetado só no meu worktree, `albion:veneno`): fallback só na área da aba; cabeçalho, abas e rodapé seguem; `role="alert"` presente; Tentar de novo volta ao fallback se a causa persiste; trocar de aba reseta (e voltar ao Refino com a causa ativa quebra de novo); Restaurar a partir do fallback: Cancelar não apaga, Apagar limpa só `albion:*` e a aba volta.
- **Limite do topo** (`albion:topo` lançando em App): "O app parou" + Restaurar; após restaurar o app volta.
- **Chunk lazy** (requisição de `Refining` abortada): "Há uma versão nova do app" com Recarregar, cabeçalho e rodapé intactos, trocar de aba recupera, Recarregar com desbloqueio recupera, abrir direto em `#refining` bloqueado idem. Sem "Algo deu errado".

## 5. Aviso de migração
craft:cfg antigo (9e1e4a2) sem refineCity: com espada (padrão ou salva) aparece com o texto novo; com T4_POTION_HEAL não aparece e nada é gravado em `albion:notice:*`; aparece em qualquer aba (é global); Entendi grava `albion:notice:craft-refine-city` e não volta ao recarregar; estado atual com refineCity e sem nada salvo: sem aviso. Item salvo `lixo`/`ench` inválido: aviso aparece (o app mostra a espada padrão: coerente).

## 6. 375 px
Sem rolagem horizontal (scrollWidth = 375) com: banner de migração, confirmação no rodapé, fallback de aba, fallback do topo, confirmação dentro do fallback e "Detalhes técnicos" aberto. `role="alert"` no fallback (1 por vez) e no erro de falha parcial.

## 7. Mutação (40 mutantes, cópia em worktree descartável, suíte completa por mutante)
Mortos 32/40. Sobreviventes:
- **M22** Suspense fora do limite (`<Suspense><ErrorBoundary>` em App.jsx): sobrevive. O plano exigia derrubá-lo; só há teste de lazy com limite+Suspense isolados (ErrorBoundary.test), nenhum no App. Em produção esse mutante faria um chunk rejeitado escapar do limite por aba (cairia no do topo, perdendo o cabeçalho).
- **M17** sem `console.error` no `componentDidCatch`: sobrevive (o plano pedia derrubar).
- **M26** item/avisos relidos a cada render em vez de uma vez (`useState` -> chamada direta): sobrevive; "leitura única" sem teste efetivo.
- **M27** aviso sem o `ready`: sobrevive.
- **M33** `some` -> `every` em craftUsesRefine e **M35** `ench` ignorado: sobrevivem (fixture sem receita mista nem variação por encantamento; M33 pode ser equivalente nos dados de teste).
- **M40** `storage` não repassado do limite ao RestoreSettings: sobrevive.
- **M28** `main.jsx` sem o limite do topo: sobrevive por construção (main.jsx não é montado em teste); verifiquei manualmente (seção 4, "O app parou").
Mortos incluem: prefixo sem ':', case-insensitive, `includes`, remoção durante iteração, propagar exceção, recarregar com falha, Cancelar que apaga, `storage.clear()`, contagem +1, botão sempre habilitado, abrir apagando direto, resetKey ausente/ignorado, Tentar de novo vazio, chunk como erro comum, title, detalhes, Restaurar fora do fallback/rodapé, filtro por item, item padrão, nota sem `when`, texto antigo/15%->21%, noticeApplies sempre true, assinaturas de erro de chunk.

## 8. ERROS DE DADOS
Nenhum (a 071 não altera fórmulas nem dados; 15,25% e 36,71% conferem com rrr()).

## Defeitos / pendências (numerados, baixa gravidade)
1. **Cobertura (M22):** falta teste no App que prove que um `lazy` rejeitado é capturado pelo limite por aba (Suspense dentro do limite). Exigido pelo plano; sobrevivente. Gravidade baixa (o código está certo; verificado em UI real).
2. **Cobertura (M17, M26, M27, M33, M35, M40):** sobreviventes listados na seção 7; o plano pedia M17 e a leitura única do aviso derrubados.
3. **Borda do aviso:** com `craft:item` salvo inválido do tipo `{id:5}` ou `{}`, o app mostra a espada padrão (que usa refino) mas o aviso é suprimido, porque `readStartup` usa o valor cru. Raro e só suprime um aviso; baixa.
4. **Bundle +6 kB gzip no chunk principal** por importação estática de catalog/craftPlan em migrationNotes (O1); aceitável, mas pode virar import dinâmico.
5. Lacuna já aceita no plano (Risco 4): aviso decidido pelo item salvo na carga; não reavaliada.

Observação sem defeito: o rodapé mostra Restaurar e o fallback também; no fallback de aba aparecem dois botões "Restaurar configurações" (aba e rodapé), o que é esperado.
