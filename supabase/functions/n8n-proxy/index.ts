import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function makeRequest(webhookUrl: string, payload: any, method: string) {
  console.log('n8n-proxy: Sending', method, 'request to n8n...');
  
  if (method === 'GET') {
    // For GET requests, append payload as query params
    const url = new URL(webhookUrl);
    if (payload) {
      Object.entries(payload).forEach(([key, value]) => {
        if (typeof value === 'object') {
          url.searchParams.append(key, JSON.stringify(value));
        } else {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
  } else {
    return await fetch(webhookUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhookUrl, payload, expectResponse = true, httpMethod = 'AUTO' } = await req.json();

    console.log('n8n-proxy: Received request');
    console.log('n8n-proxy: webhookUrl:', webhookUrl);
    console.log('n8n-proxy: httpMethod:', httpMethod);
    console.log('n8n-proxy: expectResponse:', expectResponse);
    console.log('n8n-proxy: payload:', JSON.stringify(payload));

    if (!webhookUrl) {
      console.error('n8n-proxy: Missing webhookUrl');
      return new Response(
        JSON.stringify({ error: 'webhookUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let response;
    const method = httpMethod.toUpperCase();

    if (method === 'AUTO') {
      // Try POST first, then GET if POST fails with method error
      console.log('n8n-proxy: AUTO mode - trying POST first...');
      response = await makeRequest(webhookUrl, payload, 'POST');
      
      // If POST fails with 404 and mentions GET, try GET
      if (response.status === 404) {
        const clonedResponse = response.clone();
        try {
          const errorBody = await clonedResponse.json();
          if (errorBody?.message?.toLowerCase().includes('get')) {
            console.log('n8n-proxy: POST failed, webhook suggests GET - retrying with GET...');
            response = await makeRequest(webhookUrl, payload, 'GET');
          }
        } catch {
          // If we can't parse error, just use original response
        }
      }
    } else {
      response = await makeRequest(webhookUrl, payload, method);
    }

    console.log('n8n-proxy: n8n response status:', response.status);

    if (expectResponse) {
      // Try to parse response as JSON
      const contentType = response.headers.get('content-type') || '';
      let responseData;

      if (contentType.includes('application/json')) {
        responseData = await response.json();
        console.log('n8n-proxy: n8n response (JSON):', JSON.stringify(responseData));
      } else {
        responseData = await response.text();
        console.log('n8n-proxy: n8n response (text):', responseData);
      }

      if (!response.ok) {
        console.error('n8n-proxy: n8n returned error:', response.status, responseData);
        return new Response(
          JSON.stringify({ error: 'n8n request failed', status: response.status, details: responseData }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: responseData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // No response expected, just confirm the request was sent
      console.log('n8n-proxy: No response expected, returning success');
      return new Response(
        JSON.stringify({ success: true, message: 'Request sent successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('n8n-proxy: Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
