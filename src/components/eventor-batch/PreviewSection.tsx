
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { ResultRow } from "@/services/FileProcessingService";

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
  isProcessing,
}) => {
  if (results.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Bearbetade resultat</CardTitle>
        <CardDescription>
          {results.length} resultat bearbetade, {results.filter(r => r.length && r.length > 0).length} med banlängd, {results.filter(r => r.totalParticipants && r.totalParticipants > 0).length} med antal startande
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-end gap-4 mb-4">
            <div className="flex-1">
              <label htmlFor="save-name" className="block text-sm font-medium text-gray-700 mb-1">
                Namn på körning
              </label>
              <Input
                id="save-name"
                type="text"
                value={saveName}
                onChange={(e) => onSaveNameChange(e.target.value)}
                className="block w-full"
                placeholder="Namn på denna körning"
                disabled={isProcessing || isSaving}
              />
            </div>
            {runId && (
              <Button
                onClick={onRenameRun}
                variant="outline"
                size="sm"
                disabled={isRenaming || isProcessing || !saveName.trim() || isSaving}
              >
                {isRenaming ? "Sparar..." : "Spara namn"}
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={onSaveResults}
              disabled={isProcessing || isSaving}
              className="min-w-[150px]"
            >
              {isSaving
                ? "Sparar..."
                : runId
                  ? "Se körningsresultat"
                  : "Spara körning"}
            </Button>
            <Button
              onClick={onExportResults}
              variant="outline"
              disabled={isProcessing || isSaving}
            >
              Exportera till Excel
            </Button>
            {runId && (
              <Button
                onClick={onDeleteRun}
                variant="destructive"
                disabled={isProcessing || isSaving}
              >
                Ta bort körning
              </Button>
            )}
            {isProcessing && (
              <Button onClick={onCancelProcessing} variant="destructive">
                Avbryt bearbetning
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Namn</TableHead>
                <TableHead>Klass</TableHead>
                <TableHead>Tävlings-id</TableHead>
                <TableHead>Tävlingsnamn</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Banlängd</TableHead>
                <TableHead>Antal startande</TableHead>
                <TableHead>Placering</TableHead>
                <TableHead>Tid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.slice(0, 10).map((result, index) => (
                <TableRow key={index}>
                  <TableCell>{result.name}</TableCell>
                  <TableCell>{result.class}</TableCell>
                  <TableCell>{result.eventId}</TableCell>
                  <TableCell>{result.eventName}</TableCell>
                  <TableCell>{result.date}</TableCell>
                  <TableCell>{result.length || "—"}</TableCell>
                  <TableCell>{result.totalParticipants || "—"}</TableCell>
                  <TableCell>{result.position}</TableCell>
                  <TableCell>{result.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {results.length > 10 && (
            <div className="mt-2 text-center text-muted-foreground">
              Visar 10 av {results.length} resultat
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PreviewSection;
