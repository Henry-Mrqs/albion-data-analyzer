# IDEIA-073 — Polimento do cartão Comparar cidades (058) e "-0": plano compacto

> **Para o Executor:** `superpowers:executing-plans`. Branch de integração (D-070); `npm` em `client/`. Teste visto falhar antes; nenhum `*.test.jsx` com `usePersisted('chave'` literal (use `seed()`). Origem: `docs/qa/IDEIA-058.md` O1–O6 (D-049). Sem mudança de cálculo (`cityCompare.js` não muda).

**Arquivos.** Altera: `client/src/components/CityCompare.jsx` (textos, ordem de colunas), `client/src/lib/econ.js` (**só** `fmt`), `client/src/components/ui.jsx` (**só** `Money`), `client/src/index.css` (classe da coluna fixa), `CityCompare.extras.test.jsx` (só se um texto antigo mudou). Cria: `client/src/components/CityCompare.polish.test.jsx`, `client/src/lib/econ.fmt.test.js`. **Conflitos:** `CityCompare.jsx` com 076/079 (já mescladas; a 079 só mexe em CSS de `.hint`); `econ.js` com 059/065 (outras funções: merge trivial); `fmt` é usado por 080 (grade) e 088: **073 antes de 080**.

## Task 1: textos honestos (O1, O2, O3, O4) — `CityCompare.jsx`
- [ ] **Step 1: testes falhando** (project `ui`; `result = compareCraftCities(...)` com o fixture, espada T4, valor 384, taxa geral 500 → taxa de bancada 216; os números do laudo 058 §2 (Lymhurst 5.364,87; Fort Sterling 5.361,76; Thetford 5.863,46; Martlock 6.134,64; Bridgewatch 6.758,37; Caerleon e Brecilien incompletos) saem de `compareCraftCities`, não escritos à mão):
  1. **O1** taxa digitada em **uma** cidade (`feeByCity = { Lymhurst: '300' }`): fica um aviso leve (`data-testid="city-fee-partial"`) "Só Lymhurst tem taxa própria; as outras 6 usam 500 (da tela ou padrão do app)" enquanto houver cidade sem taxa própria; some só quando todas têm. O aviso forte "Usando 400 do app em todas as cidades…" continua só sem nenhuma taxa e sem toque.
  2. **O2** taxa geral **vazia**: "Mesma taxa em todas as cidades." **não** aparece; aparece "Taxa geral vazia: o cálculo usa o padrão 400 do app (não confirmado) em todas as cidades". Com taxa geral digitada e nenhuma por cidade: "Mesma taxa em todas as cidades (a da tela)."
  3. **O3** item cuja cidade de bônus não tem preço (bolsa, capa, poção no cenário "própria cidade": Brecilien incompleta): a frase "Brecilien (cidade de bônus) está sem preço: não há coluna de diferença" e o `title` da célula "—" com o mesmo motivo.
  4. **O4** item Royal (sem cidade de bônus; 7 linhas idênticas): **não** mostra "Melhor: Martlock"; mostra "Este item não tem cidade de bônus: as 7 cidades dão o mesmo RRR (15,3%) e a diferença vem só da taxa e do material"; nenhuma linha com classe `best` quando `totalCost` e RRR são iguais em todas as completas.
- [ ] **Step 2:** `npx vitest run --project ui src/components/CityCompare.polish.test.jsx` → FAIL. **Step 3:** implementar em `CityCompare.jsx` (derivar de `result`; props novas só se indispensáveis: `bonusCity`). **Step 4:** PASS; `npm run test:ui`. **Step 5: Commit** `fix: Comparar cidades: avisos de taxa, bônus sem preço e item sem cidade de bônus (IDEIA-073)`.
- Mutações: O1 que some com uma cidade preenchida; "Mesma taxa" com campo vazio; "Melhor" no Royal; frase do bônus sem preço sempre ligada.

## Task 2: custo total visível a 375 px (O5)
- [ ] **Step 1: teste falhando** (estrutural; o jsdom não mede layout): colunas na ordem **Cidade, RRR, Custo total, Por unidade, Material, Taxa, [Despesas], Dif.**; a primeira coluna (`th` e `td`) tem a classe `sticky-col`. **Step 2:** FAIL. **Step 3:** reordenar; CSS `.sticky-col { position: sticky; left: 0; background: <variável de fundo do card já definida em index.css>; }`. **Step 4:** PASS; o Tester confere a 375 px: "Cidade" e "Custo total" visíveis sem rolar. **Step 5: Commit** `fix: Comparar cidades mostra o custo total antes do material e fixa a coluna Cidade (IDEIA-073)`.

## Task 3: sem "-0" (O6; também O3 da 031) — `fmt` e `Money`
- [ ] **Step 1: testes falhando** (`econ.fmt.test.js`, project `logic`): `fmt(-0.3)` = `'0'`, `fmt(-0.49)` = `'0'`, `fmt(-0)` = `'0'`, `fmt(-0.51)` = `'-1'`, `fmt(1234.5)` = `'1.235'`, `fmt(-1234.4)` = `'-1.234'`, `fmt(NaN)` e `fmt(Infinity)` = `'valor enorme'` (inalterado), `fmt(1e15)` continua exponencial (`'1e15'`). Tela: `Money signed` com `-0.3` mostra `0` **sem** classe `good`/`bad` (zero não é prejuízo) (`CityCompare.polish.test.jsx` com `deltaVsBonus = -0.3`). **Step 2:** FAIL. **Step 3:** `const r = Math.round(n) || 0` (normaliza `-0`); em `Money`, o valor arredondado decide classe e sinal. **Step 4:** PASS; `npm run test:logic` e `test:ui` (se algum teste existente esperava `"-0"`, atualizar o literal e dizer no commit). **Step 5: Commit** `fix: fmt nunca mostra -0 (IDEIA-073)`.
- Mutações: `fmt` sem normalizar; `Money` colorindo `0` de vermelho.

## Auditor (005, contrato `registerScreen`)
Nenhum campo salvo novo; a linha `compare-info` do Craft continua correta e nenhuma linha nova é necessária. Variável não modelada: transporte (já em `nc-transport`).

## Como o Tester valida
Números do laudo 058 inalterados (diferencial dos 2.500 cenários: 0 divergência); os 4 textos; 375 px; `fmt` em 1.000 valores aleatórios idêntico ao anterior, exceto os que arredondavam para `-0`.

## PERGUNTAS PARA O GERENTE
1. `fmt(-0.5)` continua `'0'` (comportamento de `Math.round`). Aceita, ou prefere arredondar meio para longe de zero? (Mudaria números exibidos em toda a UI.)
