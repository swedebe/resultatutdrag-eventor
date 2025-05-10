
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  apiKey: string;
}

const EVENTOR_API_URL = 'https://eventor.orientering.se/api/organisation/apiKey';

// Parse URL function to get hostname and path
function parseUrl(url: string) {
  const urlObj = new URL(url);
  return {
    hostname: urlObj.hostname,
    path: `${urlObj.pathname}${urlObj.search}`
  };
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

    // Log the request details
    // Updated to match MeOS application - removed Accept header, added User-Agent: MeOS
    const requestHeaders = {
      'ApiKey': apiKey,
      'User-Agent': 'MeOS'
    };
    
    console.log(`Making request to Eventor API at URL: ${EVENTOR_API_URL}`);
    console.log(`Request headers: ${JSON.stringify(requestHeaders, null, 2)}`);
    
    // Extract hostname and path from URL
    const urlParts = parseUrl(EVENTOR_API_URL);
    
    console.log(`Using HTTPS module with hostname: ${urlParts.hostname}, path: ${urlParts.path}`);
    
    // Create a promise to handle the HTTPS request
    const httpsResponse = await new Promise((resolve, reject) => {
      const https = (Deno as any).createHttpClient();
      
      const options = {
        hostname: urlParts.hostname,
        path: urlParts.path,
        method: 'GET',
        headers: requestHeaders
      };
      
      console.log(`HTTPS request options: ${JSON.stringify(options, null, 2)}`);
      
      try {
        const req = https.request(options, (res: any) => {
          console.log(`HTTPS response status: ${res.statusCode}`);
          console.log(`HTTPS response headers: ${JSON.stringify(res.headers, null, 2)}`);
          
          let data = '';
          
          res.on('data', (chunk: any) => {
            data += chunk;
          });
          
          res.on('end', () => {
            console.log(`HTTPS response complete, data length: ${data.length}`);
            resolve({
              status: res.statusCode,
              statusText: res.statusMessage,
              headers: res.headers,
              body: data
            });
          });
        });
        
        req.on('error', (err: Error) => {
          console.error(`HTTPS request error: ${err.message}`);
          reject(err);
        });
        
        req.end();
      } catch (err) {
        console.error(`Error creating HTTPS request: ${err instanceof Error ? err.message : String(err)}`);
        reject(err);
      }
    }).catch(err => {
      console.error(`Promise rejection in HTTPS request: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    });
    
    const response = httpsResponse as any;
    
    // Get the response data
    console.log(`Eventor API response status: ${response.status}`);
    console.log(`Eventor API response headers: ${JSON.stringify(response.headers, null, 2)}`);
    
    const responseText = response.body;
    
    if (response.status !== 200) {
      console.error(`Error from Eventor API - Status: ${response.status}, Response: ${responseText}`);
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
        status: response.status,
        statusText: response.statusText,
        body: responseText,
        headers: response.headers,
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
