# IDEIA-071 — Limite de erro na tela, "Restaurar configurações" e ajuste do aviso de migração: plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-071`. Comandos `npm` em `client/`. **Pré-requisitos (já na `master`):** IDEIA-070 (`persist.js`, `persistSchemas.js`, `migrationNotes.js`), 002, 058 e a infra de teste de componente da 069 (projects `logic` e `ui`, `src/test/ui.js`). **Regra do briefing:** cada teste é escrito, **executado e visto falhar** antes de implementar; os de componente em `*.test.jsx` (jsdom). **Nenhum `*.test.jsx` pode conter `usePersisted('chave'` literal**: `persistSchemas.test.js` varre os `.jsx` de `src/components/` com `/usePersisted\('([^']+)'/g` e exige exatamente as 8 chaves do código; use `seed('craft:cfg', …)` (helper) e componentes de teste que recebem a chave por variável.

**Problema:** hoje qualquer exceção ao desenhar uma tela deixa **tela branca** (React desmonta tudo), sem mensagem e sem saída; o usuário só se salva limpando o `localStorage` à mão. A 070 fechou os caminhos conhecidos de estado salvo ruim (115 telas × 23 perfis sem tela branca no laudo), mas **qualquer erro futuro de render** (bug novo, estado impossível, falha ao carregar o pedaço de código de uma aba depois de um deploy) volta a dar tela branca. E o aviso de migração da 070 tem duas imprecisões registradas (`docs/qa/IDEIA-070.md` O2 e O3; D-046).

**Objetivo:** (1) um **limite de erro** (`ErrorBoundary`) com mensagem clara em português e saída; (2) um botão **"Restaurar configurações"**, com **confirmação**, que apaga **só** as chaves `albion:*` deste app e recarrega; (3) o texto do aviso de migração corrigido (bônus de produção +40, não "RRR +40") e o aviso só quando o item atual usa refino.

**Arquitetura:** `lib/resetState.js` (puro: lista e apaga chaves com o prefixo `albion:`, sem tocar em mais nada) e `lib/errorKinds.js` (puro: reconhece erro de carga de pedaço de código). Componentes `RestoreSettings.jsx` (botão + painel de confirmação; **não depende** de `settings.js`, do catálogo nem de hooks do app, para funcionar justamente quando eles estão quebrados) e `ErrorBoundary.jsx` (classe, a única forma de capturar erro de render no React). `main.jsx` põe um limite no topo; `App.jsx` põe outro **em volta da aba** (`resetKey = aba`), de modo que o cabeçalho e as abas continuam clicáveis quando uma aba quebra.

## O que um limite de erro captura e o que não captura (dito na tela e aqui)
Captura: erro de render, de ciclo de vida e de construtor dos filhos, **inclusive o `import()` de uma aba que falha** (`lazy` rejeitado; acontece depois de um deploy se o navegador ainda tem o `index.html` velho). **Não captura:** erro em manipulador de evento, em `setTimeout`/`fetch` não aguardado e no próprio limite. Esses ficam fora de escopo (o app não tem telemetria; D-001/estado atual §1).

## Arquivos: exclusivos, compartilhados, ordem

**Criados:** `client/src/lib/resetState.js`, `resetState.test.js`, `client/src/lib/errorKinds.js`, `errorKinds.test.js`, `client/src/components/RestoreSettings.jsx`, `RestoreSettings.test.jsx`, `client/src/components/ErrorBoundary.jsx`, `ErrorBoundary.test.jsx`, `client/src/App.errors.test.jsx`, `client/src/App.notice.test.jsx`.
**Alterados:** `client/src/main.jsx` (envolver `<App />`), `client/src/App.jsx` (limite por aba, entrada "Restaurar configurações" no rodapé, avisos de migração lidos em `useState` e filtrados pelo item atual), `client/src/lib/persistSchemas.js` (texto e marca `when` da nota), `client/src/lib/migrationNotes.js` (+ função pura de filtro por item), `client/src/lib/migrationNotes.test.js` (texto novo).
**NÃO toca:** `settings.js`, `persist.js`, os componentes de tela (`Crafting.jsx`, `Refining.jsx`, `Flipper.jsx`, `Market.jsx`, `RrrCalculator.jsx`, `TargetPrice.jsx`), `inputRules.js`, catálogo, `vercel.json`, `vite.config.js`, `index.css` (usa as classes `banner`, `btn`, `hint` que já existem).
**Compartilhados:** `persistSchemas.js` e `persistSchemas.test.js` com qualquer ideia que acrescente campo salvo (aqui só mexe na nota); `App.jsx` com nenhuma ideia em andamento. **Ordem:** a 071 não depende de nenhuma pendente; pode ir já. O contrato de `persistSchemas.test.js` (8 chaves) é o ponto de atenção.

