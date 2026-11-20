// IDEIA-065: linha "Preço de saída realista" do auditor e a linha "Saída" com o preço listado.
import { beforeEach, describe, expect, it } from 'vitest';
import { loadFixtureCatalog } from '../../test/helpers';
import { assembleCraft } from '../../test/auditKit';
import { auditCraft } from './craft';

beforeEach(loadFixtureCatalog);
const get = (out, id) => out.rows.find((r) => r.id === id);
const audit = (opts) => auditCraft(assembleCraft({ scenario: 'anchored', ...opts }).input);

describe('auditor: preço de saída realista (065)', () => {
  it('ligado com k e N padrão: não confirmada, 1 saída ancorada, escolhas do app sem fonte', () => {
    const r = get(audit(), 'anchor');
    expect(r).toMatchObject({ status: 'unconfirmed', value: 'ligado (k 1.25, N 7)' });
    expect(r.note).toContain('1 saída(s) com preço ancorado');
    expect(r.note).toContain('escolhas do app, sem fonte');
  });
  it('a linha Saída mostra o preço LISTADO e diz que o lucro usa o realista', () => {
    const e = get(audit(), 'exit');
    expect(e.value).toBe(12000);
    expect(e.note).toContain('o lucro usa o preço realista 7.886');
  });
  it('desligado: aplicada, lucro usa o listado', () => {
    const out = audit({ over: { anchorOn: false } });
    expect(get(out, 'anchor')).toMatchObject({ status: 'applied', value: 'desligado' });
    expect(get(out, 'exit').note ?? '').not.toContain('preço realista');
  });
  it('k digitado: aplicada; k inválido mostra a correção', () => {
    expect(get(audit({ over: { anchorK: '1.5' } }), 'anchor').status).toBe('applied');
    expect(get(audit({ over: { anchorK: 'abc' } }), 'anchor').note).toContain('corrigido de abc para 1.25');
  });
  it('sem histórico (cenário comum): "histórico não carregado"', () => {
    const r = get(auditCraft(assembleCraft().input), 'anchor');
    expect(r.note).toContain('histórico não carregado: usando o listado');
  });
});
