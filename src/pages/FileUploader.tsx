
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import FileUploadSection from "@/components/file-uploader/FileUploadSection";
import PreviewSection from "@/components/file-uploader/PreviewSection";
import RunSettingsSection from "@/components/file-uploader/RunSettingsSection";
import ActionButtonsSection from "@/components/file-uploader/ActionButtonsSection";
import { useAllAppTexts } from "@/hooks/useAppText";
import { ResultRow } from "@/types/results";
import { useToast } from "@/components/ui/use-toast";
import { processExcelFile, exportResultsToExcel } from "@/services/FileProcessingService";
import LogComponent, { LogEntry, addLog, clearLogs, setLogsUpdateFunction } from "@/components/LogComponent";

const FileUploader = () => {
  const { texts } = useAllAppTexts();
  const { toast } = useToast();
  const uploadTitle = texts['upload_title'] || 'Resultatanalys – Filuppladdning';
  
  // State for file upload and processing
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentStatus, setCurrentStatus] = useState<string>("");
  const [results, setResults] = useState<ResultRow[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [saveName, setSaveName] = useState<string>("");
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [delay, setDelay] = useState<number>(15); // Default delay of 15 seconds
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [shouldCancel, setShouldCancel] = useState<boolean>(false);
  
  // Set up logs update function
  useEffect(() => {
    // Define the update function for logs
    const updateLogs = (newLogs: LogEntry[]) => {
      setLogs([...newLogs]);
    };
    
    // Register the log update function
    setLogsUpdateFunction(updateLogs);
    clearLogs();
    
    return () => {
      // Clean up
      setLogsUpdateFunction(null);
    };
  }, []);
  
  // Handlers
  const handleFileChange = (newFile: File | null) => {
    setFile(newFile);
    if (newFile) {
      // Generate default save name from file name
      const fileName = newFile.name.replace(/\.[^/.]+$/, ""); // Remove extension
      setSaveName(`${fileName} - ${new Date().toLocaleDateString()}`);
    }
  };
  
  const handleProcessFile = async () => {
    if (!file) return;
    
    try {
      setIsProcessing(true);
      setProgress(0);
      setCurrentStatus("Startar bearbetning...");
      setShouldCancel(false);
      clearLogs();
      
      // Process the file
      const processedResults = await processExcelFile(
        file,
        setProgress,
        setCurrentStatus,
        delay,
        async (partialResults) => {
          setResults([...partialResults]);
          // Check if cancellation was requested
          if (shouldCancel) {
            console.log("Processing canceled by user");
            return false; // Return false to stop processing
          }
          return true; // Continue processing if not cancelled
        },
        null // No runId for now, it will be generated when saving
      );
      
      // Only update results if we didn't cancel
      if (!shouldCancel) {
        setResults(processedResults);
        
        toast({
          title: "Bearbetning slutförd",
          description: `${processedResults.length} rader har bearbetats.`
        });
      }
      
      setIsProcessing(false);
    } catch (error) {
      console.error("Error processing file:", error);
      setIsProcessing(false);
      toast({
        title: "Ett fel uppstod",
        description: `Det gick inte att bearbeta filen: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    }
  };
  
  const handleClear = () => {
    setFile(null);
    setResults([]);
    setProgress(0);
    setCurrentStatus("");
    setRunId(null);
    setSaveName("");
    clearLogs();
  };
  
  const handleCancelProcessing = () => {
    // Set cancellation flag
    setShouldCancel(true);
    
    addLog("system", "", "Bearbetning avbryts, vänta tills nuvarande operation är klar...");
    toast({
      title: "Avbryter...",
      description: "Bearbetningen avbryts så snart nuvarande operation är klar."
    });
  };
  
  const handleSaveResults = async () => {
    // Placeholder for save functionality
    setIsSaving(true);
    toast({
      title: "Sparar...",
      description: "Sparar resultaten till databasen."
    });
    
    // Simulate saving
    setTimeout(() => {
      setIsSaving(false);
      setRunId("run-" + Date.now().toString()); // Generate a dummy runId
      toast({
        title: "Sparad",
        description: "Resultaten har sparats."
      });
    }, 1000);
  };
  
  const handleExportResults = () => {
    // Export results to Excel
    if (results.length === 0) return;
    
    try {
      exportResultsToExcel(results);
      toast({
        title: "Exporterad",
        description: "Resultaten har exporterats till Excel."
      });
    } catch (error) {
      console.error("Error exporting results:", error);
      toast({
        title: "Fel vid export",
        description: `Det gick inte att exportera resultaten: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteRun = () => {
    // Delete run logic
    if (!runId) return;
    
    toast({
      title: "Tar bort körning...",
      description: "Tar bort körningen från databasen."
    });
    
    // Simulate delete
    setTimeout(() => {
      setRunId(null);
      setResults([]);
      toast({
        title: "Borttagen",
        description: "Körningen har tagits bort."
      });
    }, 1000);
  };
  
  const handleRenameRun = () => {
    // Rename run logic
    if (!runId || !saveName.trim()) return;
    
    setIsRenaming(true);
    
    // Simulate rename
    setTimeout(() => {
      setIsRenaming(false);
      toast({
        title: "Namnbyte",
        description: "Körningen har fått ett nytt namn."
      });
    }, 1000);
  };
  
  const handleClearLogs = () => {
    clearLogs();
  };
  
  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">{uploadTitle}</h1>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          disabled={isProcessing}
          asChild
        >
          <Link to="/">
            <ArrowLeft className="h-4 w-4" /> Tillbaka till startsidan
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <FileUploadSection 
            isProcessing={isProcessing}
            progress={progress}
            currentStatus={currentStatus}
            file={file}
            onFileChange={handleFileChange}
            onProcessFile={handleProcessFile}
            onClear={handleClear}
            hasResults={results.length > 0}
            delay={delay}
            onDelayChange={setDelay}
            onCancelProcessing={handleCancelProcessing}
          />
          
          {/* Show logs during processing or if there are logs */}
          {(isProcessing || logs.length > 0) && (
            <LogComponent logs={logs} onClearLogs={handleClearLogs} />
          )}
          
          {results.length > 0 && (
            <PreviewSection 
              results={results}
              saveName={saveName}
              onSaveNameChange={setSaveName}
              onRenameRun={handleRenameRun}
              isRenaming={isRenaming}
              runId={runId}
              onSaveResults={handleSaveResults}
              onExportResults={handleExportResults}
              onDeleteRun={handleDeleteRun}
              onCancelProcessing={isProcessing ? handleCancelProcessing : undefined}
              isSaving={isSaving}
              isProcessing={isProcessing}
            />
          )}
        </div>
        
        {/* Only show RunSettingsSection and ActionButtonsSection in the sidebar when there are results */}
        {results.length > 0 && (
          <div className="space-y-6">
            <RunSettingsSection 
              saveName={saveName}
              onSaveNameChange={setSaveName}
              onRenameRun={handleRenameRun}
              isRenaming={isRenaming}
              runId={runId}
            />
            <ActionButtonsSection
              onSaveResults={handleSaveResults}
              onExportResults={handleExportResults}
              onDeleteRun={handleDeleteRun}
              onCancelProcessing={isProcessing ? handleCancelProcessing : undefined}
              isSaving={isSaving}
              isProcessing={isProcessing}
              resultsLength={results.length}
              runId={runId}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
