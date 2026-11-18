# IDEIA-069 — Testes de componente (jsdom + Testing Library no Vitest): plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-069`. Comandos `npm` em `client/`. **INFRA, não conta para os 50 (D-001).** **Pré-requisitos (assumidos mesclados):** IDEIA-001, 019, 038, 039, 041, 049 (inclui `RecipePicker`, `returnBadge`, `feeDecides`) e 010 (`useHistory`). **Nenhum arquivo de produção é alterado**; só dependências, configuração de teste, helpers e testes. **Regra do briefing:** cada teste é escrito, **executado, e a mutação correspondente é aplicada numa cópia para provar que ele falha** antes do commit (lição de D-033: o TDD pulado deixou comportamento sem proteção).

**Objetivo (D-037):** quatro ideias seguidas (060, 039, 041, 049) deixaram mutantes que só a UI revela porque o projeto não testa componente. Esta ideia instala o ambiente, mantém a suíte de lógica em Node (rápida) e escreve já os primeiros testes de componente que fecham as dívidas **DT-002** (aviso de taxa padrão sem teste de componente, 019), **DT-008** (botão "Aceitar", `CeilingNotice`, `Money`), **DT-009** (selo "não verificado" e token `SHARD`), os **3 mutantes de UI da 041** (aviso de data futura, nota do campo, nota do cartão) e o **seletor de receita da 049**.

**Arquitetura:** `vitest.config.js` passa a ter dois **projects** (`test.projects`): `logic` (ambiente `node`, `src/**/*.test.js`, exatamente como hoje) e `ui` (ambiente `jsdom`, `src/**/*.test.jsx`, plugin do React, arquivo de setup). A extensão do arquivo decide o ambiente: nenhuma pragma, nenhum teste de lógica herda `window`. Helpers em `src/test/ui.js` resetam o armazenamento de `settings.js`/`usePersisted`, semeiam `localStorage`, congelam a data e carregam o catálogo da fixture. Hooks de rede (`usePrices`, `useHistory`) são trocados por `vi.mock` com `importOriginal`, nunca reescritos.

## Dependências (versões estáveis, todas com mais de 2 semanas em 2026-11-18)

| Pacote | Versão | Publicada | Observação |
|---|---|---|---|
| `jsdom` | `^29.1.1` | 2026-04-30 | engines `^20.19 \|\| ^22.13 \|\| >=24`: **funciona no Node 22.19 do projeto**. **Não usar jsdom 30/31**: exigem `^22.22.2` (a máquina tem 22.19.0) |
| `@testing-library/react` | `^16.3.3` | 2026-08-27 | peers: `react ^18 \|\| ^19`, `@testing-library/dom ^10`, `@types/react` |
| `@testing-library/dom` | `^10.4.2` | 2026-09-13 | peer obrigatório do anterior (instalar explicitamente) |
Deliberadamente **fora**: `@testing-library/user-event` (a versão mais recente é de 2026-11-16, menos de 2 semanas; `fireEvent` basta) e `@testing-library/jest-dom` (YAGNI: as asserções usam `textContent`/`queryBy*`). Vitest já é `^5.1.0` (peer `jsdom: *`).
**Impacto no `package-lock.json`:** +3 dependências diretas e dezenas de transitivas (jsdom traz `parse5`, `undici`, `whatwg-url`, `css-tree`, `saxes` etc.; o lock atual tem 183 pacotes e 2.502 linhas). Estimativa do Planejador: **+60 a 90 pacotes, +1.200 a 1.800 linhas** (sem rodar a instalação; o Executor registra os números reais no commit). `npm ci` na Vercel fica alguns segundos mais lento (devDependencies são instaladas); o **bundle de produção não muda** (conferir o tamanho dos arquivos de `dist/` antes e depois: iguais byte a byte). Instalação: o único `npm install` permitido é `npm install -D jsdom@^29.1.1 @testing-library/react@^16.3.3 @testing-library/dom@^10.4.2`.

