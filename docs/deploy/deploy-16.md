# Deploy 16: IDEIA-069 (infra de testes jsdom + Testing Library)

**Status final: VERIFICADO (nada mudou em produção, como esperado)**

- SHA do merge/publicado: `7c7b095f4dc4d3ec0e56b4128002b68ad82a2ff3` (merge limpo de feat/IDEIA-069).
- Deploy: `dpl_A7rJEa3fStkkQtBNgqVKAybympgC`, READY, production (o build da Vercel passou com as novas devDependencies/lock); status do commit success. Gate: docs/qa/IDEIA-069.md APROVADO.
- `npm run check`: lint ok, 32 arquivos, 892 testes (esperado >= 867), build ok, código 0. Observação: `npm ci` local falha com EISDIR em node_modules/.bin (problema conhecido do ambiente); usei `npm install`.
- Bundle `index-BKLxn1eM.js`, idêntico ao do deploy 15 (esperado); catálogo `c0f66cb0bd` (igual ao id no bundle); 200 raiz e catálogo.
- Navegador (aba nova só produção, sem tocar no localStorage; conferido que ficou igual): Craft (MATERIAIS e cartão "Comparar cidades de craft"), Refino, Mercado, RRR (PB 18/15,25%) abrem; Flipper "Varrer mercado": 81 oportunidades; 1 requisição ao catálogo `?v=c0f66cb0bd`; console sem erros. Env vars: nenhuma.

## Observações
Sem anomalias; sem rollback.
