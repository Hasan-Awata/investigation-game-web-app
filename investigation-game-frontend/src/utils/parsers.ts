/**
 * Small pure helpers for defensively reading values that cross the API boundary.
 *
 * The backend hands back error shapes that are inconsistent by design of
 * accident -- a bare string, a Laravel `ErrorBag` (`{ message: {...} }`),
 * an `Error` instance, or an already-extracted field. These helpers make the
 * consumers (`useGameMutation`, the realtime `channel.listen` handlers)
 * independent of that shape.
 */

/** Shape of the error envelopes the API layer rejects with. */
type MaybeStringable = { message?: unknown };

/** Reads a `message` off a value without trusting its type. */
const readMessage = (val: unknown): unknown => {
  if (val === null || typeof val !== 'object') return undefined;
  return (val as MaybeStringable).message;
};

/**
 * Coerces an unknown error/payload value into a renderable string.
 *
 * Guards against React's "Objects are not valid as a React child" crash by
 * guaranteeing a `string` return. Anything that is not a string (or a string
 * reachable one level down through `message`) yields the `fallback`.
 */
export const getSafeString = (val: unknown, fallback: string): string => {
  if (!val) return fallback;
  if (typeof val === 'string') return val;

  const message = readMessage(val);
  if (typeof message === 'string') return message;

  const nested = readMessage(message);
  if (typeof nested === 'string') return nested;

  return fallback;
};

/** Anything that can be merged by identity -- every room entity has a numeric `id`. */
export type Identifiable = { id: number | string };

/**
 * Merges a realtime patch payload into an existing collection.
 *
 * Used by the `channel.listen('ItemsUnlocked' | 'LevelTransitioned')`
 * handlers in `GameRoom`, which receive only the *changed* rows but must
 * return the whole array to the state updater -- a partial payload is not a
 * replacement for the collection.
 *
 * Semantics preserved from the original inline implementation:
 *   - existing entries keep their original position and take the new value,
 *   - unknown entries are appended in payload order,
 *   - duplicate ids within the payload collapse to the last one.
 *
 * Pure: no mutation of either argument.
 */
export const patchArray = <T extends Identifiable>(oldArr: T[] = [], newItems: T[] = []): T[] => {
  const map = new Map<number | string, T>();
  oldArr.forEach((item) => map.set(item.id, item));
  newItems.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
};
