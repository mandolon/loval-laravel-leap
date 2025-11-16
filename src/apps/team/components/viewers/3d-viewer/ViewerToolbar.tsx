import {
  Home,
  Ruler,
  Box,
  Cuboid,
  Scissors,
  MousePointer2
} from 'lucide-react';

interface ViewerToolbarProps {
  filename: string;
  versionNumber?: string;
  inspectMode: boolean;
  onToggleInspect: () => void;
  measurementMode: 'none' | 'distance' | 'area' | 'volume';
  onMeasureDistance: () => void;
  onMeasureArea: () => void;
  onMeasureVolume: () => void;
  onClearMeasurements: () => void;
  clippingActive: boolean;
  onToggleClipping: () => void;
  onResetView: () => void;
}

export const ViewerToolbar = ({
  filename,
  versionNumber,
  inspectMode,
  onToggleInspect,
  measurementMode,
  onMeasureDistance,
  onMeasureArea,
  onMeasureVolume,
  onClearMeasurements,
  clippingActive,
  onToggleClipping,
  onResetView,
}: ViewerToolbarProps) => {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 h-10 bg-card border-b border-border">
      <div className="flex items-center gap-1 min-w-0">
        <h3 className="text-[10px] font-medium text-card-foreground truncate max-w-[220px]">
          {filename}
        </h3>
        {versionNumber && (
          <span className="text-[10px] text-muted-foreground ml-1">
            ({versionNumber})
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 text-foreground">
        {/* Inspect Mode */}
        <button
          onClick={onToggleInspect}
          className={`h-7 w-7 flex items-center justify-center rounded hover:bg-muted ${inspectMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          title="Inspect Mode (Hover to Highlight)"
        >
          <MousePointer2 className="h-4 w-4" />
        </button>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        {/* Measurement Tools */}
        <button
          onClick={onMeasureDistance}
          className={`h-7 w-7 flex items-center justify-center rounded hover:bg-muted ${measurementMode === 'distance' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          title="Measure Distance"
        >
          <Ruler className="h-4 w-4" />
        </button>
        <button
          onClick={onMeasureArea}
          className={`h-7 w-7 flex items-center justify-center rounded hover:bg-muted ${measurementMode === 'area' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          title="Measure Area"
        >
          <Box className="h-4 w-4" />
        </button>
        <button
          onClick={onMeasureVolume}
          className={`h-7 w-7 flex items-center justify-center rounded hover:bg-muted ${measurementMode === 'volume' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          title="Measure Volume"
        >
          <Cuboid className="h-4 w-4" />
        </button>
        {measurementMode === 'distance' && (
          <button
            onClick={onClearMeasurements}
            className="h-7 px-2 flex items-center justify-center rounded hover:bg-muted text-muted-foreground text-[10px]"
            title="Clear Measurements"
          >
            Clear
          </button>
        )}
        
        <div className="w-px h-5 bg-border mx-1" />
        
        {/* Clipping Plane */}
        <button
          onClick={onToggleClipping}
          className={`h-7 w-7 flex items-center justify-center rounded hover:bg-muted ${clippingActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          title="Toggle Clipping Planes"
        >
          <Scissors className="h-4 w-4" />
        </button>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        {/* View Controls */}
        <button
          onClick={onResetView}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
          title="Reset View"
        >
          <Home className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

