# IDEIA-030 — Preço-alvo reverso: plano de implementação

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-030`. Comandos `npm` em `client/`. **Pré-requisito:** IDEIA-001 mesclada.

**Objetivo:** dado o custo unitário já calculado pelo app, mostrar "por quanto listar para lucrar X (prata), ter margem M% ou empatar", em ordem de venda ou venda instantânea, com comparação ao menor preço de venda atual.

**Arquitetura:** módulo puro `lib/targetPrice.js`, inversão algébrica de `netSale` (o fator de líquido `k` é obtido chamando `netSale(1, mode, premium)`, nunca recalculado com 0,04/0,08/0,025). Um componente de apresentação `components/TargetPrice.jsx` recebe `{ cost, prices, mid }` e é encaixado com uma linha em Craft e uma em Refino.

**Spec:** `docs/research/IDEIA-030.md` (§2 fórmulas, §4 caso de teste) e `docs/research/AUDITORIA-001.md` §3 (imposto 4%/8%, setup 2,5%, relistagem).

## Fidelidade: funções consumidas

- `netSale(price, mode, premium)` e `SETUP_FEE` de `econ.js` (se imposto/setup mudarem, o preço-alvo acompanha); `fmt`, `pct`.
- Custo: `computeCraft(...).unitCost` (de `craftPlan.js`; já divide por `rec.amount × crafts`, cobrindo `amountcrafted > 1`) e `refineUnit(...).cost` (Refino, via `evaluateTier(...).unit.cost`). A taxa de bancada **não** é chamada aqui: vem embutida nesses custos, então 019 (arredondamento) e 041 (diário no craft) se propagam sem edição.
- Preço de mercado de referência: `quote` de `market.js` (via `lowestListing`).
- **Não corrige** 038/019/041 e **não hardcoda** cidades nem taxa.

## Onde aparece e UI (sem código)

Cartão **"Preço-alvo"** nas abas **Craft** (logo abaixo de "Onde vender") e **Refino** (abaixo do resultado do tier atual).
- Seletor de objetivo: "Equilíbrio", "Lucro alvo (prata)" ou "Margem alvo (%)" com o campo numérico correspondente; seletor do modo de venda (Ordem de venda / Ordem de compra na hora) e, no modo ordem, campo "relistagens" (0 por padrão).
- Resultado grande: "Liste a 4.839" com a linha "líquido 4.524,47, lucro 1.000,19 por unidade".
- Faixa de comparação: menor preço de venda atual (cidade, idade do dado) e "alvo X% acima/abaixo do mercado"; acima do mercado ganha aviso amarelo "difícil de vender".
- Se faltam preços de material (custo incompleto) o cartão mostra "Preencha os preços ausentes" em vez de um número enganoso.

## Arquivos afetados (exatos)

**Criados:** `client/src/lib/targetPrice.js`, `client/src/lib/targetPrice.test.js`, `client/src/components/TargetPrice.jsx`.
**Alterados:** `client/src/components/Crafting.jsx` (1 import + 1 elemento JSX), `client/src/components/Refining.jsx` (1 import + 1 elemento JSX).
**NÃO toca:** `econ.js`, `catalog.js`, `craftPlan.js`, `refinePlan.js`, `market.js`, `build-catalog.mjs`, fixture, `App.jsx`, `Flipper.jsx`.
**Paralelismo:** livre com 038, 039, 019, 041 (só **lê** `unitCost`/`cost`). Conflito textual pequeno com 031 e 041 em `Crafting.jsx`/`Refining.jsx` (inserções de uma linha em pontos distintos); resolver por rebase. Com IDEIA-023: sem conflito.

**Modelo de dados:** nenhum catálogo. `usePersisted('target:cfg', { goal: 'profit', profit: 1000, margin: 20, mode: 'order', relists: 0 })`.

## Fórmulas (dossiê §2)

```
k = netSale(1, mode, premium)                  // = 1 - t - s (ordem) ou 1 - t (instantâneo), vem de econ.js
k_ordem(n) = k - n * SETUP_FEE                 // n relistagens (cada atualização cobra s de novo; só no modo ordem)
L = profit | cost * margin | 0                 // exatamente um dos três
P_exato = (cost + L) / k_modo
P = ceil(P_exato - 1e-9)                       // inteiro; tolerância evita 1000,0000000000001 -> 1001
null se cost <= 0, não finito, ou P <= 0
marketGap(target, current) = target / current - 1     // null se current <= 0
```

## Interfaces (`targetPrice.js`)

```js
targetPrice({ cost, profit, margin, premium, mode, relists = 0 }): number | null
  // mode: 'order' | 'instant'. Passar profit E margin lança TypeError. Nenhum dos dois = equilíbrio (profit 0).
