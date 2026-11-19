import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Dois projects: a lógica pura roda em Node (rápido, sem DOM); os testes de componente (*.test.jsx) rodam em jsdom.
export default defineConfig({
  test: {
    projects: [
      { test: { name: 'logic', environment: 'node', include: ['src/**/*.test.js'] } },
      {
        plugins: [react()],
        test: { name: 'ui', environment: 'jsdom', include: ['src/**/*.test.jsx'], setupFiles: ['./src/test/setup-ui.js'] },
      },
    ],
  },
});
