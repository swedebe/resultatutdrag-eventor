import * as XLSX from 'xlsx';
import { addLog } from '../components/LogComponent';
import { extractCourseInfo } from '@/lib/eventor-parser/course-utils';

export type ResultRow = {
  name: string;
  class: string;
  classType: string;
  eventId: string | number;
  eventName: string;
  date: string;
  time: string;
  position: number;
  organizer: string;
  timeInSeconds: number;
  timeAfterWinner: string;
  length?: number;
  totalParticipants?: number;
  eventType?: string;       
  personId?: string | number;
  birthYear?: string | number;
  started?: string | boolean;
  [key: string]: any;
};

// Hjälpfunktion för att vänta ett antal sekunder
const sleep = (seconds: number) => {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

export const processExcelFile = async (
  file: File, 
  setProgress: (value: number) => void, 
  setCurrentStatus: (status: string) => void,
  delaySeconds: number = 30
): Promise<ResultRow[]> => {
  setProgress(0);
  setCurrentStatus("Läser in fil...");
  
  // Read the Excel file
  const fileData = await file.arrayBuffer();
  const workbook = XLSX.read(fileData);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
  
  console.log("Parsed Excel data:", jsonData);
  
  setProgress(10);
  setCurrentStatus("Fil inläst, bearbetar data...");
  
  // Process each row
  const enrichedResults: ResultRow[] = [];
  
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    
    // Find eventId - can be either "Tävlings-id" or another column
    const eventId = row["Tävlings-id"] || row.eventId || null;
    
    if (!eventId) {
      console.warn("Row missing eventId, skipping:", row);
      continue;
    }
    
    // Prepare data for the result row
    let resultRow: ResultRow = {
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
      totalParticipants: 0,
      eventType: row["Arrangemangstyp"] || "",
      personId: row["Person-id"] || "",
      birthYear: row["Födelseår"] || "",
      started: row["Startat"] || ""
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
    
    setProgress(10 + Math.floor(80 * (i / jsonData.length)));
    setCurrentStatus(`Hämtar information för tävling ${eventId} (${i+1}/${jsonData.length})...`);
    
    try {
      // Fetch course length and participants from Eventor
      const currentEventorUrl = `https://eventor.orientering.se/Events/ResultList?eventId=${eventId}&groupBy=EventClass`;
      addLog(eventId, currentEventorUrl, "Påbörjar hämtning");
      
      const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(currentEventorUrl)}`);
      if (!response.ok) {
        addLog(eventId, currentEventorUrl, `Fel: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      addLog(eventId, currentEventorUrl, `OK: ${html.length} tecken`);
      
      // Create a temporary DOM for parsing
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      
      // Find the class
      const className = resultRow.class;
      addLog(eventId, currentEventorUrl, `Söker klass: "${className}"`);
      
      // Use the utility function to extract course info
      const courseInfo = extractCourseInfo(html, className);
      
      if (courseInfo.length > 0 && courseInfo.participants > 0) {
        addLog(eventId, currentEventorUrl, `Hittade via eventClassHeader: Längd=${courseInfo.length}m, Antal=${courseInfo.participants}`);
        resultRow.length = courseInfo.length;
        resultRow.totalParticipants = courseInfo.participants;
      } else {
        // Log that we couldn't find via the main method
        addLog(eventId, currentEventorUrl, `Kunde inte hitta via eventClassHeader, data saknas för klassen "${className}"`);
      }

      enrichedResults.push(resultRow);
      
      // Använd delay mellan anrop för att undvika rate limit
      if (i < jsonData.length - 1 && delaySeconds > 0) {
        const waitMessage = `Väntar ${delaySeconds} sekunder innan nästa anrop (för att undvika rate limiting)...`;
        setCurrentStatus(waitMessage);
        addLog(eventId, currentEventorUrl, waitMessage);
        await sleep(delaySeconds);
      }
    } catch (error) {
      console.error(`Fel vid hämtning för tävlings-id ${eventId}:`, error);
      const currentEventorUrl = `https://eventor.orientering.se/Events/ResultList?eventId=${eventId}&groupBy=EventClass`;
      addLog(eventId, currentEventorUrl, `Fel vid hämtning: ${error}`);
      // Add the row without course length and participant count
      enrichedResults.push(resultRow);
      
      // Använd delay även efter fel för att undvika rate limit
      if (i < jsonData.length - 1 && delaySeconds > 0) {
        const waitMessage = `Väntar ${delaySeconds} sekunder innan nästa anrop (för att undvika rate limiting)...`;
        setCurrentStatus(waitMessage);
        addLog(eventId, currentEventorUrl, waitMessage);
        await sleep(delaySeconds);
      }
    }
  }
  
  setProgress(100);
  setCurrentStatus("Klar!");
  
  return enrichedResults;
};

export const exportResultsToExcel = (results: ResultRow[]): void => {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(results);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resultat");
  
  // Export to file
  XLSX.writeFile(workbook, "berikade_resultat.xlsx");
};
