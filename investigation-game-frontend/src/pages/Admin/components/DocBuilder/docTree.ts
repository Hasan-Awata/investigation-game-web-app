import type { DocBlock } from '@/types/evidence/doc';

/**
 * Immutable tree helpers for the builder.
 *
 * Blocks form a shallow tree: the root is the sheet's block array, and
 * `two_column` is the only variant with children (`props.left` / `props.right`).
 * Selection therefore cannot be a flat id lookup, so the builder addresses a
 * block by an INDEX PATH from the root.
 *
 * Path grammar (resolved top-down, which is how every function below walks it):
 *
 *   []           the whole block list
 *   [i]          the i-th block of the current list
 *   [i, 0, j]    the j-th LEADING child of the two_column at [i]
 *   [i, 1, j]    the j-th TRAILING child of the two_column at [i]
 *
 * The `0 | 1` segment only ever appears directly beneath a `two_column`, so it
 * is unambiguous. The leading/trailing split is what `TwoColumnProps` stores, and
 * a path can therefore round-trip losslessly through
 * `blockAtPath` / `updateBlockAtPath` / `removeBlockAtPath`.
 *
 * Every function returns new arrays/objects and never mutates its input, which is
 * what lets the builder keep React state honest.
 */

export type BlockPath = number[];

const LEADING: 0 | 1 = 0;
const TRAILING: 0 | 1 = 1;

const childList = (block: DocBlock, side: number): DocBlock[] =>
  block.type === 'two_column' ? (side === TRAILING ? block.props.right : block.props.left) ?? [] : [];

/** Resolves the block at `path`, or null if any segment is out of range. */
export const blockAtPath = (blocks: DocBlock[], path: BlockPath): DocBlock | null => {
  const [head, ...rest] = path;
  const found = head === undefined ? null : blocks[head];
  if (!found) return null;
  if (rest.length === 0) return found;
  if (found.type !== 'two_column') return null;
  return blockAtPath(childList(found, rest[0]), rest.slice(1));
};

/** Replaces the block at `path`, cloning every branch it touches. */
export const updateBlockAtPath = (blocks: DocBlock[], path: BlockPath, next: DocBlock): DocBlock[] => {
  const [head, ...rest] = path;
  if (head === undefined) return blocks;

  return blocks.map((b, i) => {
    if (i !== head) return b;
    if (rest.length === 0) return next;
    if (b.type !== 'two_column') return b;

    const [side, ...deeper] = rest;
    const key = side === TRAILING ? 'right' : 'left';
    return {
      ...b,
      props: { ...b.props, [key]: updateBlockAtPath(childList(b, side), deeper, next) },
    } as DocBlock;
  });
};

/** Removes the block at `path`. A `two_column` emptied of both sides is dropped. */
export const removeBlockAtPath = (blocks: DocBlock[], path: BlockPath): DocBlock[] => {
  const [head, ...rest] = path;
  if (head === undefined) return blocks;

  if (rest.length === 0) return blocks.filter((_, i) => i !== head);

  return blocks
    .map((b, i) => {
      if (i !== head || b.type !== 'two_column') return b;
      const [side, ...deeper] = rest;
      const key = side === TRAILING ? 'right' : 'left';
      return {
        ...b,
        props: { ...b.props, [key]: removeBlockAtPath(childList(b, side), deeper) },
      } as DocBlock;
    })
    .filter((b) => b.type !== 'two_column' || b.props.left.length > 0 || b.props.right.length > 0);
};

/**
 * Appends `block` to one side of the `two_column` addressed by `path`.
 *
 * Resolves the parent by path rather than assuming it is a root block: the
 * inspector lets an author drill into a nested `two_column` and add to IT, and
 * an index-at-`path[0]` implementation would silently append to the outermost
 * container instead.
 */
export const appendChildAtPath = (
  blocks: DocBlock[],
  path: BlockPath,
  block: DocBlock,
  side: 0 | 1 = TRAILING,
): DocBlock[] => {
  const parent = blockAtPath(blocks, path);
  if (!parent || parent.type !== 'two_column') return blocks;

  const key = side === TRAILING ? 'right' : 'left';
  return updateBlockAtPath(blocks, path, {
    ...parent,
    props: { ...parent.props, [key]: [...(parent.props[key] ?? []), block] },
  } as DocBlock);
};

/**
 * Reorders the block at `path` among its siblings. `path` is the FULL path to
 * the block, e.g. `[3, 0, 2]` for the trailing 3rd child of root block 3, or
 * `[1, 0, 2, 1, 0]` for a grandchild. Clamped, never wraps.
 *
 * The last two segments are the side flag and the sibling index; everything
 * before them is the parent's own path, which is what makes this work at any
 * nesting depth.
 */
export const moveChildAtPath = (blocks: DocBlock[], path: BlockPath, dir: -1 | 1): DocBlock[] => {
  if (path.length < 2) return blocks;

  const parentPath = path.slice(0, -2);
  const side = path[path.length - 2];
  const index = path[path.length - 1];

  const parent = blockAtPath(blocks, parentPath);
  if (!parent || parent.type !== 'two_column') return blocks;

  const key = side === TRAILING ? 'right' : 'left';
  const list = [...(parent.props[key] ?? [])];
  const to = index + dir;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return blocks;

  const [moved] = list.splice(index, 1);
  list.splice(to, 0, moved);

  return updateBlockAtPath(blocks, parentPath, {
    ...parent,
    props: { ...parent.props, [key]: list },
  } as DocBlock);
};

/** Root-level reorder used by the canvas drag handles. */
export const moveRootBlock = (blocks: DocBlock[], from: number, to: number): DocBlock[] => {
  if (from === to || from < 0 || from >= blocks.length) return blocks;
  const next = [...blocks];
  const [moved] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, moved);
  return next;
};

/** Root-level insert, used by both the palette drop and the palette click. */
export const insertRootBlock = (blocks: DocBlock[], block: DocBlock, index: number): DocBlock[] => {
  const next = [...blocks];
  next.splice(Math.max(0, Math.min(next.length, index)), 0, block);
  return next;
};

/** Depth-first search for a block id, returning its path, or null. */
export const findBlockPath = (blocks: DocBlock[], id: string, prefix: BlockPath = []): BlockPath | null => {
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    if (b.id === id) return [...prefix, i];

    if (b.type === 'two_column') {
      // Descend with the full descent path so the recursion can return an
      // absolute path, not a path relative to the child list.
      const leading = findBlockPath(b.props.left ?? [], id, [...prefix, i, 0]);
      if (leading) return leading;
      const trailing = findBlockPath(b.props.right ?? [], id, [...prefix, i, 1]);
      if (trailing) return trailing;
    }
  }
  return null;
};

/** Replaces a block's type while preserving its id, span, and style. */
export const retypeBlock = (block: DocBlock, fresh: DocBlock): DocBlock =>
  ({ ...fresh, id: block.id, span: block.span, style: block.style }) as DocBlock;

/** True when `path` addresses a block nested inside a `two_column`. */
export const isNestedPath = (path: BlockPath): boolean => path.length > 1;

/** Replaces a block's props without touching its id, span, or style. */
export const withProps = (block: DocBlock, props: Record<string, unknown>): DocBlock =>
  ({ ...block, props }) as DocBlock;

export { LEADING, TRAILING };
