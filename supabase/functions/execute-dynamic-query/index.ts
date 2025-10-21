import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SqlServerConnectionConfig {
  sql_server: string;
  sql_database: string;
  sql_username: string;
  sql_password: string;
  sql_port?: string;
  proxy_url?: string;
}

async function executeSqlServerQuery(
  connectionConfig: SqlServerConnectionConfig, 
  query: string, 
  params: Record<string, any> = {}
): Promise<any[]> {
  console.log('Attempting to execute SQL Server query...');
  console.log('Has proxy_url:', !!connectionConfig.proxy_url);
  
  // IMPORTANTE: Edge Functions não podem conectar diretamente a SQL Servers
  // Eles precisam de uma API proxy intermediária
  if (!connectionConfig.proxy_url) {
    throw new Error(
      'Esta API requer uma URL de proxy configurada. ' +
      'Edge Functions não conseguem conectar diretamente a SQL Servers em redes privadas. ' +
      'Por favor, configure o campo "URL da API Proxy" na conexão do banco de dados.'
    );
  }
  
  console.log('Using proxy URL:', connectionConfig.proxy_url);
  
  try {
    const response = await fetch(connectionConfig.proxy_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        server: connectionConfig.sql_server,
        database: connectionConfig.sql_database,
        username: connectionConfig.sql_username,
        password: connectionConfig.sql_password,
        port: connectionConfig.sql_port || '1433',
        query: query,
        params: params,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na API Proxy (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Query executada com sucesso via proxy');
    return result.data || result.recordset || result;
  } catch (error: any) {
    console.error('Erro ao executar query via proxy:', error);
    throw new Error(`Erro ao conectar à API Proxy: ${error.message}`);
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
          proxy_url: connData.proxy_url,
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
      // Execute SQL Server query via proxy
      if (!connectionConfig.sql_server) {
        throw new Error('Configuração do SQL Server não encontrada');
      }

      const result = await executeSqlServerQuery(connectionConfig, apiConfig.query, params);

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
      throw new Error(`Tipo de banco de dados não suportado: ${apiConfig.database_type}`);
    }
  } catch (error: any) {
    console.error('Erro na função execute-dynamic-query:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro desconhecido',
        success: false,
        details: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});