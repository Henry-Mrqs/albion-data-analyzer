# QA IDEIA-067: cache do catálogo sem janela de dado errado

**Veredito: APROVADO**

Branch `feat/IDEIA-067` (HEAD `de5a841`), worktree `agent-a26d410862734050d`. Nada foi editado na branch; temporários fora do repositório (scratchpad).

## 1. Funcional
- `npm run check` verde: lint sem avisos, 214 testes (11 arquivos), build ok. `npm test` rodado mais 2 vezes: 214/214 nas duas.

## 2. Escopo
- `git diff --stat master...feat/IDEIA-067`: exatamente 7 arquivos (catalogLoad.js, catalogLoad.test.js, catalogVersion.js, catalogVersion.test.js, catalog.js [só import + `loadCatalog`], vite.config.js, vercel.json; 177 inserções, 6 remoções).
- Não mudaram: `catalog.json` (byte a byte idêntico ao da master, `cmp`), `build-catalog.mjs`, fixture, `econ.js`, `market.js`, `settings.js`, `docs/*` (o diff com dois pontos mostra docs só porque a master avançou depois do ponto de partida). Nenhuma regra de cálculo alterada.

## 3. Hash/ID
- Dois `npm run build` seguidos: `dist` idêntico (diff -r vazio). Id = `4c9c57b9e5` = SHA-1 (10 hex) dos bytes de `public/data/catalog.json`, recalculado por script próprio e também igual ao SHA-1 do blob do git.
- 1 byte alterado em cópia: `ecbe2edca4` (muda). Arquivo ausente: `dev`.
- Id aparece em exatamente 1 bundle (`index-*.js`, `{fetchFn:fetch,base:'/',id:'4c9c57b9e5'}`); `VITE_CATALOG_V` = 0 ocorrências em todos os JS. `dist/data/catalog.json` idêntico a `public/data/`.
- CRLF: o `catalog.json` tem 0 quebras de linha (uma linha só, 586764 bytes), então não há conversão CRLF/LF possível; `git ls-files --eol` = `i/none w/none`. Mesmo com `core.autocrlf=true` no Windows, o checkout da Vercel (Linux) produz os mesmos bytes e o mesmo id. Se algum dia o arquivo ganhasse quebras de linha, o id mudaria (variante CRLF testada: `79debcc1cb`), o que apenas troca a chave do `?v=`; o servidor ignora a query, então nada quebra.

## 4. Cabeçalhos e rotas
- `vercel.json` é JSON válido. Rewrite `"/((?!data/|assets/).*)"` inalterado. Único diff: `/data/(.*)` de `public, max-age=3600, stale-while-revalidate=86400` para `public, max-age=0, must-revalidate`. Não existe cabeçalho para `/assets/` nem na master nem na branch (nada tocado; vale o padrão da Vercel).

## 5. Validação do catálogo (oráculo próprio: objeto; `items` array não vazio com `i` string; `cityOf` objeto não vazio; `vals`/`extra`/`encNames` presentes)

| # | Catálogo | validateCatalog | Meu oráculo | Resultado |
|---|---|---|---|---|
| i | master atual | ok | válido | OK |
| ii | antigo (`0a950de~1`, sem `cityOf`) | falha: `cityOf (objeto não vazio)` | inválido | OK (é o cenário do bug) |
| iii | `feat/IDEIA-057` (588712 bytes, com `tm`, sem `r/a/f/er` em 20 recursos) | **ok (passa)** | válido | OK: a 067 não bloqueia o deploy da 057 |
| iv | truncado / vazio / HTML / `{}` / `[]` / `null` / string / número / `items:'abc'` / `cityOf:'x'` / `vals:[]` | falha (ou JSON.parse rejeita) | inválido | OK, nenhuma exceção não tratada |

Observações (não bloqueiam):
- Itens sem `i`, `items:[null]` ou `items:[{n:'x'}]` passam em `validateCatalog` (só exige lista não vazia). Igual ao plano; a defesa é estrutural/superficial. Ver risco 4 do plano.
- Respostas de JSON inválido (HTML, truncado) lançam o erro cru de `JSON.parse` no Banner ("Unexpected token '<'..."), sem a mensagem clara nem a nova tentativa. Comportamento igual ao de antes da 067; fora do escopo do plano.

