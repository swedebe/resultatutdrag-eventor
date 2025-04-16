
import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserRole, UserProfile } from "@/types/user";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SuperuserSettings from "@/components/settings/SuperuserSettings";
import UserProfileSettings from "@/components/settings/UserProfileSettings";

const Settings = () => {
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Get current authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) throw authError;
        
        if (!user) {
          console.error("No authenticated user found");
          navigate('/auth');
          return;
        }

        console.log("Authenticated user:", user.email);
        
        // Fetch user profile from the users table
        const { data, error } = await supabase
          .from('users')
          .select('id, email, name, club_name')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Error fetching user profile:", error);
          throw error;
        }
        
        if (!data) {
          console.error("User profile not found in the users table");
          throw new Error("User profile not found");
        }
        
        console.log("User profile fetched:", data);
        
        // Set user as superuser if email is david@vram.se
        const isSuperuser = data.email === 'david@vram.se';
        console.log("Is superuser:", isSuperuser);
        
        setUserProfile({
          ...data,
          role: isSuperuser ? UserRole.SUPERUSER : UserRole.REGULAR
        });
      } catch (error: any) {
        console.error('Error fetching user profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load user profile: ' + (error.message || error),
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold">Inställningar</h1>
          <Link to="/">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Tillbaka
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Laddar användarinformation...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold">Inställningar</h1>
          <Link to="/">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Tillbaka
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Ingen användarinformation hittades.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Inställningar</h1>
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Tillbaka till startsidan
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* User Profile settings for all users */}
        {userProfile && <UserProfileSettings userProfile={userProfile} />}
        
        {/* Superuser settings */}
        {userProfile && userProfile.role === UserRole.SUPERUSER && (
          <SuperuserSettings />
        )}
      </div>
    </div>
  );
};

export default Settings;
