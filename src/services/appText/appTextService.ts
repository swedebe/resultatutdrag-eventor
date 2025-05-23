
import { supabase } from "@/integrations/supabase/client";
import { AppText } from "@/types/appText";

/**
 * Service for interacting with app_texts table using direct API calls
 * This bypasses TypeScript issues with the generated Supabase types
 */
export const AppTextService = {
  // Cache for app texts to reduce redundant requests
  _cachedTexts: null as AppText[] | null,
  _lastFetchTimestamp: 0,
  _cacheMaxAge: 60000, // 1 minute cache validity

  /**
   * Fetch all app texts, using cache if available and not expired
   */
  async getAllAppTexts(forceRefresh = false): Promise<AppText[]> {
    // Return cached texts if they exist and are not expired
    const now = Date.now();
    if (!forceRefresh && this._cachedTexts && now - this._lastFetchTimestamp < this._cacheMaxAge) {
      console.log(`Using cached app texts (${this._cachedTexts.length} items)`);
      return this._cachedTexts;
    }
    
    try {
      // First try using the Supabase client directly
      const { data, error } = await supabase.from('app_texts').select('*');
      
      if (error) {
        console.error("Error from Supabase client:", error);
        throw error;
      }
      
      if (data && data.length > 0) {
        console.log(`Retrieved ${data.length} app texts with Supabase client`);
        this._cachedTexts = data as AppText[];
        this._lastFetchTimestamp = now;
        return this._cachedTexts;
      }
      
      // Fallback to direct REST API
      console.log("No data from Supabase client, trying REST API");
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || "https://pxbtnzgsogrpkkurcvzv.supabase.co"}/rest/v1/app_texts`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4YnRuemdzb2dycGtrdXJjdnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Nzc0OTgsImV4cCI6MjA2MDI1MzQ5OH0.NpyAPaU7G9XVRaeS1LPhdHBCOVDiMya8c5Poc7y_hZI",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4YnRuemdzb2dycGtrdXJjdnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Nzc0OTgsImV4cCI6MjA2MDI1MzQ5OH0.NpyAPaU7G9XVRaeS1LPhdHBCOVDiMya8c5Poc7y_hZI"}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error fetching app texts: ${response.statusText}`);
      }

      const restData = await response.json();
      console.log(`Retrieved ${restData?.length || 0} app texts with REST API`);
      this._cachedTexts = restData as AppText[];
      this._lastFetchTimestamp = now;
      return this._cachedTexts;
    } catch (error) {
      console.error("All methods failed to fetch app texts:", error);
      // Return empty array instead of throwing to prevent cascading errors
      return [];
    }
  },

  /**
   * Update an app text
   * @param id Text ID to update
   * @param value New text value 
   * @param previousValue Previous text value to check if update is needed
   */
  async updateAppText(id: string, value: string, previousValue?: string): Promise<void> {
    // Skip update if the value hasn't changed
    if (previousValue !== undefined && value === previousValue) {
      console.log(`Skipping update for app text ${id} - value unchanged`);
      return;
    }
    
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
      
      // Invalidate cache after update
      this._cachedTexts = null;
      return;
    } catch (supabaseError) {
      console.warn("Supabase client update failed, trying REST API");
      
      // Fallback to direct REST API
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL || "https://pxbtnzgsogrpkkurcvzv.supabase.co"}/rest/v1/app_texts?id=eq.${id}`,
          {
            method: 'PATCH',
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4YnRuemdzb2dycGtrdXJjdnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Nzc0OTgsImV4cCI6MjA2MDI1MzQ5OH0.NpyAPaU7G9XVRaeS1LPhdHBCOVDiMya8c5Poc7y_hZI",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4YnRuemdzb2dycGtrdXJjdnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Nzc0OTgsImV4cCI6MjA2MDI1MzQ5OH0.NpyAPaU7G9XVRaeS1LPhdHBCOVDiMya8c5Poc7y_hZI"}`,
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
        // Invalidate cache after update
        this._cachedTexts = null;
      } catch (restError) {
        console.error("Both update methods failed:", restError);
        throw restError;
      }
    }
  },
  
  /**
   * Create or update app text by key
   */
  async createOrUpdateAppTextByKey(key: string, value: string, category: string = 'general'): Promise<void> {
    try {
      // First check if the text exists
      const { data, error } = await supabase
        .from('app_texts')
        .select('id, value')
        .eq('key', key)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error(`Error checking if app text ${key} exists:`, error);
        throw error;
      }
      
      if (data?.id) {
        // Text exists, update it only if value changed
        if (data.value !== value) {
          return this.updateAppText(data.id, value, data.value);
        } else {
          console.log(`Skipping update for app text ${key} - value unchanged`);
        }
      } else {
        // Text doesn't exist, create it
        const { error: insertError } = await supabase
          .from('app_texts')
          .insert({ key, value, category });
          
        if (insertError) {
          console.error(`Error creating app text ${key}:`, insertError);
          throw insertError;
        }
        
        console.log(`Created app text ${key} successfully`);
        // Invalidate cache after insert
        this._cachedTexts = null;
      }
    } catch (error) {
      console.error(`Failed to create or update app text ${key}:`, error);
      throw error;
    }
  },

  /**
   * Check if required application texts exist in the database
   * This method should be called during application initialization once
   * It will only insert missing texts, not update existing ones
   */
  async ensureRequiredAppTextsExist(): Promise<void> {
    // First, get all existing app texts to check which ones we need to create
    const existingTexts = await this.getAllAppTexts(true); // Force refresh from DB
    
    // Create a map of existing keys for faster lookup
    const existingKeysMap = new Map(existingTexts.map(text => [text.key, true]));
    
    const requiredTexts = [
      // Homepage texts
      { key: 'main_title', value: 'Resultatanalys', category: 'homepage' },
      { key: 'welcome_message', value: 'Välkommen, {0}!', category: 'homepage' },
      { key: 'tool_description', value: 'Med detta verktyg kan du använda en exportfil från Eventor för att hämta banlängd och antal startande. Därefter kan du spara det som en ny excelfil.', category: 'homepage' },
      { key: 'file_instructions', value: 'Exportfilen från Eventor måste redigeras först. Du ska ta bort fliken Deltagare och spara filen som en xlsx-fil.', category: 'homepage' },
      { key: 'your_runs_title', value: 'Dina sparade körningar', category: 'homepage' },
      { key: 'your_runs_subtitle', value: 'Tidigare sparade körningar och analyser', category: 'homepage' },
      { key: 'batch_processing_button', value: 'Batch-bearbetning', category: 'homepage' },
      { key: 'trophy_button', value: 'Vandringspris', category: 'homepage' },
      
      // EventorBatch page texts
      { key: 'eventorbatch_title', value: 'Resultatanalys - Batch-bearbetning', category: 'eventorbatch' },
      { key: 'eventorbatch_upload_title', value: 'Filuppladdning och bearbetningsalternativ', category: 'eventorbatch' },
      { key: 'eventorbatch_upload_description', value: 'Ladda upp en Excel-fil med resultat för att automatiskt berika dem med data från Eventor.', category: 'eventorbatch' },
      { key: 'eventorbatch_upload_label', value: 'Ladda upp resultatfil (Excel)', category: 'eventorbatch' },
      { key: 'eventorbatch_options_title', value: 'Bearbetningsalternativ', category: 'eventorbatch' },
      { key: 'eventorbatch_fetch_course_length', value: 'Hämta banlängder (scraping)', category: 'eventorbatch' },
      { key: 'eventorbatch_fetch_starters', value: 'Hämta antal startande (API)', category: 'eventorbatch' },
      { key: 'eventorbatch_delay_label', value: 'Fördröjning:', category: 'eventorbatch' },
      { key: 'eventorbatch_delay_hint', value: '(Högre värde förhindrar rate-limiting från Eventor)', category: 'eventorbatch' },
      { key: 'eventorbatch_processing', value: 'Bearbetar...', category: 'eventorbatch' },
      { key: 'eventorbatch_process_file', value: 'Bearbeta fil', category: 'eventorbatch' },
      { key: 'eventorbatch_cancel', value: 'Avbryt', category: 'eventorbatch' },
      { key: 'eventorbatch_clear', value: 'Rensa', category: 'eventorbatch' },
      { key: 'back_to_home', value: 'Tillbaka till startsidan', category: 'general' }
    ];

    // Only insert texts that don't already exist
    const textsToInsert = requiredTexts.filter(text => !existingKeysMap.has(text.key));
    
    console.log(`Found ${existingTexts.length} existing app texts, need to insert ${textsToInsert.length} missing texts`);
    
    // Use a batch insert if there are texts to insert
    if (textsToInsert.length > 0) {
      const { error } = await supabase
        .from('app_texts')
        .insert(textsToInsert);
        
      if (error) {
        console.error("Error inserting missing app texts:", error);
        // Fall back to inserting one by one
        for (const text of textsToInsert) {
          try {
            await this.createOrUpdateAppTextByKey(text.key, text.value, text.category);
          } catch (err) {
            console.error(`Failed to insert app text ${text.key}:`, err);
          }
        }
      } else {
        console.log(`Successfully inserted ${textsToInsert.length} missing app texts`);
        // Invalidate cache after insert
        this._cachedTexts = null;
      }
    }
  }
};
