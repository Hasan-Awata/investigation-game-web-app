import type { Evidence } from '@/types';
import type { DocumentEvidence as DocEvType } from '@/types/evidence';
import './DocumentEvidence.css';

export default function DocumentEvidence({ evidence }: { evidence: Evidence }) {
  const docEvidence = evidence as DocEvType;
  const subType = docEvidence.sub_type || 'default';

  switch (subType) {
    case 'financial':
      return (
        <div className="document-variant financial-variant">
          <div className="folder-back"></div>
          
          <div className="folder-papers">
            <div className="paper-sheet paper-1"></div>
            <div className="paper-sheet paper-2">
              <div className="micro-table">
                <div className="micro-row micro-header">
                  <div className="micro-col">Date</div>
                  <div className="micro-col flex-2">Transaction Detail</div>
                  <div className="micro-col">Amount</div>
                  <div className="micro-col">Status</div>
                </div>
                {[...Array(5)].map((_, i) => (
                  <div className="micro-row" key={i}>
                    <div className="micro-col">0{i + 1}</div>
                    <div className="micro-col flex-2">xxxx xxxxx</div>
                    <div className="micro-col">$$$$</div>
                    <div className="micro-col">CLRD</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="folder-front">
            <div className="folder-text-content">
              <h4 className="evidence-title">{evidence.title}</h4>
              {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
            </div>
          </div>
        </div>
      );

    case 'correspondence':
      return (
        <div className="document-variant correspondence-variant">
          {/* 1. The darker inside of the envelope */}
          <div className="envelope-inside"></div>
          
          {/* 2. The letter sticking out */}
          <div className="letter-paper">
            <div className="letter-text-content">
              <h4 className="evidence-title">{evidence.title}</h4>
              {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
            </div>
          </div>
          
          {/* 3. The front flaps of the envelope */}
          <div className="envelope-front-wrapper">
            <div className="envelope-flaps">
              <div className="airmail-border"></div>
            </div>
          </div>

          {/* 4. The Postage Stamp and Cancellation Ink */}
          <div className="postage-stamp">
            <div className="stamp-art"></div>
            <div className="cancellation-mark"></div>
          </div>
        </div>
      );
      
    case 'journal':
      return (
        <div className="document-variant journal-variant">
          {/* The ribbon hanging out the bottom */}
          <div className="journal-bookmark"></div>
          
          {/* The white pages peeking out the right side */}
          <div className="journal-pages-edge"></div>
          
          {/* The main leather cover */}
          <div className="journal-cover">
            <div className="journal-spine"></div>
            
            <div className="journal-text-content">
              <h4 className="evidence-title">{evidence.title}</h4>
              {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
            </div>
            
            {/* The elastic band wrapping the notebook */}
            <div className="journal-elastic-band"></div>
          </div>
        </div>
      );
      
    case 'contract':
      return (
        <div className="document-variant contract-variant">
          {/* The back flap of the folder */}
          <div className="manila-back">
            {/* The tab on the right side */}
            <div className="manila-tab">
              {/* The white sticker label */}
              <div className="manila-label">
                <span className="label-text">LEGAL FILES</span>
              </div>
            </div>
          </div>
          
          {/* The front flap of the folder */}
          <div className="manila-front">
            <div className="manila-text-content">
              <h4 className="evidence-title">{evidence.title}</h4>
              {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
            </div>
          </div>
        </div>
      );

    case 'memo':
      return (
        <div className="document-variant memo-variant">
          {/* Spiral notebook punch holes on the left */}
          <div className="notebook-holes"></div>
          
          {/* The overlay that creates the crumpled shading and creases */}
          <div className="crumpled-texture"></div>
          
          <div className="memo-content">
            <h4 className="evidence-title">{evidence.title}</h4>
            {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
          </div>
        </div>
      );

    case 'background_check':
      return (
        <div className="document-variant dossier-variant">
          <div className="dossier-paperclip"></div>
          
          <div className="dossier-header">
            <span className="dossier-classification">RESTRICTED</span>
            <div className="dossier-barcode"></div>
          </div>
          
          <div className="dossier-body">
            {/* Dynamically load the actual photo or fallback to the silhouette */}
            <div className="dossier-mugshot">
              {evidence.img_url ? (
                <img src={evidence.img_url} alt="Subject Mugshot" className="actual-mugshot-photo" />
              ) : (
                <div className="mugshot-silhouette"></div>
              )}
            </div>
            
            <div className="dossier-text-content">
              <h4 className="evidence-title">{evidence.title}</h4>
              {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="document-variant placeholder-variant">
          <h4 className="evidence-title">{evidence.title}</h4>
          {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
        </div>
      );
  }
}