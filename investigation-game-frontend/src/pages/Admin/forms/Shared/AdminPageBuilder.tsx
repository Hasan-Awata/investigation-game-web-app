import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './AdminPageBuilder.module.css';
import {
  AdminCheckbox,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  DynamicListHeader,
  RemoveButton,
} from '@/pages/Admin/components/AdminUI';
import type {
  BlockFieldSchema,
  DraftEvidenceBlock,
  DraftEvidencePage,
  SignatureOption,
} from '@/types/evidence';
import {
  coerceFieldValue,
  createBlockFromSchema,
  findBlockSchema,
  findMissingRequiredFields,
  readFieldValue,
  type BlockSchema,
  type DraftBlockProps,
} from './AdminBlockSchema';

interface AdminPageBuilderProps {
  pages: DraftEvidencePage[];
  onChange: (pages: DraftEvidencePage[]) => void;
  /** The served block catalog. Nothing about the blocks is hard-coded here. */
  blocks: BlockSchema[];
  /** The served signature catalog, for the one field that needs a picker. */
  signatures: SignatureOption[];
}

// ---------------------------------------------------------------------------
// Small list helpers, for the two grid-shaped inputs the server declares
// ---------------------------------------------------------------------------

function useSyncedList<T>(external: readonly T[]): [T[], (next: T[]) => void] {
  const [prevExternal, setPrevExternal] = useState(external);
  const [draft, setDraft] = useState<T[]>(() => (Array.isArray(external) ? [...external] : []));

  if (prevExternal !== external) {
    setPrevExternal(external);
    setDraft(Array.isArray(external) ? [...external] : []);
  }

  return [draft, setDraft];
}

/** One row of plain strings, used for a table's column headers. */
function StringRowEditor({
  field,
  value,
  onChange,
}: {
  field: BlockFieldSchema;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, commit] = useSyncedList<string>(value);

  const update = (index: number, next: string) => {
    const rows = draft.map((entry, i) => (i === index ? next : entry));
    commit(rows);
    onChange(rows);
  };

  const remove = (index: number) => {
    const rows = draft.filter((_, i) => i !== index);
    commit(rows);
    onChange(rows);
  };

  const add = () => {
    const rows = [...draft, ''];
    commit(rows);
    onChange(rows);
  };

  return (
    <div>
      <DynamicListHeader title={field.label} onAdd={add} addLabel="+ Add Column" />

      {draft.length === 0 && (
        <p className={styles.emptyNote}>No columns yet.</p>
      )}

      {draft.map((entry, index) => (
        <div key={index} className={styles.inlineRow}>
          <div className={styles.inlineField}>
            <AdminInput
              label={`Column ${index + 1}`}
              value={entry}
              onChange={(e) => update(index, e.target.value)}
            />
          </div>
          <RemoveButton onClick={() => remove(index)} title={`Remove column ${index + 1}`} />
        </div>
      ))}
    </div>
  );
}

