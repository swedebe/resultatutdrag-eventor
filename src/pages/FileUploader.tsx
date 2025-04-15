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
import { Home, Trash2, FileDown, Pencil, Save, XCircle } from "lucide-react";
import { logsToJson } from "@/types/database";

const FileUploader = () => {
  const { toast } = useToast();
  const [results, setResults] = useState<ResultRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [delay, setDelay] = useState<number>(15);
  const [saveName, setSaveName] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [cancelProcessing, setCancelProcessing] = useState<boolean>(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    setLogsUpdateFunction(updateLogs);
    return () => setLogsUpdateFunction(null);
  }, []);

  const updateLogs = async (newLogs: LogEntry[]) => {
    setLogs(newLogs);
    
    if (runId) {
      try {
        await supabase
          .from('runs')
          .update({ 
            logs: logsToJson(newLogs) 
          })
          .eq('id', runId);
        
        console.log("Logs saved to database, count:", newLogs.length);  
      } catch (error) {
        console.error("Error saving logs to database:", error);
      }
    }
  };

  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (isProcessing && runId) {
        try {
          const updateData = {
            results: results,
            logs: logsToJson(logs),
            event_count: results.length
          };
          
          await supabase
            .from('runs')
            .update(updateData)
            .eq('id', runId);
        } catch (error) {
          console.error("Error saving state before unload:", error);
        }
        
        e.preventDefault();
        e.returnValue = "Du har en pågående körning. Är du säker på att du vill lämna sidan?";
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isProcessing, runId, results, logs]);
  
  const createNewRun = async (initialName: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('runs')
        .insert({
          name: initialName,
          results: [],
          logs: logsToJson([]),
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

  const saveResultsToDatabase = async () => {
    if (!runId) {
      toast({
        title: "Ingen körning aktiv",
        description: "Det finns ingen aktiv körning att spara resultat till",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const resultsArray = Array.isArray(results) ? results : [];
      console.log("Saving run with results count:", resultsArray.length);
      console.log("Saving run with logs count:", logs.length);
      
      await supabase
        .from('runs')
        .update({ 
          results: resultsArray,
          event_count: resultsArray.length,
          logs: logsToJson(logs)
        })
        .eq('id', runId);
        
      toast({
        title: "Sparad",
        description: `Körningen "${saveName}" har sparats med ${resultsArray.length} resultat`,
      });
      
      setTimeout(() => {
        navigate(`/run/${runId}`);
      }, 500);
    } catch (error: any) {
      console.error("Error saving results to database:", error);
      toast({
        title: "Fel vid sparande",
        description: error.message || "Ett fel uppstod vid sparande av körningen",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelProcessing = () => {
    if (isProcessing) {
      setCancelProcessing(true);
      addCancellationLog();
      setCurrentStatus("Avbryter körning...");
      
      if (runId) {
        saveCurrentState();
      }
    }
  };

  const addCancellationLog = () => {
    const newLog: LogEntry = {
      timestamp: new Date().toISOString().substring(11, 23),
      eventId: "system",
      url: "",
      status: "Användaren avbröt körningen"
    };
    
    const updatedLogs = [...logs, newLog];
    setLogs(updatedLogs);
    
    if (runId) {
      try {
        supabase
          .from('runs')
          .update({ logs: logsToJson(updatedLogs) })
          .eq('id', runId);
      } catch (error) {
        console.error("Error saving cancellation log:", error);
      }
    }
  };
  
  const saveCurrentState = async () => {
    if (!runId) return;
    
    try {
      const updateData = { 
        results: results,
        logs: logsToJson(logs),
        event_count: results.length
      };
      
      await supabase
        .from('runs')
        .update(updateData)
        .eq('id', runId);
        
      console.log("Current state saved to database with logs count:", logs.length);
    } catch (error) {
      console.error("Error saving current state:", error);
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
    setCancelProcessing(false);
    clearLogs();
    
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const timeStr = today.toTimeString().split(' ')[0];
    const initialRunName = `Körning ${dateStr} ${timeStr}`;
    setSaveName(initialRunName);
    
    const newRunId = await createNewRun(initialRunName);
    setRunId(newRunId);
    
    try {
      const enrichedResults = await processExcelFile(
        file, 
        setProgress, 
        setCurrentStatus, 
        delay,
        async (partialResults: ResultRow[]) => {
          setResults(partialResults);
          
          if (cancelProcessing) {
            throw new Error("Användaren avbröt körningen");
          }
          
          if (newRunId) {
            try {
              await supabase
                .from('runs')
                .update({ 
                  results: partialResults,
                  logs: logsToJson(logs),
                  event_count: partialResults.length
                })
                .eq('id', newRunId);
            } catch (error) {
              console.error("Error saving partial results:", error);
            }
          }
          
          return !cancelProcessing;
        }
      );
      
      if (!cancelProcessing) {
        setResults(enrichedResults);
        
        if (enrichedResults.length > 0) {
          toast({
            title: "Filbearbetning slutförd",
            description: `${enrichedResults.length} resultat bearbetade. Klicka på "Spara" för att spara resultaten.`,
          });
        } else {
          toast({
            title: "Filbearbetning slutförd",
            description: "Inga resultat hittades.",
          });
        }
      }
    } catch (error: any) {
      console.error("Fel vid bearbetning av fil:", error);
      
      if (cancelProcessing) {
        toast({
          title: "Körning avbruten",
          description: "Körningen avbröts av användaren",
        });
      } else {
        toast({
          title: "Fel vid bearbetning",
          description: error.message || "Ett fel uppstod vid bearbetning av filen",
          variant: "destructive",
        });
      }
      
      if (newRunId) {
        try {
          await supabase
            .from('runs')
            .update({ 
              logs: logsToJson(logs),
              results: results,
              event_count: results.length
            })
            .eq('id', newRunId);
        } catch (saveError) {
          console.error("Error saving logs after error:", saveError);
        }
      }
    } finally {
      setIsProcessing(false);
      setCancelProcessing(false);
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
          
          {isProcessing && (
            <Button 
              variant="destructive" 
              onClick={handleCancelProcessing}
              className="mt-4"
            >
              <XCircle className="mr-2 h-4 w-4" /> Avbryt körning
            </Button>
          )}
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
                      onClick={saveResultsToDatabase}
                      variant="default"
                      disabled={isSaving || results.length === 0 || !runId}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Sparar..." : "Spara till databasen"}
                    </Button>
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
