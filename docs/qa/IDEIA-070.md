# QA IDEIA-070: estado salvo antigo ou incompleto (mesclar, validar, versionar)

**Veredito: APROVADO** (com 4 observações de baixa gravidade, nenhuma bloqueante; nenhuma perda de configuração do usuário encontrada).

Branch `feat/IDEIA-070` (worktree agent-a258849af10523282, HEAD 9d24370). Auditor: Tester. Nada foi editado na branch.

## 1. Funcional
- `npm run check`: lint limpo, **635 testes** (24 arquivos) passam, build ok. `npm test` 2 vezes: 635/635 nas duas.
- Merge de teste da branch com a `master` ATUAL (que já tem 049 e 041; o briefing dizia que a 049 não estava): **sem conflito**, 705 testes passam e lint limpo (worktree descartável, abortado e removido).

## 2. Escopo
`git diff --name-only master...feat/IDEIA-070`: `App.jsx` (Banner), `settings.js`, `persist.js`, `persistSchemas.js`, `migrationNotes.js`, `migrationNotes.test.js`, `persist*.test.js`, `settings.test.js`, `test/savedStates.js`. Nada em `scripts`, `docs`, `econ.js`, `catalog*`, `market.js`, `inputRules.js`, `vite.config.js`, `vercel.json`, componentes. Único desvio do plano: `migrationNotes.js` (+teste) não estava na lista de arquivos do plano (é a função pura do aviso; coerente com a decisão do Gerente, sem componente novo).

## 3. Oráculo dos formatos históricos (independente)
Reconstruído por mim com `git show <commit>:client/src/components/*.jsx` (bloco `usePersisted('chave', …)` extraído por script e avaliado, sem usar `savedStates.js`) mais os `set({…})` de cada commit. Versões distintas de padrão encontradas no git:
- `craft:cfg`: 8bf3014 (com `deep`), 9e1e4a2 (sem `deep`), 7fe574e em diante (+`refineCity:'auto'`, `refineDaily`). Campos só por `set`: `feeSet`/`refineFeeSet` (c2bf11e), `craftDaily`/`craftDailyAt`/`waitCost` (1189152), `recipeVariant` texto (9487e40), `share` (481cbd9).
- `refine:cfg`: 8bf3014 (`deep`), f68f0af em diante (`route`); `feeSet` (c2bf11e).
- `rrr:cfg`: 451f0fa (categoria de loja, 14 categorias testadas) e 8e387f6 (categoria de craft). O `<select>` de 451f0fa listava todas as chaves de `CATEGORIES` exceto `crafting/*`.
- `target:cfg` 943c7c8, `flip:cfg`/`craft:item`/`market:item`/`market:quality` 8bf3014 (estáveis), `settings` 8bf3014 e da8bf1c (+`feeCeiling`).

**59 estados históricos** (padrão da época e mexidos, NumberInput como texto, selects numéricos como número, listas vazias, `feeCeiling` absurdo/texto). Esperado = padrão ATUAL + campos salvos, `deep` removido, `'refine'`→`'all'`, `deep:true`→`route:'all'`, categoria de loja→de craft (mapeamento conferido empiricamente contra `c`/`cc` de `catalog.json`: coincide com o do Executor).
Resultado: **0 divergências, 0 exceções, 0 tipos inválidos, 0 campos faltando, `_v` nunca vaza, ida e volta idêntica, 0 issues** em todos. Equivalência comportamental: o `modeOf` (buy/all/best) de cada recurso e a rota (`cfg.route ?? (deep?'all':'best')`) são iguais antes e depois em todos os estados. A única mudança numérica é a esperada do `refineCity` (item 6).

