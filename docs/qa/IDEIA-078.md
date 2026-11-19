# QA IDEIA-078 — eliminar teste instável (marketRequest.test.js / blockedUntil)

Branch feat/IDEIA-078 (a8b2c1f) sobre master 838e953. Tester independente, checkouts próprios (npm ci ok).

## 1. Diff
- Só 2 arquivos: `client/src/lib/market.js` (+5 linhas: `export function resetThrottleForTests(){ blockedUntil = 0 }` com comentário) e `marketRequest.test.js` (import de beforeEach/resetThrottleForTests; `beforeEach(resetThrottleForTests)`; afterEach agora também chama o reset). Nenhuma asserção alterada; nenhuma linha de produção removida/alterada.
- grep em src: `resetThrottleForTests` só em market.js (definição) e marketRequest.test.js. Nenhuma chamada em código de produção.
- `npm run check` 2x: lint + 1038/1038 testes (45 arquivos) + build, exit 0 nas duas.

## 2. Reprodução
- master, logic em shuffle, seeds 1–12: 7/12 falham (1, 3, 8, 9, 10, 11, 12; 3–5 testes cada, todos em marketRequest.test.js) — bate com o esperado.
- branch, MESMAS seeds 1–12 + 101–140: 52/52 execuções completas da suíte logic, 0 falhas.
- ui em shuffle, seeds 1–6: 6/6 ok (148 testes).
- suíte completa normal 3x: 1038/1038 todas.

## 3. Produção intocada
Build de produção master × branch: sha256 de todos os 14 arquivos de dist/ idênticos (inclusive index-Tkuarln4.js). A função exportada não usada sofreu tree-shaking. Risco: nenhum.

## 4. Differential comportamental / mutação
- Teste próprio descartável (removido; não faz parte da branch): com fake timers, 429 -> 1ª chamada lança "Limite de requisições", 2ª lança "pediu uma pausa" sem novo fetch (fetch chamado 1x); em +59 s ainda bloqueia; em +60,001 s libera e resolve. Idem 503. `resetThrottleForTests()` retorna undefined e só limpa a pausa (após reset o fetch volta a ser chamado). 2/2 passam.
- Mutação (corpo de resetThrottleForTests trocado por no-op): seeds 1, 3, 8, 9, 12 voltam a falhar com as mesmas contagens da master (4, 4, 4, 3, 5). Conserto é causal.

## 5. Outras fontes de instabilidade
Suíte COMPLETA (logic+ui) em shuffle, 24 seeds (201–224), na branch: 24/24 com 1038/1038, 0 falhas. Somando com os 52 logic e 6 ui, nenhum outro teste instável observado. (Não auditei em código Date.now/timers/localStorage; só evidência empírica.)

## 6. Erros de dados
Nenhum; confirmado (mudança não toca dados/catálogo; dist/data/catalog.json idêntico).

## Veredito: APROVADO
