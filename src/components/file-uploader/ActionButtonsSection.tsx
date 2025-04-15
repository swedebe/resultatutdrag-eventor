
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Home, Trash2, FileDown, Save } from "lucide-react";

interface ActionButtonsSectionProps {
  onSaveResults: () => void;
  onExportResults: () => void;
  onDeleteRun: () => void;
  isSaving: boolean;
  resultsLength: number;
  runId: string | null;
}

const ActionButtonsSection: React.FC<ActionButtonsSectionProps> = ({
  onSaveResults,
  onExportResults,
  onDeleteRun,
  isSaving,
  resultsLength,
  runId,
}) => {
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      <Button 
        onClick={onSaveResults}
        variant="default"
        disabled={isSaving || resultsLength === 0 || !runId}
        className="bg-green-600 hover:bg-green-700"
      >
        <Save className="mr-2 h-4 w-4" />
        {isSaving ? "Sparar..." : "Spara till databasen"}
      </Button>
      <Link to="/">
        <Button 
          variant="outline"
        >
          <Home className="mr-2 h-4 w-4" />
          Tillbaka till startsidan
        </Button>
      </Link>
      <Button 
        onClick={onExportResults}
        variant="outline"
      >
        <FileDown className="mr-2 h-4 w-4" />
        Ladda ner Excel
      </Button>
      <Button 
        onClick={onDeleteRun}
        variant="destructive"
        disabled={!runId}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Ta bort körning
      </Button>
    </div>
  );
};

export default ActionButtonsSection;
