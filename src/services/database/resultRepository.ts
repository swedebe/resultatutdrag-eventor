
/**
 * Database operations for results
 */
import { supabase } from '@/integrations/supabase/client';
import { ResultRow } from '@/types/results';
import { dbRowToResultRow, resultRowToDbFormat } from '../utils/processingUtils';

/**
 * Save a result to the database
 */
export const saveResultToDatabase = async (resultRow: ResultRow, runId: string): Promise<boolean> => {
  try {
    // First, get user info from the run
    const { data: runData, error: runError } = await supabase
      .from('runs')
      .select('name, club_name')
      .eq('id', runId)
      .single();
    
    if (runError) {
      console.error('Error fetching run data:', runError);
    }
    
    // Process the result and add user info
    const processedResult = resultRowToDbFormat(resultRow, runId);
    
    // Add user name and club from the run if available
    if (runData) {
      processedResult.user_name = runData.name || null;
      processedResult.user_club = runData.club_name || null;
    }
    
    console.log('Attempting to save to database:', {
      eventId: processedResult.event_id,
      runId: processedResult.run_id,
      startedValue: resultRow.started, 
      processedStartedValue: processedResult.started,
      startedType: typeof processedResult.started
    });
    
    // Double-check that started is a proper integer
    processedResult.started = Number(processedResult.started) === 1 ? 1 : 0;
    
    // Make a clean insert with explicit type conversions for all numeric fields
    const { error } = await supabase.from('processed_results').insert({
      run_id: processedResult.run_id,
      event_id: String(processedResult.event_id),
      event_name: processedResult.event_name,
      event_date: processedResult.event_date,
      event_type: processedResult.event_type,
      runner_name: processedResult.runner_name,
      person_id: processedResult.person_id ? Number(processedResult.person_id) : null,
      birth_year: processedResult.birth_year,
      class_name: processedResult.class_name,
      class_type: processedResult.class_type,
      position: processedResult.position ? Number(processedResult.position) : null,
      total_participants: processedResult.total_participants ? Number(processedResult.total_participants) : null,
      time: processedResult.time,
      time_after: processedResult.time_after,
      time_after_seconds: processedResult.time_after_seconds ? Number(processedResult.time_after_seconds) : null,
      course_length: processedResult.course_length ? Number(processedResult.course_length) : null,
      organizer: processedResult.organizer,
      started: Number(processedResult.started) // One more forced conversion to be absolutely sure
    });
    
    if (error) {
      console.error(`Error inserting processed result for event ${resultRow.eventId}:`, error);
      console.error('Error details:', error.message, error.code, error.details);
      console.error('Result data that caused the error:', JSON.stringify({
        ...processedResult,
        started: processedResult.started,
        started_type: typeof processedResult.started
      }));
      return false;
    }
    
    console.log('Result saved to database with started value:', processedResult.started);
    return true;
  } catch (err) {
    console.error(`Error saving processed result for event ${resultRow?.eventId}:`, err);
    return false;
  }
};

/**
 * Update run's event count
 */
export const updateRunEventCount = async (runId: string, count: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('runs')
      .update({ event_count: count })
      .eq('id', runId);
      
    if (error) {
      console.error('Error updating run event count:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error updating run event count:', err);
    return false;
  }
};

/**
 * Save a log entry to the database
 */
export const saveLogToDatabase = async (
  runId: string,
  eventId: string,
  url: string,
  status: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.from('processing_logs').insert({
      run_id: runId,
      timestamp: new Date().toISOString().substring(11, 23),
      event_id: eventId,
      url: url,
      status: status
    });
    
    if (error) {
      console.error('Error saving log entry:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error saving log entry:', err);
    return false;
  }
};

/**
 * Function to update a run's name, with enhanced debugging and validation
 */
