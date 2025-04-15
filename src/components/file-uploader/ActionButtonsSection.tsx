
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Home, Trash2, FileDown, Save, XCircle } from "lucide-react";

interface ActionButtonsSectionProps {
  onSaveResults: () => void;
  onExportResults: () => void;
  onDeleteRun: () => void;
  onCancelProcessing?: () => void;
  isSaving: boolean;
  isProcessing: boolean;
  resultsLength: number;
  runId: string | null;
}

const ActionButtonsSection: React.FC<ActionButtonsSectionProps> = ({
  onSaveResults,
  onExportResults,
  onDeleteRun,
  onCancelProcessing,
  isSaving,
  isProcessing,
  resultsLength,
  runId,
}) => {
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      <Button 
        onClick={onSaveResults}
        variant="default"
        disabled={isSaving || resultsLength === 0 || !runId || isProcessing}
        className="bg-green-600 hover:bg-green-700"
      >
        <Save className="mr-2 h-4 w-4" />
        {isSaving ? "Sparar..." : "Slutför"}
      </Button>
      
      {/* Use Button instead of Link when processing, otherwise use Link */}
      {isProcessing ? (
        <Button 
          variant="outline"
          disabled={true}
        >
          <Home className="mr-2 h-4 w-4" />
          Tillbaka till startsidan
        </Button>
      ) : (
        <Link to="/">
          <Button variant="outline">
            <Home className="mr-2 h-4 w-4" />
            Tillbaka till startsidan
          </Button>
        </Link>
      )}
      
      <Button 
        onClick={onExportResults}
        variant="outline"
        disabled={isProcessing}
      >
        <FileDown className="mr-2 h-4 w-4" />
        Ladda ner Excel
      </Button>
      
      <Button 
        onClick={onDeleteRun}
        variant="destructive"
        disabled={!runId || isProcessing}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Ta bort körning
      </Button>
      
      {onCancelProcessing && (
        <Button 
          onClick={onCancelProcessing}
          variant="destructive"
          disabled={!isProcessing}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Avbryt körning
        </Button>
      )}
    </div>
  );
};

export default ActionButtonsSection;
