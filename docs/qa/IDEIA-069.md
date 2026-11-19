# QA IDEIA-069 (testes de componente: jsdom + Testing Library) — laudo do Tester

Branch `feat/IDEIA-069` (4 commits sobre `5d1495e`; o código de `client/` da master não mudou desde então, só docs). Worktrees próprios fora do repositório (branch e master). Nada foi editado na branch.

## Veredito: APROVADO (sem defeito bloqueante; 6 observações não bloqueantes)

## 1. Produção intacta
- `git diff --stat master...feat/IDEIA-069`: 11 arquivos, só `README.md`, `package.json`, `package-lock.json`, `vitest.config.js`, `src/test/{setup-ui,ui}.js`, `src/lib/env.test.js` (novo) e 4 `src/components/*.test.jsx` (novos). Nenhum `src/components/*.jsx` ou `src/lib/*.js` de produção; nenhum teste existente alterado (só `A`). `catalog.test.js` já tinha o teste DT-009 na master, então não precisou mudar.
- `npm run build` em master e branch: `diff -r dist-ms dist-br` = **idêntico byte a byte** (mesmos nomes com hash, `index-C_bJ9bGa.js` 229.785 B, `Crafting-yUTDBd2R.js` 23.131 B etc.). Nada de jsdom/testing-library no bundle.

## 2. Instalação e check
- `npm ci` limpo na branch. `package.json`: `jsdom ^29.1.1`, `@testing-library/react ^16.3.3`, `@testing-library/dom ^10.4.2` só em `devDependencies`; `dependencies` inalterado (lucide-react, react, react-dom). `npm ls --omit=dev` sem jsdom/RTL.
- Lock: +49 pacotes, todos dev (0 sem `dev`/`devOptional`), 0 removidos, +623 linhas; única entrada alterada é a raiz. Abaixo da estimativa do plano (60 a 90 pacotes), coerente.
- `npm run check` 2x: lint limpo, **867 testes / 31 arquivos** passando (798 logic + 69 ui), build ok. Master com os mesmos arquivos de teste: 797 logic (+1 = guarda `env.test.js`).
- Tempo: logic 1,89 s (master 2,11 s: sem regressão). ui isolado **5,0 a 5,9 s** (5 execuções; ~65% é montagem do jsdom por arquivo). Na borda do orçamento "≤ ~5 s"; ver O6.

## 3. Mutantes (47 + 11 extras; master-checkout com os testes novos copiados; produção idêntica à da branch)
Resultado: **51 mortos, 6 sobreviventes** (M38 e M40 não casaram o texto e foram descartados).
- **M25 (`usePersisted` grava `JSON.stringify(next)` sem `_v`): morto** por "grava com o campo reservado _v" (ui.test.jsx).
- **M26 (`clone = v => v`, compartilha referência): morto** por 2 testes (sem valor salvo e com valor parcial salvo).
- 041: aviso de data futura (M01/M03), bônus velho (M02/M04), nota do campo (M05/M06), nota do cartão (M09), `hasCard` (M07/M08), tolerância/reset (M33 a M37): todos mortos.
- 039/049: selo removido (M10), texto/title (M11/M12), `returnable` (M13), `SHARD` fora do regex (M14: morto só pelo logic, o DT-009 já existe em `catalog.test.js`), `unverified` (M15).
- Seletor 049: `<2` virar `<1` (M20), `i===0` no lugar de `cheapest` (M21/M22), `isComplete` ignorado (M23), `String(mode)` (M24), coluna da taxa e custo total (M27/M28), `depends` e inicial maiúscula (M29/M30), `feeDecides` (M31/M32).
- Ambiente: remover `afterEach(cleanup)` (M52) e `localStorage.clear()` do `resetApp` (M53) derrubam testes: o isolamento é protegido.
- Plano (linha de Crafting): `idx` ignorando `recipeVariant` (M18) e `auto` fixo em 0 (M17) mortos; o fallback fora de faixa "para auto" (M16) só o logic mata.

**Sobreviventes (nenhum está nas tabelas do plano; todos são ligação Crafting com filho/estado sem teste):**

