
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate("/");
      }
    };
    
    checkSession();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
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
  
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{showResetPassword ? "Återställ lösenord" : "Logga in"}</CardTitle>
          <CardDescription>
            {showResetPassword 
              ? "Ange din e-post för att få en länk att återställa ditt lösenord" 
              : "Logga in för att hantera din klubbs resultat"}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {showResetPassword ? (
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
          <Button 
            variant="link" 
            onClick={() => setShowResetPassword(!showResetPassword)}
            className="w-full"
          >
            {showResetPassword
              ? "Tillbaka till inloggning"
              : "Glömt lösenord?"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
