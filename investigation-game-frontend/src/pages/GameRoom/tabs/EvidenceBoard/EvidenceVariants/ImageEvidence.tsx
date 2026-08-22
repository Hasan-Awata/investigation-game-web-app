import type { Evidence } from '@/types';
import './ImageEvidence.css';

export default function ImageEvidence({ evidence }: { evidence: Evidence }) {
  return (
    <div className="image-variant polaroid-style">
      {/* 3D red push-pin anchoring the photo */}
      <div className="red-push-pin"></div>
      
      {/* The photo area with realistic lighting */}
      <div className="photo-frame">
        {evidence.img_url ? (
          <img src={evidence.img_url} alt={evidence.title} className="actual-photo" />
        ) : (
          <div className="photo-placeholder">
            <span>NO IMAGE</span>
          </div>
        )}
        
        {/* Glossy reflection overlay to make it look like photo paper */}
        <div className="photo-glare"></div>
      </div>
      
      {/* Sharpie marker handwritten caption */}
      <div className="photo-caption">
        <h4 className="evidence-title">{evidence.title}</h4>
        {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
      </div>
    </div>
  );
}