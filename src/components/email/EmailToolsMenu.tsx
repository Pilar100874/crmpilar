import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Plus, FileText, Languages, Sparkles, BookOpen, FileCheck, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/hooks/use-toast";
import { useFerramentasAtendimento, type TabType, type FerramentaConfig } from "@/hooks/useFerramentasAtendimento";

// Elegant toolbar button styles matching ChatInput
const toolbarBtnClass = "h-9 w-9 rounded-xl bg-card border border-border/30 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border/50 hover:shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed";
const toolbarBtnActiveClass = "h-9 w-9 rounded-xl bg-primary/15 border border-primary/40 shadow-sm flex items-center justify-center text-primary hover:bg-primary/20 transition-all duration-200";

interface EmailToolsMenuProps {
  estabelecimentoId: string | null;
  onInsertText?: (text: string) => void;
  disabled?: boolean;
}

export function EmailToolsMenu({ estabelecimentoId, onInsertText, disabled }: EmailToolsMenuProps) {
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Translate states
  const [showTranslatePopover, setShowTranslatePopover] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Import Reports states
  const [showImportReportsPopover, setShowImportReportsPopover] = useState(false);
  const [importReports, setImportReports] = useState<any[]>([]);
  const [selectedImportReport, setSelectedImportReport] = useState<string | null>(null);
  const [isProcessingReport, setIsProcessingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);

  // Get ferramentas configuradas
  const { getToolbarFerramentas } = useFerramentasAtendimento(estabelecimentoId);
  const ferramentasEmail = getToolbarFerramentas('email' as TabType);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // Only close main menu if no popover is open
        if (!showTranslatePopover && !showImportReportsPopover) {
          setShowToolsMenu(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTranslatePopover, showImportReportsPopover]);

  // Load import reports
  useEffect(() => {
    loadImportReports();
  }, [estabelecimentoId]);

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

  const handleImportReportSelect = async (reportId: string, format: 'pdf' | 'excel') => {
    setSelectedImportReport(reportId);
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
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      setReportProgress(100);
      const report = importReports.find(r => r.id === reportId);
      if (report && onInsertText) {
        onInsertText(`\n[Relatório anexado: ${report.nome} (${format.toUpperCase()})]\nLink: ${report.url_arquivo}\n`);
      }
      setIsProcessingReport(false);
      setShowImportReportsPopover(false);
      setShowToolsMenu(false);
      toast({ title: "Relatório anexado", description: "O relatório foi adicionado ao email" });
    }, 2000);
  };

  const handleToolClick = (ferramenta: FerramentaConfig) => {
    const toolId = ferramenta.ferramenta_id;
    
    switch (toolId) {
      case 'tool-translate':
        setShowTranslatePopover(true);
        break;
      case 'tool-reports':
        setShowImportReportsPopover(true);
        break;
      case 'anexar_orcamento':
        toast({ title: "Anexar Orçamento", description: "Selecione um orçamento para anexar" });
        setShowToolsMenu(false);
        break;
      default:
        toast({ title: ferramenta.nome, description: `Ferramenta "${ferramenta.nome}" será implementada em breve` });
        setShowToolsMenu(false);
    }
  };

  // Build toolbar items based on configured ferramentas
  const allItems: React.ReactNode[] = [];

  ferramentasEmail.forEach((ferramenta) => {
    const Icon = ferramenta.IconComponent;
    const toolId = ferramenta.ferramenta_id;

    if (toolId === 'tool-translate') {
      // Translate with popover
      allItems.push(
        <TooltipProvider key={ferramenta.id} delayDuration={200}>
          <Tooltip>
            <Popover open={showTranslatePopover} onOpenChange={setShowTranslatePopover} modal={false}>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button 
                    className={isTranslating ? toolbarBtnActiveClass : toolbarBtnClass} 
                    disabled={disabled}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isTranslating ? <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Icon size={18} />}
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <PopoverContent 
                className="w-56 p-3 rounded-xl shadow-xl border-border/50 bg-popover" 
                align="start" 
                side="right"
                sideOffset={8}
                style={{ zIndex: 10000 }}
                onInteractOutside={(e) => e.preventDefault()}
              >
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Traduzir para</Label>
                  <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent style={{ zIndex: 10001 }}>
                      <SelectItem value="en">Inglês</SelectItem>
                      <SelectItem value="es">Espanhol</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                      <SelectItem value="fr">Francês</SelectItem>
                      <SelectItem value="de">Alemão</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    size="sm" 
                    onClick={() => { 
                      setShowTranslatePopover(false); 
                      setShowToolsMenu(false); 
                      toast({ title: "Traduzir", description: `Traduzindo para ${targetLanguage}` });
                    }} 
                    className="w-full"
                  >
                    <Languages className="h-4 w-4 mr-2" /> Traduzir
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <TooltipContent side="right"><p>{ferramenta.nome}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else if (toolId === 'tool-reports') {
      // Import Reports with popover
      allItems.push(
        <TooltipProvider key={ferramenta.id} delayDuration={200}>
          <Tooltip>
            <Popover open={showImportReportsPopover} onOpenChange={setShowImportReportsPopover} modal={false}>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button 
                    className={showImportReportsPopover ? toolbarBtnActiveClass : toolbarBtnClass} 
                    disabled={disabled}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Icon size={18} />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <PopoverContent 
                className="w-72 p-3 rounded-xl shadow-xl border-border/50 bg-popover" 
                align="start" 
                side="right"
                sideOffset={8}
                style={{ zIndex: 10000 }}
                onInteractOutside={(e) => e.preventDefault()}
              >
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Relatórios Importados</Label>
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
              </PopoverContent>
            </Popover>
            <TooltipContent side="right"><p>{ferramenta.nome}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else {
      // Regular button with tooltip
      allItems.push(
        <TooltipProvider key={ferramenta.id} delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={toolbarBtnClass}
                onClick={() => handleToolClick(ferramenta)}
                disabled={disabled}
              >
                <Icon size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>{ferramenta.nome}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
  });

  // If no configured tools, add default translate and reports
  if (allItems.length === 0) {
    // Default translate
    allItems.push(
      <TooltipProvider key="translate-default" delayDuration={200}>
        <Tooltip>
          <Popover open={showTranslatePopover} onOpenChange={setShowTranslatePopover} modal={false}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button 
                  className={isTranslating ? toolbarBtnActiveClass : toolbarBtnClass} 
                  disabled={disabled}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Languages size={18} />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <PopoverContent 
              className="w-56 p-3 rounded-xl shadow-xl border-border/50 bg-popover" 
              align="start" 
              side="right"
              sideOffset={8}
              style={{ zIndex: 10000 }}
              onInteractOutside={(e) => e.preventDefault()}
            >
              <div className="space-y-3">
                <Label className="text-sm font-medium">Traduzir para</Label>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent style={{ zIndex: 10001 }}>
                    <SelectItem value="en">Inglês</SelectItem>
                    <SelectItem value="es">Espanhol</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="fr">Francês</SelectItem>
                    <SelectItem value="de">Alemão</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  onClick={() => { 
                    setShowTranslatePopover(false); 
                    setShowToolsMenu(false);
                    toast({ title: "Traduzir", description: `Traduzindo para ${targetLanguage}` });
                  }} 
                  className="w-full"
                >
                  <Languages className="h-4 w-4 mr-2" /> Traduzir
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <TooltipContent side="right"><p>Traduzir</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    // Default reports
    allItems.push(
      <TooltipProvider key="reports-default" delayDuration={200}>
        <Tooltip>
          <Popover open={showImportReportsPopover} onOpenChange={setShowImportReportsPopover} modal={false}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button 
                  className={showImportReportsPopover ? toolbarBtnActiveClass : toolbarBtnClass} 
                  disabled={disabled}
                  onClick={(e) => e.stopPropagation()}
                >
                  <FileCheck size={18} />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <PopoverContent 
              className="w-72 p-3 rounded-xl shadow-xl border-border/50 bg-popover" 
              align="start" 
              side="right"
              sideOffset={8}
              style={{ zIndex: 10000 }}
              onInteractOutside={(e) => e.preventDefault()}
            >
              <div className="space-y-3">
                <Label className="text-sm font-medium">Relatórios Importados</Label>
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
            </PopoverContent>
          </Popover>
          <TooltipContent side="right"><p>Relatórios</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      {/* All items expanding to the right in a row */}
      {showToolsMenu && (
        <div 
          className="absolute left-full top-1/2 -translate-y-1/2 ml-2 flex flex-row gap-1.5"
          style={{ zIndex: 9999 }}
        >
          {allItems.map((item, index) => (
            <div 
              key={`tool-${index}`}
              className="transform transition-all duration-200 flex-shrink-0 animate-scale-in"
              style={{
                animationDelay: `${index * 30}ms`,
              }}
            >
              {item}
            </div>
          ))}
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
