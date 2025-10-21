import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const endpointPath = pathParts[pathParts.length - 1];

    console.log('Received request for endpoint:', endpointPath);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get API endpoint configuration
    const { data: apiConfig, error: configError } = await supabase
      .from('api_endpoints')
      .select('*')
      .eq('endpoint_path', endpointPath)
      .eq('active', true)
      .single();

    if (configError || !apiConfig) {
      console.error('Endpoint not found:', configError);
      return new Response(
        JSON.stringify({ error: 'Endpoint not found or inactive' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate HTTP method
    if (req.method !== apiConfig.http_method) {
      return new Response(
        JSON.stringify({ error: `Method ${req.method} not allowed. Use ${apiConfig.http_method}` }),
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get query parameters
    let params: Record<string, any> = {};
    if (req.method === 'GET') {
      params = Object.fromEntries(url.searchParams.entries());
    } else if (req.method === 'POST') {
      params = await req.json();
    }

    // Execute query based on database type
    let queryResult: any;
    
    if (apiConfig.database_type === 'supabase') {
      // Execute Supabase query
      const { data, error: queryError } = await supabase.rpc('execute_sql', {
        sql_query: apiConfig.query
      });

      if (queryError) {
        throw queryError;
      }
      
      queryResult = data;
    } else if (apiConfig.database_type === 'sqlserver') {
      // For SQL Server queries, just acknowledge for now
      // In production, you would connect to SQL Server here
      queryResult = {
        message: 'SQL Server query execution - implementation needed',
        query: apiConfig.query
      };
    } else {
      return new Response(
        JSON.stringify({ error: `Database type ${apiConfig.database_type} not supported` }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: queryResult,
        endpoint: endpointPath,
        method: apiConfig.http_method,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in execute-dynamic-query function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro desconhecido',
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});