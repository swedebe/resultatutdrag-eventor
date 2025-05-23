
import React from 'react';
import LogComponent from "@/components/LogComponent";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface RunLogSectionProps {
  logs: any[];
  showLogs: boolean;
  onClearLogs: () => void;
}

const RunLogSection: React.FC<RunLogSectionProps> = ({ 
  logs, 
  showLogs, 
  onClearLogs 
}) => {
  const { toast } = useToast();

  const hasLogs = () => {
    return logs && 
           Array.isArray(logs) && 
           logs.length > 0;
  };

  const copyLogsToClipboard = () => {
    if (!hasLogs()) return;
    
    const logText = logs.map((log: any) => {
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

  if (!showLogs || !hasLogs()) {
    return null;
  }

  return (
    <div className="relative">
      <Button 
        variant="outline" 
        size="sm" 
        className="absolute top-4 right-16 z-10"
        onClick={copyLogsToClipboard}
      >
        <Copy className="h-4 w-4 mr-2" />
        Kopiera URL-logg
      </Button>
      <LogComponent logs={logs} onClearLogs={onClearLogs} />
    </div>
  );
};

export default RunLogSection;
