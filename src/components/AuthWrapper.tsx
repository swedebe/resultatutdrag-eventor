
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Debug function to check JWT claims
    const checkUserClaims = async () => {
      const { data } = await supabase.auth.getUser();
      if (data && data.user) {
        console.log("✅ AuthWrapper - User authenticated:", data.user.email);
        console.log("✅ AuthWrapper - User ID:", data.user.id);
        console.log("✅ AuthWrapper - User role:", data.user.app_metadata?.role || "No role in app_metadata");
        
        // Get JWT token for more detailed debugging
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData && sessionData.session) {
          console.log("✅ AuthWrapper - JWT exists:", !!sessionData.session.access_token);
          
          // Print first characters of JWT for reference
          const token = sessionData.session.access_token;
          console.log("✅ AuthWrapper - JWT preview:", token.substring(0, 15) + "...");
        }
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user || null);
        setLoading(false);
        if (session?.user) {
          checkUserClaims();
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
      if (session?.user) {
        checkUserClaims();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Laddar...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default AuthWrapper;
