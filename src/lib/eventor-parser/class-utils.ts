
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
      // Get ONLY the direct text content of the H3, not including child elements
      // This is crucial to avoid picking up additional text outside of the actual class name
      let headerText = "";
      
      // Manually get only the text nodes that are direct children of this H3 element
      for (let i = 0; i < header.childNodes.length; i++) {
        const node = header.childNodes[i];
        if (node.nodeType === Node.TEXT_NODE) {
          headerText += node.textContent;
        }
      }
      
      headerText = headerText.trim();
      console.log("Raw H3 text content:", headerText);
      
      // Extract just the class name part using common patterns
      const classNameMatch = headerText.match(/^((?:Mycket lätt|Lätt|Medelsvår|Svår)\s+\d+\s+(?:Dam|Herr)|[HD]\d+|Öppen\s+\d+)/i);
      const classText = classNameMatch ? classNameMatch[1] : headerText;
      console.log("Extracted class name:", classText);
      
      // Find if this class header is related to the current results row
      const headerContainer = header.closest('div.eventClassHeader');
      if (headerContainer) {
        // Check if this header container is before the table containing our row
        const rowTable = row.closest('table');
        if (rowTable) {
          // Check if this header is linked to our results table
          let currentNode: Element | null = headerContainer;
          while (currentNode && currentNode !== rowTable) {
            currentNode = currentNode.nextElementSibling;
            if (!currentNode) break;
          }
          
          // If we reached the row's table, this is the correct class
          if (currentNode === rowTable) {
            return classText;
          }
        }
      }
    }
  }
  
  // Second priority: Look for any H3 headings that seem like class names
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
          let testNode: Element | null = header;
          while (testNode && testNode !== rowTable) {
            testNode = testNode.nextElementSibling;
            if (!testNode) break;
          }
          
          if (testNode === rowTable) {
            return headerText;
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
