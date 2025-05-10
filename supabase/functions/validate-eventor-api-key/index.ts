
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
// Import Axios from Deno-compatible CDN
import axios from 'https://deno.land/x/axiod/mod.ts'

interface RequestBody {
  apiKey: string;
  baseUrl?: string;
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
    let baseUrl: string = 'https://eventor.orientering.se/api';
    
    try {
      const body = await req.json() as RequestBody;
      apiKey = body.apiKey;
      
      // Use the provided baseUrl if available
      if (body.baseUrl) {
        baseUrl = body.baseUrl;
      }
      
      console.log(`Request body successfully parsed. Using base URL: ${baseUrl}`);
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

    // Construct the URL for validating the API key
    const apiUrl = `${baseUrl}/organisation/apiKey`;
    
    // Log the request details
    const requestHeaders = {
      'ApiKey': apiKey,
      'User-Agent': 'MeOS'
    };
    
    console.log(`Making request to Eventor API at URL: ${apiUrl}`);
    console.log(`Request headers: ${JSON.stringify(requestHeaders, null, 2)}`);
    
    console.log("Using Axios for HTTP request");
    
    // Make the request with Axios
    try {
      console.log("Initiating Axios request");
      
      const axiosResponse = await axios.get(apiUrl, {
        headers: requestHeaders,
        validateStatus: () => true // Accept all status codes to handle them manually
      });
      
      console.log(`Axios response status: ${axiosResponse.status}`);
      console.log(`Axios response headers: ${JSON.stringify(axiosResponse.headers, null, 2)}`);
      
      // Get the response data
      const responseText = typeof axiosResponse.data === 'string' 
        ? axiosResponse.data 
        : JSON.stringify(axiosResponse.data);
      
      // Convert XML to JSON if the response is XML
      let parsedData = null;
      if (typeof responseText === 'string' && 
          (responseText.trim().startsWith('<?xml') || responseText.trim().startsWith('<'))) {
        try {
          // Simple XML to JSON conversion using DOMParser
          const domParser = new DOMParser();
          const xmlDoc = domParser.parseFromString(responseText, "text/xml");
          
          // Helper function to convert XML nodes to JSON
          const xmlToJson = (node: Element): any => {
            const obj: any = {};
            
            // Process attributes
            if (node.attributes && node.attributes.length > 0) {
              for (let i = 0; i < node.attributes.length; i++) {
                const attr = node.attributes[i];
                obj[`@${attr.name}`] = attr.value;
              }
            }
            
            // Process child nodes
            const children = Array.from(node.childNodes);
            
            if (children.length === 1 && children[0].nodeType === 3) {
              // Text node
              return node.textContent;
            }
            
            // Group elements by name for arrays
            const childElements = children.filter(n => n.nodeType === 1) as Element[];
            const elementCounts: Record<string, number> = {};
            
            childElements.forEach(child => {
              const name = child.nodeName;
              elementCounts[name] = (elementCounts[name] || 0) + 1;
            });
            
            childElements.forEach(child => {
              const name = child.nodeName;
              
              if (elementCounts[name] > 1) {
                // Create an array for multiple elements with the same name
                if (!obj[name]) obj[name] = [];
                obj[name].push(xmlToJson(child));
              } else {
                // Single element
                obj[name] = xmlToJson(child);
              }
            });
            
            return Object.keys(obj).length > 0 ? obj : null;
          };
          
          // Start conversion from root element
          const rootElement = xmlDoc.documentElement;
          parsedData = xmlToJson(rootElement);
          
          console.log("Successfully converted XML to JSON");
        } catch (parseError) {
          console.error("Error converting XML to JSON:", parseError);
          // If parsing fails, return the raw text
          parsedData = { rawXml: responseText };
        }
      } else {
        // If it's not XML, try to parse as JSON or use as is
        try {
          parsedData = JSON.parse(responseText);
        } catch (parseError) {
          parsedData = { rawContent: responseText };
        }
      }
      
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
        const sampleData = JSON.stringify(parsedData).length > 200 
          ? JSON.stringify(parsedData).substring(0, 200) + "... (truncated)"
          : JSON.stringify(parsedData);
        console.log(`Sample data: ${sampleData}`);
      }

      // Return the response with the parsed data
      return new Response(
        JSON.stringify(parsedData || { rawContent: responseText }),
        { 
          status: 200, 
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
