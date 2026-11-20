// IDEIA-059: linha "Atualizações da ordem de venda" do auditor (Craft e Refino).
import { beforeEach, describe, expect, it } from 'vitest';
import { loadFixtureCatalog } from '../../test/helpers';
import { assembleCraft, assembleRefine } from '../../test/auditKit';
import { auditCraft } from './craft';
import { auditRefine } from './refine';

beforeEach(loadFixtureCatalog);
const get = (out, id) => out.rows.find((r) => r.id === id);

describe('auditor: atualizações da ordem (059)', () => {
  it('Craft: 0 atualizações = aplicada; com 3 = não confirmada, base citada e escopo honesto', () => {
    const a0 = get(auditCraft(assembleCraft().input), 'relist');
    expect(a0).toMatchObject({ status: 'applied', value: 0 });
    const a3 = get(auditCraft(assembleCraft({ over: { relists: '3', relistStep: '10' } }).input), 'relist');
    expect(a3).toMatchObject({ status: 'unconfirmed', value: 3 });
    expect(a3.note).toContain('NÃO confirmada em fonte');
    expect(a3.note).toContain('não considera expiração da ordem');
  });
  it('Craft: saída sem imposto: nota diz que não se aplica', () => {
    const r = get(auditCraft(assembleCraft({ over: { relists: '3', noTax: { 'Caerleon|order': true } } }).input), 'relist');
    expect(r.note).toContain('não se aplica à melhor saída');
  });
  it('Refino: linha presente; "abc" vira 0 com nota de correção', () => {
    expect(get(auditRefine(assembleRefine().input), 'relist')).toMatchObject({ status: 'applied', value: 0 });
    const bad = get(auditRefine(assembleRefine({ over: { relists: 'abc' } }).input), 'relist');
    expect(bad.value).toBe(0);
    expect(bad.note).toContain('corrigido de abc para 0');
  });
});
