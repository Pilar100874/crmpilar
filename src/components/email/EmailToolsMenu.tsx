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
import { Plus, FileText, FileSpreadsheet, Upload, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/hooks/use-toast";
import { useFerramentasAtendimento } from "@/hooks/useFerramentasAtendimento";
import type { EmailAttachment } from "./ComposeEmailDialog";

// Elegant toolbar button styles matching ChatInput
const toolbarBtnClass = "h-9 w-9 rounded-xl bg-card border border-border/30 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border/50 hover:shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed";
const toolbarBtnActiveClass = "h-9 w-9 rounded-xl bg-primary/15 border border-primary/40 shadow-sm flex items-center justify-center text-primary hover:bg-primary/20 transition-all duration-200";

interface EmailToolsMenuProps {
  estabelecimentoId: string | null;
  onInsertText?: (text: string) => void;
  onAddAttachment?: (attachment: EmailAttachment) => void;
  onToolAction?: (toolId: string) => void;
  disabled?: boolean;
}

export function EmailToolsMenu({ estabelecimentoId, onInsertText, onAddAttachment, onToolAction, disabled }: EmailToolsMenuProps) {
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load ferramentas from database
  const { getToolbarFerramentas, loading: loadingFerramentas } = useFerramentasAtendimento(estabelecimentoId);
  const emailFerramentas = getToolbarFerramentas('email');
  
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

  // Load data when menu opens
  useEffect(() => {
    if (showToolsMenu) {
      loadImportReports();
      loadQuickReplies();
      loadOrcamentos();
    }
  }, [showToolsMenu, estabelecimentoId]);

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

      const { data, error } = await supabase
        .from("orcamentos")
        .select(`
          id,
          numero,
          created_at,
          valor_total,
          customers:cliente_id (nome),
          empresas:empresa_id (nome_fantasia)
        `)
        .eq("estabelecimento_id", estabId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setOrcamentos(data || []);
    } catch (error) {
      console.error("Erro ao carregar orçamentos:", error);
    }
  };

  const hasSubMenu = (toolId: string) => {
    // All tools have sub-menus now
    return ['tool-attachments', 'tool-image', 'tool-file', 'tool-quick-replies', 'tool-budget'].includes(toolId);
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
                  {orcamentos.length === 0 ? "Nenhum orçamento encontrado" : "Nenhum resultado"}
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
      <TooltipProvider delayDuration={200}>
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
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              type="button"
              disabled={loadingFerramentas}
            >
              <Plus className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{showToolsMenu ? "Fechar menu" : "Abrir ferramentas"}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}