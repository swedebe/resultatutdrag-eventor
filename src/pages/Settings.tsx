
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

        console.log("Authenticated user:", user.id, user.email);
        
        // Try to find the user profile - first by ID, then by email
        let userRecord = null;
        
        // Check by ID first
        const { data: idCheckData, error: idCheckError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
          
        if (idCheckError && idCheckError.code !== 'PGRST116') {
          // PGRST116 is the "Zero rows returned" error, which is expected if no user exists with this ID
          console.error("Error checking user profile by ID:", idCheckError);
          throw idCheckError;
        }
        
        if (idCheckData) {
          console.log("User profile found by ID:", idCheckData);
          userRecord = idCheckData;
        } else if (user.email) {
          // If not found by ID, check by email
          const { data: emailCheckData, error: emailCheckError } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email)
            .maybeSingle();
            
          if (emailCheckError && emailCheckError.code !== 'PGRST116') {
            console.error("Error checking user profile by email:", emailCheckError);
            throw emailCheckError;
          }
          
          if (emailCheckData) {
            console.log("User profile found by email:", emailCheckData);
            userRecord = emailCheckData;
          }
        }
        
        // Create a new user record if none found
        if (!userRecord) {
          console.log("No existing user profile found, creating one...");
          
          // We need to use a raw query with ON CONFLICT DO NOTHING to handle potential race conditions
          const { data: insertData, error: insertError } = await supabase
            .rpc('create_user_if_not_exists', { 
              user_id: user.id,
              user_email: user.email || '',
              user_club_name: 'Din klubb' // Default value
            });
            
          if (insertError) {
            console.error("Error creating user profile:", insertError);
            throw insertError;
          }
          
          // Now fetch the user profile that was just created or already existed
          const { data: newUserData, error: newUserError } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email)
            .maybeSingle();
            
          if (newUserError) {
            console.error("Error fetching created/existing user profile:", newUserError);
            throw newUserError;
          }
          
          if (!newUserData) {
            throw new Error("Failed to create or retrieve user profile");
          }
          
          console.log("Retrieved user profile:", newUserData);
          userRecord = newUserData;
        }
        
        // Set user as superuser if email is david@vram.se
        const isSuperuser = userRecord.email === 'david@vram.se';
        console.log("Is superuser:", isSuperuser);
        
        setUserProfile({
          ...userRecord,
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
