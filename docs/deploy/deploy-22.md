# Deploy 22: IDEIA-075 (Preço-alvo respeita "Sem imposto")

**Status final: VERIFICADO (sem rollback)**

- SHA do merge: `a5fe2afe` (`a5fe2af`, merge --no-ff limpo de feat/IDEIA-075; 005 e 054 não incluídas). Logo depois o coordenador empurrou `cb3dd57` (docs) por cima; a Vercel não criou deployment separado para o merge, e o deployment em produção é o do commit `cb3dd57cc9c1b9f620b1a32aa3fe97afc525a39d`, que contém o merge (client/ idêntico).
- Deploy: `dpl_G5P6oRP58Q8mHU6oyhBVM17CSP21`, READY, production. Gate: docs/qa/IDEIA-075.md APROVADO.
- `npm run check`: código 0; 55 arquivos, 1158 testes. Suíte com `--sequence.shuffle` seeds 9, 88, 999: 3x 1158/1158, 0 falhas.
- Bundle novo `index-DNZRXKaJ.js` (antes `index-BMIlwWvE.js`); catálogo `c0f66cb0bd` inalterado, 1 requisição `?v=`; console sem erros nem avisos; 5 abas abrem sem NaN/Infinity/erro.
- Craft T4_MAIN_SWORD (preços do momento, custo 3.879, lucro alvo 1.000): em "Ordem de venda" o Preço-alvo é 5.218 e o interruptor "Sem imposto" do Mercado Negro/ordem de compra não o altera (a saída marcada não é a usada: correto). Em "Ordem de compra (na hora)": 5.082 -> marcar "Sem imposto" -> 4.879 (líquido 4.879,00 = preço, lucro 1.000,34), com aviso "Venda sem imposto marcada (Mercado Negro, ordem de compra): o preço-alvo não desconta imposto nem taxa de criação (relistagens não contam)"; desmarcar volta a 5.082.
- Refino Barra de Aço Titânio T5.0: "Venda sem imposto" muda o Preço-alvo 1.831 -> 1.757 (aviso cita Lymhurst, ordem de compra); desmarcar volta a 1.831.
- Estado antigo (craft:cfg sem extras/noTax e refine:cfg mínimo): Craft e Refino abrem sem erro/NaN/Infinity, com Preço-alvo.
- localStorage de produção: vazio no início e restaurado vazio. Env vars: nenhuma.

## Observações
Sem anomalias; sem rollback.
