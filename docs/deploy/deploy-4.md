# Deploy 4: IDEIA-066 (aviso de saída ilusória)

**Status final: VERIFICADO**

- URL: https://albion-data-iota.vercel.app
- SHA do merge/publicado: `a4fcd0297897976e88f5ea4bc37599e5b9a3f44f` (feat/IDEIA-066, sem conflito; 038 e 060 não incluídas)
- Deploy: `dpl_6tv7ah3EvGD4RytzBAAcHHx8h3vy`, READY, production; status do commit success.
- Gate: docs/qa/IDEIA-066.md APROVADO.
- `npm run check`: lint ok, 8 arquivos, 146 testes passando, build ok, código 0.
- HTTP 200: `/`, `/data/catalog.json`; bundle `index-Dxxfycmw.js` (deploy 3: index-B_OQIYCp.js).

## Verificação (navegador embutido, aba própria; a aba compartilhada foi redirecionada por outro agente para localhost:5196 durante o teste, então repeti tudo numa aba nova na URL de produção)
- (a) Craft T4_MAIN_SWORD (Espada Larga do Adepto T4): tabela "Onde vender" com coluna "Comprador". Caerleon (venda 12.000) e Lymhurst (6.138): "nenhum visível" + selo "ilusória". Mercado Negro: "sim (ordem de compra 1.185)". Cartão do melhor destino mostra o aviso "A melhor saída no papel (Caerleon, 12.000) não tem ordem de compra visível. Saída com comprador: Mercado Negro, instantânea, lucro -2.228."
  - Conta: Caerleon 12.000x(1-0,04-0,025)=11.220, menos custo 3.366 = +7.854 (ok). Mercado Negro 1.185x0,96=1.138 (sem setup fee), menos 3.366 = -2.228 (ok).
- (b) Craft Poção T4_POTION_HEAL (5 un. por craft): cartão Preço-alvo: "Melhor comprador atual (ordem de compra, entre todas as cidades): 1.225 em Lymhurst 13 h"; Liste a 2.227, líquido 1.915,22, lucro 319,42/un. (custo 1.596). Martlock 3.796x5x0,935=17.746 (ok). Tabela também marca "ilusória" nas cidades sem comprador e "sim" onde há.
- (c) Refino Tábua T4: cartão Preço-alvo funcionando (Liste a 292, líquido 251,12, lucro 42,02, custo 209).
- (d) RRR (PB 58, 36,71%), Mercado e Flipper (56 oportunidades) funcionam; console sem erros.
- Env vars: nenhuma (app estático).

## Observações
Sem anomalias; sem rollback. Interferência de outro agente no navegador compartilhado (navegou a aba para localhost:5196); contornada com aba própria.
