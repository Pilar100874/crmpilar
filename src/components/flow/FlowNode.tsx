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
      className={`min-w-[200px] transition-all ${
        selected ? "ring-2 ring-primary shadow-lg" : "shadow-md"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          {IconComponent && <IconComponent className={`w-4 h-4 ${blockDef.color}`} />}
          <span className="font-medium text-sm">{blockDef.label}</span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{data.label || blockDef.description}</p>
        
        {/* Mostrar badges para saídas dinâmicas */}
        {dynamicHandles && (
          <div className="mt-2 flex flex-wrap gap-1">
            {dynamicHandles.conditions?.map((cond: any, idx: number) => (
              <Badge key={cond.id} variant="outline" className="text-xs">
                {cond.label}
              </Badge>
            ))}
            {dynamicHandles.keywords?.map((kw: any) => (
              <Badge key={kw.id} variant="outline" className="text-xs">
                {kw.label}
              </Badge>
            ))}
            {dynamicHandles.buttons?.map((btn: any) => (
              <Badge key={btn.id} variant="outline" className="text-xs">
                {btn.label}
              </Badge>
            ))}
            {dynamicHandles.paths?.map((path: any) => (
              <Badge key={path.id} variant="outline" className="text-xs">
                {path.label}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Handles de saída dinâmicos */}
      {dynamicHandles ? (
        <div className="relative pb-4">
          {/* Condições */}
          {dynamicHandles.conditions?.map((cond: any, index: number) => (
            <Handle
              key={cond.id}
              type="source"
              position={Position.Bottom}
              id={cond.id}
              className={`!${cond.color} !w-3 !h-3`}
              style={{
                left: `${((index + 1) * 100) / (dynamicHandles.conditions.length + (dynamicHandles.fallback ? 2 : 1))}%`
              }}
            />
          ))}
          
          {/* Fallback */}
          {dynamicHandles.fallback && (
            <Handle
              type="source"
              position={Position.Bottom}
              id={dynamicHandles.fallback.id}
              className={`!${dynamicHandles.fallback.color} !w-3 !h-3`}
              style={{
                left: `${((dynamicHandles.conditions?.length || 0) + 1) * 100 / (dynamicHandles.conditions?.length + 2 || 2)}%`
              }}
            />
          )}

          {/* Keywords */}
          {dynamicHandles.keywords?.map((kw: any, index: number) => (
            <Handle
              key={kw.id}
              type="source"
              position={Position.Bottom}
              id={kw.id}
              className={`!${kw.color} !w-3 !h-3`}
              style={{
                left: `${((index + 1) * 100) / (dynamicHandles.keywords.length + 1)}%`
              }}
            />
          ))}

          {/* Buttons */}
          {dynamicHandles.buttons?.map((btn: any, index: number) => (
            <Handle
              key={btn.id}
              type="source"
              position={Position.Bottom}
              id={btn.id}
              className={`!${btn.color} !w-3 !h-3`}
              style={{
                left: `${((index + 1) * 100) / (dynamicHandles.buttons.length + 1)}%`
              }}
            />
          ))}

          {/* Paths */}
          {dynamicHandles.paths?.map((path: any, index: number) => (
            <Handle
              key={path.id}
              type="source"
              position={Position.Bottom}
              id={path.id}
              className={`!${path.color} !w-3 !h-3`}
              style={{
                left: `${((index + 1) * 100) / (dynamicHandles.paths.length + 1)}%`
              }}
            />
          ))}
        </div>
      ) : (
        <Handle type="source" position={Position.Bottom} className="!bg-primary" />
      )}
    </Card>
  );
});

FlowNode.displayName = "FlowNode";
