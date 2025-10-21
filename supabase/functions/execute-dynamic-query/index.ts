import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function executeSqlServerQuery(connectionConfig: any, query: string): Promise<any[]> {
  console.log('Executing SQL Server query via HTTP proxy...');
  
  // Se houver uma API proxy configurada, use-a
  if (connectionConfig.proxy_url) {
    console.log('Using proxy URL:', connectionConfig.proxy_url);
    
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
        query: query,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Proxy API error: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data || result;
  }
  
  // Caso contrário, retorne erro explicativo
  throw new Error(
    'ATENÇÃO: Edge Functions não conseguem conectar diretamente a SQL Servers em redes privadas. ' +
    'Você precisa criar uma API intermediária no seu servidor que execute as queries. ' +
    'Configure o campo "proxy_url" na conexão com a URL da sua API. ' +
    'Exemplo: https://seu-servidor.com/api/query'
  );
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
    
    const errorMessage = error.message || 'Erro desconhecido';
    const isSqlServerConnectionError = errorMessage.includes('SQL Server') || 
                                       errorMessage.includes('acessível') ||
                                       error.code === 'ETIMEOUT';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false,
        details: isSqlServerConnectionError ? 
          'Edge Functions do Supabase não podem conectar a SQL Servers em redes privadas. Considere: 1) Liberar acesso público ao SQL Server, 2) Criar uma API intermediária, ou 3) Usar Supabase como banco principal.' : 
          'Erro ao executar query',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});