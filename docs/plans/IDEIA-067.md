# IDEIA-067 — Catálogo novo + código novo: cache do `catalog.json` sem janela de dado errado: plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-067`. Comandos `npm` em `client/`. **Infraestrutura/robustez: nenhuma regra de cálculo muda e `client/public/data/catalog.json` NÃO muda de conteúdo.** Pré-requisito: IDEIA-001 e 038 mescladas (estado atual de `master`).

**Objetivo:** depois de qualquer deploy que mude o catálogo, nenhum navegador pode combinar código novo com catálogo velho. Fonte do problema: `docs/deploy/deploy-5.md` (anomalia de cache) e a verificação do Gerente: `client/vercel.json` serve `/data/*` com `public, max-age=3600, stale-while-revalidate=86400`; o bundle JS tem hash no nome (chega na hora), o `catalog.json` não, então um navegador com o catálogo antigo (sem `cc`/`cityOf`) mostrou "Sem cidade de bônus" por até 1 h (24 h com `stale-while-revalidate`).

## Desenho recomendado: A (URL versionada por conteúdo) + B (revalidar sempre) + D (checagem defensiva)

| Opção | O que faz | Resolve | Custo/risco | Veredito |
|---|---|---|---|---|
| **A** URL com id de build | `catalog.json?v=<id>`; o id muda quando o catálogo muda | O código novo **nunca** pede a URL antiga, então nunca acerta o cache velho (a chave de cache do navegador e da CDN inclui a query). Resolve já o caso de quem está com cache antigo agora | Um `define` no `vite.config.js` e uma linha na URL | **Sim** |
| **B** `max-age=0, must-revalidate` em `/data/` | O navegador sempre revalida; o `ETag` da Vercel dá `304` quando não mudou | Qualquer caminho que escape do `?v=` (aba aberta com bundle antigo, link direto, proxy que remove query) | Uma requisição condicional por visita (~0,3 KB no `304`; o catálogo, ~0,55 MB, ~150 KB comprimido, só desce quando muda) | **Sim** (1 linha) |
| **C** A + B | Pontos acima | Cinto e suspensório | — | incluída |
| **D** validação defensiva | Se o catálogo carregado não tem o formato que o código exige, busca **uma vez** com cache-bust e, se ainda inválido, mostra erro claro | Falha de CDN/proxy que ignora a query, formato futuro (057 e 039 mudam o catálogo de novo) | ~40 linhas puras e testáveis | **Sim** |

**Qual id (decisão: hash do conteúdo, não o SHA do commit).** O id é o SHA-1 (10 primeiros hex) dos **bytes** de `public/data/catalog.json`, calculado no `vite.config.js`. Motivos: (1) muda **se e somente se** o catálogo mudar, então deploys só de código mantêm o catálogo em cache (zero transferência) e deploys que o mudam (038, 057, 039) o invalidam sozinhos, sem ninguém lembrar; (2) não depende de variável de ambiente da Vercel (`VERCEL_GIT_COMMIT_SHA` não existe em deploy por CLI; o relato do deploy 5 registra "Env vars: nenhuma"); (3) é determinístico e igual em dev, build e Vercel, então não precisa de "fallback para timestamp"; (4) não usa `process` (o ESLint do projeto roda com `globals.browser` também sobre `vite.config.js`). A alternativa do SHA do commit invalida o catálogo a cada deploy, mesmo sem mudança.

**Fallback em Vitest/Node (sem `define`).** O id chega por `import.meta.env.VITE_CATALOG_V` (substituído estaticamente pelo Vite no `dev` e no `build`). No Vitest (que usa `vitest.config.js`, sem o `define`) o valor é `undefined`, e `catalogUrl()` devolve a URL **sem** `?v=`; isto é testado. Sem `ReferenceError`, sem identificador global novo, sem mudar `vitest.config.js`.

