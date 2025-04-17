
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

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

  const handleRename = async () => {
    if (!runId || !saveName.trim()) return;
    
    setLocalIsRenaming(true);
    try {
      const { error } = await supabase
        .from('runs')
        .update({ name: saveName.trim() })
        .eq('id', runId);
        
      if (error) throw error;
      
      toast({
        title: "Namn uppdaterat",
        description: "Körningens namn har uppdaterats",
      });
      
      // Call the parent's onRenameRun function to refresh data if needed
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
