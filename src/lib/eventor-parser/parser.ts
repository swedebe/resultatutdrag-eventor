
/**
 * Main parser för att extrahera resultat från Eventor HTML.
 */

import { timeToSeconds } from "./time-utils";
import { extractEnhancedPositionInfo } from "./position-utils";
import { findCourseLength } from "./course-utils";
import { extractDate } from "./date-utils";
import { extractEventAndOrganizerInfo } from "./event-utils";
import { extractClassInfo } from "./class-utils";

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