marketGap(target: number, current: number): number | null
lowestListing(prices, mid): { price, city, date } | null     // menor 'sell' > 0 entre CITIES (exclui Black Market)
```

## Tasks (1 commit cada; testes primeiro)

### Task 1: `targetPrice` e `marketGap`
**Files:** Create `targetPrice.test.js`, `targetPrice.js`.
- [ ] **Step 1: teste falhando** (módulo inexistente). Base do dossiê §4: `cost = 4400 * (100/133) + 216` ⇒ **3524,2707** (barra 200 ×16 + couro 150 ×8, RRR 33/133, taxa `384 × 0,1125 × 5 = 216`; o teste passa o custo como número, sem catálogo).

```js
const C = 4400 * (100 / 133) + 216; // 3524,2707
it.each([
  ['equilíbrio ordem',      { mode: 'order' },                        3770],
  ['lucro 1000 ordem',      { mode: 'order', profit: 1000 },          4839],
  ['lucro 1000 instantâneo',{ mode: 'instant', profit: 1000 },        4713],
  ['margem 20% ordem',      { mode: 'order', margin: 0.2 },           4524],
  ['equilíbrio instantâneo',{ mode: 'instant' },                      3672],
])('premium: %s', (_n, arg, esperado) => expect(targetPrice({ cost: C, premium: true, ...arg })).toBe(esperado));
it('sem premium, lucro 1000 ordem = 5056', () => expect(targetPrice({ cost: C, premium: false, mode: 'order', profit: 1000 })).toBe(5056));
it('verificação reversa: líquido(4839) - C ≈ 1000,19', () => expect(netSale(4839, 'order', true) - C).toBeCloseTo(1000.1943, 3));
it('propriedade: líquido do alvo >= custo + lucro, e 1 a menos não basta', () => {
  for (const [premium, mode, profit] of [[true,'order',0],[true,'instant',250],[false,'order',1000],[false,'instant',0]])
    for (const cost of [1, 17.3, 935, 3524.27, 99999]) {
      const p = targetPrice({ cost, profit, premium, mode });
      expect(netSale(p, mode, premium)).toBeGreaterThanOrEqual(cost + profit - 1e-9);
      expect(netSale(p - 1, mode, premium)).toBeLessThan(cost + profit);
    }
});
it('ruído de ponto flutuante não sobe 1 prata: cost 935 premium ordem = 1000', () => expect(targetPrice({ cost: 935, premium: true, mode: 'order' })).toBe(1000));
it('relistagem: 1 relistagem, lucro 1000 ordem = 4972 (k = 0,935 - 0,025)', () =>
  expect(targetPrice({ cost: C, premium: true, mode: 'order', profit: 1000, relists: 1 })).toBe(4972));
it('relistagem ignorada no instantâneo', () =>
  expect(targetPrice({ cost: C, premium: true, mode: 'instant', profit: 1000, relists: 2 })).toBe(4713));
