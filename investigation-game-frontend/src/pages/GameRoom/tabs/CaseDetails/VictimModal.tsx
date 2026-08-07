import type { Victim } from '@/types';

interface VictimModalProps {
  victim: Victim | null;
  onClose: () => void;
}

export default function VictimModal({ victim, onClose }: VictimModalProps) {
  if (!victim) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 2000 }}>
      <div 
        className="modal-content glass-panel" 
        style={{ maxWidth: '650px', padding: '2.5rem' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-btn" onClick={onClose}>✕</button>
        
        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
          {/* Left Column: Image */}
          <div 
            style={{ 
              width: '180px', 
              height: '180px', 
              backgroundImage: `url(${victim.img_url || '/placeholder-mugshot.jpg'})`, 
              backgroundSize: 'cover', 
              backgroundPosition: 'center', 
              borderRadius: '8px', 
              border: '1px solid rgba(255,255,255,0.1)',
              flexShrink: 0,
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
            }}
          />
          
          {/* Right Column: Details */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ 
              margin: '0 0 0.25rem 0', 
              color: 'var(--text-primary)', 
              textTransform: 'uppercase',
              fontSize: '2rem',
              letterSpacing: '0.05em'
            }}>
              {victim.name}
            </h2>
            
            <div style={{ 
              fontFamily: 'var(--font-mono)', 
              color: 'var(--accent-crimson)', 
              fontSize: '0.9rem', 
              marginBottom: '1.5rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              IDENTIFICATION CODE: VIC-{victim.id.toString().padStart(4, '0')}
            </div>
            
            <div style={{ 
              color: 'var(--text-secondary)', 
              lineHeight: '1.7', 
              whiteSpace: 'pre-wrap',
              maxHeight: '40vh',
              overflowY: 'auto',
              paddingRight: '1rem',
              fontFamily: 'var(--font-mono)'
            }}>
              {victim.background || 'No background information available in the official records.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}