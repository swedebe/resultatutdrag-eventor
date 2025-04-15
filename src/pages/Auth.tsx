
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
  const [clubName, setClubName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
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
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (!clubName) {
      toast({
        title: "Klubbnamn saknas",
        description: "Du måste ange ett klubbnamn för att registrera dig",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            club_name: clubName,
          }
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Registrering lyckades",
        description: "Kontrollera din e-post för verifieringslänk",
      });
      
    } catch (error: any) {
      toast({
        title: "Ett fel uppstod vid registrering",
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
          <CardTitle>{isSignUp ? "Registrera konto" : "Logga in"}</CardTitle>
          <CardDescription>
            {isSignUp 
              ? "Skapa ett nytt konto för din orienteringsklubb" 
              : "Logga in för att hantera din klubbs resultat"}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
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
            
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="club">Klubbnamn</Label>
                <Input
                  id="club"
                  type="text"
                  placeholder="Din orienteringsklubb"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  required
                />
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Bearbetar..."
                : isSignUp
                  ? "Registrera"
                  : "Logga in"
              }
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col">
          <Button 
            variant="link" 
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full"
          >
            {isSignUp
              ? "Redan registrerad? Logga in"
              : "Behöver du ett konto? Registrera dig"
            }
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
