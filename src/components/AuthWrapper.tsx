
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
    // Enhanced debug function to check JWT claims
    const checkUserClaims = async () => {
      const { data } = await supabase.auth.getUser();
      if (data && data.user) {
        console.log("✅ AuthWrapper - User authenticated:", data.user.email);
        console.log("✅ AuthWrapper - User ID:", data.user.id);
        
        // Detailed JWT token logging
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData && sessionData.session) {
          const token = sessionData.session.access_token;
          const decodedToken = JSON.parse(atob(token.split('.')[1]));
          
          console.log("✅ AuthWrapper - Full JWT Payload:", decodedToken);
          console.log("✅ AuthWrapper - User Role from app_metadata:", 
            decodedToken.app_metadata?.role || 'No role found in app_metadata'
          );
          
          // Log first characters of JWT for reference
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
