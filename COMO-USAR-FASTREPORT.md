# 🚀 Como Usar o FastReport Integrado

## ✅ O que foi feito

O **FastReport Designer agora está 100% integrado no React** - sem iframe, sem chamadas externas!

- ✅ Editor carrega diretamente no navegador
- ✅ Performance superior
- ✅ Controle total do componente
- ✅ Interface nativa do React

## 📦 Passo a Passo Rápido

### 1️⃣ Copiar Arquivos do FastReport

**IMPORTANTE**: Você precisa copiar os arquivos JavaScript do FastReport para a pasta `public/fastreport/`

```
public/fastreport/
├── FastReport.js       ← Biblioteca principal
├── Designer.js         ← Componente do designer
├── designer.css        ← Estilos
└── [outros arquivos]   ← Fontes, ícones, locales, etc.
```

#### 📂 Onde encontrar esses arquivos?

**Opção A: Download Oficial**
1. Acesse: https://www.fast-report.com/download
2. Baixe "FastReport Online Designer for Web Demo"
3. Extraia e copie a pasta `designer/` para `public/fastreport/`

**Opção B: Do seu projeto .NET**
Se você já tem um projeto .NET com FastReport instalado:
```bash
# Copie de:
YourProject/wwwroot/designer/*

# Para:
public/fastreport/*
```

**Opção C: Pacote NuGet**
Se você instalou via NuGet:
```bash
packages/FastReport.Web.{version}/contentFiles/any/any/wwwroot/
```

### 2️⃣ Configurar Backend .NET (Opcional)

O backend é necessário apenas para **salvar** e **gerar PDFs**. 

Configure o arquivo `.env`:
```env
VITE_API_BASE_URL=http://localhost:5000
```

Veja `README-REPORTSTUDIO.md` para detalhes completos do backend.

### 3️⃣ Acessar o Sistema

1. Vá para a página **Relatórios**
2. Clique em **"Report Studio Demo"**
3. O editor já está pronto para uso!

## 🎨 Como Funciona

### Componente Principal
```tsx
// src/components/fastreport/FastReportDesigner.tsx
<FastReportDesigner
  reportId="123"
  initialReport={xmlContent}
  onSave={(content) => saveToBackend(content)}
  onClose={() => navigate('/reports')}
/>
```

### Fluxo de Funcionamento

1. **Carregamento**: Scripts do FastReport são carregados dinamicamente
2. **Inicialização**: Designer é criado no container React
3. **Edição**: Usuário trabalha no relatório visualmente
4. **Salvamento**: Conteúdo .frx é enviado via callback `onSave`
5. **Persistência**: Backend salva no banco de dados

## 🔍 Verificar se Funciona

Após copiar os arquivos, abra o console do navegador (F12) e verifique:

✅ **Sucesso**: "Editor carregado com sucesso"
❌ **Erro**: "FastReport Designer não encontrado" → Arquivos não foram copiados

## 🛠️ Solução de Problemas

### Erro: "Arquivos do FastReport não encontrados"

**Problema**: Você não copiou os arquivos para `public/fastreport/`

**Solução**:
1. Vá para `public/fastreport/`
2. Copie os arquivos do FastReport (veja seção 1️⃣)
3. Recarregue a página (F5)

### Editor aparece em branco

**Problema**: Scripts carregaram mas falharam na inicialização

**Solução**:
1. Abra o Console (F12) → aba Console
2. Veja mensagens de erro
3. Geralmente é falta de algum arquivo auxiliar (fontes, ícones)

### Botão "Salvar" não funciona

**Problema**: Backend não está configurado ou não está rodando

**Solução**:
1. Verifique se `VITE_API_BASE_URL` está correto no `.env`
2. Confirme que o backend .NET está rodando
3. Teste a API: `GET http://localhost:5000/api/reports`

## 📚 Arquivos Criados

- ✅ `src/components/fastreport/FastReportDesigner.tsx` - Componente integrado
- ✅ `src/pages/ReportStudioDemo/DesignerPage.tsx` - Página que usa o componente
- ✅ `public/fastreport/` - Pasta para arquivos JavaScript (você precisa preencher)
- ✅ `public/fastreport/README.md` - Instruções detalhadas

## 💡 Vantagens dessa Abordagem

| Antes (iframe) | Agora (integrado) |
|----------------|-------------------|
| Dependência externa | 100% local |
| Comunicação complexa | API simples |
| Sandbox limitado | Controle total |
| Lento | Rápido |
| Difícil debug | Fácil debug |

## 🎯 Próximos Passos

1. ✅ Copie os arquivos do FastReport para `public/fastreport/`
2. ✅ Configure o backend .NET (se quiser salvar/gerar PDFs)
3. ✅ Acesse o Report Studio Demo
4. ✅ Crie seu primeiro relatório!

---

**Dúvidas?** Veja a documentação completa em `README-REPORTSTUDIO.md`

**Problemas?** Abra o Console (F12) e verifique os erros