## Interfaces

```js
// resetState.js (puro; storage = { length, key(i), getItem, removeItem })
export const APP_PREFIX = 'albion:'                                  // sensível a maiúsculas: 'ALBION:x' e 'albionx:y' NÃO casam
albionKeys(storage): string[]                                        // chaves que começam com 'albion:' (lê todas ANTES de qualquer remoção)
clearAlbionKeys(storage): { removed: string[], failed: string[] }    // remove só essas; storage que lança em uma chave não impede as outras; nunca lança
// errorKinds.js
isChunkLoadError(error): boolean                                     // 'Failed to fetch dynamically imported module' (Chrome), 'error loading dynamically imported module' (Firefox), 'Importing a module script failed' (Safari), 'Loading chunk … failed', name 'ChunkLoadError'
// RestoreSettings.jsx  props: { storage = localStorage, reload = () => location.reload(), compact = false }
// ErrorBoundary.jsx    props: { children, resetKey, title, reload = () => location.reload(), storage }   // estado { error }; getDerivedStateFromError; componentDidCatch faz console.error; componentDidUpdate limpa o erro quando resetKey muda
// migrationNotes.js
noticeApplies(note, ctx): boolean       // note.when === 'craft-uses-refine' => ctx.craftUsesRefine; sem `when` => true
craftUsesRefine(itemState): boolean     // recipeOf(item.id, item.ench) tem algum ingrediente refinável (canRefineUniq); item inexistente/receita nula => false
```

## Mensagens (texto final, em português)

**Fallback do limite:** título **"Algo deu errado ao mostrar esta tela"**; corpo: "O app encontrou um erro e parou de desenhar esta parte. Seus preços e os dados do jogo não foram afetados. Isso costuma acontecer quando a configuração salva neste navegador (taxas, cidades, receitas escolhidas) vem de uma versão antiga ou está corrompida. Tente de novo; se o erro voltar, restaure as configurações."; botões **Tentar de novo**, **Restaurar configurações**; `<details>` "Detalhes técnicos" com `error.message`. **Erro de carga de pedaço de código** (`isChunkLoadError`): título "Há uma versão nova do app", corpo "Esta aba não pôde ser carregada porque o app foi atualizado. Recarregue a página.", botão **Recarregar**.
**Confirmação de restaurar:** "Restaurar configurações? Isto apaga as configurações salvas por este app neste navegador (servidor, Premium, taxas de bancada, cidades, itens e receitas escolhidas, avisos já dispensados): **N itens**. Preços e dados do jogo não são afetados e nada fora do app é apagado. A página será recarregada." Botões **Apagar e recarregar** e **Cancelar**. Sem nada salvo: "Não há configurações salvas neste navegador." e o botão de apagar desabilitado.
**Aviso de migração (novo texto):** "Sua configuração antiga foi atualizada: o refino dos materiais do Craft agora usa o bônus de produção da cidade especializada de cada recurso (+40). O RRR do refino sobe de cerca de 15% para 37% e o custo do craft cai. Antes o app calculava esse refino sem o bônus, embora a tela dissesse 'cada recurso na sua cidade de bônus'." (os números **15%** e **37%** são `rrr()` de refino sem e com especialização: 18/118 e 58/158; o teste os deriva de `rrr()`, não os repete; a unidade errada "RRR +40" some.)

## Tasks (1 commit cada; teste primeiro e visto falhar; cada passo tem comando e saída esperada)

### Task 1: chaves do app e detecção de erro de carga (puros, project `logic`)
**Files:** Create `resetState.test.js`, `resetState.js`, `errorKinds.test.js`, `errorKinds.js`.
- [ ] **Step 1: testes falhando.** `resetState.test.js` com um armazenamento falso que **imita o `Storage` real** (índices que se deslocam ao remover):

