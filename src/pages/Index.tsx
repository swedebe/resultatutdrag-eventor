
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AuthStatus from "@/components/AuthStatus";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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
            Importera och analysera orienteringsresultat för din klubb
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <p>
              Med detta verktyg kan du enkelt ladda upp och analysera resultat från orienteringstävlingar.
            </p>
            <p>
              Använd Excel-uppladdningen för att importera dina resultat och få detaljerade analyser.
            </p>
            <div className="flex justify-center mt-4">
              <Link to="/file-upload">
                <Button>
                  Gå till Excel-uppladdning
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Analysera</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Se detaljerade statistikanalyser av dina importerade resultat med visualiseringar och insikter.</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Jämför</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Jämför resultat över tid och mellan olika klasser för att upptäcka trender och förbättringar.</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Exportera</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Exportera dina analyserade resultat till Excel för att dela med klubbmedlemmar eller för vidare analys.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
