/**
 * Centralised Web Storage access layer.
 *
 * Every consumer in the app previously hand-rolled its own
 * `storage.getItem` -> `JSON.parse` -> `try/catch` block, which meant:
 *   - corrupted values threw `SyntaxError` straight into React render,
 *   - some call sites silently swallowed the error and kept the bad value,
 *   - some call sites purged, others did not.
 *
 * These helpers make the failure mode uniform: a read never throws, and a
 * value that cannot be parsed is evicted so the next read starts clean.
 * Writes never throw either -- a full quota or a browser in strict/private
 * mode degrades to "state is not persisted", not to a crashed component.
 */

export type StorageType = 'local' | 'session';

const resolveStore = (type: StorageType): Storage | null => {
  try {
    return type === 'local' ? localStorage : sessionStorage;
  } catch (error) {
    // Touching the global throws a SecurityError in sandboxed frames and in
    // browsers configured to block third-party storage.
    console.warn(`Web ${type}Storage is unavailable in this context.`, error);
    return null;
  }
};

/**
 * Safely reads and parses a JSON value out of Web Storage.
 *
 * If the stored payload is unparseable, the corrupted key is removed and the
 * `fallback` is returned, so callers never have to guard the parse themselves.
 * An absent key returns the `fallback` without touching storage.
 *
 * NOTE: "unparseable" includes a bare, unquoted legacy string. That eviction is
 * intentional, but it means any value written before the JSON migration was
 * lost on its first read rather than migrated. See the accepted-data-loss note
 * in AgentNotepad.tsx for the one key where this was actually observed.
 *
 * Keys holding opaque scalars must use getSafeStringStorage below instead, which
 * has no purge path and therefore cannot lose data.
 */
export const getSafeStorage = <T>(type: StorageType, key: string, fallback: T): T => {
  const store = resolveStore(type);
  if (!store) return fallback;

  let raw: string | null;
  try {
    raw = store.getItem(key);
  } catch (error) {
    console.warn(`Failed to read "${key}" from ${type}Storage.`, error);
    return fallback;
  }

  if (raw === null) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    // Self-healing: a single bad write must not brick the feature forever.
    console.warn(`Corrupted JSON at ${type}Storage key "${key}". Purging.`, error);
    try {
      store.removeItem(key);
    } catch (purgeError) {
      console.warn(`Failed to purge corrupted ${type}Storage key "${key}".`, purgeError);
    }
    return fallback;
  }
};

/**
 * Serialises and writes a value to Web Storage. Never throws.
 */
export const setSafeStorage = <T>(type: StorageType, key: string, value: T): void => {
  const store = resolveStore(type);
  if (!store) return;

  try {
    store.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Quota exceeded, private mode, or serialisation of a cyclic value.
    console.warn(`Failed to persist "${key}" to ${type}Storage.`, error);
  }
};

/**
 * Reads an OPAQUE string value out of Web Storage.
 *
 * This is deliberately NOT the JSON variant above. Some keys -- most
 * importantly `auth_token` -- are stored and read as bare strings, and their
 * value is interpolated into outbound headers (`Bearer ${token}`). Running
 * them through `setSafeStorage` would persist the value *with literal quote
 * characters*, and `getSafeStorage` would throw on a legacy bare value and
 * then purge it. Both failure modes are silent auth-breaking bugs.
 *
 * Therefore this pair preserves the on-disk format byte-for-byte: no
 * serialisation, no parsing, and consequently no corruption path and no
 * eviction. It exists purely so that a blocked or unavailable Web Storage
 * degrades to the fallback instead of throwing into a render or a request.
 */
export const getSafeStringStorage = (type: StorageType, key: string, fallback: string): string => {
  const store = resolveStore(type);
  if (!store) return fallback;

  try {
    return store.getItem(key) ?? fallback;
  } catch (error) {
    console.warn(`Failed to read "${key}" from ${type}Storage.`, error);
    return fallback;
  }
};

/**
 * Writes an opaque string to Web Storage verbatim. Never throws.
 */
export const setSafeStringStorage = (type: StorageType, key: string, value: string): void => {
  const store = resolveStore(type);
  if (!store) return;

  try {
    store.setItem(key, value);
  } catch (error) {
    // Quota exceeded or private/restricted mode.
    console.warn(`Failed to persist "${key}" to ${type}Storage.`, error);
  }
};

/**
 * Removes a single key from Web Storage. Never throws.
 */
export const removeSafeStorage = (type: StorageType, key: string): void => {
  const store = resolveStore(type);
  if (!store) return;

  try {
    store.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove "${key}" from ${type}Storage.`, error);
  }
};

/**
 * Purges every session key scoped to a room.
 *
 * Room-scoped keys are written under both the invite code and the numeric id
 * (`room_<invite_code>_guilty_characters`, `room_<id>_viewed_evidence`, ...),
 * so both prefixes are swept. Used when leaving a room and when a verdict
 * finalises the case.
 */
export const clearRoomSessionData = (roomId: string | number, inviteCode?: string): void => {
  const store = resolveStore('session');
  if (!store) return;

  const prefixes = new Set<string>();
  if (inviteCode !== undefined && inviteCode !== null && `${inviteCode}` !== '') {
    prefixes.add(`room_${inviteCode}`);
  }
  if (roomId !== undefined && roomId !== null && `${roomId}` !== '') {
    prefixes.add(`room_${roomId}`);
  }
  if (prefixes.size === 0) return;

  try {
    Object.keys(store).forEach((key) => {
      for (const prefix of prefixes) {
        if (key.includes(prefix)) {
          store.removeItem(key);
          return;
        }
      }
    });
  } catch (error) {
    console.warn('Failed to purge room session data.', error);
  }
};
