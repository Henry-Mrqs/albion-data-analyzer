// IDEIA-086: o contrato reprova chave salva e aba sem tela no auditor.
import { describe, expect, it } from 'vitest';
import { uncoveredKeys, uncoveredTabs } from './registry';

describe('uncoveredKeys', () => {
  it('chave nova sem tela e sem motivo REPROVA nomeando a chave', () => {
    expect(uncoveredKeys(['craft:cfg', 'campo:novo'], [{ cfgKeys: ['craft:cfg'] }], {})).toEqual(['campo:novo']);
  });
  it('chave em unaudited com motivo passa; com motivo vazio reprova', () => {
    expect(uncoveredKeys(['x'], [], { x: 'motivo' })).toEqual([]);
    expect(uncoveredKeys(['x'], [], { x: '  ' })).toEqual(['x']);
    expect(uncoveredKeys(['x'], [], { x: '' })).toEqual(['x']);
  });
  it('entrada inválida não lança', () => {
    expect(uncoveredKeys(['x'], undefined, undefined)).toEqual(['x']);
  });
});

describe('uncoveredTabs', () => {
  it('aba ausente do mapa reprova; screen inexistente reprova; screen null sem reason reprova; com reason passa', () => {
    expect(uncoveredTabs(['a', 'b'], { a: { screen: 'craft' } }, ['craft'])).toEqual(['b']);
    expect(uncoveredTabs(['a'], { a: { screen: 'fantasma' } }, ['craft'])).toEqual(['a']);
    expect(uncoveredTabs(['a'], { a: { screen: null } }, [])).toEqual(['a']);
    expect(uncoveredTabs(['a'], { a: { screen: null, reason: '  ' } }, [])).toEqual(['a']);
    expect(uncoveredTabs(['a'], { a: { screen: null, reason: 'ok' } }, [])).toEqual([]);
  });
});
