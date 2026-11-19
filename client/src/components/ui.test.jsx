import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Money } from './ui';

describe('ambiente de componente', () => {
  it('o projeto ui tem DOM e localStorage', () => {
    expect(document.body).toBeDefined();
    localStorage.setItem('a', '1');
    expect(localStorage.getItem('a')).toBe('1');
    render(<Money value={1234} />);
    expect(screen.getByText('1.234')).toBeTruthy();
  });
});
