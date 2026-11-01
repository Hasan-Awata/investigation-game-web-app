import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('@/pages/MainMenu/MainMenu', () => ({ default: () => <div>Case discovery</div> }));
vi.mock('@/pages/GameRoom/GameRoom', () => ({ default: () => <div>Investigation</div> }));
vi.mock('@/pages/Admin/components/AdminGuard', () => ({ default: () => null }));
vi.mock('@/pages/Admin/AdminDashboard', () => ({ default: () => null }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/components/LanguageToggle', () => ({ default: () => null }));

afterEach(() => { localStorage.clear(); vi.unstubAllGlobals(); });

it('enters case discovery immediately after successful login without reloading', async () => {
  localStorage.clear();
  const user = { id: 1, username: 'launch', email: 'launch@example.test', XP: 50, is_admin: false };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ user, token: 'synthetic-token' })));
  render(<App />);
  fireEvent.change(screen.getByPlaceholderText('pages.auth.emailPlaceholder'), { target: { value: user.email } });
  fireEvent.change(screen.getByPlaceholderText('pages.auth.passwordPlaceholder'), { target: { value: 'synthetic-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'pages.auth.loginBtn' }));
  await waitFor(() => expect(screen.getByText('Case discovery')).toBeInTheDocument());
  expect(localStorage.getItem('auth_token')).toBe('synthetic-token');
});
