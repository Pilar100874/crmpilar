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
  port?: string;
}

async function executeSqlServerQuery(config: SqlConfig, params: Record<string, any> = {}) {
  const { Connection, Request, TYPES } = await import('https://esm.sh/tedious@18.6.1');
  
  return new Promise((resolve, reject) => {
    const sqlConfig = {
      server: config.server,
      authentication: {
        type: 'default' as const,
        options: {
          userName: config.username,
          password: config.password,
        }
      },
      options: {
        database: config.database,
        port: parseInt(config.port || '1433'),
        encrypt: true,
        trustServerCertificate: true,
        rowCollectionOnRequestCompletion: true,
        requestTimeout: 30000,
      }
    };

    console.log('Connecting to SQL Server:', config.server, config.database);
    const connection = new Connection(sqlConfig);
    
    connection.on('connect', (err: any) => {
      if (err) {
        console.error('Connection error:', err);
        reject(new Error(`Failed to connect to SQL Server: ${err.message}`));
        return;
      }

      console.log('Connected. Executing query:', config.query);
      const request = new Request(config.query, (err: any, rowCount?: number, rows?: any[]) => {
        connection.close();
        
        if (err) {
          console.error('Query error:', err);
          reject(new Error(`Query execution failed: ${err.message}`));
          return;
        }

        console.log('Query executed successfully, rows:', rowCount || 0);
        
        // Convert rows to plain objects
        const results = (rows || []).map((row: any) => {
          const obj: Record<string, any> = {};
          row.forEach((column: any) => {
            obj[column.metadata.colName] = column.value;
          });
          return obj;
        });
        
        resolve(results);
      });

      connection.execSql(request);
    });

    connection.on('error', (err: any) => {
      console.error('Connection error:', err);
      reject(new Error(`SQL Server connection error: ${err.message}`));
    });

    connection.connect();
  });
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

    // Get database connection details if connection_id is specified
    let connectionConfig: any = apiConfig;
    if (apiConfig.connection_id) {
      const { data: connData, error: connError } = await supabase
        .from('database_connections')
        .select('*')
        .eq('id', apiConfig.connection_id)
        .eq('active', true)
        .single();
      
      if (!connError && connData) {
        connectionConfig = {
          ...apiConfig,
          sql_server: connData.sql_server,
          sql_database: connData.sql_database,
          sql_username: connData.sql_username,
          sql_password: connData.sql_password,
          sql_port: connData.sql_port,
        };
      }
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
      // Execute SQL Server query
      const sqlConfig: SqlConfig = {
        server: connectionConfig.sql_server,
        database: connectionConfig.sql_database,
        username: connectionConfig.sql_username,
        password: connectionConfig.sql_password,
        query: apiConfig.query,
        port: connectionConfig.sql_port,
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
    } else {
      return new Response(
        JSON.stringify({ error: `Database type ${apiConfig.database_type} not supported` }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
