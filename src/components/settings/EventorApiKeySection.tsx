
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Key, Save, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const LOCAL_STORAGE_KEY = "eventorApiKey";

const EventorApiKeySection = () => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    responseBody?: string;
  } | null>(null);

  useEffect(() => {
    // Load the API key from localStorage on component mount
    const savedApiKey = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  const handleSaveApiKey = () => {
    setIsSaving(true);
    try {
      // Save the API key to localStorage
      localStorage.setItem(LOCAL_STORAGE_KEY, apiKey);
      
      toast({
        title: "API-nyckel sparad",
        description: "Din Eventor API-nyckel har sparats i webbläsarminnet.",
      });
      
      // Clear any previous test results when saving a new key
      setTestResult(null);
    } catch (error) {
      console.error("Failed to save API key to localStorage:", error);
      toast({
        title: "Fel vid sparande",
        description: "Kunde inte spara API-nyckeln. Kontrollera din webbläsarinställningar.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestApiKey = async () => {
    // Don't proceed if no API key is available
    if (!apiKey) {
      toast({
        title: "Saknad API-nyckel",
        description: "Spara en API-nyckel först innan du testar den.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch("https://eventor.orientering.se/api/organisation/apiKey", {
        method: "GET",
        headers: {
          "Authorization": `ApiKey ${apiKey}`,
          "Content-Type": "application/json"
        }
      });
      
      const responseText = await response.text();
      
      if (response.ok) {
        setTestResult({
          success: true,
          message: "API-nyckeln är giltig.",
          responseBody: responseText
        });
        
        toast({
          title: "API-nyckel testad",
          description: "API-nyckeln är giltig.",
        });
      } else {
        setTestResult({
          success: false,
          message: `API-nyckeln är ogiltig eller anslutningen misslyckades. Status: ${response.status}`,
          responseBody: responseText
        });
        
        toast({
          title: "API-nyckel ogiltig",
          description: "API-nyckeln är ogiltig eller anslutningen misslyckades.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing API key:", error);
      setTestResult({
        success: false,
        message: `Fel vid testning av API-nyckel: ${error instanceof Error ? error.message : 'Okänt fel'}`,
      });
      
      toast({
        title: "Fel vid testning",
        description: `Fel vid testning av API-nyckel: ${error instanceof Error ? error.message : 'Okänt fel'}`,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Eventor API-nyckel
        </CardTitle>
        <CardDescription>
          API-nyckeln används för att hämta information från Eventor API, 
          som antal startande i EventorBatch-funktionen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eventor-api-key">Eventor API-nyckel</Label>
            <Input
              id="eventor-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Ange din Eventor API-nyckel"
            />
            <p className="text-xs text-muted-foreground">
              Denna nyckel sparas i din webbläsare och skickas aldrig till vår server.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleSaveApiKey} 
              disabled={isSaving}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Sparar..." : "Spara API-nyckel"}
            </Button>
            
            <Button
              onClick={handleTestApiKey}
              disabled={isTesting || !apiKey}
              variant="outline"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {isTesting ? "Testar..." : "Testa API-nyckel"}
            </Button>
          </div>
          
          {testResult && (
            <Alert variant={testResult.success ? "default" : "destructive"} className="mt-4">
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">{testResult.message}</p>
                  {testResult.responseBody && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold">Response Body:</p>
                      <pre className="mt-1 max-h-60 overflow-auto rounded bg-slate-950 p-2 text-xs text-slate-50">
                        {testResult.responseBody}
                      </pre>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EventorApiKeySection;
