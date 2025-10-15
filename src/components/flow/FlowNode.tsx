import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { FlowNodeData } from "@/types/flow";
import { BLOCK_DEFINITIONS } from "@/types/flow";
import * as Icons from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const FlowNode = memo((props: any) => {
  const { data, selected } = props;
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

  return (
    <Card
      className={`min-w-[220px] max-w-[280px] transition-all duration-300 bg-slate-800/90 backdrop-blur-sm border-slate-700/50 shadow-xl ${
        selected 
          ? "ring-2 ring-cyan-500 shadow-2xl shadow-cyan-500/20 border-cyan-500/50" 
          : "hover:border-slate-600/70 hover:shadow-lg"
      }`}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!bg-gradient-to-r !from-cyan-500 !to-blue-600 !w-3 !h-3 !border-2 !border-slate-800" 
      />
      
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-2">
          {IconComponent && (
            <div className="p-1.5 rounded-md bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
              <IconComponent className="w-4 h-4 text-cyan-400" />
            </div>
          )}
          <span className="font-semibold text-sm text-white">{blockDef.label}</span>
        </div>
        <p className="text-xs text-slate-400 line-clamp-2">{data.label || blockDef.description}</p>
        
        {/* Mostrar opções com handles à direita */}
        {dynamicHandles && (
          <div className="mt-3 space-y-1.5">
            {/* Condições */}
            {dynamicHandles.conditions?.map((cond: any, index: number) => (
              <div key={cond.id} className="relative flex items-center justify-between gap-2 py-2 px-2.5 bg-green-500/10 border border-green-500/30 rounded-md group hover:bg-green-500/20 transition-colors">
                <span className="text-xs font-medium truncate text-green-400">{cond.label}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={cond.id}
                  className="!bg-gradient-to-r !from-green-500 !to-emerald-500 !w-3 !h-3 !relative !transform-none !top-auto !right-0 !border-2 !border-slate-800 group-hover:!scale-125 !transition-transform"
                  style={{ position: 'relative' }}
                />
              </div>
            ))}
            
            {/* Fallback */}
            {dynamicHandles.fallback && (
              <div className="relative flex items-center justify-between gap-2 py-2 px-2.5 bg-pink-500/10 border border-pink-500/30 rounded-md group hover:bg-pink-500/20 transition-colors">
                <span className="text-xs font-medium truncate text-pink-400">{dynamicHandles.fallback.label}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={dynamicHandles.fallback.id}
                  className="!bg-gradient-to-r !from-pink-500 !to-rose-500 !w-3 !h-3 !relative !transform-none !top-auto !right-0 !border-2 !border-slate-800 group-hover:!scale-125 !transition-transform"
                  style={{ position: 'relative' }}
                />
              </div>
            )}
            
            {/* Keywords */}
            {dynamicHandles.keywords?.map((kw: any) => (
              <div key={kw.id} className="relative flex items-center justify-between gap-2 py-2 px-2.5 bg-blue-500/10 border border-blue-500/30 rounded-md group hover:bg-blue-500/20 transition-colors">
                <span className="text-xs font-medium truncate text-blue-400">{kw.label}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={kw.id}
                  className="!bg-gradient-to-r !from-blue-500 !to-indigo-500 !w-3 !h-3 !relative !transform-none !top-auto !right-0 !border-2 !border-slate-800 group-hover:!scale-125 !transition-transform"
                  style={{ position: 'relative' }}
                />
              </div>
            ))}
            
            {/* Buttons/Options/Cards */}
            {dynamicHandles.buttons?.map((btn: any) => (
              <div key={btn.id} className="relative flex items-center justify-between gap-2 py-2 px-2.5 bg-purple-500/10 border border-purple-500/30 rounded-md group hover:bg-purple-500/20 transition-colors">
                <span className="text-xs font-medium truncate text-purple-400">{btn.label}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={btn.id}
                  className="!bg-gradient-to-r !from-purple-500 !to-violet-500 !w-3 !h-3 !relative !transform-none !top-auto !right-0 !border-2 !border-slate-800 group-hover:!scale-125 !transition-transform"
                  style={{ position: 'relative' }}
                />
              </div>
            ))}
            
            {/* Paths (opt-in check, etc) */}
            {dynamicHandles.paths?.map((path: any) => (
              <div key={path.id} className={`relative flex items-center justify-between gap-2 py-2 px-2.5 rounded-md group transition-colors ${
                path.color === 'bg-green-500' 
                  ? 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/20' 
                  : 'bg-red-500/10 border border-red-500/30 hover:bg-red-500/20'
              }`}>
                <span className={`text-xs font-medium truncate ${
                  path.color === 'bg-green-500' ? 'text-green-400' : 'text-red-400'
                }`}>{path.label}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={path.id}
                  className={`!w-3 !h-3 !relative !transform-none !top-auto !right-0 !border-2 !border-slate-800 group-hover:!scale-125 !transition-transform ${
                    path.color === 'bg-green-500' 
                      ? '!bg-gradient-to-r !from-green-500 !to-emerald-500' 
                      : '!bg-gradient-to-r !from-red-500 !to-rose-500'
                  }`}
                  style={{ position: 'relative' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Handle padrão para blocos sem saídas dinâmicas */}
      {!dynamicHandles && (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="!bg-gradient-to-r !from-cyan-500 !to-blue-600 !w-3 !h-3 !border-2 !border-slate-800" 
        />
      )}
    </Card>
  );
});

FlowNode.displayName = "FlowNode";
