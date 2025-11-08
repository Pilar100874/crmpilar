# Report Studio Demo - FastReport Web .NET Integration

## 📋 Visão Geral

O **Report Studio Demo** é uma aplicação React integrada ao FastReport Web .NET que permite criar, editar e visualizar relatórios profissionais usando o Online Designer hospedado em um backend .NET.

## 🎯 Funcionalidades

- **Lista de Relatórios** (`/report-studio/reports`): Visualize todos os relatórios disponíveis
- **Editor Online** (`/report-studio/designer/:id`): Edite relatórios usando o FastReport Online Designer em iframe
- **Visualizador** (`/report-studio/viewer/:id`): Configure parâmetros e gere PDFs dos relatórios

## ⚙️ Configuração do Frontend (React)

### 1. Variável de Ambiente

Crie ou edite o arquivo `.env` na raiz do projeto e adicione:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Substitua pela URL do seu backend .NET.

### 2. Instalação de Dependências

As dependências necessárias já estão instaladas:
- `axios` - Cliente HTTP para comunicação com a API
- `react-router-dom` - Roteamento
- `sonner` - Notificações toast

## 🖥️ Configuração do Backend (.NET)

### 1. Instalar FastReport Web .NET Demo

```bash
dotnet add package FastReport.Web --version 2025.1.13-demo
```

### 2. Baixar o Online Designer

1. Acesse: https://www.fast-report.com/download
2. Baixe o pacote **"FastReport Online Designer for Web Demo"**
3. Extraia e copie a pasta `designer/` para `wwwroot/` do seu projeto ASP.NET Core

### 3. Configurar Startup/Program.cs

```csharp
using FastReport.Web;

var builder = WebApplication.CreateBuilder(args);

// Adicionar FastReport
builder.Services.AddFastReport();

// Configurar CORS para o frontend React
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors();
app.UseStaticFiles(); // Necessário para servir a pasta designer/

// ... resto da configuração
```

### 4. Implementar as Rotas da API

#### 4.1. GET /api/reports - Listar Relatórios

```csharp
app.MapGet("/api/reports", () =>
{
    // Retornar lista de relatórios do banco de dados
    var reports = new[]
    {
        new { Id = "1", Name = "Relatório de Vendas", Description = "Análise mensal de vendas", CreatedAt = DateTime.Now },
        new { Id = "2", Name = "Relatório de Estoque", Description = "Situação atual do estoque", CreatedAt = DateTime.Now }
    };
    return Results.Ok(reports);
});
```

#### 4.2. GET /api/reports/:id - Buscar Relatório

```csharp
app.MapGet("/api/reports/{id}", (string id) =>
{
    // Buscar relatório específico do banco
    var report = new { Id = id, Name = "Relatório de Vendas", Description = "...", FrxContent = "..." };
    return Results.Ok(report);
});
```

#### 4.3. PUT /api/reports/:id - Atualizar Relatório

```csharp
app.MapPut("/api/reports/{id}", async (string id, HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();
    var data = JsonSerializer.Deserialize<Dictionary<string, string>>(body);
    
    var frxContent = data["frxContent"];
    
    // Salvar o conteúdo .frx no banco de dados
    // await SaveReportAsync(id, frxContent);
    
    return Results.Ok(new { Message = "Relatório atualizado com sucesso" });
});
```

#### 4.4. POST /api/reports/:id/render - Gerar PDF

```csharp
app.MapPost("/api/reports/{id}/render", async (string id, string format, HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    var parametersJson = await reader.ReadToEndAsync();
    var parameters = JsonSerializer.Deserialize<Dictionary<string, object>>(parametersJson);
    
    // Carregar o relatório .frx do banco de dados
    var frxContent = await LoadReportContentAsync(id);
    
    using var report = new Report();
    report.Load(new MemoryStream(Encoding.UTF8.GetBytes(frxContent)));
    
    // Aplicar parâmetros
    if (parameters != null)
    {
        foreach (var param in parameters)
        {
            report.SetParameterValue(param.Key, param.Value);
        }
    }
    
    // Preparar e gerar o relatório
    report.Prepare();
    
    using var ms = new MemoryStream();
    
    if (format == "pdf")
    {
        var pdfExport = new PDFExport();
        report.Export(pdfExport, ms);
    }
    
    ms.Position = 0;
    return Results.File(ms.ToArray(), "application/pdf", $"relatorio_{id}.pdf");
});
```

#### 4.5. GET /designer - Inicializar Online Designer