**Primeiro carregamento depois do deploy da 067 (o ponto crítico).** O navegador do usuário tem em cache a entrada de `/data/catalog.json` (sem query, `max-age=3600`). O `index.html` chega revalidado (a Vercel serve HTML estático com `max-age=0, must-revalidate`; é o que trouxe o bundle novo no deploy 5) e já aponta para o bundle novo, que pede `/data/catalog.json?v=<id>`. **Essa URL nunca esteve no cache dele**, então vai à rede e traz o catálogo atual. A entrada antiga fica órfã até expirar. Ou seja, a janela de dado errado **não** precisa esperar o cache antigo vencer. Pelo mesmo motivo, B só protege quem ainda usa a URL sem query; para quem usa a nova, o cache continua válido enquanto o catálogo for o mesmo.

## Arquivos afetados (exatos)

**Criados:** `client/src/lib/catalogLoad.js` (puro: `catalogUrl`, `validateCatalog`, `fetchCatalog`), `client/src/lib/catalogLoad.test.js`, `client/src/lib/catalogVersion.js` (`catalogVersion(path)`; só o `vite.config.js` o importa, não entra no bundle do app), `client/src/lib/catalogVersion.test.js`.
**Alterados:** `client/src/lib/catalog.js` (**só** `loadCatalog` e uma linha de `import`), `client/vite.config.js` (`define`), `client/vercel.json` (cabeçalho de `/data/`).
**NÃO toca:** `client/public/data/catalog.json`, `scripts/build-catalog.mjs`, `scripts/build-test-fixture.mjs`, `client/src/test/catalog.fixture.json`, `catalog.real.test.js`, `catalog.test.js`, `vitest.config.js`, `App.jsx`, qualquer regra de cálculo.
**Conflitos com 057 e 039 (mesmo grupo de arquivos de catálogo):** **nenhum.** 057 e 039 mexem em `build-catalog.mjs`, `catalog.json`, fixture e, a 039, na função `recipeOf` de `catalog.js`; a 067 mexe em outro trecho de `catalog.js` (`loadCatalog`, linhas ~22 a 38) e em arquivos novos. Como o id é o hash do conteúdo, quando 057 ou 039 regenerarem o catálogo o id muda sozinho, sem ação. **Ordem recomendada:** 067 mesclada e implantada **antes** do deploy da 057, para que a próxima mudança de catálogo já nasça protegida; não é pré-requisito técnico de nenhuma delas.
**Modelo de dados:** o catálogo **não** ganha campo novo. Número de versão de esquema: `validateCatalog` aceita `schema` **opcional** (ausente = 1). Não exige regerar `catalog.json` nesta ideia. Quando 057 e 039 regenerarem o catálogo, elas podem (decisão do Gerente, pergunta 2) acrescentar `schema: 2`/`3` em `build-catalog.mjs` e subir `MIN_SCHEMA` em `catalogLoad.js` na mesma ideia.

## Interfaces (`catalogLoad.js`)

```js
export const MIN_SCHEMA = 1                                   // ausente no catálogo = 1
catalogUrl(base: string, id?: string, bust?: number|string): string
  // `${base}data/catalog.json` + (id ? `?v=${enc(id)}` : '') + (bust ? (id ? '&' : '?') + `r=${enc(bust)}` : '')
validateCatalog(d): { ok: boolean, problems: string[] }
  // exige: objeto; items = array não vazio; extra, vals, encNames = objetos; cityOf = objeto não vazio (desde a 038);
  //        schema, se existir, número >= MIN_SCHEMA. Cada exigência futura = 1 linha na lista REQUIRED + 1 teste.
fetchCatalog({ fetchFn, base, id, now = Date.now }): Promise<object>
  // 1) GET url versionada; !ok -> Error(`Catálogo indisponível (HTTP ${status})`) (sem retry, igual a hoje)
  // 2) JSON válido? -> devolve. 3) senão, UMA nova tentativa com { cache: 'reload' } e cache-bust (r=now()).
  // 4) ainda inválido -> Error('Catálogo desatualizado ou incompleto (…problemas…). Recarregue a página (Ctrl+F5); se persistir, avise o responsável.')
// catalogVersion.js
catalogVersion(path: string): string      // sha1 hex, 10 chars, dos bytes do arquivo; se não existir: 'dev'
```
`vite.config.js`: `define: { 'import.meta.env.VITE_CATALOG_V': JSON.stringify(catalogVersion(<caminho de public/data/catalog.json>)) }`. `catalog.js`: `fetchCatalog({ fetchFn: fetch, base: import.meta.env.BASE_URL, id: import.meta.env.VITE_CATALOG_V })` no lugar do `fetch` atual; `setCatalog` só roda depois da validação.

