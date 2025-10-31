// Excalidraw Measurement & Arrow Counter Utilities
// Extracted from wrapper component (lines 20-242)

// Scale presets for architectural drawings
export const SCALE_PRESETS = {
  "1/8\" = 1'": 1/8,
  "3/16\" = 1'": 3/16,
  "1/4\" = 1'": 1/4,
  "1/2\" = 1'": 1/2,
  "1\" = 1'": 1,
} as const;

export type ScalePreset = keyof typeof SCALE_PRESETS;

/**
 * Calculate inches per scene unit based on drawing scale
 * Calibrated for 1/4" = 1' baseline
 */
export function getInchesPerSceneUnit(drawingInchesPerFoot: number): number {
  const scaleFactor = 12 / drawingInchesPerFoot;
  return 1.493 * (scaleFactor / 48);
}

/**
 * Format inches to feet-inches notation (e.g., "43'-02"")
 */
export function formatInchesToFeetInches(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remainingInches = Math.round(inches % 12);
  return `${feet}'-${remainingInches.toString().padStart(2, '0')}"`;
}

// Arrow metadata storage
export type ArrowInfo = { textId: string; override?: string };

const arrowMeta = new Map<string, ArrowInfo>();

/**
 * Calculate the total length of an arrow element
 */
export function lengthOfArrow(el: any): number {
  if (el.type !== "arrow" || !Array.isArray(el.points) || el.points.length < 2) return 0;
  let len = 0;
  for (let i = 1; i < el.points.length; i++) {
    const [x1, y1] = el.points[i - 1];
    const [x2, y2] = el.points[i];
    const dx = x2 - x1, dy = y2 - y1;
    len += Math.hypot(dx, dy);
  }
  return len;
}

/**
 * Find the midpoint of an arrow for label placement
 */
function midPointOfArrow(el: any): { x: number; y: number } {
  const segments: Array<{ x1: number; y1: number; x2: number; y2: number; d: number }> = [];
  let acc = 0;
  for (let i = 1; i < el.points.length; i++) {
    const x1 = el.x + el.points[i - 1][0];
    const y1 = el.y + el.points[i - 1][1];
    const x2 = el.x + el.points[i][0];
    const y2 = el.y + el.points[i][1];
    const d = Math.hypot(x2 - x1, y2 - y1);
    segments.push({ x1, y1, x2, y2, d });
    acc += d;
  }
  const half = acc / 2;
  let run = 0;
  for (const s of segments) {
    if (run + s.d >= half) {
      const t = (half - run) / s.d;
      return { x: s.x1 + (s.x2 - s.x1) * t, y: s.y1 + (s.y2 - s.y1) * t };
    }
    run += s.d;
  }
  return { x: el.x + el.width / 2, y: el.y + el.height / 2 };
}

/**
 * Convert scene length to formatted dimension string (discrete 1-inch steps)
 * Matches wrapper logic: uses floor division with 1-inch steps
 */
function valueForLength(sceneLength: number, inchesPerSceneUnit: number): string {
  // Convert inchesPerSceneUnit to pxPerStep equivalent
  // inchesPerSceneUnit = inches/pixel, so pxPerStep (pixels/1-inch-step) = 1/inchesPerSceneUnit
  const pxPerStep = 1 / inchesPerSceneUnit;
  const steps = Math.max(0, Math.floor(sceneLength / pxPerStep));
  const totalInches = 0 + steps * 1; // startInches=0, stepInches=1
  return formatInchesToFeetInches(totalInches);
}

/**
 * Get dimension value for an arrow (with override support, discrete 1-inch steps)
 * Matches wrapper logic: uses floor division with 1-inch steps
 */
function valueForArrow(el: any, inchesPerSceneUnit: number, info?: ArrowInfo): string {
  if (info?.override != null) return info.override;
  const L = lengthOfArrow(el);
  // Convert inchesPerSceneUnit to pxPerStep equivalent
  const pxPerStep = 1 / inchesPerSceneUnit;
  const steps = Math.max(0, Math.floor(L / pxPerStep));
  const totalInches = 0 + steps * 1; // startInches=0, stepInches=1
  return formatInchesToFeetInches(totalInches);
}

/**
 * Create a text element at specific coordinates
 */
function makeTextElementAt(x: number, y: number, text: string): any {
  return {
    type: "text",
    text,
    originalText: text, // Required for export - must be a string for Fonts.getCharsPerFamily
    fontSize: 4,
    fontFamily: 1,
    textAlign: "center",
    verticalAlign: "middle",
    lineHeight: 1.25, // Default line height as unitless value
    autoResize: true, // Required property for text elements
    x: x,
    y: y,
    width: 0,
    height: 0,
    angle: 0,
    opacity: 100,
    strokeColor: "#000",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: null,
    groupIds: [],
    seed: (Math.random() * 1e9) | 0,
    version: 1,
    versionNonce: (Math.random() * 1e9) | 0,
    isDeleted: false,
    locked: false,
    boundElements: null,
    containerId: null, // Required for text elements
  };
}