```js
const fake = (init) => { const m = new Map(Object.entries(init)); return { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }; };
it('albionKeys: só o prefixo exato "albion:" (sensível a maiúsculas)', () => expect(albionKeys(fake({ 'albion:craft:cfg': '1', 'albion:settings': '2', 'ALBION:x': '3', 'albionx:y': '4', 'albion': '5', outra: '6', 'vercel-toolbar': '7' })).sort()).toEqual(['albion:craft:cfg', 'albion:settings']));
it('clearAlbionKeys remove TODAS as chaves do app mesmo adjacentes (índices deslocam ao remover) e nada mais', () => {
  const s = fake({ a: '1', 'albion:1': 'x', 'albion:2': 'x', 'albion:3': 'x', b: '2', 'albion:notice:craft-refine-city': '1' });
  const r = clearAlbionKeys(s); expect(r.removed.sort()).toEqual(['albion:1', 'albion:2', 'albion:3', 'albion:notice:craft-refine-city']); expect([...s._m.keys()]).toEqual(['a', 'b']); expect(r.failed).toEqual([]); });
it('storage vazio: removed [] e nenhuma exceção', () => expect(clearAlbionKeys(fake({}))).toEqual({ removed: [], failed: [] }));
it('removeItem que lança numa chave: as outras são removidas e a falha é listada', () => { /* removeItem lança para 'albion:2' */ });
it('storage que lança em length/key (modo privado): { removed: [], failed: [] } sem propagar; storage null/undefined idem', () => {});
it('não toca em chave com valor de objeto de outro app: "albion:" só como prefixo', () => {});
```
  `errorKinds.test.js`: `isChunkLoadError` verdadeiro para as mensagens reais `new TypeError('Failed to fetch dynamically imported module: https://x/assets/Refining-abc.js')`, `new Error('error loading dynamically imported module: …')`, `new TypeError('Importing a module script failed.')`, `new Error('Loading chunk 5 failed.')` e `{ name: 'ChunkLoadError' }`; falso para `new Error('Cannot read properties of null')`, `new RangeError('Maximum call stack')`, `null`, `undefined`, texto, objeto sem mensagem.
- [ ] **Step 2:** `npx vitest run src/lib/resetState.test.js src/lib/errorKinds.test.js` → FAIL (`Failed to resolve import`). **Step 3:** implementar (colher as chaves num vetor primeiro, depois remover; `try/catch` por chave). **Step 4:** mesmo comando → PASS; `npm run check`. **Step 5: Commit:** `feat: resetState e errorKinds (puros)`.
- Mutações a derrubar (cópia fora do repositório): remover durante a iteração (pula chaves adjacentes); `startsWith('albion')` sem os dois-pontos (apagaria `albionx:`); `toLowerCase()` no prefixo; propagar exceção de `removeItem`.

### Task 2: botão "Restaurar configurações" com confirmação (`RestoreSettings.jsx`)
**Files:** Create `RestoreSettings.test.jsx`, `RestoreSettings.jsx`.
- [ ] **Step 1: testes falhando** (project `ui`; `beforeEach(resetApp)`; `reload = vi.fn()`; chaves semeadas com `seed(...)` e, para as de fora do app, `localStorage.setItem('outra:coisa', 'x')`):

