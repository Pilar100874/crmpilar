import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import sql from 'https://esm.sh/mssql@10.0.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestQueryRequest {
  connectionId: string;
  query: string;
  type: 'test';
}

/**
 * Executa query SQL Server para teste em relatórios
 */
async function executeSqlServerQuery(server: string, database: string, username: string, password: string, query: string) {
  console.log('Executing SQL Server test query...');
  
  const sqlConfig = {
    server: server,
    port: 1433,
    user: username,
    password: password,
    database: database,
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
    const pool = await sql.connect(sqlConfig);
    console.log('Connected to SQL Server. Executing query...');
    
    const result = await pool.request().query(query);
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: TestQueryRequest = await req.json();
    console.log('Test query request received for connection:', body.connectionId);

    // Buscar conexão
    const { data: connection, error: connError } = await supabase
      .from('database_connections')
      .select('*')
      .eq('id', body.connectionId)
      .eq('active', true)
      .single();

    if (connError || !connection) {
      console.error('Connection not found:', connError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Conexão não encontrada ou inativa' 
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Connection found:', connection.name, connection.database_type);

    // Executar query baseado no tipo de banco
    if (connection.database_type === 'sqlserver') {
      const result = await executeSqlServerQuery(
        connection.sql_server,
        connection.sql_database,
        connection.sql_username,
        connection.sql_password,
        body.query
      );

      return new Response(
        JSON.stringify({
          success: true,
          data: result,
          rowCount: result.length,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else if (connection.database_type === 'supabase') {
      // Para Supabase, executar via RPC
      const { data: result, error: queryError } = await supabase.rpc('execute_sql', {
        sql_query: body.query
      });

      if (queryError) {
        throw queryError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: result,
          rowCount: result?.length || 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Tipo de banco ${connection.database_type} não suportado` 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error: any) {
    console.error('Error in test-report-query function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
