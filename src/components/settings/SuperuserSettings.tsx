import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, AlertCircle, Trash2 } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { format, sub } from "date-fns";
import { AppText } from "@/types/appText";
import { AppTextService } from "@/services/appText/appTextService";
import AddUserForm from "./AddUserForm";
import UserManagement from "./UserManagement";

interface ExpiredRun {
  id: string;
  name: string;
  user_name: string;
  club_name: string;
  user_email: string;
  date: string;
}

const SuperuserSettings: React.FC = () => {
  const { toast } = useToast();
  const [appTexts, setAppTexts] = useState<AppText[]>([]);
  const [expiredRuns, setExpiredRuns] = useState<ExpiredRun[]>([]);
  const [loadingTexts, setLoadingTexts] = useState(true);
  const [loadingExpired, setLoadingExpired] = useState(true);
  const [savingTexts, setSavingTexts] = useState(false);

  useEffect(() => {
    const fetchAppTexts = async () => {
      try {
        const { data, error } = await supabase.from('app_texts').select('*');
        
        if (error) {
          console.error("Error from direct Supabase query:", error);
          throw error;
        }
        
        if (data && data.length > 0) {
          console.log("App texts fetched directly:", data);
          setAppTexts(data);
        } else {
          console.log("No data from direct query, trying AppTextService");
          const serviceData = await AppTextService.getAllAppTexts();
          console.log("App texts fetched via service:", serviceData);
          setAppTexts(serviceData);
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

    const fetchExpiredRuns = async () => {
      try {
        const twoYearsAgo = sub(new Date(), { years: 2 });
        
        const { data, error } = await supabase
          .from('runs')
          .select(`
            id, 
            name, 
            date,
            user_id
          `)
          .lt('date', twoYearsAgo.toISOString());

        if (error) throw error;

        const formattedRuns: ExpiredRun[] = [];
        for (const run of data || []) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('name, club_name, email')
            .eq('id', run.user_id)
            .single();
          
          if (!userError && userData) {
            formattedRuns.push({
              id: run.id,
              name: run.name,
              user_name: userData.name || 'Okänd användare',
              club_name: userData.club_name || 'Okänd klubb',
              user_email: userData.email || 'Okänd e-post',
              date: run.date
            });
          }
        }

        setExpiredRuns(formattedRuns);
      } catch (error: any) {
        console.error("Error fetching expired runs:", error);
        toast({
          title: "Fel vid hämtning av utgångna körningar",
          description: error.message || "Kunde inte hämta utgångna körningar",
          variant: "destructive",
        });
      } finally {
        setLoadingExpired(false);
      }
    };

    fetchAppTexts();
    fetchExpiredRuns();
  }, [toast]);

  const handleTextChange = (id: string, newValue: string) => {
    setAppTexts(appTexts.map(text => 
      text.id === id ? { ...text, value: newValue } : text
    ));
  };

  const saveAppTexts = async () => {
    setSavingTexts(true);
    try {
      const updatePromises = appTexts.map(text => 
        AppTextService.updateAppText(text.id, text.value)
      );

      await Promise.all(updatePromises);

      toast({
        title: "Texter sparade",
        description: "Applikationstexterna har uppdaterats",
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
      {/* User Management */}
      <UserManagement />
      
      {/* Add User Form */}
      <AddUserForm />
      
      {/* App Texts */}
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
                  supabase.rpc('populate_app_texts')
                    .then(() => {
                      toast({
                        title: "Texter skapade",
                        description: "Applikationstexter har skapats i databasen.",
                      });
                      // Refetch texts
                      return supabase.from('app_texts').select('*');
                    })
                    .then(({ data }) => {
                      if (data) {
                        setAppTexts(data);
                      }
                    })
                    .catch(error => {
                      console.error("Error creating app texts:", error);
                      toast({
                        title: "Fel vid skapande av texter",
                        description: error.message || "Kunde inte skapa applikationstexter",
                        variant: "destructive",
                      });
                    })
                    .finally(() => {
                      setLoadingTexts(false);
                    });
                }}
              >
                Skapa standardtexter
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4 mb-4">
                {appTexts.map(text => (
                  <div key={text.id} className="space-y-2">
                    <Label htmlFor={`text-${text.id}`}>
                      {text.key} ({text.category})
                    </Label>
                    <Input 
                      id={`text-${text.id}`}
                      value={text.value}
                      onChange={(e) => handleTextChange(text.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <Button 
                onClick={saveAppTexts}
                disabled={savingTexts}
              >
                <Save className="mr-2 h-4 w-4" />
                {savingTexts ? "Sparar..." : "Spara texter"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expired Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Utgångna körningar (äldre än 2 år)</CardTitle>
          <CardDescription>Lista över körningar som är äldre än 2 år</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingExpired ? (
            <p className="text-center text-muted-foreground">Laddar utgångna körningar...</p>
          ) : expiredRuns.length === 0 ? (
            <p className="text-center text-muted-foreground">Inga utgångna körningar hittades.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Namn</TableHead>
                    <TableHead>Användare</TableHead>
                    <TableHead>Klubb</TableHead>
                    <TableHead>E-post</TableHead>
                    <TableHead>Datum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiredRuns.map(run => (
                    <TableRow key={run.id}>
                      <TableCell>{run.name}</TableCell>
                      <TableCell>{run.user_name}</TableCell>
                      <TableCell>{run.club_name}</TableCell>
                      <TableCell>{run.user_email}</TableCell>
                      <TableCell>{new Date(run.date).toLocaleDateString("sv-SE")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default SuperuserSettings;
