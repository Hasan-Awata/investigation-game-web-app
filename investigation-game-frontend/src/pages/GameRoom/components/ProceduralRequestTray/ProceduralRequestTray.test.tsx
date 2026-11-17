import { fireEvent, render, screen, within } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import ProceduralRequestTray from './ProceduralRequestTray';
import english from '@/locales/en/translation.json';
import arabic from '@/locales/ar/translation.json';

async function setup(overrides: Partial<ComponentProps<typeof ProceduralRequestTray>> = {}, language = 'en') {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({ lng: language, resources: { en: { translation: english }, ar: { translation: arabic } } });
  const props: ComponentProps<typeof ProceduralRequestTray> = {
    accumulatedEvidences: [], accumulatedCharacters: [], trayEvidences: [], trayCharacters: [],
    selectedRequestId: null, selectRequest: vi.fn(), completedRequestIds: [12],
    proceduralRequests: [
      { id: 12, title: 'Archive', request_type: 'phone_records' },
      { id: 10, title: 'The workshop and its unusually long descriptive title', request_type: 'search_warrant' },
      { id: 11, title: 'Recovered sample report', request_type: 'dna_test' },
    ],
    isRoomActive: true, removeItem: vi.fn(), isSubmitting: false, submitRequest: vi.fn(), ...overrides,
  };
  return { ...render(<I18nextProvider i18n={i18n}><ProceduralRequestTray {...props} /></I18nextProvider>), props };
}

it('shows named requests immediately, disables approved rows, and requires explicit selection', async () => {
  const { props } = await setup();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  const target = screen.getByRole('button', { name: /The workshop/ });
  expect(target).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(target);
  expect(props.selectRequest).toHaveBeenCalledWith(10);
  expect(screen.getByRole('button', { name: /DNA test/ })).toBeEnabled();
  expect(screen.getByText('Recovered sample report')).toBeVisible();
  expect(screen.queryByText(/REQ-\d+/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Archive.*Approved/ })).toBeDisabled();
  const groups = screen.getAllByRole('list');
  expect(groups).toHaveLength(2);
  expect(within(groups[0]).getAllByRole('button')).toHaveLength(2);
  expect(within(groups[1]).getByRole('button', { name: /Archive.*Approved/ })).toBeDisabled();
  expect(screen.getByRole('separator')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
});

it('exposes selected state, accessible removal, and the Apply action for a complete draft', async () => {
  const { props } = await setup({ selectedRequestId: 10, trayEvidences: [7], trayCharacters: [9] });
  expect(screen.getByRole('button', { name: /The workshop/ })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /The workshop/ })).toHaveFocus();
  const remove = screen.getByRole('button', { name: 'Remove Unknown file from tray' });
  fireEvent.click(remove);
  expect(props.removeItem).toHaveBeenCalledWith(7, 'evidence');
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(props.submitRequest).toHaveBeenCalledOnce();
});

it('locks selection and editing during submission and announces review with a visual indicator', async () => {
  await setup({ selectedRequestId: 10, trayEvidences: [7, 8], isSubmitting: true });
  for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Reviewing analysis…');
  expect(within(screen.getByRole('button', { name: 'Reviewing analysis…' })).getByText('', { selector: '[data-notification-icon="loading"]' })).toBeInTheDocument();
});

it('provides an empty state and localized Arabic request controls', async () => {
  const view = await setup({ proceduralRequests: [] }, 'ar');
  expect(screen.getByText(arabic.pages.gameRoom.evidence.board.noAvailableRequests)).toBeVisible();
  expect(screen.getByRole('button', { name: 'الحصول على تصريح' })).toBeDisabled();
  view.unmount();
  await setup({}, 'ar');
  expect(screen.getByRole('button', { name: /تحليل الحمض النووي/ })).toBeEnabled();
  expect(screen.getByText('استدعاء سجلات الهاتف')).toBeVisible();
});
