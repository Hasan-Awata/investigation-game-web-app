import { useState } from 'react';
import toast from 'react-hot-toast';
import type { DocBlock, DocBlockType, TableColumn, TableRow } from '@/types/evidence/doc';
import { clampSpan } from '@/types/evidence/shared';
import { AdminInput, AdminSelect, AdminTextarea, RemoveButton } from '@/pages/Admin/components/AdminUI';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import { validateImageSize } from '@/pages/Admin/utils/validators';
import { uploadAdminBlockImage } from '@/services/adminApi';
import type { BlockPath } from './docTree';
import {
  ALIGNMENTS, BLOCK_LABELS, BLOCK_GLYPHS, CELL_TYPES, DIAGRAM_PRESETS, IMAGE_FILTERS,
  META_TONES, PROSE_TONES, RULE_VARIANTS, STAMP_TONES, TABLE_TONES,
} from './labels';
import docBuilderLegacy from './DocBuilderLegacy.module.css';
import adminDashboard from '../../AdminDashboard.module.css';

const opts = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));
const num = (v: string, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Every prop editor receives the block plus a writer for a whole new props object. */
interface EditorProps {
  block: DocBlock;
  patch: (props: Record<string, unknown>) => void;
}

/* ------------------------------------------------------------------ *
 * Per-type prop editors
 * ------------------------------------------------------------------ */

const LetterheadEditor = ({ block, patch }: EditorProps) => {
  const p = block.props as Extract<DocBlock, { type: 'letterhead' }>['props'];
  return (
    <>
      <AdminInput label="Agency" value={p.agency ?? ''} onChange={(e) => patch({ ...p, agency: e.target.value })} />
      <AdminInput label="Title" value={p.title ?? ''} onChange={(e) => patch({ ...p, title: e.target.value })} />
      <AdminInput label="Subtitle" value={p.sub ?? ''} onChange={(e) => patch({ ...p, sub: e.target.value })} />
      <AdminInput label="Aside label" value={p.asideLabel ?? ''} onChange={(e) => patch({ ...p, asideLabel: e.target.value })} />
      <AdminInput label="Aside value" value={p.aside ?? ''} onChange={(e) => patch({ ...p, aside: e.target.value })} />
      <label className={docBuilderLegacy['docb-check']}>
        <input type="checkbox" checked={p.rule !== false} onChange={(e) => patch({ ...p, rule: e.target.checked })} />
        <span>Rule beneath header</span>
      </label>
    </>
  );
};

const MetaGridEditor = ({ block, patch }: EditorProps) => {
  const p = block.props as Extract<DocBlock, { type: 'meta_grid' }>['props'];
  const rows = p.rows ?? [];

  return (
    <>
      <AdminSelect
        label="Tone"
        value={p.tone ?? 'rows'}
        options={opts(META_TONES)}
        onChange={(e) => patch({ ...p, tone: e.target.value as never })}
      />
      <AdminSelect
        label="Columns"
        value={String(p.columns ?? 2)}
        options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))}
        onChange={(e) => patch({ ...p, columns: num(e.target.value, 2) })}
      />

      <div className={docBuilderLegacy['docb-subhead']}>Rows ({rows.length})</div>
      {rows.map((row, i) => (
        <div className={docBuilderLegacy['docb-row']} key={i}>
          <input
            className={adminDashboard['admin-input']}
            value={row.label}
            placeholder="Label"
            onChange={(e) => patch({ ...p, rows: rows.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)) })}
          />
          <input
            className={adminDashboard['admin-input']}
            value={row.value}
            placeholder="Value"
            onChange={(e) => patch({ ...p, rows: rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)) })}
          />
          <RemoveButton onClick={() => patch({ ...p, rows: rows.filter((_, j) => j !== i) })} />
        </div>
      ))}
      <button type="button" className={docBuilderLegacy['docb-mini']} onClick={() => patch({ ...p, rows: [...rows, { label: '', value: '' }] })}>
        + Row
      </button>
    </>
  );
};

