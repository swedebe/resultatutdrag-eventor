
import React from 'react';
import { Button } from "@/components/ui/button";
import { Home, FileDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RunActionButtonsProps {
  onExport: () => void;
  resultsCount: number;
  hasLogs: boolean;
  showLogs: boolean;
  onToggleLogs: () => void;
}

const RunActionButtons: React.FC<RunActionButtonsProps> = ({
  onExport,
  resultsCount,
  hasLogs,
  showLogs,
  onToggleLogs
}) => {
  const navigate = useNavigate();

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      <Button onClick={() => navigate('/')}>
        <Home className="mr-2 h-4 w-4" />
        Tillbaka till startsidan
      </Button>
      <Button onClick={onExport} variant="outline" disabled={resultsCount === 0}>
        <FileDown className="mr-2 h-4 w-4" />
        Ladda ner Excel
      </Button>
      {hasLogs && (
        <Button onClick={onToggleLogs} variant="outline">
          {showLogs ? "Dölj loggar" : "Visa loggar"}
        </Button>
      )}
    </div>
  );
};

export default RunActionButtons;
