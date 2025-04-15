import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import LogComponent, { LogEntry, clearLogs, setLogsUpdateFunction } from "@/components/LogComponent";
import ResultsTable from "@/components/ResultsTable";
import { ResultRow, processExcelFile, exportResultsToExcel } from "@/services/FileProcessingService";
import { supabase } from "@/integrations/supabase/client";
import FileUploadSection from "@/components/file-uploader/FileUploadSection";
import PreviewSection from "@/components/file-uploader/PreviewSection";

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
  };

  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (isProcessing && runId) {
        e.preventDefault();
        e.returnValue = "Du har en pågående körning. Är du säker på att du vill lämna sidan?";
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isProcessing, runId]);
  
  const createNewRun = async (initialName: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('runs')
        .insert({
          name: initialName,
          results: [],  // Keep this for backward compatibility
          logs: [],     // Keep this for backward compatibility 
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
        console.log("Created new run with ID:", data[0].id);
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
      const { error } = await supabase
        .from('runs')
        .update({ 
          event_count: results.length
        })
        .eq('id', runId);
        
      if (error) {
        throw error;
      }
        
      console.log("Run updated successfully");
      
      toast({
        title: "Sparad",
        description: `Körningen "${saveName}" har sparats med ${results.length} resultat`,
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
      
      setTimeout(() => {
        setIsProcessing(false);
        setCurrentStatus("Körning avbruten av användaren");
        toast({
          title: "Körning avbruten",
          description: "Körningen avbröts av användaren",
        });
      }, 500);
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
          .from('processing_logs')
          .insert({
            run_id: runId,
            timestamp: new Date().toISOString().substring(11, 23),
            event_id: "system",
            url: "",
            status: "Användaren avbröt körningen"
          });
      } catch (error) {
        console.error("Error saving cancellation log:", error);
      }
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
            console.log("Cancellation detected, stopping processing");
            return false;
          }
          
          return true;
        },
        newRunId
      );
      
      if (!cancelProcessing) {
        setResults(enrichedResults);
        
        if (enrichedResults.length > 0) {
          toast({
            title: "Filbearbetning slutförd",
            description: `${enrichedResults.length} resultat bearbetade. Klicka på "Slutför" för att slutföra körningen.`,
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Resultatanalys - Filuppladdning</h1>
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2" disabled={isProcessing}>
            <ArrowLeft className="h-4 w-4" /> Tillbaka till startsidan
          </Button>
        </Link>
      </div>
      
      <FileUploadSection
        isProcessing={isProcessing}
        progress={progress}
        currentStatus={currentStatus}
        file={file}
        onFileChange={setFile}
        onProcessFile={handleProcessFile}
        onClear={handleClearResults}
        hasResults={results.length > 0}
        delay={delay}
        onDelayChange={setDelay}
        onCancelProcessing={handleCancelProcessing}
      />
      
      <LogComponent logs={logs} onClearLogs={clearLogs} />
      
      <PreviewSection
        results={results}
        saveName={saveName}
        onSaveNameChange={setSaveName}
        onRenameRun={handleRenameRun}
        isRenaming={isRenaming}
        runId={runId}
        onSaveResults={saveResultsToDatabase}
        onExportResults={handleExport}
        onDeleteRun={handleDeleteRun}
        onCancelProcessing={handleCancelProcessing}
        isSaving={isSaving}
        isProcessing={isProcessing}
      />
      
      {results.length > 0 && (
        <ResultsTable results={results} />
      )}
    </div>
  );
};

export default FileUploader;
