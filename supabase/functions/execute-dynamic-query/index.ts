import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Connection, Request as SqlRequest } from "npm:tedious@18.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function executeSqlServerQuery(connectionConfig: any, query: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const config = {
      server: connectionConfig.sql_server,
      authentication: {
        type: 'default',
        options: {
          userName: connectionConfig.sql_username,
          password: connectionConfig.sql_password,
        }
      },
      options: {
        database: connectionConfig.sql_database,
        port: parseInt(connectionConfig.sql_port || '1433'),
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 30000,
        requestTimeout: 30000,
      }
    };

    const connection = new Connection(config);
    const results: any[] = [];

    connection.on('connect', (err) => {
      if (err) {
        console.error('Connection failed:', err);
        reject(err);
        return;
      }

      console.log('Connected to SQL Server');
      const request = new SqlRequest(query, (err) => {
        if (err) {
          console.error('Query failed:', err);
          connection.close();
          reject(err);
          return;
        }

        console.log('Query executed successfully');
        connection.close();
        resolve(results);
      });

      request.on('row', (columns) => {
        const row: any = {};
        columns.forEach((column) => {
          row[column.metadata.colName] = column.value;
        });
        results.push(row);
      });

      connection.execSql(request);
    });

    connection.on('error', (err) => {
      console.error('Connection error:', err);
      reject(err);
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

    // Get database connection details
    let connectionConfig: any = null;
    if (apiConfig.connection_id) {
      const { data: connData, error: connError } = await supabase
        .from('database_connections')
        .select('*')
        .eq('id', apiConfig.connection_id)
        .eq('active', true)
        .single();
      
      if (!connError && connData) {
        connectionConfig = connData;
      }
    }

    // Replace parameters in query
    let finalQuery = apiConfig.query;
    if (apiConfig.parameters && apiConfig.parameters.length > 0) {
      apiConfig.parameters.forEach((param: any) => {
        const paramValue = params[param.name];
        if (param.required && !paramValue) {
          throw new Error(`Required parameter ${param.name} is missing`);
        }
        if (paramValue) {
          finalQuery = finalQuery.replace(new RegExp(`{{${param.name}}}`, 'g'), paramValue);
        }
      });
    }

    // Execute query based on database type
    let queryResult: any;
    
    if (apiConfig.database_type === 'supabase') {
      // Execute Supabase query
      const { data, error: queryError } = await supabase.rpc('execute_sql', {
        sql_query: finalQuery
      });

      if (queryError) {
        throw queryError;
      }
      
      queryResult = data;
    } else if (apiConfig.database_type === 'sqlserver') {
      if (!connectionConfig) {
        throw new Error('SQL Server connection not configured');
      }

      // Execute SQL Server query
      queryResult = await executeSqlServerQuery(
        connectionConfig,
        finalQuery
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