# Notas do lote 1 (release/batch-1)

## IDEIA-089 — PULADA (teste existente conflita com a regra do plano)
O teste existente `liquidity.test.js > "o dia de hoje (parcial) fica fora"` usa `flat(21, 3, 23)` (3 pontos, de 23 a 25/10, `now`=26/10) e espera `volumePerDay` = 3 (21/7). Pela regra do plano (divisor = dias que a série cobre, do 1º registro até o fim da janela) o divisor passa a 3 e o volume a 7. É o mesmo caso "item novo" que o plano manda mudar (3 dias, 100/dia: 42,9 -> 100), então o teste antigo codifica exatamente o comportamento que a 089 corrige, e o plano afirma ("nenhum existente muda") que nenhum teste antigo quebra, o que é falso para este.
Implementação e 8 testes novos prontos e verdes (exceto esse): `docs/qa/IDEIA-089.pending.patch` (`git apply`). Falta só autorizar a atualização do teste antigo (esperado 7, ou aumentar a série para cobrir a janela) e a Task 2 (dica no `GiroCard`).
