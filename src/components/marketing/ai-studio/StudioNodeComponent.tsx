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

  // Detect result type
  const resultImage = nodeData.result?.imageUrl;
  const resultVideo = nodeData.result?.videoUrl;
  const resultText = typeof nodeData.result === 'string'
    ? nodeData.result
    : nodeData.result?.text;
  const hasResult = !!(resultImage || resultVideo || resultText);
  const isMediaNode = ['imageGen', 'imageEdit', 'videoGen', 'imageAnalyze'].includes(nodeData.type);
  const isOutputNode = nodeData.type === 'output';

  // Determine node width based on content
  const nodeWidth = (resultImage || resultVideo) ? 320 : 260;

  return (
    <div
      className={`
        relative rounded-2xl border shadow-lg transition-all duration-200 overflow-hidden
        ${selected
          ? 'ring-2 ring-offset-1 ring-offset-[#0d0d14] shadow-xl scale-[1.02]'
          : 'hover:shadow-xl'
        }
        ${nodeData.error ? 'border-red-500/50' : 'border-white/[0.08]'}
        ${nodeData.isProcessing ? 'animate-pulse' : ''}
      `}
      style={{
        width: nodeWidth,
        borderColor: nodeData.error ? undefined : (selected ? color : undefined),
        background: '#16162a',
      }}
    >
      {/* Header bar */}
      <div
        className="px-3 py-2.5 flex items-center gap-2.5"
        style={{ backgroundColor: `${color}12` }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
          style={{ backgroundColor: `${color}25` }}
        >
          {meta?.icon || '📦'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate text-white/90">{nodeData.label}</p>
          {!hasResult && (
            <p className="text-[10px] text-white/30 truncate">{meta?.description?.slice(0, 50)}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {nodeData.isProcessing && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
          )}
          {hasResult && (
            <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" title="Processado" />
          )}
          <button className="p-0.5 rounded hover:bg-white/10 transition-colors">
            <MoreHorizontal className="h-3.5 w-3.5 text-white/30" />
          </button>
        </div>
      </div>

      {/* Body / Preview area */}
      <div className="relative">
        {/* Input text preview */}
        {nodeData.type === 'textInput' && (
          <div className="px-3 py-2.5 border-b border-white/[0.04]">
            <p className="text-xs text-white/50 leading-relaxed line-clamp-4">
              {nodeData.config.text || 'Clique para editar o texto...'}
            </p>
          </div>
        )}
        {nodeData.type === 'systemPrompt' && (
          <div className="px-3 py-2.5 border-b border-white/[0.04]">
            <p className="text-xs text-white/50 leading-relaxed line-clamp-4">
              {nodeData.config.systemPrompt || 'Clique para definir instruções...'}
            </p>
          </div>
        )}

        {/* Model info for AI nodes */}
        {!hasResult && nodeData.type === 'llmProcess' && (
          <div className="px-3 py-2 flex items-center gap-2">
            <Type className="h-3 w-3 text-white/20" />
            <span className="text-[10px] text-white/30">{nodeData.config.model || 'Gemini 2.5 Flash'}</span>
          </div>
        )}
        {!hasResult && nodeData.type === 'videoGen' && (
          <div className="px-3 py-2 flex items-center gap-2">
            <Film className="h-3 w-3 text-white/20" />
            <span className="text-[10px] text-white/30">
              {nodeData.config.videoModel || 'Veo 3.1'} • {nodeData.config.duration || 5}s • {nodeData.config.resolution || '1080p'}
            </span>
          </div>
        )}
        {!hasResult && (nodeData.type === 'imageGen' || nodeData.type === 'imageEdit') && (
          <div className="px-3 py-2 flex items-center gap-2">
            <ImageIcon className="h-3 w-3 text-white/20" />
            <span className="text-[10px] text-white/30">
              {nodeData.config.model?.split('/').pop() || 'Gemini Flash Image'}
            </span>
          </div>
        )}
        {!hasResult && nodeData.type === 'musicGen' && (
          <div className="px-3 py-2 flex items-center gap-2">
            <Music className="h-3 w-3 text-white/20" />
            <span className="text-[10px] text-white/30">
              {nodeData.config.musicModel?.split('/').pop() || 'Suno v4'} • {nodeData.config.genre || 'ambient'} • {nodeData.config.duration || 30}s
            </span>
          </div>
        )}

        {/* ===== RESULT DISPLAY (RunwayML-style) ===== */}
        {hasResult && (
          <div className="relative">
            {/* Image result - large inline preview */}
            {resultImage && (
              <div className="relative group">
                <img
                  src={resultImage}
                  alt="Resultado gerado"
                  className="w-full object-cover cursor-pointer transition-all"
                  style={{ maxHeight: imageExpanded ? 500 : 200 }}
                  onClick={() => setImageExpanded(!imageExpanded)}
                />
                {/* Overlay controls */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setImageExpanded(!imageExpanded)}
                    className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors"
                  >
                    <Maximize2 className="h-3 w-3 text-white/80" />
                  </button>
                </div>
                {/* Image label */}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[10px] text-white/70">
                  Imagem Gerada
                </div>
              </div>
            )}

            {/* Video result - inline player */}
            {resultVideo && (
              <div className="relative group">
                <video
                  src={resultVideo}
                  controls
                  className="w-full object-cover"
                  style={{ maxHeight: 220 }}
                />
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[10px] text-white/70">
                  Vídeo Gerado
                </div>
              </div>
            )}

            {/* Text/LLM result */}
            {resultText && !resultImage && !resultVideo && (
              <div className="px-3 py-2.5 bg-white/[0.02]">
                <div className="flex items-start gap-2">
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] mt-0.5 shrink-0"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    {meta?.icon || '📝'}
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed line-clamp-8 whitespace-pre-wrap">
                    {resultText}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Output node - show whatever result came in */}
        {isOutputNode && !hasResult && (
          <div className="px-3 py-4 flex flex-col items-center justify-center text-center gap-1">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-dashed border-white/10 flex items-center justify-center">
              <Play className="h-4 w-4 text-white/20" />
            </div>
            <p className="text-[10px] text-white/25 mt-1">Aguardando execução</p>
          </div>
        )}

        {/* Error display */}
        {nodeData.error && (
          <div className="px-3 py-2 bg-red-500/5 border-t border-red-500/10">
            <p className="text-[11px] text-red-400 line-clamp-2">{nodeData.error}</p>
          </div>
        )}

        {/* Processing overlay */}
        {nodeData.isProcessing && (
          <div className="absolute inset-0 bg-[#16162a]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            <p className="text-[11px] text-white/50">Processando...</p>
          </div>
        )}
      </div>

      {/* Status bar at bottom */}
      {hasResult && (
        <div
          className="px-3 py-1.5 flex items-center justify-between border-t border-white/[0.04]"
          style={{ backgroundColor: `${color}08` }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-[10px] text-white/40">Concluído</span>
          </div>
          {resultImage && (
            <span className="text-[10px] text-white/25">Clique p/ expandir</span>
          )}
        </div>
      )}

      {/* Handles - styled like RunwayML */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !rounded-full !border-2 !border-[#16162a] !-left-1.5"
          style={{ backgroundColor: color }}
        />
      )}
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !rounded-full !border-2 !border-[#16162a] !-right-1.5"
          style={{ backgroundColor: color }}
        />
      )}
    </div>
  );
});

StudioNodeComponent.displayName = 'StudioNodeComponent';
export default StudioNodeComponent;
