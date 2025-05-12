/**
 * Excel import and export operations
 */
import * as XLSX from 'xlsx';
import { ResultRow } from '@/types/results';
import { addLog } from '@/components/LogComponent';
import { saveLogToDatabase } from '@/services/database/resultRepository';
import { supabase } from '@/integrations/supabase/client';

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
 * @param runId Optional run ID for logging
 * @returns Map of eventId+className to participant count
 */
export const fetchClassParticipantCounts = async (
  eventIds: string[],
  apiKey: string,
  setStatus: (status: string) => void,
  delaySeconds: number = 1,
  runId?: string | null
): Promise<Map<string, number>> => {
  const participantCountMap = new Map<string, number>();
  let totalEvents = eventIds.length;
  let processedEvents = 0;
  
  // Constants - Note the trailing slash is removed to properly construct URLs
  const RENDER_PROXY_BASE_URL = 'https://eventor-proxy.onrender.com';
  
  for (const eventId of eventIds) {
    try {
      setStatus(`Hämtar klassdata för tävling ${eventId} (${processedEvents + 1}/${totalEvents})...`);
      
      // Use the results/event endpoint with POST
      const eventorApiEndpoint = `/results/event`;
      
      // Log the API call attempt
      addLog(eventId, `Eventor API: ${eventorApiEndpoint}`, `Anropar Eventor API via Render proxy...`);
      
      if (runId) {
        await saveLogToDatabase(
          runId,
          eventId.toString(),
          `Eventor API: ${eventorApiEndpoint}`,
          `Anropar Eventor API via Render proxy...`
        );
      }
      
      // Construct the full request URL
      const fullRequestUrl = `${RENDER_PROXY_BASE_URL}${eventorApiEndpoint}`;
      console.log(`Fetching class data using POST request to: ${fullRequestUrl}`);
      
      // DETAILED LOGGING: Log the full request details
      console.log(`======================== EVENTOR CLASS API REQUEST ========================`);
      console.log(`Request URL: ${fullRequestUrl}`);
      console.log(`Request Method: POST`);
      console.log(`Request Headers: Content-Type: application/json`);
      console.log(`Request Body: ${JSON.stringify({
        apiKey: "REDACTED_FOR_LOGGING",
        eventId,
        includeSplitTimes: false
      })}`);
      
      // Send a POST request to the Render proxy
      const response = await fetch(fullRequestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey,
          eventId,
          includeSplitTimes: false
        })
      });
      
      // DETAILED LOGGING: Log the response status
      console.log(`\n======================== EVENTOR CLASS API RESPONSE ========================`);
      console.log(`Response Status: ${response.status}`);
      console.log(`Response Status Text: ${response.statusText}`);
      console.log(`Response Headers: ${JSON.stringify([...response.headers.entries()])}`);
      
      if (!response.ok) {
        throw new Error(`Render proxy responded with status: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log(`Response from Render proxy:`, responseData);
      
      // UPDATED: Check the actual response structure and properly extract class information
      // First, check if we have the proper entries data structure
      if (responseData && responseData.EntryList && Array.isArray(responseData.EntryList.Entry)) {
        // We're getting entries data, use it to count participants per class
        const entries = responseData.EntryList.Entry;
        const classCounts = new Map<string, number>();
        
        // Group entries by class
        for (const entry of entries) {
          const className = entry.EventClass?.Name || 'Unknown';
          if (!classCounts.has(className)) {
            classCounts.set(className, 0);
          }
          classCounts.set(className, classCounts.get(className)! + 1);
        }
        
        // Log the counts and add to the participantCountMap
        addLog(eventId, `Eventor API: ${eventorApiEndpoint}`, `Hittade ${classCounts.size} klasser med totalt ${entries.length} deltagare`);
        
        if (runId) {
          await saveLogToDatabase(
            runId,
            eventId.toString(),
            `Eventor API: ${eventorApiEndpoint}`,
            `Hittade ${classCounts.size} klasser med totalt ${entries.length} deltagare`
          );
        }
        
        // Store each class count in the result map
        for (const [className, count] of classCounts.entries()) {
          const key = `${eventId}_${className}`;
          participantCountMap.set(key, count);
          
          addLog(eventId, `Eventor API: ${eventorApiEndpoint}`, `Klass ${className}: ${count} deltagare`);
          
          if (runId) {
            await saveLogToDatabase(
              runId,
              eventId.toString(),
              `Eventor API: ${eventorApiEndpoint}`,
              `Klass ${className}: ${count} deltagare`
            );
          }
        }
      } 
      // Alternative structure: Check for Event with ResultList (results endpoint)
      else if (responseData && responseData.Event && responseData.Event.EventClassList && 
          Array.isArray(responseData.Event.EventClassList.EventClass)) {
        
        addLog(eventId, `Eventor API: ${eventorApiEndpoint}`, `Hittade ${responseData.Event.EventClassList.EventClass.length} klasser`);
        
        if (runId) {
          await saveLogToDatabase(
            runId,
            eventId.toString(),
            `Eventor API: ${eventorApiEndpoint}`,
            `Hittade ${responseData.Event.EventClassList.EventClass.length} klasser`
          );
        }
        
        // Process each class in the response
        for (const eventClass of responseData.Event.EventClassList.EventClass) {
          const className = eventClass.Name;
          
          // Count the number of results in this class
          let numberOfEntries = 0;
          if (eventClass.ResultList && Array.isArray(eventClass.ResultList.Result)) {
            numberOfEntries = eventClass.ResultList.Result.length;
          }
          
          // Create a unique key combining eventId and className
          const key = `${eventId}_${className}`;
          participantCountMap.set(key, numberOfEntries);
          
          addLog(eventId, `Eventor API: ${eventorApiEndpoint}`, `Klass ${className}: ${numberOfEntries} deltagare`);
          
          if (runId) {
            await saveLogToDatabase(
              runId,
              eventId.toString(),
              `Eventor API: ${eventorApiEndpoint}`,
              `Klass ${className}: ${numberOfEntries} deltagare`
            );
          }
        }
      } else {
        // Try to extract any useful information from the response for debugging
        console.warn(`Unknown response data structure received:`, responseData);
        
        // Check if we can find classes or participants in any other format
        let classFound = false;
        
        // Add detailed logging of the response structure to help debug
        console.log("Response data keys:", Object.keys(responseData));
        if (responseData.Event) {
          console.log("Event keys:", Object.keys(responseData.Event));
        }
        
        // Try a more general approach to look for any class data
        if (responseData.Event && responseData.Event.Name) {
          addLog(eventId, `Eventor API: ${eventorApiEndpoint}`, 
            `Hittade event "${responseData.Event.Name}" men ingen klassdata hittades i förväntad struktur`);
          
          if (runId) {
            await saveLogToDatabase(
              runId,
              eventId.toString(),
              `Eventor API: ${eventorApiEndpoint}`,
              `Hittade event "${responseData.Event.Name}" men ingen klassdata hittades i förväntad struktur`
            );
          }
        } else {
          addLog(eventId, `Eventor API: ${eventorApiEndpoint}`, `Ogiltig svardata: Inga klasser hittades`);
          
          if (runId) {
            await saveLogToDatabase(
              runId,
              eventId.toString(),
              `Eventor API: ${eventorApiEndpoint}`,
              `Ogiltig svardata: Inga klasser hittades`
            );
          }
        }
      }
      
      processedEvents++;
      
      // Add delay between API calls to prevent rate limiting
      if (processedEvents < totalEvents && delaySeconds > 0) {
        setStatus(`Väntar ${delaySeconds} sekunder före nästa anrop...`);
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      }
      
    } catch (error: any) {
      console.error(`Error fetching class data for event ${eventId}:`, error);
      
      addLog(eventId, `Eventor API: results/event`, `Fel vid hämtning av klassdata: ${error.message || error}`);
      
      if (runId) {
        await saveLogToDatabase(
          runId,
          eventId.toString(),
          `Eventor API: results/event`,
          `Fel vid hämtning av klassdata: ${error.message || error}`
        );
      }
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
