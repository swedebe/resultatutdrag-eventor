
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Key, Save } from "lucide-react";

const LOCAL_STORAGE_KEY = "eventorApiKey";

const EventorApiKeySection = () => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

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
          <Button 
            onClick={handleSaveApiKey} 
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Sparar..." : "Spara API-nyckel"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventorApiKeySection;
