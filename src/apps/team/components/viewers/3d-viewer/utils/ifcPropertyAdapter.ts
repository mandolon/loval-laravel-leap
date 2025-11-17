/**
 * IFC Property Adapter
 * Standardizes property extraction from different IFC models
 * Handles variations in property names, units, and structures across different IFC exporters
 */

import { 
  lengthToFeetInches, 
  lengthToFeet,
  areaToSquareFeet, 
  formatSquareFeet,
  volumeToCubicFeet,
  cubicFeetToCubicYards,
  formatCubicFeet,
  formatCubicYards,
  formatLengthFeet,
  formatSizeDisplay,
  formatInchesFraction
} from './unitConversion';
import { logger } from '@/utils/logger';

/**
 * Revit IFC Category Mapping
 * Based on exportlayers-ifc-IAI.txt mapping file
 * Maps IFC Class + PredefinedType to logical categories
 */
const REHOME_IFC_CLASS_MAPPING: {
  [ifcClass: string]: {
    [predefinedType: string]: { logicalCategory: string };
    DEFAULT?: { logicalCategory: string };
  };
} = {
  IfcRoof: {
    DEFAULT: { logicalCategory: 'roof' }
  },
  IfcSlab: {
    FLOOR: { logicalCategory: 'floor' },
    BASESLAB: { logicalCategory: 'footing' },
    DEFAULT: { logicalCategory: 'slab' } // Generic slab, bridge decks, etc.
  },
  IfcWall: {
    DEFAULT: { logicalCategory: 'wall' }
  },
  IfcWallStandardCase: {
    DEFAULT: { logicalCategory: 'wall' }
  },
  IfcDoor: {
    DEFAULT: { logicalCategory: 'door' }
  },
  IfcWindow: {
    DEFAULT: { logicalCategory: 'window' }
  },
  IfcColumn: {
    DEFAULT: { logicalCategory: 'column' }
  },
  IfcBeam: {
    DEFAULT: { logicalCategory: 'beam' }
  },
  IfcFooting: {
    DEFAULT: { logicalCategory: 'footing' }
  },
  IfcRailing: {
    DEFAULT: { logicalCategory: 'railing' }
  },
  IfcStair: {
    DEFAULT: { logicalCategory: 'stair' }
  },
  IfcStairFlight: {
    DEFAULT: { logicalCategory: 'stair' }
  },
  IfcFurniture: {
    DEFAULT: { logicalCategory: 'casework' }
  },
  IfcBuildingElementProxy: {
    DEFAULT: { logicalCategory: 'other' } // Will be refined by categoryName/familyName
  },
  IfcProxy: {
    DEFAULT: { logicalCategory: 'other' } // Will be refined by categoryName/familyName
  }
};

/**
 * Get logical category from IFC class mapping
 */
function getCategoryFromMapping(
  ifcClass: string,
  ifcPredefinedType?: string
): string | undefined {
  const normalizedClass = ifcClass.replace(/^Ifc/, '');
  const fullClass = `Ifc${normalizedClass}`;
  
  const classMapping = REHOME_IFC_CLASS_MAPPING[fullClass] || REHOME_IFC_CLASS_MAPPING[ifcClass];
  if (!classMapping) {
    return undefined;
  }
  
  // Try predefined type first
  if (ifcPredefinedType) {
    const predefinedTypeUpper = ifcPredefinedType.toUpperCase();
    if (classMapping[predefinedTypeUpper]) {
      return classMapping[predefinedTypeUpper].logicalCategory;
    }
  }
  
  // Fall back to DEFAULT
  if (classMapping.DEFAULT) {
    return classMapping.DEFAULT.logicalCategory;
  }
  
  return undefined;
}

export interface StandardizedRoofProperties {
  // Standard dimensions
  slope?: string; // e.g., "4\" / 12\"" (from PitchAngle or computed)
  thickness?: string; // e.g., "1' 0\""
  area?: string; // e.g., "1237.41 SF" (DEPRECATED: use surfaceAreaDisplay instead)
  
  // Area properties (roof surface vs footprint)
  surfaceArea?: number; // Raw numeric value in square feet (sloped surface area)
  surfaceAreaDisplay?: string; // Formatted display string (e.g., "1237.41 SF")
  footprintArea?: number; // Raw numeric value in square feet (projected/plan area)
  footprintAreaDisplay?: string; // Formatted display string (e.g., "1200.00 SF")
  
  // Custom Rehome_RoofAdapter properties
  baseLevelLabel?: string; // e.g., "LOFT" (from BaseLevel)
  baseOffsetDisplay?: string; // e.g., "4' 1\"" (from BaseOffset, converted to feet/inches)
  maxRidgeHeightDisplay?: string; // e.g., "19' 10\"" (from MaxRidgeHeight, converted to feet/inches)
  slopeText?: string; // e.g., "4\" / 12\"" (from SlopeText - Revit's slope string)
  
  // Internal: pitch angle in degrees (for calculations)
  _pitchAngleDeg?: number;
  
  // Debug info (only in dev mode)
  _debug?: {
    propertySetsFound?: string[];
    quantitySetsFound?: string[];
    sources?: {
      slope?: string;
      thickness?: string;
      area?: string;
      surfaceArea?: string;
      footprintArea?: string;
      baseLevel?: string;
      baseOffset?: string;
      maxRidgeHeight?: string;
      slopeText?: string;
    };
    rehomeAdapterFound?: boolean;
    rehomeAdapterFields?: string[];
  };
}

/**
 * Base interface for all standardized element metrics
 * Contains common identity and classification fields
 */
export interface StandardizedElementBase {
  ifcClass: string;        // e.g. "IfcWall", "IfcSlab", "IfcRoof", "IfcDoor", etc.
  expressID: number;
  globalId?: string;
  name?: string;           // IFC Name / Revit family+type as appropriate
  typeName?: string;       // Revit Type Name / mapped Pset identity
  typeMark?: string;       // Revit Type Mark if available
  instanceMark?: string;   // Revit Mark / tag
  levelName?: string;      // building storey / Level
  phase?: string;          // Phase Created or similar if we have it
  isExternal?: boolean;    // from Pset_*Common.IsExternal where available
  elementCategory?: string; // normalized category label (e.g., "roof", "wall", "slab", "deck", "door", "window", "column", "beam", "footing", "railing", "stair", "mass", "casework", "other")
  ifcPredefinedType?: string; // raw IFC PredefinedType if available
  familyName?: string;     // Revit Family Name if available
  categoryName?: string;   // Revit Category Name if available
}

/**
 * Standardized roof metrics (extends base)
 * Uses existing StandardizedRoofProperties structure
 */
export interface StandardizedRoofMetrics extends StandardizedElementBase, Omit<StandardizedRoofProperties, '_debug'> {
  _debug?: StandardizedRoofProperties['_debug'];
}

/**
 * Standardized slab/floor metrics
 * IFC Quantity Sets: Qto_SlabBaseQuantities (GrossArea, NetArea, Perimeter, Width, GrossVolume, NetVolume)
 * IFC Property Sets: Pset_SlabCommon (IsExternal, PredefinedType)
 */
export interface StandardizedSlabMetrics extends StandardizedElementBase {
  areaSqFt?: number;
  areaDisplay?: string;           // e.g., "123.4 SF"
  perimeterFt?: number;
  perimeterDisplay?: string;      // e.g., "45' 6\""
  thicknessFt?: number;
  thicknessDisplay?: string;      // e.g., "6\""
  volumeCuFt?: number;
  volumeCuYd?: number;
  volumeDisplay?: string;         // e.g., "15.4 cu yd"
  sizeDisplay?: string;           // e.g., "10'-0" x 12'-0" (120" x 144")" - only for rectangles/squares
  slabKind?: "interior" | "exterior" | "deck" | "porch" | "other" | undefined;
}

/**
 * Standardized wall metrics
 * IFC Quantity Sets: Qto_WallBaseQuantities (Length, Height, Width, GrossArea, NetArea, GrossVolume, NetVolume)
 * IFC Property Sets: Pset_WallCommon (IsExternal)
 */
export interface StandardizedWallMetrics extends StandardizedElementBase {
  lengthFt?: number;
  lengthDisplay?: string;         // e.g., "12' 6\""
  heightFt?: number;
  heightDisplay?: string;         // e.g., "9' 0\""
  thicknessFt?: number;
  thicknessDisplay?: string;      // e.g., "6\""
  areaOneSideSqFt?: number;       // wall area of a single side
  areaOneSideDisplay?: string;    // e.g., "112.5 SF"
  areaBothSidesSqFt?: number;     // 2 * one side, for "wall area both sides"
  areaBothSidesDisplay?: string;  // e.g., "225.0 SF"
  volumeCuFt?: number;
  volumeCuYd?: number;
  volumeDisplay?: string;         // e.g., "8.3 cu yd"
}

/**
 * Standardized footing/foundation metrics
 * IFC Quantity Sets: Qto_FootingBaseQuantities (Length, Width, Height, GrossVolume, NetVolume)
 * IFC Property Sets: Pset_FootingCommon (PredefinedType)
 */
export interface StandardizedFootingMetrics extends StandardizedElementBase {
  lengthFt?: number;
  lengthDisplay?: string;
  widthFt?: number;
  widthDisplay?: string;
  thicknessFt?: number;           // Height/depth of footing
  thicknessDisplay?: string;
  volumeCuFt?: number;
  volumeCuYd?: number;
  volumeDisplay?: string;
  footingType?: "continuous" | "pad" | "pier" | "other" | undefined;
}

/**
 * Standardized column/post metrics
 * IFC Quantity Sets: Qto_ColumnBaseQuantities (Height, CrossSectionArea)
 * IFC Property Sets: Pset_ColumnCommon, custom identity Psets for size
 */
export interface StandardizedColumnMetrics extends StandardizedElementBase {
  lengthFt?: number;               // post height
  lengthDisplay?: string;          // e.g., "8' 0\""
  widthFt?: number;
  widthDisplay?: string;           // e.g., "3-1/2\""
  depthFt?: number;
  depthDisplay?: string;           // e.g., "3-1/2\""
  sizeLabel?: string;              // e.g., "4x4", "6x6" from type name / size param
  sizeDisplay?: string;            // e.g., "(3-1/2\" x 3-1/2\")"
  crossSectionAreaSqIn?: number;   // optional
  crossSectionAreaDisplay?: string; // e.g., "16 sq in"
}

/**
 * Standardized beam/girder/joist metrics
 * IFC Quantity Sets: Qto_BeamBaseQuantities (Length, CrossSectionArea)
 * IFC Property Sets: Pset_BeamCommon (PitchAngle)
 */
export interface StandardizedBeamMetrics extends StandardizedElementBase {
  lengthFt?: number;
  lengthDisplay?: string;          // e.g., "12' 6\""
  sizeLabel?: string;              // e.g., "4x6", "6x12", "LVL 1-3/4x11-7/8"
  sizeDisplay?: string;            // e.g., "(3-1/2\" x 3-1/2\")"
  crossSectionAreaSqIn?: number;
  crossSectionAreaDisplay?: string;
  pitchAngleDeg?: number;          // from Pset_BeamCommon.PitchAngle if present
}

/**
 * Standardized door metrics
 * IFC Quantity Sets: Qto_DoorBaseQuantities (Width, Height, Area)
 * IFC Property Sets: Pset_DoorCommon (IsExternal)
 */
export interface StandardizedDoorMetrics extends StandardizedElementBase {
  widthFt?: number;
  widthDisplay?: string;           // e.g., "3' 0\""
  heightFt?: number;
  heightDisplay?: string;         // e.g., "7' 0\""
  sizeDisplay?: string;            // e.g., "3'-0\" x 7'-0\" (36\" x 84\")"
  leafAreaSqFt?: number;
  leafAreaDisplay?: string;       // e.g., "21.0 SF"
  sillHeightFt?: number;          // if we have it
  sillHeightDisplay?: string;
  headHeightFt?: number;          // if we have it
  headHeightDisplay?: string;
  isExterior?: boolean;
}

/**
 * Standardized window metrics
 * IFC Quantity Sets: Qto_WindowBaseQuantities (Width, Height, Area)
 * IFC Property Sets: Pset_WindowCommon (IsExternal)
 */
export interface StandardizedWindowMetrics extends StandardizedElementBase {
  widthFt?: number;
  widthDisplay?: string;           // e.g., "3' 0\""
  heightFt?: number;
  heightDisplay?: string;         // e.g., "4' 0\""
  sizeDisplay?: string;            // e.g., "3'-0\" x 4'-0\" (36\" x 48\")"
  areaSqFt?: number;
  areaDisplay?: string;           // e.g., "12.0 SF"
  sillHeightFt?: number;
  sillHeightDisplay?: string;
  headHeightFt?: number;
  headHeightDisplay?: string;
  isExterior?: boolean;
}

/**
 * Standardized railing metrics
 * IFC Quantity Sets: Qto_RailingBaseQuantities (Length) - may not be available in all exporters
 * Falls back to geometry-based length calculation
 */
export interface StandardizedRailingMetrics extends StandardizedElementBase {
  lengthFt?: number;
  lengthDisplay?: string;          // e.g., "45' 6\""
}

/**
 * Standardized mass/massing element metrics
 * IFC Quantity Sets: Qto_BuildingElementProxyBaseQuantities (GrossVolume, NetVolume, GrossArea, NetArea)
 * IFC Property Sets: Pset_BuildingElementProxyCommon
 * Falls back to geometry-based calculations if quantities are missing
 */
export interface StandardizedMassMetrics extends StandardizedElementBase {
  volumeCuFt?: number;
  volumeCuYd?: number;
  volumeDisplay?: string;          // e.g., "15.4 cu yd"
  grossAreaSqFt?: number;          // external surface area if available
  grossAreaDisplay?: string;      // e.g., "123.4 SF"
  footprintAreaSqFt?: number;     // projected footprint area if we can compute it
  footprintAreaDisplay?: string;  // e.g., "100.0 SF"
}

/**
 * Standardized stair metrics
 * IFC Quantity Sets: Qto_StairBaseQuantities (Length, Width, Height, GrossArea, NetArea, GrossVolume, NetVolume)
 * IFC Property Sets: Pset_StairCommon
 * Additional: NumberOfRiser, NumberOfTreads from properties or geometry
 */
export interface StandardizedStairMetrics extends StandardizedElementBase {
  numberOfRisers?: number;         // number of risers
  numberOfTreads?: number;         // number of treads
  riserHeightFt?: number;          // individual riser height
  riserHeightDisplay?: string;    // e.g., "7 1/2\""
  treadDepthFt?: number;           // individual tread depth
  treadDepthDisplay?: string;      // e.g., "10\""
  treadDepthCalculatedInches?: string; // calculated from run / numberOfTreads, in inches (e.g., "11\"")
  riserHeightCalculatedInches?: string; // calculated riser height in inches (e.g., "7\"")
  riserHeightWarning?: string; // warning message if riser height seems incorrect (e.g., "Verify in model")
  stairWidthFt?: number;           // overall width of stair
  stairWidthDisplay?: string;     // e.g., "3' 0\""
  stairRunFt?: number;             // total horizontal run
  stairRunDisplay?: string;        // e.g., "12' 6\""
  stairRiseFt?: number;            // total vertical rise
  stairRiseDisplay?: string;      // e.g., "9' 0\""
  areaSqFt?: number;               // stair area (tread area)
  areaDisplay?: string;           // e.g., "37.5 SF"
}

/**
 * Standardized casework/cabinet metrics
 * IFC Quantity Sets: Qto_FurnitureBaseQuantities (Width, Depth, Height, GrossArea, NetArea, GrossVolume, NetVolume)
 * IFC Property Sets: Pset_FurnitureCommon
 * Additional: cabinet-specific dimensions from properties or geometry
 */
export interface StandardizedCaseworkMetrics extends StandardizedElementBase {
  widthFt?: number;                // cabinet width
  widthDisplay?: string;          // e.g., "3' 0\""
  depthFt?: number;                // cabinet depth
  depthDisplay?: string;          // e.g., "2' 0\""
  heightFt?: number;               // cabinet height
  heightDisplay?: string;         // e.g., "3' 6\""
  areaSqFt?: number;               // surface area if available
  areaDisplay?: string;           // e.g., "10.5 SF"
  volumeCuFt?: number;            // cabinet volume
  volumeCuYd?: number;
  volumeDisplay?: string;         // e.g., "0.4 cu yd"
  caseworkType?: string;          // e.g., "base", "wall", "tall", "vanity"
}

/**
 * Union type for all standardized metrics
 */
export type StandardizedElementMetrics = 
  | StandardizedRoofMetrics
  | StandardizedSlabMetrics
  | StandardizedWallMetrics
  | StandardizedFootingMetrics
  | StandardizedColumnMetrics
  | StandardizedBeamMetrics
  | StandardizedDoorMetrics
  | StandardizedWindowMetrics
  | StandardizedRailingMetrics
  | StandardizedMassMetrics
  | StandardizedStairMetrics
  | StandardizedCaseworkMetrics;

/**
 * Legacy interface for backwards compatibility
 */
export interface StandardizedObjectProperties {
  name: string;
  type: string;
  roofProperties?: StandardizedRoofProperties;
  // Can be extended for other object types (walls, doors, windows, etc.)
}

/**
 * Extract value from IFC property object
 * Handles different IFC property structures (IFC2x3, IFC4, etc.)
 */
export function extractPropertyValue(prop: any): any {
  if (prop.NominalValue?.value !== undefined) return prop.NominalValue.value;
  if (prop.NominalValue !== undefined) return prop.NominalValue;
  if (prop.value !== undefined) return prop.value;
  if (prop.AreaValue !== undefined) {
    return prop.AreaValue?.value ?? prop.AreaValue;
  }
  if (prop.LengthValue !== undefined) {
    return prop.LengthValue?.value ?? prop.LengthValue;
  }
  if (prop.VolumeValue !== undefined) {
    return prop.VolumeValue?.value ?? prop.VolumeValue;
  }
  return null;
}

/**
 * Extract property name from IFC property object
 * Handles different property name structures
 */
export function extractPropertyName(prop: any): string {
  if (prop.Name?.value !== undefined) return prop.Name.value;
  if (typeof prop.Name === 'string') return prop.Name;
  if (prop.Name?.wrappedValue !== undefined) return prop.Name.wrappedValue;
  if (prop.name !== undefined) {
    return typeof prop.name === 'string' ? prop.name : String(prop.name);
  }
  
  // Try to find name in object keys
  for (const key of Object.keys(prop)) {
    if (key.toLowerCase().includes('name') && prop[key]) {
      const nameValue = prop[key];
      if (typeof nameValue === 'string') return nameValue;
      if (nameValue?.value) return nameValue.value;
    }
  }
  
  return '';
}

