
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
        
        // First check if the user exists by email (to handle cases where the same email might have multiple accounts)
        if (user.email) {
          const { data: emailCheckData, error: emailCheckError } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email)
            .single();
            
          if (emailCheckData && !emailCheckError) {
            console.log("User profile found by email:", emailCheckData);
            
            // Set user as superuser if email is david@vram.se
            const isSuperuser = emailCheckData.email === 'david@vram.se';
            console.log("Is superuser:", isSuperuser);
            
            setUserProfile({
              ...emailCheckData,
              role: isSuperuser ? UserRole.SUPERUSER : UserRole.REGULAR
            });
            
            setLoading(false);
            return; // Exit early as we found the user
          }
        }
        
        // If we didn't find by email, check by ID
        const { data: checkData, error: checkError, count } = await supabase
          .from('users')
          .select('*', { count: 'exact' })
          .eq('id', user.id);
          
        console.log("User check results by ID:", { count, records: checkData?.length });
        
        if (checkError) {
          console.error("Error checking user profile by ID:", checkError);
          throw checkError;
        }
        
        // If no user exists, we need to create one
        if (!checkData || checkData.length === 0) {
          console.log("User profile does not exist, creating one...");
          
          const { data: insertData, error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email || '',
              club_name: 'Din klubb' // Default value
            })
            .select('*')
            .single();
            
          if (insertError) {
            console.error("Error creating user profile:", insertError);
            throw insertError;
          }
          
          console.log("Created new user profile:", insertData);
          
          // Set user as superuser if email is david@vram.se
          const isSuperuser = user.email === 'david@vram.se';
          console.log("Is superuser:", isSuperuser);
          
          setUserProfile({
            ...insertData,
            role: isSuperuser ? UserRole.SUPERUSER : UserRole.REGULAR
          });
        }
        // If multiple users exist, handle the error
        else if (checkData.length > 1) {
          console.error("Multiple user profiles found:", checkData);
          throw new Error("Multiple user profiles found");
        }
        // If exactly one user exists, use that
        else {
          console.log("User profile found:", checkData[0]);
          
          // Set user as superuser if email is david@vram.se
          const isSuperuser = checkData[0].email === 'david@vram.se';
          console.log("Is superuser:", isSuperuser);
          
          setUserProfile({
            ...checkData[0],
            role: isSuperuser ? UserRole.SUPERUSER : UserRole.REGULAR
          });
        }
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
