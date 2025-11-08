# Arquivos do FastReport Designer

## 📁 Estrutura necessária

Copie os seguintes arquivos do FastReport Web .NET Online Designer para esta pasta:

```
public/fastreport/
├── FastReport.js          # Biblioteca principal do FastReport
├── Designer.js            # Componente do Designer
├── designer.css           # Estilos do Designer
├── fonts/                 # (opcional) Fontes
├── icons/                 # (opcional) Ícones
└── locales/               # (opcional) Arquivos de localização
    └── pt-BR.js          # Tradução para português
```

## 🔍 Onde encontrar os arquivos

### Opção 1: Instalação NuGet (Backend .NET)

Se você instalou o FastReport.Web via NuGet no seu projeto .NET:

```bash
dotnet add package FastReport.Web --version 2025.1.13-demo
```

Os arquivos estão localizados em:
```
packages/FastReport.Web.{version}/contentFiles/any/any/wwwroot/
```

### Opção 2: Download do site oficial

1. Acesse: https://www.fast-report.com/download
2. Baixe o **"FastReport Online Designer for Web Demo"**
3. Extraia o arquivo e copie o conteúdo da pasta `designer/` para `public/fastreport/`

### Opção 3: Do projeto .NET existente

Se você já tem um backend .NET com FastReport configurado:

1. Navegue até `YourProject/wwwroot/designer/`
2. Copie todos os arquivos para `public/fastreport/`

## ✅ Verificar instalação

Após copiar os arquivos, verifique se esta estrutura existe:

```
public/
└── fastreport/
    ├── FastReport.js      ✓
    ├── Designer.js        ✓
    ├── designer.css       ✓
    └── [outros arquivos]
```

## 🚀 Como usar

Após copiar os arquivos, o componente `FastReportDesigner` carregará automaticamente os scripts e inicializará o editor integrado no React.

## 🔧 Solução de problemas

### Erro: "FastReport Designer não encontrado"

**Causa**: Os arquivos JavaScript não foram carregados corretamente.

**Solução**:
1. Verifique se os arquivos estão em `public/fastreport/`
2. Limpe o cache do navegador (Ctrl+Shift+R)
3. Verifique o console do navegador para erros 404

### Erro: "Cannot read property 'Designer' of undefined"

**Causa**: A ordem de carregamento dos scripts está incorreta.

**Solução**:
1. Certifique-se de que `FastReport.js` é carregado antes de `Designer.js`
2. Verifique se não há erros de CORS (os arquivos devem estar em `public/`)

### Designer aparece em branco

**Causa**: CSS não foi carregado ou conflito de estilos.

**Solução**:
1. Verifique se `designer.css` está na pasta
2. Abra as ferramentas de desenvolvedor e inspecione erros de CSS
3. Verifique se não há conflitos com estilos do Tailwind

## 📚 Recursos adicionais

- [Documentação FastReport Web](https://www.fast-report.com/documentation/UserManFrNET-en/)
- [API Reference](https://www.fast-report.com/documentation/WebDesigner/API/)
- [Exemplos](https://github.com/FastReports/FastReport)

## ⚖️ Licença

Os arquivos do FastReport são propriedade da Fast Reports Inc.
Este diretório serve apenas como local de armazenamento para sua instalação.

Certifique-se de que você possui uma licença válida do FastReport para uso em produção.
A versão Demo é gratuita mas inclui marca d'água nos relatórios gerados.
