
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import ResultsTable from "@/components/ResultsTable";
import ResultsStatistics from "@/components/ResultsStatistics";
import { parseEventorResults } from "@/lib/eventor-parser";

const Index = () => {
  const { toast } = useToast();
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [clubName, setClubName] = useState("Göingarna");

  const handleFetchResults = async () => {
    if (!url.includes("eventor.orientering.se")) {
      toast({
        title: "Fel",
        description: "URL:en måste vara från eventor.orientering.se",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // I en riktig implementation skulle vi använda en proxy-server eller API
      // för att undvika CORS-problem vid hämtning från Eventor
      const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
      const html = await response.text();
      
      const parsedResults = parseEventorResults(html, clubName);
      
      if (parsedResults.length === 0) {
        toast({
          title: "Inga resultat hittades",
          description: `Kunde inte hitta några resultat för ${clubName} på den angivna sidan.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Resultat importerade",
          description: `${parsedResults.length} resultat hittades för ${clubName}`,
        });
        setResults((prev) => [...prev, ...parsedResults]);
      }
    } catch (error) {
      console.error("Error fetching results:", error);
      toast({
        title: "Fel vid hämtning",
        description: "Kunde inte hämta resultat från den angivna URL:en",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearResults = () => {
    setResults([]);
    toast({
      title: "Resultat rensade",
      description: "Alla resultat har tagits bort från tabellen",
    });
  };

  return (
    <div className="container py-8">
      <h1 className="text-4xl font-bold mb-6">Göingarna Resultatanalys</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Importera resultat</CardTitle>
          <CardDescription>
            Klistra in länken till resultat från eventor.orientering.se för att importera
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <Input
                placeholder="https://eventor.orientering.se/Events/ResultList?eventId=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleFetchResults} disabled={isLoading}>
                {isLoading ? "Hämtar..." : "Hämta resultat"}
              </Button>
            </div>
            
            <div className="flex gap-3">
              <Input
                placeholder="Klubbnamn"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                className="w-48"
              />
              <Button variant="outline" onClick={handleClearResults}>
                Rensa alla resultat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <>
          <ResultsStatistics results={results} />
          <ResultsTable results={results} />
        </>
      )}
    </div>
  );
};

export default Index;
