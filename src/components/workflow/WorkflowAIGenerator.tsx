import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Wand2, HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Node, Edge } from "@xyflow/react";

interface BlockDefinition {
  type: string;
  label: string;
  description: string;
  category?: string;
  defaultData?: Record<string, any>;
}

interface WorkflowAIGeneratorProps {
  workflowType: string;
  blockDefinitions: BlockDefinition[];
  onGenerated: (nodes: Node[], edges: Edge[]) => void;
  /** Optional: function to enrich node data (e.g., add callbacks) */
  enrichNodeData?: (data: any) => any;
}

const EXAMPLE_PROMPTS: Record<string, string[]> = {
  "Bot Builder": [
    "Crie um fluxo que pergunta o nome, e-mail e telefone do cliente",
    "Monte um bot que verifica se o cliente é novo e envia mensagem de boas-vindas",
    "Crie um fluxo com menu de opções: Vendas, Suporte e Financeiro",
  ],
  "Automação de Vendas": [
    "Desconto de 10% para compras acima de R$ 500",
    "15% de desconto no aniversário do cliente e 5% para empresas novas",
    "Desconto progressivo: 5% acima de R$ 200, 10% acima de R$ 500, 15% acima de R$ 1000",
  ],
  "Regras do E-commerce": [
    "Frete grátis para compras acima de R$ 150 na região sudeste",
    "Compre 3 e leve 4 para a categoria de limpeza",
    "10% de desconto no PIX e parcelas em até 12x no cartão",
  ],
  "Automação de Ads": [
    "Pausar campanha se o ROAS ficar abaixo de 2.0 por 3 dias",
    "Aumentar budget em 20% se CPC estiver abaixo de R$ 1,50",
    "Notificar por e-mail quando gastar mais de R$ 500 no dia",
  ],
  "Omnichannel": [
    "Roteamento por skill: técnico vai para fila de suporte, financeiro para cobrança",
    "Distribuição por horário: manhã fila A, tarde fila B",
    "Encaminhar para atendente VIP se score do cliente for maior que 80",
  ],
  "Logística": [
    "Alertar se veículo ficar parado por mais de 30 minutos",
    "Enviar WhatsApp quando o motorista chegar no destino",
    "Notificar se velocidade ultrapassar 80km/h",
  ],
};

