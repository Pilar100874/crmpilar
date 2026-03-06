import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";
import { Receipt, Search, Link2, FileDown, User, DollarSign, Calendar, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";

const toolbarBtnClass = "h-9 w-9 rounded-xl bg-background border border-border/50 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 hover:shadow-md";
const toolbarBtnActiveClass = "h-9 w-9 rounded-xl bg-primary/15 border border-primary/40 shadow-sm flex items-center justify-center text-primary hover:bg-primary/20 transition-all duration-200";

interface OrcamentoRaw {
  id: string;
  cliente?: { nome: string; telefone?: string } | Array<{ nome: string; telefone?: string }>;
  vendedor?: { nome: string } | Array<{ nome: string }>;
  valor_total: number;
  created_at: string;
  token_compartilhamento?: string;
  itens?: Array<{
    id: string;
    quantidade: number;
    preco_unitario: number;
    subtotal: number;
    produto?: { nome: string; codigo?: string } | Array<{ nome: string; codigo?: string }>;
  }>;
}

interface Orcamento {
  id: string;
  clienteNome?: string;
  clienteTelefone?: string;
  vendedorNome?: string;
  valor_total: number;
  created_at: string;
  token_compartilhamento?: string;
  itens?: Array<{
    id: string;
    quantidade: number;
    preco_unitario: number;
    subtotal: number;
    produtoNome?: string;
    produtoCodigo?: string;
  }>;
}

interface OrcamentoAttachmentSelectorProps {
  onSelectLink: (link: string, title: string) => void;
  onSelectPdf: (file: File, url: string) => void;
  disabled?: boolean;
}

export default function OrcamentoAttachmentSelector({ 
  onSelectLink, 
  onSelectPdf,
  disabled 
}: OrcamentoAttachmentSelectorProps) {
  const [open, setOpen] = useState(false);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadOrcamentos();
    }
  }, [open]);

  const loadOrcamentos = async () => {
    setLoading(true);
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) return;

      const { data, error } = await supabase
        .from("orcamentos")
        .select(`
          id,
          valor_total,
          created_at,
          token_compartilhamento,
          cliente:customers(nome, telefone),
          vendedor:usuarios!orcamentos_vendedor_id_fkey(nome),
          itens:orcamento_itens(
            id,
            quantidade,
            preco_unitario,
            subtotal,
            produto:produtos(nome, codigo)
          )
        `)
        .eq("estabelecimento_id", estabId)
        .eq("etapa", "orcamento")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Normaliza os dados do Supabase
      const normalizedData: Orcamento[] = (data || []).map((raw: OrcamentoRaw) => {
        const cliente = Array.isArray(raw.cliente) ? raw.cliente[0] : raw.cliente;
        const vendedor = Array.isArray(raw.vendedor) ? raw.vendedor[0] : raw.vendedor;
        
        return {
          id: raw.id,
          clienteNome: cliente?.nome,
          clienteTelefone: cliente?.telefone,
          vendedorNome: vendedor?.nome,
          valor_total: raw.valor_total,
          created_at: raw.created_at,
          token_compartilhamento: raw.token_compartilhamento,
          itens: raw.itens?.map(item => {
            const produto = Array.isArray(item.produto) ? item.produto[0] : item.produto;
            return {
              id: item.id,
              quantidade: item.quantidade,
              preco_unitario: item.preco_unitario,
              subtotal: item.subtotal,
              produtoNome: produto?.nome,
              produtoCodigo: produto?.codigo,
            };
          }),
        };
      });
      
      setOrcamentos(normalizedData);
    } catch (error: any) {
      console.error("Erro ao carregar orçamentos:", error);
      toast.error("Erro ao carregar orçamentos");
    } finally {
      setLoading(false);
    }
  };

  const handleShareLink = (orcamento: Orcamento) => {
    if (orcamento.token_compartilhamento) {
      const link = `${window.location.origin}/orcamento/${orcamento.token_compartilhamento}`;
      const title = `Orçamento #${orcamento.id.slice(0, 8)} - ${orcamento.clienteNome || 'Cliente'}`;
      onSelectLink(link, title);
      setOpen(false);
      toast.success("Link do orçamento selecionado!");
    } else {
      toast.error("Este orçamento não possui link de compartilhamento");
    }
  };

  const generatePdf = async (orcamento: Orcamento) => {
    setGeneratingPdf(orcamento.id);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("ORÇAMENTO", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`#${orcamento.id.slice(0, 8)}`, pageWidth / 2, 28, { align: "center" });

      // Info section
      let y = 45;
      doc.setFontSize(11);
      
      doc.setFont("helvetica", "bold");
      doc.text("Cliente:", 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(orcamento.clienteNome || "N/A", 55, y);
      
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Vendedor:", 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(orcamento.vendedorNome || "N/A", 55, y);
      
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Data:", 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(format(new Date(orcamento.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }), 55, y);

      // Items table
      y += 15;
      doc.setFont("helvetica", "bold");
      doc.text("ITENS", 20, y);
      
      y += 8;
      doc.setFontSize(9);
      doc.setFillColor(240, 240, 240);
      doc.rect(20, y - 4, pageWidth - 40, 8, "F");
      doc.text("Produto", 22, y);
      doc.text("Qtd", 110, y);
      doc.text("Preço Unit.", 130, y);
      doc.text("Subtotal", 165, y);
      
      y += 8;
      doc.setFont("helvetica", "normal");
      
      if (orcamento.itens && orcamento.itens.length > 0) {
        orcamento.itens.forEach((item) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          
          const prodNome = item.produtoNome || "Produto não identificado";
          const nomeTruncado = prodNome.length > 45 ? prodNome.substring(0, 42) + "..." : prodNome;
          
          doc.text(nomeTruncado, 22, y);
          doc.text(String(item.quantidade), 110, y);
          doc.text(
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco_unitario),
            130, y
          );
          doc.text(
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.subtotal),
            165, y
          );
          y += 7;
        });
      } else {
        doc.text("Nenhum item", 22, y);
        y += 7;
      }

      // Total
      y += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y, pageWidth - 20, y);
      y += 8;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL:", 130, y);
      doc.text(
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.valor_total || 0),
        165, y
      );

      // Generate blob using arraybuffer for better reliability
      const pdfArrayBuffer = doc.output("arraybuffer");
      const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });
      const fileName = `orcamento_${orcamento.id.slice(0, 8)}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });
      const url = URL.createObjectURL(pdfBlob);
      
      onSelectPdf(file, url);
      setOpen(false);
      toast.success("PDF do orçamento gerado!");
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF do orçamento");
    } finally {
      setGeneratingPdf(null);
    }
  };

  const filteredOrcamentos = orcamentos.filter((orc) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      orc.clienteNome?.toLowerCase().includes(searchLower) ||
      orc.id.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                className={open ? toolbarBtnActiveClass : toolbarBtnClass}
                disabled={disabled}
              >
                <Receipt size={18} />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Anexar Orçamento</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-96 p-0 rounded-2xl shadow-xl" align="start" sideOffset={8}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm">Anexar Orçamento</h4>
            <button onClick={() => setOpen(false)} className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><X size={14} /></button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
        </div>

        <ScrollArea className="h-80">
          <div className="p-3 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredOrcamentos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {searchQuery ? "Nenhum orçamento encontrado" : "Nenhum orçamento em aberto"}
              </div>
            ) : (
              filteredOrcamentos.map((orc) => (
                <Card 
                  key={orc.id} 
                  className="p-3 hover:bg-muted/50 transition-colors rounded-xl"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-sm truncate">
                            {orc.clienteNome || "Cliente"}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(orc.created_at), "dd/MM/yy")}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(orc.valor_total || 0)}
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        #{orc.id.slice(0, 6)}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs rounded-lg"
                        onClick={() => handleShareLink(orc)}
                        disabled={!orc.token_compartilhamento}
                      >
                        <Link2 className="h-3.5 w-3.5 mr-1.5" />
                        Enviar Link
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs rounded-lg"
                        onClick={() => generatePdf(orc)}
                        disabled={generatingPdf === orc.id}
                      >
                        {generatingPdf === orc.id ? (
                          <div className="h-3.5 w-3.5 mr-1.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FileDown className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Anexar PDF
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
