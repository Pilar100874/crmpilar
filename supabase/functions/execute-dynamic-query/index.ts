import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SqlConfig {
  server: string;
  database: string;
  username: string;
  password: string;
  query: string;
}

async function executeSqlServerQueryViaProxy(proxyUrl: string, config: SqlConfig, params: Record<string, any> = {}) {
  console.log('Routing SQL Server query via proxy...');
  const payload = {
    server: config.server,
    database: config.database,
    username: config.username,
    password: config.password,
    query: config.query,
    params,
  };

  const resp = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Proxy HTTP ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  // Accept either array or wrapped object { data, success }
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return data;
}

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
    if (apiConfig.database_type === 'supabase') {
      // Execute Supabase query
      const { data: queryResult, error: queryError } = await supabase.rpc('execute_sql', {
        sql_query: apiConfig.query
      });

      if (queryError) {
        throw queryError;
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
    } else if (apiConfig.database_type === 'sqlserver') {
      // Execute SQL Server query via proxy
      let proxyUrl: string | undefined;
      let connOverride: any = {};

      if (apiConfig.connection_id) {
        const { data: connData, error: connError } = await supabase
          .from('database_connections')
          .select('*')
          .eq('id', apiConfig.connection_id)
          .eq('active', true)
          .maybeSingle();

        if (connError) {
          throw connError;
        }
        if (connData) {
          proxyUrl = connData.proxy_url || proxyUrl;
          connOverride = {
            sql_server: connData.sql_server,
            sql_database: connData.sql_database,
            sql_username: connData.sql_username,
            sql_password: connData.sql_password,
          };
        }
      }

      proxyUrl = proxyUrl || apiConfig.proxy_url; // in case it's stored on endpoint (optional)

      if (!proxyUrl) {
        return new Response(
          JSON.stringify({ error: 'Nenhuma proxy_url configurada para SQL Server. Cadastre em Configurações > Conexões (campo "Proxy URL").' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const sqlConfig: SqlConfig = {
        server: connOverride.sql_server || apiConfig.sql_server,
        database: connOverride.sql_database || apiConfig.sql_database,
        username: connOverride.sql_username || apiConfig.sql_username,
        password: connOverride.sql_password || apiConfig.sql_password,
        query: apiConfig.query,
      };

      const result = await executeSqlServerQueryViaProxy(proxyUrl, sqlConfig, params);

      return new Response(
        JSON.stringify({
          success: true,
          data: result,
          endpoint: endpointPath,
          method: apiConfig.http_method,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: `Database type ${apiConfig.database_type} not supported` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('Error in execute-dynamic-query function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
