import { AdminInput } from '@/pages/Admin/components/AdminUI';
import type { DocBlock, BarcodeProps } from '@/types/evidence/doc';

interface BlockEditorProps {
  block: DocBlock & { type: 'barcode'; props: BarcodeProps };
  onUpdate: (updates: Partial<DocBlock>) => void;
  evidenceId: number;
}

export function BarcodeEditor({ block, onUpdate }: BlockEditorProps) {
  const props = block.props;
  return (
    <div className="block-editor">
      <AdminInput
        label="Value"
        value={props.value || ''}
        onChange={(e) => onUpdate({ props: { ...props, value: e.target.value } })}
        placeholder="Barcode value (uses Libre Barcode 39 font)"
      />
    </div>
  );
}