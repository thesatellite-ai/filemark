// Shared constants used by BOTH the extension host (Node) and the webview
// (browser). Kept in one place so a value can't drift between the two sides —
// e.g. the host clamps an incoming zoom and the webview clamps an outgoing one;
// they must agree exactly.

/** Preview zoom multiplier bounds + step. 1 = 100%. */
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.1;
/** Default zoom when nothing is stored. */
export const DEFAULT_ZOOM = 1;

/**
 * Clamp a zoom value into [ZOOM_MIN, ZOOM_MAX] and snap it to one-decimal steps.
 * Snapping guarantees 100% (1.0) is always exactly reachable via +/- steps and
 * that a stored/garbage value can never produce a broken layout. Pure — safe to
 * call on either side of the host↔webview boundary.
 */
export function clampZoom(zoom: number): number {
  const snapped = Math.round(zoom * 10) / 10;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, snapped));
}
