
import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface LogEntry {
  timestamp: string;
  eventId: string | number;
  url: string;
  status: string;
}

// Global logs state and update function to be set from the parent component
let logsUpdateFunction: ((logs: LogEntry[]) => void) | null = null;
let currentLogs: LogEntry[] = [];

export const setLogsUpdateFunction = (updateFn: (logs: LogEntry[]) => void) => {
  logsUpdateFunction = updateFn;
};

export const addLog = (eventId: string | number, url: string, status: string) => {
  const timestamp = new Date().toISOString().substring(11, 23);
  const newLog = { timestamp, eventId, url, status };
  
  // Update local logs array
  currentLogs = [...currentLogs, newLog];
  
  // Call the update function if it exists
  if (logsUpdateFunction) {
    logsUpdateFunction(currentLogs);
  }
};

export const clearLogs = () => {
  currentLogs = [];
  if (logsUpdateFunction) {
    logsUpdateFunction(currentLogs);
  }
};

interface LogComponentProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

const LogComponent: React.FC<LogComponentProps> = ({ logs, onClearLogs }) => {
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom of logs when they change
  React.useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (logs.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>URL-loggning</CardTitle>
          <CardDescription>
            Loggning av förfrågningar till Eventor
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onClearLogs}>
          Rensa logg
        </Button>
      </CardHeader>
      <CardContent>
        <div className="bg-muted p-4 rounded-md max-h-[300px] overflow-y-auto text-xs font-mono">
          {logs.map((log, index) => (
            <div key={index} className={`py-1 ${index % 2 === 0 ? 'bg-muted/50' : ''}`}>
              <span className="text-muted-foreground">[{log.timestamp}]</span>{' '}
              <span className="text-blue-500">[ID {log.eventId}]</span>{' '}
              {log.url && <span className="text-green-500">{log.url.substring(0, 60)}...</span>}{' '}
              <span>{log.status}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </CardContent>
    </Card>
  );
};

export default LogComponent;
