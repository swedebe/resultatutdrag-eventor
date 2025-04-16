
import React, { useState } from "react";
import { UserProfile } from "@/types/user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save } from "lucide-react";

interface UserProfileSettingsProps {
  userProfile: UserProfile;
}

const UserProfileSettings: React.FC<UserProfileSettingsProps> = ({ userProfile }) => {
  const { toast } = useToast();
  const [name, setName] = useState(userProfile.name || '');
  const [clubName, setClubName] = useState(userProfile.club_name || '');
  const [email, setEmail] = useState(userProfile.email || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!clubName.trim()) {
      toast({
        title: "Valideringsfel",
        description: "Klubbnamn får inte vara tomt",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Update user table
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          name,
          club_name: clubName
        })
        .eq('id', userProfile.id);

      if (userUpdateError) throw userUpdateError;

      // Update email if changed
      if (email !== userProfile.email) {
        const { error: emailUpdateError } = await supabase.auth.updateUser({
          email
        });

        if (emailUpdateError) throw emailUpdateError;

        toast({
          title: "Verifikation krävs",
          description: "En verifikationslänk har skickats till din nya e-postadress.",
        });
      }

      toast({
        title: "Inställningar sparade",
        description: "Dina inställningar har uppdaterats",
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Fel vid sparande",
        description: error.message || "Ett fel uppstod vid sparande av inställningar",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil</CardTitle>
        <CardDescription>Uppdatera din personliga information</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Namn</Label>
            <Input 
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ditt namn"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="club">Klubb</Label>
            <Input 
              id="club"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="Din klubb"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-post</Label>
            <Input 
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Din e-postadress"
            />
            {email !== userProfile.email && (
              <p className="text-xs text-amber-500">
                Ändring av e-post kräver verifiering via den nya e-postadressen.
              </p>
            )}
          </div>

          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="mt-4"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Sparar..." : "Spara ändringar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfileSettings;
