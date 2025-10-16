import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { FlowNodeData } from "@/types/flow";
import { BLOCK_DEFINITIONS } from "@/types/flow";
import * as Icons from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
    const baseClass = "min-w-[260px] max-w-[300px] transition-all duration-200 shadow-lg";
    
    if (data.isBreakpoint) {
      return `${baseClass} bg-white border-2 border-orange-500 ${
        selected ? "ring-2 ring-blue-400" : ""
      }`;
    }
    
    if (data.isSkipped) {
      return `${baseClass} bg-white/60 border-2 border-slate-400 opacity-60 ${
        selected ? "ring-2 ring-blue-400" : ""
      }`;
    }
    
    return `${baseClass} bg-white border border-slate-300 ${
      selected 
        ? "ring-2 ring-blue-400 border-blue-400" 
        : "hover:border-slate-400"
    }`;
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Card className={getCardClassName()}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!bg-cyan-400 !w-3 !h-3 !border-2 !border-white" 
      />
      
      <div className="p-3">
        {/* Cabeçalho com checkbox, ícone, título e menu */}
        <div className="flex items-start gap-2 mb-3">
          <Checkbox className="mt-0.5 h-4 w-4 border-slate-300" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {IconComponent && (
                <div className="p-1 rounded bg-blue-50 border border-blue-200">
                  <IconComponent className="w-3.5 h-3.5 text-blue-600" />
                </div>
              )}
              <span className="font-semibold text-sm text-slate-900 truncate">{blockDef.label}</span>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2">{data.label || blockDef.description}</p>
          </div>
          <button className="p-1 hover:bg-slate-100 rounded transition-colors">
            <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
        
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
                    className="!bg-cyan-400 !w-5 !h-5 !relative !transform-none !top-auto !right-0 !border-2 !border-white !rounded-full group-hover:!scale-110 !transition-transform !flex !items-center !justify-center"
                    style={{ position: 'relative' }}
                  />
                  <ArrowRight className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            ))}
            
            {/* Fallback */}
            {dynamicHandles.fallback && (
              <div className="relative flex items-center justify-between gap-2 py-2.5 px-3 bg-blue-100 border border-blue-200 rounded-md group hover:bg-blue-200 transition-colors">
                <div className="flex items-center gap-2">
                  <Icons.HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-medium truncate text-blue-800">{dynamicHandles.fallback.label}</span>
                </div>
                <div className="relative">
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={dynamicHandles.fallback.id}
                    className="!bg-cyan-400 !w-5 !h-5 !relative !transform-none !top-auto !right-0 !border-2 !border-white !rounded-full group-hover:!scale-110 !transition-transform"
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
                    className="!bg-cyan-400 !w-5 !h-5 !relative !transform-none !top-auto !right-0 !border-2 !border-white !rounded-full group-hover:!scale-110 !transition-transform"
                    style={{ position: 'relative' }}
                  />
                  <ArrowRight className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
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
                    className="!bg-cyan-400 !w-5 !h-5 !relative !transform-none !top-auto !right-0 !border-2 !border-white !rounded-full group-hover:!scale-110 !transition-transform"
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
                  : 'bg-blue-100 border border-blue-200 hover:bg-blue-200'
              }`}>
                {path.color === 'bg-red-500' && (
                  <div className="flex items-center gap-2">
                    <Icons.HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-medium truncate text-blue-800">{path.label}</span>
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
                    className="!bg-cyan-400 !w-5 !h-5 !relative !transform-none !top-auto !right-0 !border-2 !border-white !rounded-full group-hover:!scale-110 !transition-transform"
                    style={{ position: 'relative' }}
                  />
                  <ArrowRight className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Handle padrão para blocos sem saídas dinâmicas */}
      {!dynamicHandles && (
        <div className="relative">
          <Handle 
            type="source" 
            position={Position.Bottom} 
            className="!bg-cyan-400 !w-5 !h-5 !border-2 !border-white !rounded-full" 
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
        <div className="absolute -top-2 -right-2 bg-slate-500 text-white rounded-full p-1 shadow-lg">
          <SkipForward className="w-3 h-3" />
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
