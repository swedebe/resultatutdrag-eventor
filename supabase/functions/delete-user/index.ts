
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.24.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase URL or service role key");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    
    // Verify the caller is authenticated and is a superuser
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }
    
    // Check if the user is a superuser
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData || userData.role !== 'superuser') {
      throw new Error('Only superusers can delete users');
    }
    
    // Parse the request body to get the user ID to delete
    const { userId } = await req.json();
    
    if (!userId) {
      throw new Error('Missing userId in request body');
    }
    
    console.log(`Attempting to delete user with ID: ${userId}`);
    
    // First, delete the user from public.users
    const { error: deletePublicUserError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (deletePublicUserError) {
      throw new Error(`Failed to delete from public.users: ${deletePublicUserError.message}`);
    }
    
    // Then, delete the user from auth.users using admin API
    const { error: deleteAuthUserError } = await supabase.auth.admin.deleteUser(
      userId
    );
    
    if (deleteAuthUserError) {
      throw new Error(`Failed to delete from auth.users: ${deleteAuthUserError.message}`);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User deleted successfully'
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in delete-user function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 400
      }
    );
  }
});
