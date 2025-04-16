
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppText } from '@/types/appText';

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
        const { data, error } = await supabase
          .from('app_texts')
          .select('value')
          .eq('key', key)
          .single();

        if (error) {
          console.error(`Error fetching app text for key ${key}:`, error);
          setError(error.message);
          setText(defaultValue);
        } else if (data) {
          setText(data.value);
        } else {
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
      return text.replace('USER', userData.name);
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
        const { data, error } = await supabase
          .from('app_texts')
          .select('key, value');

        if (error) {
          console.error('Error fetching app texts:', error);
          setError(error.message);
        } else if (data) {
          const textMap: Record<string, string> = {};
          data.forEach((item: AppText) => {
            textMap[item.key] = item.value;
          });
          setTexts(textMap);
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

  // Function to replace USER with actual user name
  const processText = (key: string, userData?: { name?: string | null }) => {
    const text = texts[key] || '';
    if (userData && userData.name && text.includes('USER')) {
      return text.replace('USER', userData.name);
    }
    return text;
  };

  return { texts, isLoading, error, processText };
}
