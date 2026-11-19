import ViewersContainer from '../Viewers/ViewersContainer';
import TemplateRenderer from '@/features/evidence/presentation/TemplateRenderer';
import { readTemplate } from '@/features/evidence/presentation/catalog';

export default function UniversalDocViewer({ evidence }: { evidence: { metadata?: unknown } }) {
  return (
    <ViewersContainer>
      <TemplateRenderer template={readTemplate(evidence.metadata)} />
    </ViewersContainer>
  );
}
