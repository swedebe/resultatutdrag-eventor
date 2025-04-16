
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AdminCreateUserPayload {
  email: string;
  password: string;
  name: string;
  club_name?: string;
  role?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("----------------------");
  console.log("Create user function called");
  console.log("Request method:", req.method);
  console.log("Request headers:", JSON.stringify(Object.fromEntries([...req.headers])));

  try {
    // Log request body
    const requestBody = await req.json();
    console.log("Request body:", JSON.stringify({
      ...requestBody,
      password: requestBody.password ? "[REDACTED]" : undefined
    }));

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
    console.log("Verifying token...");

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, message: "Authentication failed", details: authError }),
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
    if (callerError) {
      console.error("Role check error:", callerError);
    }

    if (callerError || !callerData || callerData.role !== "superuser") {
      console.error("Role check error:", callerError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Only superusers can create users",
          details: { callerError, callerData }
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("User has superuser role");

    // Parse request body
    const { email, password, name, club_name = "Din klubb", role = "regular" } = requestBody as AdminCreateUserPayload;

    if (!email || !password || !name) {
      console.error("Missing required fields:", { 
        hasEmail: !!email, 
        hasPassword: !!password, 
        hasName: !!name 
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Missing required fields: email, password, and name must be provided" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // First check if user with this email already exists in public.users
    console.log("Checking if user with email exists in public.users:", email);
    const { data: existingPublicUsers, error: existingPublicError } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("email", email);

    if (existingPublicError) {
      console.error("Error checking existing users in public.users:", existingPublicError);
      return new Response(
        JSON.stringify({
          success: false, 
          message: "Error checking existing users", 
          details: existingPublicError
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Handle the case where the email exists in public.users
    if (existingPublicUsers && existingPublicUsers.length > 0) {
      console.log("Email already exists in public.users, attempting to clean up...");
      
      for (const existingUser of existingPublicUsers) {
        console.log(`Deleting user with id ${existingUser.id} from public.users`);
        const { error: deleteError } = await supabaseAdmin
          .from("users")
          .delete()
          .eq("id", existingUser.id);
          
        if (deleteError) {
          console.error(`Failed to delete existing user ${existingUser.id} from public.users:`, deleteError);
          return new Response(
            JSON.stringify({
              success: false,
              message: "Failed to clean up existing user in public.users",
              details: deleteError
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        console.log(`Successfully deleted user ${existingUser.id} from public.users`);
      }
    }

    // Check if user exists in auth.users
    console.log("Checking if user with email exists in auth.users:", email);
    const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authUsersError) {
      console.error("Error listing auth users:", authUsersError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Failed to check existing users in auth",
          details: authUsersError
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const existingAuthUser = authUsers.users.find(u => u.email === email);

    // If user exists in auth.users, delete it to ensure clean state
    if (existingAuthUser) {
      console.log(`User already exists in auth.users with ID ${existingAuthUser.id}, attempting to delete...`);
      
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
        existingAuthUser.id
      );
        
      if (deleteAuthError) {
        console.error("Failed to delete existing user from auth.users:", deleteAuthError);
        return new Response(
          JSON.stringify({
            success: false,
            message: "Failed to clean up existing user in auth.users",
            details: deleteAuthError
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      console.log("Successfully deleted existing user from auth.users");
    }

    // Now attempt to create the new user with a clean slate
    console.log("Creating new user with email:", email);

    // Create user with the Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        club_name,
      },
    });

    if (createError || !newUser?.user) {
      console.error("Create user error:", createError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: createError?.message || "Failed to create user",
          details: createError
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("User created successfully in auth.users with ID:", newUser.user.id);

    try {
      // Double check that email doesn't already exist in public.users 
      // (in case another process created it between our delete and insert)
      const { data: finalCheck, error: finalCheckError } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", email);
        
      if (finalCheckError) {
        console.error("Error during final email check:", finalCheckError);
      } else if (finalCheck && finalCheck.length > 0) {
        console.log("Email still exists in public.users even after cleanup, attempting final delete");
        
        const { error: finalDeleteError } = await supabaseAdmin
          .from("users")
          .delete()
          .eq("email", email);
          
        if (finalDeleteError) {
          console.error("Failed final cleanup attempt:", finalDeleteError);
          // We'll still try to insert, might work if the constraint is on a different field
        } else {
          console.log("Successfully performed final cleanup");
        }
      }
    
      // Now insert into public.users with the new user ID
      console.log("Inserting user into public.users table");
      const { data: publicUser, error: publicError } = await supabaseAdmin
        .from("users")
        .insert({
          id: newUser.user.id,
          email,
          name,
          club_name: club_name || "Din klubb",
          role,
        })
        .select()
        .single();
  
      if (publicError) {
        console.error("Public users insert error:", publicError);
        
        // Roll back by deleting the auth user if adding to public.users failed
        console.log("ROLLBACK: Attempting to delete auth user due to public.users insert failure");
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        
        if (deleteError) {
          console.error("CRITICAL ERROR: Failed to delete auth user during rollback:", deleteError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: "Failed to complete user creation and rollback failed",
              details: {
                publicError,
                rollbackError: deleteError
              }
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        console.log("Rollback successful: Auth user deleted after public.users insert failure");
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Failed to complete user creation (rolled back auth user creation)",
            details: publicError
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
  
      console.log("User successfully added to public.users table");
      console.log("Complete user record:", publicUser);
  
      return new Response(
        JSON.stringify({
          success: true,
          user_id: newUser.user.id,
          message: "User created successfully",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (insertError) {
      // Handle any unexpected errors during public.users insertion
      console.error("Unexpected error during public.users insertion:", insertError);
      
      // Roll back by deleting the auth user
      console.log("ROLLBACK: Attempting to delete auth user due to exception");
      try {
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        console.log("Rollback successful: Auth user deleted after exception");
      } catch (rollbackError) {
        console.error("CRITICAL ERROR: Rollback failed:", rollbackError);
      }
      
      throw insertError; // Re-throw to be caught by the outer try-catch
    }
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
