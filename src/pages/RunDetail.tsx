
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ResultRow, exportResultsToExcel } from "@/services/FileProcessingService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ResultsTable from "@/components/ResultsTable";

const RunDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch run details from Supabase
  const { data: run, isLoading, error } = useQuery({
    queryKey: ['run', id],
    queryFn: async () => {
      if (!id) throw new Error("Run ID is required");
      
      const { data, error } = await supabase
        .from('runs')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
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
          <h1 className="text-4xl font-bold">{run.name}</h1>
          <p className="text-muted-foreground">
            {new Date(run.date).toLocaleDateString("sv-SE")} • {run.event_count} resultat
          </p>
        </div>
        <Button onClick={handleExport}>Exportera till Excel</Button>
      </div>

      <ResultsTable results={results as ResultRow[]} />
    </div>
  );
};

export default RunDetail;
