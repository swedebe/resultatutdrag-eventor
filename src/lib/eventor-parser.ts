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
const extractBasicPositionInfo = (positionText: string): { position: number; total: number } => {
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
 * Extraherar tävlingsnamn och organisatör från HTML enligt bildens gröna ruta
 * Arrangörens namn har alltid "Tävlingens namn:" som prefix
 */
const extractEventAndOrganizerInfo = (html: string): { eventName: string; organizer: string } => {
  // Standardvärden om inget hittas
  let eventName = "Okänd tävling";
  let organizer = "";
  
  // Leta efter "Tävlingens namn:" i sidan (enligt den gröna ramen i bilden)
  const eventMatch = html.match(/Tävlingens namn:[^\n<]*([^<\n]+)/i);
  if (eventMatch && eventMatch[1]) {
    eventName = eventMatch[1].trim();
  }
  
  // Leta efter organisatören i närheten av tävlingsnamnet
  // Enligt bilden finns arrangören oftast under eller nära tävlingsnamnet
  const organizerMatch = html.match(/Arrangör(?:sorganisation)?:[^\n<]*([^<\n]+)/i);
  if (organizerMatch && organizerMatch[1]) {
    organizer = organizerMatch[1].trim();
  }
  
  // Om vi fortfarande inte har en organisatör, leta efter andra mönster
  if (!organizer) {
    const altOrganizerMatch = html.match(/Arrangerad av[^\n<]*([^<\n]+)/i);
    if (altOrganizerMatch && altOrganizerMatch[1]) {
      organizer = altOrganizerMatch[1].trim();
    }
  }
  
  // Om inget av ovanstående fungerar, leta i dokumentets struktur
  if (!eventName || !organizer) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    // Sök efter element som innehåller "Tävlingens namn:" eller "Arrangör:"
    const allElements = Array.from(doc.querySelectorAll("div, p, span, h1, h2, h3, h4, h5"));
    
    for (const element of allElements) {
      const text = element.textContent || "";
      
      if (!eventName && text.includes("Tävlingens namn:")) {
        const match = text.match(/Tävlingens namn:(.*?)(?:Arrangör|$)/i);
        if (match && match[1]) {
          eventName = match[1].trim();
        }
      }
      
      if (!organizer && text.includes("Arrangör")) {
        const match = text.match(/Arrangör(?:sorganisation)?:(.*)/i);
        if (match && match[1]) {
          organizer = match[1].trim();
        }
      }
    }
  }
  
  return { eventName, organizer };
};

/**
 * Extraherar klassnamn från dokumentet baserat på bildens röda ruta (blå text)
 */
const extractClassInfo = (doc: Document, row: Element): string => {
  // Leta först efter element med blå text (CSS class med storlek/färg som i bilden)
  const blueTitles = Array.from(doc.querySelectorAll(".eventheader, .classheader, h1, h2, h3"));
  
  for (const title of blueTitles) {
    const titleText = title.textContent?.trim() || "";
    // Vanliga klassmönster för orientering
    if (/^(Mycket lätt|Lätt|Medelsvår|Svår)\s+\d+\s+(Dam|Herr|D|H|Open)/.test(titleText) ||
        /^[HD]\d+/.test(titleText) ||
        /^Öppen \d+/i.test(titleText)) {
      
      // Kontrollera om denna rubrik är relaterad till tabellen/raden vi tittar på
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

/**
 * Extracts the course length from various sources
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
const extractEnhancedPositionInfo = (positionText: string, doc: Document, row: Element): { position: number; total: number } => {
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
    
    // Hitta tävlingens namn och arrangör med förbättrad metod
    const { eventName, organizer } = extractEventAndOrganizerInfo(html);
    console.log("Extracted event:", eventName);
    console.log("Extracted organizer:", organizer);
    
    // Använd förbättrad datumextrahering
    const eventDate = extractDate(html);
    
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
          const posInfo = extractEnhancedPositionInfo(firstCellText, doc, row);
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