## Onde aparece e UI

Nenhuma tela nova. Em operação normal o usuário não vê nada diferente (o catálogo carrega da mesma forma). Só no caso extremo (catálogo inválido mesmo após a nova tentativa) o `Banner` "Falha ao carregar o catálogo de itens" (já existe em `App.jsx`) passa a mostrar a mensagem clara acima em vez de um comportamento silencioso com dados faltando.

## Tasks (1 commit cada; testes primeiro)

### Task 1: URL, validação e carga com nova tentativa (puros)
**Files:** Create `catalogLoad.test.js`, `catalogLoad.js`.
- [ ] **Step 1: testes falhando** (módulo inexistente; `fetchFn` falso injetado, sem rede):

```js
const ok = (d) => ({ ok: true, status: 200, json: async () => d });
const GOOD = JSON.parse(readFileSync(new URL('../../public/data/catalog.json', import.meta.url)));   // o catálogo real do repositório
describe('catalogUrl', () => {
  it('com id', () => expect(catalogUrl('/', 'a1b2c3d4e5')).toBe('/data/catalog.json?v=a1b2c3d4e5'));
  it('sem id (Vitest/Node, sem define): sem query', () => { expect(catalogUrl('/', undefined)).toBe('/data/catalog.json'); expect(catalogUrl('/', '')).toBe('/data/catalog.json'); });
  it('base com subcaminho', () => expect(catalogUrl('/app/', 'x')).toBe('/app/data/catalog.json?v=x'));
  it('cache-bust: & se há id, ? se não há', () => { expect(catalogUrl('/', 'x', 123)).toBe('/data/catalog.json?v=x&r=123'); expect(catalogUrl('/', undefined, 123)).toBe('/data/catalog.json?r=123'); });
  it('codifica caracteres especiais', () => expect(catalogUrl('/', 'a b&c')).toBe('/data/catalog.json?v=a%20b%26c'));
});
describe('validateCatalog', () => {
  it('o catálogo real passa', () => expect(validateCatalog(GOOD)).toEqual({ ok: true, problems: [] }));
  it('catálogo antigo (sem cityOf) é inválido e diz o motivo', () => { const { cityOf, ...old } = GOOD; const r = validateCatalog(old); expect(r.ok).toBe(false); expect(r.problems.join(' ')).toMatch(/cityOf/); });
  it('cityOf vazio, items vazio ou ausente, extra/vals/encNames ausentes', () => { for (const d of [{ ...GOOD, cityOf: {} }, { ...GOOD, items: [] }, { ...GOOD, items: undefined }, { ...GOOD, vals: undefined }, { ...GOOD, extra: null }, { ...GOOD, encNames: [] }]) expect(validateCatalog(d).ok).toBe(false); });
  it('entradas absurdas: null, string, array', () => { for (const d of [null, undefined, 'x', [], 42]) expect(validateCatalog(d).ok).toBe(false); });
  it('schema: ausente vale 1; maior que o mínimo passa; menor falha', () => { expect(validateCatalog({ ...GOOD, schema: 1 }).ok).toBe(true); expect(validateCatalog({ ...GOOD, schema: 7 }).ok).toBe(true); expect(validateCatalog({ ...GOOD, schema: 0 }).ok).toBe(false); expect(validateCatalog({ ...GOOD, schema: 'x' }).ok).toBe(false); });
});
describe('fetchCatalog', () => {
  it('catálogo bom: 1 requisição, URL versionada', async () => { const f = vi.fn().mockResolvedValue(ok(GOOD)); const d = await fetchCatalog({ fetchFn: f, base: '/', id: 'abc' }); expect(d).toBe(GOOD); expect(f).toHaveBeenCalledTimes(1); expect(f.mock.calls[0][0]).toBe('/data/catalog.json?v=abc'); });
  it('sem id (teste): URL sem query', async () => { const f = vi.fn().mockResolvedValue(ok(GOOD)); await fetchCatalog({ fetchFn: f, base: '/' }); expect(f.mock.calls[0][0]).toBe('/data/catalog.json'); });
  it('primeiro velho, segundo bom: 2 requisições; a 2ª com cache:"reload" e r=', async () => {
    const { cityOf, ...old } = GOOD; const f = vi.fn().mockResolvedValueOnce(ok(old)).mockResolvedValueOnce(ok(GOOD));
    expect(await fetchCatalog({ fetchFn: f, base: '/', id: 'abc', now: () => 777 })).toBe(GOOD);
    expect(f).toHaveBeenCalledTimes(2); expect(f.mock.calls[1][0]).toBe('/data/catalog.json?v=abc&r=777'); expect(f.mock.calls[1][1]).toMatchObject({ cache: 'reload' }); });
  it('os dois velhos: erro claro, no máximo 2 requisições', async () => {
    const { cityOf, ...old } = GOOD; const f = vi.fn().mockResolvedValue(ok(old));
    await expect(fetchCatalog({ fetchFn: f, base: '/', id: 'abc' })).rejects.toThrow(/desatualizado.*cityOf.*Ctrl\+F5/s); expect(f).toHaveBeenCalledTimes(2); });
  it('HTTP 500: erro de hoje, sem nova tentativa', async () => { const f = vi.fn().mockResolvedValue({ ok: false, status: 500 }); await expect(fetchCatalog({ fetchFn: f, base: '/' })).rejects.toThrow('Catálogo indisponível (HTTP 500)'); expect(f).toHaveBeenCalledTimes(1); });
  it('JSON quebrado: erro, não objeto vazio', async () => { const f = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => { throw new SyntaxError('x'); } }); await expect(fetchCatalog({ fetchFn: f, base: '/' })).rejects.toThrow(); });
});
```
- [ ] **Step 2:** `npx vitest run src/lib/catalogLoad.test.js` → FAIL (`Failed to resolve import "./catalogLoad"`).
- [ ] **Step 3:** implementar as três funções conforme as interfaces. **Step 4:** PASS. **Step 5:** `npm run check` → 0. **Step 6: Commit:** `feat: catalogUrl, validateCatalog e fetchCatalog (nova tentativa com cache-bust)`.

