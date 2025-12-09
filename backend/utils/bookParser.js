/**
 * Utility functions to parse book titles and extract volume information
 */

/**
 * Extracts volume number from title and returns cleaned title
 * @param {string} title - Original book title
 * @returns {{cleanTitle: string, volume: number|null}} - Cleaned title and volume number
 */
export function extractVolumeFromTitle(title) {
  if (!title) return { cleanTitle: title, volume: null };

  let cleanTitle = title;
  let volume = null;

  // Patterns to match volume numbers (ordered by specificity)
  const patterns = [
    // "Harry Potter, tome 1 : Le titre" or "Harry Potter, tome 1 - Le titre"
    /^(.+?),?\s*[Tt]ome\s+(\d+(?:\.\d+)?)\s*[:\-–—]\s*(.+)$/,
    
    // "Harry Potter, tome 1" or "Harry Potter tome 1"
    /^(.+?),?\s*[Tt]ome\s+(\d+(?:\.\d+)?)$/,
    
    // "Le titre, Volume 1" or "Le titre, Vol. 1"
    /^(.+?),?\s*[Vv]ol(?:ume)?\.?\s+(\d+(?:\.\d+)?)$/,
    
    // "Le titre, T1" or "Le titre T.1"
    /^(.+?),?\s*T\.?\s*(\d+(?:\.\d+)?)$/i,
    
    // "Le titre #1" or "Le titre, #1"
    /^(.+?),?\s*#\s*(\d+(?:\.\d+)?)$/,
    
    // "Le titre - 1" or "Le titre, 1" (at the end)
    /^(.+?),?\s*[-–—]\s*(\d+(?:\.\d+)?)$/,
    
    // "Le titre (1)" or "Le titre (Tome 1)"
    /^(.+?)\s*\((?:[Tt]ome\s+)?(\d+(?:\.\d+)?)\)$/,
    
    // "Le titre, Livre 1" or "Le titre, Part 1"
    /^(.+?),?\s*(?:[Ll]ivre|[Pp]art(?:ie)?)\s+(\d+(?:\.\d+)?)$/,
    
    // "Titre : Tome 1" or "Titre : Volume 1"
    /^(.+?)\s*[:\-–—]\s*(?:[Tt]ome|[Vv]ol(?:ume)?\.?)\s+(\d+(?:\.\d+)?)$/,
    
    // Roman numerals at the end: "Le titre III" or "Le titre, III"
    /^(.+?),?\s+(I{1,3}|IV|V|VI{1,3}|IX|X|XI{1,3}|XIV|XV|XVI{1,3}|XIX|XX)$/,
  ];

  // Try each pattern
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      // For roman numerals
      if (match[2] && /^[IVX]+$/.test(match[2])) {
        volume = romanToNumber(match[2]);
        cleanTitle = match[1].trim();
        break;
      }
      // For regular numbers
      else if (match[2]) {
        volume = parseFloat(match[2]);
        // If there's a subtitle after the volume (group 3), use it as the clean title
        cleanTitle = match[3] ? match[3].trim() : match[1].trim();
        break;
      }
    }
  }

  // Remove trailing commas, colons, or dashes
  cleanTitle = cleanTitle.replace(/[,:;\-–—]\s*$/, "").trim();
  
  // Remove content in parentheses (like "(Edition spéciale)" or "(French)")
  cleanTitle = cleanTitle.replace(/\s*\([^)]*\)\s*$/g, "").trim();
  
  // Remove content in square brackets
  cleanTitle = cleanTitle.replace(/\s*\[[^\]]*\]\s*$/g, "").trim();
  
  // Remove trailing dots and spaces
  cleanTitle = cleanTitle.replace(/[\s.]+$/, "").trim();

  return { cleanTitle, volume };
}

/**
 * Converts Roman numerals to numbers
 * @param {string} roman - Roman numeral string
 * @returns {number} - Converted number
 */
function romanToNumber(roman) {
  const romanMap = {
    'I': 1, 'V': 5, 'X': 10, 'L': 50,
    'C': 100, 'D': 500, 'M': 1000
  };
  
  let num = 0;
  for (let i = 0; i < roman.length; i++) {
    const current = romanMap[roman[i]];
    const next = romanMap[roman[i + 1]];
    
    if (next && current < next) {
      num -= current;
    } else {
      num += current;
    }
  }
  
  return num;
}

/**
 * Clean title by removing series information and parenthetical content
 * @param {string} title - Original title
 * @returns {string} - Cleaned title
 */
export function cleanTitle(title) {
  if (!title) return title;
  
  let clean = title;
  
  // Remove content in parentheses
  clean = clean.replace(/\s*\([^)]*\)/g, '');
  
  // Remove content in square brackets
  clean = clean.replace(/\s*\[[^\]]*\]/g, '');
  
  // Remove edition information
  clean = clean.replace(/\s*[-:]\s*(?:Edition|Édition|Version|Printing)\s+[^,]+/gi, '');
  
  // Remove trailing punctuation and spaces
  clean = clean.replace(/[\s,:;\-–—.]+$/, '');
  
  return clean.trim();
}

/**
 * Extract series name from title if present
 * @param {string} title - Original title
 * @returns {string|null} - Series name or null
 */
export function extractSeriesFromTitle(title) {
  if (!title) return null;
  
  // Look for patterns like "Series Name: Book Title" or "Series Name - Book Title"
  const seriesPattern = /^([^:\-–—]+?)\s*[:\-–—]\s*.+(?:[Tt]ome|[Vv]ol|#|\d)/;
  const match = title.match(seriesPattern);
  
  if (match) {
    return match[1].trim();
  }
  
  return null;
}