## Arquivos: exclusivos, compartilhados, ordem

**Criados:** `client/src/test/setup-ui.js`, `client/src/test/ui.js`, `client/src/lib/env.test.js` (guarda do ambiente Node), `client/src/components/ui.test.jsx`, `client/src/components/InputIssues.test.jsx`, `client/src/components/RecipePicker.test.jsx`, `client/src/components/Crafting.test.jsx`.
**Alterados:** `client/package.json` (devDependencies e scripts `test:logic`, `test:ui`), `client/package-lock.json`, `client/vitest.config.js`, `client/README.md` (seção "Testes de componente"), `client/src/lib/catalog.test.js` (um teste de `recipeOf` com `SHARD`, DT-009, **só se ainda não existir**).
**NÃO toca:** nenhum arquivo de `src/components/*.jsx` ou `src/lib/*.js` de produção, `eslint.config.js` (ver Risco 3), `vite.config.js`, `vercel.json`, catálogo, fixture.
**Compartilhados:** nenhum arquivo de produção. Com 058 e 048 só há contato por **leitura** (os testes de `Crafting.test.jsx` existentes devem continuar passando quando elas mudarem `Crafting.jsx`; é o ponto da infra). **Ordem recomendada:** 069 **primeiro** (ou em paralelo com a 058, que não depende dela), e **antes** da 048 (muda `Crafting.jsx`, `Refining.jsx` e `computeCraft`, e é a que mais ganha com teste de UI). A 069 pode rodar em paralelo com qualquer ideia de lógica pura.

## Config do Vitest (forma esperada)

```js
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    projects: [
      { test: { name: 'logic', environment: 'node', include: ['src/**/*.test.js'] } },
      { plugins: [react()], test: { name: 'ui', environment: 'jsdom', include: ['src/**/*.test.jsx'], setupFiles: ['./src/test/setup-ui.js'] } },
    ],
  },
});
```
Se o `projects` do Vitest 5.1 se comportar de outra forma, o plano de reserva é a pragma `// @vitest-environment jsdom` na primeira linha de cada `*.test.jsx` com `include: ['src/**/*.test.{js,jsx}']` e o plugin do React; o resultado esperado (lógica em Node, UI em jsdom) é o mesmo. Scripts: `test` continua `vitest run` (os dois projects), `test:logic` = `vitest run --project logic`, `test:ui` = `vitest run --project ui`. **JSX de teste:** o `ui` project usa o mesmo transformador do app (`@vitejs/plugin-react`); o ESLint já lê `.jsx` com `ecmaFeatures.jsx`.

## Orçamento de tempo (não aumentar de forma relevante)

Baseline medido pelo Planejador em `master` (antes de 010 e 049 mesclarem): **371 testes, 15 arquivos, 1,5 s de duração, 4,4 s de relógio** (`npx vitest run`); o Executor refaz a medição na `master` já com 010 e 049 e usa esse número como referência. Metas: o projeto `logic` fica **igual (±0,3 s)**; o `ui` adiciona **≤ 5 s** de relógio no total (4 arquivos `.test.jsx`; um jsdom por arquivo; `Crafting.test.jsx` com **no máximo 12 renderizações**). O Tester mede com `npm run test:logic` e `npm run test:ui` separados e registra os números; se passar do orçamento, reduz a 2 arquivos `ui` (cada arquivo `ui` custa ~0,5 a 1 s de ambiente).

## Helpers (`src/test/ui.js` e `setup-ui.js`)

