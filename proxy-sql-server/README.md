# Proxy SQL Server

Servidor proxy Node.js para conectar Edge Functions do Supabase ao SQL Server.

## 🚀 Como publicar

### Opção 1: Railway (Recomendado - Fácil e Gratuito)

1. Acesse [Railway.app](https://railway.app)
2. Clique em "Start a New Project"
3. Selecione "Deploy from GitHub repo" (ou "Empty Project" para upload manual)
4. Faça upload desta pasta `proxy-sql-server`
5. Railway detectará automaticamente o Node.js e fará o deploy
6. Copie a URL gerada (ex: `https://seu-app.railway.app`)
7. Cole no campo **Proxy URL** em: Configurações > Conexões > [sua conexão SQL Server]

### Opção 2: Render.com

1. Acesse [Render.com](https://render.com)
2. Crie um "New Web Service"
3. Conecte ao GitHub ou faça upload da pasta
4. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Copie a URL gerada
6. Cole no campo **Proxy URL**

### Opção 3: Heroku

1. Instale Heroku CLI: `npm install -g heroku`
2. Navegue até esta pasta no terminal
3. Execute:
   ```bash
   heroku login
   heroku create meu-proxy-sql
   git init
   git add .
   git commit -m "Initial commit"
   git push heroku main
   ```
4. Copie a URL: `https://meu-proxy-sql.herokuapp.com`
5. Cole no campo **Proxy URL**

### Opção 4: Servidor próprio (VPS/Cloud)

```bash
# Instalar dependências
npm install

# Rodar em produção
PORT=3000 npm start
```

Acesse via: `http://seu-servidor.com:3000`

## 🧪 Como testar localmente

```bash
# Instalar
npm install

# Rodar servidor
npm start

# Testar com curl
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{
    "server": "seu-servidor.database.windows.net",
    "database": "NomeBanco",
    "username": "usuario",
    "password": "senha",
    "query": "SELECT TOP 10 * FROM tabela",
    "params": {}
  }'
```

## 📝 Como usar

Depois de publicar:

1. Acesse seu app Lovable
2. Vá em **Configurações > Banco de Dados > Conexões**
3. Edite sua conexão SQL Server
4. Cole a URL do proxy no campo **Proxy URL**:
   - Exemplo: `https://seu-app.railway.app/query`
   - Ou: `https://seu-app.onrender.com/query`
5. Salve
6. Teste sua API Dinâmica!

## 🔒 Segurança

⚠️ **Importante**: Este proxy **não tem autenticação**. Para produção:

1. Adicione um API Key:
```javascript
const API_KEY = process.env.API_KEY || 'sua-chave-secreta';

app.post('/query', (req, res, next) => {
  const authHeader = req.headers['x-api-key'];
  if (authHeader !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

2. Configure CORS restrito (apenas seu domínio Lovable)
3. Use HTTPS (Railway/Render já fornecem)

## 📦 O que este proxy faz?

1. Recebe POST em `/query` com:
   - `server`: Servidor SQL
   - `database`: Nome do banco
   - `username`: Usuário
   - `password`: Senha
   - `query`: SQL query
   - `params`: Parâmetros opcionais

2. Conecta ao SQL Server usando `mssql`
3. Executa a query
4. Retorna JSON: `{ success: true, data: [...], rowCount: 123 }`

## 🆘 Suporte

Se tiver problemas:
- Verifique os logs no Railway/Render
- Teste localmente primeiro com `npm start`
- Confirme que o SQL Server aceita conexões externas
