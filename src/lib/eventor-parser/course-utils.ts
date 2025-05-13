
/**
 * Utilities for extracting course information
 */

/**
 * Extracts course length from text, e.g. "4.5 km" or "4 500 m" to meters
 */
export const extractCourseLength = (lengthText: string): number => {
  if (!lengthText) return 0;
  
  // Log raw input for debugging
  console.log(`[DEBUG] Raw length text input: "${lengthText}"`);
  
  // Clean unwanted characters and trim
  const cleanedText = lengthText.replace(/[^\d\s.,km]/gi, '').trim();
  console.log(`[DEBUG] Cleaned length text: "${cleanedText}"`);
  
  // Look for km format (e.g. "4.5 km")
  let kmMatch = cleanedText.match(/([\d.,]+)\s*km/i);
  if (kmMatch) {
    // Handle both dot and comma as decimal separator
    const kmValue = kmMatch[1].replace(',', '.');
    const meters = Math.round(parseFloat(kmValue) * 1000);
    console.log(`[DEBUG] Extracted from km format: ${kmValue} km = ${meters} m`);
    return meters;
  }
  
  // Look for meter format (e.g. "4 500 m" or "4500m")
  let mMatch = cleanedText.match(/([\d\s]+)\s*m/i);
  if (mMatch) {
    const rawValue = mMatch[1].replace(/\s/g, '');
    const meters = parseInt(rawValue, 10);
    console.log(`[DEBUG] Extracted from meter format: ${rawValue} = ${meters} m`);
    return meters;
  }
  
  // Last attempt - find just the number
  let numMatch = cleanedText.match(/[\d\s.,]+/);
  if (numMatch) {
    const numStr = numMatch[0].replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(numStr);
    // If the number is small, assume it's in km
    if (num < 100) {
      const meters = Math.round(num * 1000);
      console.log(`[DEBUG] Extracted small number as km: ${num} km = ${meters} m`);
      return meters;
    }
    console.log(`[DEBUG] Extracted raw number as meters: ${num} m`);
    return Math.round(num);
  }
  
  console.log(`[DEBUG] Failed to extract course length from text: "${lengthText}"`);
  return 0;
};

/**
 * Extracts course length and participants from event class header
 * Format: "<h3>Class name</h3>2 190 m, 8 startande"
 * 
 * Updated to correctly handle the Eventor HTML structure where the course length
 * appears immediately after the closing </h3> tag
 */
export const extractCourseInfo = (html: string, className: string): {length: number, participants: number} => {
  const result = { length: 0, participants: 0 };
  
  try {
    // Improved regex pattern targeting eventClassHeader divs with exact class name match
    // This regex looks for: <div class="eventClassHeader">...<h3>className</h3>LENGTH m, PARTICIPANTS startande
    const eventClassHeaderRegex = new RegExp(
      `<div class="eventClassHeader">\\s*<div>\\s*<h3>\\s*(${className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*</h3>([^,<]+),\\s*(\\d+)\\s+startande`,
      'i'
    );
    
    console.log(`[DEBUG] Looking for class "${className}" in eventClassHeader divs`);
    const match = eventClassHeaderRegex.exec(html);
    
    if (match) {
      // match[1] = class name
      // match[2] = course length text (e.g. "3 100 m")
      // match[3] = number of participants
      const lengthText = match[2].trim();
      const participantsText = match[3];
      
      console.log(`[DEBUG] Found exact match for class "${match[1]}"`);
      console.log(`[DEBUG] Raw extracted length text: "${lengthText}"`);
      console.log(`[DEBUG] Raw participants text: "${participantsText}"`);
      
      // Log the full matched HTML context for debugging
      const contextStart = Math.max(0, match.index - 50);
      const contextEnd = Math.min(html.length, match.index + match[0].length + 50);
      const htmlContext = html.substring(contextStart, contextEnd);
      console.log(`[DEBUG] Extracted from HTML context: "${htmlContext}"`);
      
      // Extract the course length value
      const lengthValue = extractCourseLength(lengthText);
      result.length = lengthValue;
      
      // Extract participants count
      result.participants = parseInt(participantsText, 10);
      
      console.log(`[DEBUG] Final extracted values - Length: ${result.length} m, Participants: ${result.participants}`);
      return result;
    } else {
      console.log(`[DEBUG] No exact match found for class "${className}" using primary regex pattern`);
    }
    
    // If no exact match found, try a more flexible approach
    // This is a fallback that searches for class names that might be formatted slightly differently
    const flexibleRegex = new RegExp(
      `<div class="eventClassHeader">\\s*<div>\\s*<h3>\\s*([^<]*${className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*)\\s*</h3>([^,<]+),\\s*(\\d+)\\s+startande`,
      'i'
    );
    
    console.log(`[DEBUG] Trying flexible match for class containing "${className}"`);
    const flexMatch = flexibleRegex.exec(html);
    
    if (flexMatch) {
      const flexClassName = flexMatch[1].trim();
      const flexLengthText = flexMatch[2].trim();
      const flexParticipantsText = flexMatch[3];
      
      console.log(`[DEBUG] Found flexible match with class "${flexClassName}"`);
      console.log(`[DEBUG] Flexible match raw length text: "${flexLengthText}"`);
      console.log(`[DEBUG] Flexible match participants text: "${flexParticipantsText}"`);
      
      // Log the full matched HTML context for debugging
      const contextStart = Math.max(0, flexMatch.index - 50);
      const contextEnd = Math.min(html.length, flexMatch.index + flexMatch[0].length + 50);
      const htmlContext = html.substring(contextStart, contextEnd);
      console.log(`[DEBUG] Flexible match HTML context: "${htmlContext}"`);
      
      // Extract the course length value
      const lengthValue = extractCourseLength(flexLengthText);
      result.length = lengthValue;
      
      // Extract participants count
      result.participants = parseInt(flexParticipantsText, 10);
      
      console.log(`[DEBUG] Flexible match final values - Length: ${result.length} m, Participants: ${result.participants}`);
      return result;
    } else {
      console.log(`[DEBUG] No flexible match found for class containing "${className}"`);
    }
    
    // Last resort: try to find any class header that looks similar
    console.log(`[DEBUG] Trying to find any eventClassHeader divs`);
    const allHeadersRegex = /<div class="eventClassHeader">\s*<div>\s*<h3>([^<]*)<\/h3>([^,<]+),\s*(\d+)\s+startande/gi;
    let allMatches = [...html.matchAll(allHeadersRegex)];
    
    if (allMatches.length > 0) {
      console.log(`[DEBUG] Found ${allMatches.length} total eventClassHeader divs`);
      
      // Log the first few headers found for debugging
      for (let i = 0; i < Math.min(3, allMatches.length); i++) {
        const headerMatch = allMatches[i];
        console.log(`[DEBUG] Header #${i+1}: <h3>${headerMatch[1]}</h3>${headerMatch[2]}, ${headerMatch[3]} startande`);
      }
    } else {
      console.log(`[DEBUG] No eventClassHeader divs found in HTML`);
    }
  } catch (error) {
    console.error(`[ERROR] Exception in extractCourseInfo:`, error);
  }
  
  return result;
};