| # | Mutante | Sobrevive porque | Equivalente? |
|---|---|---|---|
| M19 | `pickerMode = 'auto'` fixo | nenhum teste de Crafting olha o segmento ativo do picker com `recipeVariant` salvo | Não (mostraria "Automático" com receita escolhida) |
| M54 | `onChange` do picker grava `'auto'` em vez de `v` | nenhum teste clica no picker dentro do Crafting | Não (a escolha seria ignorada) |
| M55 | `rec = variants[0]` (cartão de espera/foco usa a receita errada) | idem; `results[idx]` está coberto (M56 morto) | Não |
| M41 | remover o reset de `recipeVariant` ao trocar de item | nenhum teste troca o item | Não |
| M47 | `craftDailyAt: 0` ao escolher o bônus no select | nenhum teste usa o select do bônus | Não |
| M48 | `usePersisted.setValue` ignora updater em função | `Probe` só passa valor; o Crafting não recebe evento | Não (todo `set({...})` do app usa updater) |

Risco baixo (a lógica pura tem teste em `recipeAlt`/`dailyBonus`). Um teste de Crafting que clique "Ficha de favor" (confere material e botão ativo) mata M19/M54/M55; um que troque o select do bônus mata M47/M48.

## 4. Desvios do Executor
1. **`recipeVariant '9'` cai na primeira variante:** confirmado na lógica real (`resolveVariant`: `Number.isInteger(n) && n >= 0 && n < count ? n : 0`, comentário "fora de faixa = 0", já pinado em `recipeAlt.test.js`). O plano dizia "última variante": engano do plano; o comportamento é o desejado. **O teste de Crafting é fraco:** com artefato 1.840 x ficha 18.498 a automática também é a variante 0, então não distingue "cai em 0" de "cai na automática" (M16 sobrevive no ui). Sugestão: ficha 1.000 (auto = 1) e esperar o artefato.
2. **Seed do `usePersisted` com objeto:** ok; mais fiel que o plano (string), exercita merge e `_v`.
3. **Chave não literal (`persistSchemas.test.js` varre `usePersisted('chave'` em todo `.jsx` de `components/`):** **frágil**. Reproduzi: com `usePersisted('craft:item', ...)` literal em `ui.test.jsx`, `persistSchemas.test.js` falha ("craft:item (ui.test.jsx): padrão ... idêntico ao literal"); com chave nova, falha a lista das 8 chaves. O README não documenta a restrição. Recomendação: filtrar `.test.jsx` na varredura (uma linha, numa ideia seguinte, pois a 069 não edita teste existente) e, até lá, uma linha no README.
4. **Passo RED da Task 2 pulado:** aceitável; a prova de que os testes não são tautológicos é a mutação (M52, M53, M25, M26 mortos).

## 5. Flakiness
Suíte `ui` 5x seguidas: 69/69 sempre. `--sequence.shuffle` 3x (sementes aleatórias) no ui e suíte completa com `--sequence.seed=7`: 867/867. Nenhuma falha; nada depende de relógio real (só `Date` congelado) nem de rede; `localStorage` zerado em todo `beforeEach`.

## 6. Erros de dados
Nenhum. Números conferem com os dossiês: bruto 4.400, RRR 24,8% x 34,6% (041), taxas 403 e 634 e diferença 16.889 (049), 1.840 x 18.498. `craftCfg()` é igual a `CURRENT_DEFAULTS['craft:cfg']` hoje (teste descartável).

## Observações não bloqueantes
- **O1** M19/M54/M55/M41/M47/M48 (§3).
- **O2** Teste de '9' sem poder discriminativo (§4.1).
- **O3** Restrição de chave literal frágil e não documentada (§4.3).
- **O4** O "contrato dos defaults" só confere "sem 'corrigido'"; não compara `craftCfg()` com `CURRENT_DEFAULTS['craft:cfg']` (existe em `src/test/savedStates.js`): divergência futura passaria em silêncio. Uma linha `expect(craftCfg()).toEqual(CURRENT_DEFAULTS['craft:cfg'])` resolve.
- **O5** `Crafting.test.jsx` tem exatamente 12 renderizações (limite do plano).
- **O6** Tempo do `ui` 5,0 a 5,9 s, no limite; novos `.test.jsx` devem ser poucos e grandes (um jsdom por arquivo).

## Evidências
Scripts fora do repositório em `AppData/Local/Temp/claude/.../scratchpad`: `mut.mjs`/`mut.out`, `mut3.mjs`/`mut3.out`, `dist-ms` x `dist-br`.
