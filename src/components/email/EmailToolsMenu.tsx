import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Plus, FileText, FileSpreadsheet, Upload, Search, BookOpen, FileDown, Loader2, Calendar, Package, AlertCircle, CalendarPlus, Link2, Paperclip } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/hooks/use-toast";
import { useFerramentasAtendimento } from "@/hooks/useFerramentasAtendimento";
import type { EmailAttachment } from "./ComposeEmailDialog";
import { pdf } from "@react-pdf/renderer";
import { CatalogPDFDocument } from "@/components/marketing/catalogo/PDFDocument";
import { CatalogConfig, CatalogPage, CatalogProduct, LAYOUT_OPTIONS, ProductGroup } from "@/components/marketing/catalogo/types";
import { Json } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

// Types for catalogs
interface SavedCatalogRaw {
  id: string;
  nome: string;
  config: Json;
  cover_page: Json | null;
  products_page: Json | null;
  backcover_page: Json | null;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
  ativo: boolean;
  data_validade: string | null;
  data_indeterminada: boolean;
}

interface SavedCatalog {
  id: string;
  nome: string;
  config: CatalogConfig;
  cover_page: CatalogPage | null;
  products_page: CatalogPage | null;
  backcover_page: CatalogPage | null;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
  ativo: boolean;
  data_validade: string | null;
  data_indeterminada: boolean;
}

interface PageInfo {
  type: 'cover' | 'group-header' | 'products' | 'price-table' | 'backcover';
  groupName?: string;
  products?: CatalogProduct[];
  startIdx?: number;
  pageNumber?: number;
  priceTableData?: { groupName: string; products: CatalogProduct[] }[];
}

const parseJsonField = <T,>(json: Json | null): T | null => {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  return json as unknown as T;
};

// Helper function to build grouped products
const buildGroupedProducts = (products: CatalogProduct[], groupByCategory: boolean): ProductGroup[] => {
  if (!groupByCategory) {
    return [{ id: 'all', nome: 'Todos os Produtos', products }];
  }

  const groupMap = new Map<string, { id: string; nome: string; products: CatalogProduct[]; descritivo_catalogo?: string }>();
  products.forEach(product => {
    const groupName = product.grupo_nome || 'Outros';
    const groupId = product.grupo_id || `outros_${groupName.replace(/\s+/g, '_').toLowerCase()}`;
    
    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, { 
        id: groupId, 
        nome: groupName, 
        products: [],
        descritivo_catalogo: product.grupo_descritivo_catalogo
      });
    }
    groupMap.get(groupId)!.products.push(product);
  });

  return Array.from(groupMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
};

// Helper function to build pages array
const buildPages = (
  groupedProducts: ProductGroup[], 
  productsPerPage: number, 
  groupByCategory: boolean,
  showPriceTable: boolean
): PageInfo[] => {
  const result: PageInfo[] = [{ type: 'cover', pageNumber: 1 }];
  let pageNum = 2;

  groupedProducts.forEach(group => {
    if (groupByCategory) {
      result.push({ type: 'group-header', groupName: group.nome, pageNumber: pageNum++ });
    }
    
    const totalProductPages = Math.ceil(group.products.length / productsPerPage);
    for (let i = 0; i < totalProductPages; i++) {
      result.push({
        type: 'products',
        groupName: group.nome,
        products: group.products.slice(i * productsPerPage, (i + 1) * productsPerPage),
        startIdx: i * productsPerPage,
        pageNumber: pageNum++,
      });
    }
  });

  if (showPriceTable !== false) {
    const sortedGroupsForPriceTable = [...groupedProducts]
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map(group => ({
        groupName: group.nome,
        products: [...group.products].sort((a, b) => a.nome.localeCompare(b.nome))
      }));
    
    const ROWS_PER_PRICE_PAGE = 28;
    let currentPricePageProducts: { groupName: string; products: CatalogProduct[] }[] = [];
    let currentRowCount = 0;
    
    sortedGroupsForPriceTable.forEach(group => {
      const groupRows = 1 + group.products.length;
      
      if (currentRowCount + groupRows > ROWS_PER_PRICE_PAGE && currentPricePageProducts.length > 0) {
        result.push({ type: 'price-table', priceTableData: currentPricePageProducts, pageNumber: pageNum++ });
        currentPricePageProducts = [];
        currentRowCount = 0;
      }
      
      currentPricePageProducts.push(group);
      currentRowCount += groupRows;
    });
    
    if (currentPricePageProducts.length > 0) {
      result.push({ type: 'price-table', priceTableData: currentPricePageProducts, pageNumber: pageNum++ });
    }
  }

  result.push({ type: 'backcover', pageNumber: pageNum });
  return result;
};

