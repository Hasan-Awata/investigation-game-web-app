import type { FC } from 'react';
import type { SignatureBlockProps } from '@/types/evidence';
import styles from './SignaturePad.module.css';

export type SignaturePadProps = SignatureBlockProps;

/**
 * The catalog lookup arrives with the document.
 *
 * The previous implementation rebuilt the asset URL by hand from a numeric
 * seed, which silently assumed a contiguous `signature-1..18` naming scheme and
 * a fixed count. Ids are assigned by the server from the files it actually
 * finds, so a dropped-in or removed SVG shifts them.
 */
export interface SignaturePathLookup {
  (signatureId: number): string | undefined;
}

interface ResolvedSignaturePadProps extends SignatureBlockProps {
  resolvePath: SignaturePathLookup;
}

const SignaturePad: FC<ResolvedSignaturePadProps> = ({
  signature_id,
  label,
  verified,
  resolvePath,
}) => {
  const path = resolvePath(signature_id);

  if (path === undefined) {
    return (
      <div className={styles.wrapper} data-missing="true">
        <div className={styles.line} />
        <div className={styles.footer}>
          <span className={styles.label}>{label || `Signature #${signature_id}`}</span>
          <span className={styles.status}>MISSING</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.wrapper} ${verified ? styles['is-verified'] : styles['is-forged']}`}>
      <img src={path} alt={label} className={styles.image} draggable={false} />
      <div className={styles.line} />
      <div className={styles.footer}>
        <span className={styles.label}>{label}</span>
        <span className={styles.status}>{verified ? 'VERIFIED' : 'FORGED'}</span>
      </div>
    </div>
  );
};

export default SignaturePad;