```js
// setup-ui.js: afterEach(cleanup) (sem globals do Vitest o RTL não limpa sozinho); nada mais
// ui.js
resetApp(): void                 // localStorage.clear(); setSettings({ server: 'west', premium: true, feeCeiling: 1000 }); loadFixtureCatalog()
seed(key, value): void           // localStorage.setItem(`albion:${key}`, JSON.stringify(value)); chamar ANTES de render() (usePersisted lê no mount)
craftCfg(over = {}): object      // os defaults de 'craft:cfg' do Crafting.jsx mesclados com over (cópia dos defaults: se divergirem, o teste de contrato abaixo falha)
freezeNow(iso): () => void       // vi.useFakeTimers({ toFake: ['Date'] }) + vi.setSystemTime(iso); devolve o restore. Só Date: temporizadores reais seguem
pricesHook(prices): object       // { prices, loading: false, error: null, updatedAt: <data fixa>, refresh() {} } (o formato de usePrices)
```
Padrão dos mocks (hoisted, o nome não começa com `use` para não acionar `react-hooks/rules-of-hooks`): `const { priceHook, histHook } = vi.hoisted(() => ({ priceHook: vi.fn(), histHook: vi.fn() })); vi.mock('../lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook })); vi.mock('../lib/history', async (orig) => ({ ...(await orig()), useHistory: histHook }));` e, por teste, `priceHook.mockReturnValue(pricesHook(mkPrices({ ... })))`, `histHook.mockReturnValue({ history: null, loading: false, error: null })`. **Contrato dos defaults:** um teste em `Crafting.test.jsx` renderiza com `craftCfg()` e confere que não aparece nenhum aviso de configuração (garante que `craftCfg` não ficou desatualizado em relação ao `Crafting.jsx`).

## Tasks (1 commit cada)

### Task 1: ambiente, dependências e guardas
**Files:** `package.json`, `package-lock.json`, `vitest.config.js`, `src/test/setup-ui.js`, `src/lib/env.test.js`, `src/components/ui.test.jsx` (só o teste de fumaça).
- [ ] **Step 1: testes falhando** (antes de instalar): `src/lib/env.test.js` (project `logic`): `it('a lógica roda em Node, sem DOM', () => { expect(typeof window).toBe('undefined'); expect(typeof document).toBe('undefined'); });` e `ui.test.jsx`: `it('o projeto ui tem DOM e localStorage', () => { expect(document.body).toBeDefined(); localStorage.setItem('a', '1'); expect(localStorage.getItem('a')).toBe('1'); render(<Money value={1234} />); expect(screen.getByText('1.234')).toBeTruthy(); });`. `npx vitest run` → FAIL (`jsdom`/RTL ausentes).
- [ ] **Step 2:** instalar as 3 dependências (comando acima), escrever `vitest.config.js` e `setup-ui.js`, ajustar os scripts. **Step 3:** `npm test` → todos os testes anteriores passam **sem alteração** + os 2 novos; `npm run test:logic` (371 + o guarda) e `npm run test:ui` rodam separados. Registrar `Duration` de cada um. **Step 4:** `npm run lint` e `npm run build` limpos; `dist/` com os mesmos tamanhos de antes.
- [ ] **Step 5: Commit:** `chore: jsdom e Testing Library no Vitest (projects logic e ui)`.

### Task 2: helpers e README
**Files:** `src/test/ui.js`, `README.md`.
- [ ] **Step 1: testes falhando** (em `ui.test.jsx`): `resetApp` zera `getSettings().feeCeiling` para 1000 depois de `setSettings({ feeCeiling: 9999 })` e limpa `localStorage`; `seed('craft:item', {…})` é lido por um componente mínimo que usa `usePersisted('craft:item', 'padrão')` (renderiza o semeado); `freezeNow('2026-11-17T12:00:00Z')` faz `Date.now()` devolver 1794916800000 e o restore volta ao relógio real; `pricesHook(p)` tem as 5 chaves do `usePrices`. **Step 2:** FAIL; **Step 3:** implementar; **Step 4:** PASS. **Step 5:** a seção do README (como escrever e rodar teste de componente, o padrão dos mocks, a regra "lógica de decisão continua em função pura; o teste de componente protege a ligação com o JSX"). **Step 6: Commit:** `test: helpers de teste de componente e README`.

