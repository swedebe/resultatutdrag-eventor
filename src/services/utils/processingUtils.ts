
/**
 * Utility functions for file processing
 */

// Helper function to wait a number of seconds
export const sleep = (seconds: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

/**
 * Converts database row to ResultRow format
 */
export const dbRowToResultRow = (row: any): any => {
  return {
    name: row.runner_name,
    class: row.class_name,
    classType: row.class_type,
    eventId: row.event_id,
    eventName: row.event_name,
    date: row.event_date,
    time: row.time,
    position: row.position,
    organizer: row.organizer || '',
    timeInSeconds: row.time_after_seconds,
    timeAfterWinner: row.time_after,
    length: row.course_length,
    totalParticipants: row.total_participants,
    eventType: row.event_type,
    personId: row.person_id,
    birthYear: row.birth_year,
    started: row.started === 1
  };
};

/**
 * Converts ResultRow to database format for saving
 */
export const resultRowToDbFormat = (resultRow: any, runId: string): any => {
  // Log all possible forms of the 'started' value for debugging
  console.log('Processing started value:', {
    original: resultRow.started,
    type: typeof resultRow.started,
    booleanConversion: Boolean(resultRow.started),
    stringComparison: String(resultRow.started) === 'true' || String(resultRow.started) === '1',
    numberConversion: Number(resultRow.started)
  });
  
  // Handle all possible formats of the 'started' value
  let startedValue = 0;
  
  if (resultRow.started === true || 
      resultRow.started === 1 || 
      resultRow.started === '1' || 
      resultRow.started === 'true' || 
      resultRow.started === 'True' ||
      resultRow.started === 'TRUE' ||
      resultRow.started === 'yes' ||
      resultRow.started === 'Yes' ||
      resultRow.started === 'YES') {
    startedValue = 1;
  }
  
  return {
    run_id: runId,
    event_date: resultRow.date,
    event_id: String(resultRow.eventId),
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
    started: startedValue
  };
};
