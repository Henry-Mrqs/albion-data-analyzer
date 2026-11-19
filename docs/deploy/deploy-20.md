# Deploy 20: IDEIA-078 (teste instável de marketRequest)

**Status final: VERIFICADO (nada mudou em produção, como esperado)**

- SHA do merge/publicado: `e0f9d361b6ec2b19e0f938927443aa1e100582ab` (merge --no-ff limpo de feat/IDEIA-078; só market.js +5 linhas e marketRequest.test.js; 031 não incluída).
- Deploy: `dpl_CRwvffg6ibagLq4zikgGvc5Ey2Sx`, READY, production. Gate: docs/qa/IDEIA-078.md APROVADO.
- `npm run check`: código 0; 48 arquivos, 1089 testes. Suíte com `--sequence.shuffle` e seeds 11, 222 e 3333: 3x 1089/1089, 0 falhas.
- Produção: bundle `index-CBQksK6R.js` (igual ao do deploy 19, esperado); catálogo `c0f66cb0bd`, 1 requisição `?v=`; 5 abas abrem sem NaN/erro; console sem erros nem avisos. localStorage não tocado (vazio antes e depois).

## Observações
Sem anomalias; sem rollback.