### Task 3: DT-008 e DT-002, componentes folha (`ui.test.jsx`, `InputIssues.test.jsx`)
**Files:** `src/components/ui.test.jsx`, `src/components/InputIssues.test.jsx`. `beforeEach(resetApp)`. Cada linha da tabela é um teste; a coluna "Mutação" é o que o Tester aplica numa cópia para provar que o teste cai.

| Alvo | Teste (asserção) | Mutação que deve derrubar |
|---|---|---|
| `Money` | `value={500} signed` mostra "+500" com classe `good`; `-500` mostra "-500" com `bad`; `0` sem sinal e sem classe; sem `signed` nunca tem sinal ou cor; `Infinity`/`NaN` mostram "valor enorme" sem "+" nem classe | tirar `signed &&`; trocar `v > 0` por `v >= 0`; remover a classe `bad`; remover `Number.isFinite` |
| `fmt` (puro, só se faltar em `econ.test.js`) | `fmt(1e15)` = "1e15"; `fmt(-1e15)` = "-1e15"; `fmt(999999999999999)` = "999.999.999.999.999"; `fmt(-1e16)` = "-1e16" | `>= 1e15` virar `> 1e15`; remover `Math.abs`; `toPrecision(3)` virar 2 ou 4 |
| `CeilingNotice` | com `feeCeiling` 1000 (ou ausente) **não renderiza nada**; com 5000 mostra "Teto de taxa aceito: 5.000." e o botão "Restaurar 1.000"; clicar volta `getSettings().feeCeiling` a 1000 e o aviso some; salvo inválido (`null`, 0, −5, "abc", 2e6) mostra a mensagem do `sanitizeFeeCeiling` e o botão | `value === FEE_CEILING` virar `!==`; `fmt` removido do texto; o botão gravar outro valor; `issue ? issue.msg : …` trocado |
| botão "Aceitar" (`InputIssues`) | issue `{ code: 'fee-ceiling', raw: 5000, field: 'feePer100' }` mostra "Aceitar 5.000 como novo teto"; clicar grava `feeCeiling` 5000 em `getSettings()` **e** em `localStorage`; `raw` = 1e6 mostra; `raw` = 1000001 **não** mostra; `raw` 0, −5, "x" não mostram; outro `code` não mostra; `field` filtra (issue de outro campo não aparece); lista vazia/`undefined` renderiza nada | `<=` virar `<` em `HARD_FEE_CEILING`; remover `raw > 0`; remover `Number.isFinite`; gravar `1000`; ignorar `code`; ignorar `field` |
| `InputIssues` níveis | `info` usa a classe `muted`, `warn` usa `warn`, `error` usa `bad` | trocar o mapa `CLASS` |
| `CorrectedBadge` | `info` não conta; 1 aviso = "1 valor corrigido"; 2 (warn+error) = "2 valores corrigidos"; nenhum = nada | contar `info`; singular/plural trocados |
| `FeeField` (DT-002) | `touched={false}` mostra "Valor padrão do app (400)"; `touched` não mostra; digitar chama `onChange` **e** `onTouch`; com `feeCeiling` 5000 mostra o `CeilingNotice` e com `ceilingNotice={false}` não | remover o `hint`; inverter `touched`; não chamar `onTouch`; ignorar `ceilingNotice` |
- [ ] **Step 1:** escrever os testes (todos devem **passar** contra o código atual; eles são de caracterização). **Step 2: provar por mutação:** o Executor aplica cada mutação da coluna numa **cópia descartável** (fora do repositório), roda o teste e registra "derrubado" numa tabela no corpo do commit; qualquer teste que sobreviver é reforçado. **Step 3:** `npm run check`. **Step 4: Commit:** `test: componentes folha (Money, CeilingNotice, Aceitar, badge, FeeField); fecha DT-002 e DT-008`.

