import {
  Home,
  Ruler,
  Box,
  Cuboid,
  Scissors,
  MousePointer2,
  Tag
} from 'lucide-react';

interface ViewerToolbarProps {
  inspectMode: boolean;
  onToggleInspect: () => void;
  measurementMode: 'none' | 'distance' | 'area' | 'volume';
  onMeasureDistance: () => void;
  onMeasureArea: () => void;
  onMeasureVolume: () => void;
  onClearMeasurements: () => void;
  clippingActive: boolean;
  onToggleClipping: () => void;
  annotationMode: boolean;
  onToggleAnnotation: () => void;
  onResetView: () => void;
}

export const ViewerToolbar = ({
  inspectMode,
  onToggleInspect,
  measurementMode,
  onMeasureDistance,
  onMeasureArea,
  onMeasureVolume,
  onClearMeasurements,
  clippingActive,
  onToggleClipping,
  annotationMode,
  onToggleAnnotation,
  onResetView,
}: ViewerToolbarProps) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="flex items-center gap-2 px-3 py-2 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg pointer-events-auto">
        <div className="flex items-center gap-1 text-foreground">
          {/* Inspect Mode */}
          <button
            onClick={onToggleInspect}
            className={`h-7 w-7 flex items-center justify-center rounded hover:bg-muted ${inspectMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            title="Inspect Mode (Hover to Highlight)"
          >
            <MousePointer2 className="h-4 w-4" />
          </button>
          
          <div className="w-px h-5 bg-border" />
          
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
          
          <div className="w-px h-5 bg-border" />
          
          {/* Annotation Tool */}
          <button
            onClick={onToggleAnnotation}
            className={`h-7 w-7 flex items-center justify-center rounded hover:bg-muted ${annotationMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            title="Annotate (Tag Notes)"
          >
            <Tag className="h-4 w-4" />
          </button>
          
          <div className="w-px h-5 bg-border" />
          
          {/* Clipping Plane */}
          <button
            onClick={onToggleClipping}
            className={`h-7 w-7 flex items-center justify-center rounded hover:bg-muted ${clippingActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            title="Toggle Clipping Planes"
          >
            <Scissors className="h-4 w-4" />
          </button>
          
          <div className="w-px h-5 bg-border" />
          
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
    </div>
  );
};

