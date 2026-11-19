# Deploy 19: IDEIA-076 (acabamento das despesas extras)

**Status final: VERIFICADO (sem rollback)**

- SHA do merge/publicado: `eb96af3680a25d2893e4e4eb9e2d64ab279e2ed1` (merge --no-ff limpo de feat/IDEIA-076; 031 e 078 não incluídas).
- Deploy: `dpl_2iABNgpCfd6itMWDibVG9z7k72gw`, READY, production. Gate: docs/qa/IDEIA-076.md APROVADO.
- `npm run check`: código 0; `npm test`: 48 arquivos, 1089 testes. (`npm ci` não usado; `npm install`.)
- Bundle novo `index-CBQksK6R.js` (antes `index-Tkuarln4.js`); catálogo `c0f66cb0bd` inalterado, 1 requisição `?v=`; 5 abas abrem sem NaN/erro.
- Craft T4_MAIN_SWORD, 3 crafts, despesas 120 por craft + 60 por lote: select de escopo legível (opções "por craft"/"por lote", largura 184 com conteúdo 182); resumo "120 por craft + 60 por lote (420 no lote de 3)". Comparar cidades: coluna "Despesas" = 420 e taxa "518 no lote"; Lymhurst: 9.147 + 518 + 420 = 10.085 (Custo total). Nota "Custo total = material + taxa + despesas extras" presente.
- "Sem imposto" no Mercado Negro: Melhor destino mostra "Ordem de compra (4.977) sem imposto" e "Venda líquida ... (sem imposto)".
- Estado corrompido (`extras` com valor "-Infinity" e objeto `{}`): sem "Infinity"/"[object"/NaN na tela e sem tela branca; campos de despesa ficam vazios; custo volta ao normal. Observação: o console registra 6 avisos nativos do navegador ("The specified value ... cannot be parsed", do input numérico recebendo o valor corrompido); inócuo, mas o valor corrompido ainda chega ao input.
- Refino: despesa "por unidade" (opções "por unidade"/"por lote"); 5 por unidade -> "500 no lote de 100", custo líquido 209 -> 214, lucro/un. +121 -> +116.
- 500px (mínimo do navegador): scrollWidth 485 < 500 nas 5 abas, sem rolagem horizontal.
- localStorage de produção: vazio no início e restaurado vazio ao final. Env vars: nenhuma.

## Observações
Sem rollback.
