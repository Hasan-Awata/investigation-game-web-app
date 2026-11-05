import type { ReactNode } from 'react';
import styles from './CaseMetadataBadge.module.css';

export type RewardState = 'standard' | 'neutral' | 'penalty';
type MetadataKind = 'playtime' | 'difficulty' | 'advisory' | 'reward' | 'price';

interface CaseMetadataBadgeProps {
  kind: MetadataKind;
  children: ReactNode;
  rewardState?: RewardState;
}

const icons: Record<MetadataKind, ReactNode> = {
  playtime: <><path d="M9 2h6M12 2v3m6 2 1.5-1.5"/><circle cx="12" cy="14" r="8"/><path d="M12 10v4l2 2"/></>,
  difficulty: <><path d="M4 20v-5h3v5H4Zm6.5 0V9h3v11h-3Zm6.5 0V3h3v17h-3Z"/></>,
  advisory: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="M12 8v5m0 3h.01"/></>,
  reward: <><path d="M7 3h10v5a5 5 0 0 1-10 0V3ZM7 5H3v2a4 4 0 0 0 4 4m10-6h4v2a4 4 0 0 1-4 4M12 13v5m-4 3h8m-7 0v-3h6v3"/></>,
  price: <><path d="M20 13 11 22 2 13V2h11l9 9a1.4 1.4 0 0 1 0 2Z"/><circle cx="7" cy="7" r="1.5"/></>,
};

export default function CaseMetadataBadge({ kind, children, rewardState = 'standard' }: CaseMetadataBadgeProps) {
  const tone = kind === 'price' ? styles.price : kind === 'reward' ? styles[rewardState] : '';
  return (
    <div className={`${styles.badge} ${tone}`}>
      <svg aria-hidden="true" className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {icons[kind]}
      </svg>
      <span className={kind === 'reward' ? styles.rewardValue : undefined}>{children}</span>
    </div>
  );
}
