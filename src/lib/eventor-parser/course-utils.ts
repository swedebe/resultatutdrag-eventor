
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
  
  // Rensa bort oönskade tecken och trimma
  const cleanedText = lengthText.replace(/[^\d\s.,km]/gi, '').trim();
  console.log(`[DEBUG] Cleaned length text: "${cleanedText}"`);
  
  // Försök hitta km-format (t.ex. "4.5 km")
  let kmMatch = cleanedText.match(/([\d.,]+)\s*km/i);
  if (kmMatch) {
    // Hantera både punkt och komma som decimalavgränsare
    const kmValue = kmMatch[1].replace(',', '.');
    const meters = Math.round(parseFloat(kmValue) * 1000);
    console.log(`[DEBUG] Extracted from km format: ${kmValue} km = ${meters} m`);
    return meters;
  }
  
  // Försök hitta m-format (t.ex. "4 500 m" eller "4500m")
  let mMatch = cleanedText.match(/([\d\s]+)\s*m/i);
  if (mMatch) {
    const rawValue = mMatch[1].replace(/\s/g, '');
    const meters = parseInt(rawValue, 10);
    console.log(`[DEBUG] Extracted from meter format: ${rawValue} = ${meters} m`);
    return meters;
  }
  
  // Sista försöket - hitta bara numret
  let numMatch = cleanedText.match(/[\d\s.,]+/);
  if (numMatch) {
    const numStr = numMatch[0].replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(numStr);
    // Om numret är litet, anta att det är i km
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
 */
export const extractCourseInfo = (html: string, className: string): {length: number, participants: number} => {
  const result = { length: 0, participants: 0 };
  
  // Improved regex pattern targeting eventClassHeader divs more precisely
  // This regex looks for a div with class="eventClassHeader" containing an h3 with the class name
  // followed by the length and participants info
  const eventClassHeaderRegex = new RegExp(
    `<div class="eventClassHeader"><div><h3>(${className})[^<]*</h3>([^<]+)</div>`, 
    'i'
  );
  
  const match = eventClassHeaderRegex.exec(html);
  
  if (match) {
    const infoText = match[2].trim();
    console.log(`[DEBUG] Found matching class header: "${match[1]}" for class "${className}"`);
    console.log(`[DEBUG] Info text: "${infoText}"`);
    console.log(`[DEBUG] Extracted from node: <div class="eventClassHeader"><div><h3>${match[1]}...</h3>${infoText}</div>`);
    
    // Pattern: "2 190 m, 8 startande" or "4 160 m, 24 startande"
    const lengthParticipantsRegex = /(\d[\d\s]+)\s*m,\s*(\d+)\s+startande/i;
    const infoMatch = infoText.match(lengthParticipantsRegex);
    
    if (infoMatch) {
      const rawValue = infoMatch[1].replace(/\s/g, '');
      result.length = parseInt(rawValue, 10);
      result.participants = parseInt(infoMatch[2], 10);
      console.log(`[DEBUG] Extracted length: ${rawValue} = ${result.length} m, participants: ${result.participants}`);
      return result;
    }
  }
  
  // If no exact match found, try a more flexible approach
  // Look for eventClassHeader divs containing the class name
  const flexibleRegex = /<div class="eventClassHeader">[^<]*<h3>[^<]*?(?:${className})[^<]*?<\/h3>([^<]+)/gi;
  const allMatches = [...html.matchAll(flexibleRegex)];
  
  for (const flexMatch of allMatches) {
    if (flexMatch && flexMatch[1]) {
      const infoText = flexMatch[1].trim();
      console.log(`[DEBUG] Flexible match info text: "${infoText}"`);
      console.log(`[DEBUG] Extracted from node: <div class="eventClassHeader">...<h3>...${className}...</h3>${infoText}`);
      
      // Pattern: "2 190 m, 8 startande"
      const lengthParticipantsRegex = /(\d[\d\s]+)\s*m,\s*(\d+)\s+startande/i;
      const infoMatch = infoText.match(lengthParticipantsRegex);
      
      if (infoMatch) {
        const rawValue = infoMatch[1].replace(/\s/g, '');
        result.length = parseInt(rawValue, 10);
        result.participants = parseInt(infoMatch[2], 10);
        console.log(`[DEBUG] Flexible extraction - raw length: ${rawValue} = ${result.length} m, participants: ${result.participants}`);
        return result;
      }
    }
  }
  
  // If still not found, perform a general search for the pattern near the class name
  const generalRegex = new RegExp(
    `${className}[\\s\\S]{0,100}(\\d[\\d\\s]+)\\s*m,\\s*(\\d+)\\s+startande`,
    'i'
  );
  
  const generalMatch = html.match(generalRegex);
  
  if (generalMatch) {
    const rawValue = generalMatch[1].replace(/\s/g, '');
    result.length = parseInt(rawValue, 10);
    result.participants = parseInt(generalMatch[2], 10);
    console.log(`[DEBUG] General extraction - raw length: ${rawValue} = ${result.length} m, participants: ${result.participants}`);
    console.log(`[DEBUG] Extracted from node containing text: ${className}...(${generalMatch[0].substring(0, 50)}...)`);
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
