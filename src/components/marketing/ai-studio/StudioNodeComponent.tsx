import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { StudioNodeData, getNodeMeta } from './types';
import { Loader2, Play, Maximize2, Image as ImageIcon, Film, Music, Type, MoreHorizontal } from 'lucide-react';

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

  const nodeWidth = (resultImage || resultVideo) ? 320 : 260;

  return (
    <div
      className={`
        relative rounded-xl border shadow-md transition-all duration-200 overflow-hidden bg-card
        ${selected
          ? 'ring-2 ring-primary ring-offset-1 ring-offset-background shadow-lg scale-[1.02]'
          : 'hover:shadow-lg border-border'
        }
        ${nodeData.error ? 'border-destructive/50' : ''}
        ${nodeData.isProcessing ? 'animate-pulse' : ''}
      `}
      style={{ width: nodeWidth }}
    >
      {/* Header bar */}
      <div
        className="px-3 py-2.5 flex items-center gap-2.5 border-b border-border"
        style={{ backgroundColor: `${color}12` }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
          style={{ backgroundColor: `${color}25` }}
        >
          {meta?.icon || '📦'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate text-foreground/90">{nodeData.label}</p>
          {!hasResult && (
            <p className="text-[10px] text-muted-foreground truncate">{meta?.description?.slice(0, 50)}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {nodeData.isProcessing && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          )}
          {hasResult && (
            <div className="w-2 h-2 rounded-full bg-success shrink-0" title="Processado" />
          )}
          <button className="p-0.5 rounded hover:bg-accent transition-colors">
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="relative">
        {nodeData.type === 'textInput' && (
          <div className="px-3 py-2.5 border-b border-border">
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
              {nodeData.config.text || 'Clique para editar o texto...'}
            </p>
          </div>
        )}
        {nodeData.type === 'systemPrompt' && (
          <div className="px-3 py-2.5 border-b border-border">
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
              {nodeData.config.systemPrompt || 'Clique para definir instruções...'}
            </p>
          </div>
        )}

        {!hasResult && nodeData.type === 'llmProcess' && (
          <div className="px-3 py-2 flex items-center gap-2">
            <Type className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground">{nodeData.config.model || 'Gemini 2.5 Flash'}</span>
          </div>
        )}
        {!hasResult && nodeData.type === 'videoGen' && (
          <div className="px-3 py-2 flex items-center gap-2">
            <Film className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground">
              {nodeData.config.videoModel || 'Veo 3.1'} • {nodeData.config.duration || 5}s • {nodeData.config.resolution || '1080p'}
            </span>
          </div>
        )}
        {!hasResult && (nodeData.type === 'imageGen' || nodeData.type === 'imageEdit') && (
          <div className="px-3 py-2 flex items-center gap-2">
            <ImageIcon className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground">
              {nodeData.config.model?.split('/').pop() || 'Gemini Flash Image'}
            </span>
          </div>
        )}
        {!hasResult && nodeData.type === 'musicGen' && (
          <div className="px-3 py-2 flex items-center gap-2">
            <Music className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground">
              {nodeData.config.musicModel?.split('/').pop() || 'Suno v4'} • {nodeData.config.genre || 'ambient'} • {nodeData.config.duration || 30}s
            </span>
          </div>
        )}

        {/* Result display */}
        {hasResult && (
          <div className="relative">
            {resultImage && (
              <div className="relative group">
                <img
                  src={resultImage}
                  alt="Resultado gerado"
                  className="w-full object-cover cursor-pointer transition-all"
                  style={{ maxHeight: imageExpanded ? 500 : 200 }}
                  onClick={() => setImageExpanded(!imageExpanded)}
                />
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setImageExpanded(!imageExpanded)}
                    className="p-1.5 rounded-lg bg-background/80 backdrop-blur-sm hover:bg-background transition-colors border border-border"
                  >
                    <Maximize2 className="h-3 w-3 text-foreground/80" />
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-background/80 backdrop-blur-sm rounded text-[10px] text-foreground/70 border border-border">
                  Imagem Gerada
                </div>
              </div>
            )}

            {resultVideo && (
              <div className="relative group">
                <video
                  src={resultVideo}
                  controls
                  className="w-full object-cover"
                  style={{ maxHeight: 220 }}
                />
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-background/80 backdrop-blur-sm rounded text-[10px] text-foreground/70 border border-border">
                  Vídeo Gerado
                </div>
              </div>
            )}

            {resultText && !resultImage && !resultVideo && (
              <div className="px-3 py-2.5 bg-muted/30">
                <div className="flex items-start gap-2">
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] mt-0.5 shrink-0"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    {meta?.icon || '📝'}
                  </div>
                  <p className="text-xs text-foreground/70 leading-relaxed line-clamp-8 whitespace-pre-wrap">
                    {resultText}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {nodeData.type === 'output' && !hasResult && (
          <div className="px-3 py-4 flex flex-col items-center justify-center text-center gap-1">
            <div className="w-10 h-10 rounded-xl bg-muted/50 border border-dashed border-border flex items-center justify-center">
              <Play className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Aguardando execução</p>
          </div>
        )}

        {nodeData.error && (
          <div className="px-3 py-2 bg-destructive/5 border-t border-destructive/10">
            <p className="text-[11px] text-destructive line-clamp-2">{nodeData.error}</p>
          </div>
        )}

        {nodeData.isProcessing && (
          <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-[11px] text-muted-foreground">Processando...</p>
          </div>
        )}
      </div>

      {/* Status bar */}
      {hasResult && (
        <div className="px-3 py-1.5 flex items-center justify-between border-t border-border bg-muted/30">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
            <span className="text-[10px] text-muted-foreground">Concluído</span>
          </div>
          {resultImage && (
            <span className="text-[10px] text-muted-foreground/60">Clique p/ expandir</span>
          )}
        </div>
      )}

      {/* Handles */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !rounded-full !border-2 !border-card !-left-1.5"
          style={{ backgroundColor: color }}
        />
      )}
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !rounded-full !border-2 !border-card !-right-1.5"
          style={{ backgroundColor: color }}
        />
      )}
    </div>
  );
});

StudioNodeComponent.displayName = 'StudioNodeComponent';
export default StudioNodeComponent;
