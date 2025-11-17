/**
 * Unit conversion utilities for IFC properties
 * Always converts to feet/inches for display
 */

/**
 * Convert meters to feet and inches format (e.g., "3' 4"")
 * Always assumes input is in meters (IFC standard)
 */
export function metersToFeetInches(meters: number): string {
  if (!meters || isNaN(meters) || meters <= 0) {
    return '0\' 0"';
  }
  const totalFeet = meters * 3.28084;
  const feet = Math.floor(totalFeet);
  const inches = Math.round((totalFeet - feet) * 12);
  return inches > 0 ? `${feet}' ${inches}"` : `${feet}'`;
}

/**
 * Convert square meters to square feet
 * Always assumes input is in square meters (IFC standard)
 */
export function squareMetersToSquareFeet(squareMeters: number): number {
  if (!squareMeters || isNaN(squareMeters) || squareMeters <= 0) {
    return 0;
  }
  return squareMeters * 10.764;
}

/**
 * Format square feet to string with 2 decimal places
 */
export function formatSquareFeet(squareFeet: number): string {
  return squareFeet.toFixed(2);
}

/**
 * Convert a length value to feet/inches
 * If the value is already in feet (Revit project units), it formats it directly
 * If the value is in meters (IFC standard), it converts first
 * Uses heuristic: values < 0.5 are likely meters, values >= 0.5 are likely feet
 */
export function lengthToFeetInches(value: number, assumeMeters: boolean = false): string {
  if (!value || isNaN(value) || value <= 0) {
    return '0\' 0"';
  }
  
  let feet: number;
  if (assumeMeters || value < 0.5) {
    // Assume meters, convert to feet
    feet = value * 3.28084;
  } else {
    // Assume already in feet
    feet = value;
  }
  
  const feetInt = Math.floor(feet);
  const inches = Math.round((feet - feetInt) * 12);
  return inches > 0 ? `${feetInt}' ${inches}"` : `${feetInt}'`;
}

/**
 * Convert an area value to square feet
 * If the value is already in square feet (Revit project units), it returns it directly
 * If the value is in square meters (IFC standard), it converts first
 * Uses heuristic: values < 50 are likely m², values >= 50 are likely SF
 */
export function areaToSquareFeet(value: number, assumeSquareMeters: boolean = false): number {
  if (!value || isNaN(value) || value <= 0) {
    return 0;
  }
  
  if (assumeSquareMeters || value < 50) {
    // Assume square meters, convert to square feet
    return value * 10.764;
  } else {
    // Assume already in square feet
    return value;
  }
}

/**
 * Convert a volume value to cubic feet
 * If the value is already in cubic feet (Revit project units), it returns it directly
 * If the value is in cubic meters (IFC standard), it converts first
 * Uses heuristic: values < 10 are likely m³, values >= 10 are likely ft³
 */
export function volumeToCubicFeet(value: number, assumeCubicMeters: boolean = false): number {
  if (!value || isNaN(value) || value <= 0) {
    return 0;
  }
  
  if (assumeCubicMeters || value < 10) {
    // Assume cubic meters, convert to cubic feet
    return value * 35.3147;
  } else {
    // Assume already in cubic feet
    return value;
  }
}

/**
 * Convert cubic feet to cubic yards
 */
export function cubicFeetToCubicYards(cubicFeet: number): number {
  if (!cubicFeet || isNaN(cubicFeet) || cubicFeet <= 0) {
    return 0;
  }
  return cubicFeet / 27;
}

/**
 * Format cubic feet to display string (e.g., "123.4 cu ft")
 */
export function formatCubicFeet(cubicFeet: number): string {
  if (!cubicFeet || isNaN(cubicFeet)) {
    return '0.00';
  }
  return `${cubicFeet.toFixed(2)} cu ft`;
}

/**
 * Format cubic yards to display string (e.g., "15.4 cu yd")
 */