/**
 * Look up property by expressID if it's a Handle/reference
 */
export async function resolvePropertyReference(
  ifcManager: any,
  modelID: number,
  prop: any
): Promise<any> {
  // If prop is just a number (expressID), look it up
  if (typeof prop === 'number') {
    try {
      return await ifcManager.getItemProperties(modelID, prop, false);
    } catch (err) {
      logger.warn('Could not lookup property by expressID:', prop, err);
      return null;
    }
  }
  
  // If prop is a Handle object with value as expressID
  if (prop && typeof prop === 'object' && prop.value && typeof prop.value === 'number') {
    try {
      const lookedUp = await ifcManager.getItemProperties(modelID, prop.value, false);
      if (lookedUp) {
        return lookedUp;
      }
    } catch (err) {
      logger.warn('Could not lookup property from Handle:', prop.value, err);
    }
  }
  
  return prop;
}

/**
 * Extract slope/pitch from property value
 * Handles different formats: ratio (0.333), degrees (18.43°), or string ("4/12")
 */
export function extractSlope(propValue: any, propName: string = ''): string | null {
  if (propValue === null || propValue === undefined) return null;
  
  if (typeof propValue === 'string') {
    // Already in string format (e.g., "4/12")
    return propValue;
  }
  
  if (typeof propValue === 'number') {
    // Check if it's a ratio (0-1) or degrees
    if (propValue < 1 && propValue > 0) {
      // Ratio format (e.g., 0.333 = 4/12)
      const inchesPerFoot = propValue * 12;
      return `${Math.round(inchesPerFoot)}" / 12"`;
    } else if (propValue > 0 && propValue < 90) {
      // Degrees format - convert to common ratios
      const commonSlopes: { [key: number]: string } = {
        18.43: '4" / 12"',
        26.57: '6" / 12"',
        33.69: '8" / 12"',
        36.87: '9" / 12"',
        39.81: '10" / 12"',
        45: '12" / 12"'
      };
      
      // Check if it matches a common slope (within 0.5°)
      for (const [deg, ratio] of Object.entries(commonSlopes)) {
        if (Math.abs(propValue - parseFloat(deg)) < 0.5) {
          return ratio;
        }
      }
      
      // Not a common slope, show degrees
      return `${propValue.toFixed(1)}°`;
    }
  }
  
  return String(propValue);
}

/**
 * Interface for BaseQuantities extracted from property sets
 * Used when Revit exports BaseQuantities as a Pset instead of a Qset
 */
interface BaseQuantitiesResult {
  grossArea?: number;      // IFC area units (m²)
  netArea?: number;
  projectedArea?: number;
  perimeter?: number;      // IFC length units (m)
  length?: number;         // generic length (for walls/beams/railings)
  width?: number;          // can be used as thickness or width
  height?: number;         // for walls, columns, doors, windows
  depth?: number;
  thickness?: number;      // explicit if present
  volume?: number;         // IFC volume units (m³)
  grossVolume?: number;
  netVolume?: number;
  sourceName?: string;     // usually "BaseQuantities"
}

/**
 * Extract BaseQuantities from property sets
 * Revit sometimes exports BaseQuantities as a Pset instead of a Qset
 * This helper finds the "BaseQuantities" Pset and extracts numeric properties
 */
interface FloorAdapterResult {
  area?: number;
  perimeter?: number;
  thickness?: number;
}

export async function extractBaseQuantitiesFromPsets(
  ifcManager: any,
  modelID: number,
  psets: any
): Promise<BaseQuantitiesResult | null> {
  if (!psets) {
    return null;
  }
  
  // Find property set named "BaseQuantities" (case-insensitive)
  // Also check for variations like "Base Quantities", "Qto_*BaseQuantities", etc.
  let baseQuantitiesPset: any = null;
  let psetName: string = '';
  
  // First, collect all Pset names for debugging
  const allPsetNames: string[] = [];
  
  for (const pset of Object.values(psets) as any[]) {
    if (!pset) continue;
    
    const rawName = pset.Name?.value || pset.Name || '';
    const name = typeof rawName === 'string' ? rawName.trim() : rawName;
    if (name) {
      allPsetNames.push(name);
    }
    
    const nameLower = (name || '').toLowerCase();
    
    // Check if this is the BaseQuantities Pset (more flexible matching)
    if (nameLower === 'basequantities' || 
        nameLower === 'pset_basequantities' ||
        nameLower === 'base quantities' ||
        nameLower.includes('basequantities') ||
        (nameLower.includes('base') && nameLower.includes('quantities'))) {
      baseQuantitiesPset = pset;
      psetName = name;
      break;
    }
  }
  
  // Debug logging
  if (process.env.NODE_ENV === 'development' && allPsetNames.length > 0) {
    logger.log('[IFC] Searching for BaseQuantities Pset. Available Psets:', allPsetNames);
  }
  
  if (!baseQuantitiesPset) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('[IFC] BaseQuantities Pset not found. Available Psets:', allPsetNames);
    }
    return null;
  }
  
  const quantityItems = baseQuantitiesPset.HasProperties || baseQuantitiesPset.Quantities;
  if (!quantityItems || quantityItems.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('[IFC] BaseQuantities Pset has no properties/quantities:', baseQuantitiesPset);
    }
    return null;
  }
  
  if (process.env.NODE_ENV === 'development') {
    logger.log('[IFC] Found BaseQuantities Pset:', psetName);
  }
  
  const result: BaseQuantitiesResult = {
    sourceName: psetName
  };
  
  // Extract numeric properties from the BaseQuantities Pset or quantity set
  for (let prop of quantityItems || []) {
    // Resolve property reference if needed
    prop = await resolvePropertyReference(ifcManager, modelID, prop);
    if (!prop) continue;
    
    const propName = extractPropertyName(prop);
    const propNameLower = propName.toLowerCase();
    let propValue = extractPropertyValue(prop);
    
    if (typeof propValue !== 'number' || isNaN(propValue)) {
      if (typeof prop.LengthValue === 'number') {
        propValue = prop.LengthValue;
      } else if (typeof prop.AreaValue === 'number') {
        propValue = prop.AreaValue;
      } else if (typeof prop.VolumeValue === 'number') {
        propValue = prop.VolumeValue;
      } else if (typeof prop.LengthValue?.value === 'number') {
        propValue = prop.LengthValue.value;
      } else if (typeof prop.AreaValue?.value === 'number') {
        propValue = prop.AreaValue.value;
      } else if (typeof prop.VolumeValue?.value === 'number') {
        propValue = prop.VolumeValue.value;
      }
    }
    
    // Only extract numeric values
    if (typeof propValue !== 'number' || propValue <= 0) {
      continue;
    }
    
    // Map property names to result fields
    if (propNameLower === 'grossarea' || propNameLower === 'gross area') {
      result.grossArea = propValue;
    } else if (propNameLower === 'netarea' || propNameLower === 'net area') {
      result.netArea = propValue;
    } else if (propNameLower === 'projectedarea' || propNameLower === 'projected area') {
      result.projectedArea = propValue;
    } else if (propNameLower === 'perimeter') {
      result.perimeter = propValue;
    } else if (propNameLower === 'thickness' || propNameLower === 'overallthickness' || propNameLower === 'overall thickness') {
      result.thickness = propValue;
    } else if (propNameLower === 'width') {
      result.width = propValue;
    } else if (propNameLower === 'depth') {
      result.depth = propValue;
    } else if (propNameLower === 'length') {
      result.length = propValue;
    } else if (propNameLower === 'height') {
      result.height = propValue;
    } else if (propNameLower === 'grossvolume' || propNameLower === 'gross volume') {
      result.grossVolume = propValue;
    } else if (propNameLower === 'netvolume' || propNameLower === 'net volume') {
      result.netVolume = propValue;
    } else if (propNameLower === 'volume') {
      result.volume = propValue;
    }
  }
  
  // If we found at least one property, return the result
  if (result.grossArea || result.netArea || result.projectedArea || result.perimeter || 
      result.thickness || result.width || result.height || result.length || result.depth ||
      result.volume || result.grossVolume || result.netVolume) {
    return result;
  }
  
  return null;
}

/**
 * Extracts values from Rehome floor adapter property set
 */
function extractRehomeFloorAdapter(psets: any): FloorAdapterResult | null {
  if (!psets) return null;

  for (const pset of Object.values(psets) as any[]) {
    if (!pset || !pset.HasProperties) continue;

    const name = pset.Name?.value || pset.Name || '';
    if (name !== 'Pset_Rehome_FloorAdapter' && name !== 'Rehome_FloorAdapter') {
      continue;
    }

    const result: FloorAdapterResult = {};
    for (let prop of pset.HasProperties) {
      if (!prop) continue;
      const propName = extractPropertyName(prop);
      const propValue = extractPropertyValue(prop);
      if (propValue == null || isNaN(propValue)) continue;

      switch (propName) {
        case 'FloorArea':
          result.area = propValue;
          break;
        case 'FloorPerimeter':
          result.perimeter = propValue;
          break;
        case 'FloorThickness':
          result.thickness = propValue;
          break;
        default:
          break;
      }
    }
    return result;
  }

  return null;
}

function parseInchToken(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/["']/g, '').trim();
  if (!cleaned) return null;
  const parts = cleaned.replace(/-/g, ' ').split(/\s+/);
  let total = 0;
  for (const part of parts) {
    if (!part) continue;
    if (part.includes('/')) {
      const [numStr, denStr] = part.split('/');
      const num = parseFloat(numStr);
      const den = parseFloat(denStr);
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        total += num / den;
      }
    } else {
      const num = parseFloat(part);
      if (!isNaN(num)) {
        total += num;
      }
    }
  }
  return total || null;
}

