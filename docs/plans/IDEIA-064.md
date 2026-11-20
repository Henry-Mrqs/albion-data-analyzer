# IDEIA-064 — Perfil do crafter: categorias e tiers que eu produzo (filtro padrão da busca de itens): plano

> **Para o Executor:** `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Branch `feat/IDEIA-064`. Comandos `npm` em `client/`. **Pré-requisitos (já na `master`):** 038 (`cc`, `craftCategories`), 069 (projects `logic`/`ui`, `src/test/ui.js`), 070 (`persistSchemas.js`, `persist.js`). **Regras do briefing:** teste escrito, **executado e visto falhar** antes de implementar; os de componente em `*.test.jsx`; **nenhum `*.test.jsx` com `usePersisted('chave'` literal** (use `seed()`). Fonte: `docs/research/IDEIA-064.md`.

**Problema:** a busca de item do Craft lista os ~2.166 itens craftáveis; o jogador produz poucos. As ferramentas da comunidade guardam "o que eu faço" (AFM "Specs", AlbionUtil "masteries", Profit Forge "Use My Levels").

**Escopo desta versão (decisão do Planejador, para caber num plano completo e sem mexer em 6 telas):** o dossiê descreve um perfil com 5 partes. Este plano entrega **(d) a lista de categorias e tiers que o jogador produz, como filtro da busca de item do Craft**, com **ligar/desligar ("Mostrar tudo")** e **exportar/importar JSON**. **Ficam fora (perguntas ao Gerente):** (a)/(b)/(e) centralizar Premium, foco/dia, taxa por cidade e cidade-base (hoje cada tela guarda os seus: `craft:cfg.focusEff`, `feePer100`, `feeByCity`, `settings.premium`; migrar é uma ideia à parte, de risco alto para o estado salvo); (c) **níveis de especialização** (coeficientes divergem entre ferramentas, P2); filtro no Flipper e no ranking (IDEIA-013 não existe).

**Objetivo:** cartão recolhível **"Meu perfil de crafter"** abaixo do seletor de item do Craft e a busca respeitando-o.

**Arquitetura:** `lib/profile.js` (puro: `cleanProfile`, `craftCategoryOf`, `matchesProfile`, `profileCount`, `exportProfile`, `importProfile`). O perfil mora em **`settings.profile`** (preferência do app, chave `albion:settings` que o `ErrorBoundary`/"Restaurar configurações" já cobrem; **sem chave `usePersisted` nova**, logo o contrato das chaves de `persistSchemas.test.js` não muda). `searchItems(query, { onlyCraftable, limit, filter })` ganha o predicado opcional `filter` aplicado **antes** do limite; `ItemPicker` e `ItemSelector` repassam `filter`. `ProfileCard.jsx` edita; `Crafting.jsx` liga.

## Regras (dossiê §2; sem fórmula de jogo)
- `item visível = !perfil.on OU perfil.rules vazio OU (categoria do item ∈ rules E min ≤ item.t ≤ max)`; "mostrar tudo" sempre disponível. **P4: as regras de desbloqueio de crafting por tier NÃO foram encontradas em fonte; o app não infere o que o jogador pode craftar: o filtro é só uma lista marcada por ele** (dito no cartão).
- **Categoria do item (decisão explícita do dossiê §4):** `cc` do catálogo **se for uma das 33 `CRAFT_CATEGORIES`**; senão, a categoria de craft derivada da categoria de **loja** `c` (mesma tabela de `migrateRrr`: `weapons|armors|head|shoes/<x>` ⇒ `x`, `offhands/*` ⇒ `offhand`, `bags/*` ⇒ `bag`, `capes/accessoires_capes_capes` ⇒ `cape`, `consumables/potions` ⇒ `potion`, `consumables/food` ⇒ `food`); senão `null`. Isso **inclui** `T4_ARMOR_PLATE_ROYAL` e `T5_…_ROYAL` (sem `cc`) ao marcar "armadura de placa". `null` (artefatos, capas de cidade, recursos refinados) **fica oculto com o filtro ligado** e a tela diz isso.
- Valores recalculados no catálogo real atual (`node -e`): **2.166** itens craftáveis (`it.r`; o dossiê dizia 2.186); `sword` T4–T6: **24** (8 por tier); `plate_armor` T4–T5 pela regra acima: **18** (9 por tier; só por `cc` seriam 16); união **42 = 1,94 %**. Das 2.166 receitas: 1.250 têm `cc` coerente com `c`, 45 só se resolvem pela loja (Royal), 36 têm `cc` de recurso (`wood`, `rock`…) e viram `null`, 880 sem `cc` e sem categoria.

## O que o filtro NÃO faz (dito na tela e aqui)
Não verifica se o jogador pode craftar (P4); não muda **nenhum** cálculo, preço, taxa ou foco; não lê o personagem (nenhuma API pública devolve especializações, P5); o item **já selecionado** continua mostrado mesmo fora do perfil (com a nota "fora do seu perfil").

## Arquivos
**Criados:** `client/src/lib/profile.js`, `profile.test.js`, `profile.real.test.js` (lê `public/data/catalog.json`, como `catalog.real.test.js`), `client/src/components/ProfileCard.jsx`, `ProfileCard.test.jsx`, `client/src/components/Crafting.profile.test.jsx`.
**Alterados:** `client/src/lib/catalog.js` (`searchItems`: opção `filter`), `catalog.test.js`, `client/src/components/ui.jsx` (`ItemPicker`: prop `filter`), `client/src/components/ItemSelector.jsx` (prop `filter`), `client/src/components/Crafting.jsx` (cartão e `filter`), `client/src/lib/persistSchemas.js` (**só** `settings.profile: 'passthrough'`, validado por `cleanProfile`, como `feeCeiling`), `persistSchemas.test.js` (esquema de `settings`).
**NÃO toca:** `settings.js` (sem padrão novo: `profile` ausente = desligado; `getSettings()`/`setSettings()` já guardam o campo), `Refining.jsx`, `Flipper.jsx`, `RrrCalculator.jsx`, `Market.jsx`, `lib/audit/*`, catálogo e `scripts/`.
**Compartilhados:** `Crafting.jsx` (junto ao `ItemSelector`, linha 93) com as outras ideias que mexem na tela; `persistSchemas.js` com 051/003/009 (outras chaves/campos: sem sobreposição de linhas). **Auditor:** o perfil **não é campo de `craft:cfg`/`refine:cfg`/`rrr:cfg`/`target:cfg`** nem entra em cálculo ⇒ **nenhuma linha no auditor** e `contract.test.js` não muda (declarado; o Tester confere que `settings` não está em `cfgKeys`).
**Ordem:** independente das demais; só toca `searchItems`.

## Interfaces
```js
// profile.js (puro)
export const PROFILE_VERSION = 1, MAX_RULES = 33, TIER_MIN = 3, TIER_MAX = 8;
craftCategoryOf(item): string|null                        // regra acima; item null/sem `c` ⇒ null
cleanProfile(raw): { on: boolean, rules: { cat, min, max }[], dropped: number }
  // raw ausente/lixo ⇒ { on:false, rules:[], dropped:0 }. on só true se === true. Cada regra: cat ∈ CRAFT_CATEGORIES, min e max inteiros em [3,8];
  // min > max ⇒ troca; regra inválida ⇒ descartada (dropped++); cat repetida ⇒ vale a última; > MAX_RULES ⇒ corta (dropped++)
matchesProfile(item, profile): boolean                    // profile já limpo; on=false ou rules=[] ⇒ true
profileCount(items, profile): { shown: number, total: number }   // total = itens com receita (it.r)
exportProfile(profile): string                            // JSON { v: 1, rules: [{cat,min,max}] } (sem `on`: ligar é escolha local), indentado
importProfile(text): { ok: true, profile } | { ok: false, error: string }   // nunca lança; versão desconhecida ou rules não lista ⇒ erro em português; regras inválidas ⇒ ok com `dropped`
```
`ALLOWED.CRAFT_CATEGORIES` de `persistSchemas.js` é a lista das 33 (já exportada).

## Mensagens (texto final)
Cartão (`<details>`, título **"Meu perfil de crafter"**): "Marque as categorias que você produz e o intervalo de tiers. A busca de item do Craft passa a listar só isso. Isto **não** verifica o que você pode craftar (as regras de desbloqueio por tier não foram encontradas em fonte), **não** muda nenhum cálculo e **não** lê o seu personagem." Resumo: "Filtro ativo: 42 de 2.166 itens craftáveis." / "Mostrando todos os itens." Botões **Ligar filtro** / **Mostrar tudo**; **Exportar** (mostra o JSON numa caixa de texto) e **Importar** (cola o JSON). Aviso com filtro ligado e sem regras: "Marque ao menos uma categoria; sem isso todos os itens aparecem." Nota abaixo da busca com filtro ligado: "Busca filtrada pelo seu perfil. Itens sem categoria de craft (artefatos, capas de cidade) só aparecem em **Mostrar tudo**." Item atual fora do perfil: "O item selecionado está fora do seu perfil." Erro de importação: "Não foi possível importar: {motivo}." Descarte: "N regra(s) inválida(s) ignorada(s)."

## Tasks (1 commit cada; teste primeiro e visto falhar)

### Task 1: núcleo puro (project `logic`)
**Files:** Create `profile.test.js`, `profile.js`.
- [ ] **Step 1: testes falhando** (itens da fixture: `loadFixtureCatalog`; `getItem('T4_MAIN_SWORD')`...):
```js
const P = { on: true, rules: [{ cat: 'sword', min: 4, max: 6 }, { cat: 'plate_armor', min: 4, max: 5 }] };
it('dossiê §4: T4_MAIN_SWORD visível; T7_MAIN_SWORD e T4_ARMOR_CLOTH_SET1 ocultos', () => {
  expect(matchesProfile(getItem('T4_MAIN_SWORD'), cleanProfile(P))).toBe(true);
  expect(matchesProfile(getItem('T7_MAIN_SWORD'), cleanProfile(P))).toBe(false);
  expect(matchesProfile(getItem('T4_ARMOR_CLOTH_SET1'), cleanProfile(P))).toBe(false);
});
it('T4_ARMOR_PLATE_ROYAL (sem cc) entra pela categoria de loja: decisão explícita', () => {
  expect(getItem('T4_ARMOR_PLATE_ROYAL').cc).toBeUndefined();
  expect(craftCategoryOf(getItem('T4_ARMOR_PLATE_ROYAL'))).toBe('plate_armor');
  expect(matchesProfile(getItem('T4_ARMOR_PLATE_ROYAL'), cleanProfile(P))).toBe(true);
});
```
Mais: `T4_CAPEITEM_FW_LYMHURST` (capa de cidade) ⇒ `craftCategoryOf` null e **oculto** com filtro ligado, visível com `on:false`; `T4_ARTEFACT_2H_ARCANESTAFF_HELL` ⇒ null; `T4_METALBAR` (recurso refinado) ⇒ null; `T4_OFF_BOOK` ⇒ `'offhand'`, `T4_BAG` ⇒ `'bag'`, `T4_CAPE` ⇒ `'cape'`, `T4_POTION_HEAL` ⇒ `'potion'`. **`cleanProfile`:** `undefined`, `null`, `'x'`, `[]`, `42` ⇒ vazio; `on: 'true'`/`1` ⇒ `false`; `{cat:'espada',…}` descartada; `min: 2`/`9`/`4.5`/`'4'`/`NaN` ⇒ regra descartada; `min 6, max 4` ⇒ troca para 4–6; cat repetida: a última; 40 regras ⇒ 33 e `dropped ≥ 7`; `rules` não lista ⇒ vazio; o objeto de entrada **não é mutado**. **`matchesProfile`:** `on:true` e `rules:[]` ⇒ `true` para todo item; `item` `undefined`/sem `t` ⇒ `false` quando há regras, `true` quando desligado, sem lançar. **`profileCount`** na fixture: `{ shown, total }` coerente (shown ≤ total). **Export/import:** `importProfile(exportProfile(p))` devolve as mesmas regras (ida e volta); `importProfile('')`, `'{'`, `'null'`, `'{"v":2,"rules":[]}'`, `'{"v":1,"rules":"x"}'` ⇒ `ok:false` com texto; `'{"v":1,"rules":[{"cat":"sword","min":4,"max":6},{"cat":"x"}]}'` ⇒ `ok:true`, 1 regra, `dropped:1`; texto gigante (1 MB) ⇒ recusa sem travar (`> 20_000` caracteres ⇒ erro "arquivo grande demais").
- [ ] **Step 2:** `npm run test:logic -- src/lib/profile.test.js` → FAIL. **Step 3:** implementar; `craftCategoryOf` reusa `ALLOWED.CRAFT_CATEGORIES` e uma tabela de lojas local (comentário: espelha `migrateRrr`; teste na Task 2 compara contra o catálogo real).
- [ ] **Step 4:** PASS. **Mutações:** `min`/`max` exclusivos (`<` em vez de `≤`); `on` truthy em vez de `=== true`; esquecer a troca min>max; fallback de loja removido (derruba o caso Royal); ocultar quando `rules` vazio; mutar a entrada. **Step 5: Commit** `feat: núcleo do perfil do crafter (IDEIA-064)`.

### Task 2: números do catálogo real
**Files:** Create `profile.real.test.js` (project `logic`).
- [ ] **Step 1: testes falhando** (`setCatalog(cat)` com o JSON real; `searchItems`/`allItems`):
```js
it('dossiê §4 recalculado: espada T4-T6 = 24; armadura de placa T4-T5 = 18 (16 por cc + 2 Royal); união = 42 de 2.166 (1,94%)', () => {
  const rules = [{ cat: 'sword', min: 4, max: 6 }, { cat: 'plate_armor', min: 4, max: 5 }];
  const items = cat.items.filter((i) => i.r);
  expect(items.length).toBe(2166);
  const by = (c) => items.filter((i) => matchesProfile(i, { on: true, rules: [{ cat: c, min: 4, max: c === 'sword' ? 6 : 5 }] }));
  expect(by('sword')).toHaveLength(24);
  expect(by('plate_armor')).toHaveLength(18);
  expect(profileCount(cat.items, { on: true, rules })).toEqual({ shown: 42, total: 2166 });
});
it('coerência da tabela de lojas com o catálogo: para os itens com cc válido, craftCategoryOf === cc (1.250 itens); os 45 sem cc que a loja resolve são só *_ROYAL, capas e consumíveis sem cc', () => {});
```
(o segundo `it`: contagens 1.250 e 45, e `cc` de recurso (`wood`, `rock`…) ⇒ resolvido pela loja ⇒ `null`.) **Se o catálogo for regenerado e os números mudarem, o teste deve falhar** (é o alarme; atualizar junto com o dossiê).
- [ ] **Steps 2–5:** FAIL → (nada a implementar se a Task 1 está certa; ajustar a tabela de lojas se o teste de coerência acusar) → PASS → **Commit** `test: perfil contra o catálogo real (IDEIA-064)`.

### Task 3: busca com filtro
**Files:** Modify `catalog.js` (`searchItems` + opção `filter`), `catalog.test.js`, `ui.jsx` (`ItemPicker`), `ItemSelector.jsx`.
- [ ] **Step 1: testes falhando:** `searchItems('espada', { onlyCraftable: true, filter: (it) => it.t === 4 })` só devolve T4; o `filter` é aplicado **antes** do `limit` (com `limit: 3` e 30 espadas, 3 itens do filtro, não "3 menos os rejeitados"); `filter` que lança ⇒ trata o item como fora (sem exceção); sem `filter` ⇒ resultado **idêntico** ao de antes (regressão: os testes existentes de `searchItems` ficam intactos). `ItemPicker` (jsdom): com `filter`, o item fora do filtro não aparece na lista aberta.
- [ ] **Steps 2–5:** FAIL → implementar (`if (filter && !safe(filter, it)) continue;` antes de contar) → PASS → **Commit** `feat: filtro opcional na busca de item (IDEIA-064)`.

### Task 4: esquema salvo e leitura do `settings`
**Files:** Modify `persistSchemas.js`, `persistSchemas.test.js`.
- [ ] **Step 1: testes falhando:** `settings` aceita `profile: { on: true, rules: [...] }` e **preserva** o objeto (passthrough); `loadPersisted` de `settings` com `profile: 'x'`, `profile: null`, `profile: [1]` **não** derruba `server`/`premium` (o campo é mantido como veio, quem limpa é `cleanProfile`); estado **antigo** (`settings` sem `profile`) ⇒ `getSettings().profile === undefined` e `cleanProfile(undefined)` desligado; `setSettings({ profile })` grava e recarrega igual (ida e volta pelo `localStorage`); "Restaurar configurações" já apaga `albion:settings` (teste existente de `resetState` continua verde).
- [ ] **Steps 2–5:** FAIL → adicionar `profile: 'passthrough'` → PASS; `contract.test.js` **não muda** (não é chave de tela). **Commit** `feat: perfil guardado em settings (IDEIA-064)`.

### Task 5: cartão do perfil (jsdom)
**Files:** Create `ProfileCard.test.jsx`, `ProfileCard.jsx`. Props: `{ profile, onChange(next), counts }`.
- [ ] **Step 1: testes falhando:** recolhido por padrão (`<details>` fechado); marcar "Espada" e escolher T4–T6 chama `onChange` com `{ on, rules: [{cat:'sword',min:4,max:6}] }`; **Ligar filtro**/**Mostrar tudo** alternam `on` sem apagar as regras; sem regras e `on:true` ⇒ aviso "Marque ao menos uma categoria"; resumo "Filtro ativo: 42 de 2.166 itens craftáveis." a partir de `counts`; texto de honestidade contém "não verifica", "não muda nenhum cálculo" e "não lê o seu personagem"; **Exportar** mostra o JSON; **Importar** com texto inválido mostra o erro e **não** chama `onChange`; importar JSON com 1 regra inválida chama `onChange` e mostra "1 regra(s) inválida(s) ignorada(s)"; selects de tier só oferecem T3 a T8; `min > max` digitado é corrigido na hora.
- [ ] **Steps 2–5:** FAIL → implementar (sem lógica de filtro aqui) → PASS → **Commit** `feat: cartão Meu perfil de crafter (IDEIA-064)`.

### Task 6: ligar no Craft (jsdom; mocks de `usePrices`/`useHistory` como `Crafting.targetNoTax.test.jsx`)
**Files:** Create `Crafting.profile.test.jsx`; Modify `Crafting.jsx`.
- [ ] **Step 1: testes falhando:** sem `settings.profile` (**estado antigo**): busca idêntica à de hoje, cartão recolhido, resumo "Mostrando todos os itens."; com `setSettings({ profile: { on: true, rules: [{cat:'sword',min:4,max:6}] } })`: digitar "espada" lista só T4 a T6 (T7/T8 ausentes) e a nota "Busca filtrada pelo seu perfil" aparece; item salvo `T7_MAIN_SWORD` fora do perfil **continua selecionado** e mostra "fora do seu perfil"; **Mostrar tudo** devolve a busca completa; `profile` **corrompido** (`'x'`, `[1]`, regra com `min: 99`) ⇒ tela normal sem erro (tratado como desligado ou regra descartada); nenhum campo de `craft:cfg` muda (`localStorage['albion:craft:cfg']` igual antes e depois).
- [ ] **Steps 2–4:** implementar: `const { profile: rawProfile } = useSettings(); const profile = cleanProfile(rawProfile);` passa `filter={(it) => matchesProfile(it, profile)}` ao `ItemSelector`; `<ProfileCard>` logo abaixo, dentro do mesmo cartão. `npm run test:ui` verde. **Step 5: Commit** `feat: perfil do crafter filtra a busca do Craft (IDEIA-064)`.

### Task 7: conferência manual e README
- [ ] Manual (Executor registra): perfil com espada T4–T6 + armadura de placa T4–T5; busca "armadura" mostra as Royal; recarregar mantém o perfil; **Restaurar configurações** o apaga; exportar, limpar, importar volta igual; 375 px: o cartão não estoura. **Commit** `docs: conferência da 064`.

## Como o Tester valida
1. **Casos concretos:** 24 · 18 · 42 de 2.166 (1,94 %); T4_MAIN_SWORD visível, T7 e `T4_ARMOR_CLOTH_SET1` ocultos; Royal incluída; capas de cidade/artefatos ocultos com o filtro e visíveis sem; ida e volta do JSON.
2. **Mutações** das Tasks 1 e 3 (cópia fora do repo): sobrevivente reprova.
3. **Estado antigo/corrompido:** `settings` sem `profile`, com `profile` lixo (perfis C1 a C10 do laudo 070); perfil importado com categorias inexistentes; `min`/`max` fora de faixa; 1 MB de texto; o item salvo fora do perfil.
4. **Isolamento:** o perfil **não** altera `craft:cfg` nem nenhum preço/custo/lucro (comparar a tela com e sem perfil para o mesmo item: números iguais).
5. **Honestidade:** o cartão diz que não verifica desbloqueios (P4) e não lê o personagem (P5). **O que o usuário estranharia:** o item ativo sumir da tela ao ligar o filtro; busca vazia sem explicar; "Mostrar tudo" que apaga as regras; perfil perdido ao recarregar.

## Riscos
1. **Tabela de lojas duplicada** (`migrateRrr` e `profile.js`): coberta pelo teste de coerência com o catálogo real; se divergirem, quem muda o catálogo vê o teste cair.
2. **`searchItems` é quente** (busca a cada tecla): o `filter` é um predicado barato; `allItems()` tem ~2.200 itens; sem medição extra necessária (Tester confere ≤ 16 ms por busca manualmente).
3. **`settings` compartilhado entre abas do navegador:** `setSettings` já notifica ouvintes; duas abas abertas sobrescrevem uma à outra (comportamento já existente do app).
4. **Escopo menor que o dossiê:** (a)(b)(c)(e) ficam para depois (perguntas 1 a 3).

## Critério de pronto
`npm run check` verde sem alterar teste existente; mutações derrubadas; os 3 números 24/18/42 cobertos; só os arquivos listados alterados; **nenhuma chave `usePersisted` nova** (as 9 do código seguem as mesmas); conferência manual registrada.

## PERGUNTAS PARA O GERENTE
1. **Escopo:** só o filtro de itens (d) agora; centralizar Premium, foco/dia, taxa por cidade e cidade-base (a)(b)(e) fica para uma ideia própria. Aprova? (Migrar campos hoje espalhados pode mudar o estado salvo.)
2. **Níveis de especialização** (c): os coeficientes divergem entre ferramentas (P2); a 002 já guarda a eficiência no cartão Foco. Esperamos a medição do usuário antes de qualquer perfil de níveis?
3. **Royal sem `cc`** entra pela categoria de loja (42 itens em vez de 40 do dossiê, que contava só por `cc`). Confirma a decisão?
4. **Itens sem categoria** (artefatos, capas de cidade, recursos refinados) ficam ocultos com o filtro ligado. Prefere sempre visíveis?
5. **Filtro também no Flipper e na Calculadora de RRR** (que usa o mesmo `ItemSelector`)? Aqui só o Craft.
6. **Exportar/importar** por caixa de texto (copiar e colar) em vez de arquivo: ok?
