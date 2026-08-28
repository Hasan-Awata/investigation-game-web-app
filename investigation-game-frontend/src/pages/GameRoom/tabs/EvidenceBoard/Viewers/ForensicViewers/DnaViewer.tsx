import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ForensicEvidence } from '@/types/evidence';
import './DnaViewer.css';

type DnaEvidence = Extract<ForensicEvidence, { sub_type: 'dna' }>;

interface DnaViewerProps {
  evidence: DnaEvidence;
}

const DnaViewer: React.FC<DnaViewerProps> = ({ evidence }) => {
  const { t } = useTranslation();
  const { metadata } = evidence;

  const generateSequence = (seed: number, isMatch: boolean) => {
    return [...Array(24)].map((_, i) => {
      const opacity = ((seed * (i + 1) * 17) % 100) / 100;
      const finalOpacity = isMatch ? opacity : ((seed * (i + 1) * 23) % 100) / 100;
      return (
        <div
          key={i}
          className={`dna-band ${finalOpacity > 0.5 ? 'dense' : ''}`}
          style={{ opacity: finalOpacity }}
        />
      );
    });
  };

  const hasMatch = !!metadata.identified_person;

  return (
    <div className="forensic-preview dna-paper">
      <div className="dna-header">
        <div className="dna-lab-title">{t('pages.gameRoom.evidence.viewers.dna.geneticLab')}</div>
        <div className="dna-report-type">{t('pages.gameRoom.evidence.viewers.dna.strAnalysis')}</div>
      </div>

      <div className="dna-meta-row">
        <div className="dna-meta-item">
          <span className="dna-label">{t('pages.gameRoom.evidence.viewers.dna.evidenceId')}</span>
          <span className="dna-meta-value">EX-{evidence.id.toString().padStart(3, '0')}</span>
        </div>
        <div className="dna-meta-item">
          <span className="dna-label">{t('pages.gameRoom.evidence.viewers.dna.sampleType')}</span>
          <span className="dna-meta-value">{metadata.sample_type}</span>
        </div>
        <div className="dna-meta-item">
          <span className="dna-label">{t('pages.gameRoom.evidence.viewers.dna.date')}</span>
          <span className="dna-meta-value">{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {metadata.lab_technician && (
        <div className="dna-extra-meta">
          <div><span className="dna-label">{t('pages.gameRoom.evidence.viewers.dna.labTechnician')}</span> {metadata.lab_technician}</div>
          {metadata.extraction_method && (
            <div><span className="dna-label">{t('pages.gameRoom.evidence.viewers.dna.extractionMethod')}</span> {metadata.extraction_method}</div>
          )}
        </div>
      )}

      <div className="dna-visualizer-container">
        <h4 className="dna-visualizer-title">{t('pages.gameRoom.evidence.viewers.dna.electropherogram')}</h4>
        <div className="dna-visualizer">
          <div className="dna-sequence-track">
            <div className="dna-track-label">{t('pages.gameRoom.evidence.viewers.dna.crimeSceneSample')}</div>
            <div className="dna-bands-container">
              {generateSequence(evidence.id, true)}
            </div>
          </div>
          <div className="dna-sequence-track match-track">
            <div className="dna-track-label">{t('pages.gameRoom.evidence.viewers.dna.databaseRecord')}</div>
            <div className="dna-bands-container">
              {generateSequence(evidence.id, hasMatch)}
            </div>
          </div>
        </div>
      </div>

      {metadata.loci_profile_summary && (
        <div className="dna-notes-section">
          <span className="dna-label">{t('pages.gameRoom.evidence.viewers.dna.lociProfileSummary')}</span>
          <div className="dna-notes-content">{metadata.loci_profile_summary}</div>
        </div>
      )}

      <div className="dna-results-box">
        <div className="dna-result-row">
          <span className="dna-label">{t('pages.gameRoom.evidence.viewers.dna.probOfMatch')}</span>
          <span className="dna-value highlight">{metadata.match_probability}</span>
        </div>
        <div className="dna-result-row">
          <span className="dna-label">{t('pages.gameRoom.evidence.viewers.dna.identifiedSubject')}</span>
          <span className={`dna-value ${hasMatch ? 'subject-match' : 'subject-unknown'}`}>
            {metadata.identified_person || t('pages.gameRoom.evidence.viewers.dna.noMatch')}
          </span>
        </div>
      </div>

      {metadata.lab_notes && (
        <div className="dna-notes-section">
          <span className="dna-label">{t('pages.gameRoom.evidence.viewers.dna.labNotes')}</span>
          <div className="dna-notes-content">{metadata.lab_notes}</div>
        </div>
      )}

      <div className="dna-footer">
        <div className="dna-barcode">|||||| |||| ||||||||</div>
        <div className="dna-codis-stamp">{t('pages.gameRoom.evidence.viewers.dna.codisVerified')}</div>
      </div>
    </div>
  );
};

export default DnaViewer;