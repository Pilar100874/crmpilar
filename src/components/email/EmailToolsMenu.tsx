import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Plus, FileText, Languages, FileCheck, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/hooks/use-toast";
import type { EmailAttachment } from "./ComposeEmailDialog";

// Elegant toolbar button styles matching ChatInput
const toolbarBtnClass = "h-9 w-9 rounded-xl bg-card border border-border/30 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border/50 hover:shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed";
const toolbarBtnActiveClass = "h-9 w-9 rounded-xl bg-primary/15 border border-primary/40 shadow-sm flex items-center justify-center text-primary hover:bg-primary/20 transition-all duration-200";

interface EmailToolsMenuProps {
  estabelecimentoId: string | null;
  onInsertText?: (text: string) => void;
  onAddAttachment?: (attachment: EmailAttachment) => void;
  disabled?: boolean;
}

export function EmailToolsMenu({ estabelecimentoId, onInsertText, onAddAttachment, disabled }: EmailToolsMenuProps) {
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

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      // Simular tradução - aqui seria a chamada real para a API de tradução
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({ title: "Tradução", description: `Texto traduzido para ${getLanguageName(targetLanguage)}` });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao traduzir", variant: "destructive" });
    } finally {
      setIsTranslating(false);
      setShowTranslatePopover(false);
      setShowToolsMenu(false);
    }
  };

  const getLanguageName = (code: string) => {
    const names: Record<string, string> = {
      en: "Inglês",
      es: "Espanhol", 
      pt: "Português",
      fr: "Francês",
      de: "Alemão"
    };
    return names[code] || code;
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
        // Add as actual attachment
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
      setShowImportReportsPopover(false);
      setShowToolsMenu(false);
      setSelectedImportReport(null);
    }, 1500);
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Tools expanding upward */}
      {showToolsMenu && (
        <div 
          className="absolute bottom-full left-0 mb-2 flex flex-col-reverse gap-1.5"
          style={{ zIndex: 9999 }}
        >
          {/* Translate Tool */}
          <div className="animate-scale-in" style={{ animationDelay: '0ms' }}>
            <Popover open={showTranslatePopover} onOpenChange={setShowTranslatePopover} modal={false}>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button 
                        className={showTranslatePopover || isTranslating ? toolbarBtnActiveClass : toolbarBtnClass} 
                        disabled={disabled}
                      >
                        {isTranslating ? (
                          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Languages size={18} />
                        )}
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right"><p>Traduzir</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <PopoverContent 
                className="w-56 p-3 rounded-xl shadow-xl border-border/50 bg-popover" 
                align="start" 
                side="right"
                sideOffset={8}
                style={{ zIndex: 10000 }}
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
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    className="w-full"
                  >
                    {isTranslating ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <Languages className="h-4 w-4 mr-2" />
                    )}
                    Traduzir
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Reports Tool */}
          <div className="animate-scale-in" style={{ animationDelay: '30ms' }}>
            <Popover open={showImportReportsPopover} onOpenChange={setShowImportReportsPopover} modal={false}>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button 
                        className={showImportReportsPopover ? toolbarBtnActiveClass : toolbarBtnClass} 
                        disabled={disabled}
                      >
                        <FileCheck size={18} />
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right"><p>Anexar Relatório</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <PopoverContent 
                className="w-72 p-3 rounded-xl shadow-xl border-border/50 bg-popover" 
                align="start" 
                side="right"
                sideOffset={8}
                style={{ zIndex: 10000 }}
              >
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
              </PopoverContent>
            </Popover>
          </div>
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