function parseSizeTextToFeet(text: string): { widthFt: number; depthFt: number } | null {
  if (!text) return null;
  const match = text.match(/(\d[\d\s\/\.-]*)\s*(?:in|\"|”)?\s*[xX×]\s*(\d[\d\s\/\.-]*)/);
  if (!match) return null;
  const widthIn = parseInchToken(match[1]);
  const depthIn = parseInchToken(match[2]);
  if (widthIn && depthIn) {
    return { widthFt: widthIn / 12, depthFt: depthIn / 12 };
  }
  return null;
}
/**
 * Extract standardized roof properties from IFC property sets
 */
export async function extractRoofProperties(
  ifcManager: any,
  modelID: number,
  props: any,
  debugInfo?: { propertySetsFound: string[]; sources: any }
): Promise<StandardizedRoofProperties> {
  const roofProps: StandardizedRoofProperties = {};
  
  if (!props || !props.psets) {
    return roofProps;
  }
  
  // Track property set names for debug (use passed-in array or create new one)
  const propertySetsFound = debugInfo?.propertySetsFound || [];
  const sources = debugInfo?.sources || {};
  
  // Iterate through all property sets
  for (const pset of Object.values(props.psets) as any[]) {
    if (!pset || !pset.HasProperties) continue;
    
    const psetName = pset.Name?.value || pset.Name || '';
    const psetNameLower = psetName.toLowerCase();
    const properties = pset.HasProperties || [];
    
    if (!propertySetsFound.includes(psetName)) {
      propertySetsFound.push(psetName);
    }
    
    // Check if this is the custom Rehome_RoofAdapter Pset
    const isRehomeAdapter = psetName === 'Rehome_RoofAdapter' || 
                           psetName === 'Pset_Rehome_RoofAdapter' ||
                           psetNameLower === 'rehome_roofadapter' ||
                           psetNameLower === 'pset_rehome_roofadapter';
    
    // Check if this is a relevant property set for roofs
    const isRoofRelated = isRehomeAdapter ||
                         psetNameLower.includes('roof') || 
                         psetNameLower.includes('slab') ||
                         psetNameLower.includes('dimension');
    
    // Track if Rehome adapter was found
    if (isRehomeAdapter && !roofProps._debug) {
      roofProps._debug = { rehomeAdapterFound: true, rehomeAdapterFields: [] };
    }
    
    for (let prop of properties) {
      // Resolve property reference if needed
      prop = await resolvePropertyReference(ifcManager, modelID, prop);
      if (!prop) continue;
      
      const propName = extractPropertyName(prop);
      const propNameLower = propName.toLowerCase();
      const propValue = extractPropertyValue(prop);
      
      // Handle Rehome_RoofAdapter specific properties
      if (isRehomeAdapter) {
        if (propNameLower === 'baselevel' || propNameLower === 'base level') {
          roofProps.baseLevelLabel = typeof propValue === 'string' ? propValue : String(propValue);
          sources.baseLevel = `Rehome_RoofAdapter.${propName}`;
          if (roofProps._debug) {
            roofProps._debug.rehomeAdapterFields!.push('BaseLevel');
          }
          logger.log('✓ Extracted baseLevel:', roofProps.baseLevelLabel, 'from Rehome_RoofAdapter');
        }
        
        if (propNameLower === 'baseoffset' || propNameLower === 'base offset') {
          if (typeof propValue === 'number' && propValue > 0) {
            roofProps.baseOffsetDisplay = lengthToFeetInches(propValue);
            sources.baseOffset = `Rehome_RoofAdapter.${propName}`;
            if (roofProps._debug) {
              roofProps._debug.rehomeAdapterFields!.push('BaseOffset');
            }
            logger.log('✓ Extracted baseOffset:', roofProps.baseOffsetDisplay, 'from Rehome_RoofAdapter');
          }
        }
        
        if (propNameLower === 'maxridgeheight' || propNameLower === 'max ridge height') {
          if (typeof propValue === 'number' && propValue > 0) {
            roofProps.maxRidgeHeightDisplay = lengthToFeetInches(propValue);
            sources.maxRidgeHeight = `Rehome_RoofAdapter.${propName}`;
            if (roofProps._debug) {
              roofProps._debug.rehomeAdapterFields!.push('MaxRidgeHeight');
            }
            logger.log('✓ Extracted maxRidgeHeight:', roofProps.maxRidgeHeightDisplay, 'from Rehome_RoofAdapter');
          }
        }
        
        if (propNameLower === 'slopetext' || propNameLower === 'slope text') {
          // Use SlopeText as fallback if slope not already found
          if (!roofProps.slope) {
            roofProps.slope = typeof propValue === 'string' ? propValue : String(propValue);
            sources.slope = `Rehome_RoofAdapter.${propName}`;
            if (roofProps._debug) {
              roofProps._debug.rehomeAdapterFields!.push('SlopeText');
            }
            logger.log('✓ Extracted slope from SlopeText:', roofProps.slope, 'from Rehome_RoofAdapter');
          } else {
            // Store as slopeText even if we already have slope from PitchAngle
            roofProps.slopeText = typeof propValue === 'string' ? propValue : String(propValue);
            sources.slopeText = `Rehome_RoofAdapter.${propName}`;
            if (roofProps._debug) {
              roofProps._debug.rehomeAdapterFields!.push('SlopeText');
            }
            logger.log('✓ Extracted slopeText:', roofProps.slopeText, 'from Rehome_RoofAdapter');
          }
        }
        
        continue; // Skip standard extraction for Rehome adapter properties
      }
      
      // Standard property extraction (Pset_RoofCommon, Pset_SlabCommon, etc.)
      // Extract Slope (from PitchAngle) and store pitch angle in degrees for calculations
      if (!roofProps.slope && (
        propNameLower === 'slope' ||
        propNameLower === 'pitch' ||
        propNameLower === 'pitchangle' ||
        propNameLower === 'pitch angle' ||
        propNameLower.includes('slope') ||
        (isRoofRelated && propNameLower.includes('pitch'))
      )) {
        const slope = extractSlope(propValue, propName);
        if (slope) {
          roofProps.slope = slope;
          sources.slope = `${psetName}.${propName}`;
          logger.log('✓ Extracted slope:', slope, 'from property:', propName, 'in', psetName);
          
          // Store pitch angle in degrees for surface area calculation
          // Try to extract numeric angle value
          if (typeof propValue === 'number') {
            if (propValue > 0 && propValue < 90) {
              // Already in degrees
              roofProps._pitchAngleDeg = propValue;
            } else if (propValue < 1 && propValue > 0) {
              // Ratio format (e.g., 0.333 = 4/12), convert to degrees
              roofProps._pitchAngleDeg = Math.atan(propValue) * (180 / Math.PI);
            }
          }
        }
      }
      
      // Extract Thickness
      // Check property sets for thickness (Pset_SlabCommon, Pset_RoofCommon, etc.)
      if (!roofProps.thickness && (
        propNameLower === 'thickness' ||
        propNameLower === 'overallthickness' ||
        propNameLower === 'overall thickness' ||
        propNameLower.includes('thickness') ||
        // For slabs, Width in property sets can also represent thickness
        (isRoofRelated && (propNameLower === 'width' || propNameLower === 'depth'))
      )) {
        if (typeof propValue === 'number' && propValue > 0) {
          roofProps.thickness = lengthToFeetInches(propValue);
          sources.thickness = `${psetName}.${propName}`;
          logger.log('✓ Extracted thickness:', roofProps.thickness, 'from property:', propName, 'in', psetName);
        }
      }
      
      // Extract Area (from property sets - less common)
      if (!roofProps.area && (
        propNameLower.includes('area') && 
        !propNameLower.includes('volume')
      )) {
        if (typeof propValue === 'number' && propValue > 0) {
          const areaInSF = areaToSquareFeet(propValue);
          roofProps.area = formatSquareFeet(areaInSF);
          sources.area = `${psetName}.${propName}`;
          logger.log('✓ Extracted area:', roofProps.area, 'SF from property:', propName, 'in', psetName);
        }
      }
    }
  }
  
  // Add debug info if in dev mode
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
    roofProps._debug = {
      ...roofProps._debug,
      propertySetsFound,
      sources
    };
  }
  
  return roofProps;
}

/**
 * Extract roof properties from quantity sets
 * Focuses on extracting area values (surface vs footprint) and dimensions
 */
export async function extractRoofPropertiesFromQuantities(
  ifcManager: any,
  modelID: number,
  props: any,
  sources?: any,
  debugInfo?: { quantitySetsFound?: string[] }
): Promise<StandardizedRoofProperties> {
  const roofProps: StandardizedRoofProperties = {};
  
  // Track quantity set names for debug
  const quantitySetsFound = debugInfo?.quantitySetsFound || [];
  
  // Try multiple methods to get quantity sets
  let quantities: any = null;
  
  try {
    // Method 1: Check if qsets are in props
    if (props.qsets) {
      quantities = props.qsets;
    }
    // Method 2: Try getQuantitySets API
    else if (ifcManager.getQuantitySets) {
      // Need expressID - this would need to be passed in
      // For now, skip this method
    }
    // Method 3: Check if quantities are mixed in property sets
    else if (props.psets) {
      const allSets = props.psets || [];
      const qsets = allSets.filter((set: any) => {
        const setName = set.Name?.value || set.Name || '';
        return setName.toLowerCase().includes('qto') || 
               setName.toLowerCase().includes('quantity') ||
               set.Quantities !== undefined;
      });
      if (qsets.length > 0) {
        quantities = qsets;
      }
    }
  } catch (err) {
    logger.warn('Error getting quantity sets:', err);
  }
  
  if (!quantities) {
    return roofProps;
  }
  
  // Track extracted values for area calculation
  let grossArea: number | null = null;
  let netArea: number | null = null;
  let projectedArea: number | null = null;
  let length: number | null = null;
  let width: number | null = null;
  let depth: number | null = null;
  
  // Iterate through quantity sets
  for (const qset of Object.values(quantities) as any[]) {
    if (!qset || !qset.Quantities) continue;
    
    const qsetName = qset.Name?.value || qset.Name || '';
    const qsetNameLower = qsetName.toLowerCase();
    
    // Track quantity set names
    if (!quantitySetsFound.includes(qsetName)) {
      quantitySetsFound.push(qsetName);
    }
    
    // Check if this is a roof-related quantity set
    // For SLAB types used as roofs, we need to check for slab quantity sets too
    const isRoofQuantitySet = qsetNameLower.includes('roof') || 
                              qsetNameLower.includes('slab') ||
                              qsetNameLower.includes('qto_roof') ||
                              qsetNameLower.includes('qto_slab') ||
                              qsetNameLower === 'qto_slabbasequantities' ||
                              qsetNameLower === 'qto_roofbasequantities';
    
    // Log quantity set for debugging
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
      logger.log('Checking quantity set:', qsetName, 'isRoofQuantitySet:', isRoofQuantitySet);
    }
    
    for (const qty of qset.Quantities || []) {
      // Resolve quantity reference if needed
      let qtyObj = qty;
      if (typeof qty === 'number') {
        try {
          qtyObj = await ifcManager.getItemProperties(modelID, qty, false);
        } catch (err) {
          continue;
        }
      } else if (qty.value && typeof qty.value === 'number' && qty.value > 1000) {
        try {
          qtyObj = await ifcManager.getItemProperties(modelID, qty.value, false);
        } catch (err) {
          // Continue with original
        }
      }
      
      const qtyName = qtyObj.Name?.value || qtyObj.Name || '';
      const qtyNameLower = qtyName.toLowerCase();
      
      // Extract value
      let qtyValue: any = null;
      if (qtyObj.AreaValue !== undefined) {
        qtyValue = qtyObj.AreaValue?.value ?? qtyObj.AreaValue;
      } else if (qtyObj.LengthValue !== undefined) {
        qtyValue = qtyObj.LengthValue?.value ?? qtyObj.LengthValue;
      } else if (qtyObj.VolumeValue !== undefined) {
        qtyValue = qtyObj.VolumeValue?.value ?? qtyObj.VolumeValue;
      }
      
      if (typeof qtyValue !== 'number' || qtyValue <= 0) {
        continue;
      }
      
      // Log quantity name for debugging thickness extraction
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
        const isThicknessCandidate = qtyNameLower === 'thickness' ||
                                     qtyNameLower === 'overallthickness' ||
                                     qtyNameLower === 'overall thickness' ||
                                     qtyNameLower.includes('thickness') ||
                                     (isRoofQuantitySet && (qtyNameLower === 'width' || qtyNameLower === 'depth'));
        if (isThicknessCandidate) {
          logger.log('Found thickness candidate:', qtyName, 'in', qsetName, 'value:', qtyValue, 'alreadyHaveThickness:', !!roofProps.thickness);
        }
      }
      
      // Extract Thickness
      // For roofs/slabs, thickness can be in Width, Thickness, Depth, or OverallThickness quantities
      // Check all quantity sets, not just roof-related ones, as thickness might be in base quantities
      if (!roofProps.thickness && (
        qtyNameLower === 'thickness' ||
        qtyNameLower === 'overallthickness' ||
        qtyNameLower === 'overall thickness' ||
        qtyNameLower.includes('thickness') ||
        // For slabs, Width often represents thickness (in Qto_SlabBaseQuantities)
        (isRoofQuantitySet && (qtyNameLower === 'width' || qtyNameLower === 'depth'))
      )) {
        roofProps.thickness = lengthToFeetInches(qtyValue);
        if (sources) {
          sources.thickness = `${qsetName}.${qtyName}`;
        }
        logger.log('✓ Extracted thickness:', roofProps.thickness, 'from quantity:', qtyName, 'in', qsetName);
      }
      
      // Extract area quantities (prioritize roof-related quantity sets)
      if (isRoofQuantitySet || qsetNameLower.includes('base')) {
        // GrossArea - sloped surface area (preferred)
        if (qtyNameLower === 'grossarea' || qtyNameLower === 'gross area') {
          grossArea = qtyValue;
          if (sources) {
            sources.surfaceArea = `${qsetName}.${qtyName}`;
          }
          logger.log('✓ Found GrossArea:', qtyValue, 'from', qsetName);
        }
        
        // NetArea - also sloped surface area (fallback)
        if (qtyNameLower === 'netarea' || qtyNameLower === 'net area') {
          netArea = qtyValue;
          if (sources && !sources.surfaceArea) {
            sources.surfaceArea = `${qsetName}.${qtyName}`;
          }
          logger.log('✓ Found NetArea:', qtyValue, 'from', qsetName);
        }
        
        // ProjectedArea - footprint/plan area
        if (qtyNameLower === 'projectedarea' || qtyNameLower === 'projected area') {
          projectedArea = qtyValue;
          if (sources) {
            sources.footprintArea = `${qsetName}.${qtyName}`;
          }
          logger.log('✓ Found ProjectedArea:', qtyValue, 'from', qsetName);
        }
      }
      
      // Extract dimensions for footprint calculation fallback
      // Only use width/depth for footprint if they haven't been used for thickness
      // (thickness takes precedence over footprint dimensions)
      if (qtyNameLower === 'length') {
        length = qtyValue;
        logger.log('✓ Found Length:', qtyValue, 'from', qsetName);
      }
      // Only use width for footprint if it's not a roof-related quantity set (where width = thickness)
      // or if thickness has already been found from another source
      if (qtyNameLower === 'width' && (!isRoofQuantitySet || roofProps.thickness)) {
        width = qtyValue;
        logger.log('✓ Found Width:', qtyValue, 'from', qsetName);
      }
      // Only use depth for footprint if it's not a roof-related quantity set (where depth = thickness)
      // or if thickness has already been found from another source
      if (qtyNameLower === 'depth' && (!isRoofQuantitySet || roofProps.thickness)) {
        depth = qtyValue;
        logger.log('✓ Found Depth:', qtyValue, 'from', qsetName);
      }
      
      // Legacy: Extract generic "Area" (for backwards compatibility)
      if (!roofProps.area && (
        qtyNameLower === 'area' && 
        !qtyNameLower.includes('gross') && 
        !qtyNameLower.includes('net') && 
        !qtyNameLower.includes('projected') &&
        !qtyNameLower.includes('volume')
      )) {
        const areaInSF = areaToSquareFeet(qtyValue);
        roofProps.area = formatSquareFeet(areaInSF);
        if (sources) {
          sources.area = `${qsetName}.${qtyName}`;
        }
        logger.log('✓ Extracted generic area:', roofProps.area, 'SF from quantity:', qtyName, 'in', qsetName);
      }
    }
  }
  
  // Calculate surface area (sloped) - prefer GrossArea, fallback to NetArea
  if (grossArea !== null || netArea !== null) {
    const surfaceAreaRaw = grossArea ?? netArea!;
    const surfaceAreaInSF = areaToSquareFeet(surfaceAreaRaw);
    roofProps.surfaceArea = surfaceAreaInSF;
    roofProps.surfaceAreaDisplay = `${formatSquareFeet(surfaceAreaInSF)} SF`;
    if (sources && !sources.surfaceArea) {
      sources.surfaceArea = grossArea !== null ? 'GrossArea' : 'NetArea';
    }
    logger.log('✓ Using', grossArea !== null ? 'GrossArea' : 'NetArea', 'for surface area:', roofProps.surfaceAreaDisplay);
  }
  
  // Calculate footprint area (projected/plan) - prefer ProjectedArea, fallback to Length × Width
  if (projectedArea !== null) {
    const footprintAreaInSF = areaToSquareFeet(projectedArea);
    roofProps.footprintArea = footprintAreaInSF;
    roofProps.footprintAreaDisplay = `${formatSquareFeet(footprintAreaInSF)} SF`;
    if (sources) {
      sources.footprintArea = 'ProjectedArea';
    }
    logger.log('✓ Using ProjectedArea for footprint area:', roofProps.footprintAreaDisplay);
  } else if (length !== null && (width !== null || depth !== null)) {
    // Fallback: calculate footprint from length × width (or depth)
    const footprintLength = length;
    const footprintWidth = width ?? depth!;
    const footprintAreaRaw = footprintLength * footprintWidth;
    const footprintAreaInSF = areaToSquareFeet(footprintAreaRaw);
    roofProps.footprintArea = footprintAreaInSF;
    roofProps.footprintAreaDisplay = `${formatSquareFeet(footprintAreaInSF)} SF`;
    if (sources) {
      sources.footprintArea = `Length × ${width !== null ? 'Width' : 'Depth'}`;
    }
    logger.log('✓ Falling back to Length ×', width !== null ? 'Width' : 'Depth', 'for footprint area:', roofProps.footprintAreaDisplay);
  }
  
  return roofProps;
}

/**
 * Classify element into normalized category based on IFC class, predefined type, and name/type patterns
 * Centralized classification logic used by all extractors
 */
function classifyElementCategory(
  ifcClass: string,
  ifcPredefinedType?: string,
  categoryName?: string,
  familyName?: string,
  typeName?: string,
  name?: string
): string | undefined {
  // Step 1: Use IFC class mapping (from exportlayers-ifc-IAI.txt)
  let elementCategory = getCategoryFromMapping(ifcClass, ifcPredefinedType);
  
  // Step 2: Refine with CategoryName / FamilyName for special cases
  const categoryUpper = (categoryName || '').toUpperCase();
  const familyUpper = (familyName || '').toUpperCase();
  const typeUpper = (typeName || '').toUpperCase();
  const nameUpper = (name || '').toUpperCase();
  const allText = `${categoryUpper} ${familyUpper} ${typeUpper} ${nameUpper}`;
  
  // Special refinements for BuildingElementProxy
  if (ifcClass.toUpperCase() === 'IFCBUILDINGELEMENTPROXY' || ifcClass.toUpperCase() === 'IFCPROXY') {
    // Mass elements
    if (categoryUpper.includes('MASS') || categoryUpper.includes('MASSING') || 
        allText.includes('MASS') || allText.includes('MASSING')) {
      elementCategory = 'mass';
    }
    // Casework/cabinets
    else if (categoryUpper.includes('CASEWORK') || categoryUpper.includes('CABINET') ||
             allText.includes('CASEWORK') || allText.includes('CABINET') ||
             allText.includes('CAB') || allText.includes('VANITY')) {
      elementCategory = 'casework';
    }
    // Structural Framing (beams)
    else if (categoryUpper.includes('STRUCTURAL FRAMING') || categoryUpper.includes('FRAMING') ||
             allText.includes('BEAM') || allText.includes('GIRDER') || allText.includes('JOIST')) {
      elementCategory = 'beam';
    }
  }
  
  // Special refinements for slabs
  if (elementCategory === 'slab' || elementCategory === 'floor') {
    // Deck classification (slab with deck/porch/patio/balcony in name)
    if (allText.includes('DECK') || allText.includes('PORCH') || 
        allText.includes('PATIO') || allText.includes('BALCONY') ||
        categoryUpper.includes('DECK') || categoryUpper.includes('BRIDGE DECK')) {
      elementCategory = 'deck';
    }
    // Floor classification (explicit floor category or FLOOR predefined type)
    else if (ifcPredefinedType?.toUpperCase() === 'FLOOR' || 
             categoryUpper.includes('FLOOR') || 
             (elementCategory === 'floor' && !allText.includes('SLAB'))) {
      elementCategory = 'floor';
    }
  }
  
  // Special refinements for footings
  if (elementCategory === 'footing' || 
      (ifcClass.toUpperCase() === 'IFCSLAB' && ifcPredefinedType?.toUpperCase() === 'BASESLAB')) {
    elementCategory = 'footing';
  }
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    logger.log('[IFC] Classified element', {
      ifcClass,
      ifcPredefinedType,
      categoryName,
      familyName,
      typeName,
      name,
      elementCategory
    });
  }
  
  return elementCategory;
}

/**
 * Extract common identity fields from IFC element properties
 * Used by all element type extractors
 * Enhanced to capture PredefinedType, familyName, categoryName, and improved levelName lookup
 * Performance: Accepts optional baseProps and props to avoid redundant getProperties() calls
 */
export async function extractElementIdentity(
  ifcAPI: any,
  ifcManager: any,
  modelID: number,
  expressID: number,
  ifcClass: string,
  baseProps?: any,
  props?: any
): Promise<Partial<StandardizedElementBase>> {
  try {
    // Performance optimization: Use provided props if available, otherwise fetch
    const finalBaseProps = baseProps ?? await ifcAPI.getProperties(modelID, expressID, false, false);
    const finalProps = props ?? await ifcAPI.getProperties(modelID, expressID, true, false);
    
    const identity: Partial<StandardizedElementBase> = {
      ifcClass,
      expressID,
      globalId: finalBaseProps?.GlobalId?.value || finalBaseProps?.globalId || finalBaseProps?.GlobalId,
      name: finalProps?.Name?.value || finalProps?.Name || finalProps?.name || finalBaseProps?.Name?.value || finalBaseProps?.Name,
    };
    
    // Extract PredefinedType from baseProps or props
    if (finalBaseProps?.PredefinedType?.value !== undefined) {
      identity.ifcPredefinedType = String(finalBaseProps.PredefinedType.value);
    } else if (finalBaseProps?.PredefinedType !== undefined && typeof finalBaseProps.PredefinedType === 'string') {
      identity.ifcPredefinedType = finalBaseProps.PredefinedType;
    } else if (finalProps?.PredefinedType?.value !== undefined) {
      identity.ifcPredefinedType = String(finalProps.PredefinedType.value);
    } else if (finalProps?.PredefinedType !== undefined && typeof finalProps.PredefinedType === 'string') {
      identity.ifcPredefinedType = finalProps.PredefinedType;
    }
    
    // Extract type name from type object or property sets
    if (finalProps?.type) {
      try {
        const typeProps = await ifcManager.getItemProperties(modelID, finalProps.type, false);
        identity.typeName = typeProps?.Name?.value || typeProps?.Name || typeProps?.name;
      } catch (err) {
        // Type lookup failed, continue
      }
    }
    
    // Extract from property sets
    if (finalProps?.psets) {
      for (const pset of Object.values(finalProps.psets) as any[]) {
        if (!pset || !pset.HasProperties) continue;
        
        const psetName = (pset.Name?.value || pset.Name || '').toLowerCase();
        
        // Check for identity-related property sets
        const isIdentityPset = psetName.includes('identity') || 
                              psetName.includes('rehome') ||
                              psetName.includes('type');
        
        if (isIdentityPset || psetName.includes('common')) {
          for (let prop of pset.HasProperties || []) {
            prop = await resolvePropertyReference(ifcManager, modelID, prop);
            if (!prop) continue;
            
            const propName = extractPropertyName(prop).toLowerCase();
            const propValue = extractPropertyValue(prop);
            
            if (propName.includes('typemark') || propName === 'type mark') {
              identity.typeMark = typeof propValue === 'string' ? propValue : String(propValue);
            } else if (propName === 'mark' || propName.includes('instance mark')) {
              identity.instanceMark = typeof propValue === 'string' ? propValue : String(propValue);
            } else if (propName.includes('typename') || propName === 'type name') {
              identity.typeName = identity.typeName || (typeof propValue === 'string' ? propValue : String(propValue));
            } else if (propName.includes('phase') || propName.includes('phase created')) {
              identity.phase = typeof propValue === 'string' ? propValue : String(propValue);
            } else if (propName.includes('isexternal') || propName === 'is external') {
              identity.isExternal = Boolean(propValue);
            } else if (propName.includes('family') && (propName.includes('name') || propName === 'family')) {
              // Extract family name: Family, FamilyName, RevitFamily
              identity.familyName = typeof propValue === 'string' ? propValue : String(propValue);
            } else if (propName.includes('category') && (propName.includes('name') || propName === 'category')) {
              // Extract category name: Category, CategoryName, RevitCategory
              identity.categoryName = typeof propValue === 'string' ? propValue : String(propValue);
            } else if (propName === 'level' || propName.includes('reference level') || propName.includes('level name')) {
              // Extract level name from Revit Psets (preferred over spatial structure)
              identity.levelName = typeof propValue === 'string' ? propValue : String(propValue);
            }
          }
        }
      }
    }
    
    // Extract level name from spatial structure (fallback if not found in Psets)
    if (!identity.levelName) {
      try {
        const spatialStructure = await ifcManager.getSpatialStructure(modelID);
        // Try to find the storey containing this element
        // This is a simplified lookup - in practice, we'd traverse the spatial tree
        if (spatialStructure) {
          // For now, we'll leave this as a placeholder that can be enhanced
          // The spatial structure traversal would require more complex logic
        }
      } catch (err) {
        // Spatial structure lookup failed, continue
      }
    }
    
    // Classify element category using centralized logic
    identity.elementCategory = classifyElementCategory(
      ifcClass,
      identity.ifcPredefinedType,
      identity.categoryName,
      identity.familyName,
      identity.typeName,
      identity.name
    );
    
    // Log identity extraction in dev mode
    if (process.env.NODE_ENV === 'development') {
      logger.log('Element identity extracted:', {
        ifcClass: identity.ifcClass,
        ifcPredefinedType: identity.ifcPredefinedType,
        elementCategory: identity.elementCategory,
        typeName: identity.typeName,
        familyName: identity.familyName,
        categoryName: identity.categoryName,
        levelName: identity.levelName,
      });
    }
    
    return identity;
  } catch (err) {
    logger.warn('Error extracting element identity:', err);
    return { ifcClass, expressID };
  }
}

/**
 * Extract quantity value from quantity sets by name
 * Helper function for all extractors
 */
