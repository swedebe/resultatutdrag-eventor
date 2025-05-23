
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { url, headers = {} } = await req.json();
    
    // Enhanced URL logging - show more of the URL for debugging
    const urlDisplay = url.length > 100 ? 
      `${url.substring(0, 100)}...` : 
      url;
    
    console.log(`[SERVER] Fetching HTML from: ${urlDisplay}`);
    console.log(`[SERVER] Using headers:`, headers);
    
    // Add enhanced headers to better emulate a real browser
    const fetchHeaders = {
      "User-Agent": headers["User-Agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
      "Accept": headers["Accept"] || "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "en-US,en;q=0.9,sv;q=0.8", 
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "max-age=0",
      "Sec-Ch-Ua": '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "Priority": "u=0, i",
      "Connection": "keep-alive",
      ...headers
    };
    
    console.log(`[SERVER] Full request headers for fetch:`, JSON.stringify(fetchHeaders, null, 2));
    
    // Using AbortController to set a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      // Make the request with detailed error handling
      const response = await fetch(url, {
        method: "GET",
        headers: fetchHeaders,
        signal: controller.signal,
        redirect: "follow"
      });
      
      clearTimeout(timeoutId);
      
      console.log(`[SERVER] Response status: ${response.status}`);
      console.log(`[SERVER] Response status text: ${response.statusText}`);
      console.log(`[SERVER] Response headers:`, Object.fromEntries([...response.headers]));
      
      if (!response.ok) {
        const errorText = await response.text();
        const truncatedError = errorText.substring(0, 500);
        console.error(`[SERVER] Error response (${response.status}): ${truncatedError}...`);
        
        return new Response(
          JSON.stringify({
            error: `Failed to fetch HTML: ${response.status} ${response.statusText}`,
            statusCode: response.status,
            statusText: response.statusText,
            errorText: truncatedError,
            requestHeaders: Object.fromEntries(Object.entries(fetchHeaders).map(([k, v]) => 
              [k, typeof v === 'string' ? v : JSON.stringify(v)])),
            url: urlDisplay  // Use the enhanced URL display
          }),
          {
            status: response.status,
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
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      console.error(`[SERVER] Fetch error:`, fetchError);
      let errorMessage = fetchError.message || String(fetchError);
      let errorStack = fetchError.stack || 'No stack available';
      
      // Special handling for AbortError (timeout)
      if (fetchError.name === 'AbortError') {
        errorMessage = `Request timed out after 15 seconds: ${errorMessage}`;
      }
      
      return new Response(
        JSON.stringify({
          error: errorMessage,
          stack: errorStack,
          requestHeaders: Object.fromEntries(Object.entries(fetchHeaders).map(([k, v]) => 
            [k, typeof v === 'string' ? v : JSON.stringify(v)])),
          url: urlDisplay,  // Use the enhanced URL display
          success: false
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
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
