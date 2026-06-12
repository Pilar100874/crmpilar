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
    color: "purple",
    gradient: "from-purple-500/10 to-violet-500/10",
    border: "border-purple-500/20",
    borderHover: "hover:border-purple-500/40",
    iconColor: "text-purple-600",
    iconHover: "group-hover:text-purple-700",
    textHover: "group-hover:text-purple-700",
    blocks: ["ai_agent", "generate_ai_media", "content_type", "text_content", "ask_influencer", "ask_product_image"] as NodeType[],
  },
  {
    name: "Mensagens",
    icon: "MessageSquare",
    color: "green",
    gradient: "from-green-500/10 to-emerald-500/10",
    border: "border-green-500/20",
    borderHover: "hover:border-green-500/40",
    iconColor: "text-green-600",
    iconHover: "group-hover:text-green-700",
    textHover: "group-hover:text-green-700",
    blocks: ["send_message", "media", "message_template", "goodbye"] as NodeType[],
  },
  {
    name: "Botões & Listas",
    icon: "MousePointerClick",
    color: "emerald",
    gradient: "from-emerald-500/10 to-teal-500/10",
    border: "border-emerald-500/20",
    borderHover: "hover:border-emerald-500/40",
    iconColor: "text-emerald-600",
    iconHover: "group-hover:text-emerald-700",
    textHover: "group-hover:text-emerald-700",
    blocks: ["reply_buttons", "list_buttons", "keyword_options", "button_url", "button_copy", "button_call"] as NodeType[],
  },
  {
    name: "WhatsApp Avançado (Evolution)",
    icon: "Zap",
    color: "blue",
    gradient: "from-blue-500/10 to-sky-500/10",
    border: "border-blue-500/20",
    borderHover: "hover:border-blue-500/40",
    iconColor: "text-blue-600",
    iconHover: "group-hover:text-blue-700",
    textHover: "group-hover:text-blue-700",
    blocks: ["button_pix", "buttons_mixed", "buttons_media", "carousel"] as NodeType[],
  },
  {
    name: "Perguntas",
    icon: "HelpCircle",
    color: "cyan",
    gradient: "from-cyan-500/10 to-sky-500/10",
    border: "border-cyan-500/20",
    borderHover: "hover:border-cyan-500/40",
    iconColor: "text-cyan-600",
    iconHover: "group-hover:text-cyan-700",
    textHover: "group-hover:text-cyan-700",
    blocks: ["ask_name", "ask_question", "ask_email", "ask_number", "ask_phone", "ask_date", "ask_file", "ask_address", "ask_url", "ask_cnpj", "ask_cep"] as NodeType[],
  },
  {
    name: "Lógica & Fluxo",
    icon: "GitBranch",
    color: "orange",
    gradient: "from-orange-500/10 to-amber-500/10",
    border: "border-orange-500/20",
    borderHover: "hover:border-orange-500/40",
    iconColor: "text-orange-600",
    iconHover: "group-hover:text-orange-700",
    textHover: "group-hover:text-orange-700",
    blocks: ["condition", "jump_to", "keyword_jump", "global_keywords", "set_field", "formulas", "lead_scoring", "goal"] as NodeType[],
  },
  {
    name: "Audiência & Opt-in",
    icon: "Users",
    color: "teal",
    gradient: "from-teal-500/10 to-emerald-500/10",
    border: "border-teal-500/20",
    borderHover: "hover:border-teal-500/40",
    iconColor: "text-teal-600",
    iconHover: "group-hover:text-teal-700",
    textHover: "group-hover:text-teal-700",
    blocks: ["opt_in_out", "opt_in_check", "audience"] as NodeType[],
  },
  {
    name: "Atendimento",
    icon: "Headphones",
    color: "cyan",
    gradient: "from-cyan-500/10 to-blue-500/10",
    border: "border-cyan-500/20",
    borderHover: "hover:border-cyan-500/40",
    iconColor: "text-cyan-600",
    iconHover: "group-hover:text-cyan-700",
    textHover: "group-hover:text-cyan-700",
    blocks: ["transferir_omnichannel", "enviar_fila", "atribuir_atendente", "definir_prioridade", "enviar_aviso_sistema", "enviar_mensagem_interna"] as NodeType[],
  },
  {
    name: "CRM & Catálogo",
    icon: "Database",
    color: "indigo",
    gradient: "from-indigo-500/10 to-blue-600/10",
    border: "border-indigo-500/20",
    borderHover: "hover:border-indigo-500/40",
    iconColor: "text-indigo-600",
    iconHover: "group-hover:text-indigo-700",
    textHover: "group-hover:text-indigo-700",
    blocks: ["crm_cadastro_empresa", "crm_agenda_rapida", "crm_gerar_relatorio", "product_search_select"] as NodeType[],
  },
  {
    name: "Integrações & Código",
    icon: "Code",
    color: "rose",
    gradient: "from-rose-500/10 to-pink-500/10",
    border: "border-rose-500/20",
    borderHover: "hover:border-rose-500/40",
    iconColor: "text-rose-600",
    iconHover: "group-hover:text-rose-700",
    textHover: "group-hover:text-rose-700",
    blocks: ["webhook", "dynamic_data", "api_loop", "trigger_automation", "trigger_workflow", "send_whatsapp_to_number", "return_response", "publish_social_post"] as NodeType[],
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
    <div className="w-64 bg-card border-r border-border flex flex-col h-full shadow-lg relative">
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
                className="group"
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
                            <h4 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                              {blockDef.label}
                            </h4>
                          </div>
                          {(() => {
                            const kind = getInteractionKind(blockDef.type);
                            if (!kind) return null;
                            return (
                              <span
                                title={`${kind.label} — ${kind.title}`}
                                className={`shrink-0 inline-flex items-center justify-center w-5 h-5 text-[11px] leading-none rounded-full border ${kind.className}`}
                              >
                                {kind.symbol}
                              </span>
                            );
                          })()}
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
