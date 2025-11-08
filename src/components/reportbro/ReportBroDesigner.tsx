import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import "reportbro-designer/dist/reportbro.css";
import "./reportbro-custom.css";
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

  // Traduz tooltips e textos do ReportBro para pt-BR dinamicamente
  const translateTooltipsPtBR = () => {
    const root = containerRef.current;
    if (!root) return;
    
    const map: Record<string, string> = {
      // Toolbar
      'Save': 'Salvar', 'Open': 'Abrir', 'New': 'Novo', 'Preview': 'Visualizar', 'Print': 'Imprimir',
      'Undo': 'Desfazer', 'Redo': 'Refazer', 'Delete': 'Excluir', 'Properties': 'Propriedades',
      'Cut': 'Cortar', 'Copy': 'Copiar', 'Paste': 'Colar', 'Zoom in': 'Ampliar', 'Zoom out': 'Reduzir',
      'Zoom to fit': 'Ajustar à tela', 'Zoom 100%': 'Zoom 100%', 'Align left': 'Alinhar à esquerda',
      'Align center': 'Alinhar ao centro', 'Align right': 'Alinhar à direita', 'Align top': 'Alinhar ao topo',
      'Align bottom': 'Alinhar à base', 'Align middle': 'Alinhar ao meio',
      'Bold': 'Negrito', 'Italic': 'Itálico', 'Underline': 'Sublinhado', 'Strikethrough': 'Tachado',
      'Add text': 'Adicionar texto', 'Add image': 'Adicionar imagem', 'Add table': 'Adicionar tabela', 
      'Add line': 'Adicionar linha', 'Add page break': 'Adicionar quebra de página',
      'Add barcode': 'Adicionar código de barras', 'Add QR code': 'Adicionar QR code',
      
      // Menu lateral
      'Document': 'Documento', 'Parameters': 'Parâmetros', 'Styles': 'Estilos', 'Page': 'Página',
      'Header': 'Cabeçalho', 'Content': 'Conteúdo', 'Footer': 'Rodapé', 'Elements': 'Elementos',
      
      // Propriedades gerais
      'General': 'Geral', 'Position': 'Posição', 'Size': 'Tamanho', 'Layout': 'Layout',
      'Style': 'Estilo', 'Print if': 'Imprimir se', 'Visibility': 'Visibilidade',
      'Name': 'Nome', 'Label': 'Rótulo', 'Value': 'Valor', 'Type': 'Tipo',
      'Width': 'Largura', 'Height': 'Altura', 'X': 'X', 'Y': 'Y',
      'Left': 'Esquerda', 'Right': 'Direita', 'Top': 'Topo', 'Bottom': 'Base',
      'Padding': 'Espaçamento interno', 'Margin': 'Margem',
      
      // Texto
      'Text': 'Texto', 'Font': 'Fonte', 'Font size': 'Tamanho da fonte', 'Font style': 'Estilo da fonte',
      'Text color': 'Cor do texto', 'Background color': 'Cor de fundo', 'Alignment': 'Alinhamento',
      'Line height': 'Altura da linha', 'Letter spacing': 'Espaçamento entre letras',
      'Word spacing': 'Espaçamento entre palavras', 'Text decoration': 'Decoração do texto',
      'Text transform': 'Transformação do texto', 'White space': 'Espaço em branco',
      
      // Bordas
      'Border': 'Borda', 'Border color': 'Cor da borda', 'Border width': 'Largura da borda',
      'Border style': 'Estilo da borda', 'Border all': 'Borda completa', 'Border left': 'Borda esquerda',
      'Border right': 'Borda direita', 'Border top': 'Borda superior', 'Border bottom': 'Borda inferior',
      
      // Imagem
      'Image': 'Imagem', 'Source': 'Origem', 'Image file': 'Arquivo de imagem', 
      'Horizontal alignment': 'Alinhamento horizontal', 'Vertical alignment': 'Alinhamento vertical',
      
      // Tabela
      'Table': 'Tabela', 'Columns': 'Colunas', 'Rows': 'Linhas', 'Column': 'Coluna', 'Row': 'Linha',
      'Add column': 'Adicionar coluna', 'Add row': 'Adicionar linha', 'Delete column': 'Excluir coluna',
      'Delete row': 'Excluir linha', 'Cell': 'Célula', 'Merge cells': 'Mesclar células',
      
      // Linha
      'Line': 'Linha', 'Line color': 'Cor da linha', 'Line width': 'Largura da linha',
      
      // Barcode
      'Barcode': 'Código de barras', 'Display value': 'Exibir valor', 'Format': 'Formato',
      
      // Condições
      'Condition': 'Condição', 'Conditions': 'Condições',
      'Remove empty element': 'Remover elemento vazio', 'Shrink': 'Encolher',
      
      // Dados
      'Data': 'Dados', 'Data source': 'Fonte de dados', 'Expression': 'Expressão',
      'Pattern': 'Padrão', 'Link': 'Link', 'Spreadsheet hide': 'Ocultar na planilha',
      
      // Página
      'Page format': 'Formato da página', 'Page width': 'Largura da página', 
      'Page height': 'Altura da página', 'Orientation': 'Orientação',
      'Portrait': 'Retrato', 'Landscape': 'Paisagem', 'Paper size': 'Tamanho do papel',
      'Unit': 'Unidade', 'Margins': 'Margens', 'Margin top': 'Margem superior',
      'Margin bottom': 'Margem inferior', 'Margin left': 'Margem esquerda',
      'Margin right': 'Margem direita',
      
      // Cabeçalho/Rodapé
      'Header size': 'Tamanho do cabeçalho', 'Footer size': 'Tamanho do rodapé',
      'Header display': 'Exibir cabeçalho', 'Footer display': 'Exibir rodapé',
      
      // Cores comuns
      'Color': 'Cor', 'Transparent': 'Transparente', 'None': 'Nenhum',
      
      // Botões de ação
      'OK': 'OK', 'Cancel': 'Cancelar', 'Apply': 'Aplicar', 'Close': 'Fechar',
      'Add': 'Adicionar', 'Remove': 'Remover', 'Edit': 'Editar', 'Select': 'Selecionar',
      'Browse': 'Procurar', 'Upload': 'Enviar', 'Download': 'Baixar', 'Clear': 'Limpar',
      
      // Mensagens
      'Are you sure?': 'Tem certeza?', 'Confirm': 'Confirmar', 'Error': 'Erro',
      'Warning': 'Aviso', 'Info': 'Informação', 'Success': 'Sucesso',
      
      // Outros
      'Grid': 'Grade', 'Snap to grid': 'Ajustar à grade', 'Show grid': 'Mostrar grade',
      'Grid size': 'Tamanho da grade', 'Visible': 'Visível', 'Hidden': 'Oculto',
      'Enabled': 'Habilitado', 'Disabled': 'Desabilitado', 'Yes': 'Sim', 'No': 'Não',
      'Always': 'Sempre', 'Never': 'Nunca', 'Auto': 'Automático'
    };
    
    // Traduz atributos title e alt
    root.querySelectorAll('[title], [alt]').forEach((el) => {
      const title = (el as HTMLElement).getAttribute('title');
      const alt = (el as HTMLElement).getAttribute('alt');
      
      if (title) {
        const translated = map[title.trim()];
        if (translated) (el as HTMLElement).setAttribute('title', translated);
      }
      
      if (alt) {
        const translated = map[alt.trim()];
        if (translated) (el as HTMLElement).setAttribute('alt', translated);
      }
    });
    
    // Traduz textos visíveis (labels, botões, etc)
    root.querySelectorAll('label, button, span, div').forEach((el) => {
      const text = (el as HTMLElement).textContent?.trim();
      if (text && map[text]) {
        (el as HTMLElement).textContent = map[text];
      }
    });
    
    // Traduz opções de select
    root.querySelectorAll('select option').forEach((el) => {
      const text = (el as HTMLElement).textContent?.trim();
      if (text && map[text]) {
        (el as HTMLElement).textContent = map[text];
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

      // Traduz tooltips após carregamento inicial
      setTimeout(() => {
        translateTooltipsPtBR();
      }, 500);
      
      // Observa mudanças no DOM para traduzir elementos carregados dinamicamente
      const observer = new MutationObserver(() => {
        translateTooltipsPtBR();
      });
      
      if (containerRef.current) {
        observer.observe(containerRef.current, {
          childList: true,
          subtree: true,
          attributes: false
        });
      }

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
        translateTooltipsPtBR();
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
