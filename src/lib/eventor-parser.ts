
/**
 * Parser för att extrahera resultat från Eventor HTML.
 * 
 * Notera: Detta är en förenklad parser som försöker hitta resultat i HTML från Eventor.
 * Den kan behöva justeras beroende på Eventors exakta HTML-struktur.
 */

/**
 * Konverterar tid i format "MM:SS" eller "HH:MM:SS" till sekunder
 */
const timeToSeconds = (timeString: string): number => {
  if (!timeString) return 0;
  
  const parts = timeString.split(':').map(Number);
  
  if (parts.length === 3) {
    // Format: HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // Format: MM:SS
    return parts[0] * 60 + parts[1];
  }
  
  return 0;
};

/**
 * Extraherar information från placeringskolumnen, t.ex. "1 (av 24)"
 */
const extractPositionInfo = (positionText: string): { position: number; total: number } => {
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
 * Extraherar banlängd från text, t.ex. "4.5 km" eller "4 500 m" till meter
 */
const extractCourseLength = (lengthText: string): number => {
  if (!lengthText) return 0;
  
  // Rensa bort oönskade tecken och trimma
  const cleanedText = lengthText.replace(/[^\d\s.,km]/gi, '').trim();
  
  // Försök hitta km-format (t.ex. "4.5 km")
  let kmMatch = cleanedText.match(/([\d.,]+)\s*km/i);
  if (kmMatch) {
    // Hantera både punkt och komma som decimalavgränsare
    const kmValue = kmMatch[1].replace(',', '.');
    return Math.round(parseFloat(kmValue) * 1000);
  }
  
  // Försök hitta m-format (t.ex. "4 500 m" eller "4500m")
  let mMatch = cleanedText.match(/([\d\s]+)\s*m/i);
  if (mMatch) {
    return parseInt(mMatch[1].replace(/\s/g, ''), 10);
  }
  
  // Sista försöket - hitta bara numret
  let numMatch = cleanedText.match(/[\d\s.,]+/);
  if (numMatch) {
    const numStr = numMatch[0].replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(numStr);
    // Om numret är litet, anta att det är i km
    if (num < 100) {
      return Math.round(num * 1000);
    }
    return Math.round(num);
  }
  
  return 0;
};

/**
 * Extraherar datum från olika format som kan finnas i Eventors HTML
 */
const extractDate = (html: string): string => {
  // Försök först hitta datum i ISO-format (YYYY-MM-DD)
  const isoMatch = html.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];
  
  // Försök hitta datum i format "DD månad YYYY" (svenska)
  const monthNames = ["januari", "februari", "mars", "april", "maj", "juni", 
                     "juli", "augusti", "september", "oktober", "november", "december"];
  
  const swedishDateRegex = new RegExp(
    `\\b(\\d{1,2})\\s+(${monthNames.join('|')})\\s+(\\d{4})\\b`, 'i'
  );
  
  const swedishMatch = html.match(swedishDateRegex);
  if (swedishMatch) {
    const day = swedishMatch[1].padStart(2, '0');
    const monthIndex = monthNames.findIndex(m => 
      m.toLowerCase() === swedishMatch[2].toLowerCase()
    ) + 1;
    const month = String(monthIndex).padStart(2, '0');
    const year = swedishMatch[3];
    return `${year}-${month}-${day}`;
  }
  
  // Sista försöket - hitta datum i rubrikområdet
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Kolla om det finns datum i sidhuvudet
  const headers = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5'));
  for (const header of headers) {
    const text = header.textContent || '';
    // Försök med ISO-format igen
    const headerIsoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (headerIsoMatch) return headerIsoMatch[1];
    
    // Försök med svenskt format igen
    const headerSwedishMatch = text.match(swedishDateRegex);
    if (headerSwedishMatch) {
      const day = headerSwedishMatch[1].padStart(2, '0');
      const monthIndex = monthNames.findIndex(m => 
        m.toLowerCase() === headerSwedishMatch[2].toLowerCase()
      ) + 1;
      const month = String(monthIndex).padStart(2, '0');
      const year = headerSwedishMatch[3];
      return `${year}-${month}-${day}`;
    }
  }
  
  // Om inget datum hittades
  return "";
};

/**
 * Extraherar tävlingsnamn från HTML och tar bort eventuell "Officiell resultatlista för"-prefix
 */