export async function extractQuantityValue(
  ifcManager: any,
  modelID: number,
  props: any,
  quantityName: string,
  quantitySetName?: string
): Promise<number | null> {
  try {
    let quantities: any = null;
    
    if (props.qsets) {
      quantities = props.qsets;
    } else if (props.psets) {
      const allSets = props.psets || [];
      const qsets = allSets.filter((set: any) => {
        const setName = (set.Name?.value || set.Name || '').toLowerCase();
        return setName.includes('qto') || setName.includes('quantity') || set.Quantities !== undefined;
      });
      if (qsets.length > 0) {
        quantities = qsets;
      }
    }
    
    if (!quantities) return null;
    
    const qtyNameLower = quantityName.toLowerCase();
    const qsetNameLower = quantitySetName?.toLowerCase() || '';
    
    for (const qset of Object.values(quantities) as any[]) {
      if (!qset || !qset.Quantities) continue;
      
      const currentQsetName = (qset.Name?.value || qset.Name || '').toLowerCase();
      
      // If quantitySetName specified, only check that set
      if (quantitySetName && !currentQsetName.includes(qsetNameLower)) {
        continue;
      }
      
      for (const qty of qset.Quantities || []) {
        let qtyObj = qty;
        if (typeof qty === 'number') {
          try {
            qtyObj = await ifcManager.getItemProperties(modelID, qty, false);
          } catch (err) {
            continue;
          }
        } else if (qty.value && typeof qty.value === 'number' && qty.value > 1000) {
          try {
            qtyObj = await ifcManager.getItemProperties(modelID, qty.value, false);
          } catch (err) {
            // Continue with original
          }
        }
        
        const currentQtyName = (qtyObj.Name?.value || qtyObj.Name || '').toLowerCase();
        
        if (currentQtyName === qtyNameLower || currentQtyName.includes(qtyNameLower)) {
          let qtyValue: any = null;
          if (qtyObj.AreaValue !== undefined) {
            qtyValue = qtyObj.AreaValue?.value ?? qtyObj.AreaValue;
          } else if (qtyObj.LengthValue !== undefined) {
            qtyValue = qtyObj.LengthValue?.value ?? qtyObj.LengthValue;
          } else if (qtyObj.VolumeValue !== undefined) {
            qtyValue = qtyObj.VolumeValue?.value ?? qtyObj.VolumeValue;
          }
          
          if (typeof qtyValue === 'number' && qtyValue > 0) {
            return qtyValue;
          }
        }
      }
    }
    
    return null;
  } catch (err) {
    logger.warn(`Error extracting quantity ${quantityName}:`, err);
    return null;
  }
}

/**
 * Extract property value from property sets by name
 * Helper function for all extractors
 */
export async function extractPropertyValueFromPsets(
  ifcManager: any,
  modelID: number,
  props: any,
  propertyName: string,
  propertySetName?: string
): Promise<any | null> {
  try {
    if (!props || !props.psets) return null;
    
    const propNameLower = propertyName.toLowerCase();
    const psetNameLower = propertySetName?.toLowerCase() || '';
    
    for (const pset of Object.values(props.psets) as any[]) {
      if (!pset || !pset.HasProperties) continue;
      
      const currentPsetName = (pset.Name?.value || pset.Name || '').toLowerCase();
      
      // If propertySetName specified, only check that set
      if (propertySetName && !currentPsetName.includes(psetNameLower)) {
        continue;
      }
      
      for (let prop of pset.HasProperties || []) {
        prop = await resolvePropertyReference(ifcManager, modelID, prop);
        if (!prop) continue;
        
        const currentPropName = extractPropertyName(prop).toLowerCase();
        
        if (currentPropName === propNameLower || currentPropName.includes(propNameLower)) {
          const propValue = extractPropertyValue(prop);
          
          // Handle numeric values (integers, floats)
          if (typeof propValue === 'number' && !isNaN(propValue)) {
            return propValue;
          }
          
          // Handle string representations of numbers
          if (typeof propValue === 'string') {
            const numValue = parseFloat(propValue);
            if (!isNaN(numValue)) {
              return numValue;
            }
          }
        }
      }
    }
    
    return null;
  } catch (err) {
    logger.warn(`Error extracting property ${propertyName}:`, err);
    return null;
  }
}

/**
 * Main function to extract standardized properties for a roof object
 * 
 * This function:
 * 1. Extracts properties from property sets (slope, thickness, etc.)
 * 2. Extracts quantities from quantity sets (surface area, footprint area, dimensions)
 * 3. Calculates surface area from footprint and pitch angle if needed (fallback)
 * 
 * Surface area (sloped) priority:
 * - GrossArea or NetArea from quantity sets (preferred)
 * - Calculated from footprint × 1/cos(pitch angle) if footprint and pitch available (fallback)
 * 
 * Footprint area (projected/plan) priority:
 * - ProjectedArea from quantity sets (preferred)
 * - Length × Width from quantity sets (fallback)
 * 
 * @param ifcAPI - The IFC API object (viewer.IFC) that has getProperties method
 * @param ifcManager - The IFC manager (viewer.IFC.loader.ifcManager) for item lookups
 * @param modelID - The model ID
 * @param expressID - The express ID of the object
 */
export async function extractStandardizedRoofProperties(
  ifcAPI: any,
  ifcManager: any,
  modelID: number,
  expressID: number,
  baseProps?: any,
  props?: any
): Promise<StandardizedRoofProperties> {
  try {
    // Performance optimization: Use provided props if available, otherwise fetch
    const finalBaseProps = baseProps ?? await ifcAPI.getProperties(modelID, expressID, false, false);
    const finalProps = props ?? await ifcAPI.getProperties(modelID, expressID, true, false);
    
    // Initialize debug tracking
    const debugInfo: { propertySetsFound: string[]; quantitySetsFound: string[]; sources: any } = {
      propertySetsFound: [],
      quantitySetsFound: [],
      sources: {}
    };
    
    // Extract from property sets (includes Rehome_RoofAdapter)
    const propsFromSets = await extractRoofProperties(ifcManager, modelID, finalProps, debugInfo);
    
    // Extract from quantity sets (pass debugInfo for quantity set tracking)
    const propsFromQuantities = await extractRoofPropertiesFromQuantities(
      ifcManager, 
      modelID, 
      finalProps, 
      debugInfo.sources,
      debugInfo
    );
    
    // Merge results (property sets take precedence, but quantities can fill gaps)
    const standardized: StandardizedRoofProperties = {
      ...propsFromQuantities,
      ...propsFromSets, // Property sets override quantities (but keep quantities' area values)
      // Preserve pitch angle from property sets for calculations
      _pitchAngleDeg: propsFromSets._pitchAngleDeg ?? propsFromQuantities._pitchAngleDeg,
    };
    
    // Angle-based fallback for surface area calculation
    // If we don't have GrossArea/NetArea, but we have footprint and pitch angle, calculate surface area
    if (!standardized.surfaceArea && standardized.footprintArea && standardized._pitchAngleDeg != null) {
      const pitchAngleDeg = standardized._pitchAngleDeg;
      const thetaRad = pitchAngleDeg * Math.PI / 180;
      const cosTheta = Math.cos(thetaRad);
      
      // Avoid division by zero if angle is exactly 90 degrees
      if (Math.abs(cosTheta) > 1e-6) {
        const calculatedSurfaceArea = standardized.footprintArea / cosTheta;
        standardized.surfaceArea = calculatedSurfaceArea;
        standardized.surfaceAreaDisplay = `${formatSquareFeet(calculatedSurfaceArea)} SF`;
        if (debugInfo.sources) {
          debugInfo.sources.surfaceArea = `Calculated from footprint × 1/cos(${pitchAngleDeg.toFixed(1)}°)`;
        }
        logger.log('✓ Calculated surface area from footprint and pitch angle:', standardized.surfaceAreaDisplay);
      }
    }
    
    // Merge debug info
    if (propsFromSets._debug || propsFromQuantities._debug) {
      standardized._debug = {
        ...propsFromSets._debug,
        ...propsFromQuantities._debug,
        propertySetsFound: debugInfo.propertySetsFound,
        quantitySetsFound: debugInfo.quantitySetsFound,
        sources: {
          ...debugInfo.sources,
          ...propsFromSets._debug?.sources,
          ...propsFromQuantities._debug?.sources
        }
      };
    }
    
    // Log concise summary in dev mode
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
      logger.log('🏠 Roof Properties Summary:', {
        propertySets: debugInfo.propertySetsFound,
        quantitySets: debugInfo.quantitySetsFound,
        rehomeAdapterFound: standardized._debug?.rehomeAdapterFound || false,
        rehomeAdapterFields: standardized._debug?.rehomeAdapterFields || [],
        sources: standardized._debug?.sources || {},
        extracted: {
          slope: !!standardized.slope,
          thickness: !!standardized.thickness,
          area: !!standardized.area,
          surfaceArea: !!standardized.surfaceArea,
          footprintArea: !!standardized.footprintArea,
          baseLevel: !!standardized.baseLevelLabel,
          baseOffset: !!standardized.baseOffsetDisplay,
          maxRidgeHeight: !!standardized.maxRidgeHeightDisplay,
          slopeText: !!standardized.slopeText
        }
      });
    }
    
    return standardized;
  } catch (err) {
    logger.error('Error extracting standardized roof properties:', err);
    return {};
  }
}

/**
 * Extract standardized metrics for a slab/floor element
 * IFC Quantity Sets: Qto_SlabBaseQuantities (GrossArea, NetArea, Perimeter, Width, GrossVolume, NetVolume)
 * IFC Property Sets: Pset_SlabCommon (IsExternal, PredefinedType)
 */
export async function extractStandardizedSlabMetrics(
  ifcAPI: any,
  ifcManager: any,
  modelID: number,
  expressID: number,
  baseProps?: any,
  props?: any
): Promise<StandardizedSlabMetrics> {
  try {
    // Performance optimization: Use provided props if available, otherwise fetch
    const finalBaseProps = baseProps ?? await ifcAPI.getProperties(modelID, expressID, false, false);
    const finalProps = props ?? await ifcAPI.getProperties(modelID, expressID, true, false);
    
    const identity = await extractElementIdentity(ifcAPI, ifcManager, modelID, expressID, 'IfcSlab', finalBaseProps, finalProps);
    
    const metrics: StandardizedSlabMetrics = { ...identity, ifcClass: 'IfcSlab', expressID };
    
    // Performance optimization: Parallelize quantity set extractions
    const [qGrossArea, qNetArea, qPerimeter, qWidth, qLength, qGrossVolume, qNetVolume, baseQ] = await Promise.all([
      extractQuantityValue(ifcManager, modelID, finalProps, 'GrossArea', 'Qto_SlabBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'NetArea', 'Qto_SlabBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'Perimeter', 'Qto_SlabBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'Width', 'Qto_SlabBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'Length', 'Qto_SlabBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'GrossVolume', 'Qto_SlabBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'NetVolume', 'Qto_SlabBaseQuantities'),
      extractBaseQuantitiesFromPsets(ifcManager, modelID, finalProps.psets)
    ]);
    const floorAdapter = extractRehomeFloorAdapter(finalProps.psets);
    
    // Extract length and width for size calculation (if available)
    // Note: qWidth from Qto_SlabBaseQuantities is thickness, not width, so don't use it for size
    const lengthIfc = qLength ?? baseQ?.length ?? undefined;
    const widthIfc = baseQ?.width ?? undefined; // Only use width from BaseQuantities Pset, not qWidth
    
    // Combine quantity set and Pset values (quantity sets take precedence)
    const grossAreaIfc = qGrossArea ?? baseQ?.grossArea ?? baseQ?.netArea ?? floorAdapter?.area ?? undefined;
    const netAreaIfc = qNetArea ?? baseQ?.netArea ?? undefined;
    const perimeterIfc = qPerimeter ?? baseQ?.perimeter ?? floorAdapter?.perimeter ?? undefined;
    // Note: For slabs, Width in Qto_SlabBaseQuantities represents thickness, not width
    // So we need to be careful not to use qWidth for both thickness and size calculation
    const thicknessIfc = qWidth ?? baseQ?.thickness ?? floorAdapter?.thickness ?? undefined;
    const volumeIfc = qGrossVolume ?? qNetVolume ?? baseQ?.grossVolume ?? baseQ?.netVolume ?? baseQ?.volume ?? undefined;
    
    // Area (prefer GrossArea, fallback to NetArea)
    if (grossAreaIfc != null) {
      metrics.areaSqFt = areaToSquareFeet(grossAreaIfc);
      metrics.areaDisplay = `${formatSquareFeet(metrics.areaSqFt)} SF`;
    } else if (netAreaIfc != null) {
      metrics.areaSqFt = areaToSquareFeet(netAreaIfc);
      metrics.areaDisplay = `${formatSquareFeet(metrics.areaSqFt)} SF`;
    }
    
    // Perimeter
    if (perimeterIfc != null) {
      metrics.perimeterFt = lengthToFeet(perimeterIfc);
      metrics.perimeterDisplay = lengthToFeetInches(metrics.perimeterFt);
    }
    
    // Thickness (from Width in Qto_SlabBaseQuantities or BaseQuantities Pset)
    if (thicknessIfc != null) {
      metrics.thicknessFt = lengthToFeet(thicknessIfc);
      metrics.thicknessDisplay = lengthToFeetInches(metrics.thicknessFt);
    }
    
    // Volume (prefer GrossVolume, fallback to NetVolume)
    if (volumeIfc != null) {
      metrics.volumeCuFt = volumeToCubicFeet(volumeIfc);
      metrics.volumeCuYd = cubicFeetToCubicYards(metrics.volumeCuFt);
      metrics.volumeDisplay = formatCubicYards(metrics.volumeCuYd);
    }
    
    // Calculate Size (only for rectangles/squares)
    // If we have length and width, use them directly
    if (lengthIfc != null && widthIfc != null) {
      const lengthFt = lengthToFeet(lengthIfc);
      const widthFt = lengthToFeet(widthIfc);
      metrics.sizeDisplay = formatSizeDisplay(widthFt, lengthFt);
    } else if (perimeterIfc != null && grossAreaIfc != null) {
      // Try to calculate length and width from area and perimeter
      // For a rectangle: perimeter = 2*(length + width), area = length * width
      // Solving: length + width = perimeter/2, length * width = area
      // This is a quadratic: w^2 - (perimeter/2)*w + area = 0
      const perimeterFt = lengthToFeet(perimeterIfc);
      const areaSqFt = areaToSquareFeet(grossAreaIfc);
      
      if (perimeterFt > 0 && areaSqFt > 0) {
        const semiPerimeter = perimeterFt / 2;
        const discriminant = semiPerimeter * semiPerimeter - 4 * areaSqFt;
        
        // If discriminant is non-negative, we have a valid rectangle
        if (discriminant >= 0) {
          const sqrtDiscriminant = Math.sqrt(discriminant);
          const lengthFt = (semiPerimeter + sqrtDiscriminant) / 2;
          const widthFt = (semiPerimeter - sqrtDiscriminant) / 2;
          
          // Check if it's roughly rectangular (length and width are reasonable)
          // and the calculated area matches the actual area (within 5% tolerance)
          const calculatedArea = lengthFt * widthFt;
          const areaDifference = Math.abs(calculatedArea - areaSqFt) / areaSqFt;
          
          if (lengthFt > 0 && widthFt > 0 && areaDifference < 0.05) {
            metrics.sizeDisplay = formatSizeDisplay(widthFt, lengthFt);
          }
        }
      }
    }
    
    // Determine slab kind from name and properties (for internal use, not displayed)
    const nameLower = (metrics.name || '').toLowerCase();
    if (nameLower.includes('deck') || nameLower.includes('balcony') || nameLower.includes('patio')) {
      metrics.slabKind = 'deck';
    } else if (nameLower.includes('porch')) {
      metrics.slabKind = 'porch';
    } else if (metrics.isExternal) {
      metrics.slabKind = 'exterior';
    } else {
      metrics.slabKind = 'interior';
    }
    
    // Dev logging
    if (process.env.NODE_ENV === 'development') {
      const qsetNames = props.qsets ? Object.keys(props.qsets) : [];
      const psetNames = props.psets ? Object.keys(props.psets).map((key: string) => {
        const pset = props.psets[key];
        return pset?.Name?.value || pset?.Name || key;
      }) : [];
      
      logger.log('[IFC] Slab metrics summary', {
        expressID: identity.expressID,
        name: identity.name,
        qsetNames,
        psetNames,
        baseQuantitiesFound: !!baseQ,
        baseQuantitiesSource: baseQ?.sourceName,
        baseQValues: baseQ ? {
          grossArea: baseQ.grossArea,
          netArea: baseQ.netArea,
          perimeter: baseQ.perimeter,
          thickness: baseQ.thickness,
          width: baseQ.width,
          length: baseQ.length,
          volume: baseQ.volume,
          grossVolume: baseQ.grossVolume,
          netVolume: baseQ.netVolume
        } : null,
        floorAdapterValues: floorAdapter || null,
        grossAreaIfc,
        netAreaIfc,
        perimeterIfc,
        thicknessIfc,
        lengthIfc,
        widthIfc,
        volumeIfc,
        slabKind: metrics.slabKind,
        areaDisplay: metrics.areaDisplay,
        thicknessDisplay: metrics.thicknessDisplay,
        perimeterDisplay: metrics.perimeterDisplay,
        volumeDisplay: metrics.volumeDisplay,
        sizeDisplay: metrics.sizeDisplay,
      });
    }
    
    return metrics;
  } catch (err) {
    logger.error('Error extracting standardized slab metrics:', err);
    return { ifcClass: 'IfcSlab', expressID };
  }
}

/**
 * Extract standardized metrics for a wall element
 * IFC Quantity Sets: Qto_WallBaseQuantities (Length, Height, Width, GrossArea, NetArea, GrossVolume, NetVolume)
 * IFC Property Sets: Pset_WallCommon (IsExternal)
 */
