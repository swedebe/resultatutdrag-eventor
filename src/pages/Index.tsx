
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AuthStatus from "@/components/AuthStatus";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import SavedRunItem from "@/components/SavedRunItem";
import { Trash2, Settings, Database } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAllAppTexts } from "@/hooks/useAppText";

const Index = () => {
  const { toast } = useToast();
  const { texts, processText, isLoading: loadingTexts } = useAllAppTexts();
  
  // Fetch user info from Supabase - include the name field
  const { data: userData, isLoading: loadingUser } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      console.log('Fetching user profile data');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('User found, fetching name:', user.id);
        const { data } = await supabase
          .from('users')
          .select('name, club_name')
          .eq('id', user.id)
          .maybeSingle();
        
        console.log('User profile data:', data);
        return data;
      }
      return null;
    }
  });

  // Fetch saved runs with proper caching disabled to ensure fresh data
  const { data: savedRuns, isLoading: loadingRuns, refetch: refetchRuns } = useQuery({
    queryKey: ['saved-runs'],
    queryFn: async () => {
      console.log("Fetching runs data fresh from database");
      
      // Log the current user to help troubleshoot permissions issues
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Current authenticated user:", user?.id);
      
      const { data, error } = await supabase
        .from('runs')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        console.error("Error fetching runs:", error);
        throw error;
      }
      
      console.log("Fetched runs:", data?.length);
      return data || [];
    },
    // Add staleTime of 0 to ensure we always get fresh data when refetching
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  const handleDeleteAllRuns = async () => {
    if (!confirm('Är du säker på att du vill ta bort alla dina körningar? Detta kan inte ångras.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('runs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all runs (without an actual filter)

      if (error) throw error;

      toast({
        title: "Alla körningar borttagna",
        description: "Alla dina sparade körningar har tagits bort",
      });

      refetchRuns();
    } catch (error: any) {
      console.error("Error deleting all runs:", error);
      toast({
        title: "Fel vid borttagning",
        description: error.message || "Ett fel uppstod vid borttagning av körningarna",
        variant: "destructive",
      });
    }
  };

  const handleRunUpdate = () => {
    console.log("Run updated, refetching data...");
    // Force a complete refetch of the data
    refetchRuns();
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">
          {texts.main_title || "Resultatanalys"}
        </h1>
        <div className="flex gap-4">
          <Link to="/settings">
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" /> Inställningar
            </Button>
          </Link>
          <AuthStatus />
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {loadingUser || loadingTexts
              ? "Välkommen"
              : processText('welcome_message', userData)}
          </CardTitle>
          <CardDescription>
            {texts.tool_description || "Med detta verktyg kan du använda en exportfil från Eventor för att hämta banlängd och antal startande. Därefter kan du spara det som en ny excelfil."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <p>
              {texts.file_instructions || "Exportfilen från Eventor måste redigeras först. Du ska ta bort fliken Deltagare och spara filen som en xlsx-fil."}
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <Link to="/batch-processing">
                <Button variant="default" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Batch-bearbetning
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{texts.your_runs_title || "Dina sparade körningar"}</CardTitle>
            <CardDescription>
              {texts.your_runs_subtitle || "Tidigare sparade körningar och analyser"}
            </CardDescription>
          </div>
          {savedRuns && savedRuns.length > 0 && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDeleteAllRuns}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Ta bort alla körningar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingRuns ? (
            <p className="text-center py-4 text-muted-foreground">Laddar sparade körningar...</p>
          ) : savedRuns && savedRuns.length > 0 ? (
            <div className="space-y-3">
              {savedRuns.map(run => (
                <SavedRunItem
                  key={run.id}
                  id={run.id}
                  name={run.name}
                  date={run.date}
                  eventCount={run.event_count}
                  onDelete={handleRunUpdate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 px-4">
              <p className="text-muted-foreground mb-4">
                Du har inga sparade körningar än
              </p>
              <Link to="/batch-processing">
                <Button>
                  Skapa din första körning
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
