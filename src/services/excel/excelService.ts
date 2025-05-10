
/**
 * Excel import and export operations
 */
import * as XLSX from 'xlsx';
import { ResultRow } from '@/types/results';

/**
 * Parse Excel file into JSON data
 */
export const parseExcelFile = async (file: File): Promise<any[]> => {
  const fileData = await file.arrayBuffer();
  const workbook = XLSX.read(fileData);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
  
  console.log("Parsed Excel data:", jsonData);
  return jsonData;
};

/**
 * Map raw Excel data to ResultRow format
 */
export const mapExcelRowToResultRow = (row: any): ResultRow => {
  // Find eventId - can be either "Tävlings-id" or another column
  const eventId = row["Tävlings-id"] || row.eventId || null;
  
  if (!eventId) {
    console.warn("Row missing eventId, skipping:", row);
    throw new Error("Missing eventId in row");
  }
  
  // Prepare data for the result row
  const resultRow: ResultRow = {
    eventId: eventId,
    eventName: row["Tävling"] || row.eventName || "",
    organizer: row["Arrangör"] || row.organizer || "",
    date: row["Datum"] || row.date || "",
    class: row["Klass"] || row.class || "",
    classType: row["Klasstyp"] || row.classType || "",
    name: `${row["Förnamn"] || ""} ${row["Efternamn"] || ""}`.trim() || row.name || "",
    position: parseInt(row["Placering"] || "0", 10) || 0,
    time: row["Tid"] || row.time || "",
    timeAfterWinner: row["Tid efter segraren"] || "",
    timeInSeconds: 0,
    length: 0,
    totalParticipants: 0, // This will store the number of starters
    eventType: row["Arrangemangstyp"] || "",
    personId: row["Person-id"] || "",
    birthYear: row["Födelseår"] || "",
    started: row["Startat"] || "",
    antalStartande: row["Antal startande"] || "" // Add new field for Swedish display
  };
  
  // Convert time to seconds
  const timeParts = resultRow.time.split(":");
  let timeInSeconds = 0;
  if (timeParts.length === 2) {
    timeInSeconds = parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1], 10);
  } else if (timeParts.length === 3) {
    timeInSeconds = parseInt(timeParts[0], 10) * 3600 + parseInt(timeParts[1], 10) * 60 + parseInt(timeParts[2], 10);
  }
  resultRow.timeInSeconds = timeInSeconds;
  
  return resultRow;
};

/**
 * Export ResultRow array to Excel file
 */
export const exportResultsToExcel = (results: ResultRow[]): void => {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(results);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resultat");
  
  // Export to file
  XLSX.writeFile(workbook, "berikade_resultat.xlsx");
};

/**
 * Fetch class participant counts from Eventor API for all events
 * @param eventIds Array of unique event IDs
 * @param apiKey Eventor API key
 * @param setStatus Function to update status for user feedback
 * @param delaySeconds Delay between API calls in seconds
 * @returns Map of eventId+className to participant count
 */
export const fetchClassParticipantCounts = async (
  eventIds: string[],
  apiKey: string,
  setStatus: (status: string) => void,
  delaySeconds: number = 1
): Promise<Map<string, number>> => {
  const participantCountMap = new Map<string, number>();
  let totalEvents = eventIds.length;
  let processedEvents = 0;
  
  for (const eventId of eventIds) {
    try {
      setStatus(`Hämtar klassdata för tävling ${eventId} (${processedEvents + 1}/${totalEvents})...`);
      const response = await fetch(`https://eventor-proxy.onrender.com/eventor/api/classes/event?eventId=${eventId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ApiKey': apiKey
        }
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch classes for event ${eventId}:`, response.statusText);
        continue;
      }
      
      // Parse the XML response
      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      // Extract class data
      const classElements = xmlDoc.getElementsByTagName('ClassList')[0]?.getElementsByTagName('Class') || [];
      
      for (let i = 0; i < classElements.length; i++) {
        const classElement = classElements[i];
        const className = classElement.getElementsByTagName('Name')[0]?.textContent || '';
        const numberOfEntries = parseInt(classElement.getElementsByTagName('NumberOfEntries')[0]?.textContent || '0', 10);
        
        // Create a unique key combining eventId and className
        const key = `${eventId}_${className}`;
        participantCountMap.set(key, numberOfEntries);
      }
      
      processedEvents++;
      
      // Add delay between API calls to prevent rate limiting
      if (processedEvents < totalEvents && delaySeconds > 0) {
        setStatus(`Väntar ${delaySeconds} sekunder före nästa anrop...`);
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      }
      
    } catch (error) {
      console.error(`Error fetching class data for event ${eventId}:`, error);
    }
  }
  
  return participantCountMap;
};

/**
 * Update result rows with participant counts
 * @param results Array of result rows
 * @param participantCountMap Map of eventId+className to participant count
 * @returns Updated array of result rows
 */
export const updateResultsWithParticipantCounts = (
  results: ResultRow[],
  participantCountMap: Map<string, number>
): ResultRow[] => {
  return results.map(row => {
    const key = `${row.eventId}_${row.class}`;
    const count = participantCountMap.get(key);
    
    return {
      ...row,
      totalParticipants: count || 0,
      antalStartande: count ? count.toString() : "Ej hittad"
    };
  });
};
