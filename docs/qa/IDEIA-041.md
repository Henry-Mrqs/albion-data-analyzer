# QA IDEIA-041 — Bônus diário no RRR do craft + "vale esperar"

**Veredito: APROVADO** (com observações de produto abaixo)

## Funcional
- `npm run check` na branch: lint limpo, 331 testes, build ok; `npm test` 2x = 331/331.
- Merge de teste da branch com a master atual (inclui 039, 451ae3d): sem conflito; 359 testes passam, lint limpo.
- Escopo: só craftPlan.js(+test), dailyBonus.js(+test), DailyWait.jsx (novo), Crafting.jsx. econ.js, catalog*, market.js, inputRules.js, vercel.json, docs intocados. Testes existentes: só acréscimos.

## Recálculo independente (script próprio, PB = 18 + 15 + 59 + diário; RRR = PB/(100+PB); materiais brutos 16x200 + 8x150 = 4.400)
| Cenário | PB | RRR | Líquido | Branch |
|---|---|---|---|---|
| sem foco, 0 | 33 | 24,8120% | 3.308,27 | igual |
| sem foco, +10 | 43 | 30,0699% | 3.076,92 | igual |
| sem foco, +20 | 53 | 34,6405% | 2.875,82 | igual |
| foco, 0 | 92 | 47,9167% | 2.291,67 | igual |
| foco, +10 | 102 | 50,4950% | 2.178,22 | igual |
| foco, +20 | 112 | 52,8302% | 2.075,47 | igual |

Economias por craft (minhas contas): foco +10 113,449; foco +20 216,195; sem foco +10 231,348; sem foco +20 432,454. Lote de 100 com foco +20: 21.619,50 (o dossiê diz 21.620: é arredondamento de 216,20 x 100; exato é 21.619,50). Branch devolve exatamente esses valores (216,1949..., 21.619,4969...). Sem cidade especializada: 15,25% / 21,88% / 27,54% (0/10/20). Máximo possível 52,8302%.

## Diferencial master x branch (diário 0 = nada muda)
- 3.600 combinações aleatórias (catálogo real; itens e encantamentos variados, cidades, foco, crafts 1/7/100/1000/1e9, rotas buy/all/best, premium, preços fictícios com buracos, prices nulo, RRR manual, refino com diário): `craftDaily` ausente e `craftDaily`=0 idênticos bit a bit à master (inclusive contra a master atual com 039). 0 diferenças.
- 7.200 variantes com diário 10/20: RRR do craft = fórmula; qty = count x crafts x (1-RRR) para materiais retornáveis; taxa de bancada, avisos, `rr` dos materiais refinados, `sub`, `cmp` e unit idênticos à master (o diário do craft NÃO vaza para o refino). 0 problemas.

## Detecção de reset (oráculo escrito por mim: velho se setAt < último reset UTC; 10:00 west/europe, 23:00 east)
Todas as 13 bordas batem (09:59:59 / 10:00:00, 22:59:59 / 23:00:00, virada de ano, setAt == now). Casos extras: setAt ausente/NaN/inválido/null = velho (vale 0 com aviso); servidor desconhecido = nunca velho; setAt no futuro = nunca velho (relógio adiantado); valor 0 nunca avisa; valor 15 velho = "bônus de ontem" e valor 0. Usa UTC (Date.now / Date.UTC).

## "Vale esperar"
Cenários +10/+20 absolutos (substituem). Com +20 escolhido as duas linhas ficam "sem ganho"; economia nunca negativa (floor 0). crafts 1e9 finito; sem receita, prices nulo ou material sem preço = cartão some (null). RRR manual vence o diário: todas as linhas "sem ganho". `worthWaiting` (extra fora do plano): gain && economia do lote > custo de esperar do usuário (padrão 0). Tem teste. O limiar 0,5 prata de `gain` é arbitrário. Observação de produto: com custo 0, qualquer economia vira "vale esperar".

## Coerência 060/038
craftDaily 15, -10, 30, NaN, 10.5, 'abc' = 1 aviso `daily-invalid` e RRR com 0; '10' vale 10; null/''/undefined sem aviso. Sem aviso duplicado. Categoria da cidade de bônus vem de `craftBonusCity` (038), sem tabela escrita à mão. O app não decide categoria: o usuário informa o bônus do item. A tela diz "Informe o bônus do dia da categoria deste item", mas NÃO avisa que a lista de categorias do pool (D8/D4) não foi confirmada em fonte oficial: observação.

## Mutações (cópia descartável; suíte completa)
Mortas (15): diário não somado, somado 2x, diário no refino, cenário somando, reset west 11:00, europe 11:00, Ásia 10:00, economia com sinal trocado, worthWaiting sempre true, validação 15 desligada, `<=` do lastReset, gain sempre true, floor 0 removido, valor 0 avisando.
**Sobrevivente**: `setAt >= reset` trocado por `>` (borda exata setAt == instante do reset, 1 ms); impacto desprezível. Mutação de UI (Crafting.jsx sem effectiveDaily) não aplicável; coberta na UI manual.

## Casos-limite
Cidade sem bônus: diário soma mesmo assim (18+diário; consistente com o dossiê D1). Item sem categoria: bonusCity nulo, sem especialização. Foco+20 = 52,8302% (teto). Sem receita/prices nulo: sem erro.

## Observações
- `now` do Crafting.jsx é capturado uma vez (useState(Date.now)): com a aba aberta durante o reset, o aviso só aparece ao recarregar.
- `setAt` futuro nunca expira.
- Texto "vale esperar" não afirma nada como certo sobre categorias; D2-D5 do dossiê são confiança MÉDIA.

## UI (vite 5210, aba nova, URL conferida)
+20 sem foco: RRR 34,6% e linhas "sem ganho". Com `craftDailyAt` de 2 dias atrás: RRR 24,8%, aviso "Bônus de ontem?", cartão mostra 4.200/craft (+10) e 7.851 (+20). Valor 15: aviso único "Bônus diário 15 inválido", RRR 47,9% (foco). Foco+20: RRR 52,8% no cabeçalho e no campo. Console sem erros/avisos. Servidor parado. Não conferi a aba Refino/RRR visualmente (código não mudou nelas).
