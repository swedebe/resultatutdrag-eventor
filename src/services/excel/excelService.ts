
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
    // Store the raw started value without any conversion
    started: row["Startat"], // No conversion, keep original value exactly as is
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
  
  // UPDATED: Connect directly to the Render proxy
  const RENDER_PROXY_BASE_URL = 'https://eventor-proxy.onrender.com';
  
  for (const eventId of eventIds) {
    try {
      setStatus(`Hämtar klassdata för tävling ${eventId} (${processedEvents + 1}/${totalEvents})...`);
      
      // Use the results/event endpoint with POST
      const eventorApiEndpoint = `/results/event`;
      
      // Log the API call attempt
      addLog(eventId, `Eventor API: ${eventorApiEndpoint}`, `Anropar Eventor API direkt via Render proxy...`);
      
      if (runId) {
        await saveLogToDatabase(
          runId,
          eventId.toString(),
          `Eventor API: ${eventorApiEndpoint}`,
          `Anropar Eventor API direkt via Render proxy...`
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
      
      // UPDATED: Check for ClassResult elements in the response structure
      let classesFound = false;
      let classesWithStartsCount = 0;
      let totalClassesCount = 0;
      let firstClassResult: any = null;
      
      // First, try to locate ClassResult elements in the ResultList structure
      if (responseData && responseData.ResultList && Array.isArray(responseData.ResultList.ClassResult)) {
        const classResults = responseData.ResultList.ClassResult;
        totalClassesCount = classResults.length;
        classesFound = totalClassesCount > 0;
        
        // Store the first ClassResult for console debugging only
        if (classesFound) {
          firstClassResult = classResults[0];
          
          // Log the complete first ClassResult object for debugging in console only
          console.log(`Raw ClassResult example for event ${eventId}:`, firstClassResult);
        }
        
        addLog(eventId, `Eventor API: ${eventorApiEndpoint}`, `Hittade ${totalClassesCount} klasser (ClassResult)`);
        
        if (runId) {
          await saveLogToDatabase(
            runId,
            eventId.toString(),
            `Eventor API: ${eventorApiEndpoint}`,
            `Hittade ${totalClassesCount} klasser (ClassResult)`
          );
        }
        
        // Process each ClassResult to extract numberOfStarts attribute
        for (const classResult of classResults) {
          // UPDATED: Extract class name and numberOfStarts according to the XML structure
          const className = classResult.EventClass?.Name || classResult.Class?.Name || classResult.ClassShortName || classResult.ClassName || 'Unknown';
          
          // UPDATED: Look for numberOfStarts in the $ attribute object as specified
          const numberOfStarts = classResult.$ && classResult.$.numberOfStarts ? 
            parseInt(classResult.$.numberOfStarts, 10) : null;
          
          if (numberOfStarts !== null) {
            // Valid numberOfStarts found
            const key = `${eventId}_${className}`;
            participantCountMap.set(key, numberOfStarts);
            classesWithStartsCount++;
            
            addLog(eventId, `Eventor API: ${eventorApiEndpoint}`, 
              `Klass ${className}: ${numberOfStarts} startande (numberOfStarts)`);
            
            if (runId) {
              await saveLogToDatabase(
                runId,
                eventId.toString(),
                `Eventor API: ${eventorApiEndpoint}`,
                `Klass ${className}: ${numberOfStarts} startande (numberOfStarts)`
              );
            }
          } else {
            // Missing numberOfStarts attribute
            addLog(eventId, `Eventor API: ${eventorApiEndpoint}`, 
              `Ogiltig svardata: numberOfStarts saknas för klass ${className} i tävling ${eventId}`);
            
            if (runId) {
              await saveLogToDatabase(
                runId,
                eventId.toString(),
                `Eventor API: ${eventorApiEndpoint}`,
                `Ogiltig svardata: numberOfStarts saknas för klass ${className} i tävling ${eventId}`
              );
            }
          }
        }
      } 
      // Alternative: Check if using the older EventClassList structure
      else if (responseData && responseData.Event && responseData.Event.EventClassList && 
               Array.isArray(responseData.Event.EventClassList.EventClass)) {
        
        const eventClasses = responseData.Event.EventClassList.EventClass;
        totalClassesCount = eventClasses.length;
        classesFound = totalClassesCount > 0;
        
        // Store the first EventClass for console debugging only
        if (classesFound) {
          firstClassResult = eventClasses[0];
          
          // Log the complete first EventClass object for debugging in console only
          console.log(`Raw EventClass example for event ${eventId}:`, firstClassResult);
        }
        
        addLog(eventId, `Eventor API: ${eventorApiEndpoint}`, `Hittade ${totalClassesCount} klasser (EventClass)`);
        
        if (runId) {
          await saveLogToDatabase(
            runId,
            eventId.toString(),
            `Eventor API: ${eventorApiEndpoint}`,
            `Hittade ${totalClassesCount} klasser (EventClass)`
          );
        }
        
        // For each class, try to extract participant count from alternative sources
        for (const eventClass of eventClasses) {
          // UPDATED: Extract the class name correctly
          const className = eventClass.Name || 'Unknown';
          
          // UPDATED: Look for numberOfStarts in the $ attribute object
          const numberOfStarts = eventClass.$ && eventClass.$.numberOfStarts ? 
            parseInt(eventClass.$.numberOfStarts, 10) : null;
          
          if (numberOfStarts !== null) {
            // Valid numberOfStarts found
            const key = `${eventId}_${className}`;
            participantCountMap.set(key, numberOfStarts);
            classesWithStartsCount++;
            
            addLog(eventId, `Eventor API: ${eventorApiEndpoint}`, 
              `Klass ${className}: ${numberOfStarts} startande (numberOfStarts)`);
            
            if (runId) {
              await saveLogToDatabase(
                runId,
                eventId.toString(),
                `Eventor API: ${eventorApiEndpoint}`,
                `Klass ${className}: ${numberOfStarts} startande (numberOfStarts)`
              );
            }
          } else {
            // Missing numberOfStarts - log warning
            addLog(eventId, `Eventor API: ${eventorApiEndpoint}`, 
              `Ogiltig svardata: numberOfStarts saknas för klass ${className} i tävling ${eventId}`);
            
            if (runId) {
              await saveLogToDatabase(
                runId,
                eventId.toString(),
                `Eventor API: ${eventorApiEndpoint}`,
                `Ogiltig svardata: numberOfStarts saknas för klass ${className} i tävling ${eventId}`
              );
            }
          }
        }
      } else {
        // Try to extract any useful information from the response for debugging
        console.warn(`No ClassResult elements found in response data:`, responseData);
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
      
      // Add summary log of class processing results
      if (classesFound) {
        const summaryMsg = `Hittade ${totalClassesCount} klasser, varav ${classesWithStartsCount} med numberOfStarts`;
        addLog(eventId, `Eventor API: ${eventorApiEndpoint}`, summaryMsg);
        
        if (runId) {
          await saveLogToDatabase(
            runId,
            eventId.toString(),
            `Eventor API: ${eventorApiEndpoint}`,
            summaryMsg
          );
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