### Task 2: id por conteúdo e religação do `catalog.js`
**Files:** Create `catalogVersion.test.js`, `catalogVersion.js`; Modify `vite.config.js`, `catalog.js`.
- [ ] **Step 1: testes falhando** (arquivos temporários com `fs.mkdtempSync(os.tmpdir())`):

```js
it('mesmo conteúdo, mesmo id; 10 hex', () => { /* dois arquivos com os mesmos bytes → ids iguais, /^[0-9a-f]{10}$/ */ });
it('1 byte diferente, id diferente', () => { /* ... */ });
it('arquivo ausente: "dev"', () => expect(catalogVersion('/nao/existe.json')).toBe('dev'));
it('o catálogo real do repositório tem id estável entre duas leituras', () => expect(catalogVersion(CAMINHO)).toBe(catalogVersion(CAMINHO)));
```
- [ ] **Step 2:** FAIL. **Step 3:** implementar `catalogVersion` (`node:crypto` + `node:fs`). Em `vite.config.js` importar `catalogVersion` e `fileURLToPath` e acrescentar `define: { 'import.meta.env.VITE_CATALOG_V': JSON.stringify(catalogVersion(fileURLToPath(new URL('./public/data/catalog.json', import.meta.url)))) }` (sem `process`). Em `catalog.js`: `import { fetchCatalog } from './catalogLoad'` e trocar o corpo da promessa de `loadCatalog` por `fetchCatalog({ fetchFn: fetch, base: import.meta.env.BASE_URL, id: import.meta.env.VITE_CATALOG_V }).then((d) => { setCatalog(d); return d; })`, mantendo o `.catch` que zera `promise`.
- [ ] **Step 4:** `npm run check` → 0 (lint inclui `vite.config.js`). **Prova de que o id entrou no bundle:** `npm run build` e `grep -l <id> dist/assets/*.js` (onde `<id>` = `node -e "import('./src/lib/catalogVersion.js').then(m=>console.log(m.catalogVersion('public/data/catalog.json')))"`) encontra exatamente o bundle principal; `grep -c "VITE_CATALOG_V" dist/assets/*.js` = 0 (foi substituído). **Prova de que o catálogo não mudou:** `git diff --stat -- client/public/data/catalog.json` vazio.
- [ ] **Step 5:** `npm run dev` e abrir o app: aba Craft com `T4_BAG` mostra Brecilien "(bônus)"; na rede, o pedido é `/data/catalog.json?v=<id>`. **Step 6: Commit:** `feat: URL do catálogo versionada pelo hash do conteúdo`.

