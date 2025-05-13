
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
 * Format: "<div class="eventClassHeader"><div><h3>Class name</h3>2 190 m, 8 startande</div></div>"
 * 
 * Updated to correctly handle the Eventor HTML structure where the course length
 * appears immediately after the closing </h3> tag
 */
export const extractCourseInfo = (html: string, className: string): {length: number, participants: number} => {
  const result = { length: 0, participants: 0 };
  
  try {
    // Create a DOM parser to properly parse the HTML structure
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    console.log(`[DEBUG] Looking for class "${className}" in eventClassHeader divs`);
    
    // Find all eventClassHeader divs
    const eventClassHeaders = doc.querySelectorAll('div.eventClassHeader');
    console.log(`[DEBUG] Found ${eventClassHeaders.length} eventClassHeader divs`);
    
    for (let i = 0; i < eventClassHeaders.length; i++) {
      const header = eventClassHeaders[i];
      
      // Find the h3 element inside this header
      const h3 = header.querySelector('h3');
      
      if (h3 && h3.textContent && h3.textContent.trim() === className.trim()) {
        console.log(`[DEBUG] Found exact match for class "${className}" in header ${i+1}`);
        
        // Log the full HTML of the matched header for debugging
        console.log(`[DEBUG] Found eventClassHeader: ${header.outerHTML.substring(0, 200)}...`);
        
        // Get the parent div that contains both the h3 and the text node with the length
        const parentDiv = h3.parentElement;
        
        if (parentDiv) {
          // The HTML structure typically looks like:
          // <div><h3>Class Name</h3>3 100 m, 17 startande</div>
          // We need to extract the text node that comes after the h3
          
          // First get the innerHTML of the parent div
          const innerHTML = parentDiv.innerHTML;
          
          // Extract the text after the closing </h3> tag
          const afterH3Match = innerHTML.match(/<\/h3>([^<,]+)/);
          
          if (afterH3Match && afterH3Match[1]) {
            const textAfterH3 = afterH3Match[1].trim();
            console.log(`[DEBUG] Text after </h3>: "${textAfterH3}"`);
            
            // Extract the length from this text
            const lengthValue = extractCourseLength(textAfterH3);
            result.length = lengthValue;
            
            console.log(`[DEBUG] Extracted course length: ${result.length} m`);
          } else {
            console.log(`[DEBUG] Could not find text after </h3> in: ${innerHTML}`);
          }
          
          // Now extract the participants count from the text, typically "X startande"
          const participantsMatch = parentDiv.textContent?.match(/,\s*(\d+)\s+startande/i);
          
          if (participantsMatch && participantsMatch[1]) {
            result.participants = parseInt(participantsMatch[1], 10);
            console.log(`[DEBUG] Extracted participants count: ${result.participants}`);
          } else {
            console.log(`[DEBUG] Could not find participants count in: ${parentDiv.textContent}`);
          }
          
          return result;
        }
      }
    }
    
    // If no exact match was found, log this and try a more flexible approach
    console.log(`[DEBUG] No exact match found for class "${className}"`);
    
    // Second attempt: Try a more flexible match for the class name
    for (let i = 0; i < eventClassHeaders.length; i++) {
      const header = eventClassHeaders[i];
      const h3 = header.querySelector('h3');
      
      if (h3 && h3.textContent && h3.textContent.includes(className)) {
        console.log(`[DEBUG] Found partial match: "${h3.textContent}" for class "${className}"`);
        
        // Log the full HTML of the matched header for debugging
        console.log(`[DEBUG] Found eventClassHeader with partial match: ${header.outerHTML.substring(0, 200)}...`);
        
        const parentDiv = h3.parentElement;
        
        if (parentDiv) {
          const innerHTML = parentDiv.innerHTML;
          const afterH3Match = innerHTML.match(/<\/h3>([^<,]+)/);
          
          if (afterH3Match && afterH3Match[1]) {
            const textAfterH3 = afterH3Match[1].trim();
            console.log(`[DEBUG] Text after </h3> in partial match: "${textAfterH3}"`);
            
            const lengthValue = extractCourseLength(textAfterH3);
            result.length = lengthValue;
            
            console.log(`[DEBUG] Extracted course length from partial match: ${result.length} m`);
          }
          
          const participantsMatch = parentDiv.textContent?.match(/,\s*(\d+)\s+startande/i);
          
          if (participantsMatch && participantsMatch[1]) {
            result.participants = parseInt(participantsMatch[1], 10);
            console.log(`[DEBUG] Extracted participants count from partial match: ${result.participants}`);
          }
          
          return result;
        }
      }
    }
    
    // Last resort: regex-based approach for when DOM parsing might not be reliable
    console.log(`[DEBUG] Attempting regex-based extraction for class "${className}"`);
    
    // Pattern to match: <div class="eventClassHeader">...<h3>className</h3>LENGTH m, PARTICIPANTS startande
    const classHeaderPattern = new RegExp(
      `<div class="eventClassHeader">.*?<h3>\\s*${className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</h3>([^,<]+),\\s*(\\d+)\\s+startande`,
      'is'
    );
    
    const match = classHeaderPattern.exec(html);
    if (match) {
      const lengthText = match[1].trim();
      const participantsText = match[2];
      
      console.log(`[DEBUG] Regex match - Raw length: "${lengthText}", Participants: "${participantsText}"`);
      
      // Log the context around the match
      const matchStart = Math.max(0, match.index - 50);
      const matchEnd = Math.min(html.length, match.index + match[0].length + 50);
      const context = html.substring(matchStart, matchEnd);
      console.log(`[DEBUG] Regex match context: "${context}"`);
      
      const lengthValue = extractCourseLength(lengthText);
      result.length = lengthValue;
      result.participants = parseInt(participantsText, 10);
      
      console.log(`[DEBUG] Extracted through regex - Length: ${result.length} m, Participants: ${result.participants}`);
    } else {
      console.log(`[DEBUG] No regex match found for class "${className}"`);
    }
  } catch (error) {
    console.error(`[ERROR] Exception in extractCourseInfo:`, error);
  }
  
  return result;
};

/**
 * Finds the course length from various sources
 * @deprecated Use extractCourseInfo instead for more accurate results
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