// Elegant toolbar button styles matching ChatInput
const toolbarBtnClass = "h-9 w-9 rounded-xl bg-card border border-border/30 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border/50 hover:shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed";
const toolbarBtnActiveClass = "h-9 w-9 rounded-xl bg-primary/15 border border-primary/40 shadow-sm flex items-center justify-center text-primary hover:bg-primary/20 transition-all duration-200";

interface EmailToolsMenuProps {
  estabelecimentoId: string | null;
  onInsertText?: (text: string) => void;
  onAddAttachment?: (attachment: EmailAttachment) => void;
  onToolAction?: (toolId: string) => void;
  disabled?: boolean;
  recipientEmail?: string;
}

export function EmailToolsMenu({ estabelecimentoId, onInsertText, onAddAttachment, onToolAction, disabled, recipientEmail }: EmailToolsMenuProps) {
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Debug log
  useEffect(() => {
    console.log('[EmailToolsMenu] estabelecimentoId:', estabelecimentoId);
  }, [estabelecimentoId]);
  
  // Load ferramentas from database
  const { getToolbarFerramentas, loading: loadingFerramentas } = useFerramentasAtendimento(estabelecimentoId);
  const emailFerramentas = getToolbarFerramentas('email');
  
  // Debug log
  useEffect(() => {
    console.log('[EmailToolsMenu] loadingFerramentas:', loadingFerramentas, 'emailFerramentas:', emailFerramentas?.length);
  }, [loadingFerramentas, emailFerramentas]);
  
  // Active tool state for sub-menus
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  
  // Import Reports states
  const [importReports, setImportReports] = useState<any[]>([]);
  const [selectedImportReport, setSelectedImportReport] = useState<string | null>(null);
  const [isProcessingReport, setIsProcessingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  
  // Quick replies states
  const [quickReplies, setQuickReplies] = useState<any[]>([]);
  const [quickReplySearch, setQuickReplySearch] = useState("");
  
  // Orcamentos states
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [orcamentoSearch, setOrcamentoSearch] = useState("");

  // Catalogs states
  const [catalogs, setCatalogs] = useState<SavedCatalog[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [generatingCatalogPdf, setGeneratingCatalogPdf] = useState<string | null>(null);

  // Agenda Email states
  const [agendaTitulo, setAgendaTitulo] = useState("Agende seu atendimento");
  const [agendaDescricao, setAgendaDescricao] = useState("Cliente clicou no link do email");
  const [agendaTextoLink, setAgendaTextoLink] = useState("Clique aqui para agendar");
  const [agendaRedirectUrl, setAgendaRedirectUrl] = useState("https://www.pilar.com.br");
  const [insertingAgendaLink, setInsertingAgendaLink] = useState(false);
  const [agendaTipoRastreio, setAgendaTipoRastreio] = useState<'link' | 'anexo'>('link');
  const [agendaAnexoFile, setAgendaAnexoFile] = useState<File | null>(null);
  const agendaAnexoInputRef = useRef<HTMLInputElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        if (!activeToolId) {
          setShowToolsMenu(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeToolId]);

  // Load data when menu opens or recipient email changes
  useEffect(() => {
    if (showToolsMenu) {
      loadImportReports();
      loadQuickReplies();
      loadOrcamentos();
      loadCatalogs();
    }
  }, [showToolsMenu, estabelecimentoId, recipientEmail]);

  const loadImportReports = async () => {
    try {
      const estabId = estabelecimentoId || await getEstabelecimentoId();
      if (!estabId) return;

      const hoje = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("relatorios_importacao")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .eq("ativo", true)
        .or(`data_validade.is.null,data_validade.gte.${hoje}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setImportReports(data || []);
    } catch (error) {
      console.error("Erro ao carregar relatórios de importação:", error);
    }
  };

  const loadQuickReplies = async () => {
    try {
      const estabId = estabelecimentoId || await getEstabelecimentoId();
      if (!estabId) return;

      const { data, error } = await supabase
        .from("quick_replies")
        .select("id, title, content, shortcut")
        .eq("estabelecimento_id", estabId)
        .order("title");

      if (error) throw error;
      setQuickReplies(data || []);
    } catch (error) {
      console.error("Erro ao carregar respostas rápidas:", error);
    }
  };

  const loadOrcamentos = async () => {
    try {
      const estabId = estabelecimentoId || await getEstabelecimentoId();
      if (!estabId) return;

      // If we have a recipient email, search for matching customers/empresas first
      let matchingClienteIds: string[] = [];
      let matchingEmpresaIds: string[] = [];

      if (recipientEmail && recipientEmail.trim()) {
        const email = recipientEmail.trim().toLowerCase();
        
        // Search customers with matching email
        const { data: customers } = await supabase
          .from("customers")
          .select("id")
          .eq("estabelecimento_id", estabId)
          .ilike("email", `%${email}%`);
        
        if (customers) {
          matchingClienteIds = customers.map(c => c.id);
        }

        // Search empresas with matching email
        const { data: empresas } = await supabase
          .from("empresas")
          .select("id")
          .eq("estabelecimento_id", estabId)
          .ilike("email", `%${email}%`);
        
        if (empresas) {
          matchingEmpresaIds = empresas.map(e => e.id);
        }
      }

      // Build query
      let query = supabase
        .from("orcamentos")
        .select(`
          id,
          numero,
          created_at,
          valor_total,
          cliente_id,
          empresa_id,
          customers:cliente_id (nome, email),
          empresas:empresa_id (nome_fantasia, email)
        `)
        .eq("estabelecimento_id", estabId)
        .order("created_at", { ascending: false });

      // If we have matching IDs, filter by them
      if (recipientEmail && recipientEmail.trim() && (matchingClienteIds.length > 0 || matchingEmpresaIds.length > 0)) {
        const filters = [];
        if (matchingClienteIds.length > 0) {
          filters.push(`cliente_id.in.(${matchingClienteIds.join(',')})`);
        }
        if (matchingEmpresaIds.length > 0) {
          filters.push(`empresa_id.in.(${matchingEmpresaIds.join(',')})`);
        }
        query = query.or(filters.join(','));
      }

      query = query.limit(50);

      const { data, error } = await query;

      if (error) throw error;
      setOrcamentos(data || []);
    } catch (error) {
      console.error("Erro ao carregar orçamentos:", error);
    }
  };

  const loadCatalogs = async () => {
    try {
      const estabId = estabelecimentoId || await getEstabelecimentoId();
      if (!estabId) return;

      const { data, error } = await supabase
        .from("catalogos_salvos")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .eq("ativo", true)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      
      // Parse and filter expired catalogs
      const now = new Date();
      const parsedData: SavedCatalog[] = (data || [])
        .map((raw: SavedCatalogRaw) => ({
          ...raw,
          config: parseJsonField<CatalogConfig>(raw.config) || {
            name: '',
            pages: [],
            primaryColor: '#0f172a',
            secondaryColor: '#64748b',
            fontFamily: 'Inter, sans-serif',
            showPrices: true,
            showCodes: true,
            showPriceTable: true,
          },
          cover_page: parseJsonField<CatalogPage>(raw.cover_page),
          products_page: parseJsonField<CatalogPage>(raw.products_page),
          backcover_page: parseJsonField<CatalogPage>(raw.backcover_page),
        }))
        .filter((catalog: SavedCatalog) => {
          // Filter out expired catalogs
          if (!catalog.data_indeterminada && catalog.data_validade) {
            return new Date(catalog.data_validade) > now;
          }
          return true;
        });
      
      setCatalogs(parsedData);
    } catch (error) {
      console.error("Erro ao carregar catálogos:", error);
    }
  };

  const handleCatalogSelect = async (catalog: SavedCatalog) => {
    if (!catalog.cover_page || !catalog.products_page || !catalog.backcover_page) {
      toast({ title: "Erro", description: "Catálogo incompleto. Edite o catálogo para completar todas as páginas.", variant: "destructive" });
      return;
    }

    setGeneratingCatalogPdf(catalog.id);
    try {
      const products = catalog.products_page.products || [];
      const layout = catalog.products_page.layout || 'grid-3';
      const layoutConfig = LAYOUT_OPTIONS.find((l) => l.value === layout) || LAYOUT_OPTIONS[1];
      const productsPerPage = layout === 'list' ? 4 : layoutConfig.cols * 2;
      const groupByCategory = catalog.products_page.groupByCategory ?? true;

      // Build grouped products and pages
      const groupedProducts = buildGroupedProducts(products, groupByCategory);
      const pages = buildPages(groupedProducts, productsPerPage, groupByCategory, catalog.config.showPriceTable !== false);

      // Generate PDF using react-pdf
      const pdfBlob = await pdf(
        <CatalogPDFDocument
          config={catalog.config}
          coverPage={catalog.cover_page}
          productsPage={catalog.products_page}
          backcoverPage={catalog.backcover_page}
          groupImages={catalog.config.groupImages || {}}
          groupedProducts={groupedProducts}
          pages={pages}
        />
      ).toBlob();

      const fileName = `catalogo_${catalog.nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      
      // Upload to storage
      const estabId = estabelecimentoId || await getEstabelecimentoId();
      const filePath = `email-attachments/${estabId}/${Date.now()}_${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('bot-media')
        .upload(filePath, pdfBlob, { contentType: 'application/pdf' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('bot-media')
        .getPublicUrl(filePath);

      onAddAttachment?.({
        id: `catalog-${catalog.id}`,
        name: fileName,
        type: 'pdf',
        url: publicUrl,
        size: 'PDF'
      });

      toast({ title: "Catálogo anexado", description: `${catalog.nome} anexado como PDF` });
      setActiveToolId(null);
      setShowToolsMenu(false);
    } catch (error: any) {
      console.error("Erro ao gerar PDF do catálogo:", error);
      toast({ title: "Erro", description: "Erro ao gerar PDF do catálogo", variant: "destructive" });
    } finally {
      setGeneratingCatalogPdf(null);
    }
  };

  const hasSubMenu = (toolId: string) => {
    // All tools have sub-menus now
    return ['tool-attachments', 'tool-image', 'tool-file', 'tool-quick-replies', 'tool-budget', 'tool-catalog', 'tool-agenda-email'].includes(toolId);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const estabId = estabelecimentoId || await getEstabelecimentoId();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `email-attachments/${estabId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('bot-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('bot-media')
        .getPublicUrl(filePath);

      onAddAttachment?.({
        id: fileName,
        name: file.name,
        type: 'file',
        url: publicUrl,
        size: formatFileSize(file.size)
      });

      toast({ title: "Imagem anexada", description: file.name });
      setActiveToolId(null);
      setShowToolsMenu(false);
    } catch (error) {
      console.error("Erro ao anexar imagem:", error);
      toast({ title: "Erro", description: "Não foi possível anexar a imagem", variant: "destructive" });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const estabId = estabelecimentoId || await getEstabelecimentoId();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `email-attachments/${estabId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('bot-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('bot-media')
        .getPublicUrl(filePath);

      const fileType = file.name.endsWith('.pdf') ? 'pdf' : 
                       file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? 'excel' : 'file';

      onAddAttachment?.({
        id: fileName,
        name: file.name,
        type: fileType,
        url: publicUrl,
        size: formatFileSize(file.size)
      });

      toast({ title: "Arquivo anexado", description: file.name });
      setActiveToolId(null);
      setShowToolsMenu(false);
    } catch (error) {
      console.error("Erro ao anexar arquivo:", error);
      toast({ title: "Erro", description: "Não foi possível anexar o arquivo", variant: "destructive" });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleQuickReplySelect = (reply: any) => {
    onInsertText?.(reply.content || '');
    toast({ title: "Resposta inserida", description: reply.title });
    setActiveToolId(null);
    setShowToolsMenu(false);
  };

  const handleOrcamentoSelect = (orcamento: any) => {
    const clientName = orcamento.customers?.nome || orcamento.empresas?.nome_fantasia || 'Cliente';
    onAddAttachment?.({
      id: `orcamento-${orcamento.id}`,
      name: `Orçamento #${orcamento.numero || orcamento.id.slice(0, 8)} - ${clientName}`,
      type: 'pdf',
      url: `/orcamento/${orcamento.id}`,
      size: 'PDF'
    });
    toast({ title: "Orçamento anexado", description: `Orçamento #${orcamento.numero || orcamento.id.slice(0, 8)}` });
    setActiveToolId(null);
    setShowToolsMenu(false);
  };

  const handleImportReportSelect = async (reportId: string, format: 'pdf' | 'excel') => {
    setIsProcessingReport(true);
    setReportProgress(0);
    
    const interval = setInterval(() => {
      setReportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 150);

    setTimeout(() => {
      clearInterval(interval);
      setReportProgress(100);
      
      const report = importReports.find(r => r.id === reportId);
      if (report && onAddAttachment) {
        onAddAttachment({
          id: `${report.id}-${format}`,
          name: `${report.nome}.${format}`,
          type: format,
          url: report.url_arquivo,
          size: format === 'pdf' ? 'PDF' : 'Excel'
        });
        toast({ title: "Anexo adicionado", description: `${report.nome} anexado como ${format.toUpperCase()}` });
      }
      
      setIsProcessingReport(false);
      setActiveToolId(null);
      setShowToolsMenu(false);
      setSelectedImportReport(null);
    }, 1500);
  };

  // Handle agenda email link insertion
  const handleInsertAgendaLink = async () => {
    setInsertingAgendaLink(true);
    try {
      const estabId = estabelecimentoId || await getEstabelecimentoId();
      
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Erro", description: "Usuário não autenticado", variant: "destructive" });
        return;
      }

      // Get usuario record
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!usuario) {
        toast({ title: "Erro", description: "Usuário não encontrado", variant: "destructive" });
        return;
      }

      // Build the tracking URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const params = new URLSearchParams({
        estab: estabId || '',
        uid: usuario.id,
        email: recipientEmail || '',
        name: recipientEmail?.split('@')[0] || '',
        titulo: agendaTitulo,
        desc: agendaDescricao,
        url: agendaRedirectUrl,
      });

      const trackingUrl = `${supabaseUrl}/functions/v1/email-agenda-tracker?${params.toString()}`;

      // Insert HTML link into email body
      const htmlLink = `<a href="${trackingUrl}" style="display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">${agendaTextoLink}</a>`;
      
      onInsertText?.(htmlLink);
      
      toast({ 
        title: "Link de rastreio inserido", 
        description: "Quando o cliente clicar, será criada uma tarefa para hoje" 
      });
      
      setActiveToolId(null);
      setShowToolsMenu(false);
    } catch (error) {
      console.error('Erro ao inserir link de agenda:', error);
      toast({ title: "Erro", description: "Não foi possível inserir o link", variant: "destructive" });
    } finally {
      setInsertingAgendaLink(false);
    }
  };

  // Handle agenda email attachment insertion
  const handleInsertAgendaAnexo = async () => {
    if (!agendaAnexoFile) {
      toast({ title: "Erro", description: "Selecione um arquivo para anexar", variant: "destructive" });
      return;
    }

    setInsertingAgendaLink(true);
    try {
      const estabId = estabelecimentoId || await getEstabelecimentoId();
      
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Erro", description: "Usuário não autenticado", variant: "destructive" });
        return;
      }

      // Get usuario record
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!usuario) {
        toast({ title: "Erro", description: "Usuário não encontrado", variant: "destructive" });
        return;
      }

      // Upload the file to storage
      const fileExt = agendaAnexoFile.name.split('.').pop();
      const fileName = `${Date.now()}_${agendaAnexoFile.name}`;
      const filePath = `email-rastreio-anexos/${estabId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('bot-media')
        .upload(filePath, agendaAnexoFile);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl: filePublicUrl } } = supabase.storage
        .from('bot-media')
        .getPublicUrl(filePath);

      // Build the tracking URL that will serve/redirect to the file
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const params = new URLSearchParams({
        estab: estabId || '',
        uid: usuario.id,
        email: recipientEmail || '',
        name: recipientEmail?.split('@')[0] || '',
        titulo: agendaTitulo,
        desc: agendaDescricao,
        url: filePublicUrl, // Redirect to the file itself
        tipo: 'anexo',
      });

      const trackingUrl = `${supabaseUrl}/functions/v1/email-agenda-tracker?${params.toString()}`;

      // Add as attachment with tracking
      const attachmentType = fileExt?.toLowerCase() === 'pdf' ? 'pdf' : fileExt?.toLowerCase() === 'xlsx' || fileExt?.toLowerCase() === 'xls' ? 'excel' : 'file';
      onAddAttachment?.({
        id: `rastreio-${Date.now()}`,
        name: agendaAnexoFile.name,
        type: attachmentType as 'pdf' | 'excel' | 'file',
        url: trackingUrl, // Use tracking URL instead of direct URL
        size: `${(agendaAnexoFile.size / 1024).toFixed(1)} KB`
      });
      
      toast({ 
        title: "Anexo rastreável adicionado", 
        description: "Quando o cliente abrir, será criada uma tarefa para hoje" 
      });
      
      setAgendaAnexoFile(null);
      setActiveToolId(null);
      setShowToolsMenu(false);
    } catch (error) {
      console.error('Erro ao inserir anexo rastreável:', error);
      toast({ title: "Erro", description: "Não foi possível adicionar o anexo", variant: "destructive" });
    } finally {
      setInsertingAgendaLink(false);
    }
  };

  const handleAgendaAnexoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAgendaAnexoFile(file);
    }
  };

  const filteredQuickReplies = quickReplies.filter(r =>
    r.title?.toLowerCase().includes(quickReplySearch.toLowerCase()) ||
    r.content?.toLowerCase().includes(quickReplySearch.toLowerCase())
  );

  const filteredOrcamentos = orcamentos.filter(o => {
    const search = orcamentoSearch.toLowerCase();
    return (
      o.numero?.toString().includes(search) ||
      o.customers?.nome?.toLowerCase().includes(search) ||
      o.empresas?.nome_fantasia?.toLowerCase().includes(search)
    );
  });

  // Render sub-menu content based on tool
  const renderSubMenu = (toolId: string) => {
    switch (toolId) {
      case 'tool-image':
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Anexar Imagem</Label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full"
              onClick={() => imageInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Selecionar Imagem
            </Button>
          </div>
        );

      case 'tool-file':
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Anexar Arquivo</Label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Selecionar Arquivo
            </Button>
          </div>
        );

      case 'tool-quick-replies':
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Respostas Rápidas</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={quickReplySearch}
                onChange={(e) => setQuickReplySearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <ScrollArea className="h-40">
              {filteredQuickReplies.length > 0 ? (
                <div className="space-y-1">
                  {filteredQuickReplies.map((reply) => (
                    <button
                      key={reply.id}
                      onClick={() => handleQuickReplySelect(reply)}
                      className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <p className="text-sm font-medium truncate">{reply.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{reply.content}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {quickReplies.length === 0 ? "Nenhuma resposta cadastrada" : "Nenhum resultado"}
                </p>
              )}
            </ScrollArea>
          </div>
        );

      case 'tool-budget':
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Anexar Orçamento</Label>
            {recipientEmail && recipientEmail.trim() && (
              <p className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                Filtrando por: {recipientEmail}
              </p>
            )}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número ou cliente..."
                value={orcamentoSearch}
                onChange={(e) => setOrcamentoSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <ScrollArea className="h-40">
              {filteredOrcamentos.length > 0 ? (
                <div className="space-y-1">
                  {filteredOrcamentos.map((orc) => (
                    <button
                      key={orc.id}
                      onClick={() => handleOrcamentoSelect(orc)}
                      className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <p className="text-sm font-medium">
                        #{orc.numero || orc.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {orc.customers?.nome || orc.empresas?.nome_fantasia || 'Sem cliente'}
                        {orc.valor_total ? ` - R$ ${orc.valor_total.toFixed(2)}` : ''}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {recipientEmail && recipientEmail.trim() 
                    ? "Nenhum orçamento vinculado a este email"
                    : orcamentos.length === 0 
                      ? "Nenhum orçamento encontrado" 
                      : "Nenhum resultado"}
                </p>
              )}
            </ScrollArea>
          </div>
        );

      case 'tool-attachments':
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Anexar Relatório</Label>
            {isProcessingReport && <Progress value={reportProgress} className="h-2" />}
            {importReports.length > 0 ? (
              <div className="space-y-3">
                <Select 
                  value={selectedImportReport || ""} 
                  onValueChange={(value) => setSelectedImportReport(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Escolha um relatório..." />
                  </SelectTrigger>
                  <SelectContent style={{ zIndex: 10001 }}>
                    {importReports.map((report) => (
                      <SelectItem key={report.id} value={report.id}>
                        {report.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedImportReport && (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleImportReportSelect(selectedImportReport, 'pdf')} 
                      disabled={isProcessingReport}
                    >
                      <FileText className="h-4 w-4 mr-2 text-red-500" />
                      PDF
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleImportReportSelect(selectedImportReport, 'excel')} 
                      disabled={isProcessingReport}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                      Excel
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum relatório disponível</p>
            )}
          </div>
        );

      case 'tool-catalog':
        const filteredCatalogs = catalogs.filter((catalog) => {
          const searchLower = catalogSearch.toLowerCase();
          return catalog.nome.toLowerCase().includes(searchLower);
        });
        
        const getProductCount = (catalog: SavedCatalog) => {
          return catalog.products_page?.products?.length || 0;
        };
        
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Anexar Catálogo de Produtos</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar catálogo..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <ScrollArea className="h-64">
              {catalogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Nenhum catálogo ativo disponível
                </div>
              ) : filteredCatalogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum catálogo encontrado
                </p>
              ) : (
                <div className="space-y-2 pr-2">
                  {filteredCatalogs.map((catalog) => (
                    <Card 
                      key={catalog.id} 
                      className="p-3 hover:bg-muted/50 transition-colors rounded-xl"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          {/* Thumbnail */}
                          <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                            {catalog.thumbnail ? (
                              <img
                                src={catalog.thumbnail}
                                alt={catalog.nome}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="h-5 w-5 text-muted-foreground/50" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm truncate">
                                {catalog.nome}
                              </span>
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                <Package className="h-3 w-3 mr-1" />
                                {getProductCount(catalog)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(catalog.updated_at), "dd/MM/yy", { locale: ptBR })}
                              </span>
                              {!catalog.data_indeterminada && catalog.data_validade && (
                                <span className="flex items-center gap-1 text-amber-600">
                                  <AlertCircle className="h-3 w-3" />
                                  Até {format(new Date(catalog.data_validade), "dd/MM/yy")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="default"
                          className="w-full h-8 text-xs rounded-lg"
                          onClick={() => handleCatalogSelect(catalog)}
                          disabled={generatingCatalogPdf === catalog.id}
                        >
                          {generatingCatalogPdf === catalog.id ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              Gerando PDF...
                            </>
                          ) : (
                            <>
                              <FileDown className="h-3.5 w-3.5 mr-1.5" />
                              Anexar PDF do Catálogo
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        );

      case 'tool-agenda-email':
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-orange-500" />
              Link para Rastreio e Agendamento
            </Label>
            <p className="text-xs text-muted-foreground">
              Rastreia quando o cliente interage e cria automaticamente uma tarefa no calendário para hoje.
            </p>
            
            {/* Tipo de rastreamento */}
            <div className="space-y-2">
              <Label className="text-xs">Tipo de Rastreamento</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={agendaTipoRastreio === 'link' ? 'default' : 'outline'}
                  className={cn("flex-1 h-8 text-xs", agendaTipoRastreio === 'link' && "bg-orange-500 hover:bg-orange-600")}
                  onClick={() => setAgendaTipoRastreio('link')}
                >
                  <Link2 className="h-3 w-3 mr-1" />
                  Link no Email
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={agendaTipoRastreio === 'anexo' ? 'default' : 'outline'}
                  className={cn("flex-1 h-8 text-xs", agendaTipoRastreio === 'anexo' && "bg-orange-500 hover:bg-orange-600")}
                  onClick={() => setAgendaTipoRastreio('anexo')}
                >
                  <Paperclip className="h-3 w-3 mr-1" />
                  Anexo Rastreável
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Título da Tarefa</Label>
              <Input
                value={agendaTitulo}
                onChange={(e) => setAgendaTitulo(e.target.value)}
                placeholder="Ex: Retorno cliente"
                className="h-8 text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Descrição da Tarefa</Label>
              <Textarea
                value={agendaDescricao}
                onChange={(e) => setAgendaDescricao(e.target.value)}
                placeholder="Ex: Cliente clicou no link do email"
                className="text-sm min-h-[60px]"
              />
            </div>
            
            {agendaTipoRastreio === 'link' ? (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Texto do Botão no Email</Label>
                  <Input
                    value={agendaTextoLink}
                    onChange={(e) => setAgendaTextoLink(e.target.value)}
                    placeholder="Ex: Clique para agendar"
                    className="h-8 text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">URL de Redirecionamento</Label>
                  <Input
                    value={agendaRedirectUrl}
                    onChange={(e) => setAgendaRedirectUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-8 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Para onde o cliente será direcionado após clicar
                  </p>
                </div>
                
                <Button 
                  size="sm" 
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  onClick={handleInsertAgendaLink}
                  disabled={insertingAgendaLink || !agendaTitulo.trim() || !agendaTextoLink.trim()}
                >
                  {insertingAgendaLink ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Inserindo...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4 mr-2" />
                      Inserir Link no Email
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Selecionar Arquivo</Label>
                  <input
                    ref={agendaAnexoInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleAgendaAnexoChange}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs"
                      onClick={() => agendaAnexoInputRef.current?.click()}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      {agendaAnexoFile ? agendaAnexoFile.name : 'Escolher arquivo'}
                    </Button>
                    {agendaAnexoFile && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => setAgendaAnexoFile(null)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Quando o cliente abrir o anexo, será criada uma tarefa
                  </p>
                </div>
                
                <Button 
                  size="sm" 
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  onClick={handleInsertAgendaAnexo}
                  disabled={insertingAgendaLink || !agendaTitulo.trim() || !agendaAnexoFile}
                >
                  {insertingAgendaLink ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Anexando...
                    </>
                  ) : (
                    <>
                      <Paperclip className="h-4 w-4 mr-2" />
                      Adicionar Anexo Rastreável
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Tools expanding upward */}
      {showToolsMenu && (
        <div 
          className="absolute bottom-full left-0 mb-2 flex flex-col-reverse gap-1.5"
          style={{ zIndex: 9999 }}
        >
          {emailFerramentas.map((ferramenta, index) => {
            const IconComponent = ferramenta.IconComponent;
            const isActive = activeToolId === ferramenta.ferramenta_id;
            const toolHasSubMenu = hasSubMenu(ferramenta.ferramenta_id);
            
            return (
              <div 
                key={ferramenta.id} 
                className="animate-scale-in" 
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {toolHasSubMenu ? (
                  <Popover 
                    open={isActive} 
                    onOpenChange={(open) => setActiveToolId(open ? ferramenta.ferramenta_id : null)} 
                    modal={false}
                  >
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <PopoverTrigger asChild>
                            <button 
                              className={isActive ? toolbarBtnActiveClass : toolbarBtnClass} 
                              disabled={disabled}
                            >
                              <IconComponent size={18} />
                            </button>
                          </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="right"><p>{ferramenta.nome}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <PopoverContent 
                      className="w-72 p-3 rounded-xl shadow-xl border-border/50 bg-popover" 
                      align="start" 
                      side="right"
                      sideOffset={8}
                      style={{ zIndex: 10000 }}
                    >
                      {renderSubMenu(ferramenta.ferramenta_id)}
                    </PopoverContent>
                  </Popover>
                ) : (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          className={toolbarBtnClass} 
                          disabled={disabled}
                          onClick={() => onToolAction?.(ferramenta.ferramenta_id)}
                        >
                          <IconComponent size={18} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right"><p>{ferramenta.nome}</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Main trigger button */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              className={cn(
                "relative w-10 h-10 rounded-full cursor-pointer",
                "bg-orange-100 hover:bg-orange-200",
                "flex items-center justify-center",
                "transition-all duration-300 ease-out",
                "text-orange-600 hover:text-orange-700",
                showToolsMenu && "bg-orange-500 text-white rotate-45 shadow-md"
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[EmailToolsMenu] Button clicked, showToolsMenu:', !showToolsMenu, 'disabled:', disabled, 'loadingFerramentas:', loadingFerramentas);
                setShowToolsMenu(!showToolsMenu);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              type="button"
              disabled={loadingFerramentas}
            >
              <Plus className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            {showToolsMenu ? "Fechar menu" : "Abrir ferramentas"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}