# 📥 Onde Baixar os Arquivos do FastReport Designer

## ❌ Problema Comum

O link "Online Designer" na página de downloads **NÃO baixa arquivos** - ele apenas abre uma demonstração online do editor.

## ✅ Soluções Práticas

### **Opção 1: Baixar Trial WinForms** (Mais Fácil)

1. Acesse: https://www.fast-report.com/downloads/fast-report-net

2. Baixe o primeiro arquivo da lista:
   ```
   Trial version WinForms, WPF, Avalonia, Mono for Windows
   Data: 2025-07-04
   Tamanho: ~15 MB
   ```

3. Extraia o arquivo .zip

4. Navegue até a pasta de demos:
   ```
   FastReport.Net.Demo/
   └── Demos/
       └── Reports/
           └── Web/
               └── wwwroot/
                   ├── FastReport.js
                   ├── Designer.js
                   ├── designer.css
                   └── [outros arquivos]
   ```

5. **Copie** todo o conteúdo de `wwwroot/` para `public/fastreport/` do seu projeto React

### **Opção 2: Instalar via NuGet no Backend .NET**

Se você já tem um projeto .NET:

```bash
cd YourBackendProject
dotnet add package FastReport.Web --version 2025.1.13-demo
```

Os arquivos estarão em:
```
YourBackendProject/
└── obj/
    └── project.assets.json (veja onde o NuGet instalou)
    
Ou procure em:
packages/FastReport.Web.2025.1.13-demo/
└── contentFiles/
    └── any/
        └── any/
            └── wwwroot/
```

Copie o conteúdo de `wwwroot/` para `public/fastreport/`

### **Opção 3: Usar apenas o Backend .NET** (Alternativa Simples)

Se a integração direta no React está difícil, você pode usar o FastReport apenas no backend:

1. **Backend .NET** hospeda o designer e serve via iframe
2. **Frontend React** apenas mostra o iframe
3. Comunicação via API para salvar relatórios

Veja `README-REPORTSTUDIO.md` seção "Backend Implementation" para detalhes.

### **Opção 4: Contatar Suporte FastReport**

Se você tem licença comercial ou precisa de ajuda:

📧 Email: info@fast-report.com
🌐 Site: https://www.fast-report.com/contact-us

Eles podem fornecer um link direto para download dos arquivos do Online Designer.

## 📁 Estrutura Final Esperada

Depois de copiar os arquivos, verifique:

```
public/fastreport/
├── FastReport.js          ✓
├── Designer.js            ✓
├── designer.css           ✓
├── fonts/                 ✓ (opcional)
├── icons/                 ✓ (opcional)
└── locales/               ✓ (opcional)
    └── pt-BR.js
```

## 🧪 Como Testar

1. Abra o Report Studio Demo
2. Clique em "Novo Relatório"
3. Se os arquivos estiverem corretos, o editor carregará
4. Se não, você verá a mensagem: "Arquivos do FastReport não encontrados"

## ⚠️ Importante

- **Versão Demo**: Terá marca d'água nos relatórios
- **Versão Comercial**: Requer licença válida
- **Alternativa**: Use o backend .NET para hospedar o designer (mais simples)

## 🆘 Ainda com dúvidas?

Se você está tendo dificuldades, considere usar a **abordagem com iframe** (mais simples):

1. Backend .NET hospeda o FastReport Designer
2. Frontend React mostra via iframe
3. Sem necessidade de copiar arquivos JavaScript

Isso já estava implementado na primeira versão. Posso reverter se preferir?
