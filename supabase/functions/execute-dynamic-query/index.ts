import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import sql from 'mssql';

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

async function executeSqlServerQuery(config: SqlConfig, params: Record<string, any> = {}) {
  console.log('Executing SQL Server query...');
  console.log('Query parameters:', params);
  
  console.log('Connecting to SQL Server:', config.server);
  
  const sqlConfig = {
    server: config.server,
    port: 1433,
    user: config.username,
    password: config.password,
    database: config.database,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    },
    connectionTimeout: 60000,
    requestTimeout: 60000,
  } as any;

  try {
    const pool = await sql.connect(sqlConfig);
    console.log('Connected successfully. Executing query...');
    
    const request = pool.request();
    
    // Add parameters to the request
    for (const [key, value] of Object.entries(params)) {
      console.log(`Adding parameter @${key} = ${value}`);
      request.input(key, value as any);
    }
    
    const result = await request.query(config.query);
    console.log('Query executed successfully. Rows:', result.recordset?.length || 0);
    
    await pool.close();
    
    return result.recordset || [];
  } catch (error) {
    console.error('SQL Server query error:', error);
    try {
      await (sql as any).close();
    } catch (closeError) {
      console.error('Error closing connection:', closeError);
    }
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
    } else {
      // Execute SQL Server query via proxy
      const sqlConfig: SqlConfig = {
        server: apiConfig.connection?.sql_server || apiConfig.sql_server,
        database: apiConfig.connection?.sql_database || apiConfig.sql_database,
        username: apiConfig.connection?.sql_username || apiConfig.sql_username,
        password: apiConfig.connection?.sql_password || apiConfig.sql_password,
        query: apiConfig.query,
      };

      const result = await executeSqlServerQuery(sqlConfig, params);

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