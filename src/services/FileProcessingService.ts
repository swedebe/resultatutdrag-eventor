
import { ResultRow } from '@/types/results';
import { addLog } from '../components/LogComponent';
import { sleep } from './utils/processingUtils';
import { 
  parseExcelFile, 
  mapExcelRowToResultRow, 
  exportResultsToExcel, 
  fetchClassParticipantCounts, 
  updateResultsWithParticipantCounts 
} from './excel/excelService';
import { fetchEventorData } from './eventor/eventorService';
import { saveResultToDatabase, fetchProcessedResults, fetchProcessingLogs, saveLogToDatabase } from './database/resultRepository';
import { supabase } from '@/integrations/supabase/client';

export type { ResultRow };
export { exportResultsToExcel, fetchProcessedResults, fetchProcessingLogs };

// Define the batch options type
export interface BatchProcessingOptions {
  fetchCourseLength: boolean;
  fetchStarters: boolean;
  courseLengthDelay: number;
  startersDelay: number;
}

export const processExcelFile = async (
  file: File, 
  setProgress: (value: number) => void, 
  setCurrentStatus: (status: string) => void,
  delaySeconds: number = 15,
  onPartialResults?: (results: ResultRow[]) => Promise<boolean>,
  runId?: string | null,
  batchOptions?: BatchProcessingOptions // Make the batch options optional
): Promise<ResultRow[]> => {
  setProgress(0);
  setCurrentStatus("Läser in fil...");
  
  // Read the Excel file
  const jsonData = await parseExcelFile(file);
  
  setProgress(10);
  setCurrentStatus("Fil inläst, bearbetar data...");
  
  // Process each row
  let enrichedResults: ResultRow[] = [];
  
  // First pass: map all rows and collect unique event IDs
  const uniqueEventIds = new Set<string>();
  const mappedRows: ResultRow[] = [];
  
  for (let i = 0; i < jsonData.length; i++) {
    try {
      const row = jsonData[i];
      const resultRow = mapExcelRowToResultRow(row);
      mappedRows.push(resultRow);
      uniqueEventIds.add(resultRow.eventId.toString());
    } catch (error) {
      console.error(`Error mapping row ${i}:`, error);
      addLog("error", "", `Fel vid mappning av rad ${i}: ${error}`);
      if (runId) {
        await saveLogToDatabase(runId, "error", "", `Fel vid mappning av rad ${i}: ${error}`);
      }
    }
  }
  
  // Check if we need to fetch starter counts
  if (batchOptions?.fetchStarters) {
    setProgress(15);
    setCurrentStatus("Hämtar information om antal startande från Eventor API...");
    addLog("system", "", "Påbörjar hämtning av antal startande per klass");
    
    if (runId) {
      await saveLogToDatabase(runId, "system", "", "Påbörjar hämtning av antal startande per klass");
    }
    
    try {
      // Fetch the user's Eventor API key
      const { data: { user } } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from('users')
        .select('eventor_api_key')
        .eq('id', user.id)
        .single();
      
      if (userData?.eventor_api_key) {
        const eventIdArray = Array.from(uniqueEventIds);
        const participantCountMap = await fetchClassParticipantCounts(
          eventIdArray,
          userData.eventor_api_key,
          setCurrentStatus,
          batchOptions.startersDelay
        );
        
        // Update all results with participant counts
        if (participantCountMap.size > 0) {
          enrichedResults = updateResultsWithParticipantCounts(mappedRows, participantCountMap);
          setProgress(30);
          addLog("system", "", `Hämtade antal startande för ${participantCountMap.size} klasser`);
          
          if (runId) {
            await saveLogToDatabase(runId, "system", "", `Hämtade antal startande för ${participantCountMap.size} klasser`);
          }
          
          // Call the partial results callback to update UI
          if (onPartialResults) {
            await onPartialResults([...enrichedResults]);
          }
        } else {
          addLog("warning", "", "Kunde inte hitta några deltagarsiffror");
          if (runId) {
            await saveLogToDatabase(runId, "warning", "", "Kunde inte hitta några deltagarsiffror");
          }
          enrichedResults = [...mappedRows];
        }
      } else {
        addLog("warning", "", "Ingen Eventor API-nyckel hittades. Kan inte hämta antal startande.");
        if (runId) {
          await saveLogToDatabase(runId, "warning", "", "Ingen Eventor API-nyckel hittades. Kan inte hämta antal startande.");
        }
        enrichedResults = [...mappedRows];
      }
    } catch (error: any) {
      console.error("Error fetching participant counts:", error);
      addLog("error", "", `Fel vid hämtning av antal startande: ${error.message || error}`);
      
      if (runId) {
        await saveLogToDatabase(runId, "error", "", `Fel vid hämtning av antal startande: ${error.message || error}`);
      }
      
      // Continue with the original mapped rows
      enrichedResults = [...mappedRows];
    }
  } else {
    // Skip participant count fetching
    enrichedResults = [...mappedRows];
  }
  
  // Continue with normal processing (e.g., fetching course lengths)
  for (let i = 0; i < enrichedResults.length; i++) {
    const resultRow = enrichedResults[i];
    
    try {
      // Log the original started value for debugging
      console.log(`Row ${i+1}: Original 'started' value:`, resultRow.started, typeof resultRow.started);
      
      setProgress(30 + Math.floor(70 * (i / enrichedResults.length)));
      setCurrentStatus(`Hämtar information för tävling ${resultRow.eventId} (${i+1}/${enrichedResults.length})...`);
      
      // Only fetch additional Eventor data if course length is needed
      if (batchOptions?.fetchCourseLength) {
        const enhancedResultRow = await fetchEventorData(resultRow, runId, batchOptions);
        enrichedResults[i] = enhancedResultRow;
      }
      
      // Save processed result to database if runId is provided
      if (runId) {
        console.log(`About to save result for event ${resultRow.eventId}, started value:`, 
          resultRow.started, typeof resultRow.started);
            
        const saveResult = await saveResultToDatabase(enrichedResults[i], runId);
        
        let saveMessage;
        if (saveResult.success) {
          // Use the returned record ID in the log message
          saveMessage = `Sparat rad ${saveResult.recordId} för tävling ${resultRow.eventId} i databasen`;
        } else {
          saveMessage = `Kunde inte spara resultat för tävling ${resultRow.eventId} i databasen`;
        }
          
        addLog(resultRow.eventId, currentEventorUrl, saveMessage);
        
        if (runId) {
          await saveLogToDatabase(runId, resultRow.eventId.toString(), currentEventorUrl, saveMessage);
        }
        
        if (!saveResult.success) {
          console.error(`Failed to save result for event ${resultRow.eventId}`);
        }
      }
      
      // Call the partial results callback if provided
      if (onPartialResults && i % 5 === 0) {
        // Await the callback and check if processing should continue
        const shouldContinue = await onPartialResults([...enrichedResults]);
        if (shouldContinue === false) {
          addLog("system", "", "Bearbetning avbruten av användaren");
          
          if (runId) {
            await saveLogToDatabase(runId, "system", "", "Bearbetning avbruten av användaren");
          }
          
          break; // Exit the loop if the callback returns false
        }
      }
      
      // Use delay between calls to avoid rate limit (only if fetching course lengths)
      if (batchOptions?.fetchCourseLength && i < enrichedResults.length - 1 && batchOptions.courseLengthDelay > 0) {
        const waitMessage = `Väntar ${batchOptions.courseLengthDelay} sekunder innan nästa anrop (för att undvika rate limiting)...`;
        setCurrentStatus(waitMessage);
        addLog(resultRow.eventId, currentEventorUrl, waitMessage);
        
        if (runId) {
          await saveLogToDatabase(runId, resultRow.eventId.toString(), currentEventorUrl, waitMessage);
        }
        
        await sleep(batchOptions.courseLengthDelay);
      }
    } catch (error: any) {
      console.error(`Error processing row:`, error);
      addLog("error", "", `Fel vid bearbetning av rad: ${error.message || error}`);
      
      if (runId) {
        await saveLogToDatabase(runId, "error", "", `Fel vid bearbetning av rad: ${error.message || error}`);
      }
      
      // Continue with next row
      continue;
    }
  }
  
  setProgress(100);
  setCurrentStatus("Klar!");
  
  return enrichedResults;
};

// Export this for TypeScript since it's used in the eventorService.ts
export const currentEventorUrl = "";