export const updateRunName = async (runId: string, newName: string): Promise<{ 
  success: boolean; 
  data?: any; 
  error?: any; 
  message?: string;
  debug?: any;
}> => {
  try {
    console.log(`==== UPDATE RUN NAME DEBUG LOG ====`);
    console.log(`Repository: Updating run ${runId} name to "${newName}"`);
    
    // Make sure we have a valid input
    if (!runId || !newName.trim()) {
      console.error('Invalid input: runId or name is empty');
      return { 
        success: false, 
        message: 'Ogiltigt namn eller run ID',
        error: { type: 'validation', details: 'runId or name is empty' }
      };
    }
    
    // Clear any leading/trailing whitespace
    const trimmedName = newName.trim();
    
    // Get the current user for validation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      return { 
        success: false, 
        message: 'Du måste vara inloggad för att byta namn',
        error: { type: 'auth', details: 'No authenticated user' }
      };
    }
    
    // Debug information
    const debugParams = {
      runId,
      newName: trimmedName,
      userId: user.id,
      timestamp: new Date().toISOString()
    };
    console.log('Query parameters:', JSON.stringify(debugParams, null, 2));
    console.log(`SQL equivalent: UPDATE runs SET name = '${trimmedName}' WHERE id = '${runId}' AND user_id = '${user.id}' RETURNING *`);
    
    // Execute the update with explicit .select() to return the updated data
    const { data, error } = await supabase
      .from('runs')
      .update({ name: trimmedName })
      .eq('id', runId)
      .eq('user_id', user.id) // Ensure the user owns this run
      .select();
    
    // Log the complete response for troubleshooting
    console.log('Supabase update response:', { 
      error: error ? {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      } : null,
      data: data,
      hasData: !!data,
      dataLength: data?.length || 0,
      dataContent: data ? JSON.stringify(data) : 'null'
    });
      
    if (error) {
      console.error('Error updating run name:', error);
      return {
        success: false,
        message: `Databasfel: ${error.message || 'Okänt fel'}`,
        error: error,
        debug: debugParams
      };
    }
    
    // Verify update success by checking if data was returned
    if (!data || data.length === 0) {
      console.error(`No rows updated for run ID ${runId}`);
      
      // Double check if the run exists and belongs to this user
      console.log(`Verifying run existence and ownership...`);
      const { data: runData, error: runError } = await supabase
        .from('runs')
        .select('*')
        .eq('id', runId)
        .maybeSingle();
        
      const { count, error: countError } = await supabase
        .from('runs')
        .select('*', { count: 'exact', head: true })
        .eq('id', runId);
        
      console.log('Run existence check:', {
        runExists: !!runData,
        runBelongsToUser: runData?.user_id === user.id,
        totalRunsWithId: count,
        runData: runData,
        error: runError || countError
      });
      
      return {
        success: false,
        message: !runData ? 
          'Körningen hittades inte' : 
          runData.user_id !== user.id ?
          'Du har inte behörighet att ändra denna körning' :
          'Namnbyte misslyckades: Inga rader uppdaterades',
        data: data,
        debug: {
          ...debugParams,
          verificationResult: {
            runExists: !!runData,
            runData: runData,
            userMatches: runData?.user_id === user.id
          }
        }
      };
    }
    
    // Verify that the name was actually updated
    const updatedName = data[0]?.name;
    console.log(`Name update verification: Expected "${trimmedName}", got "${updatedName}"`);
    if (updatedName !== trimmedName) {
      console.error(`Name verification failed`);
      return {
        success: false,
        message: `Verifiering misslyckades: Förväntade "${trimmedName}", fick "${updatedName}"`,
        data: data,
        debug: debugParams
      };
    }
    
    console.log(`Run name successfully updated to "${updatedName}" (${data.length} rows affected)`);
    console.log(`==== END UPDATE RUN NAME DEBUG LOG ====`);
    
    return {
      success: true,
      message: 'Namnbyte genomfört',
      data: data,
      debug: debugParams
    };
  } catch (err: any) {
    console.error('Exception in updateRunName:', err);
    return {
      success: false,
      message: `Ett oväntat fel uppstod: ${err.message || 'Okänt fel'}`,
      error: err,
      debug: {
        runId,
        newName,
        errorStack: err.stack,
        errorMessage: err.message
      }
    };
  }
};

/**
 * Function to fetch processed results from database
 */
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
    const results: ResultRow[] = data.map(dbRowToResultRow);
    
    return results;
  } catch (error) {
    console.error('Error in fetchProcessedResults:', error);
    return [];
  }
};

/**
 * Function to fetch logs from database
 */
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
