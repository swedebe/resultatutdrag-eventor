
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ResultsTable from "@/components/ResultsTable";
import LogComponent from "@/components/LogComponent";
import { RunWithLogs } from "@/types/database";
import { jsonToLogs } from "@/types/database";
import { Home, FileDown } from "lucide-react";
import { exportResultsToExcel } from "@/services/FileProcessingService";
import { useToast } from "@/components/ui/use-toast";

const RunDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [run, setRun] = useState<RunWithLogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    const fetchRunDetails = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('runs')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          // Convert logs from Json to LogEntry[]
          const runWithLogs: RunWithLogs = {
            ...data,
            logs: jsonToLogs(data.logs)
          };
          setRun(runWithLogs);
        }
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
    if (!run || !run.results) {
      toast({
        title: "Inga resultat att exportera",
        description: "Det finns inga resultat att exportera för denna körning",
        variant: "destructive",
      });
      return;
    }

    exportResultsToExcel(run.results);
    
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

  return (
    <div className="container py-8">
      <h1 className="text-4xl font-bold mb-6">Körningsdetaljer: {run.name}</h1>
      
      <div className="mb-6 flex flex-wrap gap-3">
        <Button onClick={() => navigate('/')}>
          <Home className="mr-2 h-4 w-4" />
          Tillbaka till startsidan
        </Button>
        <Button onClick={handleExport} variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          Ladda ner Excel
        </Button>
        {run.logs && run.logs.length > 0 && (
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
        </CardContent>
      </Card>
      
      {showLogs && run.logs && run.logs.length > 0 && (
        <LogComponent logs={run.logs} onClearLogs={clearLogs} />
      )}

      {run.results && run.results.length > 0 ? (
        <ResultsTable results={run.results} />
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
