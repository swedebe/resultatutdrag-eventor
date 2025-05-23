
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
    
    // Add enhanced headers for better browser emulation
    const fetchHeaders = {
      "User-Agent": headers["User-Agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
      "Accept": headers["Accept"] || "text/html,application/xhtml+xml,application/xml;q=0.9",
      "Accept-Language": "en-US,en;q=0.9,sv;q=0.8", 
      "Cache-Control": "no-cache",
      ...headers
    };
    
    // Make the request from the server
    const response = await fetch(url, {
      method: "GET",
      headers: fetchHeaders
    });
    
    console.log(`[SERVER] Response status: ${response.status}`);
    console.log(`[SERVER] Response headers:`, Object.fromEntries([...response.headers]));
    
    if (!response.ok) {
      const errorText = await response.text();
      const truncatedError = errorText.substring(0, 300);
      console.error(`[SERVER] Error response: ${truncatedError}...`);
      
      return new Response(
        JSON.stringify({
          error: `Failed to fetch HTML: ${response.status} ${response.statusText}`,
          statusCode: response.status,
          statusText: response.statusText,
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
    console.log(`[SERVER] HTML preview: ${html.substring(0, 200)}...`);
    
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
        stack: error.stack || 'No stack available',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