Comparação com `savedStates.js` do Executor (~30 estados): cobre os mesmos formatos; diferenças pequenas, nenhuma que invalide: (a) `rrr:cfg` `crafting/resources` é formato que o app nunca gravou (o select excluía `crafting/*`), inofensivo; (b) o estado rotulado "f4915f5 (041)" mistura campos de 1189152 e `recipeVariant` (9487e40, 049), atribuição de commit imprecisa; (c) faltam `craft:item`, `share`, `flip` com listas vazias e `feeCeiling` absurdo (eu cobri); (d) `rrr` com `category:''` está nos meus e não nos dele. Nenhum formato inventado que mude conclusão.

## 4. Propriedades
**180.000 estados aleatórios e de borda** (20.000 por chave x 9 chaves; null, `[]`, `{}`, 0, '', texto, número, booleano, aninhados, `__proto__`/`constructor`/`prototype`/unicode/NUL/chaves de 5000 caracteres como chave, strings de 100 KB, 1e308, `_v` inválido/futuro, JSON inválido/vazio/`undefined`, `deep` residual; seeds 12345 e 777). Violações:
- exceção: 0; tipo/enum/lista/mapa inválido ou campo faltando: 0; idempotência (`mergeSaved` duas vezes): 0; ida e volta serialize+load: 0; vazamento de `_v`: 0; mutação das entradas (entradas congeladas) e resultado compartilhando objeto com os padrões: 0.
- **Poluição de protótipo: nenhuma.** `Object.prototype` idêntico antes/depois; `({}).polluted === undefined`; no topo e em `refine`/`refineDaily`/`item` os três nomes são removidos. (Dentro de extras desconhecidos aninhados, os nomes ficam como propriedade própria de dado, inertes: 5.600 ocorrências no meu verificador, só informativo.)
- Valores gigantes: 5 MB de texto + 200.000 itens: ok em ~90 ms. Aninhamento extremo (4.000 a 50.000 níveis) como campo extra: **observação O1**: `structuredClone` estoura a pilha; em `craft:cfg`/`refine:cfg` a migração captura e a chave volta ao padrão (`migration-failed`), em `flip:cfg` `loadPersisted` LANÇA `RangeError` (contra o comentário "nunca lança"); o `try/catch` de `usePersisted` e de `settings.js` captura e devolve `initial`, então não há tela branca. Estado impossível pela UI.

## 5. Estado atual completo idêntico
Telas servidas em duas portas (branch e `master` atual), mesmo perfil `H13` (tudo preenchido, com `_v:1`) e `H13nov` (sem `_v`) nas 5 abas, mais instalação nova: diff de texto da tela = só horário de consulta e preços ao vivo da API (centésimos); Flipper e RRR 0 linhas de diferença. Isso também prova o **rollback**: a `master` lendo estado com `_v:1` funciona e mostra o mesmo. Nos testes de propriedade, estado completo e atual passa como identidade (exceto `_v`). Busca por consumo de `cfg` inteiro: componentes só leem campos por nome e o `_v` é removido em `loadPersisted` antes de chegar às telas.

## 6. Aviso de migração
Oráculo antes de rodar (função pura `pendingNotices(storage)` com storage falso, 14 casos, **todos corretos**):
- aparece: craft:cfg de 8bf3014 e de 9e1e4a2 (sem `refineCity`), com ou sem outros campos.
- não aparece: nada salvo, `{}`, `null`, JSON inválido, `refineCity` definido ('auto', 'Martlock', inválido, null), estado já com `_v:1`, só outras chaves antigas, estado atual completo, já dispensado.
- storage que lança ou nulo: sem aviso, sem exceção.
Na tela (porta 5218): com estado 9e1e4a2 o Banner aparece em todas as abas; "Entendi" grava `albion:notice:craft-refine-city=1`; não volta ao recarregar nem em outra rota; "reinstalação limpa" (notice apagado) com estado antigo mostra de novo; instalação nova não mostra. Escrever na tela de Craft grava `_v:1` e preserva todos os campos (verificado).
Efeito numérico (Craft, estado 9e1e4a2, mesmo item, `master` x branch): "RRR atual" do refino **15,3% -> 36,7%** (PB 18/118 -> 58/158); resultado do craft de -17,9% para -14,3% (custo de material cai). Com `refineCity` explícito 'Martlock' não há mudança nem aviso (H5/H6/H8..H13 sem banner). A tela da `master` já dizia "Cada recurso na sua cidade de bônus" enquanto calculava sem o bônus; a branch corrige.
**Observações do aviso:** O2: o texto "(RRR +40)" mistura unidades: +40 é o bônus de produção (PB), o RRR em % sobe cerca de +21 pontos (15,3 -> 36,7). Sugestão: "RRR do refino sobe, por exemplo, de 15% para 37%". O texto também não diz que o número antes estava errado. O3: o aviso aparece para qualquer craft:cfg antigo sem `refineCity`, mesmo que o item atual não use refino. O4: se o usuário mexer no Craft antes de dispensar, o estado é regravado com `refineCity` e o aviso some no próximo carregamento (visto uma vez, aceitável).

