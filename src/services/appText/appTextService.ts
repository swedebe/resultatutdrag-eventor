
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
      `${supabase.supabaseUrl}/rest/v1/app_texts`,
      {
        headers: {
          apikey: supabase.supabaseKey,
          Authorization: `Bearer ${supabase.supabaseKey}`,
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
      `${supabase.supabaseUrl}/rest/v1/app_texts?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: {
          apikey: supabase.supabaseKey,
          Authorization: `Bearer ${supabase.supabaseKey}`,
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
