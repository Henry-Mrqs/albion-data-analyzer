// IDEIA-005: contrato de registro. Campo salvo (esquema, padrão ou set({...}) da tela) sem linha no auditor REPROVA, nomeando o campo.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PERSISTED } from '../persistSchemas';
import { CURRENT_DEFAULTS } from '../../test/savedStates';
import { setFields } from '../../test/setFields';
import { getScreen, screenIds, uncoveredFields, uncoveredKeys, uncoveredTabs } from './registry';
import { TAB_AUDIT, UNAUDITED } from './tabs';
import './craft';
import './refine';
import './rrr';
import './premium';

const COMP = join(import.meta.dirname, '..', '..', 'components');
const read = (f) => readFileSync(join(COMP, f), 'utf8');

// arquivos de componente cujos set({...}) gravam em cada chave (FocusCard grava focusEff... no cfg do Craft e do Refino)
const SET_FILES = {
  'craft:cfg': ['Crafting.jsx', 'FocusCard.jsx'],
  'refine:cfg': ['Refining.jsx', 'FocusCard.jsx'],
  'rrr:cfg': ['RrrCalculator.jsx'],
  'target:cfg': ['TargetPrice.jsx'],
  'premium:cfg': ['Premium.jsx'],
};

/** Todo campo que a chave pode guardar: esquema ∪ padrões ∪ campos de set({...}) dos arquivos da tela. */
function savedFieldsOf(cfgKey) {
  const out = new Set([...Object.keys(PERSISTED[cfgKey].schema), ...Object.keys(CURRENT_DEFAULTS[cfgKey])]);
  for (const f of SET_FILES[cfgKey] ?? []) for (const x of setFields(read(f))) out.add(x);
  return [...out];
}

describe('setFields (movido de persistSchemas.test.js)', () => {
  it('enxerga craftCity, feeSet, craftDaily e waitCost em Crafting.jsx, e os campos de foco em FocusCard.jsx', () => {
    const f = setFields(read('Crafting.jsx'));
    for (const x of ['craftCity', 'feeSet', 'craftDaily', 'waitCost']) expect(f.has(x), x).toBe(true);
    const g = setFields(read('FocusCard.jsx'));
    for (const x of ['focusEff', 'focusPoints', 'focusBudget', 'focusRef']) expect(g.has(x), x).toBe(true);
  });
  it('o conjunto de campos salvos inclui o que só existe por set({...}) (feeSet) e o esquema de target:cfg', () => {
    expect(savedFieldsOf('craft:cfg')).toEqual(expect.arrayContaining(['feeSet', 'craftDailyAt', 'focusEff', 'noTax', 'extras']));
    expect(savedFieldsOf('target:cfg').sort()).toEqual(['goal', 'margin', 'mode', 'profit', 'relists']);
  });
});

