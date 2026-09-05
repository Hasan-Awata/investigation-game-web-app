import React, { forwardRef } from 'react';

export const AdminRow = ({ children }: { children: React.ReactNode }) => (
  <div className="admin-form-row">
    {React.Children.map(children, (child) => (
      <div style={{ flex: 1 }}>{child}</div>
    ))}
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; }
export const AdminInput = ({ label, ...props }: InputProps) => (
  <div className="form-group">
    {label && <label>{label}</label>}
    <input className="admin-input" {...props} />
  </div>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; minHeight?: string; }
export const AdminTextarea = ({ label, minHeight = '80px', style, ...props }: TextareaProps) => (
  <div className="form-group">
    {label && <label>{label}</label>}
    <textarea className="admin-textarea" style={{ minHeight, ...style }} {...props} />
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; options: { label: string; value: string }[]; placeholder?: string; }
export const AdminSelect = ({ label, options, placeholder, ...props }: SelectProps) => (
  <div className="form-group">
    {label && <label>{label}</label>}
    <select className="admin-input" {...props}>
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  labelTitle: string;
  description?: string;
  accentColor?: string;
  bgColor?: string;
  className?: string;
}

export const AdminCheckbox = ({ labelTitle, description, accentColor, bgColor, className = '', ...props }: CheckboxProps) => (
  <div 
    className={`admin-checkbox-card ${className}`} 
    style={{ background: bgColor, ...(accentColor ? { borderColor: accentColor } : {}) }}
  >
    <input type="checkbox" style={accentColor ? { accentColor } : undefined} {...props} />
    <label style={accentColor ? { color: accentColor } : undefined}>
      <strong>{labelTitle}</strong> {description ? `: ${description}` : ''}
    </label>
  </div>
);

interface FileInputProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; hint?: string; }
export const AdminFileInput = forwardRef<HTMLInputElement, FileInputProps>(({ label, hint, ...props }, ref) => (
  <div className="form-group">
    <label>{label}</label>
    {hint && <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{hint}</p>}
    <input type="file" className="admin-file-input" ref={ref} {...props} />
  </div>
));
AdminFileInput.displayName = 'AdminFileInput';

export const FormattingGuide = () => (
  <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', border: '1px dashed var(--accent-cyan)' }}>
    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
      <strong>[ FORMATTING GUIDE ]</strong> Immersive HTML effects:
    </p>
    <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
      <li><code>&lt;span className="redacted"&gt;Text&lt;/span&gt;</code> : Black redaction bar.</li>
      <li><code>&lt;span className="highlighted"&gt;Text&lt;/span&gt;</code> : Yellow highlighter marker.</li>
    </ul>
  </div>
);

export const DynamicListHeader = ({ title, onAdd, addLabel }: { title: string; onAdd: () => void; addLabel: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', marginTop: '1.5rem', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
    <label style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', margin: 0 }}>{title}</label>
    <button type="button" className="btn-secondary" onClick={onAdd} style={{ padding: '0.25rem 0.75rem', width: 'auto', fontSize: '0.75rem' }}>{addLabel}</button>
  </div>
);

export const RemoveButton = ({ onClick, title = "Remove Item", style }: { onClick: () => void, title?: string, style?: React.CSSProperties }) => (
  <button type="button" onClick={onClick} title={title} style={{ background: 'transparent', border: 'none', color: 'var(--accent-crimson)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem', ...style }}>×</button>
);

interface ResourceSelectorProps {
  label: string;
  items: { id: number | string; name?: string; title?: string; order_index?: number }[];
  selectedValues: string[];
  onChange: (values: number[]) => void;
  getName?: (item: any) => string;
}

export const ResourceSelectorGrid = ({ label, items, selectedValues, onChange, getName }: ResourceSelectorProps) => (
  <div className="form-group" style={{ flex: 1, margin: 0 }}>
    <label style={{ fontSize: '0.7rem' }}>{label}</label>
    <select 
      multiple 
      className="admin-input" 
      style={{ height: '80px', padding: '0.25rem' }} 
      value={selectedValues} 
      onChange={(e) => onChange(Array.from(e.target.selectedOptions, opt => Number(opt.value)))}
    >
      {items.map((item) => (
        <option key={item.id} value={item.id.toString()}>
          {getName ? getName(item) : (item.name || item.title)}
        </option>
      ))}
    </select>
  </div>
);

export interface CoordinateMarker {
  id: string | number;
  x: string | number;
  y: string | number;
  label?: string;
  isTargeting?: boolean;
}

interface CoordinatePickerProps {
  imageUrl: string;
  isTargeting: boolean;
  targetingBannerText: string;
  cancelTargetBtnText: string;
  onCancelTargeting: () => void;
  onCoordinateSelect: (x: string, y: string) => void;
  markers: CoordinateMarker[];
}

export const CoordinatePicker = ({
  imageUrl, isTargeting, targetingBannerText, cancelTargetBtnText,
  onCancelTargeting, onCoordinateSelect, markers
}: CoordinatePickerProps) => {
  
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isTargeting) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = (((e.clientX - rect.left) / rect.width) * 100).toFixed(1);
    const yPercent = (((e.clientY - rect.top) / rect.height) * 100).toFixed(1);
    onCoordinateSelect(xPercent, yPercent);
  };

  return (
    <div className="coordinate-picker-container" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
      {isTargeting && (
        <div className="targeting-active-banner">
          <span>{targetingBannerText}</span>
          <button type="button" onClick={onCancelTargeting} style={{ background: 'transparent', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)' }}>
            {cancelTargetBtnText}
          </button>
        </div>
      )}

      <div className={`coordinate-picker-image-wrapper ${isTargeting ? 'mapping-active' : ''}`} onClick={handleImageClick}>
        <img src={imageUrl} alt="Map Preview" />
        
        {markers.map((marker) => (
          <div
            key={marker.id}
            className={`loc-hover-zone ${marker.isTargeting ? 'selected' : 'investigated'}`}
            style={{ 
              top: `${marker.y}%`, 
              left: `${marker.x}%`,
              display: 'flex',
              pointerEvents: 'none' 
            }}
          >
            <div className="loc-crosshair"></div>
            {marker.label && (
              <div className="loc-tooltip">{marker.label}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};