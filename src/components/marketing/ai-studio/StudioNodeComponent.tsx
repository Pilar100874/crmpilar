import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { StudioNodeData, getNodeMeta } from './types';
import { Loader2, Play, Maximize2, Image as ImageIcon, Film, Music, Type, MoreHorizontal, GripVertical } from 'lucide-react';

const StudioNodeComponent: React.FC<NodeProps> = memo(({ data, selected }) => {
  const nodeData = data as unknown as StudioNodeData;
  const meta = getNodeMeta(nodeData.type);
  const color = meta?.color || '#64748b';
  const [imageExpanded, setImageExpanded] = useState(false);

  const hasInput = !['textInput', 'systemPrompt'].includes(nodeData.type);
  const hasOutput = nodeData.type !== 'output';

  const resultImage = nodeData.result?.imageUrl;
  const resultVideo = nodeData.result?.videoUrl;
  const resultText = typeof nodeData.result === 'string'
    ? nodeData.result
    : nodeData.result?.text;
  const hasResult = !!(resultImage || resultVideo || resultText);

  const nodeWidth = (resultImage || resultVideo) ? 340 : 280;

  return (
    <div
      className={`
        relative rounded-2xl transition-all duration-200 overflow-visible
        ${selected
          ? 'shadow-xl scale-[1.02]'
          : 'shadow-md hover:shadow-lg'
        }
        ${nodeData.error ? 'ring-2 ring-destructive/40' : ''}
        ${nodeData.isProcessing ? 'animate-pulse' : ''}
      `}
      style={{
        width: nodeWidth,
        background: 'hsl(var(--card))',
        border: selected ? `2px solid ${color}` : '1px solid hsl(var(--border))',
        borderRadius: 16,
      }}
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-base shrink-0">{meta?.icon || '📦'}</span>
          <p className="text-sm font-semibold truncate text-foreground">{nodeData.label}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {nodeData.isProcessing && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          )}
          {hasResult && (
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" title="Processado" />
          )}
          <button className="p-1 rounded-md hover:bg-accent transition-colors">
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="relative">
        {/* Text input preview */}
        {nodeData.type === 'textInput' && (
          <div className="px-3.5 pb-3">
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6 whitespace-pre-wrap">
              {nodeData.config.text || 'Clique para editar o texto...'}
            </p>
          </div>
        )}
        {nodeData.type === 'systemPrompt' && (
          <div className="px-3.5 pb-3">
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6 whitespace-pre-wrap">
              {nodeData.config.systemPrompt || 'Clique para definir instruções...'}
            </p>
          </div>
        )}

        {/* Model info */}
        {!hasResult && nodeData.type === 'llmProcess' && (
          <div className="px-3.5 pb-3 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
              <Type className="h-2.5 w-2.5 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">{nodeData.config.model || 'Gemini 2.5 Flash'}</span>
          </div>
        )}
        {!hasResult && nodeData.type === 'videoGen' && (
          <div className="px-3.5 pb-3 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
              <Film className="h-2.5 w-2.5 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">
              {nodeData.config.videoModel || 'Veo 3.1'} • {nodeData.config.duration || 5}s • {nodeData.config.resolution || '1080p'}
            </span>
          </div>
        )}
        {!hasResult && (nodeData.type === 'imageGen' || nodeData.type === 'imageEdit') && (
          <div className="px-3.5 pb-3 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
              <ImageIcon className="h-2.5 w-2.5 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">
              {nodeData.config.model?.split('/').pop() || 'Gemini Flash Image'}
            </span>
          </div>
        )}
        {!hasResult && nodeData.type === 'musicGen' && (
          <div className="px-3.5 pb-3 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
              <Music className="h-2.5 w-2.5 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">
              {nodeData.config.musicModel?.split('/').pop() || 'Suno v4'} • {nodeData.config.genre || 'ambient'} • {nodeData.config.duration || 30}s
            </span>
          </div>
        )}

        {/* Result display */}
        {hasResult && (
          <div className="relative">
            {resultImage && (
              <div className="relative group px-3 pb-3">
                <img
                  src={resultImage}
                  alt="Resultado gerado"
                  className="w-full object-cover cursor-pointer transition-all rounded-xl"
                  style={{ maxHeight: imageExpanded ? 500 : 200 }}
                  onClick={() => setImageExpanded(!imageExpanded)}
                />
                <div className="absolute top-2 right-5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setImageExpanded(!imageExpanded)}
                    className="p-1.5 rounded-lg bg-background/80 backdrop-blur-sm hover:bg-background transition-colors border border-border shadow-sm"
                  >
                    <Maximize2 className="h-3 w-3 text-foreground/80" />
                  </button>
                </div>
              </div>
            )}

            {resultVideo && (
              <div className="relative group px-3 pb-3">
                <video
                  src={resultVideo}
                  controls
                  className="w-full object-cover rounded-xl"
                  style={{ maxHeight: 220 }}
                />
              </div>
            )}

            {resultText && !resultImage && !resultVideo && (
              <div className="px-3.5 pb-3">
                <p className="text-xs text-foreground/70 leading-relaxed line-clamp-8 whitespace-pre-wrap">
                  {resultText}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Output node empty */}
        {nodeData.type === 'output' && !hasResult && (
          <div className="px-3.5 pb-3 flex flex-col items-center justify-center text-center gap-1.5">
            <div className="w-10 h-10 rounded-xl bg-muted/50 border border-dashed border-border flex items-center justify-center">
              <Play className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <p className="text-[10px] text-muted-foreground">Aguardando execução</p>
          </div>
        )}

        {/* Error */}
        {nodeData.error && (
          <div className="mx-3 mb-3 px-3 py-2 bg-destructive/5 rounded-lg border border-destructive/10">
            <p className="text-[11px] text-destructive line-clamp-2">{nodeData.error}</p>
          </div>
        )}

        {/* Processing overlay */}
        {nodeData.isProcessing && (
          <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10 rounded-b-2xl">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-[11px] text-muted-foreground">Processando...</p>
          </div>
        )}
      </div>

      {/* Resize handle hint */}
      {nodeData.type === 'textInput' && (
        <div className="absolute bottom-1 right-2">
          <GripVertical className="h-3 w-3 text-muted-foreground/30" />
        </div>
      )}

      {/* Handles - green circles like reference */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !rounded-full !border-[2.5px] !border-background !-left-1.5"
          style={{ backgroundColor: '#22c55e' }}
        />
      )}
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !rounded-full !border-[2.5px] !border-background !-right-1.5"
          style={{ backgroundColor: '#22c55e' }}
        />
      )}
    </div>
  );
});

StudioNodeComponent.displayName = 'StudioNodeComponent';
export default StudioNodeComponent;
