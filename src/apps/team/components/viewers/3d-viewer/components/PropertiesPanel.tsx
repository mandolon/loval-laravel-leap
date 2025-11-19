import { StandardizedElementMetrics } from '../utils/ifcPropertyAdapter';

interface PropertiesPanelProps {
  objectName: string | null;
  objectType: string | null;
  objectDimensions?: any | null;
  elementMetrics?: StandardizedElementMetrics | null;
}

export const PropertiesPanel = ({ objectName, objectType, objectDimensions, elementMetrics }: PropertiesPanelProps) => {
  try {
    if (!objectName && !objectType && !elementMetrics) {
      return null;
    }

    // Use elementMetrics if available, otherwise fall back to legacy objectDimensions
    const metrics = elementMetrics || objectDimensions;
    if (!metrics || typeof metrics !== 'object') {
      return null;
    }

    const ifcClass = (metrics as any)?.ifcClass || '';
    const elementCategory = (metrics as any)?.elementCategory || '';
    const objectTypeUpper = objectType?.toUpperCase();
    const isRoof = elementCategory === 'roof' || ifcClass === 'IfcRoof' || (objectTypeUpper === 'ROOF');
    const isFloorCategory = elementCategory === 'floor';
    const isDeckCategory = elementCategory === 'deck';
    const isSlab =
      elementCategory === 'slab' ||
      isFloorCategory ||
      isDeckCategory ||
      ifcClass === 'IfcSlab' ||
      objectTypeUpper === 'SLAB' ||
      objectTypeUpper === 'FLOOR' ||
      objectTypeUpper === 'DECK';
    
    // Determine display label for slab-type elements
    const objectNameLower = (objectName || (metrics as any)?.name || '').toLowerCase();
    const nameSuggestsFloor = objectNameLower.includes('floor');
    const displaySlabType = isFloorCategory || nameSuggestsFloor
      ? 'FLOOR'
      : isDeckCategory
        ? 'DECK'
        : isSlab
          ? 'SLAB'
          : null;
    const isWall = elementCategory === 'wall' || ifcClass === 'IfcWall' || ifcClass === 'IfcWallStandardCase' || (objectType?.toUpperCase() === 'WALL');
    const isDoor = elementCategory === 'door' || ifcClass === 'IfcDoor' || (objectType?.toUpperCase() === 'DOOR');
    const isWindow = elementCategory === 'window' || ifcClass === 'IfcWindow' || (objectType?.toUpperCase() === 'WINDOW');
    const isFooting = elementCategory === 'footing' || ifcClass === 'IfcFooting' || (objectType?.toUpperCase() === 'FOOTING');
    const isColumn = elementCategory === 'column' || ifcClass === 'IfcColumn' || (objectType?.toUpperCase() === 'COLUMN');
    const isBeam = elementCategory === 'beam' || ifcClass === 'IfcBeam' || (objectType?.toUpperCase() === 'BEAM');
    const isRailing = elementCategory === 'railing' || ifcClass === 'IfcRailing' || (objectType?.toUpperCase() === 'RAILING');
    const isStair = elementCategory === 'stair' || ifcClass === 'IfcStair' || ifcClass === 'IfcStairFlight';
    const isMass = elementCategory === 'mass' || ifcClass === 'IfcBuildingElementProxy' || ifcClass === 'IfcProxy';
    const isCasework = elementCategory === 'casework' || ifcClass === 'IfcFurniture';

    // Check if we have any dimensions to show
    const hasDimensions = metrics && typeof metrics === 'object' && Object.keys(metrics).some(key => {
    try {
      return !key.startsWith('_') && 
        key !== 'ifcClass' && 
        key !== 'expressID' && 
        key !== 'globalId' &&
        key !== 'name' &&
        key !== 'typeName' &&
        key !== 'typeMark' &&
        key !== 'instanceMark' &&
        key !== 'levelName' &&
        key !== 'phase' &&
        key !== 'isExternal' &&
        metrics[key] !== undefined && 
        metrics[key] !== null && 
        metrics[key] !== '';
      } catch (err) {
        return false;
      }
    });

    return (
      <div className="absolute bottom-4 right-4 z-30 pointer-events-none">
        <div className="px-3 py-2 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg pointer-events-auto max-w-xs">
          <div className="text-foreground">
          {(displaySlabType || objectType) && (
            <>
              <div className="text-[10px] text-muted-foreground mb-1">Type</div>
              <div className="text-[11px] font-medium mb-2">{displaySlabType || objectType}</div>
            </>
          )}
          {objectName && (
            <>
              <div className="text-[10px] text-muted-foreground mb-1">Object Name</div>
              <div className="text-[11px] font-medium mb-2">{objectName}</div>
            </>
          )}
          
          {hasDimensions && (
            <>
              <div className="text-[10px] text-muted-foreground mb-1">Dimensions</div>
              <div className="text-[11px] font-medium space-y-1">
                {/* Roof-specific fields */}
                {isRoof && (
                  <>
                    {(metrics as any).slope && (
                      <div>Slope: {(metrics as any).slope}</div>
                    )}
                    {(metrics as any).slopeText && (metrics as any).slopeText !== (metrics as any).slope && (
                      <div>Slope Text: {(metrics as any).slopeText}</div>
                    )}
                    {(metrics as any).thickness && (
                      <div>Thickness: {(metrics as any).thickness}</div>
                    )}
                    {(metrics as any).surfaceAreaDisplay && (
                      <div>Roof surface area: {(metrics as any).surfaceAreaDisplay}</div>
                    )}
                    {(metrics as any).footprintAreaDisplay && (
                      <div>Roof footprint area: {(metrics as any).footprintAreaDisplay}</div>
                    )}
                    {(metrics as any).baseLevelLabel && (
                      <div>Base Level: {(metrics as any).baseLevelLabel}</div>
                    )}
                    {(metrics as any).baseOffsetDisplay && (
                      <div>Base Offset: {(metrics as any).baseOffsetDisplay}</div>
                    )}
                    {(metrics as any).maxRidgeHeightDisplay && (
                      <div>Max Ridge Height: {(metrics as any).maxRidgeHeightDisplay}</div>
                    )}
                  </>
                )}

                {/* Slab-specific fields */}
                {isSlab && (
                  <>
                    {(metrics as any).areaDisplay && (
                      <div>Area: {(metrics as any).areaDisplay}</div>
                    )}
                    {(metrics as any).volumeDisplay && (
                      <div>Volume: {(metrics as any).volumeDisplay}</div>
                    )}
                    {(metrics as any).sizeDisplay && (
                      <div>Size: {(metrics as any).sizeDisplay}</div>
                    )}
                  </>
                )}

                {/* Wall-specific fields */}
                {isWall && (
                  <>
                    {(metrics as any).lengthDisplay && (
                      <div>Length: {(metrics as any).lengthDisplay}</div>
                    )}
                    {(metrics as any).heightDisplay && (
                      <div>Height: {(metrics as any).heightDisplay}</div>
                    )}
                    {(metrics as any).thicknessDisplay && (
                      <div>Thickness: {(metrics as any).thicknessDisplay}</div>
                    )}
                    {(metrics as any).areaOneSideDisplay && (
                      <div>Area: {(metrics as any).areaOneSideDisplay}</div>
                    )}
                    {(metrics as any).volumeDisplay && (
                      <div>Volume: {(metrics as any).volumeDisplay}</div>
                    )}
                    {(metrics as any).isExternal !== undefined && (
                      <div>Type: {(metrics as any).isExternal ? 'Exterior' : 'Interior'}</div>
                    )}
                  </>
                )}

                {/* Door-specific fields */}
                {isDoor && (
                  <>
                    {(metrics as any).sizeDisplay && (
                      <div>Size: {(metrics as any).sizeDisplay}</div>
                    )}
                    {(metrics as any).leafAreaDisplay && (
                      <div>Area: {(metrics as any).leafAreaDisplay}</div>
                    )}
                    {(metrics as any).isExterior !== undefined && (
                      <div>Type: {(metrics as any).isExterior ? 'Exterior' : 'Interior'}</div>
                    )}
                  </>
                )}

                {/* Window-specific fields */}
                {isWindow && (
                  <>
                    {(metrics as any).sizeDisplay && (
                      <div>Size: {(metrics as any).sizeDisplay}</div>
                    )}
                    {(metrics as any).areaDisplay && (
                      <div>Area: {(metrics as any).areaDisplay}</div>
                    )}
                    {(metrics as any).isExterior !== undefined && (
                      <div>Type: {(metrics as any).isExterior ? 'Exterior' : 'Interior'}</div>
                    )}
                  </>
                )}

                {/* Footing-specific fields */}
                {isFooting && (
                  <>
                    {(metrics as any).lengthDisplay && (
                      <div>Length: {(metrics as any).lengthDisplay}</div>
                    )}
                    {(metrics as any).widthDisplay && (
                      <div>Width: {(metrics as any).widthDisplay}</div>
                    )}
                    {(metrics as any).thicknessDisplay && (
                      <div>Thickness: {(metrics as any).thicknessDisplay}</div>
                    )}
                    {(metrics as any).volumeDisplay && (
                      <div>Volume: {(metrics as any).volumeDisplay}</div>
                    )}
                    {(metrics as any).footingType && (
                      <div>Type: {(metrics as any).footingType}</div>
                    )}
                  </>
                )}

                {/* Column-specific fields */}
                {isColumn && (
                  <>
                    {(metrics as any).lengthDisplay && (
                      <div>Length: {(metrics as any).lengthDisplay}</div>
                    )}
                    {(metrics as any).sizeDisplay || (metrics as any).sizeLabel ? (
                      <div>Size: {(metrics as any).sizeDisplay || (metrics as any).sizeLabel}</div>
                    ) : null}
                    {(metrics as any).crossSectionAreaDisplay && (
                      <div>Cross Section: {(metrics as any).crossSectionAreaDisplay}</div>
                    )}
                  </>
                )}

                {/* Beam-specific fields */}
                {isBeam && (
                  <>
                    {(metrics as any).lengthDisplay && (
                      <div>Length: {(metrics as any).lengthDisplay}</div>
                    )}
                    {(metrics as any).sizeDisplay || (metrics as any).sizeLabel ? (
                      <div>Size: {(metrics as any).sizeDisplay || (metrics as any).sizeLabel}</div>
                    ) : null}
                    {(metrics as any).crossSectionAreaDisplay && (
                      <div>Cross Section: {(metrics as any).crossSectionAreaDisplay}</div>
                    )}
                    {(metrics as any).pitchAngleDeg !== undefined && (
                      <div>Pitch: {(metrics as any).pitchAngleDeg.toFixed(1)}°</div>
                    )}
                  </>
                )}

                {/* Railing-specific fields */}
                {isRailing && (
                  <>
                    {(metrics as any).lengthDisplay && (
                      <div>Length: {(metrics as any).lengthDisplay}</div>
                    )}
                  </>
                )}

                {/* Stair-specific fields */}
                {isStair && (
                  <>
                    {(metrics as any).stairRunDisplay && (
                      <div>Run: {(metrics as any).stairRunDisplay}</div>
                    )}
                    {(metrics as any).numberOfRisers !== undefined && (
                      <div>Number of Risers: {(metrics as any).numberOfRisers}</div>
                    )}
                    {(metrics as any).numberOfTreads !== undefined && (
                      <div>Number of Treads: {(metrics as any).numberOfTreads}</div>
                    )}
                    {(metrics as any).treadDepthCalculatedInches && (
                      <div>Tread Depth: {(metrics as any).treadDepthCalculatedInches}</div>
                    )}
                    {(metrics as any).riserHeightCalculatedInches && (
                      <div>
                        Riser Height: {(metrics as any).riserHeightCalculatedInches}
                        {(metrics as any).riserHeightWarning && (
                          <span className="ml-2 text-orange-600 text-[10px]">({(metrics as any).riserHeightWarning})</span>
                        )}
                      </div>
                    )}
                    {(metrics as any).treadDepthDisplay && (
                      <div>Tread Depth: {(metrics as any).treadDepthDisplay}</div>
                    )}
                    {(metrics as any).stairWidthDisplay && (
                      <div>Width: {(metrics as any).stairWidthDisplay}</div>
                    )}
                    {(metrics as any).stairRiseDisplay && (
                      <div>Rise: {(metrics as any).stairRiseDisplay}</div>
                    )}
                  </>
                )}

                {/* Mass-specific fields */}
                {isMass && (
                  <>
                    {(metrics as any).volumeDisplay && (
                      <div>Volume: {(metrics as any).volumeDisplay}</div>
                    )}
                    {(metrics as any).grossAreaDisplay && (
                      <div>Gross Area: {(metrics as any).grossAreaDisplay}</div>
                    )}
                    {(metrics as any).footprintAreaDisplay && (
                      <div>Footprint Area: {(metrics as any).footprintAreaDisplay}</div>
                    )}
                  </>
                )}

                {/* Casework-specific fields */}
                {isCasework && (
                  <>
                    {(metrics as any).widthDisplay && (
                      <div>Width: {(metrics as any).widthDisplay}</div>
                    )}
                    {(metrics as any).depthDisplay && (
                      <div>Depth: {(metrics as any).depthDisplay}</div>
                    )}
                    {(metrics as any).heightDisplay && (
                      <div>Height: {(metrics as any).heightDisplay}</div>
                    )}
                    {(metrics as any).caseworkType && (
                      <div>Type: {(metrics as any).caseworkType}</div>
                    )}
                  </>
                )}

                {/* Legacy/fallback fields for unknown types */}
                {!isRoof && !isSlab && !isWall && !isDoor && !isWindow && !isFooting && !isColumn && !isBeam && !isRailing && !isStair && !isMass && !isCasework && (
                  <>
                    {(metrics as any).thickness && (
                      <div>Thickness: {(metrics as any).thickness}</div>
                    )}
                    {(metrics as any).area && (
                      <div>Area: {(metrics as any).area}</div>
                    )}
                    {(metrics as any).areaDisplay && (
                      <div>Area: {(metrics as any).areaDisplay}</div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* Identity fields */}
          {((metrics as any).levelName || (metrics as any).phase || (metrics as any).typeMark || (metrics as any).instanceMark) && (
            <>
              <div className="text-[10px] text-muted-foreground mb-1 mt-2">Properties</div>
              <div className="text-[11px] font-medium space-y-1">
                {(metrics as any).levelName && (
                  <div>Level: {(metrics as any).levelName}</div>
                )}
                {(metrics as any).phase && (
                  <div>Phase: {(metrics as any).phase}</div>
                )}
                {(metrics as any).typeMark && (
                  <div>Type Mark: {(metrics as any).typeMark}</div>
                )}
                {(metrics as any).instanceMark && (
                  <div>Mark: {(metrics as any).instanceMark}</div>
                )}
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    );
  } catch (err) {
    // Silently fail to prevent crashing the viewer
    console.error('Error rendering PropertiesPanel:', err);
    return null;
  }
};
