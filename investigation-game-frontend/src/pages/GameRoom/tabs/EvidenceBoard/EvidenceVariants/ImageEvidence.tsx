import type { Evidence } from '@/types';

export default function ImageEvidence({ evidence }: { evidence: Evidence }) {
  return (
    <div className="evidence-variant image-variant">
      <div className="digital-tape"></div>
      <div 
        className="image-frame" 
        style={{ backgroundImage: `url(${evidence.img_url || '/placeholder-crime-scene.jpg'})` }}
      ></div>
      <div className="image-caption">
        <h4 className="evidence-title">{evidence.title}</h4>
      </div>
    </div>
  );
}