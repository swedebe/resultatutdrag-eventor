
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, Save } from "lucide-react";
import { AppText } from "@/types/appText";
import { AppTextService } from "@/services/appText/appTextService";
import AddUserForm from "./AddUserForm";
import UserManagement from "./UserManagement";

// Updated to remove 'fileupload' from the category order
const CATEGORY_ORDER = ['homepage', 'eventorbatch', 'settings', 'general', 'auth'];

const SuperuserSettings: React.FC = () => {
  const { toast } = useToast();
  const [appTexts, setAppTexts] = useState<AppText[]>([]);
  const [loadingTexts, setLoadingTexts] = useState(true);
  const [savingTexts, setSavingTexts] = useState(false);
  // Track original text values to detect actual changes
  const [originalTexts, setOriginalTexts] = useState<Record<string, string>>({});

  const groupedTexts = React.useMemo(() => {
    if (!appTexts.length) return {};
    
    const grouped: Record<string, AppText[]> = {};
    
    appTexts.forEach(text => {
      if (!grouped[text.category]) {
        grouped[text.category] = [];
      }
      grouped[text.category].push(text);
    });
    
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => a.key.localeCompare(b.key));
    });
    
    return grouped;
  }, [appTexts]);

  const orderedCategories = React.useMemo(() => {
    const categories = Object.keys(groupedTexts);
    
    return categories.sort((a, b) => {
      const aIndex = CATEGORY_ORDER.indexOf(a);
      const bIndex = CATEGORY_ORDER.indexOf(b);
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      return a.localeCompare(b);
    });
  }, [groupedTexts]);

  useEffect(() => {
    const fetchAppTexts = async () => {
      try {
        // Force refresh from database to get latest values
        const allTexts = await AppTextService.getAllAppTexts(true);
        if (allTexts.length > 0) {
          console.log("App texts fetched:", allTexts.length);
          setAppTexts(allTexts);
          
          // Store original values for comparison
          const originals: Record<string, string> = {};
          allTexts.forEach(text => {
            originals[text.id] = text.value;
          });
          setOriginalTexts(originals);
        } else {
          console.error("No app texts found");
          toast({
            title: "Inga texter hittades",
            description: "Kunde inte hitta några applikationstexter",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error("Error fetching app texts:", error);
        toast({
          title: "Fel vid hämtning av texter",
          description: error.message || "Kunde inte hämta applikationstexter",
          variant: "destructive",
        });
      } finally {
        setLoadingTexts(false);
      }
    };

    fetchAppTexts();
  }, [toast]);

  const handleTextChange = (id: string, newValue: string) => {
    setAppTexts(appTexts.map(text => 
      text.id === id ? { ...text, value: newValue } : text
    ));
  };

  const saveAppTexts = async () => {
    setSavingTexts(true);
    try {
      // Only update texts that have actually changed
      const textsToUpdate = appTexts.filter(text => 
        text.value !== originalTexts[text.id]
      );
      
      if (textsToUpdate.length === 0) {
        toast({
          title: "Ingen ändring",
          description: "Inga texter har ändrats, inget att spara",
        });
        setSavingTexts(false);
        return;
      }
      
      console.log(`Saving ${textsToUpdate.length} changed texts out of ${appTexts.length} total`);
      
      const updatePromises = textsToUpdate.map(text => 
        AppTextService.updateAppText(text.id, text.value, originalTexts[text.id])
      );

      await Promise.all(updatePromises);
      
      // Update original texts to reflect the new values
      const newOriginals = { ...originalTexts };
      textsToUpdate.forEach(text => {
        newOriginals[text.id] = text.value;
      });
      setOriginalTexts(newOriginals);

      toast({
        title: "Texter sparade",
        description: `${textsToUpdate.length} applikationstexter har uppdaterats`,
      });
    } catch (error: any) {
      console.error("Error saving app texts:", error);
      toast({
        title: "Fel vid sparande",
        description: error.message || "Kunde inte spara applikationstexterna",
        variant: "destructive",
      });
    } finally {
      setSavingTexts(false);
    }
  };

  return (
    <>
      <UserManagement />
      
      <AddUserForm />
      
      <Card>
        <CardHeader>
          <CardTitle>Applikationstexter</CardTitle>
          <CardDescription>Redigera texter som visas i applikationen</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTexts ? (
            <p className="text-center text-muted-foreground">Laddar texter...</p>
          ) : appTexts.length === 0 ? (
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="h-8 w-8 text-amber-500" />
              <p className="text-muted-foreground">Inga texter hittades. Detta kan bero på ett problem med databasen.</p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setLoadingTexts(true);
                  (async () => {
                    try {
                      await AppTextService.ensureRequiredAppTextsExist();
                      toast({
                        title: "Texter skapade",
                        description: "Applikationstexter har skapats i databasen.",
                      });
                      const allTexts = await AppTextService.getAllAppTexts(true);
                      if (allTexts.length > 0) {
                        setAppTexts(allTexts);
                        
                        // Store original values for comparison
                        const originals: Record<string, string> = {};
                        allTexts.forEach(text => {
                          originals[text.id] = text.value;
                        });
                        setOriginalTexts(originals);
                      }
                    } catch (error: any) {
                      console.error("Error creating app texts:", error);
                      toast({
                        title: "Fel vid skapande av texter",
                        description: error.message || "Kunde inte skapa applikationstexter",
                        variant: "destructive",
                      });
                    } finally {
                      setLoadingTexts(false);
                    }
                  })();
                }}
              >
                Skapa standardtexter
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {orderedCategories.map(category => (
                <div key={category} className="mb-6">
                  <h3 className="text-lg font-medium mb-2 capitalize">{category}</h3>
                  <div className="space-y-4">
                    {groupedTexts[category].map(text => (
                      <div key={text.id} className="space-y-2">
                        <Label htmlFor={`text-${text.id}`}>
                          {text.key}
                        </Label>
                        <Input 
                          id={`text-${text.id}`}
                          value={text.value}
                          onChange={(e) => handleTextChange(text.id, e.target.value)}
                          className={text.value !== originalTexts[text.id] ? "border-amber-500" : ""}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <Button 
                onClick={saveAppTexts}
                disabled={savingTexts || appTexts.every(text => text.value === originalTexts[text.id])}
              >
                <Save className="mr-2 h-4 w-4" />
                {savingTexts ? "Sparar..." : "Spara texter"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default SuperuserSettings;
