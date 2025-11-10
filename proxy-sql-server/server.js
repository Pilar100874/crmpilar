// Servidor Proxy para SQL Server
// Publique este servidor em Railway/Render/Heroku e cole a URL no campo "Proxy URL"

const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Endpoint de health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'SQL Server Proxy',
    version: '1.0.0'
  });
});

// Endpoint principal que executa queries SQL Server
app.post('/query', async (req, res) => {
  console.log('📥 Recebendo requisição SQL Server...');
  
  const { server, database, username, password, query, params } = req.body;

  // Validação básica
  if (!server || !database || !username || !password || !query) {
    return res.status(400).json({ 
      error: 'Parâmetros obrigatórios: server, database, username, password, query' 
    });
  }

  const config = {
    server,
    port: 1433,
    user: username,
    password,
    database,
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

  let pool;
  try {
    console.log(`🔌 Conectando ao SQL Server: ${server}/${database}...`);
    pool = await sql.connect(config);
    console.log('✅ Conectado com sucesso!');

    const request = pool.request();

    // Adiciona parâmetros à query
    if (params && typeof params === 'object') {
      for (const [key, value] of Object.entries(params)) {
        console.log(`📝 Parâmetro @${key} = ${value}`);
        request.input(key, value);
      }
    }

    console.log('🔍 Executando query...');
    const result = await request.query(query);
    console.log(`✅ Query executada! ${result.recordset?.length || 0} registros retornados.`);

    await pool.close();

    res.json({
      success: true,
      data: result.recordset || [],
      rowCount: result.recordset?.length || 0
    });

  } catch (error) {
    console.error('❌ Erro SQL Server:', error.message);
    
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('Erro ao fechar conexão:', closeError.message);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy SQL Server rodando na porta ${PORT}`);
  console.log(`📍 Endpoint: http://localhost:${PORT}/query`);
  console.log(`💚 Health check: http://localhost:${PORT}/`);
});
