
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AuthStatus from "@/components/AuthStatus";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import SavedRunItem from "@/components/SavedRunItem";
import { PlusCircle } from "lucide-react";

const Index = () => {
  // Fetch user info from Supabase
  const { data: userData } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('club_name')
          .eq('id', user.id)
          .maybeSingle();
        
        return data;
      }
      return null;
    }
  });

  // Fetch saved runs
  const { data: savedRuns, isLoading: loadingRuns, refetch: refetchRuns } = useQuery({
    queryKey: ['saved-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('runs')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Resultatanalys</h1>
        <AuthStatus />
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Välkommen {userData?.club_name}</CardTitle>
          <CardDescription>
            Med detta verktyg kan du använda en eportfil från Eventor för att hämta banlängd och antal startande. Därefter kan du spara det som en ny excelfil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <p>
              Exportfilen från Eventor måste redigeras först. Du ska ta bort fliken Deltagare och spara filen som en xlsx-fil.
            </p>
            <div className="flex justify-center mt-4">
              <Link to="/file-upload">
                <Button className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Skapa ny körning
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Dina sparade körningar</CardTitle>
            <CardDescription>
              Tidigare sparade körningar och analyser
            </CardDescription>
          </div>
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
                  onDelete={refetchRuns}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 px-4">
              <p className="text-muted-foreground mb-4">
                Du har inga sparade körningar än
              </p>
              <Link to="/file-upload">
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
