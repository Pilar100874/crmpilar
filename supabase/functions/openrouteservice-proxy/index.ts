import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ORS_BASE_URL = 'https://api.openrouteservice.org';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('OPENROUTESERVICE_API_KEY');
    
    if (!apiKey) {
      console.error('OPENROUTESERVICE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, ...params } = body;

    console.log('OpenRouteService proxy request:', action);

    // Return API key for client-side use (only if action is get-key)
    if (action === 'get-key') {
      return new Response(
        JSON.stringify({ apiKey }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route calculation
    if (action === 'directions') {
      const { coordinates, profile = 'driving-car' } = params;
      
      const response = await fetch(`${ORS_BASE_URL}/v2/directions/${profile}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey
        },
        body: JSON.stringify({
          coordinates,
          instructions: true,
          geometry: true
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('ORS directions error:', data);
        return new Response(
          JSON.stringify({ error: data.error?.message || 'Route calculation failed' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Geocoding
    if (action === 'geocode') {
      const { text } = params;
      
      const searchParams = new URLSearchParams({
        api_key: apiKey,
        text,
        'boundary.country': 'BRA',
        size: '5'
      });

      const response = await fetch(`${ORS_BASE_URL}/geocode/search?${searchParams}`);
      const data = await response.json();

      if (!response.ok) {
        console.error('ORS geocode error:', data);
        return new Response(
          JSON.stringify({ error: 'Geocoding failed' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reverse geocoding
    if (action === 'reverse-geocode') {
      const { lat, lng } = params;
      
      const searchParams = new URLSearchParams({
        api_key: apiKey,
        'point.lat': lat.toString(),
        'point.lon': lng.toString(),
        size: '1'
      });

      const response = await fetch(`${ORS_BASE_URL}/geocode/reverse?${searchParams}`);
      const data = await response.json();

      if (!response.ok) {
        console.error('ORS reverse geocode error:', data);
        return new Response(
          JSON.stringify({ error: 'Reverse geocoding failed' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Distance matrix
    if (action === 'matrix') {
      const { locations, sources, destinations, profile = 'driving-car' } = params;
      
      const response = await fetch(`${ORS_BASE_URL}/v2/matrix/${profile}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey
        },
        body: JSON.stringify({
          locations,
          sources,
          destinations,
          metrics: ['distance', 'duration']
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('ORS matrix error:', data);
        return new Response(
          JSON.stringify({ error: data.error?.message || 'Matrix calculation failed' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Optimization (TSP)
    if (action === 'optimize') {
      const { jobs, vehicles } = params;
      
      const response = await fetch(`${ORS_BASE_URL}/optimization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey
        },
        body: JSON.stringify({ jobs, vehicles })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('ORS optimization error:', data);
        return new Response(
          JSON.stringify({ error: data.error?.message || 'Optimization failed' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('OpenRouteService proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});