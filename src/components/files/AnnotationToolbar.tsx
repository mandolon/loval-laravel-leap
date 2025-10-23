import { Button } from '@/components/ui/button';
import { 
  MousePointer2, 
  Pencil, 
  Minus, 
  Square, 
  Circle, 
  Type, 
  Eraser,
  Undo2,
  Redo2,
  Save
} from 'lucide-react';
import type { AnnotationTool, GridSizeKey } from '@/types/annotations';

interface AnnotationToolbarProps {
  onToolChange: (tool: AnnotationTool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onGridSizeChange: (size: GridSizeKey) => void;
  onGridToggle: (visible: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  currentTool: AnnotationTool;
  currentColor: string;
  currentStrokeWidth: number;
  currentGridSize: GridSizeKey;
  gridVisible: boolean;
}

const toolIcons: Record<AnnotationTool, any> = {
  select: MousePointer2,
  pen: Pencil,
  line: Minus,
  rectangle: Square,
  circle: Circle,
  text: Type,
  eraser: Eraser,
};

const toolLabels: Record<AnnotationTool, string> = {
  select: 'Select',
  pen: 'Pen',
  line: 'Line',
  rectangle: 'Rectangle',
  circle: 'Circle',
  text: 'Text',
  eraser: 'Eraser',
};

export const AnnotationToolbar = ({
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onGridSizeChange,
  onGridToggle,
  onUndo,
  onRedo,
  onSave,
  currentTool,
  currentColor,
  currentStrokeWidth,
  currentGridSize,
  gridVisible,
}: AnnotationToolbarProps) => {
  const tools: AnnotationTool[] = ['select', 'pen', 'line', 'rectangle', 'circle', 'text', 'eraser'];

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-background border-b border-border flex-wrap">
      {/* Tool Buttons */}
      <div className="flex gap-1">
        {tools.map((tool) => {
          const Icon = toolIcons[tool];
          return (
            <Button
              key={tool}
              size="sm"
              variant={currentTool === tool ? 'default' : 'outline'}
              onClick={() => onToolChange(tool)}
              title={toolLabels[tool]}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-border" />

      {/* Color Picker */}
      <div className="flex items-center gap-2">
        <label htmlFor="color-picker" className="text-xs text-muted-foreground">
          Color:
        </label>
        <input
          id="color-picker"
          type="color"
          value={currentColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-10 h-8 cursor-pointer rounded border border-border"
        />
      </div>

      {/* Stroke Width */}
      <div className="flex items-center gap-2">
        <label htmlFor="stroke-width" className="text-xs text-muted-foreground">
          Width:
        </label>
        <input
          id="stroke-width"
          type="range"
          min="1"
          max="10"
          value={currentStrokeWidth}
          onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
          className="w-20"
        />
        <span className="text-xs w-6 text-muted-foreground">{currentStrokeWidth}px</span>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-border" />

      {/* Grid Controls */}
      <div className="flex items-center gap-2">
        <select
          value={currentGridSize}
          onChange={(e) => onGridSizeChange(e.target.value as GridSizeKey)}
          className="h-8 px-2 text-xs rounded border border-border bg-background"
        >
          <option value='1"'>Grid: 1"</option>
          <option value='6"'>Grid: 6"</option>
          <option value='12"'>Grid: 12"</option>
        </select>

        <label className="flex items-center gap-1 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={gridVisible}
            onChange={(e) => onGridToggle(e.target.checked)}
            className="cursor-pointer"
          />
          Show Grid
        </label>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-border" />

      {/* Undo/Redo */}
      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={onUndo} title="Undo (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={onRedo} title="Redo (Ctrl+Y)">
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Save */}
      <Button size="sm" variant="default" onClick={onSave} className="ml-auto">
        <Save className="h-4 w-4 mr-1" />
        Save
      </Button>
    </div>
  );
};
