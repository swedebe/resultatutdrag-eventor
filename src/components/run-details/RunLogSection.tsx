
import React from 'react';
import LogComponent from "@/components/LogComponent";

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
  const hasLogs = () => {
    return logs && 
           Array.isArray(logs) && 
           logs.length > 0;
  };

  if (!showLogs || !hasLogs()) {
    return null;
  }

  return <LogComponent logs={logs} onClearLogs={onClearLogs} />;
};

export default RunLogSection;
