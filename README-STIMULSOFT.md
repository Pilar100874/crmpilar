# Stimulsoft Reports.JS - Guia de Configuração

Este projeto integra o **Stimulsoft Reports.JS Designer** e **Viewer** com suporte completo ao **Stimulsoft BI Cloud**.

## 📋 Recursos Implementados

- ✅ **Designer** completo com toolbar e propriedades
- ✅ **Viewer** para visualização e exportação
- ✅ **Integração com Stimulsoft BI Cloud** REST API
- ✅ **Suporte a i18n** (pt-BR)
- ✅ **Tema claro/escuro**
- ✅ **Persistência de rascunhos** (localStorage)
- ✅ **Exportação** para PDF, Excel, HTML, Word
- ✅ **Carregamento de dados externos** via JSON
- ✅ **UI responsiva** com Tailwind CSS

## 🚀 Rotas Disponíveis

- `/stimulsoft-designer` - Editor de relatórios
- `/stimulsoft-viewer` - Visualizador de relatórios

## 🔑 Configuração do Stimulsoft BI Cloud

### Passo 1: Obter Credenciais

1. Acesse [Stimulsoft Cloud](https://cloud.stimulsoft.com)
2. Crie uma conta ou faça login
3. Acesse **Settings** → **API Keys**
4. Copie sua **API Key** ou use email/senha

### Passo 2: Configurar Variáveis de Ambiente (Opcional)

Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_STIMULSOFT_CLOUD_URL=https://cloud.stimulsoft.com/api
```

### Passo 3: Fazer Login no App

1. Acesse `/stimulsoft-designer`
2. Clique em **"Login Cloud"** na sidebar
3. Digite suas credenciais:
   - **Email**: seu-email@exemplo.com
   - **Senha**: sua-senha
   - **API Key** (opcional): sua-api-key

## 📡 Stimulsoft BI Cloud REST API

### Endpoints Principais

#### 1. Login
```bash
POST https://cloud.stimulsoft.com/api/1/login
Content-Type: application/json

{
  "email": "seu-email@exemplo.com",
  "password": "sua-senha"
}

# Resposta
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 2. Listar Relatórios
```bash
GET https://cloud.stimulsoft.com/api/1/reports
Authorization: Bearer {token}

# Resposta
{
  "reports": [
    {
      "id": "abc123",
      "name": "Relatório de Vendas",
      "type": "report",
      "size": 12345,
      "modified": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### 3. Abrir Relatório
```bash
GET https://cloud.stimulsoft.com/api/1/reports/{fileId}
Authorization: Bearer {token}

# Resposta
{
  "id": "abc123",
  "name": "Relatório de Vendas",
  "content": "{JSON do relatório .mrt}"
}
```

#### 4. Salvar Novo Relatório
```bash
POST https://cloud.stimulsoft.com/api/1/reports
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Novo Relatório",
  "content": "{JSON do relatório}",
  "type": "report"
}
```

#### 5. Atualizar Relatório
```bash
PUT https://cloud.stimulsoft.com/api/1/reports/{fileId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Relatório Atualizado",
  "content": "{JSON do relatório}"
}
```

#### 6. Deletar Relatório
```bash
DELETE https://cloud.stimulsoft.com/api/1/reports/{fileId}
Authorization: Bearer {token}
```

## 📦 Estrutura do Projeto

```
src/
├── pages/
│   ├── StimulsoftDesigner.tsx    # Editor de relatórios
│   └── StimulsoftViewer.tsx      # Visualizador
├── components/
│   └── stimulsoft/
│       └── StimulsoftSidebar.tsx # Sidebar com ações
├── services/
│   └── stimulsoftCloudApi.ts     # Client da API Cloud
└── App.tsx                        # Rotas principais
```

## 🎨 Funcionalidades da Sidebar

- **Novo**: Criar novo relatório em branco
- **Login Cloud**: Autenticar no Stimulsoft BI Cloud
- **Abrir do Cloud**: Listar e abrir relatórios salvos
- **Salvar no Cloud**: Salvar relatório atual no Cloud
- **Carregar JSON Externo**: Importar dados via URL
- **Visualizar**: Abrir relatório no Viewer
- **Exportar PDF**: Exportar diretamente para PDF
- **Exportar Excel**: Exportar diretamente para Excel

## 📊 Carregar Dados Externos (JSON)

### Exemplo de URL de JSON
```
https://jsonplaceholder.typicode.com/users
```

### Como Usar:
1. Clique em **"Carregar JSON Externo"**
2. Digite a URL do JSON
3. Os dados serão adicionados ao Dictionary do relatório
4. Use no designer como fonte de dados "ExternalData"

## 🌐 Publicar no Lovable

### Opção 1: Deploy Direto
1. No Lovable, clique em **"Deploy"**
2. Escolha o ambiente (Production/Preview)
3. Aguarde o build
4. Acesse a URL fornecida

### Opção 2: Exportar para GitHub
1. Clique em **"Export to GitHub"**
2. Configure o repositório
3. Use Vercel/Netlify para deploy:
   ```bash
   npm install
   npm run build
   ```

## 🔐 Segurança

⚠️ **IMPORTANTE**: 
- Nunca compartilhe sua API Key publicamente
- Use variáveis de ambiente para credenciais
- O token é armazenado no localStorage (válido apenas no navegador do usuário)

## 📄 Licença Stimulsoft

Este projeto requer uma **licença válida do Stimulsoft**. Para usar em produção:

1. Adquira uma licença em [stimulsoft.com](https://www.stimulsoft.com/en/online-store)
2. Configure a licença no código:
   ```javascript
   Stimulsoft.Base.StiLicense.key = "SUA_CHAVE_DE_LICENCA";
   ```

### Versão de Teste
O código atual usa a versão CDN gratuita (trial) que possui limitações.

## 🆘 Troubleshooting

### CORS Error
Se encontrar erros de CORS ao conectar com o Cloud:
- Verifique se a URL da API está correta
- Confirme que o Cloud aceita requisições do seu domínio

### Relatório Não Carrega
- Verifique se o token está válido
- Confirme que o arquivo existe no Cloud
- Verifique o console do navegador para erros

### Localização Não Funciona
- Certifique-se de que o arquivo `pt-BR.xml` está acessível
- Verifique a conexão com o CDN

## 📚 Recursos Adicionais

- [Documentação Stimulsoft](https://www.stimulsoft.com/en/documentation)
- [Stimulsoft BI Cloud Docs](https://www.stimulsoft.com/en/documentation/online/bi-cloud/)
- [API Reference](https://www.stimulsoft.com/en/documentation/online/programming-manual/)
- [Exemplos](https://www.stimulsoft.com/en/samples)

## 💡 Próximos Passos

- [ ] Adicionar autenticação persistente
- [ ] Implementar cache de relatórios
- [ ] Adicionar suporte a dashboards
- [ ] Criar templates pré-configurados
- [ ] Implementar colaboração em tempo real