export async function extractStandardizedWallMetrics(
  ifcAPI: any,
  ifcManager: any,
  modelID: number,
  expressID: number,
  baseProps?: any,
  props?: any
): Promise<StandardizedWallMetrics> {
  try {
    // Performance optimization: Use provided props if available, otherwise fetch
    const finalBaseProps = baseProps ?? await ifcAPI.getProperties(modelID, expressID, false, false);
    const finalProps = props ?? await ifcAPI.getProperties(modelID, expressID, true, false);
    
    const identity = await extractElementIdentity(ifcAPI, ifcManager, modelID, expressID, 'IfcWall', finalBaseProps, finalProps);
    
    const metrics: StandardizedWallMetrics = { ...identity, ifcClass: 'IfcWall', expressID };
    
    // Performance optimization: Parallelize quantity set extractions
    const [qLength, qHeight, qWidth, qGrossArea, qNetArea, qGrossVolume, qNetVolume, baseQ] = await Promise.all([
      extractQuantityValue(ifcManager, modelID, finalProps, 'Length', 'Qto_WallBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'Height', 'Qto_WallBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'Width', 'Qto_WallBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'GrossArea', 'Qto_WallBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'NetArea', 'Qto_WallBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'GrossVolume', 'Qto_WallBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'NetVolume', 'Qto_WallBaseQuantities'),
      extractBaseQuantitiesFromPsets(ifcManager, modelID, finalProps.psets)
    ]);
    
    // Combine quantity set and Pset values (quantity sets take precedence)
    const lengthIfc = qLength ?? baseQ?.length ?? undefined;
    const heightIfc = qHeight ?? baseQ?.height ?? undefined;
    const thicknessIfc = qWidth ?? baseQ?.thickness ?? baseQ?.width ?? undefined;
    const oneSideAreaIfc = qNetArea ?? qGrossArea ?? baseQ?.netArea ?? baseQ?.grossArea ?? undefined;
    const volumeIfc = qGrossVolume ?? qNetVolume ?? baseQ?.grossVolume ?? baseQ?.netVolume ?? baseQ?.volume ?? undefined;
    
    // Length
    if (lengthIfc != null) {
      metrics.lengthFt = lengthToFeet(lengthIfc);
      metrics.lengthDisplay = lengthToFeetInches(metrics.lengthFt);
    }
    
    // Height
    if (heightIfc != null) {
      metrics.heightFt = lengthToFeet(heightIfc);
      metrics.heightDisplay = lengthToFeetInches(metrics.heightFt);
    }
    
    // Thickness (from Width in Qto_WallBaseQuantities or BaseQuantities Pset)
    if (thicknessIfc != null) {
      metrics.thicknessFt = lengthToFeet(thicknessIfc);
      metrics.thicknessDisplay = lengthToFeetInches(metrics.thicknessFt);
    }
    
    // Area one side (prefer NetArea, fallback to GrossArea)
    if (oneSideAreaIfc != null) {
      metrics.areaOneSideSqFt = areaToSquareFeet(oneSideAreaIfc);
      metrics.areaOneSideDisplay = `${formatSquareFeet(metrics.areaOneSideSqFt)} SF`;
      
      // Area both sides (2x one side)
      metrics.areaBothSidesSqFt = metrics.areaOneSideSqFt * 2;
      metrics.areaBothSidesDisplay = `${formatSquareFeet(metrics.areaBothSidesSqFt)} SF`;
    }
    
    // Volume (prefer GrossVolume, fallback to NetVolume)
    if (volumeIfc != null) {
      metrics.volumeCuFt = volumeToCubicFeet(volumeIfc);
      metrics.volumeCuYd = cubicFeetToCubicYards(metrics.volumeCuFt);
      metrics.volumeDisplay = formatCubicYards(metrics.volumeCuYd);
    }
    
    // Dev logging
    if (process.env.NODE_ENV === 'development') {
      const qsetNames = props.qsets ? Object.keys(props.qsets) : [];
      const psetNames = props.psets ? Object.keys(props.psets).map((key: string) => {
        const pset = props.psets[key];
        return pset?.Name?.value || pset?.Name || key;
      }) : [];
      
      logger.log('[IFC] Wall metrics summary', {
        expressID: identity.expressID,
        name: identity.name,
        elementCategory: identity.elementCategory,
        qsetNames,
        psetNames,
        baseQuantitiesFound: !!baseQ,
        baseQuantitiesSource: baseQ?.sourceName,
        lengthIfc,
        heightIfc,
        thicknessIfc,
        oneSideAreaIfc,
        volumeIfc,
        lengthDisplay: metrics.lengthDisplay,
        heightDisplay: metrics.heightDisplay,
        thicknessDisplay: metrics.thicknessDisplay,
        areaBothSidesDisplay: metrics.areaBothSidesDisplay,
        volumeDisplay: metrics.volumeDisplay,
      });
    }
    
    return metrics;
  } catch (err) {
    logger.error('Error extracting standardized wall metrics:', err);
    return { ifcClass: 'IfcWall', expressID };
  }
}

/**
 * Extract standardized metrics for a door element
 * IFC Quantity Sets: Qto_DoorBaseQuantities (Width, Height, Area)
 * IFC Property Sets: Pset_DoorCommon (IsExternal)
 */
