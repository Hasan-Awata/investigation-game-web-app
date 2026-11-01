import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import en from '@/locales/en/translation.json';
import ar from '@/locales/ar/translation.json';
import Auth from './Auth';

const state = vi.hoisted(() => ({ seconds: 12 }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({
  isLogin: true, isLoading: false, error: null, retryAfterSeconds: state.seconds,
  email: 'player@example.test', password: 'secret', username: '', name: '',
  setEmail: vi.fn(), setPassword: vi.fn(), setUsername: vi.fn(), setName: vi.fn(),
  toggleAuthMode: vi.fn(), handleSubmit: vi.fn(),
}) }));
vi.mock('@/components/LanguageToggle', () => ({ default: () => null }));
afterEach(cleanup);

it.each(['en', 'ar'])('shows recoverable cooldown feedback in %s', async language => {
  state.seconds = 12;
  const i18n = createInstance();
  await i18n.init({ lng: language, resources: { en: { translation: en }, ar: { translation: ar } } });
  const view = () => <I18nextProvider i18n={i18n}><Auth onSuccess={vi.fn()} /></I18nextProvider>;
  const { container, rerender } = render(view());
  expect(screen.getByRole('status')).toHaveTextContent(language === 'en' ? 'Try again in 12 seconds' : '12 ثانية');
  expect(container.querySelector('button[type="submit"]')).toBeDisabled();
  expect(container.querySelector('input[type="email"]')).toHaveValue('player@example.test');
  state.seconds = 0;
  rerender(view());
  expect(screen.queryByRole('status')).toBeNull();
  expect(container.querySelector('button[type="submit"]')).toBeEnabled();
});
