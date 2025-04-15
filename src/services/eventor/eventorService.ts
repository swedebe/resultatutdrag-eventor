
/**
 * Service for fetching data from Eventor
 */
import { addLog } from '@/components/LogComponent';
import { extractCourseInfo } from '@/lib/eventor-parser/course-utils';
import { extractEventAndOrganizerInfo } from '@/lib/eventor-parser/event-utils';
import { ResultRow } from '@/types/results';
import { saveLogToDatabase } from '../database/resultRepository';

/**
 * Fetch and enhance result data from Eventor
 */
export const fetchEventorData = async (
  resultRow: ResultRow,
  runId: string | null
): Promise<ResultRow> => {
  const eventId = resultRow.eventId;
  const currentEventorUrl = `https://eventor.orientering.se/Events/ResultList?eventId=${eventId}&groupBy=EventClass`;
  
  addLog(eventId, currentEventorUrl, "Påbörjar hämtning");
  
  if (runId) {
    await saveLogToDatabase(
      runId,
      eventId.toString(),
      currentEventorUrl,
      "Påbörjar hämtning"
    );
  }
  
  try {
    const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(currentEventorUrl)}`);
    
    if (!response.ok) {
      const errorMessage = `Fel: ${response.status} ${response.statusText}`;
      addLog(eventId, currentEventorUrl, errorMessage);
      
      if (runId) {
        await saveLogToDatabase(runId, eventId.toString(), currentEventorUrl, errorMessage);
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    addLog(eventId, currentEventorUrl, `OK: ${html.length} tecken`);
    
    if (runId) {
      await saveLogToDatabase(
        runId, 
        eventId.toString(), 
        currentEventorUrl, 
        `OK: ${html.length} tecken`
      );
    }
    
    // Extract event name and organizer information
    const eventInfo = extractEventAndOrganizerInfo(html);
    if (eventInfo.organizer && !resultRow.organizer) {
      resultRow.organizer = eventInfo.organizer;
      addLog(eventId, currentEventorUrl, `Hittade arrangör: "${eventInfo.organizer}"`);
      
      if (runId) {
        await saveLogToDatabase(
          runId,
          eventId.toString(),
          currentEventorUrl,
          `Hittade arrangör: "${eventInfo.organizer}"`
        );
      }
    }
    
    // Use the utility function to extract course info
    const className = resultRow.class;
    addLog(eventId, currentEventorUrl, `Söker klass: "${className}"`);
    
    if (runId) {
      await saveLogToDatabase(
        runId,
        eventId.toString(),
        currentEventorUrl,
        `Söker klass: "${className}"`
      );
    }
    
    const courseInfo = extractCourseInfo(html, className);
    
    if (courseInfo.length > 0 && courseInfo.participants > 0) {
      addLog(
        eventId, 
        currentEventorUrl, 
        `Hittade via eventClassHeader: Längd=${courseInfo.length}m, Antal=${courseInfo.participants}`
      );
      
      resultRow.length = courseInfo.length;
      resultRow.totalParticipants = courseInfo.participants;
      
      if (runId) {
        await saveLogToDatabase(
          runId,
          eventId.toString(),
          currentEventorUrl,
          `Hittade via eventClassHeader: Längd=${courseInfo.length}m, Antal=${courseInfo.participants}`
        );
      }
    } else {
      // Log that we couldn't find via the main method
      addLog(
        eventId, 
        currentEventorUrl, 
        `Kunde inte hitta via eventClassHeader, data saknas för klassen "${className}"`
      );
      
      if (runId) {
        await saveLogToDatabase(
          runId,
          eventId.toString(),
          currentEventorUrl,
          `Kunde inte hitta via eventClassHeader, data saknas för klassen "${className}"`
        );
      }
    }
    
    return resultRow;
  } catch (error: any) {
    console.error(`Fel vid hämtning för tävlings-id ${eventId}:`, error);
    const errorMessage = `Fel vid hämtning: ${error.message || error}`;
    addLog(eventId, currentEventorUrl, errorMessage);
    
    if (runId) {
      await saveLogToDatabase(runId, eventId.toString(), currentEventorUrl, errorMessage);
    }
    
    return resultRow;
  }
};