### Task 4: seletor de receita (049) e selo (039/049)
**Files:** `src/components/RecipePicker.test.jsx`, `src/lib/catalog.test.js` (DT-009, se faltar). Dados: fixture da 049 (`T4_2H_ARCANESTAFF_HELL`, `T4_ARMOR_PLATE_ROYAL`, `T4_MAIN_SWORD`), `computeCraft` e `recipeVariants` reais; preços: tábua 100, barra 200 e, para o especial, **artefato 1.840 e ficha 18.498** (dossiê 049 §4). `results = recipeVariants(id).map((v) => computeCraft({ rec: v.rec, targetMid, prices, cfg: craftCfg({ specialty: true, refine: BUY }), premium: true, bonusCity: null }))`.

| Alvo | Teste (asserção) | Mutação que deve derrubar |
|---|---|---|
| `RecipePicker` itens | 2 variantes: segmentos "Automático", "Artefato", "Ficha de favor" e a tabela com 2 linhas; Royal: "Base 1/2/3"; **1 variante: não renderiza nada** (`queryByTestId('recipe-picker')` nulo) | `variants.length < 2` virar `< 1`; rótulo errado |
| "mais barata agora" | com 1.840 × 18.498 o selo aparece **só** na linha "Artefato"; com artefato 1.840 e ficha 1.000 só em "Ficha de favor"; ficha sem preço: aparece em "Artefato" e a ficha mostra "sem preço"; **nenhuma** receita completa: selo em lugar nenhum | `i === cheapest` trocado por `i === 0`; `cheapest` ignorando `isComplete`; remover o selo |
| escolha | o segmento "Automático" está ativo por padrão (`mode` indefinido); `mode="1"` ativa "Ficha de favor"; clicar em "Ficha de favor" chama `onChange('1')` e em "Automático" `onChange('auto')` | `String(mode)` removido; valores do `onChange` trocados |
| custo total | a linha da ficha mostra o total do `computeCraft` (material + taxa 634) e a do artefato (+ taxa 403): diferença 16.889 (dossiê 049 §4: 16.658 + 231 da taxa pela regra atual); a coluna "Taxa da bancada" mostra 403 e 634 | trocar `totalCost` por `matCost`; coluna da taxa ausente |
| aviso de dependência da taxa (D-034) | artefato 1.840 × ficha 1.700: a vencedora **com** taxa é o artefato (5.551,27 × 5.642,27) e **sem** taxa é a ficha (5.148,27 × 5.008,27): aparece o aviso "A escolha depende da taxa de bancada…" (com a inicial maiúscula); com 1.840 × 18.498 **não** aparece | `depends` invertido; remover o `Banner`; remover o `charAt(0).toUpperCase()` |
| `returnBadge` na tabela (selo 039/049) | em `Crafting.test.jsx`, item `T4_ARTEFACT_2H_COMBATSTAFF_MORGANA` (50 `T4_RUNE`, fixture da 039): a linha mostra "não retorna · não verificado" com `title` explicando; `T4_ARMOR_PLATE_ROYAL`: "não retorna" **sem** "não verificado" nas duas linhas; `T4_MAIN_SWORD`: nenhum selo | remover o selo; `unverified` ignorado; selo "não verificado" em todo não-retorna; remover o `title` |
| DT-009 (puro) | `recipeOf('T6_ARTEFACT_MAIN_SWORD_CRYSTAL').res[0]` (ingrediente `T6_SHARD_CRYSTAL`): `returnable === false` e `unverified === true` | tirar `SHARD` de `FRAGMENT_RE` |
- [ ] **Steps:** testes (passam), provas por mutação em cópia, `npm run check`. **Commit:** `test: seletor de receita da 049 e selo "não verificado" (DT-009)`.

