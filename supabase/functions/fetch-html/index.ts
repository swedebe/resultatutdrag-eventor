
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { url, headers = {} } = await req.json();
    
    console.log(`[SERVER] Fetching HTML from: ${url}`);
    console.log(`[SERVER] Using headers:`, headers);
    
    // Add default headers if not provided
    const fetchHeaders = {
      "User-Agent": headers["User-Agent"] || "Mozilla/5.0",
      "Accept": headers["Accept"] || "text/html",
      ...headers
    };
    
    // Make the request from the server
    const response = await fetch(url, {
      method: "GET",
      headers: fetchHeaders
    });
    
    console.log(`[SERVER] Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      const truncatedError = errorText.substring(0, 300);
      console.error(`[SERVER] Error response: ${truncatedError}...`);
      
      return new Response(
        JSON.stringify({
          error: `Failed to fetch HTML: ${response.status} ${response.statusText}`,
          statusCode: response.status,
          errorText: truncatedError
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const html = await response.text();
    console.log(`[SERVER] Successfully fetched HTML (${html.length} bytes)`);
    
    return new Response(
      JSON.stringify({
        html,
        statusCode: response.status,
        statusText: response.statusText,
        success: true
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error(`[SERVER] Error in fetch-html function:`, error);
    
    return new Response(
      JSON.stringify({
        error: error.message || String(error),
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
