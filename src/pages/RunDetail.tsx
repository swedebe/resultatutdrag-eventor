
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ResultsTable from "@/components/ResultsTable";
import LogComponent from "@/components/LogComponent";
import { RunWithLogs } from "@/types/database";
import { Home, FileDown } from "lucide-react";
import { exportResultsToExcel, ResultRow, fetchProcessedResults, fetchProcessingLogs } from "@/services/FileProcessingService";
import { useToast } from "@/components/ui/use-toast";

const RunDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [run, setRun] = useState<RunWithLogs | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    const fetchRunDetails = async () => {
      if (!id) return;

      setLoading(true);

      try {
        // 1. First, fetch basic run info
        const { data: runData, error: runError } = await supabase
          .from('runs')
          .select('*')
          .eq('id', id)
          .single();

        if (runError) throw runError;
        
        if (!runData) {
          console.error("No run found with id:", id);
          setLoading(false);
          return;
        }

        console.log("Retrieved basic run data:", runData);
        
        // 2. Fetch processed results from the new table
        const processedResults = await fetchProcessedResults(id);
        console.log(`Fetched ${processedResults.length} processed results from database`);
        
        // 3. Fetch logs from the new table
        const processingLogs = await fetchProcessingLogs(id);
        console.log(`Fetched ${processingLogs.length} logs from database`);
        
        // 4. Create a combined run object with all data
        const runWithLogs: RunWithLogs = {
          ...runData,
          logs: processingLogs || []
        };
        
        setRun(runWithLogs);
        setResults(processedResults);
        setLogs(processingLogs);
      } catch (error) {
        console.error('Error fetching run details:', error);
        toast({
          title: "Fel vid hämtning av körning",
          description: "Kunde inte hämta körningsdetaljer. Försök igen senare.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRunDetails();
  }, [id, toast]);

  const handleExport = () => {
    if (results.length === 0) {
      toast({
        title: "Inga resultat att exportera",
        description: "Det finns inga resultat att exportera för denna körning",
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

  if (loading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-64 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="container py-8">
        <h1 className="text-4xl font-bold mb-6">Körning hittades inte</h1>
        <p className="mb-6">Körningen du söker finns inte eller så har den tagits bort.</p>
        <Button onClick={() => navigate('/')}>
          <Home className="mr-2 h-4 w-4" />
          Tillbaka till startsidan
        </Button>
      </div>
    );
  }

  const toggleShowLogs = () => {
    setShowLogs(prev => !prev);
  };

  const clearLogs = () => {
    // This is just a UI function, it doesn't actually clear logs in the database
    setShowLogs(false);
  };

  // Helper function to check if logs exist
  const hasLogs = () => {
    return logs && 
           Array.isArray(logs) && 
           logs.length > 0;
  };

  return (
    <div className="container py-8">
      <h1 className="text-4xl font-bold mb-6">Körningsdetaljer: {run.name}</h1>
      
      <div className="mb-6 flex flex-wrap gap-3">
        <Button onClick={() => navigate('/')}>
          <Home className="mr-2 h-4 w-4" />
          Tillbaka till startsidan
        </Button>
        <Button onClick={handleExport} variant="outline" disabled={results.length === 0}>
          <FileDown className="mr-2 h-4 w-4" />
          Ladda ner Excel
        </Button>
        {hasLogs() && (
          <Button onClick={toggleShowLogs} variant="outline">
            {showLogs ? "Dölj loggar" : "Visa loggar"}
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Körningsinformation</CardTitle>
          <CardDescription>Information om denna analys</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Namn:</p>
              <p className="text-lg">{run.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Datum:</p>
              <p className="text-lg">{new Date(run.date).toLocaleString('sv-SE')}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Antal evenemang:</p>
              <p className="text-lg">{run.event_count}</p>
            </div>
            {run.club_name && (
              <div>
                <p className="text-sm font-medium">Klubb:</p>
                <p className="text-lg">{run.club_name}</p>
              </div>
            )}
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium">Antal resultat:</p>
            <p className="text-lg">{results.length}</p>
          </div>
        </CardContent>
      </Card>
      
      {showLogs && hasLogs() && (
        <LogComponent logs={logs} onClearLogs={clearLogs} />
      )}

      {results.length > 0 ? (
        <ResultsTable results={results} />
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Inga resultat finns tillgängliga för denna körning.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RunDetail;
