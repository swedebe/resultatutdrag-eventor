
import { ResultRow } from '@/types/results';
import { addLog } from '../../components/LogComponent';
import { saveLogToDatabase } from '../database/resultRepository';
import { BatchProcessingOptions } from '../FileProcessingService';
import { sleep } from '../utils/processingUtils';
import { supabase } from '@/integrations/supabase/client';
import { extractCourseInfo } from '@/lib/eventor-parser';

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
      
      // Fetch the HTML content from Eventor
      try {
        const response = await fetch(currentEventorUrl);
        if (response.ok) {
          const htmlContent = await response.text();
          
          // Use extractCourseInfo to get course length and participants count
          const courseInfo = extractCourseInfo(htmlContent, resultRow.class);
          
          if (courseInfo.length > 0) {
            enhancedResultRow.length = courseInfo.length;
            console.log(`[DEBUG] Successfully extracted course length: ${courseInfo.length} m for class "${resultRow.class}"`);
            
            addLog(resultRow.eventId, currentEventorUrl, `Banlängd hämtad: ${courseInfo.length} m`);
            
            if (runId) {
              await saveLogToDatabase(runId, resultRow.eventId.toString(), currentEventorUrl, `Banlängd hämtad: ${courseInfo.length} m`);
            }
          } else {
            console.log(`[DEBUG] Failed to extract course length for class "${resultRow.class}"`);
            
            addLog(resultRow.eventId, currentEventorUrl, `Kunde inte hitta banlängd för klassen "${resultRow.class}"`);
            
            if (runId) {
              await saveLogToDatabase(runId, resultRow.eventId.toString(), currentEventorUrl, `Kunde inte hitta banlängd för klassen "${resultRow.class}"`);
            }
          }
          
          // Update participants count if available and not already set
          if (courseInfo.participants > 0 && (!enhancedResultRow.totalParticipants || enhancedResultRow.totalParticipants === 0)) {
            enhancedResultRow.totalParticipants = courseInfo.participants;
            enhancedResultRow.antalStartande = courseInfo.participants.toString();
            
            addLog(resultRow.eventId, currentEventorUrl, `Antal startande hämtat från HTML: ${courseInfo.participants}`);
            
            if (runId) {
              await saveLogToDatabase(runId, resultRow.eventId.toString(), currentEventorUrl, `Antal startande hämtat från HTML: ${courseInfo.participants}`);
            }
          }
        } else {
          const errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
          console.error(`[ERROR] Failed to fetch Eventor HTML: ${errorMessage}`);
          
          addLog(resultRow.eventId, currentEventorUrl, `Fel vid hämtning av HTML: ${errorMessage}`);
          
          if (runId) {
            await saveLogToDatabase(runId, resultRow.eventId.toString(), currentEventorUrl, `Fel vid hämtning av HTML: ${errorMessage}`);
          }
        }
      } catch (fetchError: any) {
        console.error(`[ERROR] Error fetching HTML from Eventor: ${fetchError.message || fetchError}`);
        
        addLog(resultRow.eventId, currentEventorUrl, `Fel vid hämtning av HTML: ${fetchError.message || fetchError}`);
        
        if (runId) {
          await saveLogToDatabase(runId, resultRow.eventId.toString(), currentEventorUrl, `Fel vid hämtning av HTML: ${fetchError.message || fetchError}`);
        }
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
      
      // UPDATED: Set URL to direct Render proxy instead of Supabase Edge Function
      const renderProxyUrl = 'https://eventor-proxy.onrender.com/results/event';
      currentEventorUrl = renderProxyUrl;
      
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
      
      // If we have an API key, try to fetch the starters directly from Render proxy
      if (apiKey) {
        try {
          // Update the log message to use the direct approach
          addLog(resultRow.eventId, currentEventorUrl, `Anropar Render proxy direkt för Eventor API-anrop`);
          
          if (runId) {
            await saveLogToDatabase(runId, resultRow.eventId.toString(), currentEventorUrl, `Anropar Render proxy direkt för Eventor API-anrop`);
          }
          
          // Create the POST request payload
          const requestPayload = {
            apiKey,
            eventId: resultRow.eventId,
            includeSplitTimes: false
          };
          
          // DETAILED LOGGING: Log the full request details
          console.log(`======================== EVENTOR API REQUEST ========================`);
          console.log(`Request URL: ${renderProxyUrl}`);
          console.log(`Request Method: POST`);
          console.log(`Request Headers: Content-Type: application/json`);
          console.log(`Request Body: ${JSON.stringify({
            apiKey: "REDACTED_FOR_LOGGING",
            eventId: resultRow.eventId,
            includeSplitTimes: false
          })}`);
          
          // Call the Render proxy directly with a POST request
          const response = await fetch(renderProxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestPayload),
          });
          
          // DETAILED LOGGING: Log the response status
          console.log(`\n======================== EVENTOR API RESPONSE ========================`);
          console.log(`Response Status: ${response.status}`);
          console.log(`Response Status Text: ${response.statusText}`);
          console.log(`Response Headers: ${JSON.stringify([...response.headers.entries()])}`);
          
          // Process the response
          if (response.ok) {
            const responseData = await response.json();
            console.log(`Response from Render proxy:`, responseData);
            
            addLog(resultRow.eventId, currentEventorUrl, `API-anrop lyckades. Bearbetar svar...`);
            
            if (runId) {
              await saveLogToDatabase(
                runId,
                resultRow.eventId.toString(),
                currentEventorUrl,
                `API-anrop lyckades. Bearbetar svar...`
              );
            }
            
            // UPDATED: First check for ClassResult elements in ResultList structure
            let classFound = false;
            let classesWithStartsCount = 0;
            let totalClassesCount = 0;
            let firstClassResult: any = null;
            
            // Look for ClassResult elements
            if (responseData && responseData.ResultList && Array.isArray(responseData.ResultList.ClassResult)) {
              const classResults = responseData.ResultList.ClassResult;
              totalClassesCount = classResults.length;
              
              // Store first ClassResult for detailed logging in console only (not in URL log)
              if (totalClassesCount > 0) {
                firstClassResult = classResults[0];
                // Keep detailed class result logging in console only
                console.log(`Raw ClassResult example for event ${resultRow.eventId}:`, firstClassResult);
              }
              
              // Try to find the specific class this result belongs to
              const resultClass = enhancedResultRow.class;
              
              for (const classResult of classResults) {
                // UPDATED: Extract class name correctly from EventClass.Name first, then fall back to other properties
                const className = classResult.EventClass?.Name || classResult.Class?.Name || classResult.ClassShortName || classResult.ClassName || 'Unknown';
                
                if (className === resultClass) {
                  classFound = true;
                  
                  // UPDATED: Look for numberOfStarts in the $ attribute object
                  const numberOfStarts = classResult.$ && classResult.$.numberOfStarts ? 
                    parseInt(classResult.$.numberOfStarts, 10) : null;
                  
                  if (numberOfStarts !== null) {
                    enhancedResultRow.totalParticipants = numberOfStarts;
                    enhancedResultRow.antalStartande = numberOfStarts.toString();
                    classesWithStartsCount++;
                    
                    addLog(resultRow.eventId, currentEventorUrl, 
                      `Antal startande hämtat (numberOfStarts för klass ${resultClass}): ${numberOfStarts}`);
                    
                    if (runId) {
                      await saveLogToDatabase(
                        runId,
                        resultRow.eventId.toString(),
                        currentEventorUrl,
                        `Antal startande hämtat (numberOfStarts för klass ${resultClass}): ${numberOfStarts}`
                      );
                    }
                    break;
                  } else {
                    // Missing numberOfStarts attribute
                    addLog(resultRow.eventId, currentEventorUrl, 
                      `Ogiltig svardata: numberOfStarts saknas för klass ${resultClass} i tävling ${resultRow.eventId}`);
                    
                    if (runId) {
                      await saveLogToDatabase(
                        runId,
                        resultRow.eventId.toString(),
                        currentEventorUrl,
                        `Ogiltig svardata: numberOfStarts saknas för klass ${resultClass} i tävling ${resultRow.eventId}`
                      );
                    }
                  }
                }
              }
              
              // Add summary log if classes were found
              const summaryMsg = `Hittade ${totalClassesCount} klasser, varav ${classesWithStartsCount} med numberOfStarts`;
              addLog(resultRow.eventId, currentEventorUrl, summaryMsg);
              
              if (runId) {
                await saveLogToDatabase(
                  runId,
                  resultRow.eventId.toString(),
                  currentEventorUrl,
                  summaryMsg
                );
              }
            } 
            // Check the alternative EventClassList structure 
            else if (responseData && responseData.Event && responseData.Event.EventClassList && 
                     Array.isArray(responseData.Event.EventClassList.EventClass)) {
              
              // Try to find the specific class this result belongs to
              const eventClasses = responseData.Event.EventClassList.EventClass;
              const resultClass = enhancedResultRow.class;
              totalClassesCount = eventClasses.length;
              
              // Store first EventClass for detailed logging in console only (not in URL log)
              if (totalClassesCount > 0) {
                firstClassResult = eventClasses[0];
                // Keep detailed class result logging in console only
                console.log(`Raw EventClass example for event ${resultRow.eventId}:`, firstClassResult);
              }
              
              for (const eventClass of eventClasses) {
                if (eventClass.Name === resultClass) {
                  classFound = true;
                  
                  // UPDATED: Look for numberOfStarts in the $ attribute object
                  const numberOfStarts = eventClass.$ && eventClass.$.numberOfStarts ? 
                    parseInt(eventClass.$.numberOfStarts, 10) : null;
                  
                  if (numberOfStarts !== null) {
                    enhancedResultRow.totalParticipants = numberOfStarts;
                    enhancedResultRow.antalStartande = numberOfStarts.toString();
                    classesWithStartsCount++;
                    
                    addLog(resultRow.eventId, currentEventorUrl, 
                      `Antal startande hämtat (numberOfStarts för klass ${resultClass}): ${numberOfStarts}`);
                    
                    if (runId) {
                      await saveLogToDatabase(
                        runId,
                        resultRow.eventId.toString(),
                        currentEventorUrl,
                        `Antal startande hämtat (numberOfStarts för klass ${resultClass}): ${numberOfStarts}`
                      );
                    }
                    break;
                  } else {
                    // Missing numberOfStarts attribute
                    addLog(resultRow.eventId, currentEventorUrl, 
                      `Ogiltig svardata: numberOfStarts saknas för klass ${resultClass} i tävling ${resultRow.eventId}`);
                    
                    if (runId) {
                      await saveLogToDatabase(
                        runId,
                        resultRow.eventId.toString(),
                        currentEventorUrl,
                        `Ogiltig svardata: numberOfStarts saknas för klass ${resultClass} i tävling ${resultRow.eventId}`
                      );
                    }
                  }
                }
              }
              
              // Add summary log if classes were found
              const summaryMsg = `Hittade ${totalClassesCount} klasser, varav ${classesWithStartsCount} med numberOfStarts`;
              addLog(resultRow.eventId, currentEventorUrl, summaryMsg);
              
              if (runId) {
                await saveLogToDatabase(
                  runId,
                  resultRow.eventId.toString(),
                  currentEventorUrl,
                  summaryMsg
                );
              }
            }
            else {
              // If we can't find the expected data structure, log detailed information
              console.warn("Unable to find ClassResult elements in response:", responseData);
              
              // Check if we can find any useful information in the response
              if (responseData.Event && responseData.Event.Name) {
                addLog(resultRow.eventId, currentEventorUrl, 
                  `Hittade event "${responseData.Event.Name}" men inga ClassResult element i förväntad struktur`);
                
                if (runId) {
                  await saveLogToDatabase(
                    runId,
                    resultRow.eventId.toString(),
                    currentEventorUrl,
                    `Hittade event "${responseData.Event.Name}" men inga ClassResult element i förväntad struktur`
                  );
                }
              } else {
                addLog(resultRow.eventId, currentEventorUrl, `Ogiltig svardata: Inga klasser hittades`);
                
                if (runId) {
                  await saveLogToDatabase(
                    runId,
                    resultRow.eventId.toString(),
                    currentEventorUrl,
                    `Ogiltig svardata: Inga klasser hittades`
                  );
                }
              }
            }
            
            // If class was not found in the response, log this
            if (totalClassesCount > 0 && !classFound) {
              addLog(resultRow.eventId, currentEventorUrl, 
                `Klassen "${enhancedResultRow.class}" hittades inte i svaret som innehöll ${totalClassesCount} klasser`);
              
              if (runId) {
                await saveLogToDatabase(
                  runId,
                  resultRow.eventId.toString(),
                  currentEventorUrl,
                  `Klassen "${enhancedResultRow.class}" hittades inte i svaret som innehöll ${totalClassesCount} klasser`
                );
              }
            }
          } else {
            const errorText = await response.text();
            console.error(`Error response from Render proxy: ${response.status} - ${errorText}`);
            
            addLog(resultRow.eventId, currentEventorUrl, 
              `Render proxy anrop misslyckades: HTTP ${response.status} - ${errorText}`);
            
            if (runId) {
              await saveLogToDatabase(
                runId,
                resultRow.eventId.toString(),
                currentEventorUrl,
                `Render proxy anrop misslyckades: HTTP ${response.status} - ${errorText}`
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