export function WorkflowAIGenerator({
  workflowType,
  blockDefinitions,
  onGenerated,
  enrichNodeData,
}: WorkflowAIGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const examples = EXAMPLE_PROMPTS[workflowType] || EXAMPLE_PROMPTS["Bot Builder"];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Descreva a regra que deseja criar", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-workflow", {
        body: {
          prompt: prompt.trim(),
          blockDefinitions: blockDefinitions.map((b) => ({
            type: b.type,
            label: b.label,
            description: b.description,
            category: b.category || "geral",
            defaultData: b.defaultData || {},
          })),
          workflowType,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const { nodes: aiNodes, edges: aiEdges, explanation } = data;

      if (!aiNodes || !Array.isArray(aiNodes) || aiNodes.length === 0) {
        throw new Error("A IA não conseguiu gerar blocos válidos para essa regra");
      }

      // Validate that all node types exist in block definitions
      const validTypes = new Set(blockDefinitions.map((b) => b.type));
      const invalidNodes = aiNodes.filter((n: any) => !validTypes.has(n.data?.type));
      
      if (invalidNodes.length > 0) {
        console.warn("Blocos inválidos removidos:", invalidNodes.map((n: any) => n.data?.type));
      }

      // Detect start/initial block types
      const startTypes = new Set(["inicio", "inicio_regra", "start", "trigger"]);

      const validNodes = aiNodes
        .filter((n: any) => validTypes.has(n.data?.type))
        .map((n: any) => {
          const nodeData = enrichNodeData ? enrichNodeData(n.data) : n.data;
          return {
            ...n,
            data: nodeData,
          };
        });

      // Remove AI-generated start nodes to avoid duplicates (canvas already has one)
      const filteredNodes = validNodes.filter((n: any) => !startTypes.has(n.data?.type));

      // If AI only generated start nodes, keep them (empty canvas scenario handled by caller)
      const finalNodes = filteredNodes.length > 0 ? filteredNodes : validNodes;

      // Filter edges to only reference valid nodes
      const finalNodeIds = new Set(finalNodes.map((n: any) => n.id));
      const validEdges = (aiEdges || []).filter(
        (e: any) => finalNodeIds.has(e.source) && finalNodeIds.has(e.target)
      );

      // Re-link edges that pointed FROM start node to first non-start node
      const removedStartIds = new Set(
        validNodes.filter((n: any) => startTypes.has(n.data?.type) && !finalNodeIds.has(n.id)).map((n: any) => n.id)
      );
      if (removedStartIds.size > 0) {
        // Find edges from removed start nodes and repoint them from "start_node" (the existing canvas start)
        const relinkedEdges = (aiEdges || [])
          .filter((e: any) => removedStartIds.has(e.source) && finalNodeIds.has(e.target))
          .map((e: any) => ({ ...e, source: "start_node" }));
        validEdges.push(...relinkedEdges);
      }

      onGenerated(finalNodes, validEdges);
      setOpen(false);
      setPrompt("");

      toast({
        title: "✨ Workflow gerado com sucesso!",
        description: explanation || `${validNodes.length} blocos e ${validEdges.length} conexões criados`,
      });
    } catch (err: any) {
      console.error("Erro ao gerar workflow:", err);
      toast({
        title: "Erro ao gerar workflow",
        description: err.message || "Tente novamente com uma descrição diferente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 h-8 text-xs sm:text-sm bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-300 dark:border-violet-700 hover:from-violet-500/20 hover:to-purple-500/20"
      >
        <Wand2 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
        <span className="hidden sm:inline">Gerar com IA</span>
        <span className="sm:hidden">IA</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              <Sparkles className="h-5 w-5 text-violet-500" />
              <span>Gerar Workflow com IA</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Ajuda">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-96 p-0">
                  <div className="p-4 border-b">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <HelpCircle className="h-4 w-4 text-violet-500" />
                      Como usar o gerador
                    </p>
                  </div>
                  <ScrollArea className="h-80">
                    <div className="p-4 space-y-3 text-xs text-muted-foreground">
                      <div>
                        <p className="font-medium text-foreground mb-1">1. Descreva a regra com clareza</p>
                        <p>Diga o que deve acontecer, em que ordem e quais condições. Quanto mais específico, melhor o resultado.</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">2. Mencione canais e ações</p>
                        <p>Ex.: "envie WhatsApp", "publique no Instagram e Facebook", "gere 4 variações de imagem com identidade visual".</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">3. Use condições e ramificações</p>
                        <p>Frases como "se cliente novo", "caso o valor seja maior que X", "senão" são reconhecidas como decisões (Sim/Não).</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">4. Revise no canvas</p>
                        <p>O resultado é adicionado ao fluxo atual. Você pode reposicionar, reconfigurar e conectar blocos manualmente depois.</p>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="font-medium text-foreground mb-1">Blocos disponíveis ({blockDefinitions.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {blockDefinitions.map((b) => (
                            <span key={b.type} className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-foreground">
                              {b.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-[11px] italic">Dica: a IA usa apenas os blocos listados acima. Se precisar de algo novo, crie o bloco antes de gerar.</p>
                      </div>
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </DialogTitle>
            <DialogDescription>
              Descreva a regra de negócio em linguagem natural e a IA montará os blocos automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Ex: Quero dar 10% de desconto para compras acima de R$ 500..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
              disabled={isLoading}
            />

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">💡 Exemplos:</p>
              <div className="flex flex-wrap gap-1.5">
                {examples.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(ex)}
                    className="text-xs px-2.5 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors text-left"
                    disabled={isLoading}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                ⚠️ A IA usará apenas os <strong>{blockDefinitions.length} blocos</strong> disponíveis neste editor. 
                O resultado será adicionado ao canvas atual — você poderá ajustar posições e configurações depois.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Workflow
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
