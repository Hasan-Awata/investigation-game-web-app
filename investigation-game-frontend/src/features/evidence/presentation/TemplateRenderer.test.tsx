import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TemplateRenderer from './TemplateRenderer';
import { latestTemplates } from './catalog';

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
    const table = screen.getByRole('table', { name: 'سجل التوقيف' });
    expect(within(table).getByRole('cell', { name: '41-S' })).toBeInTheDocument();
    expect(screen.getAllByText('ناصر حداد — Nasser Haddad').some(entry => entry.closest('article'))).toBe(true);
  });

  it('shows the localized fallback for an unavailable saved version', () => {
    render(<TemplateRenderer template={{ id: 'background_check', version: 999, values: { subject: 'Saved subject' } }} />);
    expect(screen.getByRole('status')).toHaveTextContent('تعذّر فتح هذا المستند.');
  });
});
