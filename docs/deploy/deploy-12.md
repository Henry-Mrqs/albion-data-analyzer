# Deploy 12: IDEIA-049 (receitas alternativas: artefato, ficha de favor e Royal)

**Status final: VERIFICADO**

- Tentativa 1: conflito em Crafting.jsx (hunk de imports), merge abortado. Tentativa 2 (após o merge 481cbd9 do Executor na branch): merge limpo.
- SHA do merge/publicado: `1839f103a15b053fa02450d0f718d7de62178a23` (feat/IDEIA-049; 070 não incluída).
- Deploy: `dpl_ERdBi7e4BVNMsJPuZ8RvBBLMAngK`, READY, production. Gate: docs/qa/IDEIA-049.md APROVADO (com re-teste da mesclagem).
- `npm run check`: lint ok, 20 arquivos, 568 testes, build ok, código 0. Crafting.jsx resultante contém as três ideias: DAILY_NOTE/waitSavings (041), GiroCard/GiroCell/useHistory (010) e RecipePicker (049), mais validateInputs (060) e illusoryHint (066).

## (a) HTTP e versionamento
200 raiz e catálogo. Bundle `index-m72LB_k8.js` (antes index-DgUs5en5.js). SHA-1 (10) do catálogo servido `3e1eabcf6d` (antes `707148ff5c`), igual ao `id:\`3e1eabcf6d\`` no bundle.
## (b) Catálogo servido
2.292 itens, 2.166 com `r`, 605 com `alt`, 25 com `tm`, 1.286 com `cc`, 33 em cityOf, `vals` 1.319 chaves, 628.165 bytes. T4_MAIN_SWORD sem `alt`, r = [[METALBAR,16],[LEATHER,8]]; T4_ARMOR_PLATE_ROYAL com `alt` ({at:0, v:[SET2,SET3]}).
## (c) Navegador (aba nova só produção)
1 requisição ao catálogo, `GET /data/catalog.json?v=3e1eabcf6d` -> 200, no navegador que tinha o catálogo anterior em cache (sem Ctrl+F5). Sem Banner; console sem erros.
## (d) Craft
- T4_ARMOR_PLATE_ROYAL: seletor "Automático / Base 1 / Base 2 / Base 3"; Base 1 "sem preço" (nunca a mais barata); Base 2 total 131.380; Base 3 total 130.319 "mais barata agora".
- T4_2H_ARCANESTAFF_HELL: seletor "Automático / Artefato / Ficha de favor"; Artefato material 12.809 + taxa 403 = 13.212 (mais barata); Ficha 21.333 + 634 = 21.967. Taxa de bancada em coluna própria; nota "valor do dump... ainda não verificado em jogo".
- T4_HEAD_CLOTH_KEEPER: aviso "A escolha depende da taxa de bancada (valor do artefato na taxa NÃO verificado)" (Ficha tem material menor, 1.785 x 1.790, mas total maior, 2.131 x 1.862). Escolher "Ficha de favor" trocou o total de 1.862 para 2.131 e gravou `recipeVariant:"1"`.
- Bônus diário +10 e Ficha escolhida (injetados): RRR 21,9%; total do seletor da Ficha 2.038 e a linha "+10%" do cartão "vale esperar" também 2.038 (mesma receita).
- Variante inválida 1,5 salva: abre na receita 0 (Artefato, total 1.862), sem erro.
- T4_MAIN_SWORD: sem seletor; barra 12,0, couro 6,0, taxa 173, custo total 3.251; RRR 24,8 / 30,1 / 34,6% com +0/+10/+20; nota da 041, cartão "vale esperar", giro, coluna "Comprador" e selo "ilusória" presentes. T4_BAG: Brecilien (bônus). Royal sem bônus. 
- Giro: no máximo 2 requisições reais de histórico (1 por carga de página; o restante bloqueado no cliente para respeitar o teto).
## (e) O que já existia
T6_MAIN_SWORD .0 100 crafts: taxa 400 -> 69.120; taxa 100 -> 17.280; -400 -> "negativa: usando 0", 0. RRR aba PB 18/15,25% (estado salvo). Refino Tábua T4: custo líquido 224, Melhor rota e Preço-alvo. Mercado abre. Flipper "Varrer mercado": 134 oportunidades, 0 requisições de histórico. 375 px: sem rolagem horizontal da página (scrollWidth 375); a tabela do seletor de receita tem 365 px e rola dentro do próprio contêiner (overflow auto). Console sem erros. Env vars: nenhuma.
## localStorage de produção
As 6 chaves restauradas byte a byte (sem recipeVariant/craftDaily residuais, sem chave extra); sessionStorage igual. Aba fechada, viewport redefinido.
## Observações
Sem anomalias; sem rollback.
