import {
  Home,
  Ruler,
  Scissors,
  MousePointer2,
  Tag,
  Bookmark,
  Camera
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ModelCameraView } from '@/lib/api/types';

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
  onLoadCameraView?: (view: ModelCameraView) => void;
  savedCameraViews?: ModelCameraView[];
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
  onLoadCameraView,
  savedCameraViews = [],
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
        <div className="flex items-center gap-1 px-2 py-1.5 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg pointer-events-auto transition-all duration-300 ease-in-out">
          <div className="flex items-center gap-1 text-foreground">
            {/* Inspect Mode */}
            <button
              onClick={onToggleInspect}
              className={`h-8 w-8 flex items-center justify-center rounded transition-colors ${inspectMode ? 'text-white' : 'text-[#202020]'}`}
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
              <MousePointer2 className="h-[18px] w-[18px]" strokeWidth={1} />
            </button>
            
            {/* Measurement Tools */}
            <button
              onClick={onMeasureDistance}
              className={`h-8 w-8 flex items-center justify-center rounded transition-colors ${measurementMode === 'distance' ? 'text-white' : 'text-[#202020]'}`}
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
              <Ruler className="h-[18px] w-[18px]" strokeWidth={1} />
            </button>
            
            {/* Annotation Tool */}
            <button
              onClick={onToggleAnnotation}
              className={`h-8 w-8 flex items-center justify-center rounded transition-colors ${annotationMode ? 'text-white' : 'text-[#202020]'}`}
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
              <Tag className="h-[18px] w-[18px]" strokeWidth={1} />
            </button>
            
            {/* Section Cut */}
            <button
              onClick={onToggleClipping}
              className={`h-8 w-8 flex items-center justify-center rounded transition-colors ${clippingActive ? 'text-white' : 'text-[#202020]'}`}
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
              <Scissors className="h-[18px] w-[18px]" strokeWidth={1} />
            </button>
            
            {/* Separator */}
            <div className="w-px h-5 bg-border mx-0.5" />
            
            {/* View Controls */}
            <button
              onClick={onResetView}
              className="h-8 w-8 flex items-center justify-center rounded transition-colors text-[#202020]"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = hoverBgColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Reset View"
            >
              <Home className="h-[18px] w-[18px]" strokeWidth={1} />
            </button>
          </div>
          
          {/* Separator and Clear Buttons - animated */}
          <div 
            className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${
              hasClearButtons 
                ? 'max-w-[200px] opacity-100 gap-1.5' 
                : 'max-w-0 opacity-0 gap-0 w-0'
            }`}
          >
            <div 
              className={`w-px h-5 bg-border transition-all duration-300 ease-in-out ml-0.5 ${
                hasClearButtons ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <div className="flex items-center gap-1">
              {measurementMode === 'distance' && (
                <button
                  onClick={onClearMeasurements}
                  className="h-8 px-2 flex items-center justify-center rounded transition-all duration-300 ease-in-out text-[#202020] text-[10px] whitespace-nowrap"
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
                  className="h-8 px-2 flex items-center justify-center rounded transition-all duration-300 ease-in-out text-[#202020] text-[10px] whitespace-nowrap"
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
          
          {/* Camera Views Dropdown - Hidden */}
          {false && versionId && (
            <>
              <div className="w-px h-5 bg-border ml-0.5" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="h-8 w-8 flex items-center justify-center rounded transition-colors text-[#202020]"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = hoverBgColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    title="Camera Views"
                  >
                    <Camera className="h-[18px] w-[18px]" strokeWidth={1} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  {onSaveCameraView && (
                    <>
                      <DropdownMenuItem onClick={onSaveCameraView}>
                        <Bookmark className="h-4 w-4 mr-2" />
                        Save Current View
                      </DropdownMenuItem>
                      {savedCameraViews.length > 0 && (
                        <div className="h-px bg-border my-1" />
                      )}
                    </>
                  )}
                  {savedCameraViews.length === 0 ? (
                    <DropdownMenuItem disabled>
                      No saved views
                    </DropdownMenuItem>
                  ) : (
                    savedCameraViews.map((view) => (
                      <DropdownMenuItem
                        key={view.id}
                        onClick={() => onLoadCameraView?.(view)}
                      >
                        {view.name}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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

