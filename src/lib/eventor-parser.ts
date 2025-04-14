
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
  
  // Försök hitta km-format (t.ex. "4.5 km")
  let kmMatch = lengthText.match(/([\d.]+)\s*km/i);
  if (kmMatch) {
    return Math.round(parseFloat(kmMatch[1]) * 1000);
  }
  
  // Försök hitta m-format (t.ex. "4 500 m" eller "4500m")
  let mMatch = lengthText.match(/([\d\s]+)\s*m/i);
  if (mMatch) {
    return parseInt(mMatch[1].replace(/\s/g, ''), 10);
  }
  
  // Sista försöket - hitta bara numret
  let numMatch = lengthText.match(/[\d\s.]+/);
  if (numMatch) {
    const num = parseFloat(numMatch[0].replace(/\s/g, ''));
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
 * Försök hitta arrangör på många olika sätt
 */
const extractOrganizer = (doc: Document): string => {
  // Metod 1: Leta efter specifikt element med arrangör klass
  const organizerElement = doc.querySelector(".organiser") || 
                         doc.querySelector(".organizer") || 
                         doc.querySelector("[id*='organiser']") || 
                         doc.querySelector("[id*='organizer']");
  
  if (organizerElement && organizerElement.textContent) {
    return organizerElement.textContent.trim();
  }
  
  // Metod 2: Sök efter text som innehåller "arrangör:" eller "organizer:"
  const arrangerLabels = Array.from(doc.querySelectorAll("label, th, dt, strong, b"));
  for (const label of arrangerLabels) {
    if (label.textContent && 
        (label.textContent.toLowerCase().includes("arrangör") || 
         label.textContent.toLowerCase().includes("organizer"))) {
      const nextSibling = label.nextElementSibling;
      if (nextSibling && nextSibling.textContent) {
        return nextSibling.textContent.trim();
      }
      
      // Kolla om det finns text efter kolon
      const colonText = label.textContent.split(":");
      if (colonText.length > 1) {
        return colonText[1].trim();
      }
    }
  }
  
  // Metod 3: Leta i metataggarna
  const metaOrg = doc.querySelector('meta[name="organization"]') || 
                doc.querySelector('meta[property="og:site_name"]');
  if (metaOrg && metaOrg.getAttribute("content")) {
    return metaOrg.getAttribute("content") || "";
  }
  
  return "";
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
    
    // Hitta tävlingens namn med vår nya metod
    const eventName = extractEventName(html);
    
    // Använd förbättrad datumextrahering
    const eventDate = extractDate(html);
    
    // Leta efter arrangör med förbättrad metod
    const organizer = extractOrganizer(doc);
    
    // Hitta resultat för den angivna klubben
    const tables = doc.querySelectorAll("table");
    
    tables.forEach(table => {
      // Kontrollera om det här är en resultattabell
      const rows = table.querySelectorAll("tr");
      
      // Hoppa över tabeller med för få rader
      if (rows.length < 2) return;
      
      // Försök hitta klassinformation
      let currentClass = "";
      
      // Metod 1: Kolla föregående element för klassinformation
      const prevElement = table.previousElementSibling;
      if (prevElement && (prevElement.tagName === "H2" || prevElement.tagName === "H3" || prevElement.tagName === "H4")) {
        currentClass = prevElement.textContent?.trim() || "";
        // Ta bort prefix som "Klass " eller "Resultat "
        currentClass = currentClass.replace(/^(Klass|Resultat|Class)\s+/i, "");
      }
      
      // Metod 2: Kolla om det finns klass-information i tabellen själv
      if (!currentClass) {
        const firstRow = rows[0];
        if (firstRow) {
          const cells = firstRow.querySelectorAll("th");
          for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            const cellText = cell?.textContent?.trim() || "";
            if (cellText.toLowerCase() === "klass" || cellText.toLowerCase() === "class") {
              const nextCell = cells[i+1];
              if (nextCell) {
                currentClass = nextCell.textContent?.trim() || "";
              }
            }
          }
        }
      }
      
      // Metod 3: Leta efter klass i tabellcaption
      if (!currentClass) {
        const caption = table.querySelector("caption");
        if (caption && caption.textContent) {
          const captionText = caption.textContent.trim();
          const classMatch = captionText.match(/\b(H\d+|D\d+|U\d+|Öppen \d+|Open \d+)\b/);
          if (classMatch) {
            currentClass = classMatch[1];
          }
        }
      }
      
      // Gå igenom raderna och leta efter klubbnamnet
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll("td");
        
        // Hoppa över rader med för få celler
        if (cells.length < 3) continue;
        
        const rowText = row.textContent || "";
        
        // Kontrollera om denna rad är för den angivna klubben
        if (rowText.includes(clubName)) {
          // Hitta informationen vi vill extrahera
          let position = 0;
          let totalParticipants = 0;
          let name = "";
          let time = "";
          let diff = "";
          let length = 0;
          let classValue = currentClass; // Använd den hittade klassen
          
          // Förbättrad namnhämtning
          // Leta efter klubbnamnet och använd cellen till vänster för namn
          for (let j = 0; j < cells.length; j++) {
            const cellText = cells[j].textContent?.trim() || "";
            
            if (cellText === clubName && j > 0) {
              name = cells[j-1].textContent?.trim() || "";
              break;
            }
          }
          
          // Om vi fortfarande inte har ett namn, försök med vanlig metod
          if (!name) {
            for (let j = 0; j < cells.length; j++) {
              const cell = cells[j];
              const cellText = cell.textContent?.trim() || "";
              
              // Leta efter namn i celler som inte innehåller siffror/specialtecken
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
          
          // Samla in övriga data
          for (let j = 0; j < cells.length; j++) {
            const cellText = cells[j].textContent?.trim() || "";
            
            // Leta specifikt efter placering i första kolumnen
            if (j === 0 && cellText.match(/^\d+/)) {
              // Första kolumnen antas vara placering
              const posInfo = extractPositionInfo(cellText);
              position = posInfo.position;
              totalParticipants = posInfo.total;
            } 
            // Leta efter tid (format: MM:SS eller HH:MM:SS)
            else if (cellText.match(/^\d+:\d+/)) {
              time = cellText;
            } 
            // Leta efter tidsdifferens (börjar med +)
            else if (cellText.startsWith("+")) {
              diff = cellText;
            } 
            // Leta efter banlängd
            else if (cellText.includes("km") || (cellText.includes("m") && !cellText.includes("min"))) {
              length = extractCourseLength(cellText);
            }
            // Leta efter klass (om inte redan hittad)
            else if (!classValue && (cellText.match(/^[HD]\d+/) || cellText.match(/^Öppen \d+/) || cellText.match(/^Open \d+/))) {
              classValue = cellText;
            }
          }
          
          // Om vi inte har en total, använd antalet rader som en uppskattning
          if (totalParticipants === 0) {
            totalParticipants = rows.length - 1; // Minus rubrikraden
          }
          
          // Lägg till resultat
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
    
    return results;
  } catch (error) {
    console.error("Error parsing Eventor HTML:", error);
    return [];
  }
};