describe('contrato do auditor: cada campo salvo tem linha (ou motivo em ignoredFields)', () => {
  it('campo novo sem linha reprova, nomeando o campo e a tela (esquema falso injetado)', () => {
    const def = { cfgKeys: ['craft:cfg'], ignoredFields: {}, vars: [{ fields: savedFieldsOf('craft:cfg') }] };
    const fake = { 'craft:cfg': [...savedFieldsOf('craft:cfg'), 'campoNovoDaIdeiaX'] };
    const missing = uncoveredFields('craft', def, fake);
    expect(missing).toEqual([{ screen: 'craft', cfgKey: 'craft:cfg', field: 'campoNovoDaIdeiaX' }]);
  });

  it('campo em ignoredFields com motivo passa; var que cobre o campo passa', () => {
    const d = { cfgKeys: ['k'], ignoredFields: { velho: 'legado, nunca mais gravado' }, vars: [{ fields: ['a'] }] };
    expect(uncoveredFields('t', d, { k: ['a', 'velho'] })).toEqual([]);
  });

  it('as telas registradas são craft, premium, refine, rrr; Craft e Refino cobrem também target:cfg (o cartão Preço-alvo mora nelas)', () => {
    expect(screenIds().sort()).toEqual(['craft', 'premium', 'refine', 'rrr']);
    expect(getScreen('craft').cfgKeys).toEqual(['craft:cfg', 'target:cfg']);
    expect(getScreen('refine').cfgKeys).toEqual(['refine:cfg', 'target:cfg']);
    expect(getScreen('rrr').cfgKeys).toEqual(['rrr:cfg']);
    expect(getScreen('premium').cfgKeys).toEqual(['premium:cfg']);
    // os campos de target:cfg que o contrato vigia (se alguém tirar target:cfg do registro, o teste acima reprova)
    expect(savedFieldsOf('target:cfg').sort()).toEqual(['goal', 'margin', 'mode', 'profit', 'relists']);
  });

  it('o contrato falha de verdade com target:cfg: campo novo do Preço-alvo sem linha reprova nas duas telas', () => {
    for (const id of ['craft', 'refine']) {
      const def = getScreen(id);
      const fields = Object.fromEntries(def.cfgKeys.map((k) => [k, savedFieldsOf(k)]));
      fields['target:cfg'] = [...fields['target:cfg'], 'campoNovoDoAlvo'];
      expect(uncoveredFields(id, def, fields)).toEqual([{ screen: id, cfgKey: 'target:cfg', field: 'campoNovoDoAlvo' }]);
    }
  });

  for (const id of screenIds()) {
    it(`tela "${id}": nenhum campo de ${getScreen(id).cfgKeys.join(', ')} fica sem linha`, () => {
      const def = getScreen(id);
      const fieldsByKey = Object.fromEntries(def.cfgKeys.map((k) => [k, savedFieldsOf(k)]));
      const missing = uncoveredFields(id, def, fieldsByKey);
      expect(
        missing,
        `campos sem linha no auditor: ${missing.map((m) => `${m.cfgKey}.${m.field} (tela ${m.screen})`).join(', ')}. Acrescente um Var com o campo em fields (ou ignoredFields com motivo) em lib/audit/${id}.js`,
      ).toEqual([]);
    });
  }
});

describe('contrato do auditor: chave salva e aba sem tela (IDEIA-086)', () => {
  const screens = () => screenIds().map(getScreen);
  it('CONTRATO REAL: toda chave de PERSISTED está numa tela registrada ou em UNAUDITED', () => {
    const miss = uncoveredKeys(Object.keys(PERSISTED), screens(), UNAUDITED);
    expect(miss, `chave salva sem tela no auditor: ${miss.join(', ')}. Registre a tela (registerScreen) ou acrescente em UNAUDITED com motivo em lib/audit/tabs.js`).toEqual([]);
  });
  it('mutação: uma chave nova em PERSISTED reprova nomeando a chave', () => {
    expect(uncoveredKeys([...Object.keys(PERSISTED), 'zz:nova'], screens(), UNAUDITED)).toEqual(['zz:nova']);
  });
  it('CONTRATO REAL: toda aba de App.jsx (TABS) está em TAB_AUDIT; o teste lê os ids do texto de App.jsx', () => {
    const app = readFileSync(join(import.meta.dirname, '..', '..', 'App.jsx'), 'utf8');
    const ids = [...app.matchAll(/\{ id: '([a-z]+)', label:/g)].map((m) => m[1]);
    expect(ids).toEqual(['market', 'refining', 'crafting', 'flipper', 'rrr', 'premium']); // se a lista mudar, revise o auditor
    const miss = uncoveredTabs(ids, TAB_AUDIT, screenIds());
    expect(miss, `aba sem tela no auditor: ${miss.join(', ')}`).toEqual([]);
  });
  it('mutação: se TAB_AUDIT perde "premium", o contrato reprova nomeando premium', () => {
    const sem = { ...TAB_AUDIT };
    delete sem.premium;
    expect(uncoveredTabs(Object.keys(TAB_AUDIT), sem, screenIds())).toEqual(['premium']);
  });
});
