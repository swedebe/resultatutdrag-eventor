
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
      processedStartedValue: processedResult.started
    });
    
    const { error } = await supabase.from('processed_results').insert(processedResult);
    
    if (error) {
      console.error(`Error inserting processed result for event ${resultRow.eventId}:`, error);
      console.error('Result data that caused the error:', JSON.stringify(processedResult));
      return false;
    }
    
    console.log('Result saved to database:', processedResult);
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