const ProseEditor = ({ block, patch }: EditorProps) => {
  const p = block.props as Extract<DocBlock, { type: 'prose' }>['props'];
  return (
    <>
      <AdminSelect
        label="Tone"
        value={p.tone ?? 'typed'}
        options={opts(PROSE_TONES)}
        onChange={(e) => patch({ ...p, tone: e.target.value as never })}
      />
      <AdminTextarea
        label="HTML"
        minHeight="140px"
        value={p.html ?? ''}
        onChange={(e) => patch({ ...p, html: e.target.value })}
      />
      <p className={docBuilderLegacy['docb-hint']}>
        Allowed markup: <code>&lt;strong&gt;</code> <code>&lt;em&gt;</code> <code>&lt;br&gt;</code>{' '}
        <code>&lt;ul&gt;</code> <code>&lt;ol&gt;</code> <code>&lt;li&gt;</code>, plus the{' '}
        <code>redacted</code> and <code>highlighted</code> span classes. Everything else is stripped at render.
      </p>
    </>
  );
};

const TableEditor = ({ block, patch }: EditorProps) => {
  const p = block.props as Extract<DocBlock, { type: 'table' }>['props'];
  const columns = p.columns ?? [];
  const rows = p.rows ?? [];

  const setColumn = (i: number, next: Partial<TableColumn>) =>
    patch({ ...p, columns: columns.map((c, j) => (j === i ? { ...c, ...next } : c)) });
  const setCell = (r: number, key: string, value: string) =>
    patch({ ...p, rows: rows.map((row, j) => (j === r ? { ...row, [key]: value } : row)) });

  return (
    <>
      <AdminSelect
        label="Tone"
        value={p.tone ?? 'ledger'}
        options={opts(TABLE_TONES)}
        onChange={(e) => patch({ ...p, tone: e.target.value as never })}
      />
      <AdminInput label="Caption" value={p.caption ?? ''} onChange={(e) => patch({ ...p, caption: e.target.value })} />
      <AdminInput label="Empty message" value={p.emptyMessage ?? ''} onChange={(e) => patch({ ...p, emptyMessage: e.target.value })} />

      <div className={docBuilderLegacy['docb-subhead']}>Columns ({columns.length})</div>
      {columns.map((c, i) => (
        <div className={docBuilderLegacy['docb-stack']} key={c.key}>
          <div className={docBuilderLegacy['docb-row']}>
            <input
              className={adminDashboard['admin-input']}
              value={c.key}
              placeholder="key"
              onChange={(e) => setColumn(i, { key: e.target.value })}
            />
            <RemoveButton onClick={() => patch({ ...p, columns: columns.filter((_, j) => j !== i) })} />
          </div>
          <input
            className={adminDashboard['admin-input']}
            value={c.label}
            placeholder="Label"
            onChange={(e) => setColumn(i, { label: e.target.value })}
          />
          <div className={docBuilderLegacy['docb-row']}>
            <select className={adminDashboard['admin-input']} value={c.type ?? 'text'} onChange={(e) => setColumn(i, { type: e.target.value as never })}>
              {CELL_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <select className={adminDashboard['admin-input']} value={c.align ?? 'start'} onChange={(e) => setColumn(i, { align: e.target.value as never })}>
              {ALIGNMENTS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      ))}
      <button
        type="button"
        className={docBuilderLegacy['docb-mini']}
        onClick={() =>
          patch({
            ...p,
            columns: [...columns, { key: `col_${columns.length + 1}`, label: '', align: 'start', type: 'text' }],
          })
        }
      >
        + Column
      </button>

      <div className={docBuilderLegacy['docb-subhead']}>Rows ({rows.length})</div>
      {rows.length === 0 && <p className={docBuilderLegacy['docb-hint']}>No rows yet. The empty message is shown in their place.</p>}
      {rows.map((row, r) => (
        <div className={docBuilderLegacy['docb-stack']} key={r}>
          {columns.map((c) => (
            <input
              key={c.key}
              className={adminDashboard['admin-input']}
              value={(row as TableRow)[c.key] ?? ''}
              placeholder={c.label || c.key}
              onChange={(e) => setCell(r, c.key, e.target.value)}
            />
          ))}
          <RemoveButton onClick={() => patch({ ...p, rows: rows.filter((_, j) => j !== r) })} />
        </div>
      ))}
      <button
        type="button"
        className={docBuilderLegacy['docb-mini']}
        disabled={columns.length === 0}
        onClick={() =>
          patch({
            ...p,
            rows: [...rows, Object.fromEntries(columns.map((c) => [c.key, ''])) as TableRow],
          })
        }
      >
        + Row
      </button>
    </>
  );
};

const ListEditor = ({ block, patch }: EditorProps) => {
  const p = block.props as Extract<DocBlock, { type: 'list' }>['props'];
  const items = p.items ?? [];
  return (
    <>
      <label className={docBuilderLegacy['docb-check']}>
        <input type="checkbox" checked={!!p.ordered} onChange={(e) => patch({ ...p, ordered: e.target.checked })} />
        <span>Numbered</span>
      </label>
      {items.map((item, i) => (
        <div className={docBuilderLegacy['docb-row']} key={i}>
          <input
            className={adminDashboard['admin-input']}
            value={item}
            onChange={(e) => patch({ ...p, items: items.map((it, j) => (j === i ? e.target.value : it)) })}
          />
          <RemoveButton onClick={() => patch({ ...p, items: items.filter((_, j) => j !== i) })} />
        </div>
      ))}
      <button type="button" className={docBuilderLegacy['docb-mini']} onClick={() => patch({ ...p, items: [...items, ''] })}>
        + Item
      </button>
    </>
  );
};

const SignatureRowEditor = ({ block, patch }: EditorProps) => {
  const p = block.props as Extract<DocBlock, { type: 'signature_row' }>['props'];
  const columns = p.columns ?? [];
  return (
    <>
      {columns.map((c, i) => (
        <div className={docBuilderLegacy['docb-row']} key={i}>
          <input
            className={adminDashboard['admin-input']}
            value={c.caption}
            placeholder="Caption"
            onChange={(e) => patch({ ...p, columns: columns.map((x, j) => (j === i ? { caption: e.target.value } : x)) })}
          />
          <RemoveButton onClick={() => patch({ ...p, columns: columns.filter((_, j) => j !== i) })} />
        </div>
      ))}
      <button type="button" className={docBuilderLegacy['docb-mini']} onClick={() => patch({ ...p, columns: [...columns, { caption: '' }] })}>
        + Column
      </button>
    </>
  );
};

const StampEditor = ({ block, patch }: EditorProps) => {
  const p = block.props as Extract<DocBlock, { type: 'stamp' }>['props'];
  return (
    <>
      <AdminInput label="Text" value={p.text ?? ''} onChange={(e) => patch({ ...p, text: e.target.value })} />
      <AdminSelect
        label="Tone"
        value={p.tone ?? 'official'}
        options={opts(STAMP_TONES)}
        onChange={(e) => patch({ ...p, tone: e.target.value as never })}
      />
    </>
  );
};

const BarcodeEditor = ({ block, patch }: EditorProps) => {
  const p = block.props as Extract<DocBlock, { type: 'barcode' }>['props'];
  return <AdminInput label="Value" value={p.value ?? ''} onChange={(e) => patch({ ...p, value: e.target.value })} />;
};

const WatermarkEditor = ({ block, patch }: EditorProps) => {
  const p = block.props as Extract<DocBlock, { type: 'watermark' }>['props'];
  return (
    <>
      <AdminInput label="Text" value={p.text ?? ''} onChange={(e) => patch({ ...p, text: e.target.value })} />
      <AdminInput
        label="Rotate"
        type="number"
        value={String(p.rotate ?? -30)}
        onChange={(e) => patch({ ...p, rotate: num(e.target.value, -30) })}
      />
      <p className={docBuilderLegacy['docb-hint']}>Drawn behind the sheet content, and mirrored automatically in RTL.</p>
    </>
  );
};

const RuleEditor = ({ block, patch }: EditorProps) => {
  const p = block.props as Extract<DocBlock, { type: 'rule' }>['props'];
  return (
    <AdminSelect
      label="Variant"
      value={p.variant ?? 'solid'}
      options={opts(RULE_VARIANTS)}
      onChange={(e) => patch({ ...p, variant: e.target.value as never })}
    />
  );
};

const SpacerEditor = ({ block, patch }: EditorProps) => {
  const p = block.props as Extract<DocBlock, { type: 'spacer' }>['props'];
  return (
    <AdminInput
      label="Height (px)"
      type="number"
      value={String(p.height ?? 24)}
      onChange={(e) => patch({ ...p, height: num(e.target.value, 24) })}
    />
  );
};

const ImageEditor = ({ block, patch }: EditorProps) => {
  const p = block.props as Extract<DocBlock, { type: 'image' }>['props'];
  return (
    <>
      <AdminSelect
        label="Filter"
        value={p.filter ?? 'plain'}
        options={opts(IMAGE_FILTERS)}
        onChange={(e) => patch({ ...p, filter: e.target.value as never })}
      />
      <AdminInput label="URL" value={p.url ?? ''} onChange={(e) => patch({ ...p, url: e.target.value })} />
      <AdminInput label="Caption" value={p.caption ?? ''} onChange={(e) => patch({ ...p, caption: e.target.value })} />
      <AdminInput
        label="Rotate"
        type="number"
        value={String(p.rotate ?? '')}
        onChange={(e) => patch({ ...p, rotate: e.target.value === '' ? undefined : num(e.target.value, 0) })}
      />
    </>
  );
};

const AnnotationEditor = ({ block, patch }: EditorProps) => {
  const p = block.props as Extract<DocBlock, { type: 'annotation' }>['props'];
  return (
    <>
      <AdminTextarea
        label="Text"
        minHeight="60px"
        value={p.text ?? ''}
        onChange={(e) => patch({ ...p, text: e.target.value })}
      />
      <AdminInput
        label="Rotate"
        type="number"
        value={String(p.rotate ?? -2)}
        onChange={(e) => patch({ ...p, rotate: num(e.target.value, -2) })}
      />
    </>
  );
};

const RedactionEditor = ({ block, patch }: EditorProps) => {
  const p = block.props as Extract<DocBlock, { type: 'redaction' }>['props'];
  return (
    <>
      <AdminInput
        label="Lines"
        type="number"
        min={1}
        value={String(p.lines ?? 1)}
        onChange={(e) => patch({ ...p, lines: num(e.target.value, 1) })}
      />
      <AdminInput label="Label" value={p.label ?? ''} onChange={(e) => patch({ ...p, label: e.target.value })} />
    </>
  );
};

const DiagramEditor = ({ block, patch }: EditorProps) => {
  const p = block.props as Extract<DocBlock, { type: 'diagram' }>['props'];
  return (
    <>
      <AdminSelect
        label="Preset"
        value={p.preset ?? 'body_outline'}
        options={opts(DIAGRAM_PRESETS)}
        onChange={(e) => patch({ ...p, preset: e.target.value as never })}
      />
      <AdminInput label="Caption" value={p.caption ?? ''} onChange={(e) => patch({ ...p, caption: e.target.value })} />
      <p className={docBuilderLegacy['docb-hint']}>
        <code>electropherogram</code> and <code>mass_spec</code> are seeded from the evidence id, so every row
        gets a stable, distinct chart. They are drawn, not uploaded.
      </p>
    </>
  );
};

/* ------------------------------------------------------------------ *
 * Two-column child lists
 * ------------------------------------------------------------------ */

interface TwoColumnEditorProps extends EditorProps {
  path: BlockPath;
  onSelectPath: (path: BlockPath) => void;
  onAddChild: (side: 0 | 1, type: DocBlockType) => void;
  onMoveChild: (side: 0 | 1, index: number, dir: -1 | 1) => void;
}

const TwoColumnEditor = ({
  block, patch, path, onSelectPath, onAddChild, onMoveChild,
}: TwoColumnEditorProps) => {
  const p = block.props as Extract<DocBlock, { type: 'two_column' }>['props'];
  const [pending, setPending] = useState<0 | 1>(1);

  const renderSide = (s: 0 | 1, title: string) => {
    const key = s === 1 ? 'right' : 'left';
    const list = p[key] ?? [];

    return (
      <div className={docBuilderLegacy['docb-side']} key={s}>
        <div className={docBuilderLegacy['docb-subhead']}>{title} ({list.length})</div>
        {list.length === 0 && <p className={docBuilderLegacy['docb-hint']}>Empty.</p>}
        {list.map((child, i) => (
          <div className={docBuilderLegacy['docb-child']} key={child.id}>
            <button type="button" className={docBuilderLegacy['docb-child-pick']} onClick={() => onSelectPath([...path, s, i])}>
              <span className={docBuilderLegacy['docb-palette-glyph']} aria-hidden="true">{BLOCK_GLYPHS[child.type]}</span>
              {BLOCK_LABELS[child.type]}
            </button>
            <div className={docBuilderLegacy['docb-child-move']}>
              <button type="button" className={docBuilderLegacy['docb-mini']} onClick={() => onMoveChild(s, i, -1)}>&uarr;</button>
              <button type="button" className={docBuilderLegacy['docb-mini']} onClick={() => onMoveChild(s, i, 1)}>&darr;</button>
              <RemoveButton
                onClick={() => patch({ ...p, [key]: list.filter((_, j) => j !== i) })}
                title={`Remove ${BLOCK_LABELS[child.type]}`}
              />
            </div>
          </div>
        ))}
        <div className={docBuilderLegacy['docb-row']}>
          <select
            className={adminDashboard['admin-input']}
            value={pending}
            onChange={(e) => setPending(Number(e.target.value) as 0 | 1)}
            aria-label="Target column"
          >
            <option value={0}>Leading</option>
            <option value={1}>Trailing</option>
          </select>
          <select
            className={adminDashboard['admin-input']}
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              onAddChild(pending, e.target.value as DocBlockType);
              e.target.value = '';
            }}
            aria-label="Block type to add"
          >
            <option value="">Add block...</option>
            {Object.entries(BLOCK_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={docBuilderLegacy['docb-row']}>
        <div className={adminDashboard['form-group']} style={{ flex: 1 }}>
          <label>Gap</label>
          <input
            className={adminDashboard['admin-input']}
            type="number"
            value={String(p.gap ?? 28)}
            onChange={(e) => patch({ ...p, gap: num(e.target.value, 28) })}
          />
        </div>
        <div className={adminDashboard['form-group']} style={{ flex: 1 }}>
          <label>Trailing width</label>
          <input
            className={adminDashboard['admin-input']}
            type="number"
            value={String(p.rightWidth ?? '')}
            placeholder="auto"
            onChange={(e) =>
              patch({ ...p, rightWidth: e.target.value === '' ? undefined : num(e.target.value, 170) })
            }
          />
        </div>
      </div>
      {renderSide(0, 'Leading column')}
      {renderSide(1, 'Trailing column')}
    </>
  );
};

/* ------------------------------------------------------------------ *
 * Inspector shell
 * ------------------------------------------------------------------ */

interface BlockInspectorProps {
  block: DocBlock | null;
  path: BlockPath;
  caseId: number | string | null;
  storeLocally: boolean;
  onChange: (next: DocBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (dir: -1 | 1) => void;
  onSelectPath: (path: BlockPath) => void;
  onAddChild: (side: 0 | 1, type: DocBlockType) => void;
  onMoveChild: (side: 0 | 1, index: number, dir: -1 | 1) => void;
}

export default function BlockInspector({
  block, path, caseId, storeLocally, onChange, onDelete, onDuplicate, onMove,
  onSelectPath, onAddChild, onMoveChild,
}: BlockInspectorProps) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.docBuilder;
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const patch = (props: Record<string, unknown>) => onChange({ ...block!, props } as DocBlock);

  const handleUpload = async (file: File | null) => {
    if (!file || !block) return;

    const sizeError = validateImageSize(file, 4);
    if (sizeError) { setImageError(sizeError); return; }
    if (caseId === null || caseId === undefined || caseId === '') {
      setImageError('Select a case before uploading block images.');
      return;
    }

    setImageError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('case_id', String(caseId));
      fd.append('store_locally', storeLocally ? '1' : '0');
      fd.append('image', file);
      const res = await uploadAdminBlockImage(fd);

      if (res.isSuccess) {
        onChange({ ...block, props: { ...block.props, url: res.value.url } } as DocBlock);
        toast.success('Block image uploaded.');
      } else {
        setImageError(res.errorMessage);
      }
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!block) {
    return (
      <aside className={`${docBuilderLegacy['docb-pane']} docb-pane--inspector`}>
        <h4 className={docBuilderLegacy['docb-pane-title']}>{t?.inspectorTitle ?? 'Inspector'}</h4>
        <p className={docBuilderLegacy['docb-hint']}>{t?.inspectorEmpty ?? 'Select a block on the sheet to edit it.'}</p>
      </aside>
    );
  }

  const renderProps = () => {
    switch (block.type) {
      case 'letterhead': return <LetterheadEditor block={block} patch={patch} />;
      case 'meta_grid': return <MetaGridEditor block={block} patch={patch} />;
      case 'prose': return <ProseEditor block={block} patch={patch} />;
      case 'table': return <TableEditor block={block} patch={patch} />;
      case 'list': return <ListEditor block={block} patch={patch} />;
      case 'signature_row': return <SignatureRowEditor block={block} patch={patch} />;
      case 'stamp': return <StampEditor block={block} patch={patch} />;
      case 'barcode': return <BarcodeEditor block={block} patch={patch} />;
      case 'watermark': return <WatermarkEditor block={block} patch={patch} />;
      case 'rule': return <RuleEditor block={block} patch={patch} />;
      case 'spacer': return <SpacerEditor block={block} patch={patch} />;
      case 'image': return <ImageEditor block={block} patch={patch} />;
      case 'annotation': return <AnnotationEditor block={block} patch={patch} />;
      case 'redaction': return <RedactionEditor block={block} patch={patch} />;
      case 'diagram': return <DiagramEditor block={block} patch={patch} />;
      case 'two_column': return null;
    }
  };

  return (
    <aside className={`${docBuilderLegacy['docb-pane']} docb-pane--inspector`}>
      <h4 className={docBuilderLegacy['docb-pane-title']}>{t?.inspectorTitle ?? 'Inspector'}</h4>

      <div className={docBuilderLegacy['docb-inspector-head']}>
        <span className={docBuilderLegacy['docb-palette-glyph']} aria-hidden="true">{BLOCK_GLYPHS[block.type]}</span>
        <strong>{t?.blocks?.[block.type] ?? BLOCK_LABELS[block.type]}</strong>
        <code className={docBuilderLegacy['docb-id']}>{block.id}</code>
      </div>

      {path.length > 1 && <p className={docBuilderLegacy['docb-hint']}>Nested inside a two-column block.</p>}

      <div className={docBuilderLegacy['docb-row']}>
        <div className={adminDashboard['form-group']} style={{ flex: 1 }}>
          <label>Span (of 12)</label>
          <input
            className={adminDashboard['admin-input']}
            type="number"
            min={1}
            max={12}
            value={clampSpan(block.span)}
            onChange={(e) => onChange({ ...block, span: clampSpan(num(e.target.value, 12)) })}
          />
        </div>
        <div className={adminDashboard['form-group']} style={{ flex: 1 }}>
          <label>Align</label>
          <select
            className={adminDashboard['admin-input']}
            value={block.style?.align ?? 'start'}
            onChange={(e) => onChange({ ...block, style: { ...block.style, align: e.target.value as never } })}
          >
            {ALIGNMENTS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {block.type === 'image' && (
        <div className={adminDashboard['form-group']}>
          <label>{t?.uploadImage ?? 'Upload image'}</label>
          <input
            className={adminDashboard['admin-file-input']}
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => {
              void handleUpload(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
          {uploading && <p className={docBuilderLegacy['docb-hint']}>{t?.uploading ?? 'Uploading...'}</p>}
          {imageError && <p className={docBuilderLegacy['docb-error']}>{imageError}</p>}
        </div>
      )}

      {renderProps()}

      {block.type === 'two_column' && (
        <TwoColumnEditor
          block={block}
          patch={patch}
          path={path}
          onSelectPath={onSelectPath}
          onAddChild={onAddChild}
          onMoveChild={onMoveChild}
        />
      )}

      <div className={docBuilderLegacy['docb-actions']}>
        <button type="button" className={docBuilderLegacy['docb-mini']} onClick={() => onMove(-1)} title="Move up" aria-label="Move up">&uarr;</button>
        <button type="button" className={docBuilderLegacy['docb-mini']} onClick={() => onMove(1)} title="Move down" aria-label="Move down">&darr;</button>
        <button type="button" className={docBuilderLegacy['docb-mini']} onClick={onDuplicate}>{t?.duplicate ?? 'Duplicate'}</button>
        <button type="button" className={`${docBuilderLegacy['docb-mini']} ${docBuilderLegacy['docb-mini--danger']}`} onClick={onDelete}>{t?.remove ?? 'Remove'}</button>
      </div>
    </aside>
  );
}