## 7. Matriz estado x aba (iframe por aba, app da branch; critério: `#root` não vazio, sem NaN/undefined/∞/[object])
23 perfis x 5 abas (Mercado, Refino, Craft, Flipper, RRR) = **115 telas: 0 tela branca, 0 NaN/undefined/∞**.
Perfis: H1 8bf3014 mexido (deep, refine/buy), H2 8bf3014 padrão, H3 9e1e4a2, H4 9e1e4a2 com 'refine' legado, H5 7fe574e (Martlock), H6 f68f0af (route all), H7 451f0fa (rrr weapons/axe + target), H8 c2bf11e, H9 1189152, H10 8e387f6, H11 9487e40 (`recipeVariant:'1'`), H12 481cbd9 (`share`, `feeCeiling`), H13 atual completo; corrompidos: C1 todas as chaves `{}`, C2 todas `null`, C3 texto lixo, C4 flip só `buyMode`, C5 flip com tipos errados, C6 flip grupo 'FOO', C7 craft sem `refine` e item `id:5`, C8 refine `type:'FOO'` e `market:item.id:null`, C9 rrr/target/settings inválidos (`server:'mars'`), C10 craft `refine:null`, `refineDaily:[]`, `recipeVariant:'1.5'`. Todas as 5 abas OK em todos. Banner presente só em H1-H4, C7, C10 (craft sem `refineCity`), ausente nos demais.
Não coberto: erros de console por tela (o verificador por iframe não pega aviso do React antes do hook); a captura de tela expirou (timeout do navegador). Com `localStorage` lançando `SecurityError` (modo privado) o Craft abre normalmente (9.414 caracteres, sem NaN).
Efeito de H7 (RRR com `weapons/axe`): `master` mostra espada/Lymhurst/50,50%; a branch mostra machado/Martlock/46,52%. É correção intencional da migração, mas **muda um número sem aviso** para quem tinha categoria de loja salva (raro: só estados anteriores à 038).

## 8. Mutações (cópia descartável, 34 mutantes; suíte: 5 arquivos, 137 testes)
Mortos (teste que falha, exemplos): M01 não mesclar ausente (24 testes, "craft:cfg @ 8bf3014 padrão intocado"); M02 não validar tipo (27); M03 descartar extras ("extras desconhecidos preservados, menos __proto__…"); M04 não bloquear `__proto__` (mesmo teste); M05 sem mescla profunda ("mescla profunda só onde o padrão tem chaves…"); M06 mapa sem validar entradas ("mapa com esquema: entrada inválida some"); M08 `_v` não gravado ("serializePersisted > objeto ganha _v", "setSettings grava com _v"); M09 `_v` vaza ("estado atual completo passa idêntico"); M10 migração `deep`→route removida ("refine:cfg de 8bf3014 com deep:true: route all"); M11 `refine:'refine'`→'all' removida; M12/M13/M14 migrações RRR/craft/refine removidas; M15 aviso sempre; M16 aviso nunca; M17 aviso com `refineCity` definido; M18 aviso com `_v:1`; M19 aviso em `{}`/vazio; M20 dispensa não gravada; M21 dispensa ignorada; M22 idempotência quebrada; M23 lista vazia vira padrão; M24 `recipeVariant` sem validação; M27 JSON inválido lança; M28 migração que lança derruba; M29 `deep` não removido; M31 enum aceita tudo; M32 numText aceita null; M33 `item.id` não validado; M34 coerção "500"->500.
**Sobreviventes (4):**
- M07 mapa aberto sem bloquear `__proto__`: equivalente (as entradas válidas são texto/número, atribuir a `__proto__` é no-op).
- M30 categoria RRR desconhecida sem cair em 'sword' na migração: equivalente (o esquema enum já rejeita e volta ao padrão 'sword').
- **M25 `usePersisted` gravando sem `_v` (`JSON.stringify(next)`): sobrevive** (só um teste de componente/hook pegaria; vai para a 069).
- **M26 resultado compartilhando objetos com os padrões (`clone` identidade): sobrevive**. Risco real baixo (as telas atualizam de forma imutável), mas vale um teste "não compartilha referência com os padrões".

