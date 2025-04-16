
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
        // Try with direct query first
        const { data, error } = await supabase
          .from('app_texts')
          .select('value')
          .eq('key', key)
          .single();

        if (error) {
          console.error(`Error fetching app text for key ${key}:`, error);
          
          // Try with service as fallback
          try {
            const allTexts = await AppTextService.getAllAppTexts();
            const foundText = allTexts.find(t => t.key === key);
            if (foundText) {
              console.log(`Found app text for key ${key} via service:`, foundText.value);
              setText(foundText.value);
              return;
            }
          } catch (serviceError) {
            console.error(`Service fallback failed for app text key ${key}:`, serviceError);
          }
          
          setError(error.message);
          setText(defaultValue);
        } else if (data) {
          console.log(`Found app text for key ${key}:`, data.value);
          setText(data.value);
        } else {
          console.log(`No app text found for key ${key}, using default: ${defaultValue}`);
          setText(defaultValue);
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

  // Function to replace USER with actual user name
  const processText = (text: string, userData?: { name?: string | null }) => {
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

  useEffect(() => {
    const fetchAllTexts = async () => {
      try {
        console.log('Fetching all app texts');
        
        // Try direct Supabase query first
        const { data, error } = await supabase
          .from('app_texts')
          .select('key, value');

        if (error) {
          console.error('Error fetching app texts via direct query:', error);
          throw error;
        }
        
        if (data && data.length > 0) {
          console.log('App texts fetched successfully via direct query:', data.length, 'texts');
          const textMap: Record<string, string> = {};
          data.forEach((item: AppText) => {
            textMap[item.key] = item.value;
          });
          setTexts(textMap);
        } else {
          // Fallback to service
          console.log('No app texts from direct query, trying service');
          const serviceData = await AppTextService.getAllAppTexts();
          console.log('App texts fetched via service:', serviceData.length, 'texts');
          
          const textMap: Record<string, string> = {};
          serviceData.forEach((item: AppText) => {
            textMap[item.key] = item.value;
          });
          setTexts(textMap);
        }
      } catch (e: any) {
        console.error('Exception fetching app texts:', e);
        setError(e.message);
        
        // As a final fallback, try with AppTextService
        try {
          const serviceData = await AppTextService.getAllAppTexts();
          if (serviceData && serviceData.length > 0) {
            const textMap: Record<string, string> = {};
            serviceData.forEach((item: AppText) => {
              textMap[item.key] = item.value;
            });
            setTexts(textMap);
            setError(null); // Clear error if service succeeds
          }
        } catch (serviceError: any) {
          console.error('All methods failed to fetch app texts:', serviceError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTexts();
  }, []);

  // Function to replace USER with actual user name
  const processText = (key: string, userData?: { name?: string | null }) => {
    const text = texts[key] || '';
    if (userData && userData.name && text.includes('USER')) {
      return text.replace(/USER/g, userData.name);
    }
    return text;
  };

  return { texts, isLoading, error, processText };
}
