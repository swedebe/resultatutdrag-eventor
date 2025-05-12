
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  const [currentDbName, setCurrentDbName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get the current name from the database directly to avoid stale state
  useEffect(() => {
    if (runId) {
      const fetchCurrentName = async () => {
        const { data, error } = await supabase
          .from('runs')
          .select('name')
          .eq('id', runId)
          .single();
          
        if (!error && data) {
          setCurrentDbName(data.name);
          setNameBeforeEdit(data.name); // Initialize with fresh DB value
        } else {
          console.error("Error fetching run name:", error);
        }
      };
      
      fetchCurrentName();
    }
  }, [runId]);

  const handleRename = async () => {
    setErrorMessage(null);
    
    if (!runId || !saveName.trim()) {
      const error = "Körningen måste ha ett namn";
      toast({
        title: "Ogiltigt namn",
        description: error,
        variant: "destructive",
      });
      return;
    }
    
    // Compare with current DB name instead of local state
    if (saveName.trim() === currentDbName.trim()) {
      const message = "Du använde samma namn som tidigare";
      toast({
        title: "Inget namnbyte behövs",
        description: message,
      });
      return;
    }
    
    setLocalIsRenaming(true);
    try {
      // Use the repository function for updating run name
      const updateResponse = await updateRunName(runId, saveName.trim());
      
      if (!updateResponse.success) {
        throw new Error(updateResponse.message || "Kunde inte uppdatera namnet");
      }
      
      // Update our tracking of the DB value
      setCurrentDbName(saveName.trim());
      
      // Call the parent's onRenameRun function to refresh data
      onRenameRun();
      
      toast({
        title: "Namn uppdaterat",
        description: "Körningens namn har uppdaterats",
      });
    } catch (error: any) {
      console.error("Error renaming run:", error);
      setErrorMessage(error.message || "Ett fel uppstod vid namnbyte av körningen");
      
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
              {errorMessage && (
                <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RunSettingsSection;