### Task 3: cabeçalho de `/data/` revalida sempre
**Files:** Modify `client/vercel.json`.
- [ ] **Step 1:** trocar o valor do cabeçalho de `source: "/data/(.*)"` para `public, max-age=0, must-revalidate` (o `rewrites` não muda). **Step 2:** `npm run check` → 0 (o JSON não é lido por teste; conferir `node -e "JSON.parse(require('fs').readFileSync('vercel.json'))"`). **Step 3: Commit:** `fix: /data/ passa a revalidar sempre (ETag/304) em vez de 1 h de cache`.
- Nota: os cabeçalhos só existem na Vercel; a verificação é do Deployer (abaixo).

## Como o Tester valida

1. **Testes:** todos os casos de `catalogLoad.test.js` e `catalogVersion.test.js`; mutações a tentar: remover a nova tentativa, repetir mais de uma vez, esquecer o `cache:'reload'`, trocar `&` por `?` no bust, não validar `cityOf`, `schema` ausente tratado como 0, `catalogVersion` constante. Todas devem derrubar teste.
2. **Nenhuma mudança de cálculo nem de dados:** `git diff master...feat/IDEIA-067 --stat` só traz os arquivos da lista; `catalog.json`, fixture, `build-catalog.mjs` iguais; os números da suíte inteira inalterados (`npm test` = mesmo nº de testes anterior + os novos).
3. **Reprodução local do bug e da correção (simulação com cache antigo, sem rede externa).** Em pasta temporária fora do repositório: (a) gerar o catálogo **antigo** com `git show 0a950de~1:client/public/data/catalog.json` (antes da 038, sem `cityOf`/`cc`) e o novo (atual); (b) um servidor Node de ~15 linhas que serve um diretório com os cabeçalhos **antigos** (`Cache-Control: public, max-age=3600, stale-while-revalidate=86400` e `ETag`) em `/data/` e `index.html` com `max-age=0`; (c) servir o build de `master` (sem 067) com o catálogo antigo, abrir no navegador (popula o cache) e trocar o diretório servido pelo build de `master` com o catálogo novo: o app **continua** mostrando "Sem cidade de bônus" (reproduz o deploy 5); (d) repetir trocando pelo build da **067**: sem hard reload, a rede mostra `/data/catalog.json?v=<id novo>` (200, vindo da rede) e a poção/bolsa mostram Brecilien "(bônus)". **Comparação obrigatória: (c) falha e (d) passa.**
4. **Caminho defensivo:** servir o catálogo **antigo** também para a URL versionada (simula CDN que ignora a query): o app faz exatamente 1 nova tentativa (`?v=<id>&r=…`, `cache: reload`) e, se o servidor insistir no antigo, mostra o Banner com "Catálogo desatualizado ou incompleto (… cityOf …). Recarregue a página (Ctrl+F5)". Se o servidor passar a entregar o novo na 2ª tentativa, o app carrega normalmente sem mostrar erro.
5. **O que um usuário estranharia:** tela de erro do catálogo em uso normal; o catálogo baixando de novo a cada visita com o mesmo conteúdo (deve ser `304` ou cache); itens sem `cc` aparecendo depois de um deploy de catálogo; tempo de carregamento claramente pior (uma requisição condicional por visita é esperada).