### Task 5: Crafting, os 3 mutantes de UI da 041 e a receita escolhida
**Files:** `src/components/Crafting.test.jsx` (≤ 12 renderizações). Setup: `resetApp()`, `freezeNow('2026-11-17T12:00:00Z')` (servidor `west`: reset 10:00 UTC), `vi.mock` de `usePrices` e `useHistory`, `seed('craft:item', { id: 'T6_MAIN_SWORD', ench: 0 })`, `seed('craft:cfg', craftCfg({ specialty: true, refine: { METALBAR: 'buy', LEATHER: 'buy' }, craftDaily, craftDailyAt }))`, preços `mkPrices({ T6_METALBAR: 200, T6_LEATHER: 150 })` (bruto 16×200 + 8×150 = 4.400 como no dossiê 041 §4), cidade Lymhurst (RRR 24,8% = 33/133 sem diário; 34,6% = 53/153 com +20).

| Teste (asserção) | Mutação que deve derrubar |
|---|---|
| **Aviso de data futura:** `craftDaily` 20 e `craftDailyAt` = agora + 3 dias → aparece "Data do bônus no futuro"; **não** aparece "Bônus de ontem"; o texto "RRR atual: 24.8%" (diário usado = 0); com `craftDailyAt` = agora − 1 h (depois do reset das 10:00) nenhum dos dois avisos e "RRR atual: 34.6%" | remover o `div` do aviso futuro; mostrar sempre; trocar `daily.future` por `daily.stale`; `effectiveDaily` ignorando `future` |
| **Aviso de bônus velho:** `craftDailyAt` = hoje 09:00 UTC (antes do reset) → "Bônus de ontem?" e RRR 24.8% | remover o aviso; invertê-lo |
| **Nota do campo** (`data-testid="daily-note"`): com `craftDaily` 20 e **sem preços** (sem cartão) a nota existe e contém o texto de `DAILY_NOTE`; com `craftDaily` 0 e sem preços **não** existe | remover o nó; `showDailyNote` sempre `true`/`false`; texto trocado |
| **Nota do cartão** (`data-testid="daily-note-card"`): com preços completos o cartão "Vale esperar o bônus do dia?" existe e a nota está dentro dele; **sem preços** o cartão (e a nota) não existem; com `craftDaily` 0 e preços a nota do **cartão** existe e a do **campo** também (`hasCard`) | remover a nota do cartão; mostrar o cartão sem preços; `hasCard` ignorado |
| **Receita automática × escolhida (049):** `T4_2H_ARCANESTAFF_HELL` com artefato 1.840 e ficha 18.498: a tabela de Materiais mostra o nome do artefato (`nameOf('T4_ARTEFACT_2H_ARCANESTAFF_HELL')`) e **não** o da ficha; semeando `recipeVariant: '1'` mostra a ficha (`nameOf('T4_ARTEFACT_TOKEN_FAVOR_2')`); `recipeVariant: 'auto'` com a ficha mais barata (1.000) mostra a ficha; `recipeVariant: '9'` (inválido) cai na última variante sem erro | `idx` ignorando `cfg.recipeVariant`; `auto` fixo em 0; sem o `Math.min`/`Math.max` |
| **Contrato dos defaults:** `craftCfg()` sem override renderiza sem o selo "valores corrigidos" e sem avisos de configuração | defaults divergentes |
- [ ] **Steps:** testes, provas por mutação, `npm run check`, medir o tempo. **Commit:** `test: Crafting (avisos e notas do bônus diário da 041, receita escolhida da 049)`.

## Como o Tester valida

