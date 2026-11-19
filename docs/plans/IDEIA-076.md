# IDEIA-076 — Acabamento das despesas extras (048, D2 a D5): plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-076`. Comandos `npm` em `client/`. **Pré-requisitos (já na `master`):** IDEIA-048 (`extras.js`, `ExtrasCard.jsx`, `validateExtras`, marcas `noTax`), 058 (`cityCompare.js`, `CityCompare.jsx`), 060, 069 (`src/test/ui.js`). **Regra do briefing:** cada teste é escrito, **executado e visto falhar** antes de implementar. **Nenhum `*.test.jsx` pode conter `usePersisted('chave'` literal** (`persistSchemas.test.js` varre `src/components/*.jsx`): usar `seed('craft:cfg', …)`. **Nenhuma fórmula nova:** só texto, layout, um campo já calculado (`computeCraft().extras`) repassado e testes. **Nenhum campo persistido novo** (nada em `persistSchemas.js`).

**Origem:** laudo `docs/qa/IDEIA-048.md` (D2 a D5) e D-053. Prioridade alta por D2: o campo que muda o cálculo (escopo "por craft"/"por lote", erro de até N× no custo) fica ilegível no celular.

## O que cada defeito é, medido
- **D2:** a 375 px o `<select>` de escopo tem 62 px de largura (28 px são o padding da seta) e mostra só "por". A linha é uma grade `2fr 1fr 1fr auto` em `ExtrasCard.jsx` (estilo inline).
- **D3 (estendido a todos os campos por D-056):** `validateExtras` e as demais validações da 060 ecoam o valor cru nas mensagens via `shown`/`br`: `'-Infinity'` gera "valor -Infinity é negativo"; `{}` gera "valor [object Object] não é um número"; `true` gera "valor true…". Só com `localStorage` editado à mão, mas é lixo na tela.
- **D4:** em "Comparar cidades de craft" o "Custo total" inclui despesas sem coluna nem nota (exemplo do laudo: 4.511 de material + 432 de taxa ≠ 5.363, faltam 420 de despesas: 120 × 3 crafts + 60 por lote). A marca "Sem imposto" fica em `craft:cfg.noTax`, um mapa **global** `'Cidade|modo'` (vale para todos os itens), e o quadro "Melhor destino" não diz que a melhor saída está sem imposto.
- **D5:** 7 mutantes sobreviventes (tabela abaixo).

## Os 7 mutantes sobreviventes (D5) e o teste que cada um ganha
| # | Mutante | Teste que o derruba (Task) |
|---|---|---|
| 13 | `o.margin` do Craft sem as despesas (`matCost + fee`) | 6a: margem 12,07% com 230 de despesas (o mutante daria 12,86%) |
| 26 | regex de `cleanNoTax` aceitando `Cidade\|none` | 6b: `cleanNoTax({ 'Caerleon\|none': true, … })` descarta |
| 37 | total do plano de compra sem `+ extras` (`Crafting.jsx`) | 6c: linha "Total" do plano = 3.754 (o mutante mostraria 3.524) |
| 38 | `ExtrasCard crafts={1}` no Craft | 6d: lote de 10 crafts: "(1.580 no lote de 10)" (o mutante: "no lote de 1") |
| 40 | `TargetPrice cost` do Refino sem as despesas | 6e: alvo 1.146 (o mutante: 1.136) |
| 41 | tabela "Comparar rotas" do Refino sem `- perUnitExtras` | 6f: lucro/un. da melhor rota +63 (o mutante: +73) |
| 46 | `<select>` de escopo do `ExtrasCard` sempre mostrando 'craft' | 4: valor exibido do select = `lote` para linha "por lote" |

