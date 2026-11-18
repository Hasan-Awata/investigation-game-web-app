import { fireEvent, render, screen, within } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { expect, it, vi } from 'vitest';
import { useState, type ComponentProps } from 'react';
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
    isRequestListExpanded: false, onRequestListExpandedChange: vi.fn(),
    isRoomActive: true, removeItem: vi.fn(), isSubmitting: false, submitRequest: vi.fn(), ...overrides,
  };
  function ControlledTray() {
    const [expanded, setExpanded] = useState(props.isRequestListExpanded);
    return <ProceduralRequestTray {...props} isRequestListExpanded={expanded} onRequestListExpandedChange={setExpanded} />;
  }
  return { ...render(<I18nextProvider i18n={i18n}><ControlledTray /></I18nextProvider>), props };
}

it('distinguishes evidence and people and lets players reveal the full tray title', async () => {
  const title = 'The recovered recording from the far side of the old workshop';
  await setup({
    accumulatedEvidences: [{ id: 7, case_id: 1, title, evidence_type: 'audio', is_initial: true, is_vital_for_conviction: false }],
    trayEvidences: [7], trayCharacters: [9],
  });

  const [evidenceRow, personRow] = screen.getAllByRole('listitem');
  expect(evidenceRow.querySelector('[data-notification-icon="evidenceRecovered"]')).toBeInTheDocument();
  expect(personRow.querySelector('[data-notification-icon="personOfInterest"]')).toBeInTheDocument();
  expect(within(evidenceRow).getByText('Evidence:')).toBeInTheDocument();
  expect(within(personRow).getByText('Person:')).toBeInTheDocument();
  const summary = within(evidenceRow).getByText(title).closest('summary')!;
  const details = summary.closest('details');
  expect(details).not.toHaveAttribute('open');
  fireEvent.click(summary);
  expect(details).toHaveAttribute('open');
  expect(within(evidenceRow).getByRole('button', { name: `Remove ${title} from tray` })).toBeEnabled();
});

it('hides requests until expanded, disables approved rows, and requires explicit selection', async () => {
  const { props } = await setup();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  const disclosure = screen.getByRole('button', { name: 'Requests' });
  expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
  const body = document.getElementById(disclosure.getAttribute('aria-controls')!);
  expect(body).not.toBeVisible();
  disclosure.focus();
  fireEvent.click(disclosure);
  expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  expect(disclosure).toHaveFocus();
  expect(body).toBeVisible();
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
  const { props } = await setup({ selectedRequestId: 10, trayEvidences: [7], trayCharacters: [9], isRequestListExpanded: true });
  expect(screen.getByRole('button', { name: /The workshop/ })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /The workshop/ })).toHaveFocus();
  const apply = screen.getByRole('button', { name: 'Apply' });
  expect(apply).toBeEnabled();
  fireEvent.click(apply);
  expect(props.submitRequest).toHaveBeenCalledOnce();
  const disclosure = screen.getByRole('button', { name: 'Requests' });
  disclosure.focus();
  fireEvent.click(disclosure);
  expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText(/The workshop/)).not.toBeInTheDocument();
  expect(apply).toBeDisabled();
  const remove = screen.getByRole('button', { name: 'Remove Unknown file from tray' });
  expect(screen.getByText('CH-009')).toBeVisible();
  fireEvent.click(remove);
  expect(props.removeItem).toHaveBeenCalledWith(7, 'evidence');
  fireEvent.click(disclosure);
  expect(disclosure).toHaveFocus();
});

it('locks selection and editing during submission and announces review with a visual indicator', async () => {
  await setup({ selectedRequestId: 10, trayEvidences: [7, 8], isSubmitting: true });
  const disclosure = screen.getByRole('button', { name: 'Requests' });
  expect(disclosure).toBeEnabled();
  fireEvent.click(disclosure);
  for (const button of screen.getAllByRole('button').filter(button => button !== disclosure)) expect(button).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Reviewing analysis…');
  expect(within(screen.getByRole('button', { name: 'Reviewing analysis…' })).getByText('', { selector: '[data-notification-icon="loading"]' })).toBeInTheDocument();
});

it('provides an empty state and localized Arabic request controls', async () => {
  const view = await setup({ proceduralRequests: [] }, 'ar');
  expect(screen.getByText(arabic.pages.gameRoom.evidence.board.noAvailableRequests)).toBeVisible();
  expect(screen.queryByRole('button', { name: arabic.pages.gameRoom.evidence.board.availableRequests })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'الحصول على تصريح' })).toBeDisabled();
  view.unmount();
  await setup({}, 'ar');
  fireEvent.click(screen.getByRole('button', { name: arabic.pages.gameRoom.evidence.board.availableRequests }));
  expect(screen.getByRole('button', { name: /تحليل الحمض النووي/ })).toBeEnabled();
  expect(screen.getByText('استدعاء سجلات الهاتف')).toBeVisible();
});
