
import React from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Trash2, Eye } from "lucide-react";

interface SavedRunItemProps {
  id: string;
  name: string;
  date: string;
  eventCount: number;
  onDelete: () => void;
}

const SavedRunItem: React.FC<SavedRunItemProps> = ({ id, name, date, eventCount, onDelete }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const formattedDate = React.useMemo(() => {
    try {
      const dateObj = new Date(date);
      return {
        absolute: dateObj.toLocaleDateString("sv-SE"),
        relative: formatDistanceToNow(dateObj, { addSuffix: true, locale: sv })
      };
    } catch (e) {
      return {
        absolute: "Okänt datum",
        relative: "Okänt datum"
      };
    }
  }, [date]);

  const handleDelete = async () => {
    if (window.confirm(`Är du säker på att du vill ta bort körningen "${name}"?`)) {
      setIsDeleting(true);
      
      try {
        const { error } = await supabase
          .from('runs')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        toast({
          title: "Körning borttagen",
          description: `Körningen "${name}" har tagits bort`,
        });
        
        onDelete();
      } catch (error: any) {
        console.error("Error deleting run:", error);
        toast({
          title: "Fel vid borttagning",
          description: error.message || "Ett fel uppstod vid borttagning av körningen",
          variant: "destructive",
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleView = () => {
    navigate(`/run/${id}`);
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
      <div className="space-y-1">
        <h3 className="font-medium">{name}</h3>
        <p className="text-sm text-muted-foreground">
          {eventCount} resultat • {formattedDate.relative} • {formattedDate.absolute}
        </p>
      </div>
      <div className="flex space-x-2">
        <Button variant="outline" size="icon" onClick={handleView}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleDelete} disabled={isDeleting}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
};

export default SavedRunItem;
