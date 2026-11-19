// Sem globals do Vitest o Testing Library não limpa a tela sozinho.
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(cleanup);
