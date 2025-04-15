
import type { Json } from "@/integrations/supabase/types";
import type { LogEntry } from "@/components/LogComponent";

// Extended type for the runs table that includes the logs field
export interface RunWithLogs {
  club_name: string | null;
  date: string;
  email: string | null;
  event_count: number;
  id: string;
  name: string;
  results: Json;
  user_id: string;
  logs?: LogEntry[]; // Added logs field
}

// Type for inserting or updating a run with logs
export interface RunWithLogsUpdate {
  club_name?: string | null;
  date?: string;
  email?: string | null;
  event_count?: number;
  id?: string;
  name?: string;
  results?: Json;
  user_id?: string;
  logs?: Json; // Changed to Json type for database compatibility
}

// Function to convert LogEntry[] to Json for database operations
export const logsToJson = (logs: LogEntry[]): Json => {
  return logs as unknown as Json;
};

// Function to convert Json to LogEntry[] when retrieving from database
export const jsonToLogs = (json: Json | null): LogEntry[] => {
  if (!json) return [];
  return json as unknown as LogEntry[];
};
