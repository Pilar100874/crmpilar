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
        reportServerUrl: "",
        locale: "pt_BR",
        saveCallback: handleSave,
        showTemplateSelection: false,
      });

      // Traduz interface e configura observer para traduções dinâmicas
      setTimeout(() => {
        translateInterfacePtBR();
        
        // Observer para traduzir elementos carregados dinamicamente
        const observer = new MutationObserver((mutations) => {
          // Verifica se houve mudanças relevantes
          const shouldTranslate = mutations.some(mutation => 
            mutation.type === 'childList' || 
            (mutation.type === 'attributes' && mutation.attributeName === 'title')
          );
          
          if (shouldTranslate) {
            // Pequeno delay para garantir que o DOM está estável
            setTimeout(() => translateInterfacePtBR(), 50);
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

  // Mantém comportamento original de exclusão via ReportBro (tecla Delete/Backspace e botão padrão)
  // Nenhuma captura adicional de teclado para não interferir nos handlers internos do designer.
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