```csharp
app.MapGet("/designer", async (HttpContext context, string? reportId) =>
{
    string frxContent = "";
    
    if (!string.IsNullOrEmpty(reportId))
    {
        // Carregar relatório existente
        frxContent = await LoadReportContentAsync(reportId);
    }
    else
    {
        // Relatório em branco
        frxContent = @"<?xml version=""1.0"" encoding=""utf-8""?>
<Report ScriptLanguage=""CSharp"">
  <ReportPage Name=""Page1"">
  </ReportPage>
</Report>";
    }
    
    // Retornar HTML com o designer inicializado
    var html = $@"
<!DOCTYPE html>
<html>
<head>
    <title>FastReport Online Designer</title>
    <link rel=""stylesheet"" href=""/designer/designer.css"" />
    <script src=""/designer/designer.js""></script>
</head>
<body>
    <div id=""designer""></div>
    <script>
        var designer = new FastReportDesigner({{
            containerId: 'designer',
            report: `{frxContent}`,
            saveUrl: '/api/reports/{reportId}'
        }});
    </script>
</body>
</html>";
    
    return Results.Content(html, "text/html");
});
```

### 5. Estrutura de Banco de Dados Sugerida

```sql
CREATE TABLE Reports (
    Id VARCHAR(50) PRIMARY KEY,
    Name VARCHAR(200) NOT NULL,
    Description TEXT,
    FrxContent TEXT NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
```

## 🚀 Como Usar

### 1. Iniciar o Backend .NET

```bash
cd YourBackendProject
dotnet run
```

O backend deve estar rodando em `http://localhost:5000` (ou a porta configurada).

### 2. Iniciar o Frontend React (Lovable)

O frontend já está configurado e rodando automaticamente no Lovable.

### 3. Acessar o Report Studio Demo

1. Acesse a página **Relatórios** no sistema
2. Clique no botão **"Report Studio Demo"**
3. Você será redirecionado para `/report-studio/reports`

### 4. Criar um Novo Relatório

1. Clique em **"Novo Relatório"**
2. O Online Designer será aberto em iframe
3. Desenhe seu relatório usando as ferramentas visuais
4. Clique em **"Salvar"** para persistir o relatório

### 5. Editar um Relatório Existente

1. Na lista de relatórios, clique em **"Editar"**
2. O designer abrirá com o relatório carregado
3. Faça suas alterações
4. Clique em **"Salvar"**

### 6. Gerar PDF

1. Na lista de relatórios, clique em **"Visualizar"**
2. Preencha os parâmetros necessários (ex: datas, categorias)
3. Clique em **"Gerar PDF"**
4. O PDF será baixado automaticamente

## 📁 Arquivos Criados

### Frontend (React)
- `src/api/reportClient.ts` - Cliente HTTP para API
- `src/pages/ReportStudioDemo/index.tsx` - Layout principal
- `src/pages/ReportStudioDemo/ReportsList.tsx` - Lista de relatórios
- `src/pages/ReportStudioDemo/DesignerPage.tsx` - Página do editor
- `src/pages/ReportStudioDemo/ViewerPage.tsx` - Página de visualização
- `.env.example` - Exemplo de configuração

### Rotas Adicionadas
- `/report-studio/reports` - Lista de relatórios
- `/report-studio/designer/:id` - Editor (id ou "new")
- `/report-studio/viewer/:id` - Visualizador

## 🔧 Solução de Problemas

### CORS Error
Se você receber erros de CORS, certifique-se de que:
1. O backend está configurado para aceitar requisições do frontend
2. A URL em `VITE_API_BASE_URL` está correta
3. O backend está rodando

### Designer não carrega
1. Verifique se a pasta `designer/` está em `wwwroot/`
2. Confirme que `app.UseStaticFiles()` está configurado
3. Verifique o console do navegador para erros

### Erro ao Salvar
1. Verifique se a rota PUT `/api/reports/:id` está implementada
2. Confirme que o backend está recebendo o conteúdo .frx
3. Verifique logs do backend para erros

## 📚 Recursos Adicionais

- [Documentação FastReport Web](https://www.fast-report.com/documentation/UserManFrNET-en/)
- [FastReport Online Designer Guide](https://www.fast-report.com/documentation/WebDesigner/)
- [Exemplos FastReport .NET](https://github.com/FastReports/FastReport)

## 🎉 Pronto!

Seu Report Studio Demo está configurado e pronto para uso. Agora você pode criar relatórios profissionais com interface visual e gerar PDFs dinamicamente!
