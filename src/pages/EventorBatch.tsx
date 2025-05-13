import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import LogComponent, { clearLogs, setLogsUpdateFunction, addLog } from "@/components/LogComponent";
import { processExcelFile, exportResultsToExcel, BatchProcessingOptions } from "@/services/FileProcessingService";
import { supabase } from "@/integrations/supabase/client";
import FileUploadSection from "@/components/eventor-batch/FileUploadSection";
import PreviewSection from "@/components/eventor-batch/PreviewSection";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAllAppTexts } from "@/hooks/useAppText";
import { saveLogToDatabase } from "@/services/database/resultRepository";
import { ResultRow } from "@/types/results";

const EventorBatch = () => {
  const { toast } = useToast();
  const [results, setResults] = useState<ResultRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [delay, setDelay] = useState<number>(15);
  const [saveName, setSaveName] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [isDryRun, setIsDryRun] = useState<boolean>(true);
  const [jobId, setJobId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { texts } = useAllAppTexts();

  useEffect(() => {
    setLogsUpdateFunction(updateLogs);
    return () => setLogsUpdateFunction(null);
  }, []);

  const updateLogs = async (newLogs: any[]) => {
    setLogs(newLogs);
  };

  const createUserProcessingState = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("No authenticated user");
      }

      // Try to create a new processing state or get the existing one
      const { data, error } = await supabase
        .from('user_processing_state')
        .insert({
          user_id: user.id,
          cancellation_flag: false
        })
        .select()
        .single();

      if (error) {
        // If error is unique constraint violation, just fetch the existing state
        if (error.code === '23505') {
          const { data: existingState } = await supabase
            .from('user_processing_state')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          // Update existing state to reset flags
          await supabase
            .from('user_processing_state')
            .update({
              cancellation_flag: false,
              cancellation_set_at: null,
              cancellation_cleared_at: null
            })
            .eq('user_id', user.id);

          return existingState;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error creating processing state:", error);
      toast({
        title: "Fel vid start av bearbetning",
        description: "Kunde inte initiera bearbetningsläge",
        variant: "destructive"
      });
      return null;
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
    
    // Create processing state and get job ID
    const processingState = await createUserProcessingState();
    if (!processingState) return;

    setJobId(processingState.id);
    setIsProcessing(true);
    clearLogs();
    
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const timeStr = today.toTimeString().split(' ')[0];
    const initialRunName = `Körning ${dateStr} ${timeStr}`;
    setSaveName(initialRunName);
    
    const newRunId = await createNewRun(initialRunName);
    setRunId(newRunId);
    
    try {
      // Create the proper BatchProcessingOptions object
      const batchOptions: BatchProcessingOptions = {
        fetchCourseLength: !isDryRun,
        fetchStarters: !isDryRun,
        courseLengthDelay: delay,
        startersDelay: delay
      };
      
      const enrichedResults = await processExcelFile(
        file, 
        setProgress, 
        setCurrentStatus, 
        delay,
        async (partialResults: ResultRow[]) => {
          // Check database for cancellation
          if (processingState) {
            const { data } = await supabase
              .from('user_processing_state')
              .select('cancellation_flag')
              .eq('id', processingState.id)
              .single();
            
            if (data?.cancellation_flag) {
              return false;
            }
          }
          
          setResults(partialResults);
          return true;
        },
        newRunId,
        batchOptions  // Pass the batchOptions object instead of isDryRun boolean
      );
      
      // Final cancellation check
      const { data } = await supabase
        .from('user_processing_state')
        .select('cancellation_flag')
        .eq('id', processingState.id)
        .single();
      
      if (!data?.cancellation_flag) {
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
      } else {
        toast({
          title: "Bearbetning avbruten",
          description: "Körningen avbröts av användaren",
        });
      }
    } catch (error: any) {
      console.error("Fel vid bearbetning av fil:", error);
      toast({
        title: "Fel vid bearbetning",
        description: error.message || "Ett fel uppstod vid bearbetning av filen",
        variant: "destructive",
      });
    } finally {
      // Clear processing state
      if (processingState) {
        await supabase
          .from('user_processing_state')
          .update({
            cancellation_flag: false,
            cancellation_cleared_at: new Date().toISOString()
          })
          .eq('id', processingState.id);
      }
      setIsProcessing(false);
      setJobId(null);
    }
  };

  const handleCancelProcessing = async () => {
    if (!jobId) return;
    
    try {
      // Update cancellation flag in database
      await supabase
        .from('user_processing_state')
        .update({ 
          cancellation_flag: true,
          cancellation_set_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      setCurrentStatus("Avbryter körning...");
      
      toast({
        title: "Avbryter körning",
        description: "Begäran om att avbryta har skickats",
      });
      
      addCancellationLog();
    } catch (error) {
      console.error("Fel vid avbrytning:", error);
      toast({
        title: "Fel vid avbrytning",
        description: "Kunde inte avbryta körningen",
        variant: "destructive",
      });
    }
  };

  const addCancellationLog = () => {
    const newLog: any = {
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
  
  const handleDryRunChange = useCallback((checked: boolean) => {
		setIsDryRun(checked);
	}, []);
	
  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Eventor Batch Processing</h1>
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
			
			<Card className="mb-6">
				<CardHeader>
					<CardTitle>Dry Run</CardTitle>
					<CardDescription>Kör en testkörning utan att spara data i Eventor</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center space-x-2">
						<Checkbox
							id="dry-run"
							checked={isDryRun}
							onCheckedChange={handleDryRunChange}
							disabled={isProcessing}
						/>
						<Label htmlFor="dry-run">Aktivera Dry Run</Label>
					</div>
				</CardContent>
			</Card>
      
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
    </div>
  );
};

export default EventorBatch;
