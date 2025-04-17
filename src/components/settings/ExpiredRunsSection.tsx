
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import SavedRunItem from "@/components/SavedRunItem";
import { useAppText } from "@/hooks/useAppText";
import { sub } from "date-fns";

const ExpiredRunsSection = () => {
  const { toast } = useToast();
  const [expiredRuns, setExpiredRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { text: title } = useAppText('expiredruns_title', 'Utgångna körningar (äldre än 2 år)');
  const { text: description } = useAppText('expiredruns_description', 'Lista över körningar som är äldre än 2 år');
  const { text: emptyText } = useAppText('expiredruns_empty', 'Inga utgångna körningar hittades.');

  useEffect(() => {
    const fetchExpiredRuns = async () => {
      try {
        const twoYearsAgo = sub(new Date(), { years: 2 }).toISOString();
        
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        
        const { data, error } = await supabase
          .from('runs')
          .select('*')
          .eq('user_id', userData.user.id)
          .lt('date', twoYearsAgo)
          .order('date', { ascending: false });
          
        if (error) throw error;
        
        setExpiredRuns(data || []);
      } catch (error: any) {
        console.error('Error fetching expired runs:', error);
        toast({
          title: 'Fel vid hämtning',
          description: error.message || 'Kunde inte hämta utgångna körningar',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchExpiredRuns();
  }, [toast]);

  const handleDelete = () => {
    // Refresh the expired runs list
    const fetchExpiredRuns = async () => {
      try {
        setLoading(true);
        const twoYearsAgo = sub(new Date(), { years: 2 }).toISOString();
        
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        
        const { data, error } = await supabase
          .from('runs')
          .select('*')
          .eq('user_id', userData.user.id)
          .lt('date', twoYearsAgo)
          .order('date', { ascending: false });
          
        if (error) throw error;
        
        setExpiredRuns(data || []);
      } catch (error: any) {
        console.error('Error refreshing expired runs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExpiredRuns();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-4 text-center">
            <p className="text-muted-foreground">Laddar utgångna körningar...</p>
          </div>
        ) : expiredRuns.length > 0 ? (
          <div className="space-y-4">
            {expiredRuns.map((run) => (
              <SavedRunItem
                key={run.id}
                id={run.id}
                name={run.name}
                date={run.date}
                eventCount={run.event_count}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-muted-foreground">{emptyText}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpiredRunsSection;

