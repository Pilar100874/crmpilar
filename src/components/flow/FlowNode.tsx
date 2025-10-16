import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
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
import { Pause, SkipForward, X, Database, MoreVertical, ArrowRight } from "lucide-react";

export const FlowNode = memo((props: any) => {
  const { data, selected, id } = props;
  const blockDef = BLOCK_DEFINITIONS.find((b) => b.type === data.type);
  if (!blockDef) return null;

  const IconComponent = Icons[blockDef.icon as keyof typeof Icons] as any;

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
          color: "bg-blue-500"
        }))
      };
    }

    // Botões de resposta - uma saída para cada botão
    if (data.type === "reply_buttons" && config.buttons) {
      const buttons = Array.isArray(config.buttons) 
        ? config.buttons 
        : [];
      return {
        buttons: buttons.map((btn: any, index: number) => ({
          id: `button_${index}`,
          label: btn.text || `Botão ${index + 1}`,
          color: "bg-purple-500"
        }))
      };
    }

    // List buttons - uma saída para cada item
    if (data.type === "list_buttons" && config.sections) {
      const sections = Array.isArray(config.sections) ? config.sections : [];
      const allItems: any[] = [];
      sections.forEach((section: any, sectionIdx: number) => {
        if (section.items && Array.isArray(section.items)) {
          section.items.forEach((item: any, itemIdx: number) => {
            allItems.push({
              id: `section_${sectionIdx}_item_${itemIdx}`,
              label: item.title || `Item ${allItems.length + 1}`,
              color: "bg-indigo-500"
            });
          });
        }
      });
      if (allItems.length > 0) {
        return { buttons: allItems };
      }
    }

    // Keyword options (carousel) - uma saída para cada card
    if (data.type === "keyword_options" && config.cards) {
      const cards = Array.isArray(config.cards) ? config.cards : [];
      return {
        buttons: cards.map((card: any, index: number) => ({
          id: `card_${index}`,
          label: card.keyword || `Card ${index + 1}`,
          color: "bg-cyan-500"
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

    return null;
  };

  const dynamicHandles = getDynamicHandles();

  // Determinar cor do card baseado no estado de debug
  const getCardClassName = () => {
    const baseClass = "min-w-[280px] max-w-[340px] transition-all duration-300 shadow-lg";
    
    if (data.isBreakpoint) {
      return `${baseClass} bg-white border-2 border-orange-500 ${
        selected ? "ring-4 ring-cyan-400/40 shadow-2xl" : "hover:shadow-xl"
      }`;
    }
    
    if (data.isSkipped) {
      return `${baseClass} bg-white/60 border-2 border-slate-300 opacity-70 ${
        selected ? "ring-4 ring-cyan-400/40 shadow-2xl" : "hover:shadow-xl"
      }`;
    }
    
    return `${baseClass} bg-white border border-slate-200 ${
      selected 
        ? "ring-4 ring-cyan-400/40 shadow-2xl" 
        : "hover:shadow-xl hover:border-slate-300"
    }`;
  };

  // Pegar preview de conteúdo
  const getContentPreview = () => {
    const config = data.config || {};
    
    if (data.type === "send_message" && config.text) {
      return config.text.substring(0, 80) + (config.text.length > 80 ? "..." : "");
    }
    
    if (data.type === "ask_question" && config.question) {
      return config.question.substring(0, 80) + (config.question.length > 80 ? "..." : "");
    }
    
    if (data.type === "ask_name" && config.question) {
      return config.question;
    }
    
    if (data.type === "goodbye" && config.text) {
      return config.text.substring(0, 80) + (config.text.length > 80 ? "..." : "");
    }
    
    return null;
  };

  const contentPreview = getContentPreview();

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Card className={getCardClassName()}>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-cyan-500 !w-3 !h-3 !border-2 !border-white !shadow-md" 
      />
      
      <div className="p-4">
        {/* Header com ícone e menu */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {IconComponent && (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20 flex items-center justify-center">
                <IconComponent className="w-5 h-5 text-cyan-600" strokeWidth={2.5} />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 text-base leading-tight">{blockDef.label}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{blockDef.description}</p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600 p-1">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Preview de conteúdo se disponível */}
        {contentPreview && (
          <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-700 line-clamp-3">{contentPreview}</p>
          </div>
        )}
        
        {/* Mostrar opções com handles à direita */}
        {dynamicHandles && (
          <div className="space-y-1.5">
            {/* Condições */}
            {dynamicHandles.conditions?.map((cond: any, index: number) => (
              <div key={cond.id} className="relative flex items-center justify-between gap-2 py-2 px-3 bg-green-50 border border-green-200 rounded-lg group hover:bg-green-100 transition-colors">
                <span className="text-xs font-medium truncate text-green-700">{cond.label}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={cond.id}
                  className="!bg-green-500 !w-3 !h-3 !relative !transform-none !top-auto !right-0 !border-2 !border-white !shadow-md group-hover:!scale-125 !transition-transform"
                  style={{ position: 'relative' }}
                />
              </div>
            ))}
            
            {/* Fallback */}
            {dynamicHandles.fallback && (
              <div className="relative flex items-center justify-between gap-2 py-2 px-3 bg-pink-50 border border-pink-200 rounded-lg group hover:bg-pink-100 transition-colors">
                <span className="text-xs font-medium truncate text-pink-700">{dynamicHandles.fallback.label}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={dynamicHandles.fallback.id}
                  className="!bg-pink-500 !w-3 !h-3 !relative !transform-none !top-auto !right-0 !border-2 !border-white !shadow-md group-hover:!scale-125 !transition-transform"
                  style={{ position: 'relative' }}
                />
              </div>
            )}
            
            {/* Keywords */}
            {dynamicHandles.keywords?.map((kw: any) => (
              <div key={kw.id} className="relative flex items-center justify-between gap-2 py-2 px-3 bg-blue-50 border border-blue-200 rounded-lg group hover:bg-blue-100 transition-colors">
                <span className="text-xs font-medium truncate text-blue-700">{kw.label}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={kw.id}
                  className="!bg-blue-500 !w-3 !h-3 !relative !transform-none !top-auto !right-0 !border-2 !border-white !shadow-md group-hover:!scale-125 !transition-transform"
                  style={{ position: 'relative' }}
                />
              </div>
            ))}
            
            {/* Buttons/Options/Cards */}
            {dynamicHandles.buttons?.map((btn: any) => (
              <div key={btn.id} className="relative flex items-center justify-between gap-2 py-2 px-3 bg-purple-50 border border-purple-200 rounded-lg group hover:bg-purple-100 transition-colors">
                <span className="text-xs font-medium truncate text-purple-700">{btn.label}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={btn.id}
                  className="!bg-purple-500 !w-3 !h-3 !relative !transform-none !top-auto !right-0 !border-2 !border-white !shadow-md group-hover:!scale-125 !transition-transform"
                  style={{ position: 'relative' }}
                />
              </div>
            ))}
            
            {/* Paths (opt-in check, etc) */}
            {dynamicHandles.paths?.map((path: any) => (
              <div key={path.id} className={`relative flex items-center justify-between gap-2 py-2 px-3 rounded-lg group transition-colors ${
                path.color === 'bg-green-500' 
                  ? 'bg-green-50 border border-green-200 hover:bg-green-100' 
                  : 'bg-red-50 border border-red-200 hover:bg-red-100'
              }`}>
                <span className={`text-xs font-medium truncate ${
                  path.color === 'bg-green-500' ? 'text-green-700' : 'text-red-700'
                }`}>{path.label}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={path.id}
                  className={`!w-3 !h-3 !relative !transform-none !top-auto !right-0 !border-2 !border-white !shadow-md group-hover:!scale-125 !transition-transform ${
                    path.color === 'bg-green-500' 
                      ? '!bg-green-500' 
                      : '!bg-red-500'
                  }`}
                  style={{ position: 'relative' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Handle padrão para blocos sem saídas dinâmicas - botão circular */}
      {!dynamicHandles && (
        <div className="absolute -right-3 top-1/2 -translate-y-1/2">
          <Handle 
            type="source" 
            position={Position.Right} 
            className="!static !transform-none"
          >
            <div className="w-8 h-8 rounded-full bg-cyan-500 border-2 border-white shadow-lg flex items-center justify-center hover:bg-cyan-600 transition-colors cursor-pointer">
              <ArrowRight className="w-4 h-4 text-white" strokeWidth={3} />
            </div>
          </Handle>
        </div>
      )}
      
      {/* Badge de estado de debug */}
      {data.isBreakpoint && (
        <div className="absolute -top-2 -left-2 bg-orange-500 text-white rounded-full p-1.5 shadow-lg z-10">
          <Pause className="w-3.5 h-3.5" />
        </div>
      )}
      {data.isSkipped && (
        <div className="absolute -top-2 -left-2 bg-slate-400 text-white rounded-full p-1.5 shadow-lg z-10">
          <SkipForward className="w-3.5 h-3.5" />
        </div>
      )}
    </Card>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-56 bg-slate-800 border-slate-700">
        
        <ContextMenuItem
          onClick={() => data.onSetBreakpoint?.(id)}
          className="text-slate-200 focus:bg-slate-700 focus:text-white cursor-pointer"
        >
          <Pause className="w-4 h-4 mr-2 text-orange-400" />
          {data.isBreakpoint ? "Remover Pausa" : "Pausar Simulação Aqui"}
        </ContextMenuItem>
        
        <ContextMenuItem
          onClick={() => data.onSetSkip?.(id)}
          className="text-slate-200 focus:bg-slate-700 focus:text-white cursor-pointer"
        >
          <SkipForward className="w-4 h-4 mr-2 text-slate-400" />
          {data.isSkipped ? "Não Pular Bloco" : "Pular Este Bloco"}
        </ContextMenuItem>
        
        <ContextMenuSeparator className="bg-slate-700" />
        
        <ContextMenuItem
          onClick={() => data.onClearDebug?.(id)}
          disabled={!data.isBreakpoint && !data.isSkipped}
          className="text-slate-200 focus:bg-slate-700 focus:text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-4 h-4 mr-2 text-red-400" />
          Liberar Bloco
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});

FlowNode.displayName = "FlowNode";
