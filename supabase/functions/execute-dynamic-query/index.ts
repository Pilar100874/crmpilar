import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

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
  proxy_url?: string;
}

async function executeSqlServerQuery(config: SqlConfig, params: Record<string, any> = {}) {
  console.log('Executing SQL Server query via proxy...');
  console.log('Query parameters:', params);

  const proxyUrl = config.proxy_url || Deno.env.get('SQL_SERVER_PROXY_URL');
  if (!proxyUrl) {
    throw new Error('SQL Server direto não suportado neste ambiente. Configure um Proxy URL na conexão.');
  }

  try {
    const response = await fetch(`${proxyUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        server: config.server,
        database: config.database,
        username: config.username,
        password: config.password,
        query: config.query,
        params
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Proxy request failed with ${response.status}`);
    }

    const result = await response.json();
    console.log('SQL query executed via proxy successfully. Rows:', result.rowCount || (result.data?.length ?? 0));
    return result.data || [];
  } catch (error) {
    console.error('SQL Server proxy error:', error);
    throw error;
  }
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

    // Get API endpoint configuration with connection data
    const { data: apiConfig, error: configError } = await supabase
      .from('api_endpoints')
      .select('*, connection:database_connections(*)')
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
      console.log('📥 Parâmetros recebidos (GET):', params);
    } else if (req.method === 'POST') {
      params = await req.json();
      console.log('📥 Parâmetros recebidos (POST):', JSON.stringify(params, null, 2));
      console.log('📝 Quantidade de parâmetros:', Object.keys(params).length);
      console.log('📋 Tipos dos parâmetros:', Object.entries(params).map(([k, v]) => `${k}: ${typeof v}`).join(", "));
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
    } else {
      // Execute SQL Server query via proxy
      const sqlConfig: SqlConfig = {
        server: apiConfig.connection?.sql_server || apiConfig.sql_server,
        database: apiConfig.connection?.sql_database || apiConfig.sql_database,
        username: apiConfig.connection?.sql_username || apiConfig.sql_username,
        password: apiConfig.connection?.sql_password || apiConfig.sql_password,
        query: apiConfig.query,
        proxy_url: apiConfig.connection?.proxy_url
      };

      console.log('🔍 Query SQL a ser executada:', sqlConfig.query);
      console.log('📦 Parâmetros que serão enviados ao SQL Server:', JSON.stringify(params, null, 2));
      
      const result = await executeSqlServerQuery(sqlConfig, params);

      console.log(`✅ SQL Server retornou ${result.length} registros`);

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
