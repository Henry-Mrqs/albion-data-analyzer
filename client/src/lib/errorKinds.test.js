import { describe, expect, it } from 'vitest';
import { isChunkLoadError } from './errorKinds';

describe('isChunkLoadError (IDEIA-071)', () => {
  it('reconhece as mensagens reais de Chrome, Firefox, Safari e webpack', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/Refining-abc.js'))).toBe(true);
    expect(isChunkLoadError(new Error('error loading dynamically imported module: https://x/a.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('Loading chunk 5 failed.'))).toBe(true);
    expect(isChunkLoadError({ name: 'ChunkLoadError' })).toBe(true);
  });
  it('falso para erros comuns e valores sem mensagem', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of null'))).toBe(false);
    expect(isChunkLoadError(new RangeError('Maximum call stack'))).toBe(false);
    for (const v of [null, undefined, 'texto', 42, {}, { foo: 1 }]) expect(isChunkLoadError(v)).toBe(false);
  });
});