/** A grid of strings, used for a table's body rows. */
function StringGridEditor({
  field,
  value,
  onChange,
}: {
  field: BlockFieldSchema;
  value: string[][];
  onChange: (next: string[][]) => void;
}) {
  const [draft, commit] = useSyncedList<string[]>(value);

  const updateCell = (rowIndex: number, cellIndex: number, next: string) => {
    const rows = draft.map((row, r) =>
      r === rowIndex ? row.map((cell, c) => (c === cellIndex ? next : cell)) : row
    );
    commit(rows);
    onChange(rows);
  };

  const addCell = (rowIndex: number) => {
    const rows = draft.map((row, r) => (r === rowIndex ? [...row, ''] : row));
    commit(rows);
    onChange(rows);
  };

  const removeRow = (rowIndex: number) => {
    const rows = draft.filter((_, i) => i !== rowIndex);
    commit(rows);
    onChange(rows);
  };

  // A new row is as wide as the first row, so a grid stays rectangular. When
  // there is no first row yet, a single cell is the least surprising start.
  const columnCount = draft[0]?.length ?? 1;

  const addRow = () => {
    const rows = [...draft, Array.from({ length: columnCount }, () => '')];
    commit(rows);
    onChange(rows);
  };

  return (
    <div>
      <DynamicListHeader title={field.label} onAdd={addRow} addLabel="+ Add Row" />

      {draft.length === 0 && <p className={styles.emptyNote}>No rows yet.</p>}

      {draft.map((row, rowIndex) => (
        <div key={rowIndex} className={styles.gridRow}>
          <div className={styles.gridRowFields}>
            {row.map((cell, cellIndex) => (
              <AdminInput
                key={cellIndex}
                label={`R${rowIndex + 1}C${cellIndex + 1}`}
                value={cell}
                onChange={(e) => updateCell(rowIndex, cellIndex, e.target.value)}
              />
            ))}
            <button type="button" className={styles.addCellBtn} onClick={() => addCell(rowIndex)}>
              + Cell
            </button>
          </div>
          <RemoveButton onClick={() => removeRow(rowIndex)} title={`Remove row ${rowIndex + 1}`} />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field rendering, dispatched on the server-declared input kind
// ---------------------------------------------------------------------------

function SchemaField({
  field,
  schema,
  props,
  signatures,
  onChange,
}: {
  field: BlockFieldSchema;
  schema: BlockSchema;
  props: DraftBlockProps;
  signatures: SignatureOption[];
  onChange: (value: unknown) => void;
}) {
  const current = readFieldValue(props, schema, field.name);

  switch (field.input) {
    case 'rich_text':
      // The prop is sanitized HTML, so this stays a textarea rather than a
      // contenteditable surface: authoring raw markup is intentional here, and
      // the server strips anything unsafe before it is ever stored.
      return (
        <AdminTextarea
          label={field.label}
          value={typeof current === 'string' ? current : ''}
          onChange={(e) => onChange(e.target.value)}
          minHeight="140px"
        />
      );

    case 'textarea':
      return (
        <AdminTextarea
          label={field.label}
          value={typeof current === 'string' ? current : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'text':
      return (
        <AdminInput
          label={field.label}
          value={typeof current === 'string' ? current : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'select':
      return (
        <AdminSelect
          label={field.label}
          value={typeof current === 'string' ? current : ''}
          onChange={(e) => onChange(e.target.value)}
          options={(field.options ?? []).map((option) => ({ value: option, label: option }))}
        />
      );

    case 'toggle':
      return (
        <AdminCheckbox
          labelTitle={field.label}
          checked={current === true}
          onChange={(e) => onChange(e.target.checked)}
        />
      );

    case 'number':
      return (
        <AdminInput
          label={field.label}
          type="number"
          value={typeof current === 'number' ? current : 0}
          min={field.min}
          max={field.max}
          onChange={(e) => onChange(coerceFieldValue('number', e.target.value))}
        />
      );

    case 'string_row':
      return (
        <StringRowEditor
          field={field}
          value={Array.isArray(current) ? (current as string[]) : []}
          onChange={onChange}
        />
      );

    case 'string_grid':
      return (
        <StringGridEditor
          field={field}
          value={Array.isArray(current) ? (current as string[][]) : []}
          onChange={onChange}
        />
      );

    case 'signature':
      return (
        <AdminSelect
          label={field.label}
          value={typeof current === 'number' ? String(current) : ''}
          placeholder="Select a signature"
          onChange={(e) => onChange(coerceFieldValue('signature', e.target.value))}
          options={signatures.map((signature) => ({
            value: String(signature.id),
            label: signature.name,
          }))}
        />
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Block and page cards
// ---------------------------------------------------------------------------

function SortableBlockCard({
  block,
  blocks,
  signatures,
  onChange,
  onRemove,
}: {
  block: DraftEvidenceBlock;
  blocks: BlockSchema[];
  signatures: SignatureOption[];
  onChange: (next: DraftEvidenceBlock) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const schema = findBlockSchema(blocks, block.type);

  if (!schema) {
    // A block type the client does not recognise is preserved rather than
    // dropped: silently deleting authored content on save is far worse than
    // showing it as uneditable.
    return (
      <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={styles.unknownBlock}>
        <strong>Unsupported block: {block.type}</strong>
        <p className={styles.emptyNote}>This block was authored against a newer server and cannot be edited here.</p>
        <RemoveButton onClick={onRemove} title="Remove block" />
      </div>
    );
  }

  const missing = findMissingRequiredFields(schema, block.props);

  const setField = (name: string, value: unknown) => {
    const field = schema.fields.find((candidate) => candidate.name === name);
    const coerced = field ? coerceFieldValue(field.input, value) : value;

    onChange({ ...block, props: { ...block.props, [name]: coerced } });
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${styles.blockCard} ${isDragging ? styles.dragging : ''}`}
    >
      <div className={styles.blockHeader}>
        <button type="button" className={styles.dragHandle} {...attributes} {...listeners} title="Drag to reorder">
          {schema.label}
        </button>
        <RemoveButton onClick={onRemove} title={`Remove ${schema.label} block`} />
      </div>

      <div className={styles.blockBody}>
        {schema.fields.map((field) => (
          <SchemaField
            key={field.name}
            field={field}
            schema={schema}
            props={block.props}
            signatures={signatures}
            onChange={(value) => setField(field.name, value)}
          />
        ))}
      </div>

      {missing.length > 0 && (
        <p className={styles.missingNote}>Still required: {missing.join(', ')}</p>
      )}
    </div>
  );
}

export default function AdminPageBuilder({ pages, onChange, blocks, signatures }: AdminPageBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const safePages = pages.length > 0 ? pages : [{ id: crypto.randomUUID(), blocks: [] }];

  const commit = (next: DraftEvidencePage[]) => {
    // A page list is never left empty: the payload shape requires at least one
    // page, and an empty array would fail validation for a reason the author
    // cannot see in the UI.
    onChange(next.length > 0 ? next : [{ id: crypto.randomUUID(), blocks: [] }]);
  };

  const updatePage = (pageIndex: number, next: DraftEvidencePage) => {
    commit(pages.map((page, index) => (index === pageIndex ? next : page)));
  };

  const addPage = () => {
    commit([...pages, { id: crypto.randomUUID(), blocks: [] }]);
  };

  const removePage = (pageIndex: number) => {
    commit(pages.filter((_, index) => index !== pageIndex));
  };

  const handleBlockDragEnd = (pageIndex: number) => (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const page = safePages[pageIndex];
    const oldIndex = page.blocks.findIndex((block) => block.id === active.id);
    const newIndex = page.blocks.findIndex((block) => block.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    updatePage(pageIndex, {
      ...page,
      blocks: arrayMove(page.blocks, oldIndex, newIndex),
    });
  };

  return (
    <div className={styles.builder}>
      {safePages.map((page, pageIndex) => (
        <div key={page.id} className={styles.pageCard}>
          <div className={styles.pageHeader}>
            <span className={styles.pageTitle}>Page {pageIndex + 1}</span>
            {pages.length > 1 && (
              <RemoveButton onClick={() => removePage(pageIndex)} title={`Remove page ${pageIndex + 1}`} />
            )}
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBlockDragEnd(pageIndex)}>
            <SortableContext items={page.blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
              {page.blocks.length === 0 && (
                <p className={styles.emptyNote}>This page has no blocks yet.</p>
              )}

              {page.blocks.map((block) => (
                <SortableBlockCard
                  key={block.id}
                  block={block}
                  blocks={blocks}
                  signatures={signatures}
                  onChange={(next) =>
                    updatePage(pageIndex, {
                      ...page,
                      blocks: page.blocks.map((candidate) => (candidate.id === next.id ? next : candidate)),
                    })
                  }
                  onRemove={() =>
                    updatePage(pageIndex, {
                      ...page,
                      blocks: page.blocks.filter((candidate) => candidate.id !== block.id),
                    })
                  }
                />
              ))}
            </SortableContext>
          </DndContext>

          <div className={styles.addBlockRow}>
            {blocks.map((schema) => (
              <button
                key={schema.type}
                type="button"
                className={styles.addBlockBtn}
                onClick={() =>
                  updatePage(pageIndex, {
                    ...page,
                    blocks: [...page.blocks, createBlockFromSchema(schema, schema.type)],
                  })
                }
              >
                + {schema.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button type="button" className={styles.addPageBtn} onClick={addPage}>
        + Add Page
      </button>
    </div>
  );
}
