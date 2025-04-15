
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
import { Home, Trash2, FileDown, Pencil } from "lucide-react";

const FileUploader = () => {
  const { toast } = useToast();
  const [results, setResults] = useState<ResultRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [delay, setDelay] = useState<number>(15); // Changed default to 15
  const [saveName, setSaveName] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const navigate = useNavigate();
  
  // Setup logging functionality
  useEffect(() => {
    setLogsUpdateFunction(updateLogsWithSaving);
    return () => setLogsUpdateFunction(null);
  }, []);

  // Function to update logs and save them to database
  const updateLogsWithSaving = async (newLogs: LogEntry[]) => {
    setLogs(newLogs);
    
    // If we have a run ID, save the logs to the database
    if (runId) {
      try {
        await supabase
          .from('runs')
          .update({ 
            results: results,
            event_count: results.length,
          })
          .eq('id', runId);
      } catch (error) {
        console.error("Error saving logs to database:", error);
      }
    }
  };
  
  // Create a new run in the database
  const createNewRun = async (initialName: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('runs')
        .insert({
          name: initialName,
          results: [],
          event_count: 0,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        toast({
          title: "Körning skapad",
          description: "En ny körning har skapats i databasen.",
        });
        return data[0].id;
      }
      return null;
    } catch (error: any) {
      console.error("Error creating new run:", error);
      toast({
        title: "Fel vid skapande av körning",
        description: error.message || "Ett fel uppstod vid skapande av körningen",
        variant: "destructive",
      });
      return null;
    }
  };

  // Save current results to database
  const saveResultsToDatabase = async () => {
    if (!runId) return;
    
    try {
      await supabase
        .from('runs')
        .update({ 
          results: results,
          event_count: results.length,
        })
        .eq('id', runId);
    } catch (error) {
      console.error("Error saving results to database:", error);
    }
  };
  
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
    
    // Create a default name for the run based on date and time
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const timeStr = today.toTimeString().split(' ')[0];
    const initialRunName = `Körning ${dateStr} ${timeStr}`;
    setSaveName(initialRunName);
    
    // Create a new run in the database
    const newRunId = await createNewRun(initialRunName);
    setRunId(newRunId);
    
    try {
      const enrichedResults = await processExcelFile(
        file, 
        setProgress, 
        setCurrentStatus, 
        delay,
        // Callback to save incremental results
        async (partialResults: ResultRow[]) => {
          setResults(partialResults);
          if (newRunId) {
            await supabase
              .from('runs')
              .update({ 
                results: partialResults,
                event_count: partialResults.length,
              })
              .eq('id', newRunId);
          }
        }
      );
      
      setResults(enrichedResults);
      
      if (enrichedResults.length > 0) {
        toast({
          title: "Filbearbetning slutförd",
          description: `${enrichedResults.length} resultat bearbetade och sparade`,
        });
        
        // Final update with all results
        if (newRunId) {
          await supabase
            .from('runs')
            .update({ 
              results: enrichedResults,
              event_count: enrichedResults.length,
            })
            .eq('id', newRunId);
        }
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

  const handleDeleteRun = async () => {
    if (!runId) return;
    
    try {
      const { error } = await supabase
        .from('runs')
        .delete()
        .eq('id', runId);
      
      if (error) throw error;
      
      toast({
        title: "Körning borttagen",
        description: "Körningen har tagits bort från databasen.",
      });
      
      // Navigate back to home after deletion
      navigate("/");
    } catch (error: any) {
      console.error("Fel vid borttagning av körning:", error);
      toast({
        title: "Fel vid borttagning",
        description: error.message || "Ett fel uppstod vid borttagning av körningen",
        variant: "destructive",
      });
    }
  };

  const handleRenameRun = async () => {
    if (!runId || !saveName.trim()) return;
    
    setIsRenaming(true);
    
    try {
      const { error } = await supabase
        .from('runs')
        .update({ name: saveName.trim() })
        .eq('id', runId);
      
      if (error) throw error;
      
      toast({
        title: "Namn uppdaterat",
        description: "Körningen har fått ett nytt namn.",
      });
    } catch (error: any) {
      console.error("Fel vid namnbyte av körning:", error);
      toast({
        title: "Fel vid namnbyte",
        description: error.message || "Ett fel uppstod vid namnbyte av körningen",
        variant: "destructive",
      });
    } finally {
      setIsRenaming(false);
    }
  };
  
  const handleClearResults = () => {
    if (runId) {
      handleDeleteRun();
    }
    
    setResults([]);
    setFile(null);
    setProgress(0);
    setCurrentStatus("");
    clearLogs();
    setSaveName("");
    setRunId(null);
    
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
                        onChange={(e) => setSaveName(e.target.value)}
                        placeholder="Ange ett beskrivande namn för denna körning" 
                      />
                      <Button 
                        onClick={handleRenameRun} 
                        disabled={isRenaming || !saveName.trim() || !runId}
                        variant="secondary"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Byt namn
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button 
                      onClick={() => navigate("/")}
                      variant="outline"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      Tillbaka till startsidan
                    </Button>
                    <Button 
                      onClick={handleExport}
                      variant="outline"
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Ladda ner Excel
                    </Button>
                    <Button 
                      onClick={handleDeleteRun}
                      variant="destructive"
                      disabled={!runId}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Ta bort körning
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
