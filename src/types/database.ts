
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
  logs?: LogEntry[]; // Added logs field
}
