
import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export interface LogEntry {
  timestamp: string;
  eventId: string | number;
  url: string;
  status: string;
}

// Global logs state and update function to be set from the parent component
let logsUpdateFunction: ((logs: LogEntry[]) => void) | null = null;
let currentLogs: LogEntry[] = [];

export const setLogsUpdateFunction = (updateFn: ((logs: LogEntry[]) => void) | null) => {
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

  // Log to console for debugging
  console.log(`[LOG] ${timestamp} - ID: ${eventId}, Status: ${status}`);
};

export const clearLogs = () => {
  currentLogs = [];
  if (logsUpdateFunction) {
    logsUpdateFunction([]);
  }
};

interface LogComponentProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

const LogComponent: React.FC<LogComponentProps> = ({ logs, onClearLogs }) => {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Scroll to bottom of logs when they change
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);
  
  // Set the logs update function when the component mounts
  useEffect(() => {
    setLogsUpdateFunction((newLogs) => {
      // Empty function to prevent errors if component is unmounted
    });
    
    return () => {
      // Cleanup on unmount
      setLogsUpdateFunction(null);
    };
  }, []);

  const copyLogsToClipboard = () => {
    if (!logs || logs.length === 0) return;
    
    const logText = logs.map(log => {
      return `[${log.timestamp}] [ID ${log.eventId}] ${log.url} ${log.status}`;
    }).join('\n');
    
    navigator.clipboard.writeText(logText)
      .then(() => {
        toast({
          title: "URL-logg kopierad",
          description: "URL-loggen har kopierats till urklipp",
        });
      })
      .catch(err => {
        console.error('Failed to copy logs:', err);
        toast({
          title: "Kunde inte kopiera logg",
          description: "Ett fel uppstod när loggen skulle kopieras",
          variant: "destructive"
        });
      });
  };

  if (!logs || logs.length === 0) {
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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={copyLogsToClipboard}
          >
            <Copy className="h-4 w-4 mr-2" />
            Kopiera URL-logg
          </Button>
          <Button variant="outline" size="sm" onClick={onClearLogs}>
            Rensa logg
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-muted p-4 rounded-md max-h-[300px] overflow-y-auto text-xs font-mono">
          {logs.map((log, index) => (
            <div key={index} className={`py-1 ${index % 2 === 0 ? 'bg-muted/50' : ''}`}>
              <span className="text-muted-foreground">[{log.timestamp}]</span>{' '}
              <span className="text-blue-500">[ID {log.eventId}]</span>{' '}
              {log.url && <span className="text-green-500">{log.url.substring(0, 60)}...</span>}{' '}
              <span className={log.status.includes('Sparat resultat') ? 'text-yellow-500 font-bold' : ''}>{log.status}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </CardContent>
    </Card>
  );
};

export default LogComponent;
