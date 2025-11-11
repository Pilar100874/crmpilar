import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import "reportbro-designer/dist/reportbro.css";
import "./reportbro-logos.css";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { APIDataSourceSelector } from "./APIDataSourceSelector";
import { TestVariablesDialog } from "./TestVariablesDialog";
import { Globe, X, Save, FileText } from "lucide-react";

interface ReportBroDesignerProps {
  reportId: string | null;
  onClose: () => void;
}

export function ReportBroDesigner({ reportId, onClose }: ReportBroDesignerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reportBroRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showApiDialog, setShowApiDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reportName, setReportName] = useState<string>("");
  const [currentApiUrl, setCurrentApiUrl] = useState<string>("");
  const [apiHttpMethod, setApiHttpMethod] = useState<string>("GET");
  const [apiParamType, setApiParamType] = useState<string>("query");
  const [apiData, setApiData] = useState<any>(null);
  const [loadingApiData, setLoadingApiData] = useState(false);
  const [showTestVariablesDialog, setShowTestVariablesDialog] = useState(false);
  const [apiVariables, setApiVariables] = useState<Array<{ name: string; type: string }>>([]);
  const [savedApiVariables, setSavedApiVariables] = useState<Array<{ name: string; type: string; value: string }>>([]);
  const [lastApiParams, setLastApiParams] = useState<Record<string, any> | null>(null);

  // Traduz interface do ReportBro para pt-BR dinamicamente
  const translateInterfacePtBR = () => {
    const root = containerRef.current;
    if (!root) return;
    
    // Mapa COMPLETO de traduções - todos os menus e opções
    const translationMap: Record<string, string> = {
      // Toolbar e ações principais
      'Save': 'Salvar', 'Open': 'Abrir', 'New': 'Novo', 'Preview': 'Visualizar', 'Print': 'Imprimir',
      'Undo': 'Desfazer', 'Redo': 'Refazer', 'Delete': 'Excluir', 'Properties': 'Propriedades',
      'Cut': 'Cortar', 'Copy': 'Copiar', 'Paste': 'Colar', 'Duplicate': 'Duplicar',
      'Select all': 'Selecionar tudo', 'Select': 'Selecionar', 'Deselect': 'Desmarcar',
      
      // Zoom e visualização
      'Zoom in': 'Ampliar', 'Zoom out': 'Reduzir', 'Zoom to fit': 'Ajustar à tela', 
      'Zoom 100%': 'Zoom 100%', 'Zoom': 'Zoom', 'Fit to width': 'Ajustar à largura',
      'Actual size': 'Tamanho real',
      
      // Alinhamento
      'Align left': 'Alinhar à esquerda', 'Align center': 'Alinhar ao centro', 
      'Align right': 'Alinhar à direita', 'Align top': 'Alinhar acima', 
      'Align middle': 'Alinhar no meio', 'Align bottom': 'Alinhar abaixo',
      'Distribute horizontally': 'Distribuir horizontalmente',
      'Distribute vertically': 'Distribuir verticalmente',
      
      // Formatação de texto
      'Bold': 'Negrito', 'Italic': 'Itálico', 'Underline': 'Sublinhado', 
      'Strikethrough': 'Tachado', 'Subscript': 'Subscrito', 'Superscript': 'Sobrescrito',
      'Text color': 'Cor do texto', 'Background color': 'Cor de fundo',
      'Font family': 'Família da fonte', 'Font size': 'Tamanho da fonte',
      'Line spacing': 'Espaçamento entre linhas', 'Letter spacing': 'Espaçamento entre letras',
      
      // Elementos do documento
      'Add text': 'Adicionar texto', 'Add image': 'Adicionar imagem', 
      'Add table': 'Adicionar tabela', 'Add line': 'Adicionar linha', 
      'Add page break': 'Adicionar quebra de página', 'Add bar code': 'Adicionar código de barras', 
      'Add frame': 'Adicionar moldura', 'Add section': 'Adicionar seção',
      'Text element': 'Elemento de texto', 'Text': 'Texto', 'Image': 'Imagem', 
      'Table': 'Tabela', 'Line': 'Linha', 'Page break': 'Quebra de página', 
      'Bar code': 'Código de barras', 'Frame': 'Moldura', 'Section': 'Seção',
      'Shape': 'Forma', 'Rectangle': 'Retângulo', 'Circle': 'Círculo',
      
      // Propriedades gerais
      'General': 'Geral', 'Position': 'Posição', 'Position and size': 'Posição e tamanho',
      'Size': 'Tamanho', 'Style': 'Estilo', 'Font': 'Fonte', 'Color': 'Cor', 
      'Background': 'Fundo', 'Border': 'Borda', 'Borders': 'Bordas',
      'Padding': 'Espaçamento interno', 'Margin': 'Margem', 'Margins': 'Margens',
      'Width': 'Largura', 'Height': 'Altura', 'X': 'X', 'Y': 'Y', 
      'Name': 'Nome', 'Content': 'Conteúdo', 'Source': 'Origem',
      'Expression': 'Expressão', 'Pattern': 'Padrão', 'Format': 'Formato',
      'Link': 'Link', 'URL': 'URL', 'Target': 'Destino',
      
      // Alinhamento e posicionamento
      'Left': 'Esquerda', 'Center': 'Centro', 'Right': 'Direita', 
      'Top': 'Topo', 'Middle': 'Meio', 'Bottom': 'Inferior', 
      'Justify': 'Justificar', 'Text align': 'Alinhamento do texto', 
      'Vertical align': 'Alinhamento vertical', 'Alignment': 'Alinhamento',
      
      // Tipos e valores
      'Type': 'Tipo', 'Value': 'Valor', 'Values': 'Valores',
      'Default': 'Padrão', 'Default value': 'Valor padrão',
      'None': 'Nenhum', 'Auto': 'Automático',
      'Visible': 'Visível', 'Hidden': 'Oculto',
      'Printable': 'Imprimível', 'Remove row if empty': 'Remover linha se vazia',
      'Enabled': 'Ativado', 'Disabled': 'Desativado',
      
      // Parâmetros e dados
      'Parameters': 'Parâmetros', 'Parameter': 'Parâmetro', 
      'Data': 'Dados', 'Data source': 'Fonte de dados',
      'Field': 'Campo', 'Fields': 'Campos', 
      'Add parameter': 'Adicionar parâmetro', 'Edit parameter': 'Editar parâmetro', 
      'Delete parameter': 'Excluir parâmetro', 'Array': 'Array',
      'Simple array': 'Array simples', 'String': 'Texto', 'Number': 'Número',
      'Boolean': 'Booleano', 'Date': 'Data',
      'Collection': 'Coleção', 'Map': 'Mapa',
      
      // Estilos
      'Styles': 'Estilos', 'Add style': 'Adicionar estilo', 
      'Edit style': 'Editar estilo', 'Delete style': 'Excluir estilo', 
      'Apply style': 'Aplicar estilo', 'Clear style': 'Limpar estilo',
      'Text style': 'Estilo de texto', 'Border style': 'Estilo de borda',
      'Solid': 'Sólido', 'Dashed': 'Tracejado', 'Dotted': 'Pontilhado',
      
      // Página e layout
      'Page': 'Página', 'Pages': 'Páginas', 'Page format': 'Formato da página', 
      'Page size': 'Tamanho da página', 'Orientation': 'Orientação', 
      'Portrait': 'Retrato', 'Landscape': 'Paisagem',
      'Header': 'Cabeçalho', 'Footer': 'Rodapé', 
      'Content band': 'Banda de conteúdo',
      'Page header': 'Cabeçalho da página', 'Page footer': 'Rodapé da página',
      'First page': 'Primeira página', 'Last page': 'Última página',
      'Odd pages': 'Páginas ímpares', 'Even pages': 'Páginas pares',
      
      // Mensagens e diálogos
      'Are you sure?': 'Tem certeza?', 'Confirm': 'Confirmar',
      'Yes': 'Sim', 'No': 'Não', 'Cancel': 'Cancelar',
      'OK': 'OK', 'Apply': 'Aplicar', 'Close': 'Fechar', 
      'Add': 'Adicionar', 'Create': 'Criar',
      'Edit': 'Editar', 'Remove': 'Remover', 
      'Search': 'Buscar', 'Find': 'Localizar',
      'Filter': 'Filtrar', 'Clear': 'Limpar',
      'Insert': 'Inserir', 'Update': 'Atualizar',
      
      // Erros e validações
      'Error': 'Erro', 'Errors': 'Erros',
      'Warning': 'Aviso', 'Warnings': 'Avisos',
      'Info': 'Informação', 'Required': 'Obrigatório',
      'Invalid value': 'Valor inválido', 
      'Field is required': 'Campo obrigatório',
      'Must be a number': 'Deve ser um número',
      'Must be positive': 'Deve ser positivo',
      
      // Unidades de medida
      'px': 'px', 'mm': 'mm', 'cm': 'cm', 
      'inch': 'polegada', 'inches': 'polegadas',
      'pt': 'pt', 'points': 'pontos',
      
      // Tabela
      'Columns': 'Colunas', 'Column': 'Coluna',
      'Rows': 'Linhas', 'Row': 'Linha',
      'Add column': 'Adicionar coluna', 'Add row': 'Adicionar linha', 
      'Delete column': 'Excluir coluna', 'Delete row': 'Excluir linha',
      'Insert column': 'Inserir coluna', 'Insert row': 'Inserir linha',
      'Cell': 'Célula', 'Cells': 'Células',
      'Merge cells': 'Mesclar células', 'Split cell': 'Dividir célula',
      'Table border': 'Borda da tabela', 'Cell border': 'Borda da célula',
      'Border width': 'Largura da borda', 'Border color': 'Cor da borda',
      
      // Código de barras
      'Barcode': 'Código de barras',
      'Barcode type': 'Tipo de código de barras', 
      'Display value': 'Exibir valor', 'Show text': 'Mostrar texto',
      'Code': 'Código', 'Code 128': 'Código 128',
      'EAN-13': 'EAN-13', 'EAN-8': 'EAN-8',
      'UPC-A': 'UPC-A', 'QR Code': 'QR Code',
      
      // Seções e agrupamento
      'Group': 'Grupo', 'Groups': 'Grupos',
      'Grouping': 'Agrupamento', 'Group expression': 'Expressão de grupo',
      'Sort': 'Ordenar', 'Sorting': 'Ordenação',
      'Sort order': 'Ordem de classificação', 
      'Ascending': 'Crescente', 'Descending': 'Decrescente',
      'Group header': 'Cabeçalho do grupo', 
      'Group footer': 'Rodapé do grupo',
      
      // Condicionais e lógica
      'Condition': 'Condição', 'Conditions': 'Condições',
      'If': 'Se', 'Then': 'Então', 'Else': 'Senão',
      'Show if': 'Mostrar se', 'Print if': 'Imprimir se',
      'Hide if': 'Ocultar se',
      
      // Layout e organização
      'Bring to front': 'Trazer para frente', 
      'Send to back': 'Enviar para trás',
      'Bring forward': 'Avançar', 
      'Send backward': 'Recuar', 
      'Group elements': 'Agrupar elementos',
      'Ungroup elements': 'Desagrupar elementos', 
      'Lock': 'Bloquear', 'Unlock': 'Desbloquear',
      'Lock position': 'Bloquear posição',
      'Arrange': 'Organizar', 'Order': 'Ordem',
      
      // Formatação numérica e de data
      'Number format': 'Formato numérico', 
      'Decimal places': 'Casas decimais',
      'Thousand separator': 'Separador de milhares', 
      'Currency': 'Moeda', 'Currency symbol': 'Símbolo da moeda',
      'Percentage': 'Porcentagem', 
      'Date format': 'Formato de data', 
      'Time format': 'Formato de hora',
      'DateTime format': 'Formato de data/hora',
      
      // Imagem
      'Image file': 'Arquivo de imagem', 
      'Image URL': 'URL da imagem', 
      'Fit': 'Ajustar', 'Fill': 'Preencher',
      'Stretch': 'Esticar', 
      'Original size': 'Tamanho original', 
      'Horizontal alignment': 'Alinhamento horizontal',
      'Vertical alignment': 'Alinhamento vertical',
      'Image source': 'Origem da imagem',
      
      // Configurações e preferências
      'Units': 'Unidades', 'Show grid': 'Mostrar grade', 
      'Snap to grid': 'Alinhar à grade', 'Grid size': 'Tamanho da grade', 
      'Show ruler': 'Mostrar régua', 'Show guides': 'Mostrar guias',
      'Guidelines': 'Linhas-guia', 'Rulers': 'Réguas',
      'Report': 'Relatório', 'Document': 'Documento', 
      'Settings': 'Configurações', 'Preferences': 'Preferências',
      'Help': 'Ajuda', 'About': 'Sobre', 'Version': 'Versão',
      'Language': 'Idioma',
      
      // Específicos do ReportBro
      'Element': 'Elemento', 'Elements': 'Elementos', 
      'Document properties': 'Propriedades do documento',
      'Report properties': 'Propriedades do relatório', 
      'Show borders': 'Mostrar bordas',
      'Always print on same page': 'Sempre imprimir na mesma página',
      'Shrink to content height': 'Reduzir à altura do conteúdo',
      'Grow to content height': 'Expandir à altura do conteúdo',
      
      // Mais opções de propriedades
      'Spacing': 'Espaçamento', 'Opacity': 'Opacidade',
      'Rotation': 'Rotação', 'Scale': 'Escala',
      'Shadow': 'Sombra', 'Outline': 'Contorno',
      'Transparency': 'Transparência',
      
      // Ações adicionais
      'Refresh': 'Atualizar', 'Reload': 'Recarregar',
      'Export': 'Exportar', 'Import': 'Importar',
      'Download': 'Baixar', 'Upload': 'Enviar',
      
      // Bandas do documento
      'Band': 'Banda', 'Bands': 'Bandas',
      'Report header': 'Cabeçalho do relatório',
      'Report footer': 'Rodapé do relatório',
      'Detail': 'Detalhe', 'Details': 'Detalhes',
      
      // Opções de repetição
      'Repeat': 'Repetir', 'Repeat header': 'Repetir cabeçalho',
      'Repeat footer': 'Repetir rodapé',
      'Page count': 'Contagem de páginas',
      'Current page': 'Página atual',
      
      // Misc
      'Options': 'Opções', 'Advanced': 'Avançado',
      'Basic': 'Básico', 'Custom': 'Personalizado',
      'Template': 'Modelo', 'Templates': 'Modelos',
      'Layout': 'Layout', 'Design': 'Design',
      'Preview mode': 'Modo de visualização',
      'Edit mode': 'Modo de edição',
      
      // Termos adicionais dos painéis de propriedades
      'Rich text': 'Texto rico',
      'Requires commercial PLUS version': 'Requer versão comercial PLUS',
      'Evaluate': 'Avaliar',
      'Position (x, y)': 'Posição (x, y)',
      'Position (x)': 'Posição (x)',
      'Position (y)': 'Posição (y)',
      'Size (width, height)': 'Tamanho (largura, altura)',
      'Bar width': 'Largura da barra',
      'Rotate': 'Rotacionar',
      'PRINT SETTINGS': 'CONFIGURAÇÕES DE IMPRESSÃO',
      'Remove when empty': 'Remover quando vazio',
      'SPREADSHEET': 'PLANILHA',
      'Hide': 'Ocultar',
      'Fixed column': 'Coluna fixa',
      'Colspan': 'Colspan',
      'Add empty row below': 'Adicionar linha vazia abaixo',
      'Choose file': 'Escolher arquivo',
      'Browse': 'Procurar',
      'No file chosen': 'Nenhum arquivo escolhido',
      'Text wrap': 'Quebra de texto',
      'Align to bottom of page': 'Alinhar ao rodapé da página',
      'Label': 'Rótulo',
      'Conditional style': 'Estilo condicional',
      'CONDITIONAL STYLE': 'ESTILO CONDICIONAL',
      'Preview report': 'Visualizar relatório',
      'Save report': 'Salvar relatório',
      'Preview Report': 'Visualizar relatório',
      'Save Report': 'Salvar relatório',
      
      // Configurações de página
      'Content height': 'Altura do conteúdo',
      'Page margins': 'Margens da página',
      'Header size': 'Tamanho do cabeçalho',
      'Display': 'Exibir',
      'Footer size': 'Tamanho do rodapé',
      'Watermarks': 'Marcas d\'água',
      'Pattern locale': 'Localidade do padrão',
      'Pattern currency symbol': 'Símbolo de moeda do padrão',
      'leave empty for default': 'deixe vazio para o padrão',
      'affects only GUI size to place elements and not the real page size': 'afeta apenas o tamanho da interface para posicionar elementos, não o tamanho real da página',
      
      // Seções em maiúsculas
      'STYLE': 'ESTILO',
      'ESTILO': 'ESTILO',
      'Print settings': 'Configurações de impressão',
      'Spreadsheet': 'Planilha',
      
      // Medidas e unidades
      'width': 'largura',
      'height': 'altura'
    };
    
    // Helper para resolver traduções considerando dois-pontos e variações
    const resolve = (original?: string | null): string | null => {
      if (!original) return null;
      const t = original.trim();
      if (!t) return null;
      if (translationMap[t]) return translationMap[t];
      // Remove dois-pontos no fim
      if (t.endsWith(':')) {
        const base = t.slice(0, -1).trim();
        if (translationMap[base]) return translationMap[base] + ':';
      }
      return null;
    };

    // Oculta recursos da versão PLUS (ex: Rich text)
    const hidePlusFeatures = () => {
      const plusPatterns = [
        'Requires commercial PLUS version',
        'PLUS',
        'Rich text',
        'Rich Text',
        'Spreadsheet (PLUS)',
        'SPREADSHEET (PLUS)'
      ];

      // Remove opções de selects que são PLUS
      root.querySelectorAll('select option').forEach((opt) => {
        const t = opt.textContent?.trim() || '';
        if (plusPatterns.some(p => t.includes(p))) {
          opt.remove();
        }
      });

      // Oculta linhas/labels/seções relacionadas ao PLUS
      const candidates = root.querySelectorAll('.rbroFormRow, .rbroFormRowLabel, .rbroPropertyLabel, .rbroControlLabel, label, .rbroPanelSectionHeader, .rbroMenuItem, .rbroFormRow > div:first-child, .rbroInfo, .rbroWarning');
      candidates.forEach((el) => {
        const t = el.textContent?.trim() || '';
        if (!t) return;
        if (plusPatterns.some(p => t.includes(p))) {
          let row: HTMLElement | null = el as HTMLElement;
          while (row && !row.classList?.contains('rbroFormRow') && row.parentElement) {
            row = row.parentElement as HTMLElement;
            if (row.classList?.contains('rbroFormRow')) break;
          }
          const target = (row || (el as HTMLElement));
          target.style.display = 'none';
          target.setAttribute('data-hidden-plus', '1');
        }
      });
    };

    // Traduz atributos title
    root.querySelectorAll('[title]').forEach((el) => {
      const title = (el as HTMLElement).getAttribute('title');
      const r = resolve(title);
      if (r) (el as HTMLElement).setAttribute('title', r);
    });
    
    // Traduz textos visíveis em todos os elementos relevantes
    const selectors = [
      'label',
      'span',
      'button',
      'div',
      '.rbroMenuItem',
      '.rbroMenuItemText',
      '.rbroControlLabel',
      '.rbroPanelSectionHeader',
      '.rbroFormLabel',
      '.rbroPropertyLabel',
      '.rbroTabButton',
      '.rbroSelect option',
      '.rbroButton',
      '.rbroFormRowLabel',
      '.rbroFormRow > div:first-child',
      'th',
      'td',
      'h3',
      'h4'
    ];
    
    root.querySelectorAll(selectors.join(', ')).forEach((el) => {
      // Traduz texto direto do elemento
      if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
        const r = resolve(el.textContent);
        if (r) el.textContent = r;
      } else {
        // Traduz apenas text nodes diretos (não recursivo)
        Array.from(el.childNodes).forEach(node => {
          if (node.nodeType === Node.TEXT_NODE && node.textContent) {
            const trimmed = node.textContent.trim();
            const r = resolve(trimmed);
            if (r) node.textContent = node.textContent.replace(trimmed, r);
          }
        });
      }
      
      // Traduz também atributos data-label se existirem
      const dataLabel = (el as HTMLElement).getAttribute('data-label');
      const rData = resolve(dataLabel);
      if (rData) (el as HTMLElement).setAttribute('data-label', rData);
    });
    
    // Traduz options de select
    root.querySelectorAll('select option').forEach((option) => {
      const r = resolve(option.textContent);
      if (r) option.textContent = r;
    });
    
    // Traduz placeholders
    root.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((el) => {
      const placeholder = (el as HTMLInputElement).getAttribute('placeholder');
      const r = resolve(placeholder);
      if (r) (el as HTMLInputElement).setAttribute('placeholder', r);
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

      // Sempre inicia sem report explícito para que o ReportBro crie um padrão válido
      reportBroRef.current = new ReportBro(containerRef.current, {
        // Usaremos o previewCallback customizado (como antes)
        locale: "pt_BR",
        saveCallback: handleSave,
        previewCallback: handlePreview,
        showTemplateSelection: false,
      });

      // Traduz interface e configura observer para traduções dinâmicas
      setTimeout(() => {
        translateInterfacePtBR();
        
        let translationTimeout: NodeJS.Timeout;
        
        // Observer para traduzir elementos carregados dinamicamente
        const observer = new MutationObserver((mutations) => {
          // Limpa timeout anterior para debounce
          clearTimeout(translationTimeout);
          
          // Verifica se houve mudanças relevantes
          const shouldTranslate = mutations.some(mutation => 
            mutation.type === 'childList' || 
            (mutation.type === 'attributes' && mutation.attributeName === 'title')
          );
          
          if (shouldTranslate) {
            // Desconecta observer para evitar loop
            observer.disconnect();
            
            // Agenda tradução com debounce
            translationTimeout = setTimeout(() => {
              translateInterfacePtBR();
              // Reconecta observer após tradução
              if (containerRef.current) {
                observer.observe(containerRef.current, {
                  childList: true,
                  subtree: true,
                  attributes: true,
                  attributeFilter: ['title', 'placeholder']
                });
              }
            }, 200);
          }
        });
        
        if (containerRef.current) {
          observer.observe(containerRef.current, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['title', 'placeholder']
          });
        }
        
        // Traduz novamente após eventos de click (quando painéis abrem)
        containerRef.current?.addEventListener('click', () => {
          setTimeout(() => translateInterfacePtBR(), 100);
        });
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

      // Carrega o nome do relatório
      setReportName(data.nome || "Relatório sem nome");

      if (reportBroRef.current) {
        let layoutData: any = null;
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
          if (layoutData) {
            reportBroRef.current.load(layoutData);
            toast.success("Relatório carregado!");
          }
        } catch (e) {
          console.warn("Falha ao carregar layout do banco, mantendo layout padrão do designer.", e);
          // Não força layout vazio: mantém o padrão válido do ReportBro
        }
        translateInterfacePtBR();
      }

      // Carrega dados da API se configurada (sem bloquear a interface)
      if (data?.configuracoes && typeof data.configuracoes === 'object') {
        const config = data.configuracoes as any;
        if (config.api_url) {
          setCurrentApiUrl(config.api_url);
          const method = (config.http_method || 'GET').toUpperCase();
          const ptype = config.param_type || 'query';
          setApiHttpMethod(method);
          setApiParamType(ptype);
          
          // Extrai variáveis da configuração se existirem
          const allVariables: Array<{ name: string; type: string; value: string }> = [];
          const varsWithoutValue: Array<{ name: string; type: string }> = [];
          
          if (config.api_variables && typeof config.api_variables === 'object') {
            Object.entries(config.api_variables).forEach(([name, varData]: [string, any]) => {
              const type = varData?.type || 'string';
              const value = varData?.value || '';
              
              allVariables.push({ name, type, value });
              
              // Se não tem valor fixo, precisa solicitar no preview
              if (!value) {
                varsWithoutValue.push({ name, type });
              }
            });
            
            setSavedApiVariables(allVariables);
          }
          
          setApiVariables(varsWithoutValue);
          
          // Se todas as variáveis têm valor fixo, carrega API automaticamente
          if (varsWithoutValue.length === 0 && allVariables.length > 0) {
            const fixedVars: Record<string, any> = {};
            allVariables.forEach(v => {
              if (v.value) {
                try {
                  switch (v.type) {
                    case 'number':
                      fixedVars[v.name] = parseFloat(v.value);
                      break;
                    case 'boolean':
                      fixedVars[v.name] = v.value === 'true';
                      break;
                    case 'date':
                      fixedVars[v.name] = new Date(v.value).toISOString();
                      break;
                    case 'array':
                      fixedVars[v.name] = JSON.parse(v.value);
                      break;
                    case 'object':
                      fixedVars[v.name] = JSON.parse(v.value);
                      break;
                    default:
                      fixedVars[v.name] = v.value;
                  }
                } catch (e) {
                  fixedVars[v.name] = v.value;
                }
              }
            });
            
            loadApiData(config.api_url, fixedVars, { httpMethod: method, paramType: ptype }).catch(err => {
              console.error("Erro ao carregar API em background:", err);
            });
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      toast.error("Erro ao carregar relatório");
    }
  };

  const handleSave = async () => {
    if (!reportBroRef.current || !reportId) return;

    setIsSaving(true);
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
      return true;
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar relatório");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleExitClick = () => {
    setShowExitDialog(true);
  };

  const handleExitWithoutSaving = () => {
    setShowExitDialog(false);
    onClose();
  };

  const handleSaveAndExit = async () => {
    const saved = await handleSave();
    if (saved) {
      setShowExitDialog(false);
      onClose();
    }
  };

  const handlePreview = async () => {
    if (!reportBroRef.current || !reportId) {
      toast.error("Salve o relatório antes de visualizar");
      return;
    }
    
    // Se houver variáveis configuradas, mostrar dialog de teste
    if (apiVariables.length > 0) {
      setShowTestVariablesDialog(true);
      return;
    }
    
    // Se não houver variáveis, continuar normalmente
    openPreview();
  };

  const openPreview = async (testVariables?: Record<string, any>) => {
    if (!reportBroRef.current || !reportId) return;
    
    try {
      const reportData = reportBroRef.current.getReport();
      if (!reportData || typeof reportData !== 'object') {
        toast.error("Relatório vazio ou inválido");
        return;
      }

      // Remove testData grandes dos parâmetros para evitar exceder limite do storage
      const cleanedData = JSON.parse(JSON.stringify(reportData));
      if (cleanedData.parameters) {
        cleanedData.parameters = cleanedData.parameters.map((param: any) => {
          const p = { ...param };
          // Remove testData se for muito grande (>100KB)
          if (p.testData && typeof p.testData === 'string' && p.testData.length > 100000) {
            p.testData = '[]'; // Substitui por array vazio
          }
          return p;
        });
      }

      // Salva versão limpa no storage
      const layoutStr = JSON.stringify({
        report: cleanedData,
        reportId: reportId,
        apiUrl: currentApiUrl,
        testVariables: testVariables || {}
      });

      try {
        localStorage.setItem("reportbro_preview", layoutStr);
      } catch (e) {
        sessionStorage.setItem("reportbro_preview", layoutStr);
      }

      // Abre visualização
      window.location.href = "/relatorios/viewer";
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

const loadApiData = async (
  url: string,
  variables?: Record<string, any>,
  opts?: { httpMethod?: string; paramType?: string }
) => {
  if (!url || loadingApiData) return; // Previne múltiplas chamadas simultâneas
  
  setLoadingApiData(true);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const method = (opts?.httpMethod || apiHttpMethod || 'GET').toUpperCase();
    const paramType = (opts?.paramType || apiParamType || 'query');
    let response: Response;

    let requestUrl = url;
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    let body: any = undefined;

    const vars = variables || {};

    if (paramType === 'query') {
      const queryParams = new URLSearchParams();
      Object.entries(vars).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });
      const qs = queryParams.toString();
      if (qs) requestUrl = `${url}?${qs}`;
    } else if (paramType === 'json' && method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(vars);
    } else if (paramType === 'formdata' && method !== 'GET') {
      const fd = new FormData();
      Object.entries(vars).forEach(([key, value]) => {
        if (value !== null && value !== undefined) fd.append(key, String(value));
      });
      body = fd;
    } else if (paramType === 'header') {
      const headerValue = Object.entries(vars).map(([name, value]) => {
        const saved = savedApiVariables.find(v => v.name === name);
        const t = saved?.type || (typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string');
        return `${name},${value ?? ''},${t}`;
      }).join(';');
      console.log('ParamType=header, keys header:', headerValue);
      if (headerValue) headers['keys'] = headerValue;
    }
    
    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal
    };
    if (body && method !== 'GET') fetchOptions.body = body;

    response = await fetch(requestUrl, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text || `Erro HTTP ${response.status}`);
    }

    let result: any;
    const ct = response.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error('Resposta da API não é JSON válido');
      }
    }
    
    // Suporta APIs que retornam array direto, objeto { data }, ou item único
    let data: any[] = [];
    if (Array.isArray(result)) {
      data = result as any[];
    } else if (result && typeof result === 'object' && 'data' in (result as any)) {
      const r: any = result as any;
      data = Array.isArray(r.data) ? r.data : [r.data];
    } else if (result != null) {
      data = [result];
    }
    
    if (data.length > 0) {
      setApiData(data);
      setLastApiParams(vars); // Salva os parâmetros usados neste carregamento
      
      // Adiciona os dados da API como parâmetros no ReportBro
      if (reportBroRef.current) {
        try {
          const report = reportBroRef.current.getReport();
          
          // Extrai campos do primeiro registro
          const firstItem = data[0];
          const fields = Object.keys(firstItem || {});
          
          // Remove parâmetro api_data se já existir
          const existingParams = report.parameters || [];
          const filteredParams = existingParams.filter((p: any) => p.name !== 'api_data');
          
          // Cria parâmetro do tipo array->map com testData
          const apiParam = {
            id: Date.now(),
            name: 'api_data',
            type: 'array',
            arrayItemType: 'map',
            eval: false,
            nullable: false,
            pattern: '',
            expression: '',
            showOnlyNameType: false,
            children: fields.map((fieldName, idx) => ({
              id: Date.now() + idx + 1,
              name: fieldName,
              type: (typeof firstItem[fieldName] === 'number') ? 'number' : (typeof firstItem[fieldName] === 'boolean') ? 'boolean' : 'string',
              eval: false,
              nullable: true,
              pattern: '',
              expression: '',
              showOnlyNameType: false
            })),
            testData: JSON.stringify(data)
          };
          
          filteredParams.push(apiParam);
          report.parameters = filteredParams;
          
          // Recarrega o relatório com os novos parâmetros
          reportBroRef.current.load(report);
          
          console.log('Parâmetros adicionados:', apiParam);
          toast.success(`${data.length} registros da API disponíveis. Use 'api_data' no relatório.`);
        } catch (error) {
          console.error('Erro ao adicionar dados ao ReportBro:', error);
          toast.warning(`${data.length} registros carregados mas erro ao adicionar: ${error}`);
        }
      }
    } else {
      toast.error('API não retornou dados válidos');
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      toast.error("Timeout ao carregar dados da API");
    } else {
      console.error("Erro ao carregar dados da API:", error);
      toast.error("Erro ao carregar dados da API");
    }
  } finally {
    setLoadingApiData(false);
  }
};

  const handleApiSelect = async (
    apiUrl: string,
    apiName: string,
    variables: Array<{ name: string; type: string; value: string }>,
    options?: { httpMethod?: string; paramType?: string }
  ) => {
    if (!reportId) {
      toast.error("Salve o relatório antes de configurar API");
      return;
    }

    try {
      // Converte variáveis para o formato que será salvo
      const apiVariablesConfig: Record<string, { type: string; value: string }> = {};
      variables.forEach(v => {
        if (v.name) {
          apiVariablesConfig[v.name] = { type: v.type, value: v.value };
        }
      });

      const http_method = options?.httpMethod || 'GET';
      const param_type = options?.paramType || 'query';

      const { error } = await supabase
        .from("relatorios")
        .update({ 
          configuracoes: { 
            api_url: apiUrl,
            api_name: apiName,
            api_variables: apiVariablesConfig,
            http_method,
            param_type
          } 
        })
        .eq("id", reportId);

      if (error) throw error;

      setCurrentApiUrl(apiUrl);
      setApiHttpMethod(http_method);
      setApiParamType(param_type);
      
      // Atualiza savedApiVariables com TODAS as variáveis (com e sem valor fixo)
      setSavedApiVariables(variables);
      
      // Atualiza apiVariables com variáveis que não têm valor fixo
      const varsWithoutValue = variables
        .filter(v => v.name && !v.value)
        .map(v => ({ name: v.name, type: v.type }));
      setApiVariables(varsWithoutValue);
      
      setShowApiDialog(false);
      
      // Se não há variáveis sem valor, carrega dados da API automaticamente
      if (varsWithoutValue.length === 0) {
        // Prepara variáveis com valor fixo para enviar
        const fixedVars: Record<string, any> = {};
        variables.forEach(v => {
          if (v.name && v.value) {
            try {
              switch (v.type) {
                case 'number':
                  fixedVars[v.name] = parseFloat(v.value);
                  break;
                case 'boolean':
                  fixedVars[v.name] = v.value === 'true';
                  break;
                case 'date':
                  fixedVars[v.name] = new Date(v.value).toISOString();
                  break;
                case 'array':
                  fixedVars[v.name] = JSON.parse(v.value);
                  break;
                case 'object':
                  fixedVars[v.name] = JSON.parse(v.value);
                  break;
                default:
                  fixedVars[v.name] = v.value;
              }
            } catch (e) {
              fixedVars[v.name] = v.value;
            }
          }
        });
        
        await loadApiData(apiUrl, fixedVars, { httpMethod: http_method, paramType: param_type });
      }
      
      toast.success(`API "${apiName}" configurada${varsWithoutValue.length > 0 ? ' (variáveis serão solicitadas no preview)' : ' e dados carregados'}`);
    } catch (error: any) {
      console.error("Erro ao configurar API:", error);
      toast.error("Erro ao configurar API");
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

  // Mantém comportamento original de exclusão via ReportBro (tecla Delete/Backspace e botão padrão)
  // Nenhuma captura adicional de teclado para não interferir nos handlers internos do designer.
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Barra de Título */}
      <div className="bg-card border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Designer de Relatórios</h1>
            <p className="text-sm text-muted-foreground">{reportName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Botão API */}
          <Button
            size="sm"
            onClick={() => setShowApiDialog(true)}
            className="gap-2"
            variant={currentApiUrl ? "default" : "outline"}
          >
            <Globe className="h-4 w-4" />
            API de Dados
            {apiData && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-background/20 rounded">
                {apiData.length}
              </span>
            )}
          </Button>
          
          {currentApiUrl && apiData && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // Prepara variáveis com valor fixo
                const fixedVars: Record<string, any> = {};
                savedApiVariables.forEach(v => {
                  if (v.value) {
                    try {
                      switch (v.type) {
                        case 'number':
                          fixedVars[v.name] = parseFloat(v.value);
                          break;
                        case 'boolean':
                          fixedVars[v.name] = v.value === 'true';
                          break;
                        case 'date':
                          fixedVars[v.name] = new Date(v.value).toISOString();
                          break;
                        case 'array':
                          fixedVars[v.name] = JSON.parse(v.value);
                          break;
                        case 'object':
                          fixedVars[v.name] = JSON.parse(v.value);
                          break;
                        default:
                          fixedVars[v.name] = v.value;
                      }
                    } catch (e) {
                      fixedVars[v.name] = v.value;
                    }
                  }
                });
                loadApiData(currentApiUrl, fixedVars);
              }}
              disabled={loadingApiData}
            >
              {loadingApiData ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              ) : (
                "↻"
              )}
            </Button>
          )}
          
          {/* Botão Sair */}
          <Button
            size="sm"
            onClick={handleExitClick}
            variant="outline"
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>

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

      <Dialog open={showApiDialog} onOpenChange={setShowApiDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Configurar API de Dados</DialogTitle>
            <DialogDescription>
              Selecione uma API cadastrada ou configure uma URL customizada
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2">
            <APIDataSourceSelector 
              onSelect={handleApiSelect}
              currentUrl={currentApiUrl}
              currentVariables={savedApiVariables}
            />
            {apiData && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-sm">Dados Carregados ({apiData.length} registro{apiData.length !== 1 ? 's' : ''}):</h4>
                  {lastApiParams && Object.keys(lastApiParams).length > 0 && (
                    <div className="text-xs bg-background px-2 py-1 rounded border">
                      <span className="font-semibold">Parâmetros usados:</span>{' '}
                      {Object.entries(lastApiParams).map(([key, value]) => (
                        <span key={key} className="ml-1">
                          <code className="bg-muted px-1 rounded">{key}={String(value)}</code>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-xs space-y-2">
                  <div className="p-2 bg-background rounded">
                    <p className="font-semibold mb-1">Como usar no ReportBro:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Vá em "Parâmetros" no painel lateral</li>
                      <li>Você verá o parâmetro <code className="bg-muted px-1 rounded">api_data</code> criado</li>
                      <li>Para usar em tabela: arraste <code className="bg-muted px-1 rounded">api_data</code> para a tabela</li>
                      <li>Para campos: use <code className="bg-muted px-1 rounded">{"{"}api_data.campo{"}"}</code> em elementos de texto</li>
                    </ol>
                  </div>
                  <p className="font-mono text-muted-foreground truncate">
                    Campos disponíveis: {apiData.length > 0 && Object.keys(apiData[0]).join(", ")}
                  </p>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground py-1">
                    Ver dados completos (JSON)
                  </summary>
                  <div className="mt-2 p-2 bg-background rounded max-h-[200px] overflow-auto">
                    <pre className="text-xs whitespace-pre-wrap break-words">
                      {JSON.stringify(apiData, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Saída */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deseja salvar antes de sair?</DialogTitle>
            <DialogDescription>
              Você tem alterações não salvas. Deseja salvar o relatório antes de sair?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleExitWithoutSaving}
            >
              Não Salvar
            </Button>
            <Button
              onClick={handleSaveAndExit}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar e Sair
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de teste de variáveis */}
      <TestVariablesDialog
        open={showTestVariablesDialog}
        onOpenChange={setShowTestVariablesDialog}
        variables={apiVariables}
        onSubmit={(values) => openPreview(values)}
      />

    </div>
  );
}