const extractEventName = (html: string): string => {
  // Remove "Officiell resultatlista för" as a prefix for all methods
  const cleanEventName = (name: string) => 
    name.replace(/^Officiell resultatlista för\s*/i, "").trim();

  // Försöka hitta tävlingsnamnet i URL-parameter "Tävlingens namn:"
  const eventNameMatch = html.match(/Tävlingens namn:\s*([^<\n]+)/i);
  if (eventNameMatch && eventNameMatch[1]) {
    return cleanEventName(eventNameMatch[1]);
  }

  // Check for "Tävlingens namn:" label in the page
  const nameMatch = html.match(/Tävlingens namn:[\s\n]*([^<\r\n]+)/i);
  if (nameMatch && nameMatch[1]) {
    return cleanEventName(nameMatch[1].trim());
  }

  // Försök hitta tävlingsnamnet i en rubrik
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  // Kolla om det finns en huvudrubrik
  const h1 = doc.querySelector("h1");
  if (h1 && h1.textContent) {
    return cleanEventName(h1.textContent);
  }
  
  // Kolla meta-titel
  const titleTag = doc.querySelector("title");
  if (titleTag && titleTag.textContent) {
    return cleanEventName(
      titleTag.textContent
        .replace(/Eventor\s*[-:]\s*/i, "")
        .trim()
    );
  }
  
  // Kolla eventuella meta-taggar
  const metaDescription = doc.querySelector('meta[name="description"]');
  if (metaDescription && metaDescription.getAttribute("content")) {
    const content = metaDescription.getAttribute("content") || "";
    return cleanEventName(content);
  }
  
  // Om inget namn hittades
  return "Okänd tävling";
};

/**
 * Improved extraction of class names from the page
 */
const extractClassInfo = (doc: Document, row: Element): string => {
  // Method 1: Find class headers that appear before result tables
  // Look for DOM structure like the one in the image
  const classHeadings = doc.querySelectorAll('h2, h3, strong');
  for (const heading of classHeadings) {
    const headingText = heading.textContent?.trim() || "";
    // Check if the heading matches common orienteering class patterns
    if (/^(Mycket lätt|Lätt|Medelsvår|Svår)\s+\d+\s+(Dam|Herr|D|H|Open)/.test(headingText) ||
        /^[HD]\d+/.test(headingText) ||
        /^Öppen \d+/i.test(headingText)) {
      
      // Check if this heading is related to the current row
      // Either by being just before the table or having some other connection
      const headingParent = heading.parentElement;
      const rowTable = row.closest('table');
      
      if (headingParent && rowTable && 
          (headingParent.nextElementSibling === rowTable || 
           headingParent.contains(rowTable) ||
           headingParent.previousElementSibling === rowTable)) {
        return headingText;
      }
    }
  }
  
  // Method 2: Look for class info in table header cells
  const table = row.closest('table');
  if (table) {
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
  
  // Method 3: Look for a class identifier in the page content
  // This matches patterns like "Mycket lätt 2 Dam", "H21", etc.
  const tableCaption = table?.querySelector('caption');
  if (tableCaption && tableCaption.textContent) {
    const captionText = tableCaption.textContent.trim();
    if (/^(Mycket lätt|Lätt|Medelsvår|Svår)\s+\d+\s+(Dam|Herr)/.test(captionText) ||
        /^[HD]\d+/.test(captionText) ||
        /^Öppen \d+/i.test(captionText)) {
      return captionText;
    }
  }
  
  // Method 4: Check if there's text right above the table with class info
  const prevElement = table?.previousElementSibling;
  if (prevElement && prevElement.textContent) {
    const text = prevElement.textContent.trim();
    if (/^(Mycket lätt|Lätt|Medelsvår|Svår)\s+\d+\s+(Dam|Herr)/.test(text) ||
        /^[HD]\d+/.test(text) ||
        /^Öppen \d+/i.test(text)) {
      return text;
    }
  }

  // Method 5: Try to find class name in URL or document location
  const pageUrl = doc.URL || '';
  const classMatch = pageUrl.match(/[?&]class=([^&]+)/i);
  if (classMatch && classMatch[1]) {
    return decodeURIComponent(classMatch[1]);
  }
  
  return "";
};

/**
 * Improved extraction of the organizer from the page
 */
const extractOrganizer = (html: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  // Method 1: Look for organizer in labeled fields (as shown in the image)
  const organizerLabelMatch = html.match(/Arrangörsorganisation:[\s\n]*([^<\r\n]+)/i);
  if (organizerLabelMatch && organizerLabelMatch[1]) {
    return organizerLabelMatch[1].trim();
  }
  
  // Method 2: Look for specific element with organizer class
  const organizerElement = doc.querySelector(".organiser") || 
                         doc.querySelector(".organizer") || 
                         doc.querySelector("[id*='organiser']") || 
                         doc.querySelector("[id*='organizer']");
  
  if (organizerElement && organizerElement.textContent) {
    return organizerElement.textContent.trim();
  }
  
  // Method 3: Look for table rows with organizer info
  const allTables = doc.querySelectorAll('table');
  for (const table of allTables) {
    const rows = table.querySelectorAll('tr');
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const firstCellText = cells[0].textContent?.toLowerCase() || '';
        if (firstCellText.includes('arrangör') || 
            firstCellText.includes('organiser') || 
            firstCellText.includes('organiz')) {
          return cells[1].textContent?.trim() || '';
        }
      }
    }
  }
  
  // Method 4: Look for elements containing "Arrangör:" or similar
  const allText = doc.body.innerText;
  const organizerMatches = [
    allText.match(/\barrangör\s*:?\s*([^.,\n]+)/i),
    allText.match(/\barrangörsorganisation\s*:?\s*([^.,\n]+)/i),
    allText.match(/\borganiser\s*:?\s*([^.,\n]+)/i)
  ];
  
  for (const match of organizerMatches) {
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return "";
};

