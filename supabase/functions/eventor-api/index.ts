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
    console.log("Request URL:", req.url);
    console.log("Request method:", req.method);
    
    // Check if this is a request to the /results/event endpoint
    const url = new URL(req.url);
    const path = url.pathname;
    
    console.log("Request path:", path);
    
    if (path.endsWith('/results/event') && req.method === 'POST') {
      console.log("Handling /results/event POST endpoint");
      
      // Extract request body
      let body;
      try {
        body = await req.json() as RequestBody;
        console.log("Received POST request body:", JSON.stringify({
          apiKey: body.apiKey ? "REDACTED" : undefined,
          eventId: body.eventId,
          includeSplitTimes: body.includeSplitTimes
        }));
      } catch (error) {
        console.error("Failed to parse request body:", error);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON in request body' }),
          { 
            status: 400, 
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json'
            } 
          }
        );
      }
      
      const { apiKey, eventId, includeSplitTimes = false } = body;
      
      if (!apiKey) {
        console.error("Missing API key in request body");
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
        console.error("Missing event ID in request body");
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
      
      // IMPORTANT: First try to fetch the entries data (more useful for participant counts)
      const entriesUrl = `${EVENTOR_API_BASE_URL}/events/${eventId}/entries`;
      console.log(`Forwarding request to Eventor API entries endpoint: ${entriesUrl}`);
      
      try {
        // Make the request to the Eventor API entries endpoint
        const response = await axios({
          method: 'GET',
          url: entriesUrl,
          headers: {
            'Content-Type': 'application/json',
            'ApiKey': apiKey
          }
        });
        
        console.log(`Response status from Eventor API entries: ${response.status}`);
        
        // If successful, return the entries response
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
      } catch (entriesError: any) {
        // If entries endpoint fails, try the results endpoint
        console.log("Failed to fetch entries, trying results endpoint instead:", entriesError.message);
        
        // Fallback to the results endpoint
        const resultsUrl = `${EVENTOR_API_BASE_URL}/results/event`;
        console.log(`Forwarding request to Eventor API results endpoint: ${resultsUrl}`);
        
        try {
          // Make the request to the Eventor API results endpoint
          const resultsResponse = await axios({
            method: 'GET',
            url: resultsUrl,
            params: {
              eventId,
              includeSplitTimes
            },
            headers: {
              'Content-Type': 'application/json',
              'ApiKey': apiKey
            }
          });
          
          console.log(`Response status from Eventor API results: ${resultsResponse.status}`);
          
          // Return the results response
          return new Response(
            JSON.stringify(resultsResponse.data),
            { 
              status: resultsResponse.status, 
              headers: { 
                ...corsHeaders,
                'Content-Type': 'application/json'
              } 
            }
          );
        } catch (resultsError: any) {
          // If both endpoints fail, throw a consolidated error
          console.error("Both entries and results endpoints failed:", resultsError);
          
          return new Response(
            JSON.stringify({ 
              error: 'Failed to fetch data from Eventor API',
              entriesError: entriesError.message,
              resultsError: resultsError.message
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
      }
    } else if (path.endsWith('/results/event') && req.method === 'GET') {
      // Handle the legacy GET request for backward compatibility
      console.log("WARNING: Received GET request to /results/event but POST is required");
      console.log("Handling legacy /results/event GET endpoint");
      
      // Extract query parameters from the URL
      const eventId = url.searchParams.get('eventId');
      const includeSplitTimes = url.searchParams.get('includeSplitTimes') === 'true';
      
      console.log("Received GET request with params:", { 
        eventId, 
        includeSplitTimes 
      });
      
      // This is a legacy approach - we don't have the API key in the headers
      console.log("WARNING: Using GET request without API key is not supported anymore");
      
      return new Response(
        JSON.stringify({ 
          error: 'API key is required. Please use POST method with apiKey in the request body',
          method: 'GET',
          path: path,
          receivedParams: { eventId, includeSplitTimes }
        }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      );
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
