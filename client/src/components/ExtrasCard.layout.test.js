// IDEIA-076 (D2): layout da linha de despesa. O jsdom não calcula layout: o teste lê o CSS como texto
// (a medida real a 375 px é conferida no navegador).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');

describe('ExtrasCard: CSS da linha de despesa', () => {
  it('a grade da linha de despesa tem 4 colunas no desktop', () => {
    expect(css).toMatch(/\.extra-row\s*\{[^}]*grid-template-columns:[^;}]*auto/);
  });
  it('até 560 px o nome ocupa a primeira linha inteira e valor, escopo e remover ficam na segunda (3 colunas)', () => {
    const m = css.match(/@media \(max-width: 560px\)\s*\{[^@]*\.extra-row\s*\{([^}]*)\}[^@]*\.extra-row \.extra-name\s*\{([^}]*)\}/);
    expect(m).not.toBeNull();
    expect(m[1]).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)\s+auto/);
    expect(m[2]).toMatch(/grid-column:\s*1\s*\/\s*-1/);
  });
});
