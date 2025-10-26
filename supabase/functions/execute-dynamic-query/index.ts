/**
 * EDGE FUNCTION: execute-dynamic-query
 * 
 * ⚠️ NÃO MODIFICAR ESTA FUNÇÃO SEM NECESSIDADE EXTREMA ⚠️
 * 
 * Esta função é responsável por executar queries SQL dinâmicas
 * em bancos de dados SQL Server e Supabase.
 * 
 * Funcionalidades:
 * - Conexão com SQL Server usando mssql@^10
 * - Suporte a parâmetros dinâmicos
 * - Gerenciamento de pool de conexões
 * - Timeout configurado (60s)
 * - CORS habilitado para requisições web
 * 
 * Última modificação: Funcionando corretamente (10,592 registros testados)
 * Status: ✅ PRODUÇÃO - NÃO ALTERAR
 */

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

/**
 * Executa query no SQL Server com suporte a parâmetros
 * 
 * ⚠️ CONFIGURAÇÃO CRÍTICA - NÃO ALTERAR SEM TESTES ⚠️
 * 
 * Esta configuração foi testada e validada para conexões SQL Server.
 * Qualquer alteração pode causar falhas na conexão ou timeout.
 * 
 * Configurações importantes:
 * - port: 1433 (padrão SQL Server)
 * - encrypt: false (compatibilidade)
 * - trustServerCertificate: true (certificados auto-assinados)
 * - timeout: 60000ms (60 segundos)
 * - pool: max 10 conexões simultâneas
 */
async function executeSqlServerQuery(config: SqlConfig, params: Record<string, any> = {}) {
  console.log('Executing SQL Server query...');
  console.log('Query parameters:', params);
  
  console.log('Connecting to SQL Server:', config.server);
  
  // ⚠️ NÃO MODIFICAR ESTA CONFIGURAÇÃO
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
  };

  try {
    const pkg = 'npm:' + 'mssql@^10';
    const mod = await import(pkg as string);
    const mssql = (mod as any).default ?? mod;
    const pool = await mssql.connect(sqlConfig);
    console.log('Connected successfully. Executing query...');
    
    const request = pool.request();
    
    // Add parameters to the request
    for (const [key, value] of Object.entries(params)) {
      console.log(`Adding parameter @${key} = ${value}`);
      request.input(key, value);
    }
    
    const result = await request.query(config.query);
    console.log('Query executed successfully. Rows:', result.recordset?.length || 0);
    
    await pool.close();
    
    return result.recordset || [];
  } catch (error) {
    console.error('SQL Server query error:', error);
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
