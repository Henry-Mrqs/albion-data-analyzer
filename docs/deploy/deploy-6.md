# Deploy 6: IDEIA-067 (cache do catálogo: URL versionada e revalidação)

**Status final: VERIFICADO**

- URL: https://albion-data-iota.vercel.app
- SHA do merge/publicado: `77d846d85695066c37c7f12f385c91ed7a7aa2c5` (feat/IDEIA-067, sem conflito; 057 e 060 não incluídas)
- Deploy: `dpl_GhPx41jQW99yiCfX5F7GanUXbCTa`, READY, production; status do commit success.
- Gate: docs/qa/IDEIA-067.md APROVADO.
- `npm run check`: lint ok, 11 arquivos, 214 testes passando, build ok, código 0.

## Verificação
- (a) HTTP 200: `/`, `/data/catalog.json`, `/data/catalog.json?v=qualquercoisa` (mesmo ETag `a6657a328dfdb7dfc6121cba15236c14` e mesmo SHA-1 do corpo nos dois). Bundle `index-dYnJPRVR.js` (deploy 5: index-DuLI_gSc.js).
- (b) Cabeçalhos: `/data/catalog.json` -> `cache-control: public, max-age=0, must-revalidate` (antes max-age=3600, swr=86400); idem com `?v=`. `/assets/index-BnlDO6oX.css` e js: `public, max-age=0, must-revalidate` (padrão da Vercel, sem regra no vercel.json, inalterado). `/qualquer` -> 200 text/html com o index.html (rewrite do SPA ok).
- (c) SHA-1 dos 10 primeiros caracteres do catálogo servido: `4c9c57b9e5`; o bundle contém `oe({fetchFn:fetch,base:'/',id:'4c9c57b9e5'})` e monta `data/catalog.json?v=<id>`. Mesmo id.
- (d) Aba nova só de produção: primeira carga fez 1 requisição ao catálogo, `GET /data/catalog.json?v=4c9c57b9e5` -> 200 (transferSize 54.531 B). Recarga: 1 requisição, mesma URL, transferSize 300 B (revalidada, 304). Após navegar por todas as abas, ainda 1 requisição. Sem Banner de catálogo; console sem erros.
- (e) Craft: T4_BAG -> Brecilien "(bônus)"; T4_MAIN_SWORD -> Lymhurst "(bônus)"; T4_ARMOR_PLATE_ROYAL -> "Sem cidade de bônus conhecida"; tabela "Onde vender" com coluna "Comprador" e selo "ilusória"; Preço-alvo presente (Craft e Refino); RRR (PB 18, 15,25%, Fort Sterling/refino-craft default); Refino "Melhor rota"; Mercado; Flipper "Varrer mercado": 66 oportunidades. Console sem erros. Env vars: nenhuma.

## Observações
Sem anomalias; sem rollback. A anomalia de cache do deploy 5 está corrigida.
