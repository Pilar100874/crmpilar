import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Save, 
  X, 
  Eye, 
  FileDown, 
  Code, 
  Database, 
  Settings,
  Type,
  Image as ImageIcon,
  Table as TableIcon,
  BarChart3,
  FileText,
  Layout,
  Grid3x3
} from "lucide-react";
import { DatabaseTableExplorer } from "@/components/report/DatabaseTableExplorer";

interface JSReportDesignerProps {
  report: {
    id: string;
    nome: string;
    descricao: string | null;
    template: any;
    database_connection_id: string | null;
  };
  onClose: () => void;
}

interface DataSource {
  id: string;
  name: string;
  query: string;
}

export function JSReportDesigner({ report, onClose }: JSReportDesignerProps) {
  const [template, setTemplate] = useState(report.template?.content || '');
  const [engine, setEngine] = useState(report.template?.engine || 'handlebars');
  const [recipe, setRecipe] = useState(report.template?.recipe || 'chrome-pdf');
  const [helpers, setHelpers] = useState(report.template?.helpers || '');
  const [dataSources, setDataSources] = useState<DataSource[]>(report.template?.dataSources || []);
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [dataSourceQuery, setDataSourceQuery] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    updatePreview();
  }, [template, engine, helpers]);

  const updatePreview = () => {
    let processedHtml = template;
    
    // Simular processamento básico de templates
    if (engine === 'handlebars') {
      // Preview básico sem dados reais
      processedHtml = template.replace(/\{\{([^}]+)\}\}/g, (match, p1) => {
        return `<span style="background: #fef3c7; padding: 2px 4px; border-radius: 3px;">${p1.trim()}</span>`;
      });
    }
    
    setPreviewHtml(processedHtml);
  };

  const handleSave = async () => {
    try {
      const updatedTemplate = {
        content: template,
        engine,
        recipe,
        helpers,
        dataSources
      };

      const { error } = await supabase
        .from('report_templates_jsreport')
        .update({ template: updatedTemplate as any })
        .eq('id', report.id);

      if (error) throw error;

      toast.success('Relatório salvo com sucesso');
    } catch (error) {
      console.error('Erro ao salvar relatório:', error);
      toast.error('Erro ao salvar relatório');
    }
  };

  const addDataSource = () => {
    if (!selectedDataSource || !dataSourceQuery) {
      toast.error('Preencha o nome e a query da fonte de dados');
      return;
    }

    const newDataSource: DataSource = {
      id: Date.now().toString(),
      name: selectedDataSource,
      query: dataSourceQuery
    };

    setDataSources([...dataSources, newDataSource]);
    setSelectedDataSource('');
    setDataSourceQuery('');
    toast.success('Fonte de dados adicionada');
  };

  const removeDataSource = (id: string) => {
    setDataSources(dataSources.filter(ds => ds.id !== id));
    toast.success('Fonte de dados removida');
  };

  const insertComponent = (componentType: string) => {
    let componentHtml = '';
    
    switch (componentType) {
      case 'text':
        componentHtml = '<p>Digite seu texto aqui</p>';
        break;
      case 'title':
        componentHtml = '<h1>Título do Relatório</h1>';
        break;
      case 'subtitle':
        componentHtml = '<h2>Subtítulo</h2>';
        break;
      case 'image':
        componentHtml = '<img src="{{imageUrl}}" alt="Imagem" style="max-width: 100%;" />';
        break;
      case 'table':
        componentHtml = `
<table style="width: 100%; border-collapse: collapse;">
  <thead>
    <tr>
      <th style="border: 1px solid #ddd; padding: 8px;">Coluna 1</th>
      <th style="border: 1px solid #ddd; padding: 8px;">Coluna 2</th>
    </tr>
  </thead>
  <tbody>
    {{#each data}}
    <tr>
      <td style="border: 1px solid #ddd; padding: 8px;">{{campo1}}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">{{campo2}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>`;
        break;
      case 'list':
        componentHtml = `
<ul>
  {{#each items}}
  <li>{{this}}</li>
  {{/each}}
</ul>`;
        break;
      case 'section':
        componentHtml = '<div style="margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb;">\n  <h3>Nova Seção</h3>\n  <p>Conteúdo da seção</p>\n</div>';
        break;
      case 'grid':
        componentHtml = `
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
  <div style="padding: 15px; border: 1px solid #e5e7eb;">
    <h4>Coluna 1</h4>
    <p>Conteúdo</p>
  </div>
  <div style="padding: 15px; border: 1px solid #e5e7eb;">
    <h4>Coluna 2</h4>
    <p>Conteúdo</p>
  </div>
</div>`;
        break;
      case 'chart':
        componentHtml = `
<!-- Para gráficos, você pode usar Chart.js ou outras bibliotecas -->
<div style="width: 100%; height: 300px; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center;">
  <p>Gráfico - Configure com biblioteca de gráficos</p>
</div>`;
        break;
    }
    
    setTemplate(prev => prev + '\n' + componentHtml);
  };

  const handleTableOrColumnClick = (tableName: string, fieldName?: string) => {
    if (fieldName) {
      // É uma coluna
      setDataSourceQuery(prev => {
        if (!prev.trim()) {
          return `SELECT ${fieldName}`;
        }
        if (prev.trim().toUpperCase().startsWith('SELECT *')) {
          return prev.replace('SELECT *', `SELECT ${fieldName}`);
        }
        if (prev.trim().toUpperCase().startsWith('SELECT')) {
          const fromIndex = prev.toUpperCase().indexOf('FROM');
          if (fromIndex !== -1) {
            const selectPart = prev.substring(0, fromIndex).trim();
            const fromPart = prev.substring(fromIndex);
            return `${selectPart}, ${fieldName}\n${fromPart}`;
          }
          return `${prev}, ${fieldName}`;
        }
        return `${prev}\nSELECT ${fieldName}`;
      });
    } else {
      // É uma tabela
      setDataSourceQuery(prev => {
        if (!prev.trim()) {
          return `SELECT * FROM ${tableName}`;
        }
        if (prev.trim().toUpperCase().startsWith('SELECT *')) {
          return prev.replace(/FROM\s+\w+/i, `FROM ${tableName}`);
        }
        return `${prev}\nFROM ${tableName}`;
      });
    }
  };

  const handleExportPDF = () => {
    toast.info('Para exportar PDF, você precisará configurar um servidor JSReport');
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 border-b bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h2 className="font-semibold">{report.nome}</h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Tools and Components */}
        <div className="w-64 border-r bg-card overflow-y-auto">
          <Tabs defaultValue="components" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="components" className="text-xs">
                <Layout className="h-3 w-3 mr-1" />
                Componentes
              </TabsTrigger>
              <TabsTrigger value="data" className="text-xs">
                <Database className="h-3 w-3 mr-1" />
                Dados
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">
                <Settings className="h-3 w-3 mr-1" />
                Config
              </TabsTrigger>
            </TabsList>

            <TabsContent value="components" className="space-y-2 p-4">
              <div className="text-xs font-semibold mb-2">Elementos Básicos</div>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => insertComponent('title')}
              >
                <Type className="h-4 w-4 mr-2" />
                Título
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => insertComponent('subtitle')}
              >
                <Type className="h-4 w-4 mr-2" />
                Subtítulo
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => insertComponent('text')}
              >
                <Type className="h-4 w-4 mr-2" />
                Texto
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => insertComponent('image')}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Imagem
              </Button>

              <div className="text-xs font-semibold mb-2 mt-4">Dados</div>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => insertComponent('table')}
              >
                <TableIcon className="h-4 w-4 mr-2" />
                Tabela
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => insertComponent('list')}
              >
                <TableIcon className="h-4 w-4 mr-2" />
                Lista
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => insertComponent('chart')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Gráfico
              </Button>

              <div className="text-xs font-semibold mb-2 mt-4">Layout</div>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => insertComponent('section')}
              >
                <Layout className="h-4 w-4 mr-2" />
                Seção
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => insertComponent('grid')}
              >
                <Grid3x3 className="h-4 w-4 mr-2" />
                Grid 2 Colunas
              </Button>
            </TabsContent>

            <TabsContent value="data" className="p-4 space-y-4">
              <div>
                <Label className="text-xs">Fontes de Dados</Label>
                <div className="space-y-2 mt-2">
                  {dataSources.map((ds) => (
                    <Card key={ds.id} className="p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{ds.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeDataSource(ds.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {ds.query}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs">Nome da Fonte</Label>
                <Input
                  value={selectedDataSource}
                  onChange={(e) => setSelectedDataSource(e.target.value)}
                  placeholder="ex: clientes"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Query SQL</Label>
                <Textarea
                  value={dataSourceQuery}
                  onChange={(e) => setDataSourceQuery(e.target.value)}
                  placeholder="SELECT * FROM tabela"
                  className="mt-1 font-mono text-xs"
                  rows={6}
                />
              </div>

              {report.database_connection_id && (
                <DatabaseTableExplorer
                  connections={[{ id: report.database_connection_id, name: 'Conexão Atual', database_type: 'SQL Server' }]}
                  onInsertField={(tableName, fieldName) => handleTableOrColumnClick(tableName, fieldName)}
                />
              )}

              <Button size="sm" onClick={addDataSource} className="w-full">
                Adicionar Fonte
              </Button>
            </TabsContent>

            <TabsContent value="settings" className="p-4 space-y-4">
              <div>
                <Label className="text-xs">Motor de Template</Label>
                <Select value={engine} onValueChange={setEngine}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="handlebars">Handlebars</SelectItem>
                    <SelectItem value="ejs">EJS</SelectItem>
                    <SelectItem value="pug">Pug</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Formato de Saída</Label>
                <Select value={recipe} onValueChange={setRecipe}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chrome-pdf">PDF (Chrome)</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="xlsx">Excel</SelectItem>
                    <SelectItem value="docx">Word</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Helpers (JavaScript)</Label>
                <Textarea
                  value={helpers}
                  onChange={(e) => setHelpers(e.target.value)}
                  placeholder="function formatDate(date) { return date; }"
                  className="mt-1 font-mono text-xs"
                  rows={8}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Center Panel - Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b bg-muted px-4 py-2">
            <Label className="text-xs">Template HTML</Label>
          </div>
          <Textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="flex-1 rounded-none border-0 font-mono text-sm resize-none"
            placeholder="Digite ou cole seu template HTML aqui..."
          />
        </div>

        {/* Right Panel - Preview */}
        <div className="w-1/2 border-l bg-card overflow-hidden flex flex-col">
          <div className="border-b bg-muted px-4 py-2 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <Label className="text-xs">Preview</Label>
          </div>
          <div className="flex-1 overflow-auto p-4 bg-white">
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