```js
const semear = () => { seed('craft:cfg', craftCfg()); seed('settings', { server: 'east' }); localStorage.setItem('albion:notice:craft-refine-city', '1'); localStorage.setItem('outra:coisa', 'x'); localStorage.setItem('albionx:y', 'y'); localStorage.setItem('vercel-toolbar', 'z'); };
it('mostra só o botão; nada é apagado antes de confirmar', () => { semear(); render(<RestoreSettings reload={reload} />); expect(screen.getByRole('button', { name: /restaurar configurações/i })).toBeTruthy(); expect(localStorage.length).toBe(6); expect(screen.queryByText(/apagar e recarregar/i)).toBeNull(); });
it('clicar abre a confirmação com a contagem de itens (3 do app) e o texto de escopo', () => { /* "3 itens", "nada fora do app é apagado", botões Apagar e recarregar / Cancelar */ });
it('Cancelar fecha o painel e NÃO apaga nada nem recarrega', () => { semear(); /* clicar, cancelar */ expect(localStorage.length).toBe(6); expect(reload).not.toHaveBeenCalled(); expect(screen.queryByText(/apagar e recarregar/i)).toBeNull(); });
it('Apagar e recarregar remove SÓ albion:*; outras chaves ficam; recarrega uma vez', () => {
  semear(); /* clicar, confirmar */ expect(localStorage.getItem('albion:craft:cfg')).toBeNull(); expect(localStorage.getItem('albion:settings')).toBeNull(); expect(localStorage.getItem('albion:notice:craft-refine-city')).toBeNull();
  expect(localStorage.getItem('outra:coisa')).toBe('x'); expect(localStorage.getItem('albionx:y')).toBe('y'); expect(localStorage.getItem('vercel-toolbar')).toBe('z'); expect(reload).toHaveBeenCalledTimes(1); });
it('sem nada salvo: avisa "Não há configurações salvas" e o botão de apagar fica desabilitado', () => {});
it('removeItem que falha: mostra "Não foi possível apagar N item(ns)", NÃO recarrega e o painel continua', () => {});
it('funciona sem catálogo, sem settings e sem hooks do app (render isolado, sem providers)', () => {});
it('compact: só o botão pequeno do rodapé (mesma confirmação)', () => {});
```
- [ ] **Step 2:** `npx vitest run --project ui src/components/RestoreSettings.test.jsx` → FAIL. **Step 3:** implementar (estado local `open`/`error`; chama `clearAlbionKeys(storage)`; `reload()` só se `failed` vazio). **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: botão Restaurar configurações com confirmação (só chaves albion:*)`.
- Mutações: confirmar sem passar pelo painel; Cancelar que apaga; apagar todas as chaves (`localStorage.clear()`); recarregar mesmo com falha; contagem errada; abrir o painel já apagando.

### Task 3: `ErrorBoundary.jsx`
**Files:** Create `ErrorBoundary.test.jsx`, `ErrorBoundary.jsx`.
- [ ] **Step 1: testes falhando** (project `ui`; `vi.spyOn(console, 'error').mockImplementation(() => {})` no `beforeEach`, porque o React registra o erro; `Bomba` = componente de teste que lança se `globalThis.__boom` for verdadeiro):

```js
it('filhos normais: renderiza os filhos e nenhum fallback', () => {});
it('exceção de render em um filho: mostra "Algo deu errado ao mostrar esta tela" com role alert, esconde o filho, mostra o corpo de ajuda e os botões Tentar de novo e Restaurar configurações', () => {});
it('detalhes técnicos: <details> com a mensagem do erro (error.message) e o console.error foi chamado', () => {});
it('Tentar de novo: corrigida a causa (__boom = false) o clique remonta os filhos; se a causa persiste volta ao fallback', () => {});
it('resetKey: trocar a chave limpa o erro (trocar de aba recupera) e renderiza os filhos; manter a chave não limpa', () => {});
it('erro de carga de pedaço (lazy rejeitado com "Failed to fetch dynamically imported module"): título "Há uma versão nova do app", botão Recarregar chama reload (injetado) e NÃO mostra Restaurar como ação principal', () => {});
it('lazy + Suspense dentro do limite: import() que rejeita cai no fallback depois do Suspense (findByText)', () => {});
it('limites aninhados: o de dentro captura; o de fora não renderiza fallback; irmão fora do limite continua visível', () => {});
it('erro lançado em filho que nunca lança mensagem (throw "texto", throw null): fallback genérico, sem exceção no fallback', () => {});
it('o fallback não lê settings, catálogo nem localStorage além do botão de restaurar (render isolado)', () => {});
```
- [ ] **Step 2:** FAIL (`Failed to resolve import "./ErrorBoundary"`). **Step 3:** implementar a classe (`getDerivedStateFromError`, `componentDidCatch` → `console.error`, `componentDidUpdate(prev)` limpa o erro quando `resetKey` muda, botões, `isChunkLoadError`). **Step 4:** PASS; `npm run check` (o lint não deve reclamar de `react-refresh/only-export-components`: o arquivo só exporta o componente). **Step 5: Commit:** `feat: ErrorBoundary com mensagem clara, tentar de novo e restaurar`.
- Mutações: não tratar `resetKey`; `Tentar de novo` que não zera o estado; mostrar a mensagem técnica no lugar da explicação; tratar erro de carga como erro comum; engolir o erro sem `console.error`; fallback que depende de `settings.js`.

### Task 4: ligar no app (`main.jsx`, `App.jsx`) e provar o isolamento por aba
**Files:** Modify `main.jsx`, `App.jsx`; Create `App.errors.test.jsx`.
- [ ] **Step 1: testes falhando** (project `ui`; mocks hoisted: `useCatalog` devolve `{ ready: true, error: null }`, `usePrices`/`useHistory` como em `Crafting.test.jsx`; `vi.mock('./components/Refining', () => ({ default: Quebrada }))` onde `Quebrada` lança; `location.hash` ajustado antes de cada render; `loadFixtureCatalog()` já em `resetApp`):

```js
it('aba que lança: fallback dentro da área da aba; cabeçalho, abas e rodapé continuam na tela', () => { /* #refining */ });
it('trocar para outra aba recupera (resetKey = aba): #crafting renderiza normalmente sem recarregar', () => {});
it('o limite de fora (main) não aparece quando só uma aba quebra', () => {});
it('rodapé mostra o botão Restaurar configurações (compact) e ele abre a confirmação', () => {});
describe('estados salvos corrompidos NÃO derrubam nenhuma aba (regressão do laudo da 070: 0 telas brancas)', () => {
  // perfis do laudo (docs/qa/IDEIA-070.md §7): C1 todas as chaves {}; C2 todas null; C3 texto lixo; C7 craft sem refine e item id:5; C8 refine type:'FOO' e market:item.id:null; C10 craft refine:null, refineDaily:[], recipeVariant:'1.5'; flip groups ['FOO']
  it.each(PERFIS)('%s × 5 abas: o conteúdo existe e o fallback "Algo deu errado" NÃO aparece', async () => {});   // ≤ 15 renderizações: 3 perfis × 5 abas; os demais perfis em it.each de 1 aba
});
it('estado que quebra de verdade (veneno lido cru por um filho de teste): fallback → Restaurar → Apagar e recarregar limpa albion:* → remontar com o armazenamento limpo mostra os filhos', () => {
  /* filho de teste lê localStorage.getItem('albion:veneno') e lança se for 'x'; fluxo completo com reload injetado; outras chaves intactas */ });
