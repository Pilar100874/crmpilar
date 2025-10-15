import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { FlowNodeData } from "@/types/flow";
import { BLOCK_DEFINITIONS } from "@/types/flow";
import * as Icons from "lucide-react";
import { Card } from "@/components/ui/card";

export const FlowNode = memo((props: any) => {
  const { data, selected } = props;
  const blockDef = BLOCK_DEFINITIONS.find((b) => b.type === data.type);
  if (!blockDef) return null;

  const IconComponent = Icons[blockDef.icon as keyof typeof Icons] as any;

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
        <p className="text-xs text-muted-foreground">{data.label || blockDef.description}</p>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </Card>
  );
});

FlowNode.displayName = "FlowNode";
