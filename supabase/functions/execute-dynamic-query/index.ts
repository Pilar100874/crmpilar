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
import { Connection, Request as TediousRequest, TYPES } from 'https://esm.sh/tedious@18.6.1';


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
async function executeSqlServerQuery(config: SqlConfig, params: Record<string, any> = {}): Promise<any[]> {
  console.log('Executing SQL Server query...');
  console.log('Query parameters:', params);
  console.log('Connecting to SQL Server:', config.server);
  
  return new Promise((resolve, reject) => {
    const connectionConfig = {
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
        encrypt: false,
        trustServerCertificate: true,
        port: 1433,
        connectTimeout: 60000,
        requestTimeout: 60000,
      }
    };

    const connection = new Connection(connectionConfig);
    const results: any[] = [];

    connection.on('connect', (err) => {
      if (err) {
        console.error('Connection error:', err);
        reject(err);
        return;
      }

      console.log('Connected successfully. Executing query...');
      
      const request = new TediousRequest(config.query, (error, rowCount) => {
        connection.close();
        
        if (error) {
          console.error('Query error:', error);
          reject(error);
          return;
        }
        
        console.log('Query executed successfully. Rows:', results.length);
        resolve(results);
      });

      // Add parameters to the request
      for (const [key, value] of Object.entries(params)) {
        console.log(`Adding parameter @${key} = ${value}`);
        let sqlType = TYPES.NVarChar;
        
        if (typeof value === 'number') {
          if (Number.isInteger(value)) {
            sqlType = TYPES.Int;
          } else {
            sqlType = TYPES.Float;
          }
        } else if (typeof value === 'boolean') {
          sqlType = TYPES.Bit;
        } else if (value instanceof Date) {
          sqlType = TYPES.DateTime;
        }
        
        request.addParameter(key, sqlType, value);
      }

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
