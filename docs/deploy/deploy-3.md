# Deploy 3: IDEIA-019 (taxa de bancada arredondada no total + DT-001)

**Status final: VERIFICADO**

- URL: https://albion-data-iota.vercel.app
- SHA do merge/publicado: `ae61c3e0868b744e9e0385eb79ab641e139f49e4` (branch feat/IDEIA-019, sem conflito; 038 e 066 não incluídas)
- Deploy: `dpl_EAvnhwNNfZSLcdy9gmBamoNKrQ45`, READY, production; status do commit success.
- Gate: docs/qa/IDEIA-019.md APROVADO (com adendo do re-teste).
- `npm run check`: lint ok, 7 arquivos, 134 testes passando, build ok, código 0.
- HTTP 200: `/`, `/data/catalog.json`; bundle `index-B_OQIYCp.js` (deploy 2: index-Ct0l7Pu8.js).

## Verificação no navegador
- (a) Craft T6_MAIN_SWORD, 100 crafts: taxa 400 -> "Taxa da bancada" 69.120; taxa 100 -> 17.280.
- (b) Aviso "Valor padrão do app (400), não do jogo" aparece com o padrão não confirmado; ao editar o campo de craft o aviso desse campo some (o campo de taxa do refino dos materiais tem aviso próprio e permanece até ser editado).
- (c) localStorage `albion:craft:cfg` com feePer100 250, sem feeSet: após reload campo mostra 250 e aviso ausente (0 ocorrências). A chave não existia antes do teste; foi removida ao final.
- (d) Refino Tábua T4, 1.000 un.: rótulos "Taxa da última etapa (por unidade)" e "Taxa do lote (todas as etapas, 1.000 un.)". Taxa 400: rota "Comprar refinado pronto": última etapa 7 (=1,8x400/100=7,2), lote 7.200; rota Melhor combinação (preços reais de hoje): lote 9.478 (7.200 + 2.278 do T3, consistente com valor×0,1125×taxa/100 arredondado uma vez no total).
- (e) RRR (Refino/Fort Sterling/madeira PB 58, 36,71%), Preço-alvo (Craft e Refino), Mercado e Flipper (56 oportunidades, sem aviso de limite) funcionando. Console sem erros.
- Env vars: nenhuma (app estático).

## Observações
Sem anomalias; sem rollback. Lote de 1.800 citado no briefing corresponde à taxa 100; com taxa 400 o valor é 7.200.
