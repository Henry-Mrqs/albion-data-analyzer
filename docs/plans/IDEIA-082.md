# IDEIA-082 — Acabamento do Preço-alvo com "Sem imposto" (075): 3 mutantes, aviso do modo escolhido, rótulo do Mercado Negro: plano compacto

> **Para o Executor:** `superpowers:executing-plans`. Branch de integração (D-070); `npm` em `client/`. Teste visto falhar antes (ou, nos mutantes, **visto morrer**); nenhum `*.test.jsx` com `usePersisted('chave'` literal (use `seed()`). Origem: `docs/qa/IDEIA-075.md` D1–D3 (D-061). **Vai antes da 083** (as duas mexem no cartão `TargetPrice.jsx`) e depois da 088 (rótulo do Mercado Negro).

**Arquivos.** Altera: `client/src/components/TargetPrice.jsx` (aviso e rótulo), `client/src/components/TargetPrice.noTax.test.jsx`, `Crafting.targetNoTax.test.jsx`, `Refining.targetNoTax.test.jsx`. Cria: `client/src/lib/exitLabel.js` + `exitLabel.test.js` (puro). **Conflitos:** `TargetPrice.jsx` com **083** (`onLive`) e 059 (unificar o Preço-alvo com o ciclo da ordem): **082 → 083 → 059**; `Crafting.jsx`/`Refining.jsx` não são tocados.

## Interfaces
```js
// exitLabel.js (puro)
exitLabel(city, mode) -> string
//   ('Caerleon','order') → 'ordem de venda'; ('Caerleon','instant') → 'ordem de compra'
//   ('Black Market', qualquer modo) → 'ordem de compra do Mercado Negro' (o Mercado Negro só tem ordens de compra: nunca "ordem de venda")
```

## Task 1: aviso do modo escolhido e rótulo do Mercado Negro (D2, D3)
- [ ] **Step 1: testes falhando.** `exitLabel.test.js`: os 3 casos acima + `('Black Market','order')` → "ordem de compra do Mercado Negro" (D3: o Refino com venda no Mercado Negro dizia "Mercado Negro, ordem de venda"). `TargetPrice.noTax.test.jsx` (project `ui`; `resetApp`; `seed('target:cfg', …)`; custo **3.524,27**, lucro-alvo 1.000, premium; números recalculados com `node -e`: ordem de venda sem relistagens **4.839**, com imposto na compra instantânea **4.713**, ordem de venda sem imposto **4.525**):
  1. **D2** modo `instant`, marca só na saída de **ordem de venda** (`noTax = { order: { on:true, city:'Caerleon' }, instant: { on:false, city:'Caerleon' } }`): o cartão mostra o alvo **4.713** e o aviso "A saída marcada como 'sem imposto' (Caerleon, ordem de venda) é de outro modo: este alvo, em ordem de compra (Caerleon), conta imposto." (antes: nenhum aviso, o 4.713 aparecia sem dizer que há outra saída marcada);
  2. modo `order` com a marca na saída de ordem de venda: alvo **4.525** e o aviso atual (agora com `exitLabel`);
  3. sem nenhuma marca: **nenhum** aviso (sem ruído);
  4. cidade `Black Market` marcada: o texto diz "ordem de compra do Mercado Negro" e **nunca** contém "ordem de venda" para essa cidade.
- [ ] **Step 2:** `npx vitest run src/lib/exitLabel.test.js; npx vitest run --project ui src/components/TargetPrice.noTax.test.jsx` → FAIL. **Step 3:** implementar `exitLabel` e usá-lo no aviso; novo aviso `data-testid="target-notax-other-mode"` quando `noTax[outroModo]?.on === true && !off`. **Step 4:** PASS; `npm run test:ui`. **Step 5: Commit** `fix: Preço-alvo avisa quando a marca Sem imposto é de outro modo; Mercado Negro só tem ordem de compra (IDEIA-082)`.
- Mutações: aviso do outro modo sempre ligado; `exitLabel` sem o caso do Mercado Negro; o aviso lendo o modo cru em vez do corrigido.

## Task 2: testes dos mutantes M19, M23, M30 (D1)
- [ ] **Step 1: testes** (passam hoje; prova por mutação): (M19) `seed('target:cfg', { mode: 'FOO', relists: 2, … })` + marca na saída de **ordem de venda**: o cartão usa o modo **corrigido** (`order`) e aplica a marca (alvo **4.525**); com o modo cru (`noTax['FOO']`) a marca seria ignorada; (M23) com `relists: 2` e marca ligada o líquido exibido é **4.525,00** (sem subtrair relistagens: com a marca, relistagens não contam) e o lucro 1.000,73... **calcular com `node -e` e escrever o literal**: líquido 4.525 − custo 3.524,27 = **1.000,73**; sem a marca (relistagens 2, k = 0,885) o alvo é **5.113** e o líquido 5.113 × 0,885 = 4.525,005 (arredondamento de ponto flutuante na casa de 0,005: **não** fixar o texto dessa célula; comparar o número com `toBeCloseTo(4525.005, 3)`); (M30) **no Craft** (`Crafting.targetNoTax.test.jsx`), com outra cidade marcada (Mercado Negro em vez de Caerleon) e com o modo instantâneo marcado: o `noTax` repassado ao cartão corresponde à melhor saída **de cada modo** (cidade certa no aviso). **Step 2–4:** passam; aplicar M19, M23, M30 numa cópia e ver os testes **falharem**. **Step 5: Commit** `test: mutantes M19/M23/M30 do Preço-alvo sem imposto (IDEIA-082)`.

## Auditor (005, contrato `registerScreen`)
Nenhum campo salvo novo. A linha `target-notax` do auditor (hoje `info-only`; vira `applied` na **083**) usa o mesmo `exitLabel` para o texto "aplicada: <rótulo> (cidade)"; **a 083 importa `exitLabel`** (não duplicar o mapa de rótulos). Variável não modelada nova: nenhuma.

## Como o Tester valida
Os números 4.839 / 4.713 / 4.525 / 5.113 / 1.000,73 recalculados à mão (÷ 0,935; ÷ 0,96; ÷ 1; ÷ 0,885); os 4 casos de aviso; Mercado Negro nunca "ordem de venda"; mutações M19/M23/M30 mortas; diferencial: o alvo (número) não muda em 300 combinações (só texto).

## PERGUNTAS PARA O GERENTE
1. Nenhuma pergunta essencial.