## Arquivos
**Alterados:** `client/src/lib/inputRules.js` (mensagens de `validateExtras`), `client/src/lib/cityCompare.js` (campo `extras` na linha), `client/src/components/CityCompare.jsx` (coluna e notas), `client/src/components/ExtrasCard.jsx` (classes de layout), `client/src/index.css` (regras `.extra-row`), `client/src/components/Crafting.jsx` (indicação "sem imposto" no "Melhor destino"; nota da marca global; passa nada novo ao `CityCompare`), e os testes existentes da 048 onde o mutante vive: `inputRules.extras.test.js`, `craftPlan.extras.test.js`, `cityCompare.test.js`, `ExtrasCard.test.jsx`, `Crafting.extras.test.jsx`, `Refining.extras.test.jsx`.
**Criados:** `client/src/components/CityCompare.extras.test.jsx`, `client/src/components/ExtrasCard.layout.test.js` (project `logic`, lê `index.css`), `client/src/components/Crafting.noTaxBox.test.jsx`.
**NÃO toca:** `econ.js`, `craftPlan.js`, `refinePlan.js`, `extras.js`, `exits.js`, `targetPrice.js`/`TargetPrice.jsx` (IDEIA-075), `persistSchemas.js`, `catalog*`, `vite.config.js`.
**Compartilhados com a 075:** `Crafting.jsx` e `Refining.jsx` (linhas diferentes: lá só a linha do `<TargetPrice>`). **Ordem:** livre; a Task 6e/6f usa `TargetPrice` como está hoje (alvo 1.146 é o valor **sem** `noTax`, e a 075 não o muda quando o interruptor está desligado).

## Interfaces
```js
// inputRules.js (interno; não exportado)
echo(raw, suffix = ''): string   // '' ou ' ' + eco + suffix. string => `"texto"` (como hoje); número finito => br(raw); resto (objeto, array, booleano, NaN, ±Infinity, função, undefined) => ''
// mensagens (códigos e campos NÃO mudam; número finito e texto digitado idênticos aos de hoje). Despesa:
//   sem eco: 'Despesa 1: o valor não é um número: usando 0.' | 'Despesa 1: o valor é negativo: usando 0.'   (n = -Infinity)
//   com eco: 'Despesa 1: valor "abc" não é um número: usando 0.' | 'Despesa 1: valor -50 é negativo: usando 0.'
// cityCompare.js: cada linha de rows ganha  extras: number   (= computeCraft(...).extras; igual em todas as cidades; 0 sem despesas)
// CityCompare.jsx: coluna "Despesas" só quando rows.some(r => r.extras > 0)
```

## Tasks (1 commit cada; teste primeiro e visto falhar)