1. **Instalação e ambiente:** `package.json` com exatamente `jsdom ^29.1.1`, `@testing-library/react ^16.3.3`, `@testing-library/dom ^10.4.2` em `devDependencies`; `npm ci` limpo; lock com os números reais registrados; `npm test` verde; o guarda `env.test.js` prova que a lógica segue em Node; **todos os testes anteriores passam sem alteração**.
2. **Produção intacta:** `git diff --stat master...feat/IDEIA-069` sem nenhum arquivo em `src/components/*.jsx` ou `src/lib/*.js` de produção; `npm run build` com os mesmos arquivos e tamanhos em `dist/`.
3. **Tempo:** `test:logic` igual ao baseline (371 testes, ~1,5 s; ±0,3 s) e `test:ui` ≤ 5 s de relógio; `Crafting.test.jsx` com ≤ 12 renderizações.
4. **Mutações (obrigatório):** o Tester aplica **todas** as mutações das três tabelas, uma por vez, em cópia fora do repositório, e confirma que cada uma derruba o teste correspondente. As mutações da 041 (data futura, nota do campo, nota do cartão) são exatamente as que o laudo da 041 registrou como sobreviventes; o selo da 039 e o seletor da 049 idem. Qualquer sobrevivente reprova.
5. **Fidelidade ao dossiê/laudos:** números de preço do seletor: 1.840 × 18.498 (dossiê 049 §4); bruto 4.400 e RRR 24,8% × 34,6% (dossiê 041 §4: PB 33 e 53); taxa 403 e 634 pela regra atual.
6. **O que um usuário experiente estranharia:** teste que depende de relógio real ou de rede (nenhum pode); `localStorage` de um teste vazando para outro; teste que passa mesmo com o JSX removido (o objetivo da ideia).

## Riscos

1. **jsdom 30/31 e Node:** exigem `^22.22.2`; fixar `^29.1.1` (o caret não passa de 29.x). Se a máquina/CI subir de Node, a escolha pode ser revista.
2. **Estado global de `settings.js`** (módulo com `state` e `localStorage` lidos no import): `resetApp()` em todo `beforeEach`; `isolate` padrão do Vitest dá um módulo novo por arquivo.
3. **ESLint (`eslint-plugin-react-hooks` 7, regras do React Compiler):** o projeto não habilita o compilador no build; só as regras de lint valem. Nomes de mocks sem prefixo `use`; helpers em `.js` (sem JSX) para não acionar `react-refresh/only-export-components`; componentes de teste definidos **fora** dos `it`. Sem mudança em `eslint.config.js`; se o lint reclamar, ajustar o teste, não a regra.
4. **`Date` congelado** só com `toFake: ['Date']` (RTL e React usam temporizadores reais).
5. **Defaults de `craft:cfg` duplicados** em `craftCfg()`: coberto pelo teste de contrato; a extração para um módulo compartilhado (mudaria produção) fica para outra ideia.
6. **Tempo:** cada arquivo `.test.jsx` custa um jsdom; o orçamento acima manda reduzir arquivos, não testes.

## Critério de pronto

`npm run check` verde; os dois projects funcionando e medidos; nenhum arquivo de produção alterado; **todas** as mutações das tabelas derrubadas (tabela anexada ao commit); DT-002, DT-008, DT-009 e os 3 mutantes de UI da 041 fechados; README com a receita de teste de componente; só os arquivos listados alterados.

## PERGUNTAS PARA O GERENTE

1. **`projects` do Vitest** (extensão `.test.jsx` = jsdom) em vez de pragma por arquivo: aprovado? A pragma fica como plano de reserva.
2. **Sem `user-event` e sem `jest-dom`** (a primeira é de menos de 2 semanas; a segunda é conveniência). Aceita começar só com `fireEvent` e `textContent`?
3. **`fmt` 1e15/−1e15** (DT-008): se a 010 já fechou esses testes puros, a 069 só confere. Confirma que o Executor deve checar antes de duplicar?
4. **Teste de contrato dos defaults** em vez de extrair os defaults de `Crafting.jsx` (que mudaria produção): aceita, ou prefere um refactor pequeno (e fora da 069) para exportar `CRAFT_DEFAULTS`?
5. As ideias 058 e 048 acrescentam testes de componente próprios quando a 069 já estiver mesclada (cartão de cidades; editor de despesas). Confirma a ordem 069 → 058 → 048?
