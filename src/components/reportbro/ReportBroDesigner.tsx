import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import "reportbro-designer/dist/reportbro.css";
import "./reportbro-logos.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataSourceConfigurator } from "@/components/report/DataSourceConfigurator";

interface ReportBroDesignerProps {
  reportId: string | null;
  onClose: () => void;
}

export function ReportBroDesigner({ reportId, onClose }: ReportBroDesignerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reportBroRef = useRef<any>(null);
const [isLoaded, setIsLoaded] = useState(false);
  const [showDsDialog, setShowDsDialog] = useState(false);
  const [initialSources, setInitialSources] = useState<any[]>([]);
  const [currentSources, setCurrentSources] = useState<any[]>([]);
  const [applying, setApplying] = useState(false);

  // Traduz interface do ReportBro para pt-BR dinamicamente
  const translateInterfacePtBR = () => {
    const root = containerRef.current;
    if (!root) return;
    
    // Mapa completo de traduções
    const translationMap: Record<string, string> = {
      // Toolbar e ações
      'Save': 'Salvar', 'Open': 'Abrir', 'New': 'Novo', 'Preview': 'Visualizar', 'Print': 'Imprimir',
      'Undo': 'Desfazer', 'Redo': 'Refazer', 'Delete': 'Excluir', 'Properties': 'Propriedades',
      'Cut': 'Cortar', 'Copy': 'Copiar', 'Paste': 'Colar', 'Duplicate': 'Duplicar',
      'Zoom in': 'Ampliar', 'Zoom out': 'Reduzir', 'Zoom to fit': 'Ajustar à tela', 'Zoom 100%': 'Zoom 100%',
      'Align left': 'Alinhar à esquerda', 'Align center': 'Alinhar ao centro', 'Align right': 'Alinhar à direita',
      'Align top': 'Alinhar acima', 'Align middle': 'Alinhar no meio', 'Align bottom': 'Alinhar abaixo',
      'Bold': 'Negrito', 'Italic': 'Itálico', 'Underline': 'Sublinhado', 'Strikethrough': 'Tachado',
      
      // Elementos
      'Add text': 'Adicionar texto', 'Add image': 'Adicionar imagem', 'Add table': 'Adicionar tabela',
      'Add line': 'Adicionar linha', 'Add page break': 'Adicionar quebra de página',
      'Add bar code': 'Adicionar código de barras', 'Add frame': 'Adicionar moldura',
      'Add section': 'Adicionar seção', 'Text': 'Texto', 'Image': 'Imagem', 'Table': 'Tabela',
      'Line': 'Linha', 'Page break': 'Quebra de página', 'Bar code': 'Código de barras',
      'Frame': 'Moldura', 'Section': 'Seção',
      
      // Propriedades
      'General': 'Geral', 'Position': 'Posição', 'Size': 'Tamanho', 'Style': 'Estilo',
      'Font': 'Fonte', 'Color': 'Cor', 'Background': 'Fundo', 'Border': 'Borda',
      'Padding': 'Espaçamento interno', 'Margin': 'Margem', 'Width': 'Largura', 'Height': 'Altura',
      'X': 'X', 'Y': 'Y', 'Name': 'Nome', 'Content': 'Conteúdo', 'Source': 'Origem',
      'Expression': 'Expressão', 'Pattern': 'Padrão', 'Format': 'Formato',
      
      // Alinhamento e formatação
      'Left': 'Esquerda', 'Center': 'Centro', 'Right': 'Direita', 'Top': 'Topo',
      'Middle': 'Meio', 'Bottom': 'Inferior', 'Justify': 'Justificar',
      'Text align': 'Alinhamento do texto', 'Vertical align': 'Alinhamento vertical',
      
      // Tipos e valores
      'Type': 'Tipo', 'Value': 'Valor', 'Default': 'Padrão', 'None': 'Nenhum',
      'Visible': 'Visível', 'Printable': 'Imprimível', 'Remove row if empty': 'Remover linha se vazia',
      
      // Parâmetros e dados
      'Parameters': 'Parâmetros', 'Parameter': 'Parâmetro', 'Data': 'Dados', 'Data source': 'Fonte de dados',
      'Field': 'Campo', 'Fields': 'Campos', 'Add parameter': 'Adicionar parâmetro',
      'Edit parameter': 'Editar parâmetro', 'Delete parameter': 'Excluir parâmetro',
      
      // Estilos
      'Styles': 'Estilos', 'Add style': 'Adicionar estilo', 'Edit style': 'Editar estilo',
      'Delete style': 'Excluir estilo', 'Apply style': 'Aplicar estilo',
      
      // Página e layout
      'Page': 'Página', 'Page format': 'Formato da página', 'Page size': 'Tamanho da página',
      'Orientation': 'Orientação', 'Portrait': 'Retrato', 'Landscape': 'Paisagem',
      'Header': 'Cabeçalho', 'Footer': 'Rodapé', 'Content band': 'Banda de conteúdo',
      'Margins': 'Margens', 'Page header': 'Cabeçalho da página', 'Page footer': 'Rodapé da página',
      
      // Mensagens e ações
      'Are you sure?': 'Tem certeza?', 'Yes': 'Sim', 'No': 'Não', 'Cancel': 'Cancelar',
      'OK': 'OK', 'Apply': 'Aplicar', 'Close': 'Fechar', 'Add': 'Adicionar',
      'Edit': 'Editar', 'Remove': 'Remover', 'Search': 'Buscar', 'Filter': 'Filtrar',
      
      // Erros e validações
      'Error': 'Erro', 'Warning': 'Aviso', 'Info': 'Informação', 'Required': 'Obrigatório',
      'Invalid value': 'Valor inválido', 'Field is required': 'Campo obrigatório',
      
      // Unidades
      'px': 'px', 'mm': 'mm', 'cm': 'cm', 'inch': 'polegada',
      
      // Tabela
      'Columns': 'Colunas', 'Rows': 'Linhas', 'Add column': 'Adicionar coluna',
      'Add row': 'Adicionar linha', 'Delete column': 'Excluir coluna', 'Delete row': 'Excluir linha',
      'Cell': 'Célula', 'Merge cells': 'Mesclar células', 'Split cell': 'Dividir célula',
      
      // Código de barras
      'Barcode type': 'Tipo de código de barras', 'Display value': 'Exibir valor',
      'Code': 'Código', 'EAN-13': 'EAN-13', 'QR Code': 'QR Code',
      
      // Seções e agrupamento
      'Group': 'Grupo', 'Grouping': 'Agrupamento', 'Group expression': 'Expressão de grupo',
      'Sort': 'Ordenar', 'Sort order': 'Ordem de classificação', 'Ascending': 'Crescente',
      'Descending': 'Decrescente', 'Group header': 'Cabeçalho do grupo', 'Group footer': 'Rodapé do grupo',
      
      // Condicionais
      'Condition': 'Condição', 'If': 'Se', 'Then': 'Então', 'Else': 'Senão',
      'Show if': 'Mostrar se', 'Print if': 'Imprimir se',
      
      // Layout e organização
      'Bring to front': 'Trazer para frente', 'Send to back': 'Enviar para trás',
      'Bring forward': 'Avançar', 'Send backward': 'Recuar', 'Group elements': 'Agrupar elementos',
      'Ungroup elements': 'Desagrupar elementos', 'Lock': 'Bloquear', 'Unlock': 'Desbloquear',
      
      // Formatação numérica
      'Number format': 'Formato numérico', 'Decimal places': 'Casas decimais',
      'Thousand separator': 'Separador de milhares', 'Currency': 'Moeda',
      'Percentage': 'Porcentagem', 'Date format': 'Formato de data', 'Time format': 'Formato de hora',
      
      // Imagem
      'Image file': 'Arquivo de imagem', 'Image URL': 'URL da imagem', 'Fit': 'Ajustar',
      'Stretch': 'Esticar', 'Original size': 'Tamanho original', 'Horizontal alignment': 'Alinhamento horizontal',
      'Vertical alignment': 'Alinhamento vertical',
      
      // Diversos
      'Units': 'Unidades', 'Show grid': 'Mostrar grade', 'Snap to grid': 'Alinhar à grade',
      'Grid size': 'Tamanho da grade', 'Show ruler': 'Mostrar régua', 'Show guides': 'Mostrar guias',
      'Report': 'Relatório', 'Document': 'Documento', 'Settings': 'Configurações',
      'Help': 'Ajuda', 'About': 'Sobre', 'Version': 'Versão',
      
      // Específicos do ReportBro
      'Element': 'Elemento', 'Elements': 'Elementos', 'Document properties': 'Propriedades do documento',
      'Report properties': 'Propriedades do relatório', 'Show borders': 'Mostrar bordas',
      'Always print on same page': 'Sempre imprimir na mesma página',
      'Shrink to content height': 'Reduzir à altura do conteúdo'
    };
    
    // Traduz atributos title
    root.querySelectorAll('[title]').forEach((el) => {
      const title = (el as HTMLElement).getAttribute('title');
      if (title && translationMap[title.trim()]) {
        (el as HTMLElement).setAttribute('title', translationMap[title.trim()]);
      }
    });
    
    // Traduz textos visíveis
    root.querySelectorAll('label, span, button, .rbroMenuItem, .rbroMenuItemText').forEach((el) => {
      const textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
      if (textNode && textNode.textContent) {
        const trimmed = textNode.textContent.trim();
        if (translationMap[trimmed]) {
          textNode.textContent = translationMap[trimmed];
        }
      }
    });
  };

  useEffect(() => {
    loadReportBro();
  }, []);

  useEffect(() => {
    if (isLoaded && reportId) {
      loadReportFromSupabase();
    }
  }, [isLoaded, reportId]);

  const loadReportBro = async () => {
    try {
      // Garante carregamento do UMD via URL gerado pelo Vite
      if (!(window as any).ReportBro) {
        const rbUrl = (await import("reportbro-designer/dist/reportbro.js?url")).default as string;
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = rbUrl;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Falha ao carregar script do ReportBro"));
          document.head.appendChild(script);
        });
      }

      const ReportBro = (window as any).ReportBro;
      if (!ReportBro) {
        throw new Error("ReportBro UMD não encontrado após importação");
      }
      
      if (!containerRef.current) return;

      // Sempre inicia com relatório vazio (sem template selection)
      const reportDefinition = getEmptyReport();

      // Destroi instância anterior se existir
      if (reportBroRef.current?.destroy) {
        try { reportBroRef.current.destroy(); } catch {}
      }

      reportBroRef.current = new ReportBro(containerRef.current, {
        reportServerUrl: "",
        locale: "pt_BR",
        saveCallback: handleSave,
        report: reportDefinition,
        showTemplateSelection: false,
      });

      // Traduz interface e configura observer para traduções dinâmicas
      setTimeout(() => {
        translateInterfacePtBR();
        
        // Observer para traduzir elementos carregados dinamicamente
        const observer = new MutationObserver(() => {
          translateInterfacePtBR();
        });
        
        if (containerRef.current) {
          observer.observe(containerRef.current, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['title']
          });
        }
      }, 500);

      setIsLoaded(true);
      toast.success("Designer carregado!");
    } catch (error) {
      console.error("Erro ao carregar ReportBro:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao carregar o designer");
    }
  };

  const loadReportFromSupabase = async () => {
    if (!reportId) return;

    try {
      const { data, error } = await supabase
        .from("relatorios")
        .select("*")
        .eq("id", reportId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Relatório não encontrado");
        return;
      }

      if (reportBroRef.current) {
        let layoutData: any = getEmptyReport();
        if (data?.layout_json) {
          try {
            const parsed = typeof data.layout_json === "string"
              ? JSON.parse(data.layout_json)
              : data.layout_json;
            
            // Valida se o objeto tem a estrutura mínima necessária
            if (parsed && typeof parsed === 'object') {
              // Garantir que docElements existe e é um array
              if (!Array.isArray(parsed.docElements)) {
                parsed.docElements = [];
              }
              if (!Array.isArray(parsed.parameters)) {
                parsed.parameters = [];
              }
              if (!Array.isArray(parsed.styles)) {
                parsed.styles = [];
              }
              layoutData = parsed;
            }
          } catch (e) {
            console.warn("Layout inválido, carregando vazio.", e);
          }
        }
        try {
          reportBroRef.current.load(layoutData);
          toast.success("Relatório carregado!");
        } catch (e) {
          console.warn("Falha ao carregar layout do banco, usando layout vazio.", e);
          try {
            reportBroRef.current.load(getEmptyReport());
            toast.message("Layout inválido: carregado modelo vazio");
          } catch (e2) {
            console.error("Erro ao aplicar layout vazio:", e2);
          }
        }
        translateInterfacePtBR();
      }

      // Prepara fontes iniciais a partir das colunas do relatório
      const initSources: any[] = [];
      if (data?.conexao_id || data?.query_sql) {
        initSources.push({
          id: "ds-main",
          name: "Principal",
          connectionId: data?.conexao_id || "",
          query: data?.query_sql || "",
          fields: []
        });
      }
      setInitialSources(initSources);
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      toast.error("Erro ao carregar relatório");
    }
  };

  const handleSave = async () => {
    if (!reportBroRef.current || !reportId) return;

    try {
      const reportData = reportBroRef.current.getReport();
      
      const { error } = await supabase
        .from("relatorios")
        .update({
          layout_json: reportData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (error) throw error;

      toast.success("Relatório salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar relatório");
    }
  };

  const handlePreview = () => {
    if (!reportBroRef.current) return;
    
    try {
      const reportData = reportBroRef.current.getReport();
      localStorage.setItem("reportbro_preview", JSON.stringify(reportData));
      window.open("/relatorios/viewer", "_blank");
      toast.success("Abrindo visualização...");
    } catch (error) {
      console.error("Erro ao visualizar:", error);
      toast.error("Erro ao abrir visualização");
    }
  };

  const handleExportPDF = async () => {
    if (!reportBroRef.current) return;

    try {
      const reportData = reportBroRef.current.getReport();
      const errors = reportBroRef.current.getErrors();
      
      if (errors.length > 0) {
        toast.error("Corrija os erros no relatório antes de exportar");
        return;
      }

      toast.info("Exportação PDF em desenvolvimento - use a visualização");
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar PDF");
    }
  };

  const applyDataSources = async () => {
    if (!reportId) return;
    try {
      setApplying(true);
      const main = currentSources[0];
      const updates: any = {};
      if (main) {
        updates.conexao_id = main.connectionId || null;
        updates.query_sql = main.query || "";
      }
      const { error } = await supabase
        .from("relatorios")
        .update(updates)
        .eq("id", reportId);
      if (error) throw error;
      toast.success("Fontes aplicadas ao relatório");
      setShowDsDialog(false);
    } catch (error: any) {
      console.error("Erro ao aplicar fontes:", error);
      toast.error("Erro ao aplicar fontes: " + error.message);
    } finally {
      setApplying(false);
    }
  };

  const getEmptyReport = () => ({
    docElements: [
      {
        id: 1,
        type: "text",
        content: "Novo Relatório",
        x: 100,
        y: 100,
        width: 200,
        height: 30,
      }
    ],
    parameters: [],
    styles: [],
    version: 3,
  });

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Designer Container - ReportBro com toolbar padrão */}
      <div className="flex-1 relative overflow-hidden">
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-md z-10">
            <div className="text-center p-8 rounded-2xl bg-card shadow-2xl border">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-6"></div>
              <p className="text-lg font-semibold text-foreground mb-2">Carregando designer...</p>
              <p className="text-sm text-muted-foreground">Preparando ambiente de relatórios</p>
            </div>
          </div>
        )}
        <div ref={containerRef} className="rb-host w-full h-full" />
      </div>
      <Dialog open={showDsDialog} onOpenChange={setShowDsDialog}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Fontes de Dados do Relatório</DialogTitle>
          </DialogHeader>
          {reportId ? (
            <div className="h-[70vh]">
              <DataSourceConfigurator
                reportId={reportId}
                initialDataSources={initialSources}
                onDataSourcesChange={setCurrentSources}
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Salve o relatório para configurar as fontes de dados.
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDsDialog(false)}>Fechar</Button>
            <Button onClick={applyDataSources} disabled={applying || !reportId}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
