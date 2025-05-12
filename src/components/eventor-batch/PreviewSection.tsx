
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Save, FilePenLine, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ResultRow } from "@/services/FileProcessingService";
import { useAllAppTexts } from "@/hooks/useAppText";
import ResultsPreview from "@/components/ResultsPreview";

interface PreviewSectionProps {
  results: ResultRow[];
  saveName: string;
  onSaveNameChange: (name: string) => void;
  onRenameRun: () => void;
  isRenaming: boolean;
  runId: string | null;
  onSaveResults: () => void;
  onExportResults: () => void;
  onDeleteRun: () => void;
  onCancelProcessing: () => void;
  isSaving: boolean;
  isProcessing: boolean;
}

const PreviewSection: React.FC<PreviewSectionProps> = ({
  results,
  saveName,
  onSaveNameChange,
  onRenameRun,
  isRenaming,
  runId,
  onSaveResults,
  onExportResults,
  onDeleteRun,
  onCancelProcessing,
  isSaving,
  isProcessing
}) => {
  const { toast } = useToast();
  const { texts } = useAllAppTexts();

  if (results.length === 0 && !isProcessing) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{texts.eventorbatch_results_title || "Resultatförhandsgranskning"}</CardTitle>
        <CardDescription>{texts.eventorbatch_results_subtitle || "Förhandsgranskning av bearbetade resultat"}</CardDescription>
      </CardHeader>
      <CardContent>
        {results.length > 0 ? (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex flex-col space-y-2 flex-grow">
                <Label htmlFor="save-name">{texts.eventorbatch_save_name || "Namn på körningen"}</Label>
                <div className="flex space-x-2">
                  <Input 
                    id="save-name"
                    value={saveName} 
                    onChange={(e) => onSaveNameChange(e.target.value)}
                    placeholder={texts.eventorbatch_save_name_placeholder || "Ange ett namn för körningen"} 
                    className="flex-grow"
                  />
                  {runId && (
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={onRenameRun}
                      disabled={isRenaming || !saveName.trim() || isProcessing}
                    >
                      <FilePenLine className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={onSaveResults} 
                  disabled={isSaving || !saveName.trim() || isProcessing}
                  className="whitespace-nowrap"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {runId 
                    ? (texts.eventorbatch_see_results || "Se körningsresultat") 
                    : (texts.eventorbatch_save_results || "Spara resultat")}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onExportResults}
                  disabled={isProcessing}
                  className="whitespace-nowrap"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {texts.eventorbatch_export || "Exportera"}
                </Button>
                {runId && (
                  <Button 
                    variant="destructive" 
                    size="icon"
                    onClick={onDeleteRun}
                    disabled={isProcessing}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <ResultsPreview results={results} />
          </>
        ) : isProcessing ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              {texts.eventorbatch_processing_message || "Bearbetar fil..."}
            </p>
            <Button 
              variant="destructive" 
              onClick={onCancelProcessing}
            >
              {texts.eventorbatch_cancel || "Avbryt"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default PreviewSection;