## 6. Simulação (servidor Node próprio, porta 5197; 5199 e 5198 estavam ocupadas por outros agentes e não foram usadas; aba nova)
- (c) Build da **master**, catálogo antigo + cabeçalho antigo (1 h): primeira visita mostra "Sem cidade de bônus conhecida para este item" na espada. Troca do servidor para o catálogo novo e nova visita: **0 requisições chegam ao servidor** (`transferSize=0`), continua "Sem cidade de bônus". Bug reproduzido.
- (d) Build da **branch** sobre o mesmo navegador/cache: 1 requisição `/data/catalog.json?v=4c9c57b9e5` (200, 587064 bytes, vinda da rede), espada = "Lymhurst (bônus)", sem Banner. Segunda visita: 1 requisição condicional com `If-None-Match`, 304 (300 bytes).
- Servidor que ignora a query e devolve o catálogo antigo: exatamente 2 requisições (`?v=…` e `?v=…&r=<timestamp>` com `cache-control: no-cache`/`pragma: no-cache`), depois Banner "Falha ao carregar o catálogo de itens / Catálogo desatualizado ou incompleto (campo ausente ou inválido: cityOf …). Recarregue a página (Ctrl+F5); se persistir, avise o responsável."
- Servidor velho na 1ª e novo na 2ª: 2 requisições, carrega normal, sem Banner.
- HTTP 500 e 404: 1 requisição, Banner "Catálogo indisponível (HTTP 500/404)". HTML de erro e JSON truncado: Banner com erro de parse (ver acima). Conexão derrubada: Banner "Failed to fetch" (o Chrome refaz a conexão sozinho, 3 hits; o app não faz retry). Servidor que nunca responde: fica em "Carregando catálogo de itens…" indefinidamente (sem timeout; igual a antes da 067, plano não promete timeout).

## 7. Testes novos e mutações
- `catalogLoad.test.js` (16) e `catalogVersion.test.js` (4): leitura confirma que testam o que dizem (usam o catálogo real do repositório e `fetchFn` falso).
- Mutações em cópia descartável (suíte completa de 214 testes a cada uma):

| Mutação | Resultado |
|---|---|
| remover a nova tentativa | morta (2 falham) |
| tentar 2 vezes (3 requisições) | morta |
| remover o cache-bust `r=` | morta |
| remover `cache:'reload'` | morta |
| `&` trocado por `?` | morta (2) |
| aceitar catálogo sem `cityOf` | morta |
| `cityOf` pode ser `{}` | morta |
| não validar `items` / `items` pode ser vazio | morta / morta |
| `schema` ausente = 0 | morta (4) |
| validação sempre ok | morta |
| hash constante / 8 chars / ausente lança | morta / morta / morta |
| sem `encodeURIComponent` | morta |
| HTTP !ok passa a seguir | morta |
| **URL sem `?v=` em produção** (remover `id` em `catalog.js`) | **SOBREVIVEU** |
| **cabeçalho antigo no `vercel.json`** | **SOBREVIVEU** |

Sobreviventes: a ligação `catalog.js` -> `fetchCatalog` com `id` e o `vercel.json` não têm teste automatizado (o plano os cobre na simulação e na verificação em produção, ambas feitas/roteirizadas). Aceitável; risco baixo.

## 8. Fallbacks
- Vitest (node, sem `define`): `catalogUrl(base, undefined)` = URL sem `?v=` (testado e verde).
- `vite dev` (porta 5196, só do meu teste): a `define` também vale no dev, então o app pede `/data/catalog.json?v=4c9c57b9e5` (não "sem `?v=`" como o briefing supunha; é o que o plano descreve). App funciona, sem Banner, "(bônus)" aparece.
- `vite preview` do build (5195): pede `?v=4c9c57b9e5`, funciona.

## 9. Olhar de jogador experiente
- Carga normal: 1 requisição ao catálogo (200 na primeira, 304 nas seguintes), sem Banner e sem carga dupla. Sem lentidão perceptível (304 de 300 bytes).
- Banner só aparece nas falhas simuladas.

## 10. UI (build da branch)
- Craft: `T4_BAG` = "Brecilien (bônus)" / "Cidade com bônus para este item: Brecilien."; `T6_MAIN_SWORD` = "Lymhurst (bônus)". RRR, Mercado, Refino e Flipper abrem sem texto de erro. Console limpo na carga normal (os 3 erros vistos no console são das minhas falhas simuladas 500/404/conexão derrubada).

## Divergências plano x implementação
Nenhuma relevante. Única nota: o briefing esperava dev sem `?v=`; a implementação (e o plano) injeta o id também no dev.