/**
 * Improved extraction of course length
 */
const findCourseLength = (row: Element, doc: Document, html: string): number => {
  // Method 1: Look for the length in headers or sub-headers (as shown in the image)
  const classHeadings = doc.querySelectorAll('h2, h3, h4, strong');
  for (const heading of classHeadings) {
    if (!heading.textContent) continue;
    
    const headingText = heading.textContent.trim();
    // Look for patterns like "2 190 m, 11 startande" as shown in image
    const lengthMatch = headingText.match(/(\d[\d\s]+)\s*m,\s*\d+\s+startande/i);
    if (lengthMatch && lengthMatch[1]) {
      return parseInt(lengthMatch[1].replace(/\s/g, ''));
    }
  }
  
  // Method 2: Look for length in specific table structures
  const table = row.closest('table');
  if (table) {
    const headerRow = table.querySelector('tr');
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
              return extractCourseLength(lengthText);
            }
          }
        }
      }
    }
  }
  
  // Method 3: Look for length in text associated with class info
  const classText = extractClassInfo(doc, row);
  const tableHeader = table?.previousElementSibling;
  if (tableHeader && tableHeader.textContent) {
    // Check table header text for length info
    const headerText = tableHeader.textContent;
    // Match patterns like "2 190 m" as seen in the image
    const lengthMatch = headerText.match(/(\d[\d\s]+)\s*m/i);
    if (lengthMatch && lengthMatch[1]) {
      return parseInt(lengthMatch[1].replace(/\s/g, ''));
    }
  }
  
  // Method 4: Search for text in HTML that matches pattern like "2 190 m, 11 startande"
  const lengthPatternMatch = html.match(/(\d[\d\s]+)\s*m,\s*\d+\s+startande/gi);
  if (lengthPatternMatch && lengthPatternMatch.length > 0) {
    for (const match of lengthPatternMatch) {
      const lengthPart = match.match(/(\d[\d\s]+)\s*m/i);
      if (lengthPart && lengthPart[1]) {
        return parseInt(lengthPart[1].replace(/\s/g, ''));
      }
    }
  }
  
  return 0;
};

/**
 * Improved extraction of position and total participants
 */