```
- [ ] **Step 2:** FAIL. **Step 3:** `main.jsx`: `<ErrorBoundary title="O app parou"><App /></ErrorBoundary>` dentro do `StrictMode`; `App.jsx`: `<ErrorBoundary resetKey={tab}><Suspense …><View /></Suspense></ErrorBoundary>` e, no rodapé, `<RestoreSettings compact />` (texto "Restaurar configurações"). **Step 4:** PASS; `npm run check`; medir `npm run test:ui` (meta: o arquivo novo ≤ 4 s de relógio; se passar, reduzir os perfis × abas). **Step 5: Commit:** `feat: limite de erro por aba e no topo, restaurar configurações no rodapé`.
- Mutações: limite sem `resetKey` (a aba seguinte continua quebrada); limite só no topo (cabeçalho some); `Suspense` fora do limite (o `lazy` rejeitado escapa e dá tela branca); rodapé sem o botão.

### Task 5: aviso de migração (texto e item atual)
**Files:** Modify `persistSchemas.js`, `migrationNotes.js`, `migrationNotes.test.js`, `App.jsx`; Create `App.notice.test.jsx`.
- [ ] **Step 1: testes falhando.**

```js
// migrationNotes.test.js (logic): o texto novo e a marca
it('o texto fala em bônus de produção +40 e em RRR de 15% para 37% (derivados de rrr()), e NÃO tem "RRR +40"', () => {
  const m = notes[0].message; const antes = Math.round(rrr({ kind: 'refine', specialty: false, focus: false }) * 100), depois = Math.round(rrr({ kind: 'refine', specialty: true, focus: false }) * 100);
  expect(m).toMatch(/bônus de produção/); expect(m).toMatch(/\(\+40\)/); expect(m).toContain(`${antes}%`); expect(m).toContain(`${depois}%`); expect(m).not.toMatch(/RRR \+40/); expect([antes, depois]).toEqual([15, 37]); });
