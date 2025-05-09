
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
  const [currentDbName, setCurrentDbName] = useState('');
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

  // Get the current name from the database directly to avoid stale state
  useEffect(() => {
    if (runId) {
      const fetchCurrentName = async () => {
        const { data, error } = await supabase
          .from('runs')
          .select('name')
          .eq('id', runId)
          .single();
          
        if (!error && data) {
          setCurrentDbName(data.name);
          setNameBeforeEdit(data.name); // Initialize with fresh DB value
          
          setDebugInfo(prev => ({
            ...prev,
            dbNameFetch: {
              success: true,
              fetchedName: data.name,
              timestamp: new Date().toISOString()
            }
          }));
        } else {
          console.error("Error fetching run name:", error);
          setDebugInfo(prev => ({
            ...prev,
            dbNameFetch: {
              success: false,
              error,
              timestamp: new Date().toISOString()
            }
          }));
        }
      };
      
      fetchCurrentName();
    }
  }, [runId]);

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
          
          // Update local state with fresh database value
          setCurrentDbName(data?.name || '');
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
      currentDbName,
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
    
    // FIXED: Compare with current DB name instead of local state
    if (saveName.trim() === currentDbName.trim()) {
      const message = "Du använde samma namn som tidigare";
      toast({
        title: "Inget namnbyte behövs",
        description: message,
      });
      
      setDebugInfo(prev => ({
        ...prev,
        skippedReason: message,
        comparisonValues: {
          saveName: saveName.trim(),
          currentDbName: currentDbName.trim(),
          areEqual: saveName.trim() === currentDbName.trim()
        }
      }));
      return;
    }
    
    setLocalIsRenaming(true);
    try {
      console.log(`RunSettingsSection: Attempting to rename run ${runId} to "${saveName}"`);
      
      // Get current user ID for debugging
      const { data: { user } } = await supabase.auth.getUser();
      console.log(`User ID attempting update: ${user?.id}`);
      
      // Call the updateRunName function with proper error handling
      const result = await updateRunName(runId, saveName.trim());
      
      // Extract success and response data from the result
      const { success, data, error, message } = result;
      
      setDebugInfo(prev => ({
        ...prev,
        supabaseResponse: result,
        dataLength: data?.length || 0,
        hasData: data && data.length > 0,
        userIdAttemptingUpdate: user?.id
      }));
      
      // If update failed, check if the run exists with our criteria
      if (!success && error?.type === 'updateFailed') {
        // Perform additional check to verify run existence and permissions
        const { data: runCheck } = await supabase
          .from('runs')
          .select('id, user_id, name')
          .eq('id', runId)
          .single();
          
        setDebugInfo(prev => ({
          ...prev,
          additionalCheck: {
            runExists: !!runCheck,
            runDetails: runCheck,
            userMatches: runCheck?.user_id === user?.id
          }
        }));
      }
      
      if (!success) {
        throw new Error(message || "Kunde inte byta namnet");
      }
      
      // If successful, update the UI
      toast({
        title: "Namn uppdaterat",
        description: "Körningens namn har uppdaterats",
      });
      
      // Update our tracking of the DB value
      setCurrentDbName(saveName.trim());
      
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-amber-800">Run ID</Label>
                    <Input 
                      value={runId || 'N/A'} 
                      readOnly 
                      className="bg-white text-sm h-8 font-mono" 
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-amber-800">Current DB Name</Label>
                    <Input 
                      value={currentDbName || 'N/A'} 
                      readOnly 
                      className="bg-white text-sm h-8" 
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-amber-800">Authentication Status</Label>
                    <div className="flex items-center gap-2 h-8">
                      {debugInfo?.currentUserId ? (
                        <span className="text-green-600 font-medium">Authenticated</span>
                      ) : (
                        <span className="text-red-600 font-medium">Not authenticated</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-amber-800">Run User ID</Label>
                    <Input 
                      value={debugInfo?.runUserId || 'N/A'} 
                      readOnly 
                      className="bg-white text-sm h-8 font-mono" 
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-amber-800">Current User ID</Label>
                    <Input 
                      value={debugInfo?.currentUserId || 'N/A'} 
                      readOnly 
                      className="bg-white text-sm h-8 font-mono" 
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-amber-800">Permission Status</Label>
                  <div className="p-2 rounded bg-white">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${debugInfo?.hasAccess ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className={`${debugInfo?.hasAccess ? 'text-green-700' : 'text-red-700'} font-medium`}>
                        {debugInfo?.hasAccess ? 'Has permission' : 'No permission'} 
                        (User IDs {debugInfo?.hasAccess ? 'match' : 'do not match'})
                      </span>
                    </div>
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
                
                {debugInfo?.additionalCheck && (
                  <div>
                    <Label className="text-xs text-amber-800">Additional Run Check</Label>
                    <div className="p-3 bg-white rounded border border-amber-200">
                      <p className="text-xs mb-1">
                        <span className="font-bold">Run exists: </span>
                        <span className={debugInfo.additionalCheck.runExists ? 'text-green-600' : 'text-red-600'}>
                          {String(debugInfo.additionalCheck.runExists)}
                        </span>
                      </p>
                      <p className="text-xs mb-1">
                        <span className="font-bold">User IDs match: </span>
                        <span className={debugInfo.additionalCheck.userMatches ? 'text-green-600' : 'text-red-600'}>
                          {String(debugInfo.additionalCheck.userMatches)}
                        </span>
                      </p>
                      {debugInfo.additionalCheck.runDetails && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono">
                          {JSON.stringify(debugInfo.additionalCheck.runDetails, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RunSettingsSection;
