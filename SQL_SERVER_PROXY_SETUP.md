# SQL Server Proxy Setup

Como o Supabase Edge Functions não suporta conexão direta ao SQL Server, você precisa criar uma função intermediária no Azure Functions ou AWS Lambda.

## Opção 1: Azure Functions (Recomendado para SQL Server Azure)

### 1. Criar Azure Function

```bash
# Instalar Azure Functions Core Tools
npm install -g azure-functions-core-tools@4

# Criar projeto
func init SqlServerProxy --javascript
cd SqlServerProxy
func new --name sqlserver-query --template "HTTP trigger"
```

### 2. Instalar dependências

```bash
npm install mssql
```

### 3. Código da função (index.js)

```javascript
const sql = require('mssql');

module.exports = async function (context, req) {
    context.log('SQL Server proxy function triggered');

    // Enable CORS
    context.res = {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        }
    };

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        context.res.body = '';
        return;
    }

    if (req.method !== 'POST') {
        context.res.status = 405;
        context.res.body = { error: 'Method not allowed. Use POST.' };
        return;
    }

    const { server, database, username, password, port, query, params } = req.body;

    if (!server || !database || !username || !password || !query) {
        context.res.status = 400;
        context.res.body = { error: 'Missing required fields: server, database, username, password, query' };
        return;
    }

    const config = {
        user: username,
        password: password,
        server: server,
        database: database,
        port: parseInt(port || '1433'),
        options: {
            encrypt: true,
            trustServerCertificate: true,
            enableArithAbort: true,
            requestTimeout: 30000,
        },
        connectionTimeout: 30000,
    };

    let pool;
    try {
        context.log('Connecting to SQL Server:', server, database);
        pool = await sql.connect(config);
        
        context.log('Executing query');
        const result = await pool.request().query(query);
        
        context.log('Query executed successfully, rows:', result.recordset.length);
        
        context.res.status = 200;
        context.res.body = {
            success: true,
            data: result.recordset
        };
    } catch (error) {
        context.log.error('SQL Server error:', error);
        context.res.status = 500;
        context.res.body = {
            error: error.message,
            success: false
        };
    } finally {
        if (pool) {
            try {
                await pool.close();
            } catch (closeError) {
                context.log.error('Error closing pool:', closeError);
            }
        }
    }
};
```

### 4. Deploy

```bash
# Login no Azure
az login

# Criar resource group
az group create --name SqlServerProxyRG --location eastus

# Criar storage account
az storage account create --name sqlserverproxystorage --location eastus --resource-group SqlServerProxyRG --sku Standard_LRS

# Criar function app
az functionapp create --resource-group SqlServerProxyRG --consumption-plan-location eastus --runtime node --runtime-version 18 --functions-version 4 --name sqlserver-proxy-app --storage-account sqlserverproxystorage

# Deploy
func azure functionapp publish sqlserver-proxy-app
```

### 5. Obter URL

Após o deploy, sua URL será algo como:
```
https://sqlserver-proxy-app.azurewebsites.net/api/sqlserver-query
```

---

## Opção 2: AWS Lambda + API Gateway

### 1. Criar projeto Lambda

```bash
mkdir sqlserver-lambda
cd sqlserver-lambda
npm init -y
npm install mssql
```

### 2. Código da função (index.js)

```javascript
const sql = require('mssql');

exports.handler = async (event) => {
    console.log('SQL Server proxy lambda triggered');
    
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
        };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (e) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid JSON body' })
        };
    }

    const { server, database, username, password, port, query, params } = body;

    if (!server || !database || !username || !password || !query) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing required fields: server, database, username, password, query' })
        };
    }

    const config = {
        user: username,
        password: password,
        server: server,
        database: database,
        port: parseInt(port || '1433'),
        options: {
            encrypt: true,
            trustServerCertificate: true,
            enableArithAbort: true,
            requestTimeout: 30000,
        },
        connectionTimeout: 30000,
    };

    let pool;
    try {
        console.log('Connecting to SQL Server:', server, database);
        pool = await sql.connect(config);
        
        console.log('Executing query');
        const result = await pool.request().query(query);
        
        console.log('Query executed successfully, rows:', result.recordset.length);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: result.recordset
            })
        };
    } catch (error) {
        console.error('SQL Server error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message,
                success: false
            })
        };
    } finally {
        if (pool) {
            try {
                await pool.close();
            } catch (closeError) {
                console.error('Error closing pool:', closeError);
            }
        }
    }
};
```

### 3. Criar arquivo ZIP

```bash
zip -r function.zip .
```

### 4. Deploy via AWS Console

1. Acesse AWS Lambda Console
2. Clique em "Create function"
3. Escolha "Author from scratch"
4. Nome: `sqlserver-proxy`
5. Runtime: Node.js 18.x
6. Clique em "Create function"
7. Na seção "Code source", clique em "Upload from" > ".zip file"
8. Faça upload do `function.zip`
9. Em "Configuration" > "General configuration", aumente o timeout para 30 segundos
10. Em "Configuration" > "Environment variables", adicione se necessário

### 5. Criar API Gateway

1. Acesse API Gateway Console
2. Clique em "Create API" > "HTTP API"
3. Clique em "Add integration" > "Lambda"
4. Selecione sua função `sqlserver-proxy`
5. Nome da API: `sqlserver-proxy-api`
6. Clique em "Next"
7. Configure a rota: `POST /query`
8. Clique em "Next" e depois "Create"

### 6. Obter URL

Após criar, sua URL será algo como:
```
https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/query
```

---

## Configuração no Sistema

Após criar a função no Azure ou AWS, você precisa configurar a URL no sistema:

### Opção A: Configurar na conexão do banco

1. Acesse **Configurações** > **Gerador de API** > **Conexões de Banco de Dados**
2. Edite sua conexão SQL Server
3. No campo **Proxy URL**, adicione a URL da sua Azure Function ou AWS Lambda
4. Salve

### Opção B: Configurar via variável de ambiente (global)

Adicione a secret `SQL_SERVER_PROXY_URL` com a URL da sua função.

---

## Teste

Após configurar, teste sua API:

1. Vá em **Configurações** > **Gerador de API**
2. Selecione sua API
3. Clique em **Testar API**

Se tudo estiver correto, você verá os dados retornados do SQL Server!

---

## Segurança

⚠️ **IMPORTANTE:**

- Configure CORS adequadamente em produção
- Considere adicionar autenticação na Azure Function/Lambda
- Use HTTPS sempre
- Não exponha credenciais do banco no código
- Considere usar Azure Key Vault ou AWS Secrets Manager para armazenar credenciais