it('entradas inválidas', () => {
  for (const cost of [0, -5, NaN]) expect(targetPrice({ cost, premium: true, mode: 'order' })).toBeNull();
  expect(() => targetPrice({ cost: C, premium: true, mode: 'order', profit: 1, margin: 0.1 })).toThrow(TypeError);
});
it('marketGap', () => {
  expect(marketGap(4839, 4500)).toBeCloseTo(0.0753, 4);
  expect(marketGap(4839, 0)).toBeNull();
});
```
  Valores do dossiê §4: 3.769,27→3.770; 4.838,79→4.839; 4.712,78→4.713; 4.523,13→4.524; 3.671,12→3.672; sem premium 5.055,05→5.056. O valor de 4972 (relistagem) é **derivado** do texto do dossiê (soma `s × P` por relistagem), não tem número publicado: `(3524,2707 + 1000)/0,91 = 4.971,73 → 4.972`.
- [ ] **Step 2:** `npx vitest run src/lib/targetPrice.test.js` → FAIL (`Failed to resolve import "./targetPrice"`).
- [ ] **Step 3: implementar** `targetPrice` e `marketGap` conforme as fórmulas.
- [ ] **Step 4:** mesmo comando → PASS. **Step 5:** `npm run check`. **Step 6: Commit:** `feat: preço-alvo reverso (targetPrice) com testes do dossiê`.

### Task 2: `lowestListing`
**Files:** Modify `targetPrice.test.js`, `targetPrice.js`.
- [ ] **Step 1: teste falhando** com `mkPrices({ T4_MAIN_SWORD: { Martlock: { s: 4600, sd: 111 }, Caerleon: { s: 4500, sd: 222 }, Lymhurst: { s: 0 }, 'Black Market': { s: 100 } } })`: `lowestListing(prices, 'T4_MAIN_SWORD')` → `{ price: 4500, city: 'Caerleon', date: 222 }` (ignora zero e Black Market); sem preços ou `prices === null` → `null`.
- [ ] **Step 2:** FAIL; **Step 3:** implementar com `quote()`; **Step 4:** PASS; **Step 5:** `npm run check`; **Step 6: Commit:** `feat: menor preço de venda atual como referência do preço-alvo`.

### Task 3: Componente `TargetPrice.jsx`
**Files:** Create `components/TargetPrice.jsx`.
- [ ] Props: `{ cost: number, prices, mid: string, missing: boolean }`. Lê `premium` de `useSettings()`, estado de `usePersisted('target:cfg', ...)`. Usa `targetPrice`, `marketGap`, `lowestListing`, `netSale`, `fmt`, `pct`, e os componentes `Field`, `NumberInput`, `Segmented`, `Banner` de `ui.jsx`. UI conforme a descrição acima.
- [ ] `npm run check` → código 0. **Commit:** `feat: cartão Preço-alvo`.

### Task 4: Encaixe no Craft
**Files:** Modify `Crafting.jsx`.
- [ ] Inserir `<TargetPrice cost={c.unitCost} prices={prices} mid={targetMid} missing={c.missing.length > 0} />` após o cartão "Onde vender" (`c` = retorno de `computeCraft` da IDEIA-001). Nenhuma outra linha muda.
- [ ] `npm run check`; `npm run dev`, aba Craft com `T6_MAIN_SWORD`: o cartão aparece, muda ao trocar premium, ordem/instantâneo e objetivo; some o número quando faltam preços. **Commit:** `feat: preço-alvo na aba Craft`.

### Task 5: Encaixe no Refino
**Files:** Modify `Refining.jsx`.
- [ ] Inserir `<TargetPrice cost={cur.unit.cost} prices={prices} mid={cur.mid} missing={missing.length > 0} />` abaixo do cartão de resultado do tier (`cur` e `missing` já existem no componente).
- [ ] `npm run check`; smoke em Refino/Tábua T4. **Commit:** `feat: preço-alvo na aba Refino`.

## Como o Tester valida (conta própria, sem importar `econ.js`)

Base: espada T4 em Lymhurst (barra 200, couro 150, RRR 33/133 = 24,8120%, taxa 500, valor 384): bruto 4.400; líquido 4.400 × 0,751880 = 3.308,27; taxa 384 × 0,1125 × 5 = 216; **C = 3.524,27**. Premium (1−t−s = 0,935): equilíbrio **3.770** (3.769,27); lucro 1.000 por ordem **4.839** (4.838,79; líquido 4.524,47; sobra 0,19 sobre o alvo); lucro 1.000 instantâneo **4.713** (4.712,78); margem 20% por ordem **4.524** (4.523,13); equilíbrio instantâneo **3.672** (3.671,12). Sem premium (0,895): lucro 1.000 por ordem **5.056** (5.055,05). Verificação reversa: 4.839 × 0,935 − 3.524,27 = **1.000,19**.
**O que um jogador experiente estranharia:** preço-alvo menor que o custo (impossível com lucro ≥ 0); instantâneo maior que ordem para o mesmo lucro (deve ser menor: só paga o imposto); sem premium menor que com premium; alvo por margem de 0% diferente do equilíbrio; preço com casas decimais (prata é inteiro); alvo que muda ao ligar "relistagens" no modo instantâneo; margem alvo de 20% resultando em lucro de 20% **sobre o preço** em vez de sobre o custo (a definição do dossiê é sobre o custo); cartão mostrando número quando faltam preços de material; potion/comida com `amount` > 1 usando custo do craft inteiro em vez do custo por unidade (conferir um item com `amount` 5).

## Riscos

1. Dossiê não diz o que fazer com custo incompleto: o plano esconde o número (`missing`).
2. Margem sobre o custo (definição do dossiê) pode confundir quem pensa em margem sobre a venda; o rótulo da UI deve dizer "margem sobre o custo".
3. `Crafting.jsx` é arquivo quente (041, 031): inserção de uma linha, rebase simples.
4. Tolerância `1e-9` no `ceil` é decisão de implementação (necessária: `935 / 0,935` dá 1000,0000000000001 em ponto flutuante).

## Critério de pronto

`npm run check` verde; todos os casos do dossiê e a propriedade `netSale(P) ≥ C + L` em teste; nenhum literal `0.04`, `0.08` ou `0.025` em `targetPrice.js`/`TargetPrice.jsx`; cartão visível em Craft e Refino; só os arquivos listados alterados.

## PERGUNTAS PARA O GERENTE

1. **Relistagens** (dossiê §2, só wiki, MÉDIA-ALTA): incluir o campo "nº de relistagens" (default 0) ou deixar para depois? O plano inclui.
2. **Flipper** ("comprar a X, lucrar Y, preciso vender a Z", dossiê §5): fora deste plano (evita editar `Flipper.jsx` e `flip.js`). Quer uma 2ª fase?
3. Passar `profit` e `margin` juntos lança erro (decisão minha; o dossiê não define). Confirma?
4. O preço de mercado de referência é o **menor** preço de venda em cidades reais (dossiê §2: `sell_price_min`); Black Market excluído. Confirma?
