import type { FC } from 'react';
import styles from './SignaturePad.module.css';

export interface SignaturePadProps {
  seed: number;
  label?: string;
  isVerified?: boolean;
}

const SignaturePad: FC<SignaturePadProps> = ({ seed, label = 'Authorized Signature', isVerified = true }) => {
  const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const src = `${backendUrl}/assets/signatures/signature-${(seed % 18) + 1}.svg`;

  return (
    <div className={`${styles.wrapper} ${isVerified ? styles['is-verified'] : styles['is-forged']}`}>
      <img src={src} alt={label} className={styles.image} draggable={false} />
      <div className={styles.line}></div>
      <div className={styles.footer}>
        <span className={styles.label}>{label}</span>
        <span className={styles.status}>{isVerified ? 'VERIFIED' : 'FORGED'}</span>
      </div>
    </div>
  );
};

export default SignaturePad;