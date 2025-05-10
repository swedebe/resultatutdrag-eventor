
// Handle Eventor API calls with dynamic endpoints
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import axios from 'https://deno.land/x/axiod/mod.ts'

interface RequestBody {
  apiKey: string;
  endpoint: string;
}

const EVENTOR_API_BASE_URL = 'https://eventor.orientering.se/api';
const RENDER_PROXY_URL = 'https://eventor-proxy.onrender.com/eventor-api';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("Edge Function: eventor-api - request received");
    
    // Parse the request body
    let apiKey: string | undefined;
    let endpoint: string | undefined;
    
    try {
      const body = await req.json() as RequestBody;
      apiKey = body.apiKey;
      endpoint = body.endpoint;
      
      console.log(`Request body successfully parsed. Endpoint: ${endpoint}`);
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
    
    if (!endpoint) {
      console.error("Missing endpoint in request");
      return new Response(
        JSON.stringify({ error: 'API endpoint is required' }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      );
    }

    // Ensure endpoint starts with a slash
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }

    // Log the final forwarding details
    console.log(`Forwarding request to Render proxy: ${RENDER_PROXY_URL}`);
    console.log(`Request body to be forwarded:`, { apiKey: "***REDACTED***", endpoint });
    console.log(`Target Eventor API endpoint: ${EVENTOR_API_BASE_URL}${endpoint}`);
    
    // Forward the request to the Render proxy
    try {
      console.log("Initiating request to Render proxy");
      
      const response = await fetch(RENDER_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          endpoint
        })
      });
      
      console.log(`Response status from Render proxy: ${response.status} ${response.statusText}`);
      
      // Get the response data
      const responseData = await response.json();
      
      console.log(`Response received from Render proxy, forwarding to client`);
      
      // Forward the proxy response to the client
      return new Response(
        JSON.stringify(responseData),
        { 
          status: response.status, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      );
    } catch (proxyError) {
      console.error("Error forwarding request to Render proxy:", proxyError);
      
      return new Response(
        JSON.stringify({ 
          error: 'Error forwarding request to Render proxy',
          details: proxyError.message || 'Unknown error occurred'
        }),
        { 
          status: 500, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      );
    }
  } catch (error) {
    // Handle any errors and log detailed error information
    console.error("Edge function error:", error);
    console.error("Error stack:", error.stack);
    
    if (error instanceof Error) {
      console.error(`Error type: ${error.constructor.name}`);
      console.error(`Error message: ${error.message}`);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        stack: error.stack,
        type: error instanceof Error ? error.constructor.name : typeof error
      }),
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
