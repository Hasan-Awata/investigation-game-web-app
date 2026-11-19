import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import ErrorBoundary from '@/components/ErrorBoundary';
import type { Template } from '../model';
import { templateDefinition } from './catalog';
import styles from './TemplateRenderer.module.css';

export const PAPER_WIDTH = 800;
export const PAPER_HEIGHT = 1131;

export default function TemplateRenderer({ template, pageLimit }: { template?: Template; pageLimit?: number }) {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const definition = template && templateDefinition(template.id, template.version);
  const unavailable = <p role="status">{locale === 'ar' ? 'تعذّر فتح هذا المستند.' : 'This document could not be opened.'}</p>;
  const loading = <p className={styles.loading} role="status">{locale === 'ar' ? 'جارٍ تحميل المستند…' : 'Loading document…'}</p>;

  return (
    <div className={styles.paper} style={{ width: PAPER_WIDTH, minHeight: PAPER_HEIGHT }} lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <ErrorBoundary key={`${template?.id}:${template?.version}`} fallback={unavailable}>
        <Suspense fallback={loading}>
          {definition && template ? <definition.Layout values={template.values} locale={locale} pageLimit={pageLimit} /> : unavailable}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
