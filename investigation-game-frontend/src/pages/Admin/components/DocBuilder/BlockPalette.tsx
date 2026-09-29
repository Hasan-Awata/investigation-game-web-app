import { useDraggable } from '@dnd-kit/core';
import { DOC_BLOCK_TYPES } from '@/types/evidence/doc';
import type { DocBlockType, TemplateName } from '@/types/evidence/doc';
import { templates } from '@/pages/GameRoom/tabs/EvidenceBoard/DocViewer/templates-index';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import styles from './BlockPalette.module.css';

interface DraggableBlockItemProps {
  type: DocBlockType;
  label: string;
}

function DraggableBlockItem({ type, label }: DraggableBlockItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `block-${type}`,
    data: { current: { type } },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`${styles.blockItem} ${isDragging ? styles.isDragging : ''}`}
      data-type={type}
    >
      <span className={styles.blockIcon} aria-hidden="true">⬜</span>
      <span className={styles.blockLabel}>{label}</span>
    </div>
  );
}

interface DraggableTemplateItemProps {
  name: TemplateName;
  label: string;
}

function DraggableTemplateItem({ name, label }: DraggableTemplateItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `template-${name}`,
    data: { current: { type: '', template: name } },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`${styles.templateItem} ${isDragging ? styles.isDragging : ''}`}
      data-template={name}
    >
      <span className={styles.templateIcon} aria-hidden="true">📄</span>
      <span className={styles.templateLabel}>{label}</span>
    </div>
  );
}

export function BlockPalette() {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.docBuilder;

  return (
    <div className={styles.palette}>
      <section className={styles.section} aria-label={t.blocksSection}>
        <h3 className={styles.sectionTitle}>{t.blocksSection}</h3>
        <div className={styles.blockList}>
          {DOC_BLOCK_TYPES.map(type => (
            <DraggableBlockItem
              key={type}
              type={type}
              label={t.blocks[type]}
            />
          ))}
        </div>
      </section>

      <section className={styles.section} aria-label={t.templatesSection}>
        <h3 className={styles.sectionTitle}>{t.templatesSection}</h3>
        <div className={styles.templateList}>
{(Object.keys(templates) as TemplateName[]).map(name => {
                // Template names in evidenceMetadata may have nested objects; fall back to name
                const labelKey = `doc${name.charAt(0).toUpperCase() + name.slice(1)}` as keyof typeof adminT.forms.evidenceMetadata;
                const labelValue = adminT.forms.evidenceMetadata[labelKey];
                const label = typeof labelValue === 'string' ? labelValue : name;
                return (
                  <DraggableTemplateItem
                    key={name}
                    name={name}
                    label={label}
                  />
                );
              })}
        </div>
      </section>
    </div>
  );
}