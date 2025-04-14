
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
  const match = positionText.match(/(\d+).*?(\d+)/);
  
  if (match && match.length >= 3) {
    return {
      position: parseInt(match[1], 10),
      total: parseInt(match[2], 10)
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
 * Huvudfunktion för att parsa HTML från Eventor
 */
export const parseEventorResults = (html: string, clubName: string): any[] => {
  const results: any[] = [];
  
  try {
    // Skapa en temporär div för att parsa HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    // Hitta tävlingens namn och datum
    const eventName = doc.querySelector("h1")?.textContent?.trim() || "Okänd tävling";
    
    // Försök hitta datum - olika möjliga format
    let eventDate = "";
    const dateElement = doc.querySelector("h2") || doc.querySelector(".date") || doc.querySelector(".eventDate");
    if (dateElement) {
      const dateText = dateElement.textContent || "";
      const dateMatch = dateText.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        eventDate = dateMatch[0];
      }
    }
    
    // Leta efter arrangör
    let organizer = "";
    const organizerElement = doc.querySelector(".organiser") || doc.querySelector(".organizer");
    if (organizerElement) {
      organizer = organizerElement.textContent?.trim() || "";
    }
    
    // Hitta resultat för den angivna klubben
    const tables = doc.querySelectorAll("table");
    
    tables.forEach(table => {
      // Kontrollera om det här är en resultattabell
      const rows = table.querySelectorAll("tr");
      
      // Hoppa över tabeller med för få rader
      if (rows.length < 2) return;
      
      // Försök hitta klassinformation
      let currentClass = "";
      const prevElement = table.previousElementSibling;
      if (prevElement && (prevElement.tagName === "H2" || prevElement.tagName === "H3")) {
        currentClass = prevElement.textContent?.trim() || "";
      }
      
      // Om vi inte hittade klassen, försök hitta den från tabellens rubrik
      if (!currentClass) {
        const firstRow = rows[0];
        const firstCell = firstRow.querySelector("th");
        if (firstCell && firstCell.textContent?.includes("Klass")) {
          const classCell = firstRow.querySelectorAll("th")[1];
          if (classCell) {
            currentClass = classCell.textContent?.trim() || "";
          }
        }
      }
      
      // Gå igenom raderna och leta efter klubbnamnet
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll("td");
        
        // Hoppa över rader med för få celler
        if (cells.length < 5) continue;
        
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
          
          // Olika tabeller kan ha olika kolumnordning, så vi försöker vara flexibla
          for (let j = 0; j < cells.length; j++) {
            const cellText = cells[j].textContent?.trim() || "";
            
            if (j === 0 && cellText.match(/^\d+/)) {
              // Första kolumnen antas vara placering
              const posInfo = extractPositionInfo(cellText);
              position = posInfo.position;
              totalParticipants = posInfo.total;
            } else if (cellText === clubName) {
              // Klubbkolumnen - namnet är ofta i föregående kolumn
              if (j > 0) {
                name = cells[j - 1].textContent?.trim() || "";
              }
            } else if (cellText.match(/^\d+:\d+/)) {
              // Ser ut som en tid (HH:MM:SS eller MM:SS)
              time = cellText;
            } else if (cellText.startsWith("+")) {
              // Ser ut som en tidsdifferens
              diff = cellText;
            } else if (cellText.includes("km") || cellText.includes("m")) {
              // Kan vara banlängd
              length = extractCourseLength(cellText);
            }
          }
          
          // Om vi inte har en total, använd antalet rader som en uppskattning
          if (totalParticipants === 0) {
            totalParticipants = rows.length - 1; // Minus rubrikraden
          }
          
          // Lägg till resultat
          results.push({
            name,
            class: currentClass,
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
