import { setBlockDragPreview } from "@/lib/blockDragPreview";
import { BLOCK_DEFINITIONS, NodeType } from "@/types/flow";
import { Card } from "@/components/ui/card";
import * as Icons from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BlockLibraryProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  isExpanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
}

// Organizar blocos por categoria (consolidado: 10 grupos)
const blockCategories = [
  {
    name: "IA & Criação",
    icon: "Sparkles",
    blocks: ["ai_agent", "generate_ai_media", "mensagem_pre_definida", "content_type", "text_content", "ask_influencer", "ask_product_image"] as NodeType[],
  },
  {
    name: "Mensagens",
    icon: "MessageSquare",
    blocks: ["send_message", "media", "message_template", "goodbye", "broadcast_vendedores", "send_contact_card"] as NodeType[],
  },
  {
    name: "Botões & Listas",
    icon: "MousePointerClick",
    blocks: ["reply_buttons", "list_buttons", "keyword_options", "button_url", "button_copy", "button_call"] as NodeType[],
  },
  {
    name: "Evolution",
    icon: "Zap",
    blocks: ["button_pix", "buttons_mixed", "buttons_media", "carousel"] as NodeType[],
  },
  {
    name: "Perguntas",
    icon: "HelpCircle",
    blocks: ["ask_name", "ask_question", "ask_email", "ask_number", "ask_phone", "ask_date", "ask_file", "ask_address", "ask_url", "ask_cnpj", "ask_cep"] as NodeType[],
  },
  {
    name: "Lógica & Fluxo",
    icon: "GitBranch",
    blocks: ["condition", "jump_to", "keyword_jump", "global_keywords", "global_redirect", "set_field", "formulas", "lead_scoring", "goal"] as NodeType[],
  },
  {
    name: "Audiência & Opt-in",
    icon: "Users",
    blocks: ["opt_in_out", "opt_in_check", "audience"] as NodeType[],
  },
  {
    name: "Atendimento",
    icon: "Headphones",
    blocks: ["transferir_omnichannel", "enviar_fila", "atribuir_atendente", "definir_prioridade", "enviar_aviso_sistema", "enviar_mensagem_interna"] as NodeType[],
  },
  {
    name: "CRM & Catálogo",
    icon: "Database",
    blocks: ["crm_cadastro_empresa", "crm_agenda_rapida", "crm_gerar_relatorio", "product_search_select", "attach_catalog"] as NodeType[],
  },
  {
    name: "Integrações & Código",
    icon: "Code",
    blocks: ["webhook", "dynamic_data", "api_loop", "trigger_workflow", "run_external_agent", "send_whatsapp_to_number", "send_sms", "return_response", "publish_social_post"] as NodeType[],
  },

];


export const BlockLibrary = ({ onDragStart, isExpanded, onToggleExpanded }: BlockLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>(["Mensagens", "Botões & Listas", "Perguntas"]);

  const toggleCategory = (categoryName: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const filteredCategories = blockCategories.map(category => ({
    ...category,
    blocks: category.blocks.filter(blockType => {
      const blockDef = BLOCK_DEFINITIONS.find(b => b.type === blockType);
      if (!blockDef) return false;
      const query = searchQuery.toLowerCase();
      return blockDef.label.toLowerCase().includes(query) ||
             blockDef.description.toLowerCase().includes(query);
    })
  })).filter(category => category.blocks.length > 0);

  if (!isExpanded) {
    return null;
  }

  return (
    <div className="w-60 flex flex-col h-[calc(100%-1rem)] m-2 rounded-2xl shadow-lg border-2 border-white dark:border-white/10 bg-gradient-to-b from-background to-border relative overflow-hidden animate-slide-in">
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-foreground text-background flex items-center justify-center">
              <Icons.Sparkles className="h-3.5 w-3.5" />
            </div>
            <h3 className="font-bold text-base text-foreground tracking-tight">Menu</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleExpanded(false)}
            className="h-7 w-7 rounded-md hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs bg-muted/40 border-0 shadow-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-[240px] max-w-full px-2 pb-4 space-y-0.5">
          {filteredCategories.map((category) => {
            const CategoryIcon = Icons[category.icon as keyof typeof Icons] as any;
            const isOpen = openCategories.includes(category.name);

            return (
              <Collapsible
                key={category.name}
                open={isOpen}
                onOpenChange={() => toggleCategory(category.name)}
              >
                <CollapsibleTrigger
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-xl transition-colors duration-100 text-left ${
                    isOpen
                      ? "bg-foreground text-background"
                      : "hover:bg-black/5 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {CategoryIcon && (
                      <CategoryIcon className={`w-4 h-4 ${isOpen ? "text-background" : "text-muted-foreground"}`} />
                    )}
                    <span className="text-xs font-medium">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold flex items-center justify-center ${isOpen ? "bg-background/20 text-background" : "bg-foreground text-background"}`}>
                      {category.blocks.length}
                    </span>
                    <span className={`text-xs ${isOpen ? "text-background/70" : "text-muted-foreground"}`}>
                      {isOpen ? "−" : "+"}
                    </span>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="animate-accordion-down">
                  <div className="relative ml-5 pl-4 pt-1 pb-1">
                    {/* Vertical line */}
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-foreground/40" />
                    <div className="space-y-0.5">
                      {category.blocks.map((blockType) => {
                        const blockDef = BLOCK_DEFINITIONS.find(b => b.type === blockType);
                        if (!blockDef) return null;
                        const BlockIcon = Icons[blockDef.icon as keyof typeof Icons] as any;

                        return (
                          <Card
                            key={blockDef.type}
                            draggable
                            onDragStart={(event) => { setBlockDragPreview(event, blockDef.label, (blockDef as any).color); onDragStart(event, blockDef.type); }}
                            onDoubleClick={() => window.dispatchEvent(new CustomEvent("workflow:add-block", { detail: { type: blockDef.type } }))}
                            title="Arraste ou clique 2x para adicionar"
                            className="px-3 py-2 cursor-grab active:cursor-grabbing bg-transparent hover:bg-muted/60 border-0 shadow-none rounded-xl transition-colors duration-100 select-none"
                          >
                            <div className="flex items-center gap-2">
                              {BlockIcon && <BlockIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                              <h4 className="text-xs font-normal text-foreground truncate">
                                {blockDef.label}
                              </h4>
                            </div>
                          </Card>
                        );
                      })}

                      {category.name === "IA & Criação" && !searchQuery && (
                        <button
                          type="button"
                          onClick={() => window.dispatchEvent(new CustomEvent("workflow:add-template", { detail: { template: "peca_ia_criativa" } }))}
                          className="w-full mt-1 px-3 py-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors duration-100 text-left"
                          title="Insere o roteiro completo: Tipo → Influencer → Produto → Texto → Gerar Mídia IA → Publicar"
                        >
                          <h4 className="text-[11px] font-medium text-foreground truncate">
                            ✨ Roteiro: Criar Peça com IA
                          </h4>
                        </button>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {filteredCategories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <div className="p-3 rounded-full bg-muted w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium">Nenhum bloco encontrado</p>
              <p className="text-[10px] mt-1">Tente outra busca</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};