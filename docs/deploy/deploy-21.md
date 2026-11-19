# Deploy 21: IDEIA-031 (teste de estresse)

**Status final: VERIFICADO (sem rollback)**

- SHA do merge/publicado: `f08b13b9918a7a4001c56e4fb62384c9131dc4fd` (merge --no-ff limpo de feat/IDEIA-031 sobre a master com 076 e 078; sem conflito em Crafting.jsx/Refining.jsx).
- Deploy: `dpl_4biEguqJXHjzGi4EXE3sM5XHD6r1`, READY, production. Gate: docs/qa/IDEIA-031.md APROVADO (re-QA após retrabalho 1).
- `npm run check`: código 0; 52 arquivos, 1125 testes. Suíte com `--sequence.shuffle` seeds 5, 66, 777: 3x 1125/1125, 0 falhas.
- Bundle novo `index-BMIlwWvE.js` (antes `index-CBQksK6R.js`); catálogo `c0f66cb0bd` inalterado, 1 requisição `?v=`; console sem erros nem avisos; 5 abas abrem sem NaN/Infinity/erro.
- Craft T4_MAIN_SWORD: cartão "Teste de estresse" entre "Onde vender" e "Giro do item"; grade 9x9 (cabeçalho -20%..+20% nos dois eixos); centro 1.556 = lucro por unidade do resultado (+1.556); texto "Saída de venda variada: Mercado Negro, Ordem de compra. ... inclusive artefatos."; resumo "Aguenta queda de 32,6% no preço ... alta de 54,1% nos materiais".
- 500px (mínimo do navegador): a grade rola dentro do próprio contêiner (overflow-x auto, rolada para a coluna do centro); coluna 0% totalmente visível; scrollWidth da página 485 < 500, sem rolagem horizontal da página.
- "Sem imposto" marcado: texto vira "Saída de venda variada: Mercado Negro, Ordem de compra, sem imposto"; centro 1.755 = lucro do resultado (+1.755).
- Refino Barra de Aço Titânio T5.0: cartão presente, 9x9; centro 337 = "Lucro/un." da melhor combinação (+337); saída "Caerleon, Ordem de venda".
- Estado antigo (craft:cfg sem extras/noTax e refine:cfg mínimo): Craft e Refino abrem, sem erro/NaN/Infinity/[object, cartão presente.
- localStorage de produção: vazio no início e restaurado vazio. Env vars: nenhuma.

## Observações
Sem anomalias; sem rollback.
