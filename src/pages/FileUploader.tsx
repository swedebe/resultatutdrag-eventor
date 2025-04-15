
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import FileUploadForm from "@/components/FileUploadForm";
import LogComponent, { LogEntry, clearLogs, setLogsUpdateFunction } from "@/components/LogComponent";
import ResultsPreview from "@/components/ResultsPreview";
import ResultsTable from "@/components/ResultsTable";
import { ResultRow, processExcelFile, exportResultsToExcel } from "@/services/FileProcessingService";

const FileUploader = () => {
  const { toast } = useToast();
  const [results, setResults] = useState<ResultRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
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
      const enrichedResults = await processExcelFile(file, setProgress, setCurrentStatus);
      setResults(enrichedResults);
      
      toast({
        title: "Filbearbetning slutförd",
        description: `${enrichedResults.length} resultat bearbetade`,
      });
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
  
  const handleClearResults = () => {
    setResults([]);
    setFile(null);
    setProgress(0);
    setCurrentStatus("");
    clearLogs();
    
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
          />
        </CardContent>
      </Card>
      
      <LogComponent logs={logs} onClearLogs={clearLogs} />
      
      {results.length > 0 && (
        <>
          <ResultsPreview results={results} />
          <ResultsTable results={results} />
        </>
      )}
    </div>
  );
};

export default FileUploader;
