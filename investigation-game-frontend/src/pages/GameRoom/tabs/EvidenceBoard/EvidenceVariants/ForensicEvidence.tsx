import type { Evidence } from '@/types';
import forensicEvidence from './ForensicEvidence.module.css';

export default function ForensicEvidence({ evidence }: { evidence: Evidence }) {
  return (
    <div className={`forensic-variant ${forensicEvidence['forensic-report']}`}>
      <div className={forensicEvidence['forensic-top']}>
        <h4 className={forensicEvidence['evidence-title']}>{evidence.title}</h4>
        <span className={forensicEvidence['medical-icon']} aria-hidden="true">⚕</span>
      </div>

      {evidence.description && <p className={forensicEvidence['evidence-desc']}>{evidence.description}</p>}

      <div className={forensicEvidence['forensic-footer']}>
        <span className={forensicEvidence['barcode-lines']} aria-hidden="true"></span>
      </div>
    </div>
  );
}
