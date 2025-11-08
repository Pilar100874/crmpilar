# 📊 Guia ReportBro Designer

## ✅ O que é ReportBro?

**ReportBro** é um designer de relatórios **open source** totalmente integrado ao seu sistema React.

### Vantagens:
- ✅ **100% Open Source** - Gratuito e sem limitações
- ✅ **Totalmente integrado** - Não precisa de arquivos externos
- ✅ **Já instalado** - Funcionando e pronto para usar
- ✅ **Interface visual** - Drag & drop para criar relatórios
- ✅ **Exportação PDF** - Gera PDFs diretamente no navegador
- ✅ **Suporte a dados** - Conecta com banco de dados via Supabase

## 🚀 Como Usar

### 1. Criar um Novo Relatório

1. Acesse **Relatórios** no menu principal (`/relatorios`)
2. Clique em **"Novo Modelo"**
3. Preencha nome e descrição
4. O designer abrirá automaticamente

### 2. Designer de Relatórios

O designer tem 3 áreas principais:

**Barra Superior:**
- 💾 **Salvar** - Salva o layout no banco de dados
- 👁️ **Preview** - Visualiza o relatório em nova aba
- 🗄️ **Dados** - Configura fontes de dados (SQL)
- ❌ **Fechar** - Fecha o designer

**Painel Esquerdo:**
- Elementos disponíveis (texto, imagens, tabelas, etc.)
- Arraste e solte no canvas

**Canvas Central:**
- Área de design do relatório
- Clique para selecionar elementos
- Arraste para posicionar

**Painel Direito:**
- Propriedades do elemento selecionado
- Ajuste fonte, cores, alinhamento, etc.

### 3. Adicionar Dados ao Relatório

1. Clique no botão **"Dados"** na barra superior
2. Configure sua conexão com o banco de dados
3. Escreva consulta SQL (ex: `SELECT * FROM vendas`)
4. Teste a consulta
5. Clique em **"Aplicar"**

Agora você pode usar campos de dados nos elementos do relatório usando `${campo_nome}`.

### 4. Visualizar e Exportar

- **Preview**: Botão "👁️ Preview" abre visualização em nova aba
- **PDF**: Na visualização, use o recurso de impressão do navegador (Ctrl+P)

## 📦 Componentes Disponíveis

O ReportBro oferece:

- **Texto** - Textos estáticos e dinâmicos
- **Imagem** - Logotipos e gráficos
- **Linha** - Separadores visuais
- **Tabela** - Dados tabulares com cabeçalhos
- **Banda de Dados** - Repetição de dados do banco
- **Gráficos** - Barras, linhas, pizza (via configuração)
- **Código de Barras** - QR Code, EAN, etc.

## 🔧 Configurações Avançadas

### Fontes de Dados SQL

Exemplo de query para relatório de vendas:

```sql
SELECT 
  v.id,
  v.data_venda,
  v.valor_total,
  c.nome as cliente_nome,
  c.email as cliente_email
FROM vendas v
INNER JOIN clientes c ON v.cliente_id = c.id
WHERE v.data_venda >= '2024-01-01'
ORDER BY v.data_venda DESC
```

### Campos Dinâmicos

No texto, use variáveis:
- `${cliente_nome}` - Substitui pelo valor da coluna
- `${valor_total}` - Exibe valor formatado
- `${data_venda}` - Data formatada

### Expressões

ReportBro suporta expressões:
- `${valor_total * 1.1}` - Cálculos
- `${UPPER(cliente_nome)}` - Funções de texto
- `${IF(valor > 1000, "VIP", "Normal")}` - Condicionais

## 🆚 Comparação com FastReport

| Recurso | ReportBro ✅ | FastReport ❌ |
|---------|-------------|---------------|
| Open Source | ✅ Sim | ❌ Não |
| Integrado React | ✅ Sim | ⚠️ Complicado |
| Arquivos Externos | ✅ Não precisa | ❌ Requer download |
| Licença | ✅ Grátis | 💰 Paga |
| Funcionando | ✅ Agora | ❌ Arquivos não disponíveis |

## 📚 Recursos Adicionais

- **Documentação Oficial**: https://www.reportbro.com/documentation
- **Exemplos**: https://www.reportbro.com/demo
- **GitHub**: https://github.com/jobsta/reportbro-designer

## 🎯 Próximos Passos

1. ✅ Criar seu primeiro relatório
2. ✅ Configurar fonte de dados do Supabase
3. ✅ Adicionar elementos visuais
4. ✅ Testar visualização e exportação PDF
5. 🚀 Integrar relatórios em suas telas

## ❓ Dúvidas Comuns

**P: Posso gerar PDFs no servidor?**
R: Sim! Use a biblioteca `reportbro-lib` no backend para gerar PDFs via API.

**P: Suporta gráficos?**
R: Sim, através de elementos personalizados ou integração com Chart.js.

**P: Funciona offline?**
R: Sim, o designer funciona totalmente no navegador após o carregamento inicial.

**P: Posso customizar o estilo?**
R: Sim, via `src/components/reportbro/reportbro-custom.css`.

---

**Pronto!** Você já pode criar relatórios profissionais sem depender de soluções pagas ou arquivos externos. 🎉
