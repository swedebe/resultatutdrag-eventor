
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
// Import Axios from Deno-compatible CDN
import axios from 'https://deno.land/x/axiod/mod.ts'

interface RequestBody {
  apiKey: string;
}

const EVENTOR_API_URL = 'https://eventor.orientering.se/api/organisation/apiKey';

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

    // Log the request details
    // Updated to match MeOS application - added User-Agent: MeOS
    const requestHeaders = {
      'ApiKey': apiKey,
      'User-Agent': 'MeOS'
    };
    
    console.log(`Making request to Eventor API at URL: ${EVENTOR_API_URL}`);
    console.log(`Request headers: ${JSON.stringify(requestHeaders, null, 2)}`);
    
    console.log("Using Axios for HTTP request");
    
    // Make the request with Axios
    try {
      console.log("Initiating Axios request");
      
      const axiosResponse = await axios.get(EVENTOR_API_URL, {
        headers: requestHeaders,
        validateStatus: () => true // Accept all status codes to handle them manually
      });
      
      console.log(`Axios response status: ${axiosResponse.status}`);
      console.log(`Axios response headers: ${JSON.stringify(axiosResponse.headers, null, 2)}`);
      
      // Get the response data
      const responseText = typeof axiosResponse.data === 'string' 
        ? axiosResponse.data 
        : JSON.stringify(axiosResponse.data);
      
      if (axiosResponse.status !== 200) {
        console.error(`Error from Eventor API - Status: ${axiosResponse.status}`);
        // Log the first 500 characters of the response for debugging but avoid flooding logs
        const truncatedResponse = responseText.length > 500 
          ? responseText.substring(0, 500) + "... (truncated)"
          : responseText;
        console.error(`Truncated response: ${truncatedResponse}`);
      } else {
        console.log("Eventor API request successful");
        // Log a small sample of the response for debugging successful cases
        const sampleResponse = responseText.length > 200 
          ? responseText.substring(0, 200) + "... (truncated)"
          : responseText;
        console.log(`Sample response: ${sampleResponse}`);
      }

      // Return the response with the same status code and body
      return new Response(
        JSON.stringify({ 
          status: axiosResponse.status,
          statusText: axiosResponse.statusText,
          body: responseText,
          headers: axiosResponse.headers,
          requestDetails: {
            url: EVENTOR_API_URL,
            headers: requestHeaders
          }
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      );
    } catch (axiosError) {
      console.error("Axios request error:", axiosError);
      
      // Detailed error logging
      if (axiosError.response) {
        console.error("Response error data:", axiosError.response.data);
        console.error("Response error status:", axiosError.response.status);
        console.error("Response error headers:", axiosError.response.headers);
      } else if (axiosError.request) {
        console.error("No response received. Request:", axiosError.request);
      } else {
        console.error("Error setting up request:", axiosError.message);
      }
      
      throw axiosError; // Let the catch-all error handler below handle this
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
