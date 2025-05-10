
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  apiKey: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("Edge Function: validate-eventor-api-key - request received");
    
    // Parse the request body
    let apiKey: string | undefined;
    try {
      const body = await req.json() as RequestBody;
      apiKey = body.apiKey;
      console.log("Request body successfully parsed");
    } catch (error) {
      console.error("Error parsing request body:", error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', details: error.message }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      );
    }

    if (!apiKey) {
      console.error("Missing API key in request");
      return new Response(
        JSON.stringify({ error: 'API key is required' }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      );
    }

    console.log("Making request to Eventor API");
    
    // Make the request to Eventor API
    const response = await fetch('https://eventor.orientering.se/api/organisation/apiKey', {
      method: 'GET',
      headers: {
        'ApiKey': apiKey,
        'Accept': 'application/xml'
      }
    });

    // Get the response text
    const responseText = await response.text();
    
    console.log(`Eventor API response status: ${response.status}`);
    
    if (response.status !== 200) {
      console.error(`Error from Eventor API - Status: ${response.status}, Response: ${responseText}`);
    }

    // Return the response with the same status code and body
    return new Response(
      JSON.stringify({ 
        status: response.status,
        statusText: response.statusText,
        body: responseText,
        headers: Object.fromEntries(response.headers.entries())
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  } catch (error) {
    // Handle any errors
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred', stack: error.stack }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  }
})
