# Albion Data (client)

Ferramenta web de craft, refino e economia do Albion Online (React + Vite). Os preços vêm da API do Albion Online Data Project e o catálogo de itens/receitas de `public/data/catalog.json`.

## Scripts

Rode todos dentro de `client/`.

- `npm run dev`: servidor de desenvolvimento.
- `npm test`: roda os testes uma vez (Vitest, ambiente Node).
- `npm run test:watch`: testes em modo observação.
- `npm run check`: lint + testes + build. Rode antes de todo commit/PR.

## Testes

Ficam ao lado do código (`src/**/*.test.js`). A lógica de cálculo mora em `src/lib/` (módulos puros: `econ.js`, `craftPlan.js`, `refinePlan.js`, `flip.js`); os componentes só montam a tela. Os testes usam uma fixture pequena do catálogo (`src/test/catalog.fixture.json`) e a injetam com `setCatalog`.

Para regenerar a fixture, a partir da raiz do repositório:

```
node scripts/build-test-fixture.mjs
```

Aviso: são testes de caracterização. Eles congelam o que o código faz hoje (para provar que um refactor não mudou números) e NÃO validam as fórmulas contra o jogo (RRR, taxa de bancada, impostos). Se uma constante for corrigida, altere o teste correspondente de propósito, no mesmo commit.
