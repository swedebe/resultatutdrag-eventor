
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { updateRunName } from "@/services/database/resultRepository";

interface RunSettingsSectionProps {
  saveName: string;
  onSaveNameChange: (name: string) => void;
  onRenameRun: () => void;
  isRenaming: boolean;
  runId: string | null;
}

const RunSettingsSection: React.FC<RunSettingsSectionProps> = ({
  saveName,
  onSaveNameChange,
  onRenameRun,
  isRenaming,
  runId,
}) => {
  const { toast } = useToast();
  const [localIsRenaming, setLocalIsRenaming] = useState(false);
  const [nameBeforeEdit, setNameBeforeEdit] = useState('');

  // Store the original name to detect actual changes
  useEffect(() => {
    if (!localIsRenaming) {
      setNameBeforeEdit(saveName);
    }
  }, [saveName, localIsRenaming]);

  const handleRename = async () => {
    if (!runId || !saveName.trim()) {
      toast({
        title: "Ogiltigt namn",
        description: "Körningen måste ha ett namn",
        variant: "destructive",
      });
      return;
    }
    
    // Skip update if name hasn't changed
    if (saveName.trim() === nameBeforeEdit.trim()) {
      toast({
        title: "Inget namnbyte behövs",
        description: "Du använde samma namn som tidigare",
      });
      return;
    }
    
    setLocalIsRenaming(true);
    try {
      console.log(`RunSettingsSection: Attempting to rename run ${runId} to "${saveName}"`);
      
      const success = await updateRunName(runId, saveName.trim());
      
      if (!success) {
        throw new Error("Kunde inte byta namnet");
      }
      
      toast({
        title: "Namn uppdaterat",
        description: "Körningens namn har uppdaterats",
      });
      
      // Call the parent's onRenameRun function to refresh data
      onRenameRun();
    } catch (error: any) {
      console.error("Error renaming run:", error);
      toast({
        title: "Fel vid namnbyte",
        description: error.message || "Ett fel uppstod vid namnbyte av körningen",
        variant: "destructive",
      });
    } finally {
      setLocalIsRenaming(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Hantera körning</CardTitle>
        <CardDescription>
          Hantera denna körning eller exportera resultaten
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:gap-4 items-end">
            <div className="flex flex-col gap-2">
              <Label htmlFor="save-name">Namn på körningen</Label>
              <div className="flex gap-2">
                <Input 
                  id="save-name"
                  value={saveName} 
                  onChange={(e) => onSaveNameChange(e.target.value)}
                  placeholder="Ange ett beskrivande namn för denna körning" 
                />
                <Button 
                  onClick={handleRename} 
                  disabled={localIsRenaming || isRenaming || !saveName.trim() || !runId}
                  variant="secondary"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {localIsRenaming ? "Sparar..." : "Byt namn"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RunSettingsSection;