const extractPositionInfo = (positionText: string, doc: Document, row: Element): { position: number; total: number } => {
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

/**
 * Huvudfunktion för att parsa HTML från Eventor
 */
export const parseEventorResults = (html: string, clubName: string): any[] => {
  const results: any[] = [];
  
  try {
    // Skapa en temporär div för att parsa HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    // Hitta tävlingens namn
    const eventName = extractEventName(html);
    
    // Använd förbättrad datumextrahering
    const eventDate = extractDate(html);
    
    // Leta efter arrangör med förbättrad metod
    const organizer = extractOrganizer(html);
    console.log("Extracted organizer:", organizer);
    
    // Hitta resultat för den angivna klubben
    const tables = doc.querySelectorAll("table");
    
    tables.forEach(table => {
      // Kontrollera om det här är en resultattabell
      const rows = table.querySelectorAll("tr");
      
      // Hoppa över tabeller med för få rader
      if (rows.length < 2) return;
      
      // Store class and length info at the table level
      let tableClass = "";
      let tableLength = 0;
      
      // Try to find class and length from table caption or previous element
      const tableCaption = table.querySelector('caption');
      const prevElement = table.previousElementSibling;
      
      // Check previous element for class/length info
      if (prevElement && prevElement.textContent) {
        const prevText = prevElement.textContent.trim();
        
        // Look for class pattern (like "Mycket lätt 2 Dam" in image)
        if (/^(Mycket lätt|Lätt|Medelsvår|Svår)\s+\d+\s+(Dam|Herr)/.test(prevText) ||
            /^[HD]\d+/.test(prevText) ||
            /^Öppen \d+/i.test(prevText)) {
          tableClass = prevText;
        }
        
        // Look for length pattern (like "2 190 m, 11 startande" in image)
        const lengthMatch = prevText.match(/(\d[\d\s]+)\s*m/i);
        if (lengthMatch && lengthMatch[1]) {
          tableLength = parseInt(lengthMatch[1].replace(/\s/g, ''));
        }
      }
      
      // Get total participants for position calculations
      const totalParticipantsInTable = rows.length - 1; // Minus header row
      
      // Gå igenom raderna och leta efter klubbnamnet
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowText = row.textContent || "";
        
        // Kontrollera om denna rad är för den angivna klubben
        if (rowText.includes(clubName)) {
          console.log("Found row with club name:", rowText);
          const cells = row.querySelectorAll("td");
          
          // Hoppa över rader med för få celler
          if (cells.length < 3) continue;
          
          // Hitta informationen vi vill extrahera
          let position = 0;
          let totalParticipants = 0;
          let name = "";
          let time = "";
          let diff = "";
          let classValue = tableClass; // Use table-level class if available
          
          // If we don't have a class value from the table, try to extract it specifically
          if (!classValue) {
            classValue = extractClassInfo(doc, row);
            console.log("Extracted class:", classValue);
          }
          
          // For course length, first try table-level length, then per-row extraction
          let length = tableLength;
          if (!length) {
            length = findCourseLength(row, doc, html);
            console.log("Extracted length:", length);
          }
          
          // Improved position extraction
          const firstCellText = cells[0]?.textContent?.trim() || '';
          const posInfo = extractPositionInfo(firstCellText, doc, row);
          position = posInfo.position;
          
          // If no total participants from position info, use table row count
          totalParticipants = posInfo.total > 0 ? posInfo.total : totalParticipantsInTable;
          
          // Improved name extraction
          for (let j = 0; j < cells.length; j++) {
            const cellText = cells[j].textContent?.trim() || "";
            
            if (cellText === clubName && j > 0) {
              name = cells[j-1].textContent?.trim() || "";
              break;
            }
          }
          
          // If we still don't have a name, try an alternative method
          if (!name) {
            for (let j = 0; j < cells.length; j++) {
              const cell = cells[j];
              const cellText = cell.textContent?.trim() || "";
              
              // Look for name in cells that don't contain numbers/special chars
              if (j > 0 && j < cells.length - 2 && 
                  !cellText.match(/^\d/) && 
                  !cellText.includes(":") && 
                  cellText !== clubName &&
                  !/^[+0-9]+$/.test(cellText)) {
                name = cellText;
                break;
              }
            }
          }
          
          // Collect other data
          for (let j = 0; j < cells.length; j++) {
            const cellText = cells[j].textContent?.trim() || "";
            
            // Look for time (format: MM:SS or HH:MM:SS)
            if (cellText.match(/^\d+:\d+/)) {
              time = cellText;
            } 
            // Look for time difference (starts with +)
            else if (cellText.startsWith("+")) {
              diff = cellText;
            }
          }
          
          // Add the result
          results.push({
            name,
            class: classValue,
            length,
            time,
            diff,
            position,
            totalParticipants,
            eventName,
            date: eventDate,
            organizer,
            timeInSeconds: timeToSeconds(time),
            diffInSeconds: timeToSeconds(diff.replace("+", ""))
          });
        }
      }
    });
    
    console.log("Parsed results:", results);
    return results;
  } catch (error) {
    console.error("Error parsing Eventor HTML:", error);
    return [];
  }
};
