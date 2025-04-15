
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';
import { User } from '@supabase/supabase-js';

const AuthStatus = () => {
  const [user, setUser] = useState<User | null>(null);
  const [clubName, setClubName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        
        if (session?.user) {
          // Get club name from users table
          const { data, error } = await supabase
            .from('users')
            .select('club_name')
            .eq('id', session.user.id)
            .maybeSingle();

          if (!error && data) {
            setClubName(data.club_name);
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user || null);
        if (!session?.user) {
          setClubName('');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Utloggning lyckades',
        description: 'Du är nu utloggad',
      });
    } catch (error: any) {
      toast({
        title: 'Ett fel uppstod vid utloggning',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Laddar...</div>;
  }

  if (!user) {
    return (
      <Link to="/auth">
        <Button variant="outline" size="sm">
          Logga in
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="text-sm">
        <span className="text-muted-foreground mr-2">Inloggad som</span>
        <span className="font-medium">{clubName || user.email}</span>
      </div>
      <Button variant="outline" size="sm" onClick={handleSignOut}>
        Logga ut
      </Button>
    </div>
  );
};

export default AuthStatus;