it('a nota diz que o número antes estava sem o bônus (O2): menciona "sem o bônus"', () => {});
it('noticeApplies: sem when sempre true; when craft-uses-refine só com ctx.craftUsesRefine', () => {});
it('craftUsesRefine: espada T6 (barra e couro refináveis) true; poção T4 (ervas e ovos) false; artefato só com fragmentos false; item inexistente/null/id número false; sem catálogo carregado false', () => {});
// App.notice.test.jsx (ui): seed craft:cfg SEM refineCity (formato de 9e1e4a2) e craft:item
it('item que usa refino (T6_MAIN_SWORD, o padrão): o aviso aparece com o texto novo e o botão Entendi', () => {});
it('item que NÃO usa refino (T4_POTION_HEAL): nenhum aviso; nada é gravado em albion:notice:*', () => {});
it('Entendi grava albion:notice:craft-refine-city e o aviso não volta ao remontar', () => {});
it('estado atual (com refineCity) ou sem nada salvo: nenhum aviso', () => {});
it('o aviso é lido no primeiro render de App (useState), antes de qualquer aba montar: remontar App depois de uma aba regravar craft:cfg ainda mostra o que foi lido (não relido do módulo)', () => {});
```
- [ ] **Step 2:** FAIL. **Step 3:** em `persistSchemas.js` trocar `REFINE_CITY_NOTE.message` pelo texto novo e acrescentar `when: 'craft-uses-refine'`; em `migrationNotes.js` acrescentar `noticeApplies` e `craftUsesRefine` (usa `recipeOf` e `canRefineUniq`); em `App.jsx` trocar a constante de módulo `STARTUP_NOTICES` por `useState(() => pendingNotices(storage()))` (a leitura continua a **primeira** coisa, antes de qualquer aba montar: o `App` renderiza antes dos filhos) e mostrar só `ready ? notices.filter((n) => noticeApplies(n, { craftUsesRefine: craftUsesRefine(JSON.parse(storage().getItem('albion:craft:item') ?? 'null') ?? padrão) })) : []` (o padrão do item é o da tela, `{ id: 'T6_MAIN_SWORD', ench: 0 }`; leitura protegida por `try/catch`). **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `fix: aviso de migração com bônus de produção +40 e só quando o item usa refino (O2, O3)`.
- Mutações: `when` removido (volta a aparecer sem refino); item padrão errado; remover o `ready`; texto antigo; `noticeApplies` sempre true; dispensar gravando antes de mostrar.

### Task 6: conferência manual (sem commit) e README
- [ ] **Quebra real de aba (sem alterar código):** `npm run dev`; no navegador, DevTools → Network → bloquear `Refining*.js` (ou `Crafting*.js`) → clicar na aba: aparece **"Há uma versão nova do app"** com **Recarregar**; as outras abas e o cabeçalho continuam funcionando; remover o bloqueio e **Tentar de novo/Recarregar** recupera.
- [ ] **Quebra de render (cópia descartável):** o Tester faz um `throw new Error('teste')` no topo de `Refining.jsx` numa cópia fora do repositório: fallback "Algo deu errado" na aba, cabeçalho intacto, outra aba abre, **Restaurar configurações** mostra a contagem, **Cancelar** não apaga, **Apagar e recarregar** limpa só `albion:*` (conferir `localStorage` antes/depois; incluir uma chave de teste `outra:coisa`).
- [ ] **Estado antigo:** gravar o estado de `9e1e4a2` (`craft:cfg` sem `refineCity`) com o item padrão: banner com o texto novo; trocar o item salvo para uma poção e recarregar: **sem** banner. **Conferir `location.port` antes de gravar em `localStorage`** (regra do briefing dos Testers).
- [ ] README (`client/README.md`): uma linha em "Testes de componente" lembrando a regra do `usePersisted('chave'` literal. **Commit:** `docs: README, regra do usePersisted literal nos testes de componente`.

## Como o Tester valida

1. **Casos de teste concretos do plano** (todos devem existir, falhar antes e passar depois): estado corrompido/`null` nas 8 chaves e em `settings` (perfis C1, C2, C3, C7, C8, C10 do laudo da 070) não aciona o fallback em nenhuma das 5 abas; exceção em filho (render e `lazy` rejeitado) aciona o fallback **só na aba**; **Restaurar** apaga somente `albion:*` (e **não** `outra:coisa`, `albionx:y`, `ALBION:x`, `vercel-toolbar`); **Cancelar** não apaga nada e não recarrega; falha de `removeItem` não recarrega e informa.
2. **Mutações obrigatórias** (as listadas em cada Task) em cópia fora do repositório; qualquer sobrevivente reprova.
3. **Regressão da 070:** o aviso de migração continua aparecendo para `craft:cfg` antigo (9e1e4a2, sem `refineCity`) **com item que usa refino**; o texto novo não contém "RRR +40"; os números 15% e 37% batem com `rrr()` (18/118 = 15,25%; 58/158 = 36,71%); `persistSchemas.test.js` continua verde (nenhum `usePersisted('…'` literal nos `.test.jsx`).
4. **Isolamento:** com uma aba quebrada, as outras 4 abas e o cabeçalho funcionam; trocar de aba tira a tela do erro sem recarregar.
5. **Tempo:** `npm run test:ui` com os arquivos novos dentro do orçamento da 069 (≤ 5 s de acréscimo; `App.errors.test.jsx` ≤ 4 s; reduzir perfis × abas se passar); `npm run test:logic` sem mudança relevante.
6. **O que um usuário estranharia:** tela branca; mensagem técnica no lugar da explicação; **Restaurar** apagando mais do que as configurações do app (outras chaves do mesmo navegador) ou sem pedir confirmação; **Cancelar** apagando; o botão de restaurar sumindo justamente quando o app está quebrado; aviso de migração para quem não usa refino ou com a unidade errada; perder o Premium/servidor sem o texto avisar que isso acontece.

## Riscos

1. **Limite de erro não captura erro de manipulador de evento nem assíncrono** (`fetch` não aguardado); continuam sem tratamento (fora de escopo).
2. **`componentDidCatch` + StrictMode** registram o erro duas vezes em desenvolvimento: normal.
3. **Restaurar apaga o Premium e o servidor** (voltam a "Américas", Premium ligado): dito na confirmação.
4. **Aviso de migração item-aware tem uma lacuna aceita:** a decisão usa o item **salvo** (`craft:item`) na carga; quem começa com um item sem refino e troca depois para um com refino não vê o aviso naquela sessão (e, se mexer no Craft antes, o estado é regravado com `refineCity` e o aviso nunca aparece). Alternativa fora do plano: mostrar a nota dentro de `Crafting.jsx`, ao lado do seletor "Refinar em" (mudaria um arquivo quente).
5. **`persistSchemas.test.js` varre `src/components/*.jsx`:** um `usePersisted('x'` literal num teste novo quebra o contrato das 8 chaves; coberto na regra do topo.
6. **Conflito:** `App.jsx` não é editado por nenhuma ideia pendente; `persistSchemas.js` só tem a nota alterada.

## Critério de pronto

`npm run check` verde (lint, `logic`, `ui`, build) sem alterar nenhum teste existente exceto o texto da nota em `migrationNotes.test.js`; todas as mutações das Tasks derrubadas; os casos concretos da seção "Como o Tester valida" cobertos; só os arquivos listados alterados; conferência manual da Task 6 registrada pelo Tester.

## PERGUNTAS PARA O GERENTE

1. **Limite em dois níveis** (topo em `main.jsx` e por aba em `App.jsx`, para o cabeçalho continuar clicável). Aprova, ou prefere só um limite no topo?
2. **Botão permanente no rodapé** "Restaurar configurações" (além do que aparece no fallback). Quer, ou só no fallback?
3. **Restaurar também apaga `albion:notice:*`** (avisos já dispensados) e o Premium/servidor. Aceita? (Alternativa: preservar `settings`.)
4. **Aviso de migração por item salvo** (lacuna do Risco 4) ou levar a nota para dentro de `Crafting.jsx`?
5. **Telemetria:** continua sem registro remoto de erros; o `console.error` e o texto em "Detalhes técnicos" são tudo que o usuário pode copiar para um relato. Basta?
6. O texto de "versão nova do app" cobre o erro de carga de aba depois de um deploy. Quer também um aviso proativo (detectar versão nova sem erro)? Fica fora desta ideia.

