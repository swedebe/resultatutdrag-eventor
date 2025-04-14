
/**
 * Utilities for extracting position information
 */

/**
 * Extracts information from placeringskolumnen, t.ex. "1 (av 24)"
 */
export const extractBasicPositionInfo = (positionText: string): { position: number; total: number } => {
  // Ta bort alla icke-numeriska tecken och dela upp i siffror
  if (!positionText) return { position: 0, total: 0 };
  
  // Eventor har olika format: "1 (av 24)", "1/24", "1 av 24" etc.
  const match = positionText.match(/(\d+)(?:\s*(?:av|\/|\(av\)|\(of\)|\()\s*(\d+))?/i);
  
  if (match && match.length >= 2) {
    return {
      position: parseInt(match[1], 10) || 0,
      total: match[2] ? parseInt(match[2], 10) : 0
    };
  }
  
  // Om det bara är en siffra, anta att det är placeringen
  const justNumber = positionText.match(/^(\d+)$/);
  if (justNumber) {
    return {
      position: parseInt(justNumber[1], 10),
      total: 0
    };
  }
  
  return { position: 0, total: 0 };
};

/**
 * Improved extraction of position and total participants
 */
export const extractEnhancedPositionInfo = (positionText: string, doc: Document, row: Element): { position: number; total: number } => {
  // If position text is provided and valid, use it
  if (positionText && /^\d+/.test(positionText)) {
    // Remove all non-numeric characters and split into numbers
    const match = positionText.match(/(\d+)(?:\s*(?:av|\/|\(av\)|\(of\)|\()\s*(\d+))?/i);
    
    if (match && match.length >= 2) {
      return {
        position: parseInt(match[1], 10) || 0,
        total: match[2] ? parseInt(match[2], 10) : 0
      };
    }
    
    // If it's just a number, assume it's the position
    const justNumber = positionText.match(/^(\d+)$/);
    if (justNumber) {
      // Try to find total participants from nearby elements
      const table = row.closest('table');
      const rowCount = table ? table.querySelectorAll('tr').length - 1 : 0; // -1 for header
      
      return {
        position: parseInt(justNumber[1], 10),
        total: rowCount > 0 ? rowCount : 0
      };
    }
  }
  
  // Try to extract position from the first column of the table
  const cells = row.querySelectorAll('td');
  if (cells && cells.length > 0) {
    const firstCellText = cells[0].textContent?.trim() || '';
    if (/^\d+$/.test(firstCellText)) {
      return {
        position: parseInt(firstCellText, 10),
        total: 0  // We'll try to determine this later
      };
    }
  }
  
  return { position: 0, total: 0 };
};
