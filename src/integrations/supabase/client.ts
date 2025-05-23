
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://pxbtnzgsogrpkkurcvzv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4YnRuemdzb2dycGtrdXJjdnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Nzc0OTgsImV4cCI6MjA2MDI1MzQ5OH0.NpyAPaU7G9XVRaeS1LPhdHBCOVDiMya8c5Poc7y_hZI";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        // Explicitly tell PostgREST not to use any timezone conversions
        'Prefer': 'timezone=UTC'
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  }
);