### Task 1 (D3, estendido por D-056): nenhuma mensagem de validação ecoa lixo (`inputRules.js`, project `logic`)
**Regra do gerente:** a correção vale para **todas** as mensagens com o mesmo vício (despesas, taxa, RRR, bônus diário, quantidade, relistagens, parte do mercado, foco, modo). **Mensagens com número finito ou texto digitado ficam IDÊNTICAS, e nenhum teste existente pode mudar.** Se algum teste existente precisar mudar para passar, **o Executor PARA e reporta** ao gerente (não altera o teste).
**Files:** Modify `inputRules.extras.test.js`, `inputRules.test.js` (só acréscimo de um bloco novo no fim), `inputRules.js`.
- **Mecanismo (sem fórmula):** `echo(raw, suffix = '')` devolve `''` quando não há o que ecoar e `' ' + texto + suffix` quando há: texto digitado (string) vira `"texto"` como o `shown` de hoje (inclusive texto longo: é comportamento atual, não é "lixo"); número **finito** vira `br(raw)` (+ `suffix`, ex.: `'%'`); qualquer outra coisa (objeto, array, booleano, `NaN`, `±Infinity`, `undefined`, função) vira `''`. Cada `${shown(x)}` e cada `${br(n)}` que ecoa o valor **do usuário** passa a `${echo(x)}`, com o espaço movido para dentro do `echo` (`Taxa${echo(raw)} não é um número`). Sites com `br(n)` de constante ou limite (`br(used)`, `br(max)`, `br(MAX_QTY)`) **não mudam**; sites já protegidos (`'infinito'`, `'infinita'`, `big(n)`) **não mudam**. Sites a trocar: `feePer100` (nan, neg, ceiling), `customRRR` (nan; impossible com `echo(n, '%')`), `daily`, `crafts` (invalid dos dois ramos), `relists`, `share`, `efficiency`, `focusPoints`, `focusBudget`, `focusRef`, `mode`, e as despesas (`extra-nan`, `extra-neg`).
- [ ] **Step 0 (rede de segurança):** rodar `npm run test:logic` e `npm run test:ui` ANTES de mexer (tudo verde). Ao final, a mesma suíte passa com os testes existentes **sem nenhuma linha alterada** (`git diff` dos arquivos de teste só com linhas acrescentadas).
- [ ] **Step 1: testes falhando** (despesas em `inputRules.extras.test.js`, com o `ve`/`row` do arquivo; os demais campos num `describe('sem eco de lixo (D3)')` novo no fim de `inputRules.test.js`):
```js
const msg = (value) => ve([row({ value })]).issues[0].msg;
it('objeto, array de 2, booleano e NaN: "o valor não é um número", sem "[object Object]", "true" nem "NaN"', () => {
  for (const v of [{}, [1, 2], true, NaN]) expect(msg(v)).toBe('Despesa 1: o valor não é um número: usando 0.');
});
it('texto digitado continua ecoado entre aspas: "abc" -> valor "abc" não é um número', () => expect(msg('abc')).toBe('Despesa 1: valor "abc" não é um número: usando 0.'));
it('-Infinity (número) e "-Infinity" (texto): "o valor é negativo", sem "Infinity"; o valor usado é 0', () => {
  for (const v of [-Infinity, '-Infinity']) { const r = ve([row({ value: v })]); expect(r.issues[0].msg).toBe('Despesa 1: o valor é negativo: usando 0.'); expect(r.values[0].value).toBe(0); }
});
it('negativo finito mantém o texto antigo: -50 e -0,01', () => {
  expect(msg(-50)).toBe('Despesa 1: valor -50 é negativo: usando 0.'); expect(msg(-0.01)).toBe('Despesa 1: valor -0,01 é negativo: usando 0.');
});
it('"acima do limite" continua com "infinito" para Infinity (não mudou)', () => expect(msg(Infinity)).toContain('infinito'));

// todos os campos: propriedade geral
const JUNK = /Infinity|NaN|undefined|\[object|\btrue\b|\bfalse\b|\bnull\b/;
const semAspas = (m) => m.replace(/"[^"]*"/g, ''); // texto digitado entre aspas é do usuário: fica
const CAMPOS = ['feePer100', 'customRRR', 'daily', 'crafts', 'relists', 'share', 'efficiency', 'focusPoints', 'focusBudget', 'focusRef', 'mode'];
it.each(CAMPOS)('%s: com {}, [], true, NaN, Infinity, -Infinity e () => 1 nenhuma mensagem contém lixo', (campo) => {
  for (const v of [{}, [], [[1]], true, NaN, Infinity, -Infinity, () => 1]) {
    for (const i of validateInputs({ [campo]: v, mode: 'order' }, ctxDe(campo)).issues) expect(semAspas(i.msg)).not.toMatch(JUNK);
  }
});   // ctxDe(campo) = o contexto (kind, premium, feeCeiling) que os testes existentes daquele campo já usam
it('taxa -Infinity: "Taxa é negativa: usando 0."; taxa -400 continua "Taxa -400 é negativa: usando 0."', () => {});
it('RRR manual -Infinity: "RRR manual é impossível (fora de 0 a 100%): usando o RRR automático."; -5 continua "RRR manual -5% é impossível..."', () => {});
it('taxa {} -> "Taxa não é um número: usando o padrão 400."; "abc" continua com o eco entre aspas', () => {});
it('quantidade {} -> "Quantidade é inválida: usando 1."; relistagens {} -> "Relistagens inválidas: usando 0."; diário {} -> "Bônus diário inválido (use 0, 10 ou 20): usando 0."', () => {});
it('estado salvo com {} nos campos de despesa, taxa e RRR: o Crafting renderiza o aviso sem "[object Object]"', () => {});
```
  (Os `it` com corpo vazio acima são fixados pelo Executor com as mensagens exatas lidas do código **antes** de mexer; cada `it` precisa falhar antes e passar depois.)
