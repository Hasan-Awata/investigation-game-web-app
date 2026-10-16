/**
 * Location choices carry a map point. Historically that point was stringly
 * encoded inside the choice text as `"x,y | Label"` and re-parsed with
 * `.split('|')`/`.split(',')` in five different places.
 *
 * The admin draft now holds a structured {@link ChoiceCoordinate}; these
 * helpers are the only place that knows the legacy text encoding. The wire
 * format is unchanged (`"x,y | Label"`), so the gameplay runtime and the
 * backend keep reading it exactly as before.
 */

export interface ChoiceCoordinate {
  x: string;
  y: string;
  label: string;
}

interface CoordinateSource {
  coordinate?: ChoiceCoordinate | null;
  text: string;
}

/**
 * Parses the legacy `"x,y | Label"` text encoding. Returns `null` when the
 * text is not a coordinate point (mirrors the old `split` guards).
 */
export const parseCoordinateText = (text: string): ChoiceCoordinate | null => {
  const parts = (text ?? '').split('|');
  if (parts.length < 2) return null;

  const coords = parts[0].split(',');
  if (coords.length < 2 || !coords[0].trim()) return null;

  return { x: coords[0].trim(), y: coords[1].trim(), label: parts[1].trim() };
};

/** Canonical wire encoding of a coordinate point. */
export const formatCoordinateText = (coordinate: ChoiceCoordinate): string =>
  `${coordinate.x},${coordinate.y} | ${coordinate.label}`;

/** Reads a choice's structured coordinate, falling back to the legacy text. */
export const getChoiceCoordinate = (choice: CoordinateSource): ChoiceCoordinate | null =>
  choice.coordinate ?? parseCoordinateText(choice.text);