/**
 * Generate unique ID
 */
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

// Recursion guard and RAF tracking
let raf: number | null = null;
let isUpdatingScene = false;

export interface ArrowCounterStats {
  count: number;
  values: string[];
}

/**
 * Main arrow counter logic - automatically labels arrows with dimensions
 * Includes recursion guard to prevent infinite update loops
 */
export function handleArrowCounter(
  elements: any[],
  api: any,
  inchesPerSceneUnit: number | null,
  onStatsChange?: (stats: ArrowCounterStats) => void
) {
  if (isUpdatingScene || !inchesPerSceneUnit) return;

  // Detect newly created arrows and attach labels
  const newArrows: any[] = [];
  for (const el of elements) {
    if (el.type === "arrow" && !arrowMeta.has(el.id) && !el.isDeleted) {
      newArrows.push(el);
    }
  }

  // Create labels for new arrows in one batch
  if (newArrows.length > 0) {
    isUpdatingScene = true;
    const scene = api.getSceneElements();
    const newTexts: any[] = [];

    for (const el of newArrows) {
      const mid = midPointOfArrow(el);
      const L = lengthOfArrow(el);
      const txt = makeTextElementAt(mid.x, mid.y, valueForLength(L, inchesPerSceneUnit));
      txt.id = uid();
      newTexts.push(txt);
      arrowMeta.set(el.id, { textId: txt.id });
    }

    api.updateScene({ elements: [...scene, ...newTexts] });
    isUpdatingScene = false;
  }

  // Update positions and values for existing labels
  if (raf) cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    const map = new Map(elements.map(e => [e.id, e]));
    const needsUpdate: any[] = [];

    for (const [arrowId, meta] of arrowMeta.entries()) {
      const arrow = map.get(arrowId);
      if (!arrow || arrow.isDeleted) {
        arrowMeta.delete(arrowId);
        continue;
      }
      const textEl = map.get(meta.textId);
      if (!textEl || textEl.isDeleted) continue;

      const val = valueForArrow(arrow, inchesPerSceneUnit, meta);
      const mid = midPointOfArrow(arrow);

      if (textEl.text !== val || textEl.x !== mid.x || textEl.y !== mid.y) {
        textEl.text = val;
        textEl.originalText = val; // Keep originalText in sync for export compatibility
        textEl.x = mid.x;
        textEl.y = mid.y;
        needsUpdate.push(textEl);
      }
    }

    // Only update if something changed
    if (needsUpdate.length > 0) {
      isUpdatingScene = true;
      const scene = api.getSceneElements();
      api.updateScene({ elements: [...scene] });
      isUpdatingScene = false;
    }

    // Notify callback of current stats (for UI display)
    if (onStatsChange) {
      const values: string[] = [];
      for (const [arrowId, meta] of arrowMeta.entries()) {
        const arrow = map.get(arrowId);
        if (arrow && !arrow.isDeleted) {
          values.push(valueForArrow(arrow, inchesPerSceneUnit, meta));
        }
      }
      onStatsChange({ count: arrowMeta.size, values });
    }
  });
}

/**
 * Set manual override for selected arrows
 */
export function setOverrideForSelection(api: any) {
  const sel = api.getSelectedElements().filter((e: any) => e.type === "arrow");
  if (!sel.length) return;
  const input = prompt("Set value for selected arrow(s) (e.g., 6'-00\"):", "");
  if (input == null) return;
  const trimmed = input.trim();
  for (const el of sel) {
    const info = arrowMeta.get(el.id);
    if (!info) continue;
    if (trimmed) {
      info.override = trimmed;
    } else {
      delete info.override;
    }
  }
  api.updateScene({ elements: [...api.getSceneElements()] });
}

/**
 * Clear overrides for selected arrows
 */
export function clearOverrideForSelection(api: any) {
  const sel = api.getSelectedElements().filter((e: any) => e.type === "arrow");
  for (const el of sel) {
    const info = arrowMeta.get(el.id);
    if (info && "override" in info) delete info.override;
  }
  api.updateScene({ elements: [...api.getSceneElements()] });
}

/**
 * Reset arrow counter state (call when switching between drawings)
 */
export function resetArrowCounterState() {
  arrowMeta.clear();
  if (raf) {
    cancelAnimationFrame(raf);
    raf = null;
  }
  isUpdatingScene = false;
}
