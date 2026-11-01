import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import AdminGuard from './AdminGuard';
import { requestBlob } from '@/services/request';

vi.mock('@/hooks/useAuth', () => ({ useAuthSession: () => ({ data: { id: 1, is_admin: true } }) }));
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

it('removes loaded admin content on download denial while retaining login', async () => {
  localStorage.setItem('auth_token', 'valid');
  const client = new QueryClient();
  client.setQueryData(['adminCases'], [{ id: 1 }]);
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/admin']}><Routes><Route path="/admin" element={<AdminGuard />}><Route index element={<button>Edit protected case</button>} /></Route></Routes></MemoryRouter></QueryClientProvider>);
  expect(await screen.findByText('Edit protected case')).toBeInTheDocument();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ message: 'Admin access required.' }, { status: 403 })));
  await act(async () => { await requestBlob('/admin/cases/1/export'); });
  expect(screen.getByRole('alert')).toHaveTextContent('Admin access required.');
  expect(screen.queryByText('Edit protected case')).toBeNull();
  expect(client.getQueryData(['adminCases'])).toBeUndefined();
  expect(localStorage.getItem('auth_token')).toBe('valid');
});
