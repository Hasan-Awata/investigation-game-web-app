import type { Evidence } from '../../../../types';

export default function AudioEvidence({ evidence }: { evidence: Evidence }) {
  return (
    <div className="evidence-variant audio-variant">
      <div className="digital-pin cyan"></div>
      <div className="audio-tape-ui">
        <div className="audio-spool"></div>
        <div className="audio-spool"></div>
      </div>
      <h4 className="evidence-title">{evidence.title}</h4>
      <span className="evidence-id">Voice Record</span>
    </div>
  );
}