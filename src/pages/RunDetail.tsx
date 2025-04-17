import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { RunWithLogs } from "@/types/database";
import { useToast } from "@/components/ui/use-toast";
import { exportResultsToExcel, ResultRow, fetchProcessedResults, fetchProcessingLogs } from "@/services/FileProcessingService";
import RunInfoCard from '@/components/run-details/RunInfoCard';
import RunActionButtons from '@/components/run-details/RunActionButtons';
import RunLogSection from '@/components/run-details/RunLogSection';
import RunResultsSection from '@/components/run-details/RunResultsSection';
import RunDetailSkeleton from '@/components/run-details/RunDetailSkeleton';
import RunNotFound from '@/components/run-details/RunNotFound';
import { useAppText } from '@/hooks/useAppText';

const RunDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { text: pageTitle } = useAppText('rundetails_page_title', 'Körningsdetaljer');
  const { toast } = useToast();
  const [run, setRun] = useState<RunWithLogs | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [totalResultCount, setTotalResultCount] = useState<number>(0);
  const [uniqueEventCount, setUniqueEventCount] = useState<number>(0);
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

        // 2. Get the total count of results for this run
        const { count: totalCount, error: countError } = await supabase
          .from('processed_results')
          .select('*', { count: 'exact', head: true })
          .eq('run_id', id);
          
        if (countError) {
          console.error("Error counting results:", countError);
          throw countError;
        }
        
        // 3. Fetch processed results from the table (limited for performance)
        const processedResults = await fetchProcessedResults(id);
        
        // Calculate unique event count
        const uniqueEvents = new Set(processedResults.map(result => result.event_id));
        
        // 4. Fetch logs from the table
        const processingLogs = await fetchProcessingLogs(id);
        
        // 5. Create a combined run object with all data
        const runWithLogs: RunWithLogs = {
          ...runData,
          logs: processingLogs || [],
          event_count: uniqueEvents.size // Set unique event count
        };
        
        setRun(runWithLogs);
        setResults(processedResults);
        setTotalResultCount(totalCount || 0);
        setUniqueEventCount(uniqueEvents.size);
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

  if (loading) {
    return <RunDetailSkeleton />;
  }

  if (!run) {
    return <RunNotFound />;
  }

  return (
    <div className="container py-8">
      <h1 className="text-4xl font-bold mb-6">{pageTitle}: {run.name}</h1>
      
      <RunActionButtons
        onExport={handleExport}
        resultsCount={results.length}
        hasLogs={hasLogs()}
        showLogs={showLogs}
        onToggleLogs={toggleShowLogs}
      />

      <RunInfoCard run={run} results={results} totalCount={totalResultCount} />
      
      <RunLogSection 
        logs={logs}
        showLogs={showLogs}
        onClearLogs={clearLogs}
      />

      <RunResultsSection results={results} totalCount={totalResultCount} />
    </div>
  );
};

export default RunDetail;
