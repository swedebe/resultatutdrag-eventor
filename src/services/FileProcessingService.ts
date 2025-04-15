
import { ResultRow } from '@/types/results';
import { addLog } from '../components/LogComponent';
import { sleep } from './utils/processingUtils';
import { parseExcelFile, mapExcelRowToResultRow, exportResultsToExcel } from './excel/excelService';
import { fetchEventorData } from './eventor/eventorService';
import { saveResultToDatabase, fetchProcessedResults, fetchProcessingLogs, saveLogToDatabase } from './database/resultRepository';

export type { ResultRow };
export { exportResultsToExcel, fetchProcessedResults, fetchProcessingLogs };

export const processExcelFile = async (
  file: File, 
  setProgress: (value: number) => void, 
  setCurrentStatus: (status: string) => void,
  delaySeconds: number = 15,
  onPartialResults?: (results: ResultRow[]) => Promise<boolean>,
  runId?: string | null
): Promise<ResultRow[]> => {
  setProgress(0);
  setCurrentStatus("Läser in fil...");
  
  // Read the Excel file
  const jsonData = await parseExcelFile(file);
  
  setProgress(10);
  setCurrentStatus("Fil inläst, bearbetar data...");
  
  // Process each row
  const enrichedResults: ResultRow[] = [];
  
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    
    try {
      // Map Excel row to ResultRow
      const resultRow = mapExcelRowToResultRow(row);
      
      // Log the original started value for debugging
      console.log(`Row ${i+1}: Original 'started' value:`, resultRow.started);
      
      setProgress(10 + Math.floor(80 * (i / jsonData.length)));
      setCurrentStatus(`Hämtar information för tävling ${resultRow.eventId} (${i+1}/${jsonData.length})...`);
      
      // Fetch additional data from Eventor
      const enhancedResultRow = await fetchEventorData(resultRow, runId);
      
      // Save processed result to database if runId is provided
      if (runId) {
        const savedSuccessfully = await saveResultToDatabase(enhancedResultRow, runId);
        const saveMessage = savedSuccessfully 
          ? `Sparat resultat för tävling ${resultRow.eventId} i databasen` + 
            ` (started=${enhancedResultRow.started ? '1' : '0'})`
          : `Kunde inte spara resultat för tävling ${resultRow.eventId} i databasen`;
          
        addLog(resultRow.eventId, currentEventorUrl, saveMessage);
        
        if (runId) {
          await saveLogToDatabase(runId, resultRow.eventId.toString(), currentEventorUrl, saveMessage);
        }
      }
      
      enrichedResults.push(enhancedResultRow);
      
      // Call the partial results callback if provided
      if (onPartialResults) {
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
      
      // Use delay between calls to avoid rate limit
      if (i < jsonData.length - 1 && delaySeconds > 0) {
        const waitMessage = `Väntar ${delaySeconds} sekunder innan nästa anrop (för att undvika rate limiting)...`;
        setCurrentStatus(waitMessage);
        addLog(resultRow.eventId, currentEventorUrl, waitMessage);
        
        if (runId) {
          await saveLogToDatabase(runId, resultRow.eventId.toString(), currentEventorUrl, waitMessage);
        }
        
        await sleep(delaySeconds);
      }
    } catch (error: any) {
      console.error(`Error processing row:`, error);
      
      // Continue with next row
      continue;
    }
  }
  
  setProgress(100);
  setCurrentStatus("Klar!");
  
  return enrichedResults;
};

// This variable is used in the eventorService.ts but needs to be here for TypeScript
const currentEventorUrl = "";
