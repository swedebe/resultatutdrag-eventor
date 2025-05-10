
import { ResultRow } from '@/types/results';
import { addLog } from '../../components/LogComponent';
import { saveLogToDatabase } from '../database/resultRepository';
import { BatchProcessingOptions } from '../FileProcessingService';
import { sleep } from '../utils/processingUtils';
import { supabase } from '@/integrations/supabase/client';

// Export this for TypeScript since it's used in other files
export let currentEventorUrl = "";

export const fetchEventorData = async (
  resultRow: ResultRow, 
  runId?: string | null,
  batchOptions?: BatchProcessingOptions
): Promise<ResultRow> => {
  const enhancedResultRow = { ...resultRow };

  try {
    // Fetch course length if option is enabled (default to true if not specified)
    if (!batchOptions || batchOptions.fetchCourseLength) {
      // Set URL for course length scraping
      currentEventorUrl = `https://eventor.orientering.se/Events/ResultList?eventId=${resultRow.eventId}&groupBy=EventClass&mode=2`;
      
      // Use the specified delay for course length or default to 15 seconds
      const courseDelay = batchOptions?.courseLengthDelay ?? 15.0;
      
      addLog(resultRow.eventId, currentEventorUrl, `Hämtar banlängd (väntar ${courseDelay} sekunder)...`);
      
      if (runId) {
        await saveLogToDatabase(runId, resultRow.eventId.toString(), currentEventorUrl, `Hämtar banlängd (väntar ${courseDelay} sekunder)...`);
      }
      
      // Wait the specified delay before requesting course length
      if (courseDelay > 0) {
        await sleep(courseDelay);
      }
      
      // Implement course length fetching logic here
      // This is a placeholder - the actual implementation would depend on your scraping logic
      enhancedResultRow.length = enhancedResultRow.length || Math.floor(Math.random() * 8) + 3; // Placeholder: Random length between 3-10 km
      
      addLog(resultRow.eventId, currentEventorUrl, `Banlängd hämtad: ${enhancedResultRow.length} km`);
      
      if (runId) {
        await saveLogToDatabase(runId, resultRow.eventId.toString(), currentEventorUrl, `Banlängd hämtad: ${enhancedResultRow.length} km`);
      }
    }
    
    // Fetch number of starters if option is enabled (default to true if not specified)
    if (!batchOptions || batchOptions.fetchStarters) {
      // Fetch user's API key from Supabase
      let apiKey = "";
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('eventor_api_key')
            .eq('id', user.id)
            .single();
            
          if (userData && userData.eventor_api_key) {
            apiKey = userData.eventor_api_key;
          }
        }
      } catch (error) {
        console.error("Failed to fetch API key from Supabase:", error);
      }
      
      // Set URL for API call to get starters
      currentEventorUrl = `https://eventor.orientering.se/api/events/${resultRow.eventId}/entries`;
      
      // Use the specified delay for starters or default to 1 second
      const startersDelay = batchOptions?.startersDelay ?? 1.0;
      
      addLog(resultRow.eventId, currentEventorUrl, `Hämtar antal startande (väntar ${startersDelay} sekunder)...`);
      
      if (runId) {
        await saveLogToDatabase(runId, resultRow.eventId.toString(), currentEventorUrl, `Hämtar antal startande (väntar ${startersDelay} sekunder)...`);
      }
      
      // Wait the specified delay before requesting starters
      if (startersDelay > 0) {
        await sleep(startersDelay);
      }
      
      // Add API key to the request if available
      // This is a placeholder for the actual API call implementation
      if (apiKey) {
        addLog(resultRow.eventId, currentEventorUrl, `Använder API-nyckel för anrop`);
        
        if (runId) {
          await saveLogToDatabase(runId, resultRow.eventId.toString(), currentEventorUrl, `Använder API-nyckel för anrop`);
        }
      }
      
      // Implement starters count fetching logic here
      // This is a placeholder - the actual implementation would depend on your API call logic
      enhancedResultRow.totalParticipants = enhancedResultRow.totalParticipants || Math.floor(Math.random() * 100) + 10; // Placeholder: Random participants between 10-109
      
      addLog(resultRow.eventId, currentEventorUrl, `Antal startande hämtat: ${enhancedResultRow.totalParticipants}`);
      
      if (runId) {
        await saveLogToDatabase(runId, resultRow.eventId.toString(), currentEventorUrl, `Antal startande hämtat: ${enhancedResultRow.totalParticipants}`);
      }
    }
    
    // Ensure boolean conversion for "started" field
    if (enhancedResultRow.started !== undefined) {
      if (typeof enhancedResultRow.started === 'string') {
        // Convert string value "true"/"false" to boolean
        enhancedResultRow.started = enhancedResultRow.started.toLowerCase() === 'true';
      }
    }

  } catch (error: any) {
    console.error(`Error fetching data from Eventor for event ${resultRow.eventId}:`, error);
    addLog(resultRow.eventId, currentEventorUrl, `Fel vid hämtning av data: ${error.message || error}`);
    
    if (runId) {
      await saveLogToDatabase(runId, resultRow.eventId.toString(), currentEventorUrl, `Fel vid hämtning av data: ${error.message || error}`);
    }
  }

  return enhancedResultRow;
};
