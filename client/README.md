# Albion Data (client)

Ferramenta web de craft, refino e economia do Albion Online (React + Vite). Os preços vêm da API do Albion Online Data Project e o catálogo de itens/receitas de `public/data/catalog.json`.

## Scripts

Rode todos dentro de `client/`.

- `npm run dev`: servidor de desenvolvimento.
- `npm test`: roda todos os testes uma vez (Vitest, dois projects: `logic` em Node e `ui` em jsdom).
- `npm run test:logic` / `npm run test:ui`: só a lógica (`*.test.js`, Node) ou só os componentes (`*.test.jsx`, jsdom).
- `npm run test:watch`: testes em modo observação.
- `npm run check`: lint + testes + build. Rode antes de todo commit/PR.

## Testes

Ficam ao lado do código (`src/**/*.test.js`). A lógica de cálculo mora em `src/lib/` (módulos puros: `econ.js`, `craftPlan.js`, `refinePlan.js`, `flip.js`); os componentes só montam a tela. Os testes usam uma fixture pequena do catálogo (`src/test/catalog.fixture.json`) e a injetam com `setCatalog`.

Para regenerar a fixture, a partir da raiz do repositório:

```
node scripts/build-test-fixture.mjs
```

Aviso: são testes de caracterização. Eles congelam o que o código faz hoje (para provar que um refactor não mudou números) e NÃO validam as fórmulas contra o jogo (RRR, taxa de bancada, impostos). Se uma constante for corrigida, altere o teste correspondente de propósito, no mesmo commit.

## Testes de componente

Arquivos `src/**/*.test.jsx` rodam em jsdom (project `ui`) com @testing-library/react; os `*.test.js` seguem em Node, sem `window` (o guarda `src/lib/env.test.js` falha se isso mudar). A extensão decide o ambiente, sem pragma.

Regra: a lógica de decisão continua em função pura (`src/lib/`); o teste de componente protege a ligação com o JSX (o aviso aparece, o botão grava, o selo vai na linha certa).

Receita:

- `beforeEach(resetApp)` (de `src/test/ui.js`) limpa o `localStorage`, restaura o `settings.js` e carrega o catálogo da fixture.
- `seed('craft:item', {...})` grava o estado como o `usePersisted` grava; chame ANTES de `render()` (o hook lê ao montar).
- `freezeNow('2026-11-17T12:00:00Z')` congela só o `Date` (devolve o restore); nenhum teste pode depender do relógio real nem da rede.
- `craftCfg(over)` são os padrões de `craft:cfg` do `Crafting.jsx` mesclados com `over`; `pricesHook(prices)` tem o formato do retorno de `usePrices`.
- Hooks de rede são trocados com `vi.mock` + `importOriginal`, nunca reescritos. O nome do mock não começa com `use` (regra do lint):

```js
const { priceHook, histHook } = vi.hoisted(() => ({ priceHook: vi.fn(), histHook: vi.fn() }));
vi.mock('../lib/market', async (orig) => ({ ...(await orig()), usePrices: priceHook }));
vi.mock('../lib/history', async (orig) => ({ ...(await orig()), useHistory: histHook }));
// por teste: priceHook.mockReturnValue(pricesHook(mkPrices({ ... })))
```

- Componentes auxiliares do teste ficam fora dos `it`; helpers em `.js` (sem JSX).
- Todo teste novo deve cair quando a linha que ele protege é mutada (mutação manual com revert imediato).
