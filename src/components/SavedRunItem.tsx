
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Trash2, Eye, Pencil, Check, X, Bug } from "lucide-react";
import { Input } from "@/components/ui/input";
import { sub } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { updateRunName } from "@/services/database/resultRepository";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  const [displayName, setDisplayName] = useState(name);
  const [actualEventCount, setActualEventCount] = useState(eventCount);
  const [isExpired, setIsExpired] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDebugDialog, setShowDebugDialog] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);

  useEffect(() => {
    // Update local state when props change (after a refetch)
    setNewName(name);
    setDisplayName(name);
  }, [name]);

  useEffect(() => {
    // Check if the run is expired (older than 2 years)
    const runDate = new Date(date);
    const twoYearsAgo = sub(new Date(), { years: 2 });
    setIsExpired(runDate < twoYearsAgo);

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
  }, [id, date]);

  const handleView = () => {
    navigate(`/run/${id}`);
  };
  
  const startEditing = () => {
    if (isExpired) {
      toast({
        title: "Kan inte ändra namn",
        description: "Körningar äldre än två år kan inte namnändras",
        variant: "destructive",
      });
      return;
    }
    
    setIsEditing(true);
    setNewName(displayName);
    setErrorMessage(null);
  };
  
  const cancelEditing = () => {
    setIsEditing(false);
    setNewName(displayName);
    setErrorMessage(null);
  };
  
  const saveNewName = async () => {
    if (newName.trim() === "") {
      toast({
        title: "Ogiltigt namn",
        description: "Namnet får inte vara tomt",
        variant: "destructive",
      });
      setErrorMessage("Namnet får inte vara tomt");
      return;
    }
    
    // Skip update if name hasn't changed
    if (newName.trim() === displayName.trim()) {
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    setErrorMessage(null);
    
    try {
      console.log(`SavedRunItem: Updating run name from "${displayName}" to "${newName.trim()}" for run ID: ${id}`);
      
      // Use the repository function which has better error handling and debugging
      const updateResponse = await updateRunName(id, newName.trim());
      
      console.log("Update response:", updateResponse);
      
      // Store debug data for the debug panel
      setDebugData(updateResponse.sql_debug || updateResponse.debug || updateResponse);
      
      if (!updateResponse.success) {
        throw new Error(updateResponse.message || "Namnbyte misslyckades");
      }
      
      // Update local state with the new name from the response
      const updatedName = updateResponse.data[0]?.name || newName.trim();
      setDisplayName(updatedName);
      setIsEditing(false);
      
      toast({
        title: "Namn uppdaterat",
        description: "Körningens namn har uppdaterats",
      });
      
      // Force refresh to ensure the changes are reflected in the UI
      onDelete(); // This actually triggers a refetch in the parent
    } catch (error: any) {
      console.error("Error updating run name:", error);
      setErrorMessage(error.message || "Ett fel uppstod vid namnbyte av körningen");
      toast({
        title: "Fel vid namnbyte",
        description: error.message || "Ett fel uppstod vid namnbyte av körningen",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

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
    if (window.confirm(`Är du säker på att du vill ta bort körningen "${displayName}"?`)) {
      setIsDeleting(true);
      
      try {
        const { error } = await supabase
          .from('runs')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        toast({
          title: "Körning borttagen",
          description: `Körningen "${displayName}" har tagits bort`,
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

  // Function to render debug information in a readable format
  const renderDebugInfo = () => {
    if (!debugData) return <p>Ingen debuginformation tillgänglig</p>;
    
    return (
      <div className="text-sm overflow-auto max-h-[70vh]">
        <h3 className="font-bold text-lg mb-2">Debug SQL Query</h3>
        
        {debugData.sql_representation && (
          <div className="mb-4">
            <h4 className="font-bold mb-1">SQL Representation:</h4>
            <pre className="bg-gray-100 p-3 rounded overflow-x-auto">{debugData.sql_representation}</pre>
          </div>
        )}
        
        {debugData.rest_api_representation && (
          <div className="mb-4">
            <h4 className="font-bold mb-1">REST API Call:</h4>
            <pre className="bg-gray-100 p-3 rounded overflow-x-auto">{debugData.rest_api_representation}</pre>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="font-bold mb-1">Operation:</h4>
            <p>{debugData.operation || "UPDATE"} on table {debugData.table || "runs"}</p>
          </div>
          <div>
            <h4 className="font-bold mb-1">Fields Being Updated:</h4>
            <pre className="bg-gray-100 p-2 rounded">{JSON.stringify(debugData.fields || {name: newName.trim()}, null, 2)}</pre>
          </div>
        </div>
        
        <div className="mb-4">
          <h4 className="font-bold mb-1">Parameters:</h4>
          <pre className="bg-gray-100 p-3 rounded overflow-x-auto">{JSON.stringify(debugData.parameters || {
            runId: id,
            newName: newName.trim(),
            userId: "current-user"
          }, null, 2)}</pre>
        </div>
        
        {debugData.response && (
          <div className="mb-4">
            <h4 className="font-bold mb-1">Response:</h4>
            <div className="bg-gray-100 p-3 rounded overflow-x-auto">
              <p><strong>Status:</strong> {debugData.response.status} {debugData.response.statusText}</p>
              <p><strong>Count:</strong> {debugData.response.count}</p>
              <p><strong>Execution Time:</strong> {debugData.response.executionTime}</p>
              {debugData.response.error && (
                <div className="mt-2">
                  <p className="text-red-500"><strong>Error:</strong></p>
                  <pre className="text-red-500">{JSON.stringify(debugData.response.error, null, 2)}</pre>
                </div>
              )}
              {debugData.response.data && (
                <div className="mt-2">
                  <p><strong>Data:</strong></p>
                  <pre>{JSON.stringify(debugData.response.data, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}
        
        {debugData.pre_verification && (
          <div className="mb-4">
            <h4 className="font-bold mb-1">Pre-verification Check:</h4>
            <pre className="bg-gray-100 p-3 rounded overflow-x-auto">{JSON.stringify(debugData.pre_verification, null, 2)}</pre>
          </div>
        )}
        
        {debugData.post_verification && (
          <div className="mb-4">
            <h4 className="font-bold mb-1">Post-verification Check:</h4>
            <pre className="bg-gray-100 p-3 rounded overflow-x-auto">{JSON.stringify(debugData.post_verification, null, 2)}</pre>
          </div>
        )}
        
        {debugData.name_verification && (
          <div className="mb-4">
            <h4 className="font-bold mb-1">Name Verification:</h4>
            <pre className="bg-gray-100 p-3 rounded overflow-x-auto">{JSON.stringify(debugData.name_verification, null, 2)}</pre>
          </div>
        )}
        
        <div className="mt-4 text-xs text-gray-500">
          <p>Debugging timestamp: {new Date().toISOString()}</p>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex items-center justify-between p-4 border rounded-lg ${isExpired ? 'bg-red-50' : 'bg-card'}`}>
      {isEditing ? (
        <div className="flex-1 flex gap-2 items-center">
          <Input 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)} 
            autoFocus
            className="flex-1"
          />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={saveNewName} 
            disabled={isSaving}
          >
            {isSaving ? 
              <span className="animate-spin">•</span> : 
              <Check className="h-4 w-4 text-green-600" />
            }
          </Button>
          <Button variant="ghost" size="icon" onClick={cancelEditing}>
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          <h3 className="font-medium">{displayName}</h3>
          {errorMessage && (
            <p className="text-sm text-red-500">{errorMessage}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {actualEventCount} resultat • {formattedDate.relative} • {formattedDate.absolute}
            {isExpired && <span className="ml-2 text-red-500 font-medium">Utgången (äldre än 2 år)</span>}
          </p>
        </div>
      )}
      <div className="flex space-x-2">
        {!isEditing && (
          <>
            {!isExpired && (
              <>
                <Button variant="outline" size="icon" onClick={handleView} title="Visa">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={startEditing} title="Byt namn">
                  <Pencil className="h-4 w-4" />
                </Button>
              </>
            )}
            {debugData && (
              <Button variant="outline" size="icon" onClick={() => setShowDebugDialog(true)} title="Visa debug info">
                <Bug className="h-4 w-4 text-blue-600" />
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={handleDelete} disabled={isDeleting} title="Ta bort">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </>
        )}
      </div>

      {/* Debug Dialog */}
      <Dialog open={showDebugDialog} onOpenChange={setShowDebugDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>SQL Debug Information</DialogTitle>
            <DialogDescription>
              Detaljerad information om SQL-frågan och dess resultat
            </DialogDescription>
          </DialogHeader>
          {renderDebugInfo()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SavedRunItem;
