
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAppText } from "@/hooks/useAppText";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Get dynamic app texts
  const { text: loginTitle } = useAppText('login_title', 'Logga in');
  const { text: loginDescription } = useAppText('login_description', 'Logga in för att hantera din klubbs resultat');
  const { text: resetPasswordTitle } = useAppText('reset_password_title', 'Återställ lösenord');
  const { text: updatePasswordTitle } = useAppText('update_password_title', 'Skapa nytt lösenord');
  
  // Check if user is already logged in and handle recovery token
  useEffect(() => {
    const checkSessionAndRecoveryToken = async () => {
      try {
        // First check if there's an access token in the URL fragment (recovery flow)
        const hash = window.location.hash;
        if (hash && hash.includes('access_token=')) {
          // Extract the tokens from the URL fragment
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          
          if (accessToken) {
            // We're in a password recovery flow
            setShowUpdatePassword(true);
            // Don't redirect to homepage yet
            return;
          }
        }

        // If no recovery token, check for existing session
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          navigate("/");
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
    };
    
    checkSessionAndRecoveryToken();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event !== 'PASSWORD_RECOVERY' && session) {
          navigate("/");
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, [navigate]);
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Inloggning lyckades",
        description: "Du är nu inloggad",
      });
      
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Ett fel uppstod vid inloggning",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (!email) {
      toast({
        title: "E-post saknas",
        description: "Du måste ange din e-post för att återställa lösenordet",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    try {
      // Get the current URL without hash or query params
      const currentUrl = window.location.origin + window.location.pathname;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: currentUrl,
      });
      
      if (error) throw error;
      
      toast({
        title: "Återställningslänk skickad",
        description: "Kontrollera din e-post för en länk att återställa ditt lösenord",
      });
      
      setShowResetPassword(false);
    } catch (error: any) {
      toast({
        title: "Ett fel uppstod",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Lösenorden matchar inte",
        description: "Vänligen kontrollera att lösenorden matchar",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      toast({
        title: "Lösenord uppdaterat",
        description: "Ditt lösenord har uppdaterats. Du kan nu logga in med ditt nya lösenord.",
      });
      
      // Clear hash from URL
      window.history.replaceState(null, '', window.location.pathname);
      setShowUpdatePassword(false);
    } catch (error: any) {
      toast({
        title: "Ett fel uppstod",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Debug rendering
  console.log("Auth component rendering", {
    showResetPassword,
    showUpdatePassword
  });
  
  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {showUpdatePassword 
              ? updatePasswordTitle
              : showResetPassword 
                ? resetPasswordTitle
                : loginTitle}
          </CardTitle>
          <CardDescription>
            {showUpdatePassword
              ? "Ange och bekräfta ditt nya lösenord"
              : showResetPassword 
                ? "Ange din e-post för att få en länk att återställa ditt lösenord" 
                : loginDescription}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {showUpdatePassword ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nytt lösenord</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Bekräfta lösenord</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Bearbetar..." : "Uppdatera lösenord"}
              </Button>
            </form>
          ) : showResetPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">E-post</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="din@email.se"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Bearbetar..." : "Skicka återställningslänk"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="din@email.se"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Lösenord</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Bearbetar..." : "Logga in"}
              </Button>
            </form>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col">
          {!showUpdatePassword && (
            <Button 
              variant="link" 
              onClick={() => setShowResetPassword(!showResetPassword)}
              className="w-full"
            >
              {showResetPassword
                ? "Tillbaka till inloggning"
                : "Glömt lösenord?"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
