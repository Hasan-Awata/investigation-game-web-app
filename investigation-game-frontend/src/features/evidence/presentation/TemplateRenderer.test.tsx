import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TemplateRenderer from './TemplateRenderer';
import { latestTemplates, readTemplate, templateDefinition } from './catalog';
import { documentAssetOptions, documentStamp } from './documentAssets';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'ar' } }) }));

describe('paper evidence templates', () => {
  it('discovers Background Check for both paper types and renders saved mixed-script values in Arabic', async () => {
    expect(latestTemplates('document').map(entry => entry.id)).toContain('background_check');
    expect(latestTemplates('forensic').map(entry => entry.id)).toContain('background_check');
    expect(latestTemplates('audio')).toEqual([]);
    expect(templateDefinition('background_check', 1)).toBeUndefined();
    expect(templateDefinition('background_check', 2)).toBeUndefined();

    render(<TemplateRenderer template={{ id: 'background_check', version: 3, values: {
      subject: 'ناصر حداد — Nasser Haddad', arrests: [{ description: '41-S' }],
    } }} />);

    const heading = await screen.findByRole('heading', { name: 'سيرة ذاتية' });
    const sheet = within(heading.closest('article')!);
    for (const label of ['الرقم الوطني', 'رقم الهوية', 'رقم تتبع السجل', 'ملاحظات إضافية']) {
      expect(sheet.getByText(label)).toBeVisible();
    }
    expect(sheet.getAllByRole('figure').filter(figure =>
      figure.querySelector('img[src$="/fingerprints/default.svg"]'))).toHaveLength(10);
    expect(heading.closest('[lang]')).toHaveAttribute('dir', 'rtl');
    const table = screen.getByRole('table', { name: 'سجل التوقيف والأحكام' });
    expect(within(table).getByRole('cell', { name: '41-S' })).toBeInTheDocument();
    expect(screen.getAllByText('ناصر حداد — Nasser Haddad').some(entry => entry.closest('article'))).toBe(true);
  });

  it('renders the expanded identity, sentence and fingerprint fields on the mirrored sheet', async () => {
    expect(latestTemplates('document').find(entry => entry.id === 'background_check')?.version).toBe(3);

    render(<TemplateRenderer template={{ id: 'background_check', version: 3, values: {
      subject: 'ناصر حداد',
      record_id: '051H42',
      aliases: 'أبو نائل',
      arrests: [{ description: 'Charge 41-S', offense_code: '41-S', institution: 'Central Court', term: '6 months' }],
      fingerprint_asset: 'loop',
      notes: 'ملاحظة من الملف',
    } }} />);

    const heading = await screen.findByRole('heading', { name: 'سيرة ذاتية' });
    const sheet = within(heading.closest('article')!);
    expect(heading.closest('[lang]')).toHaveAttribute('dir', 'rtl');
    expect(sheet.getByText('أبو نائل')).toBeInTheDocument();
    expect(sheet.getByText('051H42')).toBeInTheDocument();
    expect(sheet.getByRole('columnheader', { name: 'رمز الجريمة' })).toBeInTheDocument();
    expect(sheet.getByRole('cell', { name: 'Central Court' })).toBeInTheDocument();
    expect(sheet.getByRole('cell', { name: '6 months' })).toBeInTheDocument();
    expect(sheet.getByText('الإبهام الأيمن').closest('figure')?.querySelector('img')).toHaveAttribute('src', expect.stringContaining('/fingerprints/loop.svg'));
    expect(sheet.getByText('ملاحظة من الملف')).toBeInTheDocument();
  });

  it('reuses a single shared fingerprint in ten slots and renders the localized stamp', async () => {
    render(<TemplateRenderer template={{ id: 'background_check', version: 3, values: {
      subject: 'Test subject', fingerprint_asset: 'loop', stamp_asset: 'reviewed', signature_asset: 'signature_07',
    } }} />);
    const heading = await screen.findByRole('heading', { name: 'سيرة ذاتية' });
    const sheet = heading.closest('article')!;
    const marks = [...sheet.querySelectorAll('figure img')];
    expect(marks).toHaveLength(10);
    expect(new Set(marks.map(image => image.getAttribute('src'))).size).toBe(1);
    expect(new Set(marks.map(image => (image as HTMLImageElement).style.transform)).size).toBe(10);
    expect(within(sheet).getByRole('img', { name: 'معتمد رسميًا' })).toHaveAttribute('src',
      expect.stringContaining('/stamps/officially-certified-ar.png'));
    expect(within(sheet).getByRole('img', { name: 'توقيع الضابط المراجع' })).toHaveAttribute('src', expect.stringContaining('/assets/documents/signatures/signature_07.svg'));
  });

  it('shows the localized fallback for an unavailable saved version', () => {
    render(<TemplateRenderer template={{ id: 'background_check', version: 999, values: { subject: 'Saved subject' } }} />);
    expect(screen.getByRole('status')).toHaveTextContent('تعذّر فتح هذا المستند.');
  });

  it('renders five Phone Records columns, legacy call data and a signed approval footer', async () => {
    expect(latestTemplates('document').find(entry => entry.id === 'phone_records')?.version).toBe(1);
    expect(latestTemplates('forensic').some(entry => entry.id === 'phone_records')).toBe(false);
    expect(templateDefinition('phone_records', 2)).toBeUndefined();
    const onPageCountChange = vi.fn();
    render(<TemplateRenderer pageSelection={{ index: 0, onPageCountChange }} template={{ id: 'phone_records', version: 1, values: {
      date: '2026-10-01',
      case_number: 'CR-2026-0417',
      main_line: '4 / جناح الردهة',
      line_owner: 'برج غلاسهاوس',
      provider: 'مزود تجريبي',
      calls: [
        { time: '03:07', direction: 'in', number: 'LOOP 0992-C', seconds: '12' },
        { date_time: '2026-10-01 03:09', originating: '+1 202-555-0101', destination: '+1 202-555-0102', duration: '00:00:00', type: 'SMS' },
      ],
      annotation: 'قارن الداخلي 3313 بسجلات الرحلات.',
      barcode: 'EXCH-T4-0930',
      approved_by: 'ليلى منصور',
      signature_asset: 'signature_07',
    } }} />);

    const table = await screen.findByRole('table', { name: 'سجل المكالمات' });
    expect(table.closest('[lang]')).toHaveAttribute('dir', 'rtl');
    expect(within(table).getAllByRole('columnheader')).toHaveLength(5);
    expect(within(table).getByRole('columnheader', { name: 'المدة' })).toBeVisible();
    expect(within(table).getByRole('columnheader', { name: 'النوع' })).toBeVisible();
    expect(within(table).getByRole('cell', { name: 'CALL' })).toBeVisible();
    expect(within(table).getByRole('cell', { name: 'SMS' })).toBeVisible();
    expect(within(table).getByRole('cell', { name: 'LOOP 0992-C' })).toBeVisible();
    expect(within(table).getByRole('cell', { name: '00:00:12' })).toBeVisible();
    expect(screen.getByText('2026-10-01 03:07')).toBeVisible();
    expect(screen.getByText('وزارة الاتصالات')).toBeVisible();
    expect(screen.getByText('سري . للاستخدام الرسمي فقط')).toBeVisible();
    expect(screen.getByText('CR-2026-0417')).toBeVisible();
    expect(screen.getByText('ليلى منصور')).toBeVisible();
    expect(screen.queryByText('قارن الداخلي 3313 بسجلات الرحلات.')).not.toBeInTheDocument();
    expect(screen.queryByText(/EXCH-T4-0930/)).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'توقيع الاعتماد' })).toBeVisible();
    expect(onPageCountChange).toHaveBeenCalledWith(1);
  });

  it('renders Financial Records as a document with six transaction columns and typed case details', async () => {
    expect(latestTemplates('document').filter(entry => entry.id === 'financial_records')).toHaveLength(1);
    expect(latestTemplates('forensic').some(entry => entry.id === 'financial_records')).toBe(false);
    const onPageCountChange = vi.fn();
    render(<TemplateRenderer pageSelection={{ index: 0, onPageCountChange }} template={{ id: 'financial_records', version: 1, values: {
      target: 'Meridian Holdings',
      classification: 'سري',
      depository_institution: 'مصرف المرفأ',
      account_opening_date: '2022-03-14',
      agent: 'ناصر حداد',
      inquiry_date: '2026-10-02',
      handling: 'للاستخدام الداخلي',
      approved_by: 'ليلى منصور',
      prepared_signature: 'signature_07',
      approved_signature: 'signature_12',
      stamp_asset: 'filed',
      certification: 'نسخة للمراجعة الأولية',
      file_id: 'FFD-2048',
      transactions: [{ date: '2026-08-03', source: 'Bank 005', beneficiary: 'شركة الساحل', amount: 'USD 1,920.00', transaction_id: 'TX-34', status: 'غير مؤكدة' }],
    } }} />);

    const table = await screen.findByRole('table', { name: 'المعاملات المالية' });
    expect(screen.getByRole('heading', { name: 'كشف سجل مالي' })).toBeVisible();
    expect(screen.queryByText('ملف القضية', { exact: true })).not.toBeInTheDocument();
    expect(table.closest('[lang]')).toHaveAttribute('dir', 'rtl');
    expect(within(table).getAllByRole('columnheader')).toHaveLength(6);
    expect(within(table).getByText('2026-08-03')).toHaveAttribute('datetime', '2026-08-03');
    expect(within(table).getByRole('cell', { name: '1,920.00' })).toBeVisible();
    expect(within(table).getByRole('cell', { name: 'غير مؤكدة' })).toBeVisible();
    expect(screen.getByText('Meridian Holdings')).toBeVisible();
    expect(screen.getByText('المؤسسة المصرفية')).toBeVisible();
    expect(screen.getByText('مصرف المرفأ')).toBeVisible();
    expect(screen.getByText('تاريخ فتح الحساب')).toBeVisible();
    expect(screen.getByText('2022-03-14')).toHaveAttribute('datetime', '2022-03-14');
    expect(screen.queryByText('ناصر حداد')).not.toBeInTheDocument();
    expect(screen.queryByText('2026-10-02')).not.toBeInTheDocument();
    expect(screen.queryByText('للاستخدام الداخلي')).not.toBeInTheDocument();
    expect(screen.getByText('ليلى منصور')).toBeVisible();
    expect(screen.getByRole('img', { name: 'توقيع المُعدّ' })).toHaveAttribute('src', expect.stringContaining('/signatures/signature_07.svg'));
    expect(screen.getByRole('img', { name: 'توقيع المُعتمِد' })).toHaveAttribute('src', expect.stringContaining('/signatures/signature_12.svg'));
    expect(screen.getByText('مؤرشف')).toBeVisible();
    expect(screen.queryByText('سري', { exact: true })).not.toBeInTheDocument();
    const roundStamp = screen.getByRole('img', { name: 'وثيقة رسمية · قيد التحقيق' });
    expect(roundStamp).toHaveAttribute('src', expect.stringContaining('/stamps/under-investigation-ar.png'));
    expect(roundStamp.parentElement).toContainElement(screen.getByText('نسخة للمراجعة الأولية'));
    const authorityStamp = screen.getByRole('img', { name: 'معتمد رسميًا' });
    expect(authorityStamp.parentElement).toContainElement(screen.getByText('هيئة مكافحة الفساد'));
    expect(screen.getByText('FFD-2048')).toBeVisible();
    expect(onPageCountChange).toHaveBeenCalledWith(1);
  });

  it('uses one stamp option per design and selects the artwork for the document language', () => {
    const stampOptions = documentAssetOptions('stamp').map(([id]) => id);
    for (const id of ['top_secret', 'under_investigation', 'verified_evidence', 'officially_certified']) {
      expect(stampOptions.filter(key => key === id)).toHaveLength(1);
      for (const locale of ['ar', 'en'] as const) {
        expect(documentStamp(id, locale)?.url).toContain(`/stamps/${id.replaceAll('_', '-')}-${locale}.png`);
      }
    }
    expect(documentStamp('filed', 'en')).toEqual(documentStamp('under_investigation', 'en'));
    expect(documentStamp('reviewed', 'ar')).toEqual(documentStamp('officially_certified', 'ar'));
  });

  it('reads empty field maps from the API and rejects a list of field values', () => {
    const template = { id: 'background_check', version: 3 };
    expect(readTemplate({ template: { ...template, values: [] } })).toEqual({ ...template, values: {} });
    expect(readTemplate({ template: { ...template, values: ['Unexpected field'] } })).toBeUndefined();
  });
});
