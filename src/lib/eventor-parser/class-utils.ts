/**
 * Utilities for extracting class information
 */

/**
 * Extracts class info from the document
 * Class is always an H3 heading within a div with class="eventClassHeader"
 */
export const extractClassInfo = (doc: Document, row: Element): string => {
  // First priority: Look for H3 headings in eventClassHeader divs
  const classHeaders = Array.from(doc.querySelectorAll("div.eventClassHeader h3"));
  
  for (const header of classHeaders) {
    if (header.textContent) {
      // Get the text content and log it for debugging
      const fullText = header.textContent.trim();
      console.log("Full H3 content:", fullText);
      
      // STRICT pattern matching for class names only
      const classPatterns = [
        // Matches "Mycket lätt 2 Dam" but stops at any non-class content
        /^((?:Mycket lätt|Lätt|Medelsvår|Svår)\s+\d+\s+(?:Dam|Herr))/i,
        // Matches "H21", "D45", etc.
        /^([HD]\d+)/,  
        // Matches "Öppen 7", etc.
        /^(Öppen\s+\d+)/i,  
      ];
      
      // Try each pattern until we find a match
      let className = null;
      for (const pattern of classPatterns) {
        const match = fullText.match(pattern);
        if (match && match[1]) {
          className = match[1].trim();
          break;
        }
      }
      
      // If no patterns matched, use a more aggressive approach:
      // Take text up to the first comma, parenthesis, or "m"
      if (!className) {
        className = fullText.split(/[,\(\dm]/)[0].trim();
      }
      
      console.log("Extracted class name:", className);
      
      // Check if this header is related to our results row
      const headerContainer = header.closest('div.eventClassHeader');
      const rowTable = row.closest('table');
      
      if (headerContainer && rowTable) {
        // Check if this header is before the table containing our row
        let currentNode = headerContainer.nextElementSibling;
        while (currentNode) {
          if (currentNode === rowTable) {
            return className || "";
          }
          currentNode = currentNode.nextElementSibling;
        }
      }
    }
  }
  
  // Fallbacks: same as before but with stricter pattern matching
  // Look for any H3 headings that seem like class names
  const allH3s = Array.from(doc.querySelectorAll("h3"));
  
  for (const header of allH3s) {
    if (header.textContent) {
      const headerText = header.textContent.trim();
      
      // Check for common class patterns
      if (/^(Mycket lätt|Lätt|Medelsvår|Svår)\s+\d+\s+(Dam|Herr|D|H|Open)/i.test(headerText) ||
          /^[HD]\d+/.test(headerText) ||
          /^Öppen \d+/i.test(headerText)) {
        
        // Try to determine if this header is related to our row
        const rowTable = row.closest('table');
        if (rowTable) {
          let testNode = header;
          while (testNode && testNode !== rowTable) {
            testNode = testNode.nextElementSibling;
            if (!testNode) break;
          }
          
          if (testNode === rowTable) {
            // Extract just the class part with strict patterns
            const classPatterns = [
              /^((?:Mycket lätt|Lätt|Medelsvår|Svår)\s+\d+\s+(?:Dam|Herr))/i,
              /^([HD]\d+)/,
              /^(Öppen\s+\d+)/i,
            ];
            
            for (const pattern of classPatterns) {
              const match = headerText.match(pattern);
              if (match && match[1]) {
                return match[1].trim();
              }
            }
            
            // More aggressive splitting if no pattern matched
            return headerText.split(/[,\(\dm]/)[0].trim();
          }
        }
      }
    }
  }
  
  // Fallback to previous methods if no class header found
  // Look for blue titles (CSS class with size/color as in the image)
  const blueTitles = Array.from(doc.querySelectorAll(".eventheader, .classheader, h1, h2, h3"));
  
  for (const title of blueTitles) {
    const titleText = title.textContent?.trim() || "";
    // Common class patterns for orienteering
    if (/^(Mycket lätt|Lätt|Medelsvår|Svår)\s+\d+\s+(Dam|Herr|D|H|Open)/.test(titleText) ||
        /^[HD]\d+/.test(titleText) ||
        /^Öppen \d+/i.test(titleText)) {
      
      // Check if this title is related to the table/row we're looking at
      const titleContainer = title.closest('div, section, article');
      const rowTable = row.closest('table');
      
      if (titleContainer && rowTable && 
          (titleContainer.contains(rowTable) || 
          titleContainer.nextElementSibling === rowTable)) {
        return titleText;
      }
    }
  }
  
  // Om ingen blå titel hittades, prova med tabellrubriker
  const table = row.closest('table');
  if (table) {
    // Kolla tabellens caption först, det används ofta för klass
    const tableCaption = table.querySelector('caption');
    if (tableCaption && tableCaption.textContent) {
      const captionText = tableCaption.textContent.trim();
      if (/^(Mycket lätt|Lätt|Medelsvår|Svår)\s+\d+\s+(Dam|Herr|D|H|Open)/.test(captionText) ||
          /^[HD]\d+/.test(captionText) ||
          /^Öppen \d+/i.test(captionText)) {
        return captionText;
      }
    }
    
    // Kolla element precis före tabellen
    const prevSibling = table.previousElementSibling;
    if (prevSibling && prevSibling.textContent) {
      const prevText = prevSibling.textContent.trim();
      if (/^(Mycket lätt|Lätt|Medelsvår|Svår)\s+\d+\s+(Dam|Herr|D|H|Open)/.test(prevText) ||
          /^[HD]\d+/.test(prevText) ||
          /^Öppen \d+/i.test(prevText)) {
        return prevText;
      }
    }
    
    // Kolla om det finns en kolumn med klassinfo
    const headers = Array.from(table.querySelectorAll('th'));
    const classIndex = headers.findIndex(header => 
      header.textContent?.toLowerCase().includes('klass'));
    
    if (classIndex >= 0) {
      const cells = row.querySelectorAll('td');
      if (cells && cells.length > classIndex) {
        const cellText = cells[classIndex].textContent?.trim();
        if (cellText && cellText !== "") {
          return cellText;
        }
      }
    }
  }
  
  // Sök efter starka element nära raden som kan vara klassrubriker
  const rowParent = row.closest('tbody') || row.closest('table');
  const nearbyHeaders = rowParent ? 
    Array.from(rowParent.querySelectorAll('strong, b, h3, h4')) : [];
    
  for (const header of nearbyHeaders) {
    const headerText = header.textContent?.trim() || "";
    if (/^(Mycket lätt|Lätt|Medelsvår|Svår)\s+\d+\s+(Dam|Herr|D|H|Open)/.test(headerText) ||
        /^[HD]\d+/.test(headerText) ||
        /^Öppen \d+/i.test(headerText)) {
      return headerText;
    }
  }
  
  // Om inget annat fungerar, leta i URL efter klassnamn
  const pageUrl = doc.URL || window.location.href;
  const classMatch = pageUrl.match(/[?&]class=([^&]+)/i) || 
                    pageUrl.match(/[?&]className=([^&]+)/i);
  if (classMatch && classMatch[1]) {
    return decodeURIComponent(classMatch[1]);
  }
  
  return "";
};
