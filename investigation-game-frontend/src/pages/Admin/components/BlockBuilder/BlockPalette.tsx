import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import styles from './BlockPalette.module.css';

interface BlockPaletteProps<TBlockType extends string> {
  blockTypes: readonly TBlockType[];
  getBlockLabel: (type: TBlockType) => string;
  onSelect: (type: TBlockType) => void;
}

export function BlockPalette<TBlockType extends string>({
  blockTypes,
  getBlockLabel,
  onSelect,
}: BlockPaletteProps<TBlockType>) {
  const { adminT } = useAdminTranslation();

  return (
    <div className={styles.palette}>
      <h4 className={styles.paletteTitle}>{adminT.forms.blockBuilder.paletteTitle ?? 'Blocks'}</h4>
      <div className={styles.paletteList} role="listbox" aria-label="Block palette">
        {blockTypes.map((type) => (
          <button
            key={type}
            className={styles.paletteItem}
            role="option"
            onClick={() => onSelect(type)}
            data-type={type}
          >
            <span className={styles.paletteLabel}>{getBlockLabel(type)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}