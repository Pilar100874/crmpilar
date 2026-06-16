import { BLOCK_DEFINITIONS, NodeType } from "@/types/flow";
import { Card } from "@/components/ui/card";
import * as Icons from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getInteractionKind } from "./blockInteractionKind";

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
    blocks: ["ai_agent", "generate_ai_media", "content_type", "text_content", "ask_influencer", "ask_product_image"] as NodeType[],
  },
  {
    name: "Mensagens",
    icon: "MessageSquare",
    blocks: ["send_message", "media", "message_template", "goodbye"] as NodeType[],
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
    blocks: ["condition", "jump_to", "keyword_jump", "global_keywords", "set_field", "formulas", "lead_scoring", "goal"] as NodeType[],
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
    blocks: ["webhook", "dynamic_data", "api_loop", "trigger_workflow", "send_whatsapp_to_number", "return_response", "publish_social_post"] as NodeType[],
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
    <div className="w-64 bg-card/80 backdrop-blur-md border-r border-border flex flex-col h-full shadow-lg relative">
      {/* Header compacto */}
      <div className="p-3 border-b border-border bg-gradient-to-r from-primary/20 to-primary/10 relative overflow-hidden">
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-foreground">Blocos</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleExpanded(false)}
              className="h-7 w-7 rounded-md transition-all"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Search bar compacta */}
          <div className="relative">
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredCategories.map((category) => {
            const CategoryIcon = Icons[category.icon as keyof typeof Icons] as any;
            const isOpen = openCategories.includes(category.name);

            return (
              <Collapsible
                key={category.name}
                open={isOpen}
                onOpenChange={() => toggleCategory(category.name)}
              >
                <CollapsibleTrigger className={`flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-muted transition-all duration-150 group border border-transparent ${category.borderHover}`}>
                  <div className="flex items-center gap-2">
                    {CategoryIcon && (
                      <div className={`p-1 rounded-md bg-gradient-to-br ${category.gradient} border ${category.border} group-hover:${category.border.replace('/20', '/40')} transition-all`}>
                        <CategoryIcon className={`w-3 h-3 ${category.iconColor} ${category.iconHover}`} />
                      </div>
                    )}
                    <span className={`font-semibold text-xs text-foreground ${category.textHover} transition-colors`}>{category.name}</span>
                  </div>
                  <ChevronDown 
                    className={`w-3 h-3 text-muted-foreground transition-all duration-150 ${isOpen ? `rotate-180 ${category.iconColor}` : category.iconHover}`}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent className="pt-1 space-y-1 animate-accordion-down">
                  {category.blocks.map((blockType) => {
                    const blockDef = BLOCK_DEFINITIONS.find(b => b.type === blockType);
                    if (!blockDef) return null;

                    const IconComponent = Icons[blockDef.icon as keyof typeof Icons] as any;
                    
                    return (
                      <Card
                        key={blockDef.type}
                        draggable
                        onDragStart={(event) => onDragStart(event, blockDef.type)}
                        onDoubleClick={() => window.dispatchEvent(new CustomEvent("workflow:add-block", { detail: { type: blockDef.type } }))}
                        title="Arraste ou clique 2x para adicionar"
                        className="p-2 ml-5 cursor-grab active:cursor-grabbing bg-muted/50 hover:bg-muted hover:border-primary/40 transition-all duration-150 hover:shadow-md group rounded-2xl select-none"
                      >
                        <div className="flex items-center gap-2">
                          {IconComponent && (
                            <div className="p-1 rounded-md bg-gradient-to-br from-primary/15 to-primary/10 border border-primary/25 group-hover:border-primary/50 transition-all flex-shrink-0">
                              <IconComponent className="w-3 h-3 text-primary group-hover:text-primary" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-normal text-xs text-foreground group-hover:text-primary transition-colors truncate">
                              {blockDef.label}
                            </h4>
                          </div>
                        </div>
                      </Card>
                    );
                  })}

                  {category.name === "IA" && !searchQuery && (
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent("workflow:add-template", { detail: { template: "peca_ia_criativa" } }))}
                      className="w-full ml-5 mt-2 p-2 rounded-2xl border border-dashed border-purple-500/40 bg-gradient-to-br from-purple-500/10 to-violet-500/5 hover:from-purple-500/20 hover:to-violet-500/10 transition-all text-left group"
                      title="Insere o roteiro completo: Tipo → Influencer → Produto → Texto → Gerar Mídia IA → Publicar"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-purple-500/20 border border-purple-500/30">
                          <Icons.Wand2 className="w-3 h-3 text-purple-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-[11px] text-foreground group-hover:text-purple-700 truncate">
                            ✨ Roteiro: Criar Peça com IA
                          </h4>
                          <p className="text-[9px] text-muted-foreground truncate">
                            6 blocos conectados, prontos para usar
                          </p>
                        </div>
                      </div>
                    </button>
                  )}
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
