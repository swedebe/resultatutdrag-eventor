import * as XLSX from 'xlsx';
import { addLog } from '../components/LogComponent';
import { extractCourseInfo } from '@/lib/eventor-parser/course-utils';
import { extractEventAndOrganizerInfo } from '@/lib/eventor-parser/event-utils';
import { supabase } from '@/integrations/supabase/client';

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

// Helper function to wait a number of seconds
const sleep = (seconds: number) => {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

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
        
        if (runId) {
          // Store log in database
          await supabase.from('processing_logs').insert({
            run_id: runId,
            timestamp: new Date().toISOString().substring(11, 23),
            event_id: eventId.toString(),
            url: currentEventorUrl,
            status: `Fel: ${response.status} ${response.statusText}`
          });
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      addLog(eventId, currentEventorUrl, `OK: ${html.length} tecken`);
      
      if (runId) {
        // Store log in database
        await supabase.from('processing_logs').insert({
          run_id: runId,
          timestamp: new Date().toISOString().substring(11, 23),
          event_id: eventId.toString(),
          url: currentEventorUrl,
          status: `OK: ${html.length} tecken`
        });
      }
      
      // Extract event name and organizer information
      const eventInfo = extractEventAndOrganizerInfo(html);
      if (eventInfo.organizer && !resultRow.organizer) {
        resultRow.organizer = eventInfo.organizer;
        addLog(eventId, currentEventorUrl, `Hittade arrangör: "${eventInfo.organizer}"`);
        
        if (runId) {
          await supabase.from('processing_logs').insert({
            run_id: runId,
            timestamp: new Date().toISOString().substring(11, 23),
            event_id: eventId.toString(),
            url: currentEventorUrl,
            status: `Hittade arrangör: "${eventInfo.organizer}"`
          });
        }
      }
      
      // Use the utility function to extract course info
      const className = resultRow.class;
      addLog(eventId, currentEventorUrl, `Söker klass: "${className}"`);
      
      if (runId) {
        // Store log in database
        await supabase.from('processing_logs').insert({
          run_id: runId,
          timestamp: new Date().toISOString().substring(11, 23),
          event_id: eventId.toString(),
          url: currentEventorUrl,
          status: `Söker klass: "${className}"`
        });
      }
      
      const courseInfo = extractCourseInfo(html, className);
      
      if (courseInfo.length > 0 && courseInfo.participants > 0) {
        addLog(eventId, currentEventorUrl, `Hittade via eventClassHeader: Längd=${courseInfo.length}m, Antal=${courseInfo.participants}`);
        resultRow.length = courseInfo.length;
        resultRow.totalParticipants = courseInfo.participants;
        
        if (runId) {
          // Store log in database
          await supabase.from('processing_logs').insert({
            run_id: runId,
            timestamp: new Date().toISOString().substring(11, 23),
            event_id: eventId.toString(),
            url: currentEventorUrl,
            status: `Hittade via eventClassHeader: Längd=${courseInfo.length}m, Antal=${courseInfo.participants}`
          });
        }
      } else {
        // Log that we couldn't find via the main method
        addLog(eventId, currentEventorUrl, `Kunde inte hitta via eventClassHeader, data saknas för klassen "${className}"`);
        
        if (runId) {
          // Store log in database
          await supabase.from('processing_logs').insert({
            run_id: runId,
            timestamp: new Date().toISOString().substring(11, 23),
            event_id: eventId.toString(),
            url: currentEventorUrl,
            status: `Kunde inte hitta via eventClassHeader, data saknas för klassen "${className}"`
          });
        }
      }

      // Save processed result to database if runId is provided
      if (runId) {
        try {
          const processedResult = {
            run_id: runId,
            event_date: resultRow.date,
            event_id: resultRow.eventId.toString(),
            event_name: resultRow.eventName,
            event_type: resultRow.eventType,
            runner_name: resultRow.name,
            person_id: typeof resultRow.personId === 'number' ? resultRow.personId : null,
            birth_year: resultRow.birthYear?.toString(),
            class_name: resultRow.class,
            class_type: resultRow.classType,
            position: resultRow.position,
            total_participants: resultRow.totalParticipants,
            time: resultRow.time,
            time_after: resultRow.timeAfterWinner,
            time_after_seconds: resultRow.timeInSeconds, 
            course_length: resultRow.length,
            organizer: resultRow.organizer, 
            started: resultRow.started === true || resultRow.started === 'true' || resultRow.started === '1' ? 1 : 0
          };
          
          const { error } = await supabase.from('processed_results').insert(processedResult);
          
          if (error) {
            console.error('Error inserting processed result:', error);
            addLog(eventId, currentEventorUrl, `Fel vid lagring av resultat i databas: ${error.message}`);
            
            await supabase.from('processing_logs').insert({
              run_id: runId,
              timestamp: new Date().toISOString().substring(11, 23),
              event_id: eventId.toString(),
              url: currentEventorUrl,
              status: `Fel vid lagring av resultat i databas: ${error.message}`
            });
          } else {
            console.log('Result saved to database:', processedResult);
            addLog(eventId, currentEventorUrl, `Resultat lagrat i databas`);
            
            await supabase.from('processing_logs').insert({
              run_id: runId,
              timestamp: new Date().toISOString().substring(11, 23),
              event_id: eventId.toString(),
              url: currentEventorUrl,
              status: `Resultat lagrat i databas`
            });
          }
        } catch (err) {
          console.error('Error saving processed result:', err);
        }
      }

      enrichedResults.push(resultRow);
      
      // Call the partial results callback if provided
      if (onPartialResults) {
        // Await the callback and check if processing should continue
        const shouldContinue = await onPartialResults([...enrichedResults]);
        if (shouldContinue === false) {
          addLog("system", "", "Bearbetning avbruten av användaren");
          
          if (runId) {
            // Store log in database
            await supabase.from('processing_logs').insert({
              run_id: runId,
              timestamp: new Date().toISOString().substring(11, 23),
              event_id: "system",
              url: "",
              status: "Bearbetning avbruten av användaren"
            });
          }
          
          break; // Exit the loop if the callback returns false
        }
      }
      
      // Use delay between calls to avoid rate limit
      if (i < jsonData.length - 1 && delaySeconds > 0) {
        const waitMessage = `Väntar ${delaySeconds} sekunder innan nästa anrop (för att undvika rate limiting)...`;
        setCurrentStatus(waitMessage);
        addLog(eventId, currentEventorUrl, waitMessage);
        
        if (runId) {
          // Store log in database
          await supabase.from('processing_logs').insert({
            run_id: runId,
            timestamp: new Date().toISOString().substring(11, 23),
            event_id: eventId.toString(),
            url: currentEventorUrl,
            status: waitMessage
          });
        }
        
        await sleep(delaySeconds);
      }
    } catch (error: any) {
      console.error(`Fel vid hämtning för tävlings-id ${eventId}:`, error);
      const currentEventorUrl = `https://eventor.orientering.se/Events/ResultList?eventId=${eventId}&groupBy=EventClass`;
      addLog(eventId, currentEventorUrl, `Fel vid hämtning: ${error.message || error}`);
      
      if (runId) {
        // Store log in database
        await supabase.from('processing_logs').insert({
          run_id: runId,
          timestamp: new Date().toISOString().substring(11, 23),
          event_id: eventId.toString(),
          url: currentEventorUrl,
          status: `Fel vid hämtning: ${error.message || error}`
        });
        
        // Still try to save partial result to database
        try {
          const processedResult = {
            run_id: runId,
            event_date: resultRow.date,
            event_id: resultRow.eventId.toString(),
            event_name: resultRow.eventName,
            event_type: resultRow.eventType,
            runner_name: resultRow.name,
            person_id: typeof resultRow.personId === 'number' ? resultRow.personId : null,
            birth_year: resultRow.birthYear?.toString(),
            class_name: resultRow.class,
            class_type: resultRow.classType,
            position: resultRow.position,
            total_participants: resultRow.totalParticipants,
            time: resultRow.time,
            time_after: resultRow.timeAfterWinner,
            time_after_seconds: resultRow.timeInSeconds,
            course_length: resultRow.length,
            organizer: resultRow.organizer,
            started: resultRow.started === true || resultRow.started === 'true' || resultRow.started === '1' ? 1 : 0
          };
          
          await supabase.from('processed_results').insert(processedResult);
          console.log('Partial result saved to database despite error');
        } catch (err) {
          console.error('Error saving partial result after fetch error:', err);
        }
      }
      
      // Add the row without course length and participant count
      enrichedResults.push(resultRow);
      
      // Call the partial results callback if provided
      if (onPartialResults) {
        // Await the callback and check if processing should continue
        const shouldContinue = await onPartialResults([...enrichedResults]);
        if (shouldContinue === false) {
          addLog("system", "", "Bearbetning avbruten av användaren");
          
          if (runId) {
            // Store log in database
            await supabase.from('processing_logs').insert({
              run_id: runId,
              timestamp: new Date().toISOString().substring(11, 23),
              event_id: "system",
              url: "",
              status: "Bearbetning avbruten av användaren"
            });
          }
          
          break; // Exit the loop if the callback returns false
        }
      }
      
      // Use delay even after errors to avoid rate limit
      if (i < jsonData.length - 1 && delaySeconds > 0) {
        const waitMessage = `Väntar ${delaySeconds} sekunder innan nästa anrop (för att undvika rate limiting)...`;
        setCurrentStatus(waitMessage);
        addLog(eventId, currentEventorUrl, waitMessage);
        
        if (runId) {
          // Store log in database
          await supabase.from('processing_logs').insert({
            run_id: runId,
            timestamp: new Date().toISOString().substring(11, 23),
            event_id: eventId.toString(),
            url: currentEventorUrl,
            status: waitMessage
          });
        }
        
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

// Function to fetch processed results from database
export const fetchProcessedResults = async (runId: string): Promise<ResultRow[]> => {
  try {
    const { data, error } = await supabase
      .from('processed_results')
      .select('*')
      .eq('run_id', runId);
    
    if (error) {
      console.error('Error fetching processed results:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Convert database rows to ResultRow format
    const results: ResultRow[] = data.map(row => ({
      name: row.runner_name,
      class: row.class_name,
      classType: row.class_type,
      eventId: row.event_id,
      eventName: row.event_name,
      date: row.event_date,
      time: row.time,
      position: row.position,
      organizer: row.organizer || '', // Properly handle organizer field
      timeInSeconds: row.time_after_seconds,
      timeAfterWinner: row.time_after,
      length: row.course_length,
      totalParticipants: row.total_participants,
      eventType: row.event_type,
      personId: row.person_id,
      birthYear: row.birth_year,
      started: row.started === 1
    }));
    
    return results;
  } catch (error) {
    console.error('Error in fetchProcessedResults:', error);
    return [];
  }
};

// Function to fetch logs from database
export const fetchProcessingLogs = async (runId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('processing_logs')
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching processing logs:', error);
      throw error;
    }
    
    // Convert to LogEntry format
    return data.map(log => ({
      timestamp: log.timestamp,
      eventId: log.event_id,
      url: log.url,
      status: log.status
    }));
  } catch (error) {
    console.error('Error in fetchProcessingLogs:', error);
    return [];
  }
};
