
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Trash2, Eye, Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(name);
  const [actualEventCount, setActualEventCount] = useState(eventCount);

  useEffect(() => {
    // Fetch the actual count from processed_results table
    const fetchActualCount = async () => {
      const { count, error } = await supabase
        .from('processed_results')
        .select('*', { count: 'exact', head: true })
        .eq('run_id', id);
      
      if (error) {
        console.error("Error fetching actual count:", error);
        return;
      }
      
      if (count !== null) {
        setActualEventCount(count);
      }
    };

    fetchActualCount();
  }, [id]);

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
  
  const startEditing = () => {
    setIsEditing(true);
    setNewName(name);
  };
  
  const cancelEditing = () => {
    setIsEditing(false);
  };
  
  const saveNewName = async () => {
    if (newName.trim() === "") {
      toast({
        title: "Ogiltigt namn",
        description: "Namnet får inte vara tomt",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('runs')
        .update({ name: newName.trim() })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Namn uppdaterat",
        description: "Körningens namn har uppdaterats",
      });
      
      onDelete(); // Refresh the list
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error updating run name:", error);
      toast({
        title: "Fel vid namnbyte",
        description: error.message || "Ett fel uppstod vid namnbyte av körningen",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
      {isEditing ? (
        <div className="flex-1 flex gap-2 items-center">
          <Input 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)} 
            autoFocus
            className="flex-1"
          />
          <Button variant="ghost" size="icon" onClick={saveNewName}>
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button variant="ghost" size="icon" onClick={cancelEditing}>
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          <h3 className="font-medium">{name}</h3>
          <p className="text-sm text-muted-foreground">
            {actualEventCount} resultat • {formattedDate.relative} • {formattedDate.absolute}
          </p>
        </div>
      )}
      <div className="flex space-x-2">
        {!isEditing && (
          <>
            <Button variant="outline" size="icon" onClick={handleView} title="Visa">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={startEditing} title="Byt namn">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleDelete} disabled={isDeleting} title="Ta bort">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default SavedRunItem;
