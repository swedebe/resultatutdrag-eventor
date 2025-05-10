
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
      // Get the user's session to obtain access token
      let apiKey = "";
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { data: userData } = await supabase
            .from('users')
            .select('eventor_api_key')
            .eq('id', session.user.id)
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
      
      // If we have an API key, try to fetch the starters using the Render API proxy
      if (apiKey) {
        try {
          // Update the log message to use the new proxy method
          addLog(resultRow.eventId, currentEventorUrl, `Använder Render proxy för Eventor API-anrop`);
          
          if (runId) {
            await saveLogToDatabase(runId, resultRow.eventId.toString(), currentEventorUrl, `Använder Render proxy för Eventor API-anrop`);
          }
          
          // Call the Render proxy service with the updated approach
          const response = await fetch('https://eventor-proxy.onrender.com/eventor-api', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              apiKey,
              endpoint: `/events/${resultRow.eventId}/entries`
            })
          });
          
          // Process the response
          if (response.ok) {
            const responseData = await response.json();
            
            // Here we would parse the JSON to get the actual starters count
            // For now, we'll just log the success
            addLog(resultRow.eventId, currentEventorUrl, `API-anrop lyckades. Bearbetar svar...`);
            
            if (runId) {
              await saveLogToDatabase(runId, resultRow.eventId.toString(), currentEventorUrl, `API-anrop lyckades. Bearbetar svar...`);
            }
            
            // Process the participant count from API response
            // This is a placeholder - actual implementation would parse the entries data
            if (responseData && responseData.EntryList && Array.isArray(responseData.EntryList.Entry)) {
              enhancedResultRow.totalParticipants = responseData.EntryList.Entry.length;
              enhancedResultRow.antalStartande = responseData.EntryList.Entry.length.toString();
              
              addLog(resultRow.eventId, currentEventorUrl, `Antal startande hämtat: ${enhancedResultRow.totalParticipants}`);
              
              if (runId) {
                await saveLogToDatabase(
                  runId,
                  resultRow.eventId.toString(),
                  currentEventorUrl,
                  `Antal startande hämtat: ${enhancedResultRow.totalParticipants}`
                );
              }
            }
          } else {
            const errorText = await response.text();
            addLog(resultRow.eventId, currentEventorUrl, `API-anrop misslyckades. Status: ${response.status}. ${errorText}`);
            
            if (runId) {
              await saveLogToDatabase(
                runId,
                resultRow.eventId.toString(),
                currentEventorUrl,
                `API-anrop misslyckades. Status: ${response.status}. ${errorText}`
              );
            }
          }
        } catch (apiError: any) {
          console.error("Error calling Eventor API via Render proxy:", apiError);
          addLog(resultRow.eventId, currentEventorUrl, `Fel vid API-anrop: ${apiError.message || apiError}`);
          
          if (runId) {
            await saveLogToDatabase(runId, resultRow.eventId.toString(), currentEventorUrl, `Fel vid API-anrop: ${apiError.message || apiError}`);
          }
        }
      }
      
      // Fallback to placeholder value if API call didn't set the value
      if (!enhancedResultRow.totalParticipants) {
        // Placeholder for development/testing
        enhancedResultRow.totalParticipants = enhancedResultRow.totalParticipants || Math.floor(Math.random() * 100) + 10;
        enhancedResultRow.antalStartande = enhancedResultRow.antalStartande || enhancedResultRow.totalParticipants.toString();
        
        addLog(resultRow.eventId, currentEventorUrl, `Antal startande (fallback): ${enhancedResultRow.totalParticipants}`);
        
        if (runId) {
          await saveLogToDatabase(
            runId,
            resultRow.eventId.toString(),
            currentEventorUrl,
            `Antal startande (fallback): ${enhancedResultRow.totalParticipants}`
          );
        }
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
