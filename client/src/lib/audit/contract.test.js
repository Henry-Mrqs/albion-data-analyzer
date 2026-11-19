// IDEIA-005: contrato de registro. Campo salvo (esquema, padrão ou set({...}) da tela) sem linha no auditor REPROVA, nomeando o campo.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PERSISTED } from '../persistSchemas';
import { CURRENT_DEFAULTS } from '../../test/savedStates';
import { setFields } from '../../test/setFields';
import { getScreen, screenIds, uncoveredFields } from './registry';
import './craft';

const COMP = join(import.meta.dirname, '..', '..', 'components');
const read = (f) => readFileSync(join(COMP, f), 'utf8');

// arquivos de componente cujos set({...}) gravam em cada chave (FocusCard grava focusEff... no cfg do Craft e do Refino)
const SET_FILES = {
  'craft:cfg': ['Crafting.jsx', 'FocusCard.jsx'],
  'refine:cfg': ['Refining.jsx', 'FocusCard.jsx'],
  'rrr:cfg': ['RrrCalculator.jsx'],
  'target:cfg': ['TargetPrice.jsx'],
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