- [ ] **Step 2:** `npx vitest run src/lib/inputRules.extras.test.js src/lib/inputRules.test.js` -> FAIL só nos casos novos.
- [ ] **Step 3:** implementar `echo` e trocar os sites listados; **não** alterar o texto de nenhuma mensagem com número finito ou texto digitado.
- [ ] **Step 4:** PASS nos novos **e todos os existentes passam sem alteração**; `npm run check`. **Se qualquer teste existente falhar: PARAR e reportar ao gerente** (não editar o teste).
- [ ] **Step 5: Commit:** `fix: avisos de validação sem eco de lixo (-Infinity, [object Object], NaN) em todos os campos`.
- Mutações: `echo` devolvendo `String(raw)`; `-Infinity` indo para o ramo de número finito; mensagem de negativo finito trocada pela genérica; um dos sites (ex.: `focusRef`) sem a troca (o teste por campo derruba); espaço duplicado ou faltando em volta do eco.

### Task 2 (D4): `extras` na linha do Comparar cidades (project `logic`)
**Files:** Modify `cityCompare.test.js`, `cityCompare.js`.
- [ ] **Step 1: testes falhando** (acrescentar em `cityCompare.test.js`; usar o `run`, `cfg` e `by` do arquivo: espada T4, cenário `'own'`, taxa 500 = 216 por craft; Fort Sterling total 5.361,76 = material 5.145,76 + taxa 216):
```js
it('despesas 150 por craft + 80 por craft (1 craft): cada linha completa ganha extras 230 e totalCost = material + taxa + 230 (Fort Sterling 5.361,76 + 230 = 5.591,76)', () => {
  const L = [{ name: '', value: '150', scope: 'craft' }, { name: '', value: '80', scope: 'craft' }];
  const { rows, best, spread } = run({ cfg: cfg({ extras: L }) });
  const r = by(rows);
  expect(r['Fort Sterling'].extras).toBe(230);
  expect(r['Fort Sterling'].totalCost).toBeCloseTo(5591.76, 2);
  expect(r['Fort Sterling'].totalCost).toBeCloseTo(r['Fort Sterling'].matCost + r['Fort Sterling'].fee + r['Fort Sterling'].extras, 6);
  expect(best.city).toBe('Fort Sterling'); expect(spread).toBeCloseTo(1396.61, 2); // ranking e diferença não mudam: a despesa é igual em todas
});
it('3 crafts, 120 por craft + 60 por lote: extras 420 (3 × 120 + 60) em todas as cidades', () => {
  const L = [{ name: '', value: '120', scope: 'craft' }, { name: '', value: '60', scope: 'lote' }];
  for (const r of run({ cfg: cfg({ crafts: 3, extras: L }) }).rows) expect(r.extras).toBe(420);
});
it('sem despesas: extras 0 em todas as linhas (inclusive incompletas)', () => { for (const r of run().rows) expect(r.extras).toBe(0); });
it('CONFIRMADO NO CÓDIGO (D-056): `fee` da linha é a taxa do LOTE inteiro, não por craft: com 3 crafts e taxa 500, 216 por craft, `row.fee` = 648 (384 × 0,1125 × 3 × 5; `computeCraft` usa `stationFee(..., crafts)` e `roundFee`); com 1 craft, 216', () => {
  expect(by(run({ cfg: cfg({ crafts: 3 }) }).rows)['Fort Sterling'].fee).toBe(648);
  expect(by(run().rows)['Fort Sterling'].fee).toBe(216);
});
```
  (Se algum teste existente comparar uma linha inteira com `toEqual`, acrescentar `extras: 0` nele; é a única alteração permitida em teste existente.)
- [ ] **Step 2:** FAIL (`extras` é `undefined`). **Step 3:** em `cityCompare.js`, na linha construída (`row`), acrescentar `extras: c.extras` (já calculado por `computeCraft`; nenhuma conta nova). **Step 4:** PASS; `npm run test:logic`. **Step 5: Commit:** `feat: comparar cidades expõe as despesas extras por linha`.
- Mutações: `extras` fixo 0; `extras: c.fee`; `extras` só nas completas.