## Verificação em produção (Deployer)

1. Depois do deploy da 067, **antes** de qualquer outro: `curl -sI https://albion-data-iota.vercel.app/data/catalog.json` → `cache-control: public, max-age=0, must-revalidate` e `etag: "…"`; (a página está protegida por SSO: usar a sessão do navegador embutido ou o MCP da Vercel, como nos deploys anteriores).
2. Requisição condicional: repetir com `-H 'If-None-Match: <etag>'` → `304 Not Modified`.
3. `curl -s <url>/data/catalog.json | sha1sum | cut -c1-10` = `<id>`; `curl -s <bundle principal> | grep -o '<id>'` acha o mesmo id; `curl -sI '<url>/data/catalog.json?v=<id>'` → 200 com o mesmo `etag` (a Vercel ignora a query ao servir o arquivo estático).
4. **Navegador com cache antigo (o que importa):** usar o **mesmo** navegador do deploy 5, que ainda guarda a entrada antiga de `/data/catalog.json` com `max-age=3600`; abrir o site **sem hard reload e sem `cache:'reload'`** e conferir no log de rede que o pedido é `/data/catalog.json?v=<id>` (status 200, não "from cache"), que `T4_POTION_HEAL` mostra Brecilien "(bônus)" e `T4_ARMOR_PLATE_ROYAL` "Sem cidade de bônus", e que o console não tem erro. Esse é o caso que falhou no deploy 5.
5. Segunda visita: pedido condicional `304` (ou cache), sem baixar o catálogo de novo. Se a verificação 4 falhar, **rollback** pelo revert do merge (padrão D-004).
6. Registrar no relatório o tamanho transferido (200 vs 304) para a nota de custo.

## Riscos

1. O hash é lido no **início** do build/dev server: se alguém regenerar o `catalog.json` com o `vite dev` aberto, o id fica antigo até reiniciar (inofensivo: o arquivo servido é o novo; só a chave de cache não muda). Em `build` isso não ocorre.
2. Se a Vercel passasse a cachear por URL sem considerar a query (não é o comportamento padrão), o caminho D recupera; a verificação 3 da seção de produção confere.
3. O cabeçalho B adiciona uma requisição condicional por visita; o catálogo precisa chegar antes de a tela ficar pronta (já era assim), então o ganho de latência de manter 1 h de cache é pequeno frente ao risco.
4. Qualquer ideia futura que mude o **formato** do catálogo deve acrescentar uma linha em `validateCatalog` (ou subir `schema`): sem isso, a defesa D só cobre os campos listados hoje.

## Critério de pronto

`npm run check` verde; `catalogLoad` e `catalogVersion` testados com os casos acima; build contém o id e não contém `VITE_CATALOG_V`; `catalog.json` e a fixture intactos; simulação local (c falha, d passa) e caminho defensivo reproduzidos; roteiro de produção entregue ao Deployer; só os arquivos listados alterados.

## PERGUNTAS PARA O GERENTE

1. **Id por conteúdo (hash do `catalog.json`) em vez do SHA do commit:** aprovado? É mais simples (sem variável de ambiente) e só invalida o cache quando o catálogo muda.
2. **Versão de esquema:** a 067 não exige regerar o catálogo (usa verificação estrutural e `schema` opcional). Quer que os planos 057 e 039 passem a gravar `schema: 2`/`3` e subam `MIN_SCHEMA` (1 linha em cada, na mesma regeneração)? Se sim, preciso de um adendo nos dois planos; sem isso a defesa D só cobre `cityOf` e os campos básicos (não detecta, por exemplo, o catálogo sem `tm` da 057).
3. **Cabeçalho B:** aceita uma requisição condicional (`304`) por visita no lugar de 1 h de cache? Alternativa (não recomendada agora): cache longo só para `?v=` via `has` de `vercel.json`, que eu não consegui verificar sem testar na Vercel.
4. Ordem: mesclar e implantar a 067 antes do deploy da 057, confirma?
