# Deploy 8: IDEIA-060 (validação das entradas pelas faixas do jogo)

**Status final: VERIFICADO**

- URL: https://albion-data-iota.vercel.app
- SHA do merge/publicado: `d93c7aef1777fd6d0d47d886ee6b3a25f1e8d4cd` (feat/IDEIA-060, sem conflito)
- Deploy: `dpl_CSSwsDEq7G5iHsFJiQgjS9dfWsYG`, READY, production.
- Gate: docs/qa/IDEIA-060.md APROVADO (re-teste). O arquivo estava modificado na árvore (adendo do Tester) e não foi tocado.
- `npm run check`: lint ok, 13 arquivos, 300 testes passando, build ok, código 0.

## Verificação
- (a) HTTP 200 raiz e catálogo; SHA-1 do catálogo `f5f5034bc5` (inalterado); bundle `index-CvTjyY4G.js` (deploy 7: index-BOZekMDc.js).
- (b) Craft (aba nova só de produção):
  - crafts vazio -> "Campo vazio: usando 1"; 0 e -5 -> "Quantidade ... é inválida: usando 1"; 2,5 -> "não é inteira: usando 2" (taxa de bancada dobra de 29 para 58); 1.000.000.001 -> "acima do limite de 1.000.000.000: usando 1.000.000.000".
  - taxa -400 -> "negativa: usando 0" (taxa da bancada 0); vazia -> "usando o padrão 400 (padrão do app, não do jogo)"; 2000 -> "acima do teto de 1.000: usando 1.000" (7.200 com 100 crafts, no lugar de 14.400). Botão "Aceitar 2.000 como novo teto" -> 14.400 e aviso permanente "Teto de taxa aceito: 2.000. Restaurar 1.000". O clique em "Restaurar 1.000" voltou ao teto de 1.000 e ao aviso "acima do teto" (campo manteve 2000).
  - RRR manual 150 -> "impossível (fora de 0 a 100%): usando o RRR automático" (15,3%); 60 -> "acima do máximo conhecido de 52,83% (craft): usando 52,83%" (RRR 52,8%); vazio -> sem aviso. Selo "1 valor corrigido" coerente.
- (c) RRR: N=1e308 -> "acima do limite: usando 1.000.000.000" e tabela com 4.000.000.000,00 (sem NaN/infinito); vazio, 0 e -5 -> usando 1; 2,7 -> "não é inteira: usando 2" (8,00 no lugar de 4,00 por 1). Notação científica (ex.: "1,73e15") não foi exercitada: os números testados ficaram abaixo do limiar.
- (d) Preço-alvo: relistagens -3 -> "inválidas: usando 0"; 99 -> "acima do máximo de 37 (o líquido zeraria): usando 37".
- (e) T6_MAIN_SWORD, 100 crafts: taxa 400 -> "Taxa da bancada" 69.120; taxa 100 -> 17.280; separador de milhar mantido.
- (f) T4_BAG: Brecilien (bônus); T4_MAIN_SWORD: Lymhurst (bônus), coluna "Comprador" e "ilusória" presentes; 1 requisição ao catálogo, `?v=f5f5034bc5`; sem Banner. Refino (Melhor rota, Preço-alvo, custo líquido 699 para Barra T5, "Taxa do lote ... 1.000 un." 14.400 para Barra T5 com taxa 400 do Refino), Mercado e Flipper (75 oportunidades) funcionam. Console sem erros. Env vars: nenhuma.

## localStorage de produção (restaurado)
Chaves antes: albion:target:cfg, albion:craft:item, albion:refine:cfg, albion:rrr:cfg, albion:craft:cfg, albion:market:item. Todas restauradas aos valores originais (comparação byte a byte: igual). A chave nova `albion:settings` ({"server":"west","premium":true,"feeCeiling":1000}), criada pelo novo código durante os testes, foi removida; não existia antes.

## Observações
Sem anomalias. O botão "Restaurar 1.000" manteve o texto 2000 no campo (valor digitado) mas voltou a usar 1.000, como esperado pelo aviso.
