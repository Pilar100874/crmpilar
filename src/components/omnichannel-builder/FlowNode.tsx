import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { 
  Users, 
  User, 
  Award, 
  GitBranch,
  Play
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OmnichannelBlockType } from "@/types/omnichannelFlow";

interface FlowNodeProps {
  id: string;
  data: {
    type: OmnichannelBlockType;
    label: string;
    config: any;
    isSkipped?: boolean;
  };
  selected?: boolean;
}

const nodeIcons: Record<OmnichannelBlockType, React.ReactNode> = {
  inicio: <Play className="h-5 w-5" />,
  fila: <Users className="h-5 w-5" />,
  atendente: <User className="h-5 w-5" />,
  skill: <Award className="h-5 w-5" />,
  regra_roteamento: <GitBranch className="h-5 w-5" />,
};

const nodeColors: Record<OmnichannelBlockType, string> = {
  inicio: "bg-green-100 dark:bg-green-900/20 border-green-500",
  fila: "bg-blue-100 dark:bg-blue-900/20 border-blue-500",
  atendente: "bg-purple-100 dark:bg-purple-900/20 border-purple-500",
  skill: "bg-orange-100 dark:bg-orange-900/20 border-orange-500",
  regra_roteamento: "bg-cyan-100 dark:bg-cyan-900/20 border-cyan-500",
};

export const FlowNode = memo(({ id, data, selected }: FlowNodeProps) => {
  const { type, label, isSkipped } = data;

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 p-4 shadow-lg min-w-[260px] transition-all",
        nodeColors[type],
        selected && "ring-2 ring-primary ring-offset-2",
        isSkipped && "opacity-50"
      )}
    >
      {type !== "inicio" && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-primary !w-3 !h-3"
        />
      )}

      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 text-foreground">
          {nodeIcons[type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-foreground truncate">
            {label}
          </div>
          <div className="text-xs text-muted-foreground capitalize">
            {type.replace('_', ' ')}
          </div>
        </div>
      </div>

      {type !== "inicio" && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-primary !w-3 !h-3"
        />
      )}
    </div>
  );
});

FlowNode.displayName = "FlowNode";
