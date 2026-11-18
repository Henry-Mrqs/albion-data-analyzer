# Deploy 5: IDEIA-038 (cidade de bônus de craft pelo craftingcategory)

**Status final: VERIFICADO (com 1 anomalia de cache, ver abaixo)**

- URL: https://albion-data-iota.vercel.app
- SHA do merge/publicado: `0a950de9a61bd8c0390561d050d18d4b469c07c8` (feat/IDEIA-038, sem conflito com a 066; 060 não incluída)
- Deploy: `dpl_AwaBeGkK3J42GBtJ1MGdVGPfGgVr`, READY, production; status do commit success.
- Gate: docs/qa/IDEIA-038.md APROVADO.
- `npm run check`: lint ok, 9 arquivos, 194 testes passando, build ok, código 0.
- HTTP 200: `/`, `/data/catalog.json`; bundle `index-DuLI_gSc.js` (deploy 4: index-Dxxfycmw.js).
- Catálogo servido: chaves built, src, cityOf, items, extra, vals, encNames; `cityOf` com 33 entradas (inclui cape/bag/potion = Brecilien); 1.286 de 2.292 itens com campo `cc`.

## Verificação (aba nova só para produção, URL conferida a cada leitura)
Obs.: itens escolhidos pela busca por nome (a busca por id não acha todos); onde o primeiro resultado não era o item pedido, usei o equivalente da mesma categoria.
- (a) Espada (T4_MAIN_SWORD_CRYSTAL, categoria sword): Lymhurst "(bônus)"; RRR 24,8%.
- (b) T4_ARMOR_PLATE_SET1: Bridgewatch "(bônus)".
- (c) T4_OFF_BOOK (offhand, no lugar do escudo; o 1º resultado do escudo era um artefato): Martlock "(bônus)".
- (d) T4_BAG: Brecilien na lista e "(bônus)".
- (e) T4_POTION_HEAL: Brecilien "(bônus)".
- (f) T4_ARMOR_PLATE_ROYAL: "Sem cidade de bônus conhecida para este item", nenhuma cidade marcada.
- (g) RRR (modo Craft, item T4_OFF_BOOK): "Categoria de craft deste item no jogo: Mão secundária (escudo, livro, tocha) · cidade de bônus: Martlock".
- (h) Royal: RRR 15,25% em Martlock, Bridgewatch e Brecilien (e Lymhurst); espada em Lymhurst 24,8% (24,81%).
- (i) Refino (Tábua T4, rota e Preço-alvo), Preço-alvo no Craft, Mercado e Flipper (56 oportunidades) funcionam; console sem erros. Env vars: nenhuma.

## ANOMALIA: catálogo antigo em cache do navegador
`vercel.json` serve `/data/*` com `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`. Na minha sessão o navegador tinha o catálogo antigo em cache (sem `cityOf`/`cc`) e, mesmo após o deploy, o app mostrou "Sem cidade de bônus conhecida" para a poção e sem Brecilien marcada. Após forçar a busca nova (`fetch('/data/catalog.json',{cache:'reload'})` + recarregar) tudo ficou correto. Impacto: usuários que já visitaram o site podem ver o catálogo antigo por até 1 h (e até 24 h em stale-while-revalidate) após cada deploy que mude o catálogo. O catálogo antigo com o código novo degrada com elegância (sem bônus), não quebra. Sugestão (não aplicada, fora do escopo): reduzir/revalidar o cache de `/data/catalog.json` ou versionar a URL (ex.: `?v=<built>`).
