
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Key, Save, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

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
    // Fetch the API key from Supabase on component mount
    const fetchApiKey = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error("Error fetching auth user:", authError);
          return;
        }
        
        if (!user) {
          console.log("No authenticated user found");
          return;
        }
        
        const { data, error } = await supabase
          .from('users')
          .select('eventor_api_key')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error("Error fetching user profile:", error);
          return;
        }
        
        if (data && data.eventor_api_key) {
          setApiKey(data.eventor_api_key);
        }
      } catch (error) {
        console.error("Failed to fetch API key:", error);
      }
    };

    fetchApiKey();
  }, []);

  const handleSaveApiKey = async () => {
    setIsSaving(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        throw authError;
      }
      
      if (!user) {
        throw new Error("No authenticated user found");
      }
      
      const { error } = await supabase
        .from('users')
        .update({ eventor_api_key: apiKey })
        .eq('id', user.id);
        
      if (error) {
        throw error;
      }
      
      toast({
        title: "API-nyckel sparad",
        description: "Din Eventor API-nyckel har sparats i din användarprofil.",
      });
      
      // Clear any previous test results when saving a new key
      setTestResult(null);
    } catch (error: any) {
      console.error("Failed to save API key to Supabase:", error);
      toast({
        title: "Fel vid sparande",
        description: "Kunde inte spara API-nyckeln: " + (error.message || "Okänt fel"),
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
          "ApiKey": apiKey,
          "Accept": "application/xml"
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
    } catch (error: any) {
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
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Ange din Eventor API-nyckel"
            />
            <p className="text-xs text-muted-foreground">
              Denna nyckel sparas i din användarprofil och är endast synlig för dig.
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
