import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ForensicEvidence } from '@/types/evidence';
import './DigitalForensicsViewer.css';

type DigitalForensicsEvidence = Extract<ForensicEvidence, { sub_type: 'digital_forensics' }>;

interface DigitalForensicsViewerProps {
  evidence: DigitalForensicsEvidence;
}

const DigitalForensicsViewer: React.FC<DigitalForensicsViewerProps> = ({ evidence }) => {
  const { t } = useTranslation();
  const { metadata } = evidence;

  return (
    <div className="forensic-preview digital-terminal">
      <div className="terminal-header">
        <span className="terminal-dot red"></span>
        <span className="terminal-dot yellow"></span>
        <span className="terminal-dot green"></span>
        <span className="terminal-title">{t('pages.gameRoom.evidence.viewers.digitalForensics.terminalTitle')}</span>
      </div>

      <div className="terminal-body">
        {/* We force LTR here because authentic UNIX commands are always in English/LTR */}
        <div className="terminal-line command" dir="ltr">
          <span className="prompt">root@ccu-server:~$</span> ./extract_payload.sh --target=EX-{evidence.id.toString().padStart(3, '0')}
        </div>

        <div className="terminal-line system">
          {t('pages.gameRoom.evidence.viewers.digitalForensics.initiating')}
        </div>
        <div className="terminal-line system">
          {t('pages.gameRoom.evidence.viewers.digitalForensics.targetDevice')} <span className="highlight-cyan">{metadata.device_type}</span>
        </div>
        <div className="terminal-line system">
          {t('pages.gameRoom.evidence.viewers.digitalForensics.method')} <span className="highlight-cyan">{metadata.extraction_method}</span>
        </div>

        <div className="terminal-line system progress-line">
          {t('pages.gameRoom.evidence.viewers.digitalForensics.bypassing')}
        </div>

        <div className="terminal-data-box">
          <div className="data-box-header">
            <span>{t('pages.gameRoom.evidence.viewers.digitalForensics.beginPayload')}</span>
            <span className="blink-cursor">_</span>
          </div>
          <div className="data-payload">
            {metadata.recovered_data}
          </div>
          <div className="data-box-footer">
            <span>{t('pages.gameRoom.evidence.viewers.digitalForensics.endOfFile')}</span>
          </div>
        </div>

        {/* Kept authentic LTR for the final awaiting prompt */}
        <div className="terminal-line command" dir="ltr">
          <span className="prompt">root@ccu-server:~$</span> <span className="blink-cursor">_</span>
        </div>
      </div>
    </div>
  );
};

export default DigitalForensicsViewer;