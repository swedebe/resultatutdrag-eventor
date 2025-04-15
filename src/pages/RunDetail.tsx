
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ResultRow, exportResultsToExcel } from "@/services/FileProcessingService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileDown, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ResultsTable from "@/components/ResultsTable";
import { Input } from "@/components/ui/input";

const RunDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch run details from Supabase
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
      
      // Set the current name for editing
      setNewName(data.name);
      
      return data;
    }
  });

  const handleExport = () => {
    // Check if run.results exists and is an array before accessing its length
    if (run?.results && Array.isArray(run.results) && run.results.length > 0) {
      exportResultsToExcel(run.results as ResultRow[]);
      toast({
        title: "Export slutförd",
        description: "Resultat exporterade till berikade_resultat.xlsx",
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
        
        // Navigate back to home after deletion
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
      refetch(); // Refresh the data
    } catch (error: any) {
      console.error("Error updating run name:", error);
      toast({
        title: "Fel vid namnbyte",
        description: error.message || "Ett fel uppstod vid namnbyte av körningen",
        variant: "destructive",
      });
    }
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

  // Ensure results is an array before passing it to ResultsTable
  const results = Array.isArray(run.results) ? run.results : [];

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
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <FileDown className="mr-2 h-4 w-4" /> Exportera till Excel
          </Button>
          <Button onClick={handleDelete} variant="destructive" disabled={isDeleting}>
            <Trash2 className="mr-2 h-4 w-4" /> Ta bort
          </Button>
        </div>
      </div>

      <ResultsTable results={results as ResultRow[]} />
    </div>
  );
};

export default RunDetail;