export async function extractStandardizedDoorMetrics(
  ifcAPI: any,
  ifcManager: any,
  modelID: number,
  expressID: number,
  baseProps?: any,
  props?: any
): Promise<StandardizedDoorMetrics> {
  try {
    // Performance optimization: Use provided props if available, otherwise fetch
    const finalBaseProps = baseProps ?? await ifcAPI.getProperties(modelID, expressID, false, false);
    const finalProps = props ?? await ifcAPI.getProperties(modelID, expressID, true, false);
    
    const identity = await extractElementIdentity(ifcAPI, ifcManager, modelID, expressID, 'IfcDoor', finalBaseProps, finalProps);
    
    const metrics: StandardizedDoorMetrics = { ...identity, ifcClass: 'IfcDoor', expressID };
    
    // Performance optimization: Parallelize quantity set extractions
    const [qWidth, qHeight, qArea, baseQ] = await Promise.all([
      extractQuantityValue(ifcManager, modelID, finalProps, 'Width', 'Qto_DoorBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'Height', 'Qto_DoorBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'Area', 'Qto_DoorBaseQuantities'),
      extractBaseQuantitiesFromPsets(ifcManager, modelID, finalProps.psets)
    ]);
    
    // Combine quantity set and Pset values (quantity sets take precedence)
    const widthIfc = qWidth ?? baseQ?.width ?? undefined;
    const heightIfc = qHeight ?? baseQ?.height ?? undefined;
    const areaIfc = qArea ?? baseQ?.netArea ?? baseQ?.grossArea ?? undefined;
    
    // Width
    if (widthIfc != null) {
      metrics.widthFt = lengthToFeet(widthIfc);
      metrics.widthDisplay = lengthToFeetInches(metrics.widthFt);
    }
    
    // Height
    if (heightIfc != null) {
      metrics.heightFt = lengthToFeet(heightIfc);
      metrics.heightDisplay = lengthToFeetInches(metrics.heightFt);
    }
    
    // Size (combined width x height)
    if (metrics.widthFt && metrics.heightFt) {
      metrics.sizeDisplay = formatSizeDisplay(metrics.widthFt, metrics.heightFt);
    }
    
    // Leaf area
    if (areaIfc != null) {
      metrics.leafAreaSqFt = areaToSquareFeet(areaIfc);
      metrics.leafAreaDisplay = `${formatSquareFeet(metrics.leafAreaSqFt)} SF`;
    } else if (metrics.widthFt && metrics.heightFt) {
      // Fallback: Calculate area from width × height if area not found in quantity sets
      metrics.leafAreaSqFt = metrics.widthFt * metrics.heightFt;
      metrics.leafAreaDisplay = `${formatSquareFeet(metrics.leafAreaSqFt)} SF`;
    }
    
    // Fallback: Parse dimensions from door name if not found in quantities
    // Common patterns: "36" x 80"", "36x80", "3' x 6'8"", etc.
    if ((!widthIfc || !heightIfc) && identity.name) {
      const name = identity.name;
      // Pattern 1: "36" x 80"" (inches with quotes)
      const inchesPattern = /(\d+)\s*["']\s*[xX×]\s*(\d+)\s*["']/;
      // Pattern 2: "36x80" or "36 x 80" (no quotes, assume inches)
      const noQuotesPattern = /(\d+)\s*[xX×]\s*(\d+)/;
      // Pattern 3: "3' x 6'8"" (feet with quotes, may have inches)
      const feetPattern = /(\d+(?:\.\d+)?)\s*['']\s*[xX×]\s*(\d+(?:\.\d+)?)\s*['']/;
      
      let parsedWidth: number | null = null;
      let parsedHeight: number | null = null;
      
      // Try inches with quotes first (most common in Revit)
      const inchesMatch = name.match(inchesPattern);
      if (inchesMatch) {
        parsedWidth = parseFloat(inchesMatch[1]) / 12; // Convert inches to feet
        parsedHeight = parseFloat(inchesMatch[2]) / 12;
      } else {
        // Try feet with quotes
        const feetMatch = name.match(feetPattern);
        if (feetMatch) {
          parsedWidth = parseFloat(feetMatch[1]);
          parsedHeight = parseFloat(feetMatch[2]);
        } else {
          // Try no quotes (assume inches if both numbers are < 100)
          const noQuotesMatch = name.match(noQuotesPattern);
          if (noQuotesMatch) {
            const w = parseFloat(noQuotesMatch[1]);
            const h = parseFloat(noQuotesMatch[2]);
            // If both are reasonable door dimensions in inches (< 100), treat as inches
            if (w < 100 && h < 100) {
              parsedWidth = w / 12; // Convert inches to feet
              parsedHeight = h / 12;
            } else {
              // Otherwise treat as feet
              parsedWidth = w;
              parsedHeight = h;
            }
          }
        }
      }
      
      // Use parsed dimensions if we found them and don't already have values
      if (parsedWidth && parsedHeight) {
        if (!widthIfc) {
          metrics.widthFt = parsedWidth;
          metrics.widthDisplay = lengthToFeetInches(parsedWidth);
          if (process.env.NODE_ENV === 'development') {
            logger.log('Door: parsed width from name:', metrics.widthDisplay, 'from:', name);
          }
        }
        if (!heightIfc) {
          metrics.heightFt = parsedHeight;
          metrics.heightDisplay = lengthToFeetInches(parsedHeight);
          if (process.env.NODE_ENV === 'development') {
            logger.log('Door: parsed height from name:', metrics.heightDisplay, 'from:', name);
          }
        }
        // Calculate area from parsed dimensions if we don't have it
        if (!areaIfc && metrics.widthFt && metrics.heightFt) {
          metrics.leafAreaSqFt = metrics.widthFt * metrics.heightFt;
          metrics.leafAreaDisplay = `${formatSquareFeet(metrics.leafAreaSqFt)} SF`;
        }
        // Update size display if we parsed dimensions
        if (metrics.widthFt && metrics.heightFt) {
          metrics.sizeDisplay = formatSizeDisplay(metrics.widthFt, metrics.heightFt);
        }
      }
    }
    
    // Dev logging
    if (process.env.NODE_ENV === 'development') {
      const qsetNames = props.qsets ? Object.keys(props.qsets) : [];
      const psetNames = props.psets ? Object.keys(props.psets).map((key: string) => {
        const pset = props.psets[key];
        return pset?.Name?.value || pset?.Name || key;
      }) : [];
      
      logger.log('[IFC] Door metrics summary', {
        expressID: identity.expressID,
        name: identity.name,
        elementCategory: identity.elementCategory,
        qsetNames,
        psetNames,
        baseQuantitiesFound: !!baseQ,
        baseQuantitiesSource: baseQ?.sourceName,
        widthIfc,
        heightIfc,
        areaIfc,
        widthDisplay: metrics.widthDisplay,
        heightDisplay: metrics.heightDisplay,
        leafAreaDisplay: metrics.leafAreaDisplay,
      });
    }
    
    return metrics;
  } catch (err) {
    logger.error('Error extracting standardized door metrics:', err);
    return { ifcClass: 'IfcDoor', expressID };
  }
}

/**
 * Extract standardized metrics for a window element
 * IFC Quantity Sets: Qto_WindowBaseQuantities (Width, Height, Area)
 * IFC Property Sets: Pset_WindowCommon (IsExternal)
 */
export async function extractStandardizedWindowMetrics(
  ifcAPI: any,
  ifcManager: any,
  modelID: number,
  expressID: number,
  baseProps?: any,
  props?: any
): Promise<StandardizedWindowMetrics> {
  try {
    // Performance optimization: Use provided props if available, otherwise fetch
    const finalBaseProps = baseProps ?? await ifcAPI.getProperties(modelID, expressID, false, false);
    const finalProps = props ?? await ifcAPI.getProperties(modelID, expressID, true, false);
    
    const identity = await extractElementIdentity(ifcAPI, ifcManager, modelID, expressID, 'IfcWindow', finalBaseProps, finalProps);
    
    const metrics: StandardizedWindowMetrics = { ...identity, ifcClass: 'IfcWindow', expressID };
    
    // Performance optimization: Parallelize quantity set extractions
    const [qWidth, qHeight, qArea, baseQ] = await Promise.all([
      extractQuantityValue(ifcManager, modelID, finalProps, 'Width', 'Qto_WindowBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'Height', 'Qto_WindowBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'Area', 'Qto_WindowBaseQuantities'),
      extractBaseQuantitiesFromPsets(ifcManager, modelID, finalProps.psets)
    ]);
    
    // Combine quantity set and Pset values (quantity sets take precedence)
    const widthIfc = qWidth ?? baseQ?.width ?? undefined;
    const heightIfc = qHeight ?? baseQ?.height ?? undefined;
    const areaIfc = qArea ?? baseQ?.netArea ?? baseQ?.grossArea ?? undefined;
    
    // Width
    if (widthIfc != null) {
      metrics.widthFt = lengthToFeet(widthIfc);
      metrics.widthDisplay = lengthToFeetInches(metrics.widthFt);
    }
    
    // Height
    if (heightIfc != null) {
      metrics.heightFt = lengthToFeet(heightIfc);
      metrics.heightDisplay = lengthToFeetInches(metrics.heightFt);
    }
    
    // Size (combined width x height)
    if (metrics.widthFt && metrics.heightFt) {
      metrics.sizeDisplay = formatSizeDisplay(metrics.widthFt, metrics.heightFt);
    }
    
    // Area
    if (areaIfc != null) {
      metrics.areaSqFt = areaToSquareFeet(areaIfc);
      metrics.areaDisplay = `${formatSquareFeet(metrics.areaSqFt)} SF`;
    } else if (metrics.widthFt && metrics.heightFt) {
      // Fallback: Calculate area from width × height if area not found in quantity sets
      metrics.areaSqFt = metrics.widthFt * metrics.heightFt;
      metrics.areaDisplay = `${formatSquareFeet(metrics.areaSqFt)} SF`;
    }
    
    // Fallback: Parse dimensions from window name if not found in quantities
    // Common patterns: "36" x 60"", "36x60", "3' x 5'", etc.
    if ((!widthIfc || !heightIfc) && identity.name) {
      const name = identity.name;
      // Pattern 1: "36" x 60"" (inches with quotes)
      const inchesPattern = /(\d+)\s*["']\s*[xX×]\s*(\d+)\s*["']/;
      // Pattern 2: "36x60" or "36 x 60" (no quotes, assume inches)
      const noQuotesPattern = /(\d+)\s*[xX×]\s*(\d+)/;
      // Pattern 3: "3' x 5'" (feet with quotes)
      const feetPattern = /(\d+(?:\.\d+)?)\s*['']\s*[xX×]\s*(\d+(?:\.\d+)?)\s*['']/;
      
      let parsedWidth: number | null = null;
      let parsedHeight: number | null = null;
      
      // Try inches with quotes first (most common in Revit)
      const inchesMatch = name.match(inchesPattern);
      if (inchesMatch) {
        parsedWidth = parseFloat(inchesMatch[1]) / 12; // Convert inches to feet
        parsedHeight = parseFloat(inchesMatch[2]) / 12;
      } else {
        // Try feet with quotes
        const feetMatch = name.match(feetPattern);
        if (feetMatch) {
          parsedWidth = parseFloat(feetMatch[1]);
          parsedHeight = parseFloat(feetMatch[2]);
        } else {
          // Try no quotes (assume inches if both numbers are < 100)
          const noQuotesMatch = name.match(noQuotesPattern);
          if (noQuotesMatch) {
            const w = parseFloat(noQuotesMatch[1]);
            const h = parseFloat(noQuotesMatch[2]);
            // If both are reasonable window dimensions in inches (< 100), treat as inches
            if (w < 100 && h < 100) {
              parsedWidth = w / 12; // Convert inches to feet
              parsedHeight = h / 12;
            } else {
              // Otherwise treat as feet
              parsedWidth = w;
              parsedHeight = h;
            }
          }
        }
      }
      
      // Use parsed dimensions if we found them and don't already have values
      if (parsedWidth && parsedHeight) {
        if (!widthIfc) {
          metrics.widthFt = parsedWidth;
          metrics.widthDisplay = lengthToFeetInches(parsedWidth);
          if (process.env.NODE_ENV === 'development') {
            logger.log('Window: parsed width from name:', metrics.widthDisplay, 'from:', name);
          }
        }
        if (!heightIfc) {
          metrics.heightFt = parsedHeight;
          metrics.heightDisplay = lengthToFeetInches(parsedHeight);
          if (process.env.NODE_ENV === 'development') {
            logger.log('Window: parsed height from name:', metrics.heightDisplay, 'from:', name);
          }
        }
        // Calculate area from parsed dimensions if we don't have it
        if (!areaIfc && metrics.widthFt && metrics.heightFt) {
          metrics.areaSqFt = metrics.widthFt * metrics.heightFt;
          metrics.areaDisplay = `${formatSquareFeet(metrics.areaSqFt)} SF`;
        }
        // Update size display if we parsed dimensions
        if (metrics.widthFt && metrics.heightFt) {
          metrics.sizeDisplay = formatSizeDisplay(metrics.widthFt, metrics.heightFt);
        }
      }
    }
    
    // Dev logging
    if (process.env.NODE_ENV === 'development') {
      const qsetNames = props.qsets ? Object.keys(props.qsets) : [];
      const psetNames = props.psets ? Object.keys(props.psets).map((key: string) => {
        const pset = props.psets[key];
        return pset?.Name?.value || pset?.Name || key;
      }) : [];
      
      logger.log('[IFC] Window metrics summary', {
        expressID: identity.expressID,
        name: identity.name,
        elementCategory: identity.elementCategory,
        qsetNames,
        psetNames,
        baseQuantitiesFound: !!baseQ,
        baseQuantitiesSource: baseQ?.sourceName,
        widthIfc,
        heightIfc,
        areaIfc,
        widthDisplay: metrics.widthDisplay,
        heightDisplay: metrics.heightDisplay,
        sizeDisplay: metrics.sizeDisplay,
        areaDisplay: metrics.areaDisplay,
      });
    }
    
    return metrics;
  } catch (err) {
    logger.error('Error extracting standardized window metrics:', err);
    return { ifcClass: 'IfcWindow', expressID };
  }
}

/**
 * Extract standardized metrics for a railing element
 * IFC Quantity Sets: Qto_RailingBaseQuantities (Length) - may not be available
 */
export async function extractStandardizedRailingMetrics(
  ifcAPI: any,
  ifcManager: any,
  modelID: number,
  expressID: number,
  baseProps?: any,
  props?: any
): Promise<StandardizedRailingMetrics> {
  try {
    // Performance optimization: Use provided props if available, otherwise fetch
    const finalBaseProps = baseProps ?? await ifcAPI.getProperties(modelID, expressID, false, false);
    const finalProps = props ?? await ifcAPI.getProperties(modelID, expressID, true, false);
    
    const identity = await extractElementIdentity(ifcAPI, ifcManager, modelID, expressID, 'IfcRailing', finalBaseProps, finalProps);
    
    const metrics: StandardizedRailingMetrics = { ...identity, ifcClass: 'IfcRailing', expressID };
    
    // Performance optimization: Parallelize quantity set extractions
    const [qLength, baseQ] = await Promise.all([
      extractQuantityValue(ifcManager, modelID, finalProps, 'Length', 'Qto_RailingBaseQuantities'),
      extractBaseQuantitiesFromPsets(ifcManager, modelID, finalProps.psets)
    ]);
    
    // Combine quantity set and Pset values (quantity sets take precedence)
    const lengthIfc = qLength ?? baseQ?.length ?? undefined;
    
    if (lengthIfc != null) {
      metrics.lengthFt = lengthToFeet(lengthIfc);
      metrics.lengthDisplay = lengthToFeetInches(metrics.lengthFt);
    }
    
    // Dev logging
    if (process.env.NODE_ENV === 'development') {
      const qsetNames = props.qsets ? Object.keys(props.qsets) : [];
      const psetNames = props.psets ? Object.keys(props.psets).map((key: string) => {
        const pset = props.psets[key];
        return pset?.Name?.value || pset?.Name || key;
      }) : [];
      
      logger.log('[IFC] Railing metrics summary', {
        expressID: identity.expressID,
        name: identity.name,
        elementCategory: identity.elementCategory,
        qsetNames,
        psetNames,
        baseQuantitiesFound: !!baseQ,
        baseQuantitiesSource: baseQ?.sourceName,
        lengthIfc,
        lengthDisplay: metrics.lengthDisplay,
      });
    }
    
    return metrics;
  } catch (err) {
    logger.error('Error extracting standardized railing metrics:', err);
    return { ifcClass: 'IfcRailing', expressID };
  }
}

/**
 * Extract standardized metrics for a footing/foundation element
 * IFC Quantity Sets: Qto_FootingBaseQuantities (Length, Width, Height, GrossVolume, NetVolume)
 * IFC Property Sets: Pset_FootingCommon (PredefinedType)
 */
export async function extractStandardizedFootingMetrics(
  ifcAPI: any,
  ifcManager: any,
  modelID: number,
  expressID: number,
  baseProps?: any,
  props?: any
): Promise<StandardizedFootingMetrics> {
  try {
    // Performance optimization: Use provided props if available, otherwise fetch
    const finalBaseProps = baseProps ?? await ifcAPI.getProperties(modelID, expressID, false, false);
    const finalProps = props ?? await ifcAPI.getProperties(modelID, expressID, true, false);
    
    const identity = await extractElementIdentity(ifcAPI, ifcManager, modelID, expressID, 'IfcFooting', finalBaseProps, finalProps);
    
    const metrics: StandardizedFootingMetrics = { ...identity, ifcClass: 'IfcFooting', expressID };
    
    // Performance optimization: Parallelize quantity set extractions
    const [qLength, qWidth, qHeight, qGrossVolume, qNetVolume, baseQ] = await Promise.all([
      extractQuantityValue(ifcManager, modelID, finalProps, 'Length', 'Qto_FootingBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'Width', 'Qto_FootingBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'Height', 'Qto_FootingBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'GrossVolume', 'Qto_FootingBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'NetVolume', 'Qto_FootingBaseQuantities'),
      extractBaseQuantitiesFromPsets(ifcManager, modelID, finalProps.psets)
    ]);
    
    // Combine quantity set and Pset values (quantity sets take precedence)
    const lengthIfc = qLength ?? baseQ?.length ?? undefined;
    const widthIfc = qWidth ?? baseQ?.width ?? undefined;
    const thicknessIfc = qHeight ?? baseQ?.height ?? baseQ?.thickness ?? undefined;
    const volumeIfc = qGrossVolume ?? qNetVolume ?? baseQ?.grossVolume ?? baseQ?.netVolume ?? baseQ?.volume ?? undefined;
    
    // Length
    if (lengthIfc != null) {
      metrics.lengthFt = lengthToFeet(lengthIfc);
      metrics.lengthDisplay = lengthToFeetInches(metrics.lengthFt);
    }
    
    // Width
    if (widthIfc != null) {
      metrics.widthFt = lengthToFeet(widthIfc);
      metrics.widthDisplay = lengthToFeetInches(metrics.widthFt);
    }
    
    // Thickness (from Height in Qto_FootingBaseQuantities or BaseQuantities Pset)
    if (thicknessIfc != null) {
      metrics.thicknessFt = lengthToFeet(thicknessIfc);
      metrics.thicknessDisplay = lengthToFeetInches(metrics.thicknessFt);
    }
    
    // Volume (prefer GrossVolume, fallback to NetVolume)
    if (volumeIfc != null) {
      metrics.volumeCuFt = volumeToCubicFeet(volumeIfc);
      metrics.volumeCuYd = cubicFeetToCubicYards(metrics.volumeCuFt);
      metrics.volumeDisplay = formatCubicYards(metrics.volumeCuYd);
    }
    
    // Determine footing type from name and predefined type
    const nameLower = (metrics.name || '').toLowerCase();
    if (nameLower.includes('strip') || nameLower.includes('continuous')) {
      metrics.footingType = 'continuous';
    } else if (nameLower.includes('pad') || nameLower.includes('footing')) {
      metrics.footingType = 'pad';
    } else if (nameLower.includes('pier')) {
      metrics.footingType = 'pier';
    } else {
      metrics.footingType = 'other';
    }
    
    // Dev logging
    if (process.env.NODE_ENV === 'development') {
      const qsetNames = props.qsets ? Object.keys(props.qsets) : [];
      const psetNames = props.psets ? Object.keys(props.psets).map((key: string) => {
        const pset = props.psets[key];
        return pset?.Name?.value || pset?.Name || key;
      }) : [];
      
      logger.log('[IFC] Footing metrics summary', {
        expressID: identity.expressID,
        name: identity.name,
        elementCategory: identity.elementCategory,
        qsetNames,
        psetNames,
        baseQuantitiesFound: !!baseQ,
        baseQuantitiesSource: baseQ?.sourceName,
        lengthIfc,
        widthIfc,
        thicknessIfc,
        volumeIfc,
        lengthDisplay: metrics.lengthDisplay,
        widthDisplay: metrics.widthDisplay,
        thicknessDisplay: metrics.thicknessDisplay,
        volumeDisplay: metrics.volumeDisplay,
        footingType: metrics.footingType,
      });
    }
    
    return metrics;
  } catch (err) {
    logger.error('Error extracting standardized footing metrics:', err);
    return { ifcClass: 'IfcFooting', expressID };
  }
}

/**
 * Extract standardized metrics for a column/post element
 * IFC Quantity Sets: Qto_ColumnBaseQuantities (Height, CrossSectionArea)
 * IFC Property Sets: Pset_ColumnCommon, custom identity Psets for size
 */
export async function extractStandardizedColumnMetrics(
  ifcAPI: any,
  ifcManager: any,
  modelID: number,
  expressID: number,
  baseProps?: any,
  props?: any
): Promise<StandardizedColumnMetrics> {
  try {
    // Performance optimization: Use provided props if available, otherwise fetch
    const finalBaseProps = baseProps ?? await ifcAPI.getProperties(modelID, expressID, false, false);
    const finalProps = props ?? await ifcAPI.getProperties(modelID, expressID, true, false);
    
    const identity = await extractElementIdentity(ifcAPI, ifcManager, modelID, expressID, 'IfcColumn', finalBaseProps, finalProps);
    
    const metrics: StandardizedColumnMetrics = { ...identity, ifcClass: 'IfcColumn', expressID };
    
    // Performance optimization: Parallelize quantity set extractions
    const [qHeight, qLength, qCrossSectionArea, baseQ] = await Promise.all([
      extractQuantityValue(ifcManager, modelID, finalProps, 'Height', 'Qto_ColumnBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'Length', 'Qto_ColumnBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'CrossSectionArea', 'Qto_ColumnBaseQuantities'),
      extractBaseQuantitiesFromPsets(ifcManager, modelID, finalProps.psets)
    ]);
    
    // Combine quantity set and Pset values (quantity sets take precedence)
    const lengthIfc = qHeight ?? qLength ?? baseQ?.height ?? baseQ?.length ?? undefined;
    const widthIfc = baseQ?.width ?? undefined;
    const depthIfc = baseQ?.depth ?? undefined;
    // Note: CrossSectionArea is typically not in BaseQuantities, but we can check
    const crossSectionAreaIfc = qCrossSectionArea ?? undefined;
    
    // Length/Height (prefer Height, fallback to Length)
    if (lengthIfc != null) {
      metrics.lengthFt = lengthToFeet(lengthIfc);
      metrics.lengthDisplay = lengthToFeetInches(metrics.lengthFt);
    }
    
    // Width / Depth
    const widthFt = widthIfc != null ? lengthToFeet(widthIfc) : undefined;
    const depthFt = depthIfc != null ? lengthToFeet(depthIfc) : undefined;
    if (widthFt) {
      metrics.widthFt = widthFt;
      metrics.widthDisplay = formatInchesFraction(widthFt);
    }
    if (depthFt) {
      metrics.depthFt = depthFt;
      metrics.depthDisplay = formatInchesFraction(depthFt);
    }
    
    // Cross section area (convert from m² to sq in)
    if (crossSectionAreaIfc != null) {
      const areaM2 = crossSectionAreaIfc;
      const areaSqFt = areaM2 * 10.764; // m² to ft²
      metrics.crossSectionAreaSqIn = areaSqFt * 144; // ft² to in²
      metrics.crossSectionAreaDisplay = `${metrics.crossSectionAreaSqIn.toFixed(2)} sq in`;
    }
    
    let sizeFromAdapter: string | undefined;
    
    // Extract size label from type name or Rehome adapter
    const possibleTexts = [metrics.typeName, metrics.name];
    for (const text of possibleTexts) {
      if (!text) continue;
      const parsed = parseSizeTextToFeet(text);
      if (parsed) {
        if (!metrics.widthFt) {
          metrics.widthFt = parsed.widthFt;
          metrics.widthDisplay = formatInchesFraction(parsed.widthFt);
        }
        if (!metrics.depthFt) {
          metrics.depthFt = parsed.depthFt;
          metrics.depthDisplay = formatInchesFraction(parsed.depthFt);
        }
        const widthIn = metrics.widthFt ? formatInchesFraction(metrics.widthFt) : undefined;
        const depthIn = metrics.depthFt ? formatInchesFraction(metrics.depthFt) : undefined;
        if (widthIn && depthIn) {
          metrics.sizeDisplay = `(${widthIn} x ${depthIn})`;
        }
        break;
      }
    }
    
    // Look for Rehome Column Adapter for explicit size label
    if (props?.psets) {
      for (const pset of Object.values(props.psets) as any[]) {
        if (!pset || !pset.HasProperties) continue;
        const nameRaw = pset.Name?.value || pset.Name || '';
        const nameLower = String(nameRaw).toLowerCase();
        if (nameLower === 'pset_rehome_columnadapter' || nameLower === 'rehome_columnadapter') {
          for (let prop of pset.HasProperties || []) {
            prop = await resolvePropertyReference(ifcManager, modelID, prop);
            if (!prop) continue;
            const propName = extractPropertyName(prop).toLowerCase();
            if (
              propName === 'columnsizelabel' ||
              propName === 'columnsize' ||
              propName === 'columnlabel' ||
              propName === 'columnlabeltext' ||
              propName === 'sizelabel'
            ) {
              const value = extractPropertyValue(prop);
              if (value) {
                sizeFromAdapter = String(value).trim();
              }
            }
            if (propName === 'columnwidth' && !metrics.widthFt) {
              const val = extractPropertyValue(prop);
              if (typeof val === 'number' && val > 0) {
                const ft = lengthToFeet(val);
                metrics.widthFt = ft;
                metrics.widthDisplay = formatInchesFraction(ft);
              }
            }
            if (propName === 'columndepth' && !metrics.depthFt) {
              const val = extractPropertyValue(prop);
              if (typeof val === 'number' && val > 0) {
                const ft = lengthToFeet(val);
                metrics.depthFt = ft;
                metrics.depthDisplay = formatInchesFraction(ft);
              }
            }
          }
        }
      }
    }
    
    if (sizeFromAdapter) {
      const formatted = sizeFromAdapter.startsWith('(') ? sizeFromAdapter : `(${sizeFromAdapter})`;
      metrics.sizeDisplay = formatted;
      metrics.sizeLabel = sizeFromAdapter;
    } else if (!metrics.sizeDisplay && metrics.widthFt && metrics.depthFt) {
      const widthIn = formatInchesFraction(metrics.widthFt);
      const depthIn = formatInchesFraction(metrics.depthFt);
      metrics.sizeDisplay = `(${widthIn} x ${depthIn})`;
      metrics.sizeLabel = `${widthIn} x ${depthIn}`;
    } else if (!metrics.sizeDisplay && metrics.sizeLabel) {
      const normalized = metrics.sizeLabel.trim();
      metrics.sizeDisplay = normalized ? `(${normalized})` : undefined;
    }
    if (!metrics.sizeLabel && metrics.sizeDisplay) {
      metrics.sizeLabel = metrics.sizeDisplay.replace(/[()]/g, '').trim();
    }
    
    // Dev logging
    if (process.env.NODE_ENV === 'development') {
      const qsetNames = props.qsets ? Object.keys(props.qsets) : [];
      const psetNames = props.psets ? Object.keys(props.psets).map((key: string) => {
        const pset = props.psets[key];
        return pset?.Name?.value || pset?.Name || key;
      }) : [];
      
      logger.log('[IFC] Column metrics summary', {
        expressID: identity.expressID,
        name: identity.name,
        elementCategory: identity.elementCategory,
        qsetNames,
        psetNames,
        baseQuantitiesFound: !!baseQ,
        baseQuantitiesSource: baseQ?.sourceName,
        lengthIfc,
        widthIfc,
        depthIfc,
        crossSectionAreaIfc,
        lengthDisplay: metrics.lengthDisplay,
        widthDisplay: metrics.widthDisplay,
        depthDisplay: metrics.depthDisplay,
        crossSectionAreaDisplay: metrics.crossSectionAreaDisplay,
        sizeLabel: metrics.sizeLabel,
        sizeDisplay: metrics.sizeDisplay,
      });
    }
    
    return metrics;
  } catch (err) {
    logger.error('Error extracting standardized column metrics:', err);
    return { ifcClass: 'IfcColumn', expressID };
  }
}

/**
 * Extract standardized metrics for a beam/girder/joist element
 * IFC Quantity Sets: Qto_BeamBaseQuantities (Length, CrossSectionArea)
 * IFC Property Sets: Pset_BeamCommon (PitchAngle)
 */
export async function extractStandardizedBeamMetrics(
  ifcAPI: any,
  ifcManager: any,
  modelID: number,
  expressID: number,
  baseProps?: any,
  props?: any
): Promise<StandardizedBeamMetrics> {
  try {
    // Performance optimization: Use provided props if available, otherwise fetch
    const finalBaseProps = baseProps ?? await ifcAPI.getProperties(modelID, expressID, false, false);
    const finalProps = props ?? await ifcAPI.getProperties(modelID, expressID, true, false);
    
    const identity = await extractElementIdentity(ifcAPI, ifcManager, modelID, expressID, 'IfcBeam', finalBaseProps, finalProps);
    
    const metrics: StandardizedBeamMetrics = { ...identity, ifcClass: 'IfcBeam', expressID };
    
    // Performance optimization: Parallelize quantity set extractions
    const [qLength, qCrossSectionArea, baseQ] = await Promise.all([
      extractQuantityValue(ifcManager, modelID, finalProps, 'Length', 'Qto_BeamBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'CrossSectionArea', 'Qto_BeamBaseQuantities'),
      extractBaseQuantitiesFromPsets(ifcManager, modelID, finalProps.psets)
    ]);
    
    // Combine quantity set and Pset values (quantity sets take precedence)
    const lengthIfc = qLength ?? baseQ?.length ?? undefined;
    const widthIfc = baseQ?.width ?? undefined;
    const heightIfc = baseQ?.height ?? undefined;
    // Note: CrossSectionArea is typically not in BaseQuantities, but we can check
    const crossSectionAreaIfc = qCrossSectionArea ?? undefined;
    
    // Length
    if (lengthIfc != null) {
      metrics.lengthFt = lengthToFeet(lengthIfc);
      metrics.lengthDisplay = lengthToFeetInches(metrics.lengthFt);
    }
    
    // Cross section area (convert from m² to sq in)
    if (crossSectionAreaIfc != null) {
      const areaM2 = crossSectionAreaIfc;
      const areaSqFt = areaM2 * 10.764; // m² to ft²
      metrics.crossSectionAreaSqIn = areaSqFt * 144; // ft² to in²
      metrics.crossSectionAreaDisplay = `${metrics.crossSectionAreaSqIn.toFixed(2)} sq in`;
    }
    
    let sizeFromAdapter: string | undefined;

    // Extract pitch angle and custom size from property sets
    if (props?.psets) {
      for (const pset of Object.values(props.psets) as any[]) {
        if (!pset || !pset.HasProperties) continue;
        const psetNameRaw = pset.Name?.value || pset.Name || '';
        const psetName = psetNameRaw ? String(psetNameRaw).toLowerCase() : '';
        if (psetName.includes('beam') && psetName.includes('common')) {
          for (let prop of pset.HasProperties || []) {
            prop = await resolvePropertyReference(ifcManager, modelID, prop);
            if (!prop) continue;
            const propName = extractPropertyName(prop).toLowerCase();
            if (propName.includes('pitch') || propName.includes('angle')) {
              const propValue = extractPropertyValue(prop);
              if (typeof propValue === 'number' && propValue > 0 && propValue < 90) {
                metrics.pitchAngleDeg = propValue;
              }
            }
          }
        } else if (psetName === 'pset_rehome_beamadapter' || psetName === 'rehome_beamadapter') {
          for (let prop of pset.HasProperties || []) {
            prop = await resolvePropertyReference(ifcManager, modelID, prop);
            if (!prop) continue;
            const propName = extractPropertyName(prop).toLowerCase();
            if (propName === 'beamsizelabel' || propName === 'sizelabel') {
              const propValue = extractPropertyValue(prop);
              if (propValue) {
                sizeFromAdapter = String(propValue).trim();
              }
            }
          }
        }
      }
    }

    // Derive size display
    const widthFt = widthIfc != null ? lengthToFeet(widthIfc) : undefined;
    const heightFt = heightIfc != null ? lengthToFeet(heightIfc) : undefined;
    const widthInches = widthFt ? formatInchesFraction(widthFt) : undefined;
    const heightInches = heightFt ? formatInchesFraction(heightFt) : undefined;

    if (sizeFromAdapter) {
      const normalized = sizeFromAdapter.startsWith('(') ? sizeFromAdapter : `(${sizeFromAdapter})`;
      metrics.sizeDisplay = normalized;
    } else if (widthInches && heightInches) {
      metrics.sizeDisplay = `(${widthInches} x ${heightInches})`;
    }
    // Fallback to sizeLabel if nothing else
    if (!metrics.sizeDisplay && metrics.sizeLabel) {
      const label = metrics.sizeLabel.trim();
      metrics.sizeDisplay = label ? `(${label.replace(/^[()]/, '').replace(/[()]+$/,'')})` : undefined;
    }
    
    // Extract size label from type name
    if (metrics.typeName) {
      // Try to extract size pattern like "4x6", "6x12", "LVL 1-3/4x11-7/8", etc.
      const sizeMatch = metrics.typeName.match(/(\d+(?:-\d+\/\d+)?)\s*[xX×]\s*(\d+(?:-\d+\/\d+)?)/);
      if (sizeMatch) {
        metrics.sizeLabel = `${sizeMatch[1]}x${sizeMatch[2]}`;
      } else if (metrics.typeName.includes('LVL') || metrics.typeName.includes('lvl')) {
        // Extract LVL size
        const lvlMatch = metrics.typeName.match(/LVL\s*(\d+(?:-\d+\/\d+)?)\s*[xX×]\s*(\d+(?:-\d+\/\d+)?)/i);
        if (lvlMatch) {
          metrics.sizeLabel = `LVL ${lvlMatch[1]}x${lvlMatch[2]}`;
        } else {
          metrics.sizeLabel = metrics.typeName;
        }
      } else {
        // Fallback: use type name as-is
        metrics.sizeLabel = metrics.typeName;
      }
    }
    
    // Dev logging
    if (process.env.NODE_ENV === 'development') {
      const qsetNames = props.qsets ? Object.keys(props.qsets) : [];
      const psetNames = props.psets ? Object.keys(props.psets).map((key: string) => {
        const pset = props.psets[key];
        return pset?.Name?.value || pset?.Name || key;
      }) : [];
      
      logger.log('[IFC] Beam metrics summary', {
        expressID: identity.expressID,
        name: identity.name,
        elementCategory: identity.elementCategory,
        qsetNames,
        psetNames,
        baseQuantitiesFound: !!baseQ,
        baseQuantitiesSource: baseQ?.sourceName,
        lengthIfc,
        crossSectionAreaIfc,
        lengthDisplay: metrics.lengthDisplay,
        crossSectionAreaDisplay: metrics.crossSectionAreaDisplay,
        sizeLabel: metrics.sizeLabel,
        pitchAngleDeg: metrics.pitchAngleDeg,
      });
    }
    
    return metrics;
  } catch (err) {
    logger.error('Error extracting standardized beam metrics:', err);
    return { ifcClass: 'IfcBeam', expressID };
  }
}

/**
 * Extract standardized metrics for a mass/massing element
 * IFC Quantity Sets: Qto_BuildingElementProxyBaseQuantities (GrossVolume, NetVolume, GrossArea, NetArea)
 * IFC Property Sets: Pset_BuildingElementProxyCommon
 */
export async function extractStandardizedMassMetrics(
  ifcAPI: any,
  ifcManager: any,
  modelID: number,
  expressID: number,
  baseProps?: any,
  props?: any
): Promise<StandardizedMassMetrics> {
  try {
    // Performance optimization: Use provided props if available, otherwise fetch
    const finalBaseProps = baseProps ?? await ifcAPI.getProperties(modelID, expressID, false, false);
    const finalProps = props ?? await ifcAPI.getProperties(modelID, expressID, true, false);
    
    const identity = await extractElementIdentity(ifcAPI, ifcManager, modelID, expressID, 'IfcBuildingElementProxy', finalBaseProps, finalProps);
    
    const metrics: StandardizedMassMetrics = { ...identity, ifcClass: 'IfcBuildingElementProxy', expressID };
    
    // Performance optimization: Parallelize quantity set extractions
    const [qGrossVolume, qNetVolume, qGrossArea, qNetArea, baseQ] = await Promise.all([
      extractQuantityValue(ifcManager, modelID, finalProps, 'GrossVolume', 'Qto_BuildingElementProxyBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'NetVolume', 'Qto_BuildingElementProxyBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'GrossArea', 'Qto_BuildingElementProxyBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'NetArea', 'Qto_BuildingElementProxyBaseQuantities'),
      extractBaseQuantitiesFromPsets(ifcManager, modelID, finalProps.psets)
    ]);
    
    // Combine quantity set and Pset values (quantity sets take precedence)
    const volumeIfc = qGrossVolume ?? qNetVolume ?? baseQ?.grossVolume ?? baseQ?.netVolume ?? baseQ?.volume ?? undefined;
    const grossAreaIfc = qGrossArea ?? qNetArea ?? baseQ?.grossArea ?? baseQ?.netArea ?? undefined;
    const footprintAreaIfc = baseQ?.projectedArea ?? undefined;
    
    // Volume (prefer GrossVolume, fallback to NetVolume)
    if (volumeIfc != null) {
      const volumeCuFt = volumeToCubicFeet(volumeIfc);
      metrics.volumeCuFt = volumeCuFt;
      metrics.volumeCuYd = cubicFeetToCubicYards(volumeCuFt);
      metrics.volumeDisplay = formatCubicYards(metrics.volumeCuYd);
    }
    
    // Gross area (external surface area)
    if (grossAreaIfc != null) {
      metrics.grossAreaSqFt = areaToSquareFeet(grossAreaIfc);
      metrics.grossAreaDisplay = `${formatSquareFeet(metrics.grossAreaSqFt)} SF`;
    }
    
    // Footprint area (from ProjectedArea in BaseQuantities)
    if (footprintAreaIfc != null) {
      metrics.footprintAreaSqFt = areaToSquareFeet(footprintAreaIfc);
      metrics.footprintAreaDisplay = `${formatSquareFeet(metrics.footprintAreaSqFt)} SF`;
    }
    
    // Dev logging
    if (process.env.NODE_ENV === 'development') {
      const qsetNames = props.qsets ? Object.keys(props.qsets) : [];
      const psetNames = props.psets ? Object.keys(props.psets).map((key: string) => {
        const pset = props.psets[key];
        return pset?.Name?.value || pset?.Name || key;
      }) : [];
      
      logger.log('[IFC] Mass metrics summary', {
        expressID: identity.expressID,
        name: identity.name,
        elementCategory: identity.elementCategory,
        qsetNames,
        psetNames,
        baseQuantitiesFound: !!baseQ,
        baseQuantitiesSource: baseQ?.sourceName,
        volumeIfc,
        grossAreaIfc,
        footprintAreaIfc,
        volumeDisplay: metrics.volumeDisplay,
        grossAreaDisplay: metrics.grossAreaDisplay,
        footprintAreaDisplay: metrics.footprintAreaDisplay,
      });
    }
    
    return metrics;
  } catch (err) {
    logger.error('Error extracting standardized mass metrics:', err);
    return { ifcClass: 'IfcBuildingElementProxy', expressID };
  }
}

/**
 * Extract standardized metrics for a stair element
 * IFC Quantity Sets: Qto_StairBaseQuantities or Qto_StairFlightBaseQuantities
 * IFC Property Sets: Pset_StairCommon
 */
export async function extractStandardizedStairMetrics(
  ifcAPI: any,
  ifcManager: any,
  modelID: number,
  expressID: number,
  baseProps?: any,
  props?: any
): Promise<StandardizedStairMetrics> {
  try {
    // Performance optimization: Use provided props if available, otherwise fetch
    const finalBaseProps = baseProps ?? await ifcAPI.getProperties(modelID, expressID, false, false);
    const finalProps = props ?? await ifcAPI.getProperties(modelID, expressID, true, false);
    
    const typeNumber = finalBaseProps?.type;
    let ifcClass: string = 'IfcStair';
    
    if (typeNumber) {
      try {
        const typeName = ifcManager.ifcAPI?.GetNameFromTypeCode?.(typeNumber);
        if (typeName && !typeName.includes('unknown')) {
          let normalized = typeName.toUpperCase();
          if (normalized.startsWith('IFC')) {
            normalized = normalized.substring(3);
          }
          if (normalized === 'STAIRFLIGHT') {
            ifcClass = 'IfcStairFlight';
          } else if (normalized === 'STAIR') {
            ifcClass = 'IfcStair';
          }
        }
      } catch (err) {
        // Fallback: try typesMap
        if (ifcManager.typesMap && ifcManager.typesMap[typeNumber]) {
          const typeName = ifcManager.typesMap[typeNumber];
          let normalized = typeName.toUpperCase();
          if (normalized.startsWith('IFC')) {
            normalized = normalized.substring(3);
          }
          if (normalized === 'STAIRFLIGHT') {
            ifcClass = 'IfcStairFlight';
          } else if (normalized === 'STAIR') {
            ifcClass = 'IfcStair';
          }
        }
      }
    }
    
    const identity = await extractElementIdentity(ifcAPI, ifcManager, modelID, expressID, ifcClass, finalBaseProps, finalProps);
    
    const metrics: StandardizedStairMetrics = { ...identity, ifcClass, expressID };
    
    // Performance optimization: Parallelize quantity set extractions
    // Try Qto_StairFlightBaseQuantities first (for IfcStairFlight)
    const [
      numberOfRisersFlight,
      numberOfTreadsFlight,
      riserHeightFlight,
      treadLengthFlight,
      widthFlight,
      lengthFlight,
      heightFlight,
      riseFlight
    ] = await Promise.all([
      extractQuantityValue(ifcManager, modelID, finalProps, 'NumberOfRisers', 'Qto_StairFlightBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'NumberOfTreads', 'Qto_StairFlightBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'RiserHeight', 'Qto_StairFlightBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'TreadLength', 'Qto_StairFlightBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'Width', 'Qto_StairFlightBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'Length', 'Qto_StairFlightBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'Height', 'Qto_StairFlightBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'Rise', 'Qto_StairFlightBaseQuantities')
    ]);
    
    let numberOfRisers = numberOfRisersFlight;
    let numberOfTreads = numberOfTreadsFlight;
    let riserHeight = riserHeightFlight;
    let treadLength = treadLengthFlight;
    // Fallback: try TreadDepth if TreadLength not found (some models use different property names)
    if (treadLength === null) {
      treadLength = await extractQuantityValue(ifcManager, modelID, finalProps, 'TreadDepth', 'Qto_StairFlightBaseQuantities');
    }
    let width = widthFlight;
    let length = lengthFlight;
    let height = heightFlight;
    let rise = riseFlight;
    
    // If not found, try Qto_StairBaseQuantities (for IfcStair) - parallelize these too
    if (numberOfRisers === null || numberOfTreads === null || treadLength === null || 
        width === null || length === null || height === null || rise === null) {
      const [
        numberOfRisersStair,
        numberOfTreadsStair,
        treadLengthStair,
        widthStair,
        lengthStair,
        heightStair,
        riseStair
      ] = await Promise.all([
        numberOfRisers === null ? extractQuantityValue(ifcManager, modelID, finalProps, 'NumberOfRisers', 'Qto_StairBaseQuantities') : Promise.resolve(null),
        numberOfTreads === null ? extractQuantityValue(ifcManager, modelID, finalProps, 'NumberOfTreads', 'Qto_StairBaseQuantities') : Promise.resolve(null),
        treadLength === null ? extractQuantityValue(ifcManager, modelID, finalProps, 'TreadLength', 'Qto_StairBaseQuantities') : Promise.resolve(null),
        width === null ? extractQuantityValue(ifcManager, modelID, finalProps, 'Width', 'Qto_StairBaseQuantities') : Promise.resolve(null),
        length === null ? extractQuantityValue(ifcManager, modelID, finalProps, 'Length', 'Qto_StairBaseQuantities') : Promise.resolve(null),
        height === null ? extractQuantityValue(ifcManager, modelID, finalProps, 'Height', 'Qto_StairBaseQuantities') : Promise.resolve(null),
        rise === null ? extractQuantityValue(ifcManager, modelID, finalProps, 'Rise', 'Qto_StairBaseQuantities') : Promise.resolve(null)
      ]);
      
      numberOfRisers = numberOfRisers ?? numberOfRisersStair;
      numberOfTreads = numberOfTreads ?? numberOfTreadsStair;
      width = width ?? widthStair;
      length = length ?? lengthStair;
      height = height ?? heightStair;
      rise = rise ?? riseStair;
      
      if (treadLength === null) {
        treadLength = treadLengthStair;
        // Fallback: try TreadDepth if TreadLength not found
        if (treadLength === null) {
          treadLength = await extractQuantityValue(ifcManager, modelID, finalProps, 'TreadDepth', 'Qto_StairBaseQuantities');
        }
      }
    }
    
    // Then try BaseQuantities Pset as fallback / supplement (can run in parallel with property set extractions)
    const baseQ = await extractBaseQuantitiesFromPsets(ifcManager, modelID, finalProps.psets);
    
    // Performance optimization: Parallelize property set extractions
    // Also try property sets for NumberOfRisers and NumberOfTreads (if not found in quantity sets)
    const propertyExtractions: Promise<any>[] = [];
    
    if (numberOfRisers === null) {
      propertyExtractions.push(
        extractPropertyValueFromPsets(ifcManager, modelID, finalProps, 'NumberOfRisers', 'Pset_StairCommon')
          .then(val => { if (val !== null) numberOfRisers = val; return val; })
          .then(val => val === null ? extractPropertyValueFromPsets(ifcManager, modelID, finalProps, 'NumberOfRisers', 'Pset_Rehome_StairAdapter') : Promise.resolve(null))
          .then(val => { if (val !== null) numberOfRisers = val; return val; })
          .then(val => val === null ? extractPropertyValueFromPsets(ifcManager, modelID, finalProps, 'NumberOfRisers') : Promise.resolve(null))
          .then(val => { if (val !== null) numberOfRisers = val; })
      );
    }
    
    if (numberOfTreads === null) {
      propertyExtractions.push(
        extractPropertyValueFromPsets(ifcManager, modelID, finalProps, 'NumberOfTreads', 'Pset_StairCommon')
          .then(val => { if (val !== null) numberOfTreads = val; return val; })
          .then(val => val === null ? extractPropertyValueFromPsets(ifcManager, modelID, finalProps, 'NumberOfTreads', 'Pset_Rehome_StairAdapter') : Promise.resolve(null))
          .then(val => { if (val !== null) numberOfTreads = val; return val; })
          .then(val => val === null ? extractPropertyValueFromPsets(ifcManager, modelID, finalProps, 'NumberOfTreads') : Promise.resolve(null))
          .then(val => { if (val !== null) numberOfTreads = val; })
      );
    }
    
    // Riser height - also try property sets if not found in quantity sets
    if (riserHeight === null) {
      propertyExtractions.push(
        extractPropertyValueFromPsets(ifcManager, modelID, finalProps, 'RiserHeight', 'Pset_StairCommon')
          .then(val => { if (val !== null) riserHeight = val; return val; })
          .then(val => val === null ? extractPropertyValueFromPsets(ifcManager, modelID, finalProps, 'RiserHeight', 'Pset_Rehome_StairAdapter') : Promise.resolve(null))
          .then(val => { if (val !== null) riserHeight = val; return val; })
          .then(val => val === null ? extractPropertyValueFromPsets(ifcManager, modelID, finalProps, 'RiserHeight') : Promise.resolve(null))
          .then(val => { if (val !== null) riserHeight = val; })
      );
    }
    
    // Wait for all property extractions to complete
    if (propertyExtractions.length > 0) {
      await Promise.all(propertyExtractions);
    }
    
    // Combine quantity set and Pset values (quantity sets take precedence)
    // Prefer "Rise" over "Height" for stair flights as it's more accurate
    const widthIfc = width ?? baseQ?.width ?? undefined;
    const lengthIfc = length ?? baseQ?.length ?? undefined;
    const heightIfc = rise ?? height ?? baseQ?.height ?? undefined; // Prefer Rise over Height
    
    // Number of risers
    if (numberOfRisers !== null) {
      metrics.numberOfRisers = Math.round(numberOfRisers);
    }
    
    // Number of treads
    if (numberOfTreads !== null) {
      metrics.numberOfTreads = Math.round(numberOfTreads);
    }
    
    if (riserHeight !== null) {
      metrics.riserHeightFt = lengthToFeet(riserHeight);
      metrics.riserHeightDisplay = lengthToFeetInches(metrics.riserHeightFt);
    }
    
    // Tread depth
    if (treadLength !== null) {
      metrics.treadDepthFt = lengthToFeet(treadLength);
      metrics.treadDepthDisplay = lengthToFeetInches(metrics.treadDepthFt);
    }
    
    // Stair width
    if (widthIfc != null) {
      metrics.stairWidthFt = lengthToFeet(widthIfc);
      metrics.stairWidthDisplay = lengthToFeetInches(metrics.stairWidthFt);
    }
    
    // Stair run (horizontal length)
    if (lengthIfc != null) {
      metrics.stairRunFt = lengthToFeet(lengthIfc);
      metrics.stairRunDisplay = lengthToFeetInches(metrics.stairRunFt);
    }
    
    // Stair rise (vertical height)
    if (heightIfc != null) {
      metrics.stairRiseFt = lengthToFeet(heightIfc);
      metrics.stairRiseDisplay = lengthToFeetInches(metrics.stairRiseFt);
    }
    
    // Calculate area from width × run if available
    if (metrics.stairWidthFt && metrics.stairRunFt) {
      metrics.areaSqFt = metrics.stairWidthFt * metrics.stairRunFt;
      metrics.areaDisplay = `${formatSquareFeet(metrics.areaSqFt)} SF`;
    }
    
    // Calculate tread depth from run / number of treads (in inches)
    if (metrics.stairRunFt && metrics.numberOfTreads && metrics.numberOfTreads > 0) {
      const treadDepthInFeet = metrics.stairRunFt / metrics.numberOfTreads;
      metrics.treadDepthCalculatedInches = formatInchesFraction(treadDepthInFeet);
    }
    
    // Calculate riser height in inches
    // Priority: 1) Direct riserHeightFt (from extracted RiserHeight), 2) Calculate from rise/risers, 3) Avoid using total height
    let riserHeightInFeetForCheck: number | undefined = undefined;
    
    if (metrics.riserHeightFt) {
      // Use direct riser height value (most accurate)
      riserHeightInFeetForCheck = metrics.riserHeightFt;
      metrics.riserHeightCalculatedInches = formatInchesFraction(metrics.riserHeightFt, 256);
    } else if (metrics.stairRiseFt && metrics.numberOfRisers && metrics.numberOfRisers > 0) {
      // Calculate from total rise divided by number of risers
      riserHeightInFeetForCheck = metrics.stairRiseFt / metrics.numberOfRisers;
      metrics.riserHeightCalculatedInches = formatInchesFraction(riserHeightInFeetForCheck, 256);
    } else if (heightIfc && metrics.numberOfRisers && metrics.numberOfRisers > 0) {
      // Only use heightIfc as last resort - verify it's actually the rise, not total element height
      // This might be incorrect if heightIfc is the total element height rather than just the rise
      const heightInFeet = lengthToFeet(heightIfc);
      // Sanity check: riser height should typically be between 6-8 inches (0.5-0.67 feet)
      riserHeightInFeetForCheck = heightInFeet / metrics.numberOfRisers;
      if (riserHeightInFeetForCheck >= 0.4 && riserHeightInFeetForCheck <= 0.75) {
        // Reasonable riser height range, use it
        metrics.riserHeightCalculatedInches = formatInchesFraction(riserHeightInFeetForCheck, 256);
      } else {
        // If outside reasonable range, don't set it (likely using wrong height value)
        riserHeightInFeetForCheck = undefined;
      }
    }
    
    // Check if riser height exceeds 10 inches and add warning
    if (riserHeightInFeetForCheck !== undefined) {
      const riserHeightInInches = riserHeightInFeetForCheck * 12;
      if (riserHeightInInches > 10) {
        metrics.riserHeightWarning = 'Verify in model';
      }
    }
    
    // Dev logging
    if (process.env.NODE_ENV === 'development') {
      const qsetNames = props.qsets ? Object.keys(props.qsets) : [];
      const psetNames = props.psets ? Object.keys(props.psets).map((key: string) => {
        const pset = props.psets[key];
        return pset?.Name?.value || pset?.Name || key;
      }) : [];
      
      logger.log('[IFC] Stair metrics summary', {
        expressID: identity.expressID,
        name: identity.name,
        elementCategory: identity.elementCategory,
        qsetNames,
        psetNames,
        baseQuantitiesFound: !!baseQ,
        baseQuantitiesSource: baseQ?.sourceName,
        numberOfRisers: metrics.numberOfRisers,
        numberOfTreads: metrics.numberOfTreads,
        riserHeightDisplay: metrics.riserHeightDisplay,
        treadDepthDisplay: metrics.treadDepthDisplay,
        stairWidthDisplay: metrics.stairWidthDisplay,
        stairRunDisplay: metrics.stairRunDisplay,
        stairRiseDisplay: metrics.stairRiseDisplay,
        areaDisplay: metrics.areaDisplay,
      });
    }
    
    return metrics;
  } catch (err) {
    logger.error('Error extracting standardized stair metrics:', err);
    return { ifcClass: 'IfcStair', expressID };
  }
}

/**
 * Extract standardized metrics for a casework/cabinet element
 * IFC Quantity Sets: Qto_FurnitureBaseQuantities (Width, Depth, Height, GrossArea, NetArea, GrossVolume, NetVolume)
 * IFC Property Sets: Pset_FurnitureCommon
 */
export async function extractStandardizedCaseworkMetrics(
  ifcAPI: any,
  ifcManager: any,
  modelID: number,
  expressID: number,
  baseProps?: any,
  props?: any
): Promise<StandardizedCaseworkMetrics> {
  try {
    // Performance optimization: Use provided props if available, otherwise fetch
    const finalBaseProps = baseProps ?? await ifcAPI.getProperties(modelID, expressID, false, false);
    const finalProps = props ?? await ifcAPI.getProperties(modelID, expressID, true, false);
    
    const identity = await extractElementIdentity(ifcAPI, ifcManager, modelID, expressID, 'IfcFurniture', finalBaseProps, finalProps);
    
    const metrics: StandardizedCaseworkMetrics = { ...identity, ifcClass: 'IfcFurniture', expressID };
    
    // Performance optimization: Parallelize quantity set extractions
    const [qWidth, qDepth, qHeight, qGrossArea, qNetArea, qGrossVolume, qNetVolume, baseQ] = await Promise.all([
      extractQuantityValue(ifcManager, modelID, finalProps, 'Width', 'Qto_FurnitureBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'Depth', 'Qto_FurnitureBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'Height', 'Qto_FurnitureBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'GrossArea', 'Qto_FurnitureBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'NetArea', 'Qto_FurnitureBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'GrossVolume', 'Qto_FurnitureBaseQuantities'),
      extractQuantityValue(ifcManager, modelID, finalProps, 'NetVolume', 'Qto_FurnitureBaseQuantities'),
      extractBaseQuantitiesFromPsets(ifcManager, modelID, finalProps.psets)
    ]);
    
    // Combine quantity set and Pset values (quantity sets take precedence)
    const widthIfc = qWidth ?? baseQ?.width ?? undefined;
    const depthIfc = qDepth ?? baseQ?.depth ?? undefined;
    const heightIfc = qHeight ?? baseQ?.height ?? undefined;
    const areaIfc = qGrossArea ?? qNetArea ?? baseQ?.grossArea ?? baseQ?.netArea ?? undefined;
    const volumeIfc = qGrossVolume ?? qNetVolume ?? baseQ?.grossVolume ?? baseQ?.netVolume ?? baseQ?.volume ?? undefined;
    
    // Width
    if (widthIfc != null) {
      metrics.widthFt = lengthToFeet(widthIfc);
      metrics.widthDisplay = lengthToFeetInches(metrics.widthFt);
    }
    
    // Depth
    if (depthIfc != null) {
      metrics.depthFt = lengthToFeet(depthIfc);
      metrics.depthDisplay = lengthToFeetInches(metrics.depthFt);
    }
    
    // Height
    if (heightIfc != null) {
      metrics.heightFt = lengthToFeet(heightIfc);
      metrics.heightDisplay = lengthToFeetInches(metrics.heightFt);
    }
    
    // Area (prefer GrossArea, fallback to NetArea)
    if (areaIfc != null) {
      metrics.areaSqFt = areaToSquareFeet(areaIfc);
      metrics.areaDisplay = `${formatSquareFeet(metrics.areaSqFt)} SF`;
    }
    
    // Volume (prefer GrossVolume, fallback to NetVolume)
    if (volumeIfc != null) {
      metrics.volumeCuFt = volumeToCubicFeet(volumeIfc);
      metrics.volumeCuYd = cubicFeetToCubicYards(metrics.volumeCuFt);
      metrics.volumeDisplay = formatCubicYards(metrics.volumeCuYd);
    }
    
    // Determine casework type from name/type
    const nameLower = (metrics.name || '').toLowerCase();
    const typeLower = (metrics.typeName || '').toLowerCase();
    if (nameLower.includes('base') || typeLower.includes('base')) {
      metrics.caseworkType = 'base';
    } else if (nameLower.includes('wall') || typeLower.includes('wall')) {
      metrics.caseworkType = 'wall';
    } else if (nameLower.includes('tall') || typeLower.includes('tall')) {
      metrics.caseworkType = 'tall';
    } else if (nameLower.includes('vanity') || typeLower.includes('vanity')) {
      metrics.caseworkType = 'vanity';
    } else {
      metrics.caseworkType = 'other';
    }
    
    // Dev logging
    if (process.env.NODE_ENV === 'development') {
      const qsetNames = props.qsets ? Object.keys(props.qsets) : [];
      const psetNames = props.psets ? Object.keys(props.psets).map((key: string) => {
        const pset = props.psets[key];
        return pset?.Name?.value || pset?.Name || key;
      }) : [];
      
      logger.log('[IFC] Casework metrics summary', {
        expressID: identity.expressID,
        name: identity.name,
        elementCategory: identity.elementCategory,
        qsetNames,
        psetNames,
        baseQuantitiesFound: !!baseQ,
        baseQuantitiesSource: baseQ?.sourceName,
        widthIfc,
        depthIfc,
        heightIfc,
        areaIfc,
        volumeIfc,
        widthDisplay: metrics.widthDisplay,
        depthDisplay: metrics.depthDisplay,
        heightDisplay: metrics.heightDisplay,
        areaDisplay: metrics.areaDisplay,
        volumeDisplay: metrics.volumeDisplay,
        caseworkType: metrics.caseworkType,
      });
    }
    
    return metrics;
  } catch (err) {
    logger.error('Error extracting standardized casework metrics:', err);
    return { ifcClass: 'IfcFurniture', expressID };
  }
}

/**
 * Performance optimization: Cache for extracted metrics
 * Key format: `${modelID}-${expressID}`
 * Limits cache size to prevent memory issues
 */
const metricsCache = new Map<string, StandardizedElementMetrics | null>();
const MAX_CACHE_SIZE = 200; // Limit cache to prevent excessive memory usage
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Clear the metrics cache (useful for testing or when model changes)
 */
export function clearMetricsCache(): void {
  metricsCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
}

/**
 * Get cache statistics (for performance monitoring)
 */
export function getCacheStats(): { hits: number; misses: number; size: number; hitRate: number } {
  const total = cacheHits + cacheMisses;
  return {
    hits: cacheHits,
    misses: cacheMisses,
    size: metricsCache.size,
    hitRate: total > 0 ? cacheHits / total : 0,
  };
}

/**
 * Main router function to extract standardized metrics for any element type
 * Detects the IFC class and routes to the appropriate extractor
 * Performance: Results are cached to avoid redundant extractions
 */
export async function extractStandardizedElementMetrics(
  ifcAPI: any,
  ifcManager: any,
  modelID: number,
  expressID: number
): Promise<StandardizedElementMetrics | null> {
  // Performance optimization: Check cache first
  const cacheKey = `${modelID}-${expressID}`;
  if (metricsCache.has(cacheKey)) {
    cacheHits++;
    if (process.env.NODE_ENV === 'development') {
      logger.log('[Cache HIT] Metrics for', expressID, 'retrieved from cache');
    }
    return metricsCache.get(cacheKey) || null;
  }
  
  cacheMisses++;
  
  // Performance monitoring
  const startTime = performance.now();
  
  try {
    // Get base properties to determine IFC class
    const baseProps = await ifcAPI.getProperties(modelID, expressID, false, false);
    
    // Determine IFC class from type number or entity type
    const typeNumber = baseProps?.type;
    let ifcClass: string = 'Unknown';
    
    if (typeNumber) {
      // Use IFC API to get class name from type code
      try {
        const typeName = ifcManager.ifcAPI?.GetNameFromTypeCode?.(typeNumber);
        if (typeName && !typeName.includes('unknown')) {
          // Normalize IFC class name: "ROOF" -> "IfcRoof", "WALL" -> "IfcWall", "WALLSTANDARDCASE" -> "IfcWallStandardCase"
          let normalized = typeName.toUpperCase();
          // Remove "IFC" prefix if present
          if (normalized.startsWith('IFC')) {
            normalized = normalized.substring(3);
          }
          // Convert "ROOF" -> "Roof", "WALL" -> "Wall", "WALLSTANDARDCASE" -> "WallStandardCase"
          // Handle compound names like "WALLSTANDARDCASE" by splitting on word boundaries
          // Common patterns: ROOF, WALL, SLAB, DOOR, WINDOW, WALLSTANDARDCASE, etc.
          const knownMappings: { [key: string]: string } = {
            'ROOF': 'Roof',
            'WALL': 'Wall',
            'SLAB': 'Slab',
            'DOOR': 'Door',
            'WINDOW': 'Window',
            'RAILING': 'Railing',
            'FOOTING': 'Footing',
            'COLUMN': 'Column',
            'BEAM': 'Beam',
            'WALLSTANDARDCASE': 'WallStandardCase',
            'STAIR': 'Stair',
            'STAIRFLIGHT': 'StairFlight',
          };
          
          if (knownMappings[normalized]) {
            ifcClass = `Ifc${knownMappings[normalized]}`;
          } else {
            // Fallback: try to convert "WALLSTANDARDCASE" -> "WallStandardCase"
            // Split on word boundaries (where lowercase would appear, or known word patterns)
            let camelCase = normalized;
            // Try to detect word boundaries in all-caps strings
            if (normalized === 'WALLSTANDARDCASE') {
              camelCase = 'WallStandardCase';
            } else if (normalized === 'STAIRFLIGHT') {
              camelCase = 'StairFlight';
            } else if (normalized.length > 0) {
              // Simple conversion: first letter uppercase, rest lowercase
              camelCase = normalized.charAt(0) + normalized.slice(1).toLowerCase();
            }
            ifcClass = `Ifc${camelCase}`;
          }
        }
      } catch (err) {
        // Fallback: try typesMap
        if (ifcManager.typesMap && ifcManager.typesMap[typeNumber]) {
          const typeName = ifcManager.typesMap[typeNumber];
          // Normalize IFC class name
          let normalized = typeName.toUpperCase();
          if (normalized.startsWith('IFC')) {
            normalized = normalized.substring(3);
          }
          const knownMappings: { [key: string]: string } = {
            'ROOF': 'Roof',
            'WALL': 'Wall',
            'SLAB': 'Slab',
            'DOOR': 'Door',
            'WINDOW': 'Window',
            'RAILING': 'Railing',
            'FOOTING': 'Footing',
            'COLUMN': 'Column',
            'BEAM': 'Beam',
            'WALLSTANDARDCASE': 'WallStandardCase',
            'STAIR': 'Stair',
            'STAIRFLIGHT': 'StairFlight',
          };
          
          if (knownMappings[normalized]) {
            ifcClass = `Ifc${knownMappings[normalized]}`;
          } else {
            let camelCase = normalized;
            if (normalized === 'STAIRFLIGHT') {
              camelCase = 'StairFlight';
            } else {
              camelCase = normalized.charAt(0) + normalized.slice(1).toLowerCase();
            }
            ifcClass = `Ifc${camelCase}`;
          }
        }
      }
    }
    
    // Performance optimization: Fetch props once and pass to extractors
    const props = await ifcAPI.getProperties(modelID, expressID, true, false);
    
    // Get identity first to determine elementCategory (pass baseProps and props to avoid re-fetching)
    const identity = await extractElementIdentity(ifcAPI, ifcManager, modelID, expressID, ifcClass, baseProps, props);
    const elementCategory = identity.elementCategory;
    
    // Route to appropriate extractor based on elementCategory (from REHOME_IFC_CLASS_MAPPING)
    // This follows the exportlayers-ifc-IAI.txt mapping
    let result: StandardizedElementMetrics | null = null;
    
    switch (elementCategory) {
      case 'roof':
        const roofProps = await extractStandardizedRoofProperties(ifcAPI, ifcManager, modelID, expressID, baseProps, props);
        result = { ...identity, ...roofProps } as StandardizedRoofMetrics;
        break;
        
      case 'slab':
      case 'floor':
      case 'deck':
        result = await extractStandardizedSlabMetrics(ifcAPI, ifcManager, modelID, expressID, baseProps, props);
        break;
        
      case 'footing':
        result = await extractStandardizedFootingMetrics(ifcAPI, ifcManager, modelID, expressID, baseProps, props);
        break;
        
      case 'wall':
        result = await extractStandardizedWallMetrics(ifcAPI, ifcManager, modelID, expressID, baseProps, props);
        break;
        
      case 'door':
        result = await extractStandardizedDoorMetrics(ifcAPI, ifcManager, modelID, expressID, baseProps, props);
        break;
        
      case 'window':
        result = await extractStandardizedWindowMetrics(ifcAPI, ifcManager, modelID, expressID, baseProps, props);
        break;
        
      case 'column':
        result = await extractStandardizedColumnMetrics(ifcAPI, ifcManager, modelID, expressID, baseProps, props);
        break;
        
      case 'beam':
        result = await extractStandardizedBeamMetrics(ifcAPI, ifcManager, modelID, expressID, baseProps, props);
        break;
        
      case 'railing':
        result = await extractStandardizedRailingMetrics(ifcAPI, ifcManager, modelID, expressID, baseProps, props);
        break;
        
      case 'stair':
        result = await extractStandardizedStairMetrics(ifcAPI, ifcManager, modelID, expressID, baseProps, props);
        break;
        
      case 'mass':
        result = await extractStandardizedMassMetrics(ifcAPI, ifcManager, modelID, expressID, baseProps, props);
        break;
        
      case 'casework':
        result = await extractStandardizedCaseworkMetrics(ifcAPI, ifcManager, modelID, expressID, baseProps, props);
        break;
        
      case 'other':
      default:
        // For "other" or unknown categories, log warning
        logger.warn(`No extractor available for elementCategory: ${elementCategory}, IFC class: ${ifcClass}`);
        result = null;
        break;
    }
    
    // Cache the result (including null results to avoid re-trying)
    if (metricsCache.size < MAX_CACHE_SIZE) {
      metricsCache.set(cacheKey, result);
    } else if (metricsCache.size >= MAX_CACHE_SIZE && result !== null) {
      // If cache is full, remove oldest entry (simple FIFO - remove first)
      const firstKey = metricsCache.keys().next().value;
      if (firstKey) {
        metricsCache.delete(firstKey);
        metricsCache.set(cacheKey, result);
      }
    }
    
    // Performance logging
    const duration = performance.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      if (duration > 200) {
        logger.warn(`[Performance] Slow extraction: ${duration.toFixed(2)}ms for expressID ${expressID} (${ifcClass})`);
      } else {
        logger.log(`[Performance] Extraction: ${duration.toFixed(2)}ms for expressID ${expressID} (${ifcClass})`);
      }
    }
    
    return result;
  } catch (err) {
    logger.error('Error extracting standardized element metrics:', err);
    // Cache null result on error to avoid retrying failed extractions
    if (metricsCache.size < MAX_CACHE_SIZE) {
      metricsCache.set(cacheKey, null);
    }
    return null;
  }
}

