import ViewersContainer from '../Viewers/ViewersContainer';
import TemplateRenderer from '@/features/evidence/presentation/TemplateRenderer';
import { readTemplate, type PageSelection } from '@/features/evidence/presentation/catalog';

export default function UniversalDocViewer({ evidence, pageSelection }: {
  evidence: { metadata?: unknown };
  pageSelection: PageSelection;
}) {
  return (
    <ViewersContainer pageIndex={pageSelection.index}>
      <TemplateRenderer template={readTemplate(evidence.metadata)} pageSelection={pageSelection} />
    </ViewersContainer>
  );
}
