
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserPayload {
  userId?: string;
  userEmail?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("----------------------");
  console.log("Delete user function called");
  console.log("Request method:", req.method);
  console.log("Request headers:", JSON.stringify(Object.fromEntries([...req.headers])));

  try {
    // Log request body
    const requestBody = await req.json();
    console.log("Request body:", JSON.stringify(requestBody));

    const { userId, userEmail } = requestBody as DeleteUserPayload;
    
    if (!userId && !userEmail) {
      console.error("Missing user identification: Need either userId or userEmail");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing user identification. Either userId or userEmail must be provided",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get admin API keys from env variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing environment variables");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Server configuration error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Supabase URL available:", !!supabaseUrl);
    console.log("Service role key available:", !!supabaseServiceRoleKey);

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get caller's role to ensure they're a superuser
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Authorization header found");
    const token = authHeader.replace("Bearer ", "");

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, message: "Authentication failed" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("User authenticated:", user.id);

    // Get caller's role from public.users
    console.log("Fetching caller's role...");
    const { data: callerData, error: callerError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    console.log("Caller data:", callerData);

    if (callerError || !callerData || callerData.role !== "superuser") {
      console.error("Role check error:", callerError);
      console.error("Caller is not a superuser:", callerData?.role);
      return new Response(
        JSON.stringify({ success: false, message: "Only superusers can delete users" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("User has superuser role");

    // Find the user if only email was provided
    let userIdToDelete = userId;
    
    if (!userIdToDelete && userEmail) {
      console.log("Finding user by email:", userEmail);
      
      // First check public.users
      const { data: userData, error: userError } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", userEmail)
        .maybeSingle();
      
      if (userError && userError.code !== 'PGRST116') {
        console.error("Error finding user by email in public.users:", userError);
      } else if (userData) {
        console.log("User found in public.users:", userData);
        userIdToDelete = userData.id;
      } else {
        console.log("User not found in public.users, checking auth.users");
        
        // Then check auth.users
        const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (authUsersError) {
          console.error("Error listing auth users:", authUsersError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: "Failed to find user by email",
              details: authUsersError
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        const matchingUser = authUsers.users.find(u => u.email === userEmail);
        if (matchingUser) {
          console.log("User found in auth.users:", matchingUser.id);
          userIdToDelete = matchingUser.id;
        } else {
          console.error("User not found in auth.users");
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `User with email ${userEmail} not found` 
            }),
            {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    }
    
    if (!userIdToDelete) {
      console.error("Failed to determine user ID to delete");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Failed to determine which user to delete" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Deleting user with ID:", userIdToDelete);

    // First delete from public.users if the record exists
    console.log("Deleting from public.users...");
    const { error: deleteUserError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", userIdToDelete);
      
    if (deleteUserError && deleteUserError.code !== 'PGRST116') {
      console.error("Error deleting from public.users:", deleteUserError);
      // Continue with auth user deletion even if public.users deletion failed
    } else {
      console.log("User deleted from public.users successfully");
    }
    
    // Then delete the user from auth.users
    console.log("Deleting from auth.users...");
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
      userIdToDelete
    );

    if (authDeleteError) {
      console.error("Error deleting from auth.users:", authDeleteError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Failed to delete auth user",
          details: authDeleteError
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("User deleted from auth.users successfully");
    console.log("User deletion completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "User deleted successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "An unexpected error occurred",
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
