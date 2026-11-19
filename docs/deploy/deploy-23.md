# Deploy 23: IDEIA-054 (aba Premium "Vale pagar Premium?" + abas só ícone abaixo de 960px)

**Status final: VERIFICADO (sem rollback)**

- SHA do merge/publicado: `df0f754fdee7ad70371c325138b6380afac436f3` (merge --no-ff limpo de feat/IDEIA-054 sobre a master com 075; 005 não incluída).
- Deploy: `dpl_Bd4BnVuLzmijf739bzGPgcGkajLy`, READY, production. Gate: docs/qa/IDEIA-054.md APROVADO (re-QA após retrabalho 1).
- `npm run check`: código 0; 62 arquivos, 1220 testes (a branch tinha 1187; o resto vem da master). Suíte com `--sequence.shuffle` seeds 4, 55, 666: 3x 1220/1220, 0 falhas.
- Bundle novo `index-DI_AfIR8.js` (antes `index-DNZRXKaJ.js`); catálogo `c0f66cb0bd` inalterado, 1 requisição `?v=`; console sem erros nem avisos.
- Abas (emulação de viewport): a 1000px as 6 abas (Mercado, Refino, Craft, Flipper, RRR, Premium) aparecem com rótulos (largura 75-105px) e sem rolagem horizontal; a 375px ficam só ícone (44x32px, todas dentro da tela, aria-label presente em todas), página com scrollWidth 375, todas clicáveis e cada uma abre sua tela. `#premium` aberto direto mostra a aba Premium ativa.
- Aba Premium: botão "Usar o preço atual (9.644 · 1 h)" aparece com a API real; o campo do ouro só é preenchido ao clique (antes vazio, "Informe o preço do ouro para calcular"). Editar volume (30.000.000), prata por foco (5) e custo (3.000) recalcula (imposto economizado 1.200.000, valor do foco 1.500.000, custo 36.165.000 -> 28.932.000, equilíbrio 685.800.000) e persiste em `albion:premium:cfg`. Rodapé com "Fonte secundária (AO Refinery), não verificada no wiki oficial ..."; texto "o app não recomenda a compra"; sem recomendação de compra.
- `albion:premium:cfg` = `null`: aba abre normalmente, sem tela branca. Estado antigo (craft:cfg sem extras/noTax e refine:cfg mínimo): as 6 abas abrem sem erro/NaN/Infinity/[object. As outras 5 abas intactas.
- localStorage de produção: vazio no início e restaurado vazio. Env vars: nenhuma.

## Observações
Sem anomalias; sem rollback. A janela do navegador de teste não deixou redimensionar; usei emulação de viewport (1000 e 375px) e a restaurei para 1366.
