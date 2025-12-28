import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhookUrl, payload, expectResponse = true } = await req.json();

    console.log('n8n-proxy: Received request');
    console.log('n8n-proxy: webhookUrl:', webhookUrl);
    console.log('n8n-proxy: expectResponse:', expectResponse);
    console.log('n8n-proxy: payload:', JSON.stringify(payload));

    if (!webhookUrl) {
      console.error('n8n-proxy: Missing webhookUrl');
      return new Response(
        JSON.stringify({ error: 'webhookUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Make the request to n8n
    console.log('n8n-proxy: Sending request to n8n...');
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

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
