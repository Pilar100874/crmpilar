import { memo, useState, useEffect } from "react";
import { Handle, Position, NodeProps, useUpdateNodeInternals } from "@xyflow/react";
import { FlowNodeData } from "@/types/flow";
import { BLOCK_DEFINITIONS } from "@/types/flow";
import * as Icons from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Pause,
  SkipForward,
  X,
  MoreVertical,
  ArrowRight,
  Copy,
  Trash2,
  StickyNote,
  HelpCircle,
  Palette,
} from "lucide-react";
import { BlockHelpDialog } from "@/components/workflow-help/BlockHelpDialog";
import { getBlockHelp } from "@/components/workflow-help/blockHelpRegistry";
import { getInteractionKind } from "./blockInteractionKind";
import { BlockIconCustomizer } from "./BlockIconCustomizer";
import { LiveBlockPreview, PREVIEW_SUPPORTED_TYPES } from "./block-configs/LiveBlockPreview";

export const FlowNode = memo((props: any) => {
  const { data, selected, id } = props;
  const blockDef = BLOCK_DEFINITIONS.find((b) => b.type === data.type);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [iconCustomizerOpen, setIconCustomizerOpen] = useState(false);
  
  const isStartBlock = data.type === 'inicio' || data.type === 'start';
  
  if (!blockDef) return null;

  const customIcon: string | undefined = data.config?.customIcon;
  const customIconColor: string | undefined = data.config?.customIconColor;
  const effectiveIconName = customIcon || blockDef.icon;
  const IconComponent = Icons[effectiveIconName as keyof typeof Icons] as any;

  // Determinar saídas dinâmicas baseadas no tipo de bloco e configuração
  const getDynamicHandles = () => {
    const config = data.config || {};

    // Bloco de condições - uma saída para cada condição + fallback
    if (data.type === "condition") {
      const conditions = config.conditions || [];
      return {
        conditions: conditions.map((cond: any, index: number) => ({
          id: cond.id,
          label: cond.label || `Condição ${index + 1}`,
          color: "bg-green-500"
        })),
        fallback: { id: "fallback", label: "Padrão", color: "bg-pink-500" }
      };
    }

    // Bloco de keyword jump - uma saída para cada palavra-chave
    if (data.type === "keyword_jump") {
      const keywords = config.keywords || [];
      return {
        keywords: keywords.map((kw: any, index: number) => ({
          id: `keyword_${index}`,
          label: kw.keyword || `Palavra ${index + 1}`,
          color: "bg-primary"
        }))
      };
    }

    // Botões de resposta - uma saída para cada botão
    if ((data.type === "reply_buttons" || data.type === "buttons_mixed" || data.type === "buttons_media") && config.buttons) {
      const buttons = Array.isArray(config.buttons)
        ? config.buttons
        : [];
      return {
        buttons: buttons.map((btn: any, index: number) => ({
          id: `button_${index}`,
          label: btn.text || btn.displayText || btn.label || `Botão ${index + 1}`,
          color: "bg-purple-500"
        }))
      };
    }

    // Carrossel - uma saída por card
    if (data.type === "carousel" && config.mode !== "dynamic" && Array.isArray(config.cards)) {
      return {
        buttons: config.cards.map((card: any, index: number) => ({
          id: `card_${index}`,
          label: card.buttonText || card.body || `Card ${index + 1}`,
          color: "bg-sky-500"
        }))
      };
    }

    // List buttons - seções e itens
    if (data.type === "list_buttons" && config.sections) {
      const sections = Array.isArray(config.sections) ? config.sections : [];
      const listSections: any[] = [];
      
      console.log("🔍 List buttons config:", { sections });
      
      sections.forEach((section: any, sectionIdx: number) => {
        const sectionItems = (section.items || []).map((item: any, itemIdx: number) => ({
          id: `section_${sectionIdx}_item_${itemIdx}`,
          label: item.label || `Item ${itemIdx + 1}`,
          description: item.description || ""
        }));
        listSections.push({
          title: section.title || `Seção ${sectionIdx + 1}`,
          items: sectionItems
        });
      });
      
      console.log("✅ List sections created:", listSections);
      
      if (listSections.length > 0) {
        return { listSections };
      }
    }

    // Keyword options - uma saída para cada botão
    if (data.type === "keyword_options" && (config.buttons || config.cards)) {
      const items = Array.isArray(config.buttons)
        ? config.buttons
        : (Array.isArray(config.cards) ? config.cards : []);
      return {
        buttons: items.map((btn: any, index: number) => ({
          id: `button_${index}`,
          label: btn.label || btn.keyword || `Opção ${index + 1}`,
          color: "bg-primary"
        }))
      };
    }

    // Perguntas de múltipla escolha - uma saída para cada opção
    if (data.type === "ask_question" && config.questionType === "multiple" && config.options) {
      const options = config.options.split('\n').filter((opt: string) => opt.trim());
      return {
        buttons: options.map((opt: string, index: number) => ({
          id: `option_${index}`,
          label: opt.trim(),
          color: "bg-yellow-500"
        }))
      };
    }

    // Opt-in check - saídas para subscribed/unsubscribed
    if (data.type === "opt_in_check") {
      return {
        paths: [
          { id: "subscribed", label: "Inscrito", color: "bg-green-500" },
          { id: "unsubscribed", label: "Não inscrito", color: "bg-red-500" }
        ]
      };
    }

    // Content type (modo "ask") com saídas individuais por tipo
    if (data.type === "content_type" && config.mode === "ask" && config.splitOutputs) {
      const opts: Array<{ value: string; label: string }> = [
        { value: "divulgacao", label: "Divulgação" },
        { value: "promocao", label: "Promoção" },
        { value: "institucional", label: "Institucional" },
        { value: "evento", label: "Evento" },
        { value: "lancamento", label: "Lançamento" },
        { value: "educacional", label: "Educacional" },
      ];
      return {
        buttons: opts.map((o) => ({
          id: `content_${o.value}`,
          label: o.label,
          color: "bg-pink-500",
        })),
      };
    }

    // Mensagem Pré Definida - saída padrão + saída quando não há frase
    if (data.type === "mensagem_pre_definida") {
      return {
        paths: [
          { id: "default", label: "Com frase", color: "bg-green-500" },
          { id: "sem_frase", label: "Sem frase", color: "bg-red-500" },
        ],
      };
    }

    return null;
  };


  const dynamicHandles = getDynamicHandles();

  const updateNodeInternals = useUpdateNodeInternals();
  const handlesSignature = dynamicHandles
    ? [
        dynamicHandles.conditions?.map((c: any) => c.id).join(",") || "",
        dynamicHandles.keywords?.map((k: any) => k.id).join(",") || "",
        dynamicHandles.buttons?.map((b: any) => b.id).join(",") || "",
        dynamicHandles.paths?.map((p: any) => p.id).join(",") || "",
        dynamicHandles.listSections
          ?.map((s: any) => s.items?.map((i: any) => i.id).join("|"))
          .join(";") || "",
        dynamicHandles.fallback?.id || "",
      ].join("##")
    : "none";
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals, handlesSignature]);

  // Determinar cor do card baseado no estado de debug
  const getCardClassName = () => {
    const baseClass = "min-w-[260px] max-w-[300px] transition-all duration-200 shadow-lg";
    
    if (data.isBreakpoint) {
      return `${baseClass} bg-white border-2 border-orange-500 ${
        selected ? "ring-2 ring-blue-400" : ""
      }`;
    }
    
    if (data.isSkipped) {
      return `${baseClass} bg-white/60 border-2 border-border opacity-60 ${
        selected ? "ring-2 ring-blue-400" : ""
      }`;
    }
    
    return `${baseClass} bg-white border border-border ${
      selected 
        ? "ring-2 ring-primary border-primary" 
        : "hover:border-border"
    }`;
  };

  return (
    <>
    <ContextMenu>
      <ContextMenuTrigger>
        <Card className={getCardClassName()}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!bg-primary !w-3 !h-3 !border-2 !border-white" 
      />
      
      <div className="p-3">
        {/* Cabeçalho com ícone, título e menu */}
        <div className="flex items-start gap-2 mb-3">

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {IconComponent && (
                <div
                  className={
                    customIconColor
                      ? "p-1 rounded border"
                      : "p-1 rounded bg-primary/5 border border-primary/20"
                  }
                  style={
                    customIconColor
                      ? {
                          backgroundColor: `${customIconColor}15`,
                          borderColor: `${customIconColor}40`,
                        }
                      : undefined
                  }
                >
                  <IconComponent
                    className={customIconColor ? "w-3.5 h-3.5" : "w-3.5 h-3.5 text-primary"}
                    style={customIconColor ? { color: customIconColor } : undefined}
                  />
                </div>
              )}
              <span className="font-semibold text-sm text-foreground truncate">{data.config?.customTitle || blockDef.label}</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{data.config?.customSubtitle || data.label || blockDef.description}</p>
          </div>
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:bg-muted rounded transition-colors">
                <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-white border-border shadow-lg">
              <DropdownMenuItem
                onClick={() => { setHelpOpen(true); setDropdownOpen(false); }}
                className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 mr-2 text-primary" />
                Ajuda e exemplos
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  data.onSetBreakpoint?.(id);
                  setDropdownOpen(false);
                }}
                className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
              >
                <Pause className="w-4 h-4 mr-2 text-orange-500" />
                {data.isBreakpoint ? "Remover Pausa" : "Pausar Simulação Aqui"}
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={() => {
                  data.onSetSkip?.(id);
                  setDropdownOpen(false);
                }}
                className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
              >
                <SkipForward className="w-4 h-4 mr-2 text-muted-foreground" />
                {data.isSkipped ? "Não Pular Bloco" : "Pular Este Bloco"}
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={() => {
                  data.onDuplicate?.(id);
                  setDropdownOpen(false);
                }}
                className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
              >
                <Copy className="w-4 h-4 mr-2 text-primary" />
                Duplicar Bloco
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={() => {
                  data.onAddNote?.(id);
                  setDropdownOpen(false);
                }}
                className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
              >
                <StickyNote className="w-4 h-4 mr-2 text-yellow-500" />
                {data.note ? "Editar Nota" : "Adicionar Nota"}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  setIconCustomizerOpen(true);
                  setDropdownOpen(false);
                }}
                className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
              >
                <Palette className="w-4 h-4 mr-2 text-violet-500" />
                Personalizar Bloco
              </DropdownMenuItem>

              
              <DropdownMenuSeparator className="bg-muted" />
              
              <DropdownMenuItem
                onClick={() => {
                  data.onClearDebug?.(id);
                  setDropdownOpen(false);
                }}
                disabled={!data.isBreakpoint && !data.isSkipped}
                className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4 mr-2 text-red-500" />
                Liberar Bloco
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="bg-muted" />
              
              {!isStartBlock && (
                <DropdownMenuItem
                  onClick={() => {
                    setDropdownOpen(false);
                    window.setTimeout(() => data.onDelete?.(id), 0);
                  }}
                  className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Bloco
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Pré-visualização ao vivo do bloco */}
        {PREVIEW_SUPPORTED_TYPES.has(data.type) && (
          <div className="mb-2 nodrag">
            <LiveBlockPreview type={data.type} config={data.config || {}} />
          </div>
        )}

        {/* Mostrar opções com handles à direita */}
        {dynamicHandles && (
          <div className="space-y-1.5">
            {/* Condições */}
            {dynamicHandles.conditions?.map((cond: any, index: number) => (
              <div key={cond.id} className="relative flex items-center justify-between gap-2 py-2.5 px-3 bg-pink-500 rounded-md group hover:bg-pink-600 transition-colors">
                <span className="text-xs font-medium truncate text-white">{cond.label}</span>
                <div className="relative">
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={cond.id}
                    className="!bg-primary !w-5 !h-5 !relative !transform-none !top-auto !right-0 !border-2 !border-white !rounded-full group-hover:!scale-110 !transition-transform !flex !items-center !justify-center"
                    style={{ position: 'relative' }}
                  />
                  <ArrowRight className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            ))}
            
            {/* Fallback */}
            {dynamicHandles.fallback && (
              <div className="relative flex items-center justify-between gap-2 py-2.5 px-3 bg-primary/10 border border-primary/20 rounded-md group hover:bg-primary/20 transition-colors">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Icons.HelpCircle className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium truncate text-primary">{dynamicHandles.fallback.label}</span>
                </div>
                <div className="relative">
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={dynamicHandles.fallback.id}
                    className="!bg-primary !w-5 !h-5 !relative !transform-none !top-auto !right-0 !border-2 !border-white !rounded-full group-hover:!scale-110 !transition-transform"
                    style={{ position: 'relative' }}
                  />
                  <ArrowRight className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}
            
            {/* Keywords */}
            {dynamicHandles.keywords?.map((kw: any) => (
              <div key={kw.id} className="relative flex items-center justify-between gap-2 py-2.5 px-3 bg-pink-500 rounded-md group hover:bg-pink-600 transition-colors">
                <span className="text-xs font-medium truncate text-white">{kw.label}</span>
                <div className="relative">
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={kw.id}
                    className="!bg-primary !w-5 !h-5 !relative !transform-none !top-auto !right-0 !border-2 !border-white !rounded-full group-hover:!scale-110 !transition-transform"
                    style={{ position: 'relative' }}
                  />
                  <ArrowRight className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            ))}
            
            {/* List Sections with Items */}
            {dynamicHandles.listSections?.map((section: any, sectionIdx: number) => (
              <div key={`section-${sectionIdx}`} className="space-y-1">
                {/* Section Header (sem handle) */}
                <div className="py-1.5 px-2 bg-muted border border-border rounded-md">
                  <span className="text-xs font-semibold text-foreground/80">{section.title}</span>
                </div>
                
                {/* Section Items (com handles) */}
                {section.items.length === 0 && (
                  <div className="py-2 px-3 text-[11px] text-muted-foreground ml-2">Sem itens</div>
                )}
                {section.items.map((item: any) => (
                  <div key={item.id} className="relative flex items-center justify-between gap-2 py-2.5 px-3 bg-pink-500 rounded-md group hover:bg-pink-600 transition-colors ml-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-white block truncate">
                        {item.label || "Item sem nome"}
                      </span>
                      {item.description && (
                        <span className="text-[10px] text-white/80 block truncate">{item.description}</span>
                      )}
                    </div>
                    <div className="relative shrink-0">
                      <Handle
                        type="source"
                        position={Position.Right}
                        id={item.id}
                        className="!bg-primary !w-5 !h-5 !relative !transform-none !top-auto !right-0 !border-2 !border-white !rounded-full group-hover:!scale-110 !transition-transform !cursor-pointer"
                        style={{ position: 'relative' }}
                      />
                      <ArrowRight className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
            
            {/* Buttons/Options/Cards */}
            {dynamicHandles.buttons?.map((btn: any) => (
              <div key={btn.id} className="relative flex items-center justify-between gap-2 py-2.5 px-3 bg-pink-500 rounded-md group hover:bg-pink-600 transition-colors">
                <span className="text-xs font-medium truncate text-white">{btn.label}</span>
                <div className="relative">
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={btn.id}
                    className="!bg-primary !w-5 !h-5 !relative !transform-none !top-auto !right-0 !border-2 !border-white !rounded-full group-hover:!scale-110 !transition-transform"
                    style={{ position: 'relative' }}
                  />
                  <ArrowRight className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            ))}
            
            {/* Paths (opt-in check, etc) */}
            {dynamicHandles.paths?.map((path: any) => (
              <div key={path.id} className={`relative flex items-center justify-between gap-2 py-2.5 px-3 rounded-md group transition-colors ${
                path.color === 'bg-green-500' 
                  ? 'bg-pink-500 hover:bg-pink-600' 
                  : 'bg-primary/10 border border-primary/20 hover:bg-primary/20'
              }`}>
                {path.color === 'bg-red-500' && (
                  <div className="flex items-center gap-2">
                    <Icons.HelpCircle className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium truncate text-primary">{path.label}</span>
                  </div>
                )}
                {path.color === 'bg-green-500' && (
                  <span className="text-xs font-medium truncate text-white">{path.label}</span>
                )}
                <div className="relative">
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={path.id}
                    className="!bg-primary !w-5 !h-5 !relative !transform-none !top-auto !right-0 !border-2 !border-white !rounded-full group-hover:!scale-110 !transition-transform"
                    style={{ position: 'relative' }}
                  />
                  <ArrowRight className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Nota (se houver) */}
        {data.note && (
          <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground whitespace-pre-wrap">
            📝 {data.note}
          </div>
        )}
      </div>
      
      {/* Handle padrão para blocos sem saídas dinâmicas */}
      {!dynamicHandles && (
        <div className="relative">
          <Handle 
            type="source" 
            position={Position.Bottom} 
            className="!bg-primary !w-5 !h-5 !border-2 !border-white !rounded-full" 
          />
          <ArrowRight className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      )}
      
      {/* Badge de estado de debug */}
      {data.isBreakpoint && (
        <div className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full p-1 shadow-lg">
          <Pause className="w-3 h-3" />
        </div>
      )}
      {data.isSkipped && (
        <div className="absolute -top-2 -right-2 bg-muted0 text-white rounded-full p-1 shadow-lg">
          <SkipForward className="w-3 h-3" />
        </div>
      )}
    </Card>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-56 bg-white border-border shadow-lg">
        <ContextMenuItem
          onClick={() => data.onSetBreakpoint?.(id)}
          className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
        >
          <Pause className="w-4 h-4 mr-2 text-orange-500" />
          {data.isBreakpoint ? "Remover Pausa" : "Pausar Simulação Aqui"}
        </ContextMenuItem>
        
        <ContextMenuItem
          onClick={() => data.onSetSkip?.(id)}
          className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
        >
          <SkipForward className="w-4 h-4 mr-2 text-muted-foreground" />
          {data.isSkipped ? "Não Pular Bloco" : "Pular Este Bloco"}
        </ContextMenuItem>
        
        <ContextMenuItem
          onClick={() => data.onDuplicate?.(id)}
          className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer"
        >
          <Copy className="w-4 h-4 mr-2 text-primary" />
          Duplicar Bloco
        </ContextMenuItem>
        
        <ContextMenuSeparator className="bg-muted" />
        
        <ContextMenuItem
          onClick={() => data.onClearDebug?.(id)}
          disabled={!data.isBreakpoint && !data.isSkipped}
          className="text-foreground/80 focus:bg-muted focus:text-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-4 h-4 mr-2 text-red-500" />
          Liberar Bloco
        </ContextMenuItem>
        
        <ContextMenuSeparator className="bg-muted" />
        
        {!isStartBlock && (
          <ContextMenuItem
            onClick={() => window.setTimeout(() => data.onDelete?.(id), 0)}
            className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir Bloco
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>

    <BlockHelpDialog
      open={helpOpen}
      onOpenChange={setHelpOpen}
      content={{
        label: String(data.label || blockDef.label || data.type),
        description: String(blockDef.description || data.type),
        icon: blockDef.icon,
        color: (blockDef as any).color,
        ...getBlockHelp("bot", data.type, String(data.label || blockDef.label || data.type), String(blockDef.description || data.type)),
      }}
    />

    <BlockIconCustomizer
      open={iconCustomizerOpen}
      onOpenChange={setIconCustomizerOpen}
      currentIcon={customIcon}
      currentColor={customIconColor}
      currentTitle={data.config?.customTitle}
      currentSubtitle={data.config?.customSubtitle}
      defaultIcon={blockDef.icon}
      defaultTitle={blockDef.label}
      defaultSubtitle={blockDef.description}
      onSave={({ icon: newIcon, color: newColor, title: newTitle, subtitle: newSubtitle }) => {
        const nextConfig = { ...(data.config || {}) };
        if (newIcon) nextConfig.customIcon = newIcon;
        else delete nextConfig.customIcon;
        if (newColor) nextConfig.customIconColor = newColor;
        else delete nextConfig.customIconColor;
        if (newTitle) nextConfig.customTitle = newTitle;
        else delete nextConfig.customTitle;
        if (newSubtitle) nextConfig.customSubtitle = newSubtitle;
        else delete nextConfig.customSubtitle;
        data.onUpdateNodeData?.(id, { config: nextConfig });
      }}
    />

  </>
  );
});

FlowNode.displayName = "FlowNode";