## 9. Casos-limite
- `localStorage` lançando em leitura e escrita: app funciona sem persistir (testado na tela); dispensa do aviso não lança; `pendingNotices` com storage nulo/lançando devolve vazio.
- Quota/cheio: `setItem` dentro de `try/catch` em `usePersisted`, `setSettings` e `dismissNotice` (por leitura do código; o estado em memória continua).
- Duas abas: última gravação vence, igual ao comportamento anterior (sem regressão); o aviso dispensado em uma aba some na outra só ao recarregar.
- **Versão futura `_v:99`**: lido sem apagar nada (campos válidos e extras futuros preservados, sem issue). **O5**: ao regravar, o `_v` é rebaixado para 1 e um campo futuro com formato incompatível com o esquema atual (por exemplo `refineCity` objeto) volta ao padrão; só afeta rollback de uma versão futura, hoje inexistente.
- Estado gigante (5 MB): sem problema.

## 10. Parece erro para um jogador experiente?
- Perda de configuração salva: **nenhuma encontrada**. Campos `feeSet`, `refineFeeSet`, `craftDaily`, `craftDailyAt`, `waitCost`, `recipeVariant`, `share` e `feeCeiling` absurdo/texto (para a 060 avisar) são preservados; listas vazias continuam vazias; texto de NumberInput continua texto.
- Número que muda sem explicação: o refino do Craft (explicado pelo aviso, texto com a imprecisão O2) e a categoria da aba RRR para estados pré-038 (sem aviso, é correção).
- Aviso repetido: não. Aviso para quem não foi afetado: só O3.
- Tela que reseta ao recarregar: não observado (H13 volta idêntico; gravação preserva campos).

## 11. Pendências para a 069 (teste de componente)
Confirmado na tela: Craft com estado 8bf3014/9e1e4a2 mostra "Cada recurso na sua cidade de bônus" e RRR 36,7%; Flipper com grupo 'FOO', Refino com `type:'FOO'` e `recipeVariant:'1.5'` renderizam; Banner aparece e some com "Entendi"; instalação nova sem banner; estado gravado após edição tem `_v:1` (leitura do localStorage). Só um teste de componente cobre: `usePersisted` montado grava `_v` (mutante M25), "Produzir tudo" ativo com `deep:true` (não verifiquei o rótulo do botão, só o valor `route:'all'` carregado), Machado selecionado no RRR com `weapons/axe` (verifiquei só os números/cidade), erros de console por tela, e o seletor de receita da 049 (a branch ainda não tem o código da 049; o esquema já aceita `recipeVariant`).

## Evidências
Scripts (fora do repositório, em `AppData/Local/Temp/claude/.../scratchpad`): `oracle.mjs` (59 estados), `fuzz70.mjs` (180.000), `notice70.mjs`, `lim70.mjs`, `mut70run.mjs` e `mut70.out`/`mut70b.out`, `cmp70/` (textos das telas master x branch).
