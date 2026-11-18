# Deploy 9: IDEIA-039 (não retorna recursos por ingrediente, maxreturnamount)

**Status final: VERIFICADO**

- SHA do merge/publicado: `451ae3deaa68dfec8367195c7cafde7de825f1cf` (feat/IDEIA-039, sem conflito; 041 e 010 não incluídas)
- Deploy: `dpl_HQimZ5ag8ZC8EXbuHeYhSMKofAqs`, READY, production; status do commit success.
- Gate: docs/qa/IDEIA-039.md APROVADO. `npm run check`: lint ok, 14 arquivos, 328 testes, build ok, código 0.

## (a) HTTP / versionamento
200 raiz e catálogo. Bundle `index-Cm3ouxS_.js` (antes index-CvTjyY4G.js). SHA-1 (10) do catálogo servido `707148ff5c` (antes `f5f5034bc5`), igual ao `id:\`707148ff5c\`` no bundle.
## (b) Catálogo servido
2.292 itens, 2.166 com `r`, 25 com `tm`, 1.286 com `cc`, 33 em cityOf; 868 itens com receita contendo 3º elemento. Tamanho 588.712 -> 591.016 B (+2.304). T4_ARMOR_PLATE_ROYAL: [["T4_ARMOR_PLATE_SET1",1,1],["QUESTITEM_TOKEN_ROYAL_T4",4,1]]. T4_MAIN_SWORD: [["T4_METALBAR",16],["T4_LEATHER",8]].
## (c) Navegador (aba nova só produção)
1 requisição ao catálogo, `GET /data/catalog.json?v=707148ff5c` -> 200, no navegador que já tinha o catálogo anterior em cache (sem Ctrl+F5). Sem Banner.
## (d) Craft (parcial)
- T4_ARMOR_PLATE_ROYAL: base (Armadura de Soldado do Adepto, qtd 1) e Selo Real (qtd 4, bruto) "não retorna"; custo total 127.933.
- T4_2H_ARCANESTAFF_HELL: só o Orbe Oculto (artefato) "não retorna"; tábuas 16,9 e barra 10,2 com RRR aplicado.
- T4_ARTEFACT_2H_COMBATSTAFF_MORGANA: Runa "não retorna · não verificado", 50 un.
- T4_MAIN_SWORD em Lymhurst (bônus), 1 craft: RRR 24,8%; barra de aço 12,0 e couro trabalhado 6,0 (líquidos); custo total 3.364.
## (e) Demais abas
- RRR: PB 18, 15,25% (default). Refino Tábua T4: custo líquido 211, lucro +159/un.; Barra T5: custo líquido 703, lucro +225/un. (preços ao vivo mudaram: antes 209 e 699/+449; Melhor rota e Preço-alvo presentes). Mercado abre. Validação: taxa -400 -> "Taxa -400 é negativa: usando 0", taxa da bancada 0. Flipper "Varrer mercado": 137 oportunidades. Console sem erros. Banner ausente; 1 requisição ao catálogo em toda a sessão. Env vars: nenhuma.
## localStorage de produção
As 6 chaves foram restauradas byte a byte ao estado anterior aos testes (igual); nada extra ficou. Aba fechada.
## Observações
Sem anomalias; sem rollback. Execução retomada após interrupção por limite de uso; merge/push não foram refeitos.
