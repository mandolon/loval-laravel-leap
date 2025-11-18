import {
  Home,
  Ruler,
  Scissors,
  MousePointer2,
  Tag,
  Bookmark
} from 'lucide-react';

interface ViewerToolbarProps {
  inspectMode: boolean;
  onToggleInspect: () => void;
  measurementMode: 'none' | 'distance' | 'area' | 'volume';
  onMeasureDistance: () => void;
  onClearMeasurements: () => void;
  clippingActive: boolean;
  onToggleClipping: () => void;
  onClearClipping: () => void;
  annotationMode: boolean;
  onToggleAnnotation: () => void;
  onResetView: () => void;
  versionId?: string;
  onSaveCameraView?: () => void;
}

export const ViewerToolbar = ({
  inspectMode,
  onToggleInspect,
  measurementMode,
  onMeasureDistance,
  onClearMeasurements,
  clippingActive,
  onToggleClipping,
  onClearClipping,
  annotationMode,
  onToggleAnnotation,
  onResetView,
  versionId,
  onSaveCameraView,
}: ViewerToolbarProps) => {
  // 3D model tab color from ProjectPanel theme (#06B6D4)
  const modelTabColor = '#06B6D4';
  // Hover transparency: 15 in hex = ~8% opacity (same as ProjectPanel tab hover)
  const hoverBgColor = `${modelTabColor}15`;
  
  // Get helper text based on active tool
  const getHelperText = () => {
    if (measurementMode === 'distance') {
      return 'Hover the blue dot over the model, press D to set the first point, then press D again to finish the dimension.';
    }
    if (clippingActive) {
      return 'Hover and press P to drop a section cut, then drag the arrows. Toggle the tool off to keep planes, press P again for more, Esc to cancel.';
    }
    if (annotationMode) {
      return 'Click to pin a note on any surface. Press Esc to cancel, Enter to save.';
    }
    if (inspectMode) {
      return 'Click any part of the model to see its properties.';
    }
    return null;
  };

  const helperText = getHelperText();

  const hasClearButtons = measurementMode === 'distance' || clippingActive;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg pointer-events-auto transition-all duration-300 ease-in-out">
          <div className="flex items-center gap-1 text-foreground">
            {/* Inspect Mode */}
            <button
              onClick={onToggleInspect}
              className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${inspectMode ? 'text-white' : 'text-muted-foreground'}`}
              style={{
                backgroundColor: inspectMode ? modelTabColor : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!inspectMode) {
                  e.currentTarget.style.backgroundColor = hoverBgColor;
                }
              }}
              onMouseLeave={(e) => {
                if (!inspectMode) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              title="Inspect Mode (Hover to Highlight)"
            >
              <MousePointer2 className="h-4 w-4" />
            </button>
            
            {/* Measurement Tools */}
            <button
              onClick={onMeasureDistance}
              className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${measurementMode === 'distance' ? 'text-white' : 'text-muted-foreground'}`}
              style={{
                backgroundColor: measurementMode === 'distance' ? modelTabColor : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (measurementMode !== 'distance') {
                  e.currentTarget.style.backgroundColor = hoverBgColor;
                }
              }}
              onMouseLeave={(e) => {
                if (measurementMode !== 'distance') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              title="Measure Distance"
            >
              <Ruler className="h-4 w-4" />
            </button>
            
            {/* Annotation Tool */}
            <button
              onClick={onToggleAnnotation}
              className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${annotationMode ? 'text-white' : 'text-muted-foreground'}`}
              style={{
                backgroundColor: annotationMode ? modelTabColor : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!annotationMode) {
                  e.currentTarget.style.backgroundColor = hoverBgColor;
                }
              }}
              onMouseLeave={(e) => {
                if (!annotationMode) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              title="Annotate (Tag Notes)"
            >
              <Tag className="h-4 w-4" />
            </button>
            
            {/* Section Cut */}
            <button
              onClick={onToggleClipping}
              className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${clippingActive ? 'text-white' : 'text-muted-foreground'}`}
              style={{
                backgroundColor: clippingActive ? modelTabColor : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!clippingActive) {
                  e.currentTarget.style.backgroundColor = hoverBgColor;
                }
              }}
              onMouseLeave={(e) => {
                if (!clippingActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              title="Section Cut"
            >
              <Scissors className="h-4 w-4" />
            </button>
            
            {/* View Controls */}
            <button
              onClick={onResetView}
              className="h-7 w-7 flex items-center justify-center rounded transition-colors text-muted-foreground"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = hoverBgColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Reset View"
            >
              <Home className="h-4 w-4" />
            </button>
          </div>
          
          {/* Separator and Clear Buttons - animated */}
          <div 
            className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${
              hasClearButtons 
                ? 'max-w-[200px] opacity-100 gap-2' 
                : 'max-w-0 opacity-0 gap-0 w-0'
            }`}
          >
            <div 
              className={`w-px h-5 bg-border transition-all duration-300 ease-in-out ${
                hasClearButtons ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <div className="flex items-center gap-1">
              {measurementMode === 'distance' && (
                <button
                  onClick={onClearMeasurements}
                  className="h-7 px-2 flex items-center justify-center rounded transition-all duration-300 ease-in-out text-muted-foreground text-[10px] whitespace-nowrap"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = hoverBgColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Clear Measurements"
                >
                  Clear
                </button>
              )}
              {clippingActive && (
                <button
                  onClick={onClearClipping}
                  className="h-7 px-2 flex items-center justify-center rounded transition-all duration-300 ease-in-out text-muted-foreground text-[10px] whitespace-nowrap"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = hoverBgColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Clear All Section Cuts"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          
          {/* Save Camera View Button */}
          {versionId && onSaveCameraView && (
            <>
              <div className="w-px h-5 bg-border" />
              <button
                onClick={onSaveCameraView}
                className="h-7 w-7 flex items-center justify-center rounded transition-colors text-muted-foreground"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = hoverBgColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="Save Current View"
              >
                <Bookmark className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        {/* Helper Text */}
        {helperText && (
          <div className="text-[10px] text-muted-foreground pointer-events-none transition-opacity duration-300 ease-in-out">
            {helperText}
          </div>
        )}
      </div>
    </div>
  );
};