### Task 3 (D4): coluna "Despesas" e notas no `CityCompare.jsx`
**Files:** Create `CityCompare.extras.test.jsx`; Modify `CityCompare.jsx`.
- [ ] **Step 1: testes falhando** (project `ui`; render direto de `CityCompare` com um `result` montado à mão: `rows` com campos completos `{ city, isBonus, specialty, rrr, matCost, fee, extras, totalCost, unitCost, complete, missing: [], feeSource: 'general', deltaVsBonus, deltaVsBest }`; `general = { value: 500, touched: true }`; `feeByCity = {}`; `units = 3`):
```js
// linha do exemplo do laudo: material 4.511 + taxa 432 + despesas 420 = 5.363 (120 × 3 + 60)
it('com despesas > 0: cabeçalho "Despesas" e a célula mostra 420; a linha soma 4.511 + 432 + 420 = 5.363', () => {});
it('a nota diz "Custo total = material + taxa da bancada + despesas extras" e que a despesa é a mesma em todas as cidades', () => {});
it('sem despesas (extras 0 em todas): nenhuma coluna "Despesas" e nenhuma nota de despesas (tabela como antes)', () => {});
it('linha incompleta (sem preço): a célula de despesas mostra 420 mesmo assim ou "—" como o custo total? (ver nota) ', () => {});
it('a nota sobre o "Sem imposto": "O interruptor Sem imposto só afeta a venda; não entra nesta comparação"', () => {});
it('texto antigo "Compara só o custo de produzir; não inclui transporte" continua presente', () => {});
it('rótulo da taxa (D-056): linha com fee 648 (3 crafts × 216) mostra "648 no lote" e NÃO "por craft"; com fee 216 e 1 craft mostra "216 no lote"', () => {});
```
  (Na 4ª linha: decidir "—" para linha incompleta, igual ao custo total; escrever o teste com essa decisão: `—`.)
