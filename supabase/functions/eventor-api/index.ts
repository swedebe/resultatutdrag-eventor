
// Handle Eventor API calls with dynamic endpoints
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import axios from 'https://deno.land/x/axiod/mod.ts'

interface RequestBody {
  apiKey: string;
  endpoint?: string;
  eventId?: string | number;
  includeSplitTimes?: boolean;
}

const EVENTOR_API_BASE_URL = 'https://eventor.orientering.se/api';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("Edge Function: eventor-api - request received");
    
    // Check if this is a request to the /results/event endpoint
    const url = new URL(req.url);
    const path = url.pathname;
    
    if (path.endsWith('/results/event') && req.method === 'POST') {
      console.log("Handling /results/event endpoint");
      
      // Extract request body
      const body = await req.json() as RequestBody;
      const { apiKey, eventId, includeSplitTimes = false } = body;
      
      if (!apiKey) {
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
      
      if (!eventId) {
        return new Response(
          JSON.stringify({ error: 'Event ID is required' }),
          { 
            status: 400, 
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json'
            } 
          }
        );
      }
      
      console.log(`Processing event entries request for event ID: ${eventId}`);
      
      // Construct the Eventor API URL for entries
      const entriesUrl = `${EVENTOR_API_BASE_URL}/events/${eventId}/entries`;
      console.log(`Forwarding request to Eventor API: ${entriesUrl}`);
      
      try {
        // Make the request to the Eventor API
        const response = await axios({
          method: 'GET',
          url: entriesUrl,
          headers: {
            'Content-Type': 'application/json',
            'ApiKey': apiKey
          }
        });
        
        console.log(`Response status from Eventor API: ${response.status}`);
        
        // Forward the response to the client
        return new Response(
          JSON.stringify(response.data),
          { 
            status: response.status, 
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json'
            } 
          }
        );
      } catch (apiError: any) {
        console.error("Error forwarding request to Eventor API:", apiError);
        
        return new Response(
          JSON.stringify({ 
            error: 'Error forwarding request to Eventor API',
            details: apiError.message || 'Unknown error occurred',
            status: apiError.response?.status
          }),
          { 
            status: apiError.response?.status || 500, 
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json'
            } 
          }
        );
      }
    }
    
    // Original logic for the dynamic endpoints
    let apiKey: string | undefined;
    let endpoint: string | undefined;
    
    // Handle both GET and POST requests
    if (req.method === 'POST') {
      // Parse the request body for POST requests
      try {
        const body = await req.json() as RequestBody;
        apiKey = body.apiKey;
        endpoint = body.endpoint;
        
        console.log(`POST request - endpoint: ${endpoint}`);
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
    } else if (req.method === 'GET') {
      // For GET requests, extract parameters from the URL
      
      // The API key must be in the headers for GET requests
      apiKey = req.headers.get('x-eventor-api-key') || undefined;
      
      // The endpoint is everything after /eventor-api in the path
      const apiPrefix = '/eventor-api';
      
      if (path.startsWith(apiPrefix)) {
        endpoint = path.substring(apiPrefix.length);
        
        // Include query parameters if they exist
        if (url.search) {
          endpoint += url.search;
        }
      }
      
      console.log(`GET request - extracted endpoint: ${endpoint}`);
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

    // Construct the full Eventor API URL
    const fullUrl = `${EVENTOR_API_BASE_URL}${endpoint}`;
    console.log(`Forwarding request to Eventor API: ${fullUrl}`);
    
    try {
      // Make the request to the Eventor API
      const response = await axios({
        method: req.method,
        url: fullUrl,
        headers: {
          'Content-Type': 'application/json',
          'ApiKey': apiKey
        }
      });
      
      console.log(`Response status from Eventor API: ${response.status}`);
      
      // Forward the response to the client
      return new Response(
        JSON.stringify(response.data),
        { 
          status: response.status, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      );
    } catch (apiError: any) {
      console.error("Error forwarding request to Eventor API:", apiError);
      
      return new Response(
        JSON.stringify({ 
          error: 'Error forwarding request to Eventor API',
          details: apiError.message || 'Unknown error occurred',
          status: apiError.response?.status
        }),
        { 
          status: apiError.response?.status || 500, 
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
