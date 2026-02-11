import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { StudioNodeData, getNodeMeta } from './types';
import { Loader2 } from 'lucide-react';

const StudioNodeComponent: React.FC<NodeProps> = memo(({ data, selected }) => {
  const nodeData = data as unknown as StudioNodeData;
  const meta = getNodeMeta(nodeData.type);
  const color = meta?.color || '#64748b';

  const hasInput = !['textInput', 'systemPrompt'].includes(nodeData.type);
  const hasOutput = nodeData.type !== 'output';

  return (
    <div
      className={`
        relative rounded-xl border bg-[#1a1a2e] shadow-lg min-w-[200px] max-w-[280px]
        transition-all duration-200
        ${selected ? 'ring-2 ring-purple-500/60 shadow-purple-500/10 shadow-xl scale-[1.02]' : 'hover:shadow-xl border-white/[0.08]'}
        ${nodeData.error ? 'border-red-500/60' : ''}
      `}
      style={{ borderColor: nodeData.error ? undefined : (selected ? color : undefined) }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 rounded-t-[10px] flex items-center gap-2 border-b border-white/[0.05]"
        style={{ backgroundColor: `${color}15` }}
      >
        <span className="text-lg">{meta?.icon || '📦'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate text-white/80">{nodeData.label}</p>
          <p className="text-[10px] text-white/30">{meta?.description?.slice(0, 40)}</p>
        </div>
        {nodeData.isProcessing && (
          <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-1.5">
        {nodeData.type === 'textInput' && (
          <p className="text-xs text-white/40 line-clamp-3 italic">
            {nodeData.config.text || 'Clique para editar o texto...'}
          </p>
        )}
        {nodeData.type === 'systemPrompt' && (
          <p className="text-xs text-white/40 line-clamp-3 italic">
            {nodeData.config.systemPrompt || 'Clique para definir instruções...'}
          </p>
        )}
        {nodeData.type === 'llmProcess' && (
          <p className="text-[10px] text-white/30">
            Modelo: {nodeData.config.model || 'Gemini 2.5 Flash'}
          </p>
        )}
        {nodeData.type === 'videoGen' && (
          <p className="text-[10px] text-white/30">
            Modelo: {nodeData.config.videoModel || 'Veo 3.1'}
          </p>
        )}
        {(nodeData.type === 'imageGen' || nodeData.type === 'imageEdit') && (
          <p className="text-[10px] text-white/30">
            Modelo: {nodeData.config.model?.includes('imagefx') ? 'Google ImageFX' : nodeData.config.model?.includes('pro') ? 'Gemini Pro Image' : 'Gemini Flash Image'}
          </p>
        )}

        {/* Result preview */}
        {nodeData.result && (
          <div className="mt-2 border-t border-white/[0.06] pt-2">
            {typeof nodeData.result === 'string' && (
              <p className="text-xs line-clamp-4 text-white/60">{nodeData.result}</p>
            )}
            {nodeData.result?.imageUrl && (
              <img
                src={nodeData.result.imageUrl}
                alt="Generated"
                className="w-full rounded-md max-h-32 object-cover"
              />
            )}
            {nodeData.result?.text && !nodeData.result?.imageUrl && (
              <p className="text-xs line-clamp-3 text-white/60">{nodeData.result.text}</p>
            )}
          </div>
        )}

        {/* Error */}
        {nodeData.error && (
          <p className="text-xs text-red-400">{nodeData.error}</p>
        )}
      </div>

      {/* Handles */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !border-2 !border-[#1a1a2e]"
          style={{ backgroundColor: color }}
        />
      )}
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !border-2 !border-[#1a1a2e]"
          style={{ backgroundColor: color }}
        />
      )}
    </div>
  );
});

StudioNodeComponent.displayName = 'StudioNodeComponent';
export default StudioNodeComponent;
