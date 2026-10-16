import React, { forwardRef } from 'react';
import adminDashboard from '../../AdminDashboard.module.css';
import adminForms from '../../forms/Shared/AdminForms.module.css';

export const AdminRow = ({ children }: { children: React.ReactNode }) => (
  <div className={adminDashboard['admin-form-row']}>
    {children}
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; }
export const AdminInput = ({ label, ...props }: InputProps) => (
  <div className={adminDashboard['form-group']}>
    {label && <label>{label}</label>}
    <input className={adminDashboard['admin-input']} {...props} />
  </div>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; minHeight?: string; }
export const AdminTextarea = ({ label, minHeight = '120px', style, ...props }: TextareaProps) => (
  <div className={adminDashboard['form-group']}>
    {label && <label>{label}</label>}
    <textarea className={adminDashboard['admin-textarea']} style={{ minHeight, ...style }} {...props} />
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; options: { label: string; value: string }[]; placeholder?: string; }
export const AdminSelect = ({ label, options, placeholder, ...props }: SelectProps) => (
  <div className={adminDashboard['form-group']}>
    {label && <label>{label}</label>}
    <select className={adminDashboard['admin-input']} {...props}>
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
    className={`${adminForms['admin-checkbox-card']} ${className}`}
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
  <div className={adminDashboard['form-group']}>
    <label>{label}</label>
    {hint && <p className={adminForms['admin-field-hint']}>{hint}</p>}
    <input type="file" className={adminDashboard['admin-file-input']} ref={ref} {...props} />
  </div>
));
AdminFileInput.displayName = 'AdminFileInput';

export const FormattingGuide = () => (
  <div className={adminForms['formatting-guide']}>
    <p className={adminForms['formatting-guide-title']}>
      <strong>[ FORMATTING GUIDE ]</strong> Immersive HTML effects:
    </p>
    <ul className={adminForms['formatting-guide-list']}>
      <li><code>&lt;span className="redacted"&gt;Text&lt;/span&gt;</code> : Black redaction bar.</li>
      <li><code>&lt;span className="highlighted"&gt;Text&lt;/span&gt;</code> : Yellow highlighter marker.</li>
    </ul>
  </div>
);

export const DynamicListHeader = ({ title, onAdd, addLabel }: { title: string; onAdd: () => void; addLabel: string }) => (
  <div className={adminForms['dynamic-list-header']}>
    <label className={adminForms['dynamic-list-title']}>{title}</label>
    <button type="button" className={`btn-secondary ${adminForms['dynamic-list-add']}`} onClick={onAdd}>{addLabel}</button>
  </div>
);

export const RemoveButton = ({ onClick, title = "Remove Item", style }: { onClick: () => void, title?: string, style?: React.CSSProperties }) => (
  <button type="button" onClick={onClick} title={title} className={adminForms['remove-btn']} style={style}>×</button>
);
