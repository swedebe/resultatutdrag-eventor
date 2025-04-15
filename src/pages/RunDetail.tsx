
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ResultRow, exportResultsToExcel } from "@/services/FileProcessingService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileDown, Trash2, Pencil, Check, X, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ResultsTable from "@/components/ResultsTable";
import { Input } from "@/components/ui/input";
import LogComponent, { LogEntry } from "@/components/LogComponent";
import { RunWithLogs, jsonToLogs } from "@/types/database";

const RunDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const { data: run, isLoading, error, refetch } = useQuery({
    queryKey: ['run', id],
    queryFn: async () => {
      if (!id) throw new Error("Run ID is required");
      
      const { data, error } = await supabase
        .from('runs')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Ensure we properly convert the data
      const runWithLogs: RunWithLogs = {
        ...data,
        logs: jsonToLogs(data.logs)
      };
      
      setNewName(runWithLogs.name);
      
      return runWithLogs;
    }
  });

  const handleExport = () => {
    if (run?.results && Array.isArray(run.results) && run.results.length > 0) {
      exportResultsToExcel(run.results as ResultRow[]);
      toast({
        title: "Export slutförd",
        description: "Resultat exporterade till berikade_resultat.xlsx",
      });
    } else {
      toast({
        title: "Inga resultat att exportera",
        description: "Denna körning innehåller inga resultat som kan exporteras",
        variant: "destructive",
      });
    }
  };
  
  const handleDelete = async () => {
    if (!id || !run) return;
    
    if (window.confirm(`Är du säker på att du vill ta bort körningen "${run.name}"?`)) {
      setIsDeleting(true);
      
      try {
        const { error } = await supabase
          .from('runs')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        toast({
          title: "Körning borttagen",
          description: `Körningen "${run.name}" har tagits bort`,
        });
        
        navigate("/");
      } catch (error: any) {
        console.error("Error deleting run:", error);
        toast({
          title: "Fel vid borttagning",
          description: error.message || "Ett fel uppstod vid borttagning av körningen",
          variant: "destructive",
        });
        setIsDeleting(false);
      }
    }
  };
  
  const startEditing = () => {
    if (run) {
      setNewName(run.name);
      setIsEditing(true);
    }
  };
  
  const cancelEditing = () => {
    setIsEditing(false);
  };
  
  const saveNewName = async () => {
    if (!id || newName.trim() === "") return;
    
    try {
      const { error } = await supabase
        .from('runs')
        .update({ name: newName.trim() })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Namn uppdaterat",
        description: "Körningens namn har uppdaterats",
      });
      
      setIsEditing(false);
      refetch();
    } catch (error: any) {
      console.error("Error updating run name:", error);
      toast({
        title: "Fel vid namnbyte",
        description: error.message || "Ett fel uppstod vid namnbyte av körningen",
        variant: "destructive",
      });
    }
  };
  
  const toggleLogs = () => {
    setShowLogs(!showLogs);
  };

  const handleClearLogs = () => {
    toast({
      title: "Kan inte rensa loggar",
      description: "Loggar från tidigare körningar kan inte rensas",
      variant: "destructive",
    });
  };

  if (isLoading) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[50vh]">
        <p>Laddar körning...</p>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="container py-8">
        <Card className="bg-destructive/10 border-destructive/20">
          <CardHeader>
            <CardTitle>Körningen kunde inte hittas</CardTitle>
            <CardDescription>
              Det uppstod ett fel vid hämtning av körningen eller så har den tagits bort.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Tillbaka till startsidan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ensure results is properly handled as an array
  const results = Array.isArray(run?.results) ? run.results : [];
  const hasResults = results.length > 0;
  
  // Properly get logs
  const logs: LogEntry[] = run?.logs || [];
  const hasLogs = logs.length > 0;

  const wasCanceled = logs.some(log => 
    log.status === "Användaren avbröt körningen" || 
    log.status.includes("avbruten av användaren")
  );

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Button variant="link" className="pl-0" onClick={() => navigate("/")}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Alla körningar
          </Button>
          
          {isEditing ? (
            <div className="flex items-center gap-2 mt-2">
              <Input 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                className="text-lg font-semibold" 
              />
              <Button variant="ghost" size="sm" onClick={saveNewName}>
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="sm" onClick={cancelEditing}>
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-4xl font-bold">{run.name}</h1>
              <Button variant="ghost" size="icon" onClick={startEditing} className="mt-1">
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <p className="text-muted-foreground">
            {new Date(run.date).toLocaleDateString("sv-SE")} • {run.event_count} resultat
            {wasCanceled && " • Avbruten av användaren"}
          </p>
        </div>
        <div className="flex gap-2">
          {hasLogs && (
            <Button onClick={toggleLogs} variant="outline">
              <FileText className="mr-2 h-4 w-4" /> {showLogs ? "Dölj loggar" : "Visa loggar"}
            </Button>
          )}
          <Button onClick={handleExport} variant="outline" disabled={!hasResults}>
            <FileDown className="mr-2 h-4 w-4" /> Exportera till Excel
          </Button>
          <Button onClick={handleDelete} variant="destructive" disabled={isDeleting}>
            <Trash2 className="mr-2 h-4 w-4" /> Ta bort
          </Button>
        </div>
      </div>

      {showLogs && hasLogs && (
        <LogComponent logs={logs} onClearLogs={handleClearLogs} />
      )}
      
      {!hasLogs && showLogs && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Inga loggar</CardTitle>
            <CardDescription>
              Det finns inga loggar sparade för denna körning.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {wasCanceled && (
        <Card className="mb-6 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-amber-800 dark:text-amber-400">Avbruten körning</CardTitle>
            <CardDescription>
              Denna körning avbröts innan den slutfördes. Resultaten kan vara ofullständiga.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!hasResults ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Inga resultat</CardTitle>
            <CardDescription>
              Denna körning innehåller inga sparade resultat. Det kan bero på att körningen avbröts innan någon data hämtades eller att något gick fel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Du kan skapa en ny körning från filuppladdningssidan:</p>
            <Button className="mt-4" onClick={() => navigate("/file-upload")}>
              Skapa ny körning
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ResultsTable results={results as ResultRow[]} />
      )}
    </div>
  );
};

export default RunDetail;
