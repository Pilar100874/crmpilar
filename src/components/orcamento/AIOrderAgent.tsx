import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, Trash2, Check, AlertTriangle, Search, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { Produto } from "@/types/orcamento";

interface ParsedItem {
  nome: string;
  quantidade: number;
  keywords: string[];
  especificacoes?: string;
}

interface MatchedItem {
  parsed: ParsedItem;
  produto: Produto | null;
  candidates: Produto[];
  quantity: number;
  showCandidates: boolean;
}

interface AIOrderAgentProps {
  estabelecimentoId: string;
  produtos: Produto[];
  onItemsConfirmed: (items: Array<{ produto: Produto; quantity: number }>) => void;
}

export default function AIOrderAgent({ estabelecimentoId, produtos, onItemsConfirmed }: AIOrderAgentProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"input" | "review">("input");
  const [matchedItems, setMatchedItems] = useState<MatchedItem[]>([]);

  const searchProducts = (parsed: ParsedItem): { best: Produto | null; candidates: Produto[] } => {
    const allKeywords = [parsed.nome, ...parsed.keywords].map(k => k.toLowerCase());
    
    const scored = produtos.map(p => {
      const pName = p.nome.toLowerCase();
      let score = 0;
      for (const kw of allKeywords) {
        if (pName.includes(kw)) score += 3;
        else {
          const words = kw.split(/\s+/);
          for (const w of words) {
            if (w.length > 2 && pName.includes(w)) score += 1;
          }
        }
      }
      return { produto: p, score };
    }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

    return {
      best: scored.length > 0 ? scored[0].produto : null,
      candidates: scored.slice(0, 5).map(s => s.produto),
    };
  };

  const handleParse = async () => {
    if (!text.trim()) {
      toast.error("Digite os itens desejados");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-order-items", {
        body: { text },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const parsedItems: ParsedItem[] = data.items || [];
      
      if (parsedItems.length === 0) {
        toast.error("Nenhum item identificado no texto");
        return;
      }

      const matched = parsedItems.map(parsed => {
        const { best, candidates } = searchProducts(parsed);
        return {
          parsed,
          produto: best,
          candidates,
          quantity: parsed.quantidade,
          showCandidates: false,
        };
      });

      setMatchedItems(matched);
      setStep("review");
    } catch (err: any) {
      console.error("AI parse error:", err);
      toast.error(err.message || "Erro ao processar itens com IA");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    const validItems = matchedItems
      .filter(m => m.produto !== null)
      .map(m => ({ produto: m.produto!, quantity: m.quantity }));

    if (validItems.length === 0) {
      toast.error("Nenhum item válido para adicionar");
      return;
    }

    onItemsConfirmed(validItems);
    toast.success(`${validItems.length} item(ns) adicionado(s) ao carrinho!`);
    handleClose();
  };

  const handleClose = () => {
    setOpen(false);
    setText("");
    setStep("input");
    setMatchedItems([]);
  };

  const updateItemQuantity = (index: number, qty: number) => {
    setMatchedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity: Math.max(1, qty) } : item
    ));
  };

  const selectProduct = (index: number, produto: Produto) => {
    setMatchedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, produto, showCandidates: false } : item
    ));
  };

  const removeItem = (index: number) => {
    setMatchedItems(prev => prev.filter((_, i) => i !== index));
  };

  const toggleCandidates = (index: number) => {
    setMatchedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, showCandidates: !item.showCandidates } : item
    ));
  };

  const validCount = matchedItems.filter(m => m.produto !== null).length;
  const unmatchedCount = matchedItems.filter(m => m.produto === null).length;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
      >
        <Sparkles className="w-4 h-4" />
        <span className="hidden sm:inline">Pedido por IA</span>
      </Button>

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {step === "input" ? "Assistente de Pedido" : "Conferência de Itens"}
            </DialogTitle>
            <DialogDescription>
              {step === "input"
                ? "Descreva os itens e quantidades que o cliente deseja. Ex: '10 sacos de cimento, 5 barras de ferro 3/8, 20m² de piso porcelanato'"
                : "Confira os itens encontrados, ajuste quantidades ou troque produtos antes de adicionar ao pedido."
              }
            </DialogDescription>
          </DialogHeader>

          {step === "input" ? (
            <div className="flex-1 space-y-4">
              <Textarea
                placeholder="Ex: 50 bobinas de papel kraft 80g, 30 caixas de papel A4, 10 rolos de filme stretch..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[150px]"
                autoFocus
              />
              <div className="flex justify-end">
                <Button onClick={handleParse} disabled={loading || !text.trim()} className="gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Buscar Itens
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="gap-1">
                  <Check className="w-3 h-3" /> {validCount} encontrado(s)
                </Badge>
                {unmatchedCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" /> {unmatchedCount} não encontrado(s)
                  </Badge>
                )}
              </div>

              <ScrollArea className="flex-1 max-h-[400px]">
                <div className="space-y-3 pr-3">
                  {matchedItems.map((item, index) => (
                    <div
                      key={index}
                      className={`rounded-xl border p-3 space-y-2 transition-colors ${
                        item.produto ? "border-border bg-card" : "border-destructive/40 bg-destructive/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">
                            Solicitado: <span className="font-medium text-foreground">{item.parsed.nome}</span>
                            {item.parsed.especificacoes && (
                              <span className="text-muted-foreground"> — {item.parsed.especificacoes}</span>
                            )}
                          </p>
                          {item.produto ? (
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-primary shrink-0" />
                              <p className="font-medium text-sm truncate">{item.produto.nome}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-destructive font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Produto não encontrado no catálogo
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                            className="w-20 h-8 text-center text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {item.candidates.length > 1 && (
                        <div>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => toggleCandidates(index)}
                          >
                            {item.showCandidates ? "Ocultar alternativas" : `Ver ${item.candidates.length} alternativas`}
                          </Button>
                          {item.showCandidates && (
                            <div className="mt-2 space-y-1">
                              {item.candidates.map((c) => (
                                <button
                                  key={c.id}
                                  onClick={() => selectProduct(index, c)}
                                  className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${
                                    item.produto?.id === c.id
                                      ? "bg-primary/15 text-primary font-medium"
                                      : "hover:bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {c.nome}
                                  {c.gramatura ? ` • ${c.gramatura}g` : ""}
                                  {c.largura ? ` • L${c.largura}` : ""}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter className="flex-row gap-2">
            {step === "review" && (
              <Button variant="outline" onClick={() => setStep("input")} className="mr-auto">
                Voltar
              </Button>
            )}
            <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
            {step === "review" && (
              <Button onClick={handleConfirm} disabled={validCount === 0} className="gap-2">
                <Check className="w-4 h-4" />
                Adicionar {validCount} item(ns)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
