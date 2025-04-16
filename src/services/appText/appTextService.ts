
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
    try {
      // First try using the Supabase client directly
      const { data, error } = await supabase.from('app_texts').select('*');
      
      if (error) {
        console.error("Error from Supabase client:", error);
        throw error;
      }
      
      if (data && data.length > 0) {
        return data as AppText[];
      }
      
      // Fallback to direct REST API
      console.log("No data from Supabase client, trying REST API");
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

      const restData = await response.json();
      console.log("Data from REST API:", restData);
      return restData as AppText[];
    } catch (error) {
      console.error("All methods failed to fetch app texts:", error);
      throw error;
    }
  },

  /**
   * Update an app text
   */
  async updateAppText(id: string, value: string): Promise<void> {
    try {
      // First try using the Supabase client directly
      const { error } = await supabase
        .from('app_texts')
        .update({ value })
        .eq('id', id);
      
      if (error) {
        console.error("Error from Supabase client update:", error);
        throw error;
      }
      
      console.log(`Updated app text ${id} successfully`);
      return;
    } catch (supabaseError) {
      console.warn("Supabase client update failed, trying REST API");
      
      // Fallback to direct REST API
      try {
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
        
        console.log(`Updated app text ${id} via REST API successfully`);
      } catch (restError) {
        console.error("Both update methods failed:", restError);
        throw restError;
      }
    }
  }
};
