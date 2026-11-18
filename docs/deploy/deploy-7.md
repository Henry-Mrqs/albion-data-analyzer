# Deploy 7: IDEIA-057 (transmutação deixa de ser receita de craft)

**Status final: VERIFICADO**

- URL: https://albion-data-iota.vercel.app
- SHA do merge/publicado: `4510aa3caaad0d7d57cd9979cbacfe0ddae546e1` (feat/IDEIA-057, sem conflito; 060 não incluída)
- Deploy: `dpl_BxqdDYEGLHLYutGzPexBLcxAGRvd`, READY, production.
- Gate: docs/qa/IDEIA-057.md APROVADO.
- `npm run check`: lint ok, 11 arquivos, 225 testes passando, build ok, código 0.
- Observação de árvore: `docs/qa/IDEIA-060.md` aparecia modificado (outro agente); não foi tocado nem incluído.

## Verificação
- (a) HTTP 200: `/` e `/data/catalog.json`. Bundle `index-BOZekMDc.js` (deploy 6: index-dYnJPRVR.js). SHA-1 (10 primeiros) do catálogo servido: `f5f5034bc5` (antes `4c9c57b9e5`); o bundle contém `id:\`f5f5034bc5\``: a URL versionada mudou junto com o catálogo.
- (b) Catálogo servido: 2.292 itens, 2.166 com `r`, 25 com `tm`, `cityOf` 33 entradas, 1.286 com `cc`. T5_WOOD: sem `r`, com `tm` (ex.: nível 0: 781 T4_WOOD); T4_PLANKS e T4_MAIN_SWORD com `r`, sem `tm`. `vals.T8_ROCK_LEVEL1`=51,2 e `T8_ROCK_LEVEL2`=102,4.
- (c) Aba nova só de produção, sem limpar nada: 1 requisição ao catálogo, `GET /data/catalog.json?v=f5f5034bc5` -> 200 (55.430 B transferidos), mesma contagem (1) após navegar por todas as abas. Sem Banner; console sem erros.
- (d) Craft: busca "Troncos" e "Minério" -> "Nenhum item encontrado"; "T5" lista só refinados e artefatos (Tábuas de Cedro, Bloco de Granito, Barra de Aço Titânio, Couro Curtido, Tecido Ornado...); "Pedra" só artefatos (Restos de Golem..., Pedra Inscrita...); "espada", "bolsa", "poção" listam normalmente. T4_BAG: Brecilien como cidade de bônus; T4_ARMOR_PLATE_ROYAL: "Sem cidade de bônus conhecida"; T4_MAIN_SWORD: Lymhurst.
- (e) Refino Tábua T4: custo líquido 209, lucro +161/un., rota "Refinar T4 — comprar 2x Troncos de Pinho em Lymhurst (73 un.)" (custo 209 igual ao deploy 5). Barra de Metal T5: custo líquido 699, lucro +449/un., "Refinar T5 — comprar 3x Minério de Titânio em Lymhurst (291 un.)". Preço-alvo presente. RRR (PB 18, 15,25%). Mercado abre "Troncos de Cedro T5" (T5_WOOD, Recurso Bruto) com preços por cidade (ex.: Fort Sterling 380, Lymhurst 373). Flipper "Varrer mercado": 75 oportunidades. Console sem erros. Env vars: nenhuma.

## Observações
Sem anomalias; sem rollback. A entrega versionada da 067 funcionou: catálogo novo sem Ctrl+F5.
