
import { supabase } from '@/integrations/supabase/client';

/**
 * Creates or updates a user's processing state
 */
export const setUserCancellationFlag = async (isCancelled: boolean): Promise<boolean> => {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      console.error("No authenticated user found");
      return false;
    }
    
    const userId = user.data.user.id;
    
    // First check if the user already has a record
    const { data: existingState } = await supabase
      .from('user_processing_state')
      .select('id')
      .eq('user_id', userId)
      .single();
      
    if (existingState) {
      // Update existing record
      const { error } = await supabase
        .from('user_processing_state')
        .update({
          cancellation_flag: isCancelled,
          cancellation_set_at: isCancelled ? new Date().toISOString() : null,
          cancellation_cleared_at: !isCancelled ? new Date().toISOString() : null,
        })
        .eq('user_id', userId);
        
      if (error) {
        console.error('Error updating cancellation flag:', error);
        return false;
      }
    } else {
      // Create new record
      const { error } = await supabase
        .from('user_processing_state')
        .insert({
          user_id: userId,
          cancellation_flag: isCancelled,
          cancellation_set_at: isCancelled ? new Date().toISOString() : null,
          cancellation_cleared_at: !isCancelled ? new Date().toISOString() : null,
        });
        
      if (error) {
        console.error('Error creating cancellation flag:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in setUserCancellationFlag:', error);
    return false;
  }
};

/**
 * Gets the current cancellation flag for the user
 */
export const getUserCancellationFlag = async (): Promise<boolean> => {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      console.error("No authenticated user found");
      return false;
    }
    
    const userId = user.data.user.id;
    
    const { data, error } = await supabase
      .from('user_processing_state')
      .select('cancellation_flag')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // No record found, which means no cancellation
        return false;
      }
      console.error('Error fetching cancellation flag:', error);
      return false;
    }
    
    return data?.cancellation_flag || false;
  } catch (error) {
    console.error('Error in getUserCancellationFlag:', error);
    return false;
  }
};
