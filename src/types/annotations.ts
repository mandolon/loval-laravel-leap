export type AnnotationTool = 'select' | 'pen' | 'line' | 'rectangle' | 'circle' | 'text' | 'eraser';

export interface AnnotationData {
  id: string;
  type: AnnotationTool;
  pdfCoordinates: [number, number][]; // ALWAYS in PDF space
  color: string;
  strokeWidth: number;
  text?: string;
  timestamp: number;
  version: number;
}

export interface FileAnnotation {
  id: string;
  file_id: string;
  project_id: string;
  version_number: number;
  annotation_data: { objects: AnnotationData[] };
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GridSize {
  label: string;
  points: number;
}

export const GRID_PRESETS = {
  '1"': 72,    // 1 inch = 72 PDF points
  '6"': 432,   // 6 inches
  '12"': 864   // 12 inches (DEFAULT)
} as const;

export type GridSizeKey = keyof typeof GRID_PRESETS;
