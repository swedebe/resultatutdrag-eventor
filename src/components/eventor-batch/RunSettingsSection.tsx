
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Körningsinställningar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="run-name">Namn på körningen</Label>
            <div className="flex gap-2">
              <Input
                id="run-name"
                value={saveName}
                onChange={(e) => onSaveNameChange(e.target.value)}
                placeholder="Ange ett namn för körningen"
                className="flex-1"
              />
              {runId && (
                <Button 
                  onClick={onRenameRun} 
                  disabled={isRenaming || !saveName.trim()} 
                  variant="outline"
                >
                  {isRenaming ? "Sparar..." : "Spara namn"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RunSettingsSection;
