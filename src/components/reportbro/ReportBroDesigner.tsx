import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { X, Save, Eye, FileDown, Database } from "lucide-react";
import "reportbro-designer/dist/reportbro.css";
// import "./reportbro-custom.css"; // desabilitado para manter a barra original do ReportBro
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

  // Traduz tooltips do ReportBro para pt-BR dinamicamente
  const translateTooltipsPtBR = () => {
    const root: ParentNode = containerRef.current || document;
    const map: Record<string, string> = {
      // === Menu Principal ===
      'File': 'Arquivo', 'Edit': 'Editar', 'View': 'Exibir', 'Help': 'Ajuda',
      'Save': 'Salvar', 'Open': 'Abrir', 'New': 'Novo', 'Preview': 'Visualizar', 'Print': 'Imprimir', 
      'Run': 'Executar', 'Undo': 'Desfazer', 'Redo': 'Refazer', 'Delete': 'Excluir', 
      'Properties': 'Propriedades', 'Cut': 'Cortar', 'Copy': 'Copiar', 'Paste': 'Colar', 
      'Close': 'Fechar', 'Settings': 'Configurações',
      
      // === Zoom / Alinhamento ===
      'Zoom in': 'Ampliar', 'Zoom out': 'Reduzir', 'Zoom to fit': 'Ajustar à tela', 
      'Zoom 100%': 'Zoom 100%', 'Zoom': 'Zoom', 'Align left': 'Alinhar à esquerda', 
      'Align center': 'Alinhar ao centro', 'Align right': 'Alinhar à direita',
      'Align top': 'Alinhar ao topo', 'Align middle': 'Alinhar ao meio', 'Align bottom': 'Alinhar à base',
      
      // === Inserir Elementos ===
      'Add text': 'Adicionar texto', 'Add image': 'Adicionar imagem', 'Add table': 'Adicionar tabela', 
      'Add line': 'Adicionar linha', 'Add rectangle': 'Adicionar retângulo', 'Add circle': 'Adicionar elipse', 
      'Add barcode': 'Adicionar código de barras',
      
      // === Grade / Organizar ===
      'Grid': 'Grade', 'Show grid': 'Mostrar grade', 'Hide grid': 'Ocultar grade', 
      'Snap to grid': 'Ajustar à grade', 'Bring to front': 'Trazer para frente', 
      'Send to back': 'Enviar para trás', 'Group': 'Agrupar', 'Ungroup': 'Desagrupar',
      'Lock': 'Bloquear', 'Unlock': 'Desbloquear',
      
      // === Estilos de Texto ===
      'Bold': 'Negrito', 'Italic': 'Itálico', 'Underline': 'Sublinhado', 'Strikethrough': 'Tachado',
      'Font': 'Fonte', 'Font size': 'Tamanho da fonte', 'Text color': 'Cor do texto', 
      'Background color': 'Cor de fundo', 'Opacity': 'Opacidade',
      
      // === Propriedades Comuns ===
      'Name': 'Nome', 'Type': 'Tipo', 'X': 'X', 'Y': 'Y', 'Width': 'Largura', 'Height': 'Altura', 
      'Color': 'Cor', 'Border': 'Borda', 'Borders': 'Bordas', 'None': 'Nenhum', 'All': 'Todos', 
      'Left': 'Esquerda', 'Right': 'Direita', 'Top': 'Superior', 'Bottom': 'Inferior', 
      'Padding': 'Preenchimento', 'Margin': 'Margem', 'Alignment': 'Alinhamento', 
      'Horizontal alignment': 'Alinhamento horizontal', 'Vertical alignment': 'Alinhamento vertical',
      'Content': 'Conteúdo', 'Image': 'Imagem', 'Table': 'Tabela', 'Row': 'Linha', 'Column': 'Coluna', 
      'Columns': 'Colunas', 'Rows': 'Linhas', 'Data source': 'Fonte de dados', 'Parameter': 'Parâmetro', 
      'Parameters': 'Parâmetros', 'Value': 'Valor', 'Values': 'Valores', 'Header': 'Cabeçalho', 
      'Footer': 'Rodapé', 'Page': 'Página', 'Report': 'Relatório', 'Detail': 'Detalhe', 
      'Preview report': 'Visualizar relatório', 'Export': 'Exportar', 'PDF': 'PDF', 'PNG': 'PNG', 'JPG': 'JPG',
      
      // === Diálogos ===
      'OK': 'OK', 'Cancel': 'Cancelar', 'Apply': 'Aplicar', 'Yes': 'Sim', 'No': 'Não', 
      'Close dialog': 'Fechar janela',
      
      // === Painel de Propriedades - Geral ===
      'Position': 'Posição', 'Size': 'Tamanho', 'Style': 'Estilo', 'Print if': 'Imprimir se', 
      'Remove empty element': 'Remover elemento vazio', 'Spreadsheet hide': 'Ocultar na planilha', 
      'Spreadsheet column': 'Coluna da planilha', 'Spreadsheet colspan': 'Mesclar colunas',
      'Spreadsheet add empty row': 'Adicionar linha vazia', 'Link': 'Link', 'Pattern': 'Padrão', 
      'Expression': 'Expressão', 'Grow weight': 'Peso de crescimento', 'Text': 'Texto', 
      'Format': 'Formato', 'Line': 'Linha', 'Line width': 'Largura da linha', 
      'Line color': 'Cor da linha', 'Line style': 'Estilo da linha', 
      'Fill': 'Preenchimento', 'Fill color': 'Cor de preenchimento',
      
      // === Elementos de Texto ===
      'Text element': 'Elemento de texto', 'Rich text': 'Texto rico', 'Eval': 'Avaliar',
      'Horizontal line': 'Linha horizontal', 'Vertical line': 'Linha vertical', 
      'Text style': 'Estilo de texto', 'Line spacing': 'Espaçamento de linha', 
      'Border width': 'Largura da borda', 'Border color': 'Cor da borda',
      'Border style': 'Estilo da borda', 'Radius': 'Raio', 'Background': 'Fundo', 
      'Line element': 'Elemento de linha',
      
      // === Imagens ===
      'Image element': 'Elemento de imagem', 'Source': 'Origem', 'Image file': 'Arquivo de imagem', 
      'Image URL': 'URL da imagem',
      
      // === Tabelas e Bandas ===
      'Table element': 'Elemento de tabela', 'Data': 'Dados', 'Print header': 'Imprimir cabeçalho', 
      'Print footer': 'Imprimir rodapé', 'Content rows': 'Linhas de conteúdo', 
      'Band element': 'Elemento de banda', 'Always print on same page': 'Sempre imprimir na mesma página', 
      'Shrink': 'Encolher',
      
      // === Código de Barras ===
      'Barcode element': 'Elemento de código de barras', 'Barcode type': 'Tipo de código de barras', 
      'Display value': 'Exibir valor',
      
      // === Moldura ===
      'Frame element': 'Elemento de moldura', 'Label': 'Rótulo',
      
      // === Seção ===
      'Section element': 'Elemento de seção', 'Section': 'Seção', 'Band': 'Banda',
      
      // === Página ===
      'Page format': 'Formato da página', 'Page width': 'Largura da página', 
      'Page height': 'Altura da página', 'Content height': 'Altura do conteúdo', 
      'Orientation': 'Orientação', 'Portrait': 'Retrato', 'Landscape': 'Paisagem',
      'Page header': 'Cabeçalho da página', 'Page footer': 'Rodapé da página', 
      'Page header size': 'Tamanho do cabeçalho', 'Page footer size': 'Tamanho do rodapé', 
      'Margin left': 'Margem esquerda', 'Margin top': 'Margem superior',
      'Margin right': 'Margem direita', 'Margin bottom': 'Margem inferior',
      
      // === Documento ===
      'Document properties': 'Propriedades do documento', 'Page size': 'Tamanho da página', 
      'Unit': 'Unidade', 'Pixels': 'Pixels', 'Millimeters': 'Milímetros', 'Inches': 'Polegadas',
      
      // === UI Geral ===
      'General': 'Geral', 'Options': 'Opções', 'Visible': 'Visível', 'Enabled': 'Habilitado',
      'Center': 'Centro', 'Middle': 'Meio', 'Justify': 'Justificar',
      'Solid': 'Sólido', 'Dashed': 'Tracejado', 'Dotted': 'Pontilhado', 'Double': 'Duplo',
      'Add': 'Adicionar', 'Remove': 'Remover', 'Up': 'Subir', 'Down': 'Descer',
      'Select': 'Selecionar', 'Upload': 'Enviar', 'Browse': 'Procurar', 'Clear': 'Limpar',
      'Insert': 'Inserir', 'Update': 'Atualizar', 'Duplicate': 'Duplicar',
      'Elements': 'Elementos', 'Layout': 'Layout', 'Design': 'Design', 
      'Advanced': 'Avançado', 'Show': 'Mostrar', 'Hide': 'Ocultar',
      
      // === Propriedades Específicas ===
      'Fixed width': 'Largura fixa', 'Minimum width': 'Largura mínima', 'Maximum width': 'Largura máxima',
      'Auto width': 'Largura automática', 'Fixed height': 'Altura fixa', 'Auto height': 'Altura automática',
      'Conditional formatting': 'Formatação condicional', 'Condition': 'Condição',
      'True': 'Verdadeiro', 'False': 'Falso', 'Sort': 'Ordenar', 'Filter': 'Filtrar',
      'Sum': 'Soma', 'Average': 'Média', 'Count': 'Contar', 'Min': 'Mínimo', 'Max': 'Máximo',
      'Group by': 'Agrupar por', 'Order by': 'Ordenar por', 'Ascending': 'Crescente', 
      'Descending': 'Decrescente', 'First': 'Primeiro', 'Last': 'Último',
      'Auto fit': 'Ajuste automático', 'Stretch': 'Esticar', 'Shrink to fit': 'Encolher para caber',
      'Keep together': 'Manter junto', 'Repeat header': 'Repetir cabeçalho',
      'Page break': 'Quebra de página', 'Before': 'Antes', 'After': 'Depois',
      'Spacing': 'Espaçamento', 'Border radius': 'Raio da borda', 'Shadow': 'Sombra',
      'Transparency': 'Transparência', 'Rotation': 'Rotação', 'Scale': 'Escala',
      'Horizontal': 'Horizontal', 'Vertical': 'Vertical', 'Diagonal': 'Diagonal'
    };

    const applyAttr = (attr: 'title' | 'aria-label' | 'data-title' | 'placeholder') => {
      root.querySelectorAll(`[${attr}]`).forEach((el) => {
        const t = (el as HTMLElement).getAttribute(attr);
        if (!t) return;
        const translated = map[t.trim()];
        if (translated) (el as HTMLElement).setAttribute(attr, translated);
      });
    };

    applyAttr('title');
    applyAttr('aria-label');
    applyAttr('data-title');
    applyAttr('placeholder');

    // Text content in visible labels/buttons/tabs
    const textSelectors = [
      '.rbroControlLabel', '.rbroSectionHeader', '.rbroToolbar button', '.rbroToolbar .rbroToolLabel',
      '.rbroButton', '.rbroMenuItem', '.rbroPropertyLabel', '.rbroTabs .rbroTab', 'label', 'th', 'td'
    ];
    root.querySelectorAll(textSelectors.join(',')).forEach((el) => {
      const node = el as HTMLElement;
      const txt = node.textContent?.trim();
      if (!txt) return;
      const translated = map[txt];
      if (translated) node.textContent = translated;
    });

    // Option elements in selects
    root.querySelectorAll('select option').forEach((opt) => {
      const o = opt as HTMLOptionElement;
      const txt = o.textContent?.trim();
      if (!txt) return;
      const translated = map[txt];
      if (translated) o.textContent = translated;
    });
  };

  const setupTranslationsObserver = () => {
    if (!containerRef.current) return;
    const observer = new MutationObserver(() => translateTooltipsPtBR());
    observer.observe(containerRef.current, { childList: true, subtree: true, attributes: true, attributeFilter: ['title','aria-label','data-title','placeholder'] });
  };

  // Aplica traduções repetidamente nos primeiros segundos (evita perder tooltips criados tardiamente)
  const startTranslationTick = () => {
    let count = 0;
    const intId = window.setInterval(() => {
      translateTooltipsPtBR();
      count++;
      if (count >= 50) window.clearInterval(intId); // ~10s cobrindo elementos tardios
    }, 200);
  };

  // Garante remoção de branding/ícone do ReportBro sem flicker
  const ensureBrandingHiddenStyle = () => {
    const id = "rb-branding-hide";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `.rbroLogo, .rbroPro, .rbro-logo, .rbro-branding,
      [class*="logo" i][class*="reportbro" i], [class*="branding" i][class*="reportbro" i],
      img[alt*="reportbro" i], img[src*="reportbro" i] {
        display: none !important; visibility: hidden !important;
      }`;
    document.head.appendChild(style);
  };

  useEffect(() => {
    ensureBrandingHiddenStyle();
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

      // Pós-carregamento: ocultar branding e traduzir
      setTimeout(() => {
        ensureBrandingHiddenStyle();
        translateTooltipsPtBR();
        setupTranslationsObserver();
        startTranslationTick();
      }, 0);

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
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header - estilo Canvas */}
      <div className="h-16 border-b flex items-center justify-between px-6 bg-card/80 backdrop-blur-md shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">R</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Designer de Relatórios</h2>
            <p className="text-xs text-muted-foreground">Crie relatórios profissionais</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            size="default" 
            variant="outline" 
            onClick={handleSave} 
            className="h-10 px-5 rounded-xl transition-all hover:scale-105 hover:shadow-md border-2"
          >
            <Save className="h-5 w-5 mr-2" />
            Salvar
          </Button>
          <Button 
            size="default" 
            variant="outline" 
            onClick={handlePreview} 
            className="h-10 px-5 rounded-xl transition-all hover:scale-105 hover:shadow-md border-2"
          >
            <Eye className="h-5 w-5 mr-2" />
            Preview
          </Button>
          <Button 
            size="default" 
            variant="outline" 
            onClick={() => setShowDsDialog(true)} 
            className="h-10 px-5 rounded-xl transition-all hover:scale-105 hover:shadow-md border-2"
          >
            <Database className="h-5 w-5 mr-2" />
            Dados
          </Button>
          <div className="w-px h-8 bg-border mx-1"></div>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={onClose} 
            className="h-10 w-10 rounded-xl transition-all hover:scale-105 hover:bg-destructive/10 hover:text-destructive" 
            title="Fechar designer"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Designer Container */}
      <div className="flex-1 relative overflow-hidden bg-muted/10">
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
