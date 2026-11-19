# Deploy 14: IDEIA-002 (foco)

**Status final: VERIFICADO**

- SHA do merge/publicado: `59ff149bfd1be06ec671719c29dd3b5dc8395bdc` (merge limpo de feat/IDEIA-002 sobre a master com 070 e 049).
- Deploy: `dpl_DqEkrKmmF8AHpmg8c3gjfzBPNiwT`, READY, production; status do commit success. Gate: docs/qa/IDEIA-002.md APROVADO.
- `npm run check`: lint ok, 26 arquivos, 797 testes, build ok, código 0.

## Entrega
- 200 raiz e catálogo; bundle `index-C_bJ9bGa.js` (antes index-DMd1HYW3.js).
- Catálogo: SHA-1 (10) `c0f66cb0bd` (antes `3e1eabcf6d`), igual ao id no bundle; 682.974 bytes (antes 628.165: +54.809); 1.240 itens com `ef` (ex.: T4_MAIN_SWORD `ef` {1:2251,2:3939,3:6893,4:12064}, foco base `f` 1286); 2.292 itens, 2.166 com `r`, 605 com `alt`, 33 em cityOf.
- Cabeçalho `/data/catalog.json`: `cache-control: public, max-age=0, must-revalidate`.
- Navegador (aba nova só produção): 1 requisição ao catálogo, `?v=c0f66cb0bd` -> 200; sem Banner; console sem erros.

## Funcional
- Craft T4_ARMOR_PLATE_ROYAL: cartão "Foco" avisa "O dump do jogo não traz custo de foco para este item (comum em artefatos, itens Royal e capas de cidade)..." com campo opcional para digitar o foco do jogo.
- Craft T4_MAIN_SWORD, eficiência 250: pontos por craft 1.263,91 (= 1.286 x 0,5^(250/10000), confere), economia de material com foco 1.176 por craft, prata por ponto 0,93, foco do dia esgota em 7 crafts (10.000 de foco), lucro do lote com/sem foco +3.209 / +2.032; confiança "média-alta, ainda não conferida em jogo" exibida.
- Refino: cartão "Foco" presente (ex.: Barra T5: 94 pontos por unidade, lote 94.000, economia 208 por unidade, prata por ponto 2,21, esgota em 106 unidades).
- Estado antigo salvo (craft:cfg e refine:cfg sem campos de foco, sem `_v`): app abre sem erro nem NaN, com o aviso de migração da 070 (1 vez), cartão de foco presente no Craft e no Refino. Mercado, RRR (PB 18/15,25%) e Flipper (135 oportunidades) funcionam.
- localStorage de produção: 6 chaves restauradas byte a byte, sem chave extra; sessionStorage igual. Env vars: nenhuma.

## Observações
Sem anomalias; sem rollback.
