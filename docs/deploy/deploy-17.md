# Deploy 17: IDEIA-048 (despesas extras + venda sem imposto)

**Status final: VERIFICADO (sem rollback)**

- SHA do merge/publicado: `24cf5296e45fb2b28748e202ea0eceef878fe5f4` (merge --no-ff limpo de feat/IDEIA-048 na master; sem conflito; 071 não incluída).
- Deploy: `dpl_FjQk2QZJHiEaXVYkYPnX2ewPcEL1`, READY, production. Gate: docs/qa/IDEIA-048.md APROVADO.
- `npm run check` (client/): lint ok, build ok, código 0; `npm test`: 39 arquivos, 971 testes. `npm ci` falhou (EISDIR, problema conhecido do ambiente); usei `npm install`.
- Bundle novo `index-fm5oOycB.js` (antes `index-BKLxn1eM.js`); catálogo `c0f66cb0bd` inalterado, 1 requisição `?v=`; console sem erros nem avisos (só 2 issues de acessibilidade de formulário já existentes).
- Craft com T4_MAIN_SWORD: cartão "Despesas extras" presente; 230 por craft -> resumo "Despesas: 230 por craft (230 no lote de 1)", custo 3.222 -> 3.452, lucro +1.556 -> +1.326. Interruptor "Sem imposto" no Mercado Negro: líquido passa a 4.977 (= preço), lucro +1.525.
- Refino: "Venda sem imposto" e "Despesas extras" presentes, alternar sem NaN. Mercado, RRR e Flipper abrem (Flipper "Varrer": 47 oportunidades, sem NaN).
- Estado antigo: `albion:craft:cfg` sem extras/noTax abre sem erro/NaN (custo 3.222, lista de despesas vazia).
- Largura (viewport mínimo do navegador 500px; scrollWidth 485 < 500) em todas as abas: sem rolagem horizontal. Não foi possível emular 375px exatos.
- localStorage de produção: estava vazio no início; chaves criadas por mim (albion:craft:cfg, albion:craft:item, albion:refine:cfg) removidas; restaurado ao estado original (vazio). Env vars: nenhuma.

## Observações
Sem anomalias; sem rollback.
