
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppText } from '@/types/appText';
import { AppTextService } from '@/services/appText/appTextService';

/**
 * Hook to fetch and use app texts from the database
 * @param key The key of the text to fetch
 * @param defaultValue Default value to use if the text is not found
 * @returns The text value and loading state
 */
export function useAppText(key: string, defaultValue: string = '') {
  const [text, setText] = useState<string>(defaultValue);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchText = async () => {
      try {
        console.log(`Fetching app text for key: ${key}`);
        // Try using cached data first via the service
        const allTexts = await AppTextService.getAllAppTexts();
        const foundText = allTexts.find(t => t.key === key);
        
        if (foundText) {
          console.log(`Found app text for key ${key} via service:`, foundText.value);
          setText(foundText.value);
        } else {
          // Fallback to direct query if not in cache
          const { data, error } = await supabase
            .from('app_texts')
            .select('value')
            .eq('key', key)
            .maybeSingle();

          if (error) {
            console.error(`Error fetching app text for key ${key}:`, error);
            setError(error.message);
            setText(defaultValue);
          } else if (data) {
            console.log(`Found app text for key ${key}:`, data.value);
            setText(data.value);
          } else {
            console.log(`No app text found for key ${key}, using default: ${defaultValue}`);
            setText(defaultValue);
          }
        }
      } catch (e: any) {
        console.error(`Exception fetching app text for key ${key}:`, e);
        setError(e.message);
        setText(defaultValue);
      } finally {
        setIsLoading(false);
      }
    };

    fetchText();
  }, [key, defaultValue]);

  // Function to replace placeholders like {0}, {1} etc. with actual values
  const processText = (text: string, userData?: { name?: string | null }) => {
    if (!text) return '';
    
    // Replace {0} with user name if available
    if (userData && userData.name && text.includes('{0}')) {
      return text.replace(/\{0\}/g, userData.name);
    }
    
    // Legacy support for USER placeholder
    if (userData && userData.name && text.includes('USER')) {
      return text.replace(/USER/g, userData.name);
    }
    
    return text;
  };

  return { text, isLoading, error, processText };
}

/**
 * Hook to fetch all app texts at once
 * @returns Object with keys mapped to text values, loading state, and error
 */
export function useAllAppTexts() {
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);

  useEffect(() => {
    // Only run this once during app initialization
    if (!initialized) {
      const initAppTexts = async () => {
        try {
          // Ensure all required texts exist in the database (but don't overwrite existing ones)
          await AppTextService.ensureRequiredAppTextsExist();
          setInitialized(true);
        } catch (e) {
          console.error("Error initializing app texts:", e);
        }
      };
      
      initAppTexts();
    }
  }, [initialized]);

  useEffect(() => {
    const fetchAllTexts = async () => {
      try {
        console.log('Fetching all app texts');
        
        // Use the service which supports caching
        const allTexts = await AppTextService.getAllAppTexts();
        
        if (allTexts.length > 0) {
          console.log(`Loaded ${allTexts.length} texts from service`);
          const textMap: Record<string, string> = {};
          allTexts.forEach((item: AppText) => {
            textMap[item.key] = item.value;
          });
          setTexts(textMap);
          setError(null);
        } else {
          console.warn('No app texts found');
        }
      } catch (e: any) {
        console.error('Exception fetching app texts:', e);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTexts();
  }, []);

  // Function to replace placeholders like {0}, {1} etc. with actual values
  const processText = (key: string, userData?: { name?: string | null }) => {
    const text = texts[key] || '';
    if (!text) return '';
    
    // Replace {0} with user name if available
    if (userData && userData.name && text.includes('{0}')) {
      return text.replace(/\{0\}/g, userData.name);
    }
    
    // Legacy support for USER placeholder
    if (userData && userData.name && text.includes('USER')) {
      return text.replace(/USER/g, userData.name);
    }
    
    return text;
  };

  return { texts, isLoading, error, processText };
}
