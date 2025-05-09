
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Bug } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { updateRunName } from "@/services/database/resultRepository";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { isUserSuperuser } from "@/types/user";

interface RunSettingsSectionProps {
  saveName: string;
  onSaveNameChange: (name: string) => void;
  onRenameRun: () => void;
  isRenaming: boolean;
  runId: string | null;
}

const RunSettingsSection: React.FC<RunSettingsSectionProps> = ({
  saveName,
  onSaveNameChange,
  onRenameRun,
  isRenaming,
  runId,
}) => {
  const { toast } = useToast();
  const [localIsRenaming, setLocalIsRenaming] = useState(false);
  const [nameBeforeEdit, setNameBeforeEdit] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isSuperuser, setIsSuperuser] = useState(false);

  // Check if the current user is a superuser
  useEffect(() => {
    const checkUserRole = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();
          
        if (!error && userData) {
          setIsSuperuser(isUserSuperuser(userData.role));
        }
      }
    };
    
    checkUserRole();
  }, []);

  // Store the original name to detect actual changes
  useEffect(() => {
    if (!localIsRenaming) {
      setNameBeforeEdit(saveName);
    }
  }, [saveName, localIsRenaming]);

  // Debug: Log current user and run ID to help diagnose permissions issues
  useEffect(() => {
    const checkUserAndRunId = async () => {
      if (runId) {
        const { data: { user } } = await supabase.auth.getUser();
        console.log("Current user:", user?.id);
        console.log("Attempting to rename run:", runId);
        
        // Check if current user has access to this run
        const { data, error } = await supabase
          .from('runs')
          .select('user_id, name')
          .eq('id', runId)
          .single();
          
        if (error) {
          console.error("Error checking run access:", error);
          setDebugInfo(prev => ({
            ...prev,
            accessCheckError: error
          }));
        } else {
          console.log("Run belongs to user:", data?.user_id);
          console.log("Current run name:", data?.name);
          const hasAccess = user?.id === data?.user_id;
          console.log("User has access to rename:", hasAccess);
          
          setDebugInfo(prev => ({
            ...prev,
            currentUserId: user?.id,
            runId,
            runUserId: data?.user_id,
            currentRunName: data?.name,
            hasAccess
          }));
        }
      }
    };
    
    checkUserAndRunId();
  }, [runId]);

  const handleRename = async () => {
    setErrorMessage(null);
    const requestPayload = {
      runId,
      newName: saveName.trim(),
    };
    
    setDebugInfo(prev => ({
      ...prev,
      requestPayload,
      nameBeforeEdit,
      attemptedNewName: saveName.trim(),
      timestamp: new Date().toISOString()
    }));
    
    if (!runId || !saveName.trim()) {
      const error = "Körningen måste ha ett namn";
      toast({
        title: "Ogiltigt namn",
        description: error,
        variant: "destructive",
      });
      
      setDebugInfo(prev => ({
        ...prev,
        validationError: error,
      }));
      return;
    }
    
    // Skip update if name hasn't changed
    if (saveName.trim() === nameBeforeEdit.trim()) {
      const message = "Du använde samma namn som tidigare";
      toast({
        title: "Inget namnbyte behövs",
        description: message,
      });
      
      setDebugInfo(prev => ({
        ...prev,
        skippedReason: message,
      }));
      return;
    }
    
    setLocalIsRenaming(true);
    try {
      console.log(`RunSettingsSection: Attempting to rename run ${runId} to "${saveName}"`);
      
      // Call the updateRunName function with proper error handling
      const result = await updateRunName(runId, saveName.trim());
      
      // Extract success and response data from the result
      const { success, data, error, message } = result;
      
      setDebugInfo(prev => ({
        ...prev,
        supabaseResponse: { success, data, error, message },
        dataLength: data?.length || 0,
        hasData: data && data.length > 0
      }));
      
      if (!success) {
        throw new Error(message || "Kunde inte byta namnet");
      }
      
      // If successful, update the UI
      toast({
        title: "Namn uppdaterat",
        description: "Körningens namn har uppdaterats",
      });
      
      // Set the new name as the "original" name to prevent duplicate updates
      setNameBeforeEdit(saveName.trim());
      
      // Call the parent's onRenameRun function to refresh data
      onRenameRun();
      
      setDebugInfo(prev => ({
        ...prev,
        success: true,
        successMessage: "Namn uppdaterat framgångsrikt"
      }));
    } catch (error: any) {
      console.error("Error renaming run:", error);
      setErrorMessage(error.message || "Ett fel uppstod vid namnbyte av körningen");
      
      setDebugInfo(prev => ({
        ...prev,
        caughtException: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        success: false
      }));
      
      toast({
        title: "Fel vid namnbyte",
        description: error.message || "Ett fel uppstod vid namnbyte av körningen",
        variant: "destructive",
      });
    } finally {
      setLocalIsRenaming(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Hantera körning</CardTitle>
        <CardDescription>
          Hantera denna körning eller exportera resultaten
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:gap-4 items-end">
            <div className="flex flex-col gap-2">
              <Label htmlFor="save-name">Namn på körningen</Label>
              <div className="flex gap-2">
                <Input 
                  id="save-name"
                  value={saveName} 
                  onChange={(e) => onSaveNameChange(e.target.value)}
                  placeholder="Ange ett beskrivande namn för denna körning" 
                />
                <Button 
                  onClick={handleRename} 
                  disabled={localIsRenaming || isRenaming || !saveName.trim() || !runId}
                  variant="secondary"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {localIsRenaming ? "Sparar..." : "Byt namn"}
                </Button>
              </div>
              {errorMessage && (
                <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
              )}
            </div>
          </div>
          
          {/* Debug Panel for Superusers */}
          {isSuperuser && (
            <div className="mt-6 border border-amber-300 bg-amber-50 p-4 rounded-md">
              <div className="flex items-center gap-2 mb-3">
                <Bug className="text-amber-600" size={20} />
                <h3 className="font-medium text-amber-800">Debug Panel (Superusers Only)</h3>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-amber-800">Run ID</Label>
                    <Input 
                      value={runId || 'N/A'} 
                      readOnly 
                      className="bg-white text-sm h-8 font-mono" 
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-amber-800">Original Name</Label>
                    <Input 
                      value={nameBeforeEdit || 'N/A'} 
                      readOnly 
                      className="bg-white text-sm h-8" 
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-amber-800">Debug Information</Label>
                  <Textarea 
                    value={JSON.stringify(debugInfo, null, 2)} 
                    readOnly 
                    className="bg-white font-mono text-xs h-48" 
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RunSettingsSection;
