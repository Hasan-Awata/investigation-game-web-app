import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TemplateRenderer from './TemplateRenderer';
import { latestTemplates, readTemplate } from './catalog';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'ar' } }) }));

describe('paper evidence templates', () => {
  it('discovers Background Check for both paper types and renders saved mixed-script values in Arabic', async () => {
    expect(latestTemplates('document').map(entry => entry.id)).toContain('background_check');
    expect(latestTemplates('forensic').map(entry => entry.id)).toContain('background_check');
    expect(latestTemplates('audio')).toEqual([]);

    render(<TemplateRenderer template={{ id: 'background_check', version: 1, values: {
      subject: 'ناصر حداد — Nasser Haddad', arrests: [{ description: '41-S' }],
    } }} />);

    const heading = await screen.findByRole('heading', { name: 'التحقق من الخلفية' });
    expect(heading.closest('[lang]')).toHaveAttribute('dir', 'rtl');
    const table = screen.getByRole('table', { name: 'سجل التوقيف والأحكام' });
    expect(within(table).getByRole('cell', { name: '41-S' })).toBeInTheDocument();
    expect(screen.getAllByText('ناصر حداد — Nasser Haddad').some(entry => entry.closest('article'))).toBe(true);
  });

  it('renders the expanded identity, sentence and fingerprint fields on the mirrored sheet', async () => {
    expect(latestTemplates('document').find(entry => entry.id === 'background_check')?.version).toBe(2);

    render(<TemplateRenderer template={{ id: 'background_check', version: 2, values: {
      subject: 'ناصر حداد',
      record_id: '051H42',
      aliases: 'أبو نائل',
      arrests: [{ description: 'Charge 41-S', offense_code: '41-S', institution: 'Central Court', term: '6 months' }],
      right_thumb: 'blob:thumb',
      notes: 'ملاحظة من الملف',
    } }} />);

    const heading = await screen.findByRole('heading', { name: 'التحقق من الخلفية' });
    const sheet = within(heading.closest('article')!);
    expect(heading.closest('[lang]')).toHaveAttribute('dir', 'rtl');
    expect(sheet.getByText('أبو نائل')).toBeInTheDocument();
    expect(sheet.getByText('051H42')).toBeInTheDocument();
    expect(sheet.getByRole('columnheader', { name: 'رمز الجريمة' })).toBeInTheDocument();
    expect(sheet.getByRole('cell', { name: 'Central Court' })).toBeInTheDocument();
    expect(sheet.getByRole('cell', { name: '6 months' })).toBeInTheDocument();
    expect(sheet.getByRole('img', { name: 'الإبهام الأيمن' })).toHaveAttribute('src', 'blob:thumb');
    expect(sheet.getByText('ملاحظة من الملف')).toBeInTheDocument();
  });

  it('shows the localized fallback for an unavailable saved version', () => {
    render(<TemplateRenderer template={{ id: 'background_check', version: 999, values: { subject: 'Saved subject' } }} />);
    expect(screen.getByRole('status')).toHaveTextContent('تعذّر فتح هذا المستند.');
  });

  it('reads empty field maps from the API and rejects a list of field values', () => {
    const template = { id: 'background_check', version: 1 };
    expect(readTemplate({ template: { ...template, values: [] } })).toEqual({ ...template, values: {} });
    expect(readTemplate({ template: { ...template, values: ['Unexpected field'] } })).toBeUndefined();
  });
});