- [ ] **Step 2:** FAIL. **Step 3:** em `CityCompare.jsx`: trocar `<small>{fmt(r.fee)} por craft</small>` por `<small>{fmt(r.fee)} no lote</small>` (a taxa é do lote, confirmado na Task 2; erro de honestidade de dado corrigido aqui por decisão D-056); `const anyExtras = rows.some((r) => r.extras > 0)`; coluna `<th title="Despesas extras do lote (as mesmas em todas as cidades); entram no custo total">Despesas</th>` entre "Taxa" e "Custo total", célula `<Money value={r.extras} />` (ou `—` se `!r.complete`); `<p className="hint">` extra quando `anyExtras`: "Custo total = material + taxa da bancada + despesas extras. As despesas são as mesmas em todas as cidades, então não mudam qual é a mais barata." e, sempre, no parágrafo final: "O interruptor “Sem imposto” só afeta a venda; não entra nesta comparação." Nenhuma conta no componente.
- [ ] **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: Comparar cidades mostra as despesas no custo total e explica o Sem imposto`.
- Mutações: coluna sempre visível; coluna escondida com despesas; célula com o valor da taxa; nota ausente.

### Task 4 (D2 e mutante 46): seletor de escopo legível em 375 px (`ExtrasCard.jsx`, `index.css`)
**Files:** Modify `ExtrasCard.test.jsx`, `ExtrasCard.jsx`, `index.css`; Create `ExtrasCard.layout.test.js`.
- [ ] **Step 1: testes falhando.**
  `ExtrasCard.test.jsx` (project `ui`):
```js
it('mutante 46: o select de escopo MOSTRA o escopo da linha: "lote" para linha por lote, "craft" para por craft e para escopo inválido/ausente', () => {
  mount({ list: [{ name: '', value: '1', scope: 'lote' }, { name: '', value: '1', scope: 'craft' }, { name: '', value: '1', scope: 'xyz' }, { name: '', value: '1' }] });
  expect([1, 2, 3, 4].map((i) => screen.getByLabelText(`Escopo da despesa ${i}`).value)).toEqual(['lote', 'craft', 'craft', 'craft']);
});
it('as opções têm o texto completo: "por craft" e "por lote" (Craft); "por unidade" e "por lote" (Refino)', () => {});
it('cada linha usa as classes extra-row (grade) e extra-name (nome); a classe é a que o CSS responsivo conhece', () => {
  const { container } = mount({ list: L }); expect(container.querySelectorAll('.extra-row')).toHaveLength(2); expect(container.querySelectorAll('.extra-row .extra-name')).toHaveLength(2);
});
```
  `ExtrasCard.layout.test.js` (project `logic`; lê o CSS como texto: o jsdom não calcula layout):
```js
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
it('a grade da linha de despesa tem 4 colunas no desktop', () => expect(css).toMatch(/\.extra-row\s*\{[^}]*grid-template-columns:[^;}]*auto/));
it('até 560 px o nome ocupa a primeira linha inteira e valor, escopo e remover ficam na segunda (3 colunas)', () => {
  const m = css.match(/@media \(max-width: 560px\)\s*\{[^@]*\.extra-row\s*\{([^}]*)\}[^@]*\.extra-row \.extra-name\s*\{([^}]*)\}/);
  expect(m).not.toBeNull(); expect(m[1]).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)\s+auto/); expect(m[2]).toMatch(/grid-column:\s*1\s*\/\s*-1/);
});
```
- [ ] **Step 2:** FAIL (sem classes; sem regras). **Step 3:** `ExtrasCard.jsx`: trocar o `style` da grade por `className="extra-row"` e dar `extra-name` ao `<input>` de nome (nada mais muda: mesmos `aria-label`, mesmas opções, textos completos). `index.css`: `.extra-row { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) auto; gap: 8px; align-items: center; }` e, dentro de uma `@media (max-width: 560px)` nova ou na existente da linha 51, `.extra-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; } .extra-row .extra-name { grid-column: 1 / -1; }`. (Ajustar a regex do teste se o Executor colocar as regras na `@media` já existente: o importante é o conteúdo.)
- [ ] **Step 4:** PASS; `npm run check`. **Conferência na tela real (Vite, 375 × 812, `resize_window` mobile):** abrir Craft, adicionar 2 despesas, uma "por lote"; medir `document.querySelector('[aria-label="Escopo da despesa 1"]').getBoundingClientRect().width` **≥ 100 px** (era 62), ler o texto selecionado inteiro ("por craft"/"por lote", sem corte: `scrollWidth <= clientWidth`), `document.documentElement.scrollWidth === 375`; repetir no Refino ("por unidade") e a 1280 px (4 colunas numa fila, como antes). **Step 5: Commit:** `fix: seletor de escopo das despesas legível em 375 px (D2)`.
- Mutações: remover a `@media`; manter `grid-column` só em desktop; select com `value` fixo (cai no teste 46).

### Task 5 (D4): "Melhor destino" diz que está sem imposto; nota da marca global (`Crafting.jsx`)
**Files:** Create `Crafting.noTaxBox.test.jsx`; Modify `Crafting.jsx`.
- [ ] **Step 1: testes falhando** (project `ui`; mesmos mocks e `mount()` de `Crafting.extras.test.jsx`: espada T4, taxa 500, venda Caerleon 4.500 ordem de venda, despesas 150 + 80 por craft; custo 3.754,27):
```js
it('sem marca: o quadro Melhor destino mostra lucro +453 e NÃO tem "sem imposto"', () => {});
it('marcando Sem imposto em Caerleon (ordem de venda): lucro +746, "Venda líquida 4.500 (sem imposto) − custo 3.754" e a etiqueta "sem imposto" no quadro', () => {});
it('marca em OUTRA saída que não é a melhor (estado salvo noTax { "Lymhurst|order": true }): o quadro continua sem "sem imposto"', () => {});
it('a nota da tabela de saídas diz que a marca vale para todos os itens e fica salva por cidade e modo, não por item', () => {});
```
- [ ] **Step 2:** FAIL. **Step 3:** no quadro "Melhor destino": `best.noTax && <small className="good">sem imposto</small>` ao lado de `{best.label}`, e o hint passa a `Venda líquida {fmt(best.net)}{best.noTax ? ' (sem imposto)' : ''} − custo {fmt(totalCost)}`; no parágrafo de ajuda da tabela de saídas, acrescentar "A marca vale para todos os itens: fica salva por cidade e modo de venda, não por item." (texto do Tester em D4). `best.noTax` já existe (`craftPlan.js`).
- [ ] **Step 4:** PASS; `npm run check`. **Step 5: Commit:** `feat: Melhor destino indica venda sem imposto; nota da marca global`.
- Mutações: etiqueta sempre visível; etiqueta lendo `shown.noTax` em vez de `best.noTax` quando forem saídas diferentes (o teste usa uma saída ilusória como `shown`: ver o `pickExit`); nota ausente.

### Task 6 (D5): os testes que faltam para os mutantes 13, 26, 37, 38, 40 e 41
Cada subtarefa: escrever o teste, **ver falhar contra o mutante** (aplicar a mutação em cópia/edição local descartável, rodar, ver vermelho, desfazer) e contra o código atual ver passar. Nenhuma alteração de código de produção.

**6a (mutante 13) `craftPlan.extras.test.js`:** espada T4 do dossiê com despesa 230 (150 + 80 por craft), venda Caerleon 4.500 em ordem de venda, 1 craft: `best.margin` ≈ **12,07** (lucro 453,23 ÷ custo 3.754,27 × 100; o mutante dá 453,23 ÷ 3.524,27 = 12,86): `expect(best.margin).toBeCloseTo(12.07, 2)`; sem despesas ≈ 19,39 (683,23 ÷ 3.524,27). Mais um em `Crafting.extras.test.jsx`: o quadro "Melhor destino" mostra `+12,1%`.
**6b (mutante 26) `inputRules.extras.test.js`:** `cleanNoTax({ 'Caerleon|none': true, 'Caerleon|order': true, 'Martlock|instant': true, '|order': true, 'Caerleon|order ': true })` → `{ 'Caerleon|order': true, 'Martlock|instant': true }` (descarta `|none`, cidade vazia e chave com espaço); `cleanNoTax({ 'Caerleon|none': true })` → `{}`.
**6c (mutante 37) `Crafting.extras.test.jsx`:** com despesas 230 a linha `Total` do **plano de compra** (`screen.getByText('Total', { selector: 'strong' }).closest('tr')`) contém `3.754`; sem despesas contém `3.524`; e com despesas a linha "Despesas extras" do plano mostra 230 uma vez só (não conta duas vezes).
**6d (mutante 38) `Crafting.extras.test.jsx`:** `mount({ crafts: 10, extras: [{ name: '', value: '150', scope: 'craft' }, { name: '', value: '80', scope: 'lote' }] })`: `body.textContent` contém `Despesas: 150 por craft + 80 por lote (1.580 no lote de 10)` (150 × 10 + 80 = 1.580; valor conferido na tela real pelo Tester) e **não** contém `no lote de 1)`; e a linha de custo por unidade do lote: custo/un. ≈ 3.682 (3.524,27 + 1.580 ÷ 10 = 3.682,27).
**6e (mutante 40) `Refining.extras.test.jsx`:** cenário A com `extras: [{ value: '10', scope: 'craft' }]`: o cartão Preço-alvo (`screen.getByText('Liste a').parentElement.querySelector('.big').textContent`) é **1.146** ((61,4734 + 10 + 1.000) ÷ 0,935 = 1.145,96); sem despesas **1.136** (1.061,4734 ÷ 0,935 = 1.135,27). Sem `noTax` marcado (o caso com a marca é da 075).
**6f (mutante 41) `Refining.extras.test.jsx`:** mesmo cenário: na tabela "Melhor rota", a linha com classe `best` tem lucro/un. **+63** (134,4 − 61,4734 − 10 = 62,93) e **não** contém `73`; sem despesas a mesma célula mostra +73 (72,93). `row.querySelectorAll('td')[2].textContent`.
- [ ] **Step final:** `npm run check` verde; **Commit** por subtarefa ou único: `test: cobertura dos 7 mutantes sobreviventes da 048 (D5)`.

### Task 7: conferência manual (sem commit)
- [ ] 375 px (Craft e Refino): seletor legível, sem rolagem horizontal; despesa corrompida no `localStorage` (`value: '-Infinity'`, `value: {}`) mostra "o valor é negativo"/"o valor não é um número" sem "Infinity" nem "[object Object]"; Comparar cidades com despesas mostra a coluna e a soma fecha; Melhor destino com e sem a marca. **Conferir `location.port` antes de gravar em `localStorage`** (regra dos Testers). Console limpo.

## Como o Tester valida
1. Todos os casos concretos acima existem, falharam antes e passam depois; recalcular 12,07%, 5.591,76, 5.363 (= 4.511 + 432 + 420), 1.580, 1.146 e +63 por conta própria.
2. **Mutação:** os 7 mutantes da tabela, **um a um**, agora devem morrer (M13, M26, M37, M38, M40, M41, M46); mais as mutações listadas em cada Task. Sobrevivente reprova.
3. **Regressão:** sem despesas e sem marca, as telas Craft/Refino/Comparar cidades são idênticas às de antes (diferencial dos 3.500 + 1.500 cenários da 048: 0 diferenças; `compareCraftCities` com `extras` só acrescenta campo).
4. **Estado corrompido:** os 39 formatos do laudo da 048 renderizam sem erro, sem `console.error` e **sem "Infinity", "NaN", "undefined" nem "[object Object]" em nenhum aviso**.
5. UI real a 375 px: select ≥ 100 px com o texto inteiro; `scrollWidth` da página 375.
6. `persistSchemas.test.js` verde, sem `persistSchemas.js` no diff, nenhum `usePersisted('…'` literal em `.test.jsx`; bundle: `Crafting` e `index` sem mudança relevante (< 0,5 kB gzip).
7. **O que um usuário estranharia:** escopo ilegível no celular; soma da tabela que não fecha; "sem imposto" valendo para outro item sem aviso; lixo técnico em aviso.

## Riscos
1. **D2 em CSS:** não há teste de layout em jsdom; o teste lê o CSS como texto e a conferência real a 375 px é obrigatória (Task 4 e 7).
2. **Marca "Sem imposto" é global por cidade e modo** (D4): esta ideia só **explica** (decisão D-056); tornar a marca por item exigiria mudar o formato de `craft:cfg.noTax` e migrar (fora do escopo).
3. `Crafting.jsx` é arquivo quente: o diff aqui é pequeno (quadro e nota).
4. **Rótulo da taxa (D4/D-056):** confirmado no código que `fee` é o total do lote; o rótulo "por craft" do `CityCompare` vira "no lote" (Task 3), com teste de crafts > 1 (648 = 3 × 216). Textos longos digitados continuam ecoados entre aspas (comportamento atual; só objeto, array, booleano, NaN e ±Infinity deixam de aparecer). Risco da Task 1: tocar ~20 mensagens da 060; mitigado pela regra de PARAR se qualquer teste existente precisar mudar.

## Critério de pronto
`npm run check` verde; só testes **acrescentados** nos existentes (exceto o `toEqual` de linha inteira, se houver); os 7 mutantes e as mutações das Tasks derrubados; conferência de 375 px registrada pelo Tester; só os arquivos listados alterados.

## DECISÕES DO GERENTE (D-056) e pontos ainda abertos
1. Marca "Sem imposto" por item: **não**; só explicar na tela (Tasks 3 e 5). **Incorporado.**
2. Rótulo da taxa: **confirmado** que `fee` é o total do lote (`stationFee(..., crafts)`); rótulo corrigido para "no lote" dentro da 076, com teste de crafts > 1 (Tasks 2 e 3). **Incorporado.**
3. Eco de lixo: `echo` estendido a todas as mensagens com o mesmo vício; número finito e texto digitado idênticos; nenhum teste existente pode mudar, senão o Executor PARA e reporta (Task 1). **Incorporado.**
4. Seletor em 375 px: duas filas (nome em cima; valor, escopo e remover embaixo), sem rótulos curtos (Task 4). **Incorporado.**
Em aberto: nenhum.
