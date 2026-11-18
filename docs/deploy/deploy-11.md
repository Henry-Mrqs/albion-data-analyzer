# Deploy 11: IDEIA-010 (liquidez pelo histórico)

**Status final: VERIFICADO**
- SHA: `666f6fe861a1c8b7b8c15ab9919bd19292622581` (feat/IDEIA-010, merge limpo; 049 e 070 não incluídas). Gate: docs/qa/IDEIA-010.md APROVADO (com re-teste).
- check: 19 arquivos, 498 testes, build ok, código 0.
- Deploy: `dpl_GuDU7ekLzYwr8PWiqdEbU5VAsnVM`, READY, production. Bundle index-DgUs5en5.js (antes index-C3BDXpkf.js); catálogo SHA-1 `707148ff5c` (inalterado); 1 requisição ao catálogo `?v=707148ff5c` -> 200; sem Banner.
## Giro (parcial, 5 requisições de histórico reais no total)
- Carga inicial no Craft (item salvo T4_ARMOR_PLATE_ROYAL): 1 req (`locations=Martlock,Thetford,Fort Sterling,...`); Mercado Negro "sem histórico".
- T6_MAIN_SWORD: +1 req; Mercado Negro "31,4/dia, 3 de 7 dias com dados", mediana 53.277, 0,3 dias para vender o lote; Thetford e Fort Sterling "sem venda registrada (último 28/10 e 22/10), 0 de 7 dias com dados"; cartão "Giro do item" presente. Reabrir (Refino e voltar ao Craft): 0 req novas.
- T8_MAIN_SWORD@4 (trocar tier para 8 pediu T8 .0, depois .4: +2 req): "sem histórico"; nenhum "sem giro"; sem "Carregando" preso.
- Flipper: "Varrer mercado" 134 oportunidades, 0 req de histórico; "Carregar giro das 30 primeiras": +1 req com 30 ids (`locations=Caerleon,Black Market`); 2º clique: 0 req; linhas: 1 com giro, 26 "sem histórico", 4 "sem venda"; trocar a cidade de venda para Martlock (nunca pedida): 14 de 14 linhas "—", nenhuma "sem histórico", 0 req.
## (d) O que já existia (histórico bloqueado no cliente a partir daqui, para respeitar o teto de 6 requisições reais; 3 chamadas bloqueadas)
- T6_MAIN_SWORD .0, 100 crafts: taxa 400 -> 69.120; taxa 100 -> 17.280; -400 -> "negativa: usando 0", 0. (Com .4 a taxa dá 16x: 1.105.920/276.480, esperado pelo encantamento.)
- T4_MAIN_SWORD em Lymhurst: RRR 24,8 / 30,1 / 34,6% com diário +0/+10/+20; cartão "Vale esperar" e nota de confiança presentes; coluna "Comprador" presente; o selo "ilusória" não apareceu nesta leitura (os preços ao vivo mudaram: depende de haver ou não ordem de compra visível; o selo apareceu nos deploys anteriores e na legenda do Craft).
- T4_BAG: Brecilien (bônus). T4_ARMOR_PLATE_ROYAL: "Sem cidade de bônus conhecida", 2 "não retorna". RRR (aba): abre, PB 18 / 15,25% (estado salvo). Refino Tábua T4: custo líquido 224, Melhor rota e Preço-alvo. Mercado abre. 1 requisição ao catálogo na sessão. Console sem erros.
## (e) A API de histórico não devolveu 429 nem falhou; telas nunca ficaram em "Carregando".
## Total de requisições de histórico reais: 5 (<= 6). Env vars: nenhuma.
## localStorage de produção
As 6 chaves restauradas byte a byte; nenhuma chave extra (nem do Flipper) restou; sessionStorage igual. Aba fechada.
## Observações
Sem anomalias; sem rollback. A QA tinha avisado de conflito em Crafting.jsx com a 041; o merge saiu limpo (a branch já continha a 041).
