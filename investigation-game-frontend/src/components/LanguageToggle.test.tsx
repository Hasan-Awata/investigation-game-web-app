import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import LanguageToggle from './LanguageToggle';

describe('LanguageToggle', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('ar');
  });

  it('switches language, persists it, and updates document direction', async () => {
    render(<LanguageToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Switch to English' }));

    await waitFor(() => {
      expect(i18n.resolvedLanguage).toBe('en');
      expect(localStorage.getItem('app_lang')).toBe('en');
      expect(document.documentElement.lang).toBe('en');
      expect(document.documentElement.dir).toBe('ltr');
    });
  });
});
