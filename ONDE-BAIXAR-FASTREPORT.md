# ⚠️ Problemas com FastReport - Use ReportBro

## 🚫 Por que FastReport está difícil?

O FastReport Online Designer **NÃO está disponível publicamente** para download direto:

1. ❌ Link "Online Designer" apenas abre demo online
2. ❌ Trial WinForms vem como instalador `.exe` (não arquivos JS)
3. ❌ Arquivos JavaScript não estão no GitHub público
4. ❌ Requer licença comercial ou projeto .NET backend

## ✅ Solução Recomendada: Use ReportBro

Você **JÁ TEM** o ReportBro Designer instalado e funcionando no projeto!

### Vantagens do ReportBro:

- ✅ **100% Open Source** - Gratuito e sem limitações
- ✅ **Totalmente integrado** - Já instalado via npm
- ✅ **Funcionando agora** - Sem necessidade de arquivos externos
- ✅ **Interface visual profissional** - Drag & drop
- ✅ **Exportação PDF** - Diretamente no navegador
- ✅ **Dados do Supabase** - Conecta facilmente

### Como Usar:

1. Acesse `/relatorios` no sistema
2. Clique em "Novo Modelo"
3. O designer abrirá automaticamente
4. Crie seu relatório visualmente
5. Salve e visualize

📖 **Veja o guia completo**: `REPORTBRO-GUIDE.md`

## 🔄 Alternativas ao FastReport

Se ainda precisar do FastReport futuramente:

### Opção 1: Iframe com Backend .NET

- Backend .NET hospeda o FastReport Designer
- React mostra via iframe
- Mais simples que integração direta

### Opção 2: Licença Comercial FastReport

- Compre licença no site oficial
- Receberá arquivos JavaScript diretamente
- Suporte oficial incluso

### Opção 3: NuGet Package (Requer .NET)

```bash
dotnet add package FastReport.Web --version 2025.1.13-demo
```

Arquivos estarão em:
```
packages/FastReport.Web.{version}/contentFiles/any/any/wwwroot/
```

## 🎯 Recomendação Final

**Use o ReportBro** que já está funcionando. É uma solução profissional, open source e totalmente integrada ao seu sistema.

Se realmente precisar do FastReport no futuro, considere a abordagem com iframe (backend .NET) que é muito mais simples.

---

**Links Úteis:**
- 📘 Guia ReportBro: `REPORTBRO-GUIDE.md`
- 🌐 ReportBro Demo: https://www.reportbro.com/demo
- 📦 ReportBro GitHub: https://github.com/jobsta/reportbro-designer