export function formatCubicYards(cubicYards: number): string {
  if (!cubicYards || isNaN(cubicYards)) {
    return '0.00';
  }
  return `${cubicYards.toFixed(2)} cu yd`;
}

/**
 * Convert a length value to feet (returns number, not string)
 * If the value is already in feet (Revit project units), it returns it directly
 * If the value is in meters (IFC standard), it converts first
 * Uses heuristic: values < 0.5 are likely meters, values >= 0.5 are likely feet
 */
export function lengthToFeet(value: number, assumeMeters: boolean = false): number {
  if (!value || isNaN(value) || value <= 0) {
    return 0;
  }
  
  if (assumeMeters || value < 0.5) {
    // Assume meters, convert to feet
    return value * 3.28084;
  } else {
    // Assume already in feet
    return value;
  }
}

/**
 * Format length in feet to display string (e.g., "12.5 ft" or "12' 6\"")
 */
export function formatLengthFeet(feet: number, useFeetInches: boolean = false): string {
  if (!feet || isNaN(feet) || feet <= 0) {
    return '0 ft';
  }
  
  if (useFeetInches) {
    return lengthToFeetInches(feet);
  }
  
  return `${feet.toFixed(2)} ft`;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x || 1;
}

/**
 * Format a length (in feet) as inches with fractional precision (e.g., 3-1/2")
 * If maxDenominator is 256 (Revit precision), rounds to nearest 1/4" for display
 */
export function formatInchesFraction(feet: number, maxDenominator: number = 16): string {
  if (!feet || isNaN(feet) || feet <= 0) {
    return '0"';
  }

  let totalInches = feet * 12;
  let whole = Math.floor(totalInches);
  let fraction = totalInches - whole;
  let numerator = Math.round(fraction * maxDenominator);
  let denominator = maxDenominator;

  if (numerator === denominator) {
    whole += 1;
    numerator = 0;
  }

  // If denominator is 256 (Revit precision), round to nearest 1/4" (denominator 4)
  if (denominator === 256 && numerator !== 0) {
    // Convert to 1/4" increments: round to nearest quarter
    const quarters = Math.round((numerator / 256) * 4);
    if (quarters === 4) {
      whole += 1;
      numerator = 0;
      denominator = 1;
    } else if (quarters === 0) {
      numerator = 0;
      denominator = 1;
    } else {
      numerator = quarters;
      denominator = 4;
      // Simplify if possible
      const divisor = gcd(numerator, denominator);
      numerator = numerator / divisor;
      denominator = denominator / divisor;
    }
  } else if (numerator !== 0) {
    // Normal simplification for other denominators
    const divisor = gcd(numerator, denominator);
    numerator = numerator / divisor;
    denominator = denominator / divisor;
  }

  if (whole === 0 && numerator === 0) {
    return '0"';
  }

  if (numerator === 0) {
    return `${whole}"`;
  }

  if (whole === 0) {
    return `${numerator}/${denominator}"`;
  }

  return `${whole}-${numerator}/${denominator}"`;
}

/**
 * Format size as "3'-0" x 5'-0" (36" x 60")"
 * Combines width and height into a single size string
 */
export function formatSizeDisplay(widthFt: number, heightFt: number): string {
  if (!widthFt || !heightFt || isNaN(widthFt) || isNaN(heightFt) || widthFt <= 0 || heightFt <= 0) {
    return '';
  }
  
  // Format feet/inches with hyphen (e.g., "3'-0"")
  const formatFeetInches = (feet: number): string => {
    const feetInt = Math.floor(feet);
    const inches = Math.round((feet - feetInt) * 12);
    return inches > 0 ? `${feetInt}'-${inches}"` : `${feetInt}'-0"`;
  };
  
  // Calculate total inches
  const widthInches = Math.round(widthFt * 12);
  const heightInches = Math.round(heightFt * 12);
  
  // Combine: "3'-0" x 5'-0" (36" x 60")"
  return `${formatFeetInches(widthFt)} x ${formatFeetInches(heightFt)} (${widthInches}" x ${heightInches}")`;
}

