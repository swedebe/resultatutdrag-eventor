
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import FileUploadForm from "@/components/FileUploadForm";
import LogComponent, { LogEntry, clearLogs, setLogsUpdateFunction } from "@/components/LogComponent";
import ResultsPreview from "@/components/ResultsPreview";
import ResultsTable from "@/components/ResultsTable";
import { ResultRow, processExcelFile, exportResultsToExcel } from "@/services/FileProcessingService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const FileUploader = () => {
  const { toast } = useToast();
  const [results, setResults] = useState<ResultRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [delay, setDelay] = useState<number>(30);
  const [saveName, setSaveName] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const navigate = useNavigate();
  
  // Setup logging functionality
  useEffect(() => {
    setLogsUpdateFunction(setLogs);
    return () => setLogsUpdateFunction(null);
  }, []);
  
  const handleProcessFile = async () => {
    if (!file) {
      toast({
        title: "Ingen fil vald",
        description: "Välj en fil först",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    clearLogs();
    
    try {
      const enrichedResults = await processExcelFile(file, setProgress, setCurrentStatus, delay);
      setResults(enrichedResults);
      
      if (enrichedResults.length > 0) {
        toast({
          title: "Filbearbetning slutförd",
          description: `${enrichedResults.length} resultat bearbetade`,
        });
        // Förslag på namn för sparande baserat på datum
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        setSaveName(`Körning ${dateStr}`);
      } else {
        toast({
          title: "Filbearbetning slutförd",
          description: "Inga resultat att exportera",
        });
      }
    } catch (error) {
      console.error("Fel vid bearbetning av fil:", error);
      toast({
        title: "Fel vid bearbetning",
        description: "Ett fel uppstod vid bearbetning av filen",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleExport = () => {
    if (results.length === 0) {
      toast({
        title: "Inga resultat att exportera",
        description: "Ladda upp och bearbeta en fil först",
        variant: "destructive",
      });
      return;
    }
    
    exportResultsToExcel(results);
    
    toast({
      title: "Export slutförd",
      description: "Resultat exporterade till berikade_resultat.xlsx",
    });
  };

  const handleSaveToDatabase = async () => {
    if (results.length === 0) {
      toast({
        title: "Inga resultat att spara",
        description: "Ladda upp och bearbeta en fil först",
        variant: "destructive",
      });
      return;
    }

    if (!saveName.trim()) {
      toast({
        title: "Namn saknas",
        description: "Ge ett namn till denna körning",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { data, error } = await supabase
        .from('runs')
        .insert({
          name: saveName.trim(),
          results: results,
          event_count: results.length,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Körning sparad",
        description: "Körningen har sparats i databasen",
      });

      // Redirect to home page
      navigate("/");
    } catch (error: any) {
      console.error("Fel vid sparande av körning:", error);
      toast({
        title: "Fel vid sparande",
        description: error.message || "Ett fel uppstod vid sparande av körningen",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleClearResults = () => {
    setResults([]);
    setFile(null);
    setProgress(0);
    setCurrentStatus("");
    clearLogs();
    setSaveName("");
    
    toast({
      title: "Resultat rensade",
      description: "Alla resultat har tagits bort",
    });
  };
  
  return (
    <div className="container py-8">
      <h1 className="text-4xl font-bold mb-6">Göingarna Resultatanalys - Filuppladdning</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ladda upp resultatfil (Excel)</CardTitle>
          <CardDescription>
            Ladda upp en Excel-fil med resultat för att automatiskt berika dem med banlängd och antal startande
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadForm
            isProcessing={isProcessing}
            progress={progress}
            currentStatus={currentStatus}
            onFileChange={setFile}
            onProcessFile={handleProcessFile}
            onExport={handleExport}
            onClear={handleClearResults}
            hasResults={results.length > 0}
            delay={delay}
            onDelayChange={setDelay}
          />
        </CardContent>
      </Card>
      
      <LogComponent logs={logs} onClearLogs={clearLogs} />
      
      {results.length > 0 && (
        <>
          <ResultsPreview results={results} />
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Spara körning</CardTitle>
              <CardDescription>
                Spara denna körning i databasen eller ladda ner som Excel-fil
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="sm:col-span-2">
                    <Label htmlFor="save-name">Namn på körningen</Label>
                    <Input 
                      id="save-name"
                      value={saveName} 
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="Ange ett beskrivande namn för denna körning" 
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSaveToDatabase} 
                      disabled={isSaving || !saveName.trim()}
                      className="flex-1"
                    >
                      {isSaving ? "Sparar..." : "Spara i databas"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleExport}
                      className="flex-1"
                    >
                      Ladda ner Excel
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <ResultsTable results={results} />
        </>
      )}
    </div>
  );
};

export default FileUploader;
