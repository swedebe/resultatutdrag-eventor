
import { supabase } from "@/integrations/supabase/client";
import { AppText } from "@/types/appText";

/**
 * Service for interacting with app_texts table using direct API calls
 * This bypasses TypeScript issues with the generated Supabase types
 */
export const AppTextService = {
  /**
   * Fetch all app texts
   */
  async getAllAppTexts(): Promise<AppText[]> {
    // Use the REST API directly to avoid type issues
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pxbtnzgsogrpkkurcvzv.supabase.co"}/rest/v1/app_texts`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4YnRuemdzb2dycGtrdXJjdnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Nzc0OTgsImV4cCI6MjA2MDI1MzQ5OH0.NpyAPaU7G9XVRaeS1LPhdHBCOVDiMya8c5Poc7y_hZI",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4YnRuemdzb2dycGtrdXJjdnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Nzc0OTgsImV4cCI6MjA2MDI1MzQ5OH0.NpyAPaU7G9XVRaeS1LPhdHBCOVDiMya8c5Poc7y_hZI"}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error fetching app texts: ${response.statusText}`);
    }

    const data = await response.json();
    return data as AppText[];
  },

  /**
   * Update an app text
   */
  async updateAppText(id: string, value: string): Promise<void> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pxbtnzgsogrpkkurcvzv.supabase.co"}/rest/v1/app_texts?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4YnRuemdzb2dycGtrdXJjdnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Nzc0OTgsImV4cCI6MjA2MDI1MzQ5OH0.NpyAPaU7G9XVRaeS1LPhdHBCOVDiMya8c5Poc7y_hZI",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4YnRuemdzb2dycGtrdXJjdnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Nzc0OTgsImV4cCI6MjA2MDI1MzQ5OH0.NpyAPaU7G9XVRaeS1LPhdHBCOVDiMya8c5Poc7y_hZI"}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ value })
      }
    );

    if (!response.ok) {
      throw new Error(`Error updating app text: ${response.statusText}`);
    }
  }
};