/**
 * Finds the course length from various sources
 */
export const findCourseLength = (row: Element, doc: Document, html: string): number => {
  // Method 1: Look for the length in headers or sub-headers (as shown in the image)
  const classHeadings = doc.querySelectorAll('h2, h3, h4, strong');
  for (const heading of classHeadings) {
    if (!heading.textContent) continue;
    
    const headingText = heading.textContent.trim();
    // Look for patterns like "2 190 m, 11 startande" as shown in image
    const lengthMatch = headingText.match(/(\d[\d\s]+)\s*m,\s*\d+\s+startande/i);
    if (lengthMatch && lengthMatch[1]) {
      const rawValue = lengthMatch[1].replace(/\s/g, '');
      const length = parseInt(rawValue, 10);
      console.log(`[DEBUG] Method 1: Extracted length from heading: ${heading.outerHTML}`);
      console.log(`[DEBUG] Raw value: "${lengthMatch[1]}" = ${length} m`);
      return length;
    }
  }
  
  // Method 2: Look for length in specific table structures
  const courseTable = row.closest('table');
  if (courseTable) {
    const headerRow = courseTable.querySelector('tr');
    if (headerRow) {
      const headers = Array.from(headerRow.querySelectorAll('th'));
      // Look for columns with appropriate headers
      const lengthLabels = ['längd', 'length', 'distans', 'distance', 'bana', 'course'];
      
      for (const label of lengthLabels) {
        const lengthIndex = headers.findIndex(header => 
          header.textContent?.toLowerCase().includes(label));
        
        if (lengthIndex >= 0) {
          const cells = row.querySelectorAll('td');
          if (cells && cells.length > lengthIndex) {
            const lengthText = cells[lengthIndex].textContent?.trim();
            if (lengthText) {
              const length = extractCourseLength(lengthText);
              console.log(`[DEBUG] Method 2: Extracted length from table cell: ${cells[lengthIndex].outerHTML}`);
              return length;
            }
          }
        }
      }
    }
  }
  
  // Method 3: Look for length in text associated with class info
  const parentTable = row.closest('table');
  const tableHeader = parentTable?.previousElementSibling;
  if (tableHeader && tableHeader.textContent) {
    // Check table header text for length info
    const headerText = tableHeader.textContent;
    // Match patterns like "2 190 m" as seen in the image
    const lengthMatch = headerText.match(/(\d[\d\s]+)\s*m/i);
    if (lengthMatch && lengthMatch[1]) {
      const rawValue = lengthMatch[1].replace(/\s/g, '');
      const length = parseInt(rawValue, 10);
      console.log(`[DEBUG] Method 3: Extracted length from table header: ${tableHeader.outerHTML}`);
      console.log(`[DEBUG] Raw value: "${lengthMatch[1]}" = ${length} m`);
      return length;
    }
  }
  
  // Method 4: Search for text in HTML that matches pattern like "2 190 m, 11 startande"
  const lengthPatternMatch = html.match(/(\d[\d\s]+)\s*m,\s*\d+\s+startande/gi);
  if (lengthPatternMatch && lengthPatternMatch.length > 0) {
    for (const match of lengthPatternMatch) {
      const lengthPart = match.match(/(\d[\d\s]+)\s*m/i);
      if (lengthPart && lengthPart[1]) {
        const rawValue = lengthPart[1].replace(/\s/g, '');
        const length = parseInt(rawValue, 10);
        console.log(`[DEBUG] Method 4: Extracted length from pattern match: "${match}"`);
        console.log(`[DEBUG] Raw value: "${lengthPart[1]}" = ${length} m`);
        return length;
      }
    }
  }
  
  return 0;
};
