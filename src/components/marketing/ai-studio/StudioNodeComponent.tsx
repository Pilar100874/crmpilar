import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { StudioNodeData, getNodeMeta } from './types';
import { 
  Loader2, Play, Maximize2, Image as ImageIcon, Film, Music, Type, 
  MoreHorizontal, GripVertical, Mic, Wand2, FileText, Clapperboard,
  Search, LinkIcon, Headphones, ScanEye
} from 'lucide-react';

const nodeIconMap: Record<string, React.ElementType> = {
  textInput: FileText,
  systemPrompt: Clapperboard,
  llmProcess: Type,
  imageGen: ImageIcon,
  imageEdit: Wand2,
  videoGen: Film,
  audioGen: Mic,
  musicGen: Music,
  lipSync: Headphones,
  videoMerge: LinkIcon,
  imageAnalyze: ScanEye,
  output: Play,
};

const nodeGradientMap: Record<string, string> = {
  textInput: 'from-indigo-500/20 to-violet-500/20',
  systemPrompt: 'from-purple-500/20 to-fuchsia-500/20',
  llmProcess: 'from-sky-500/20 to-cyan-500/20',
  imageGen: 'from-rose-500/20 to-pink-500/20',
  imageEdit: 'from-pink-500/20 to-fuchsia-500/20',
  videoGen: 'from-amber-500/20 to-orange-500/20',
  audioGen: 'from-emerald-500/20 to-green-500/20',
  musicGen: 'from-teal-500/20 to-emerald-500/20',
  lipSync: 'from-cyan-500/20 to-sky-500/20',
  videoMerge: 'from-yellow-500/20 to-amber-500/20',
  imageAnalyze: 'from-teal-500/20 to-cyan-500/20',
  output: 'from-slate-500/20 to-zinc-500/20',
};

const nodeIconColorMap: Record<string, string> = {
  textInput: 'text-indigo-400',
  systemPrompt: 'text-purple-400',
  llmProcess: 'text-sky-400',
  imageGen: 'text-rose-400',
  imageEdit: 'text-pink-400',
  videoGen: 'text-amber-400',
  audioGen: 'text-emerald-400',
  musicGen: 'text-teal-400',
  lipSync: 'text-cyan-400',
  videoMerge: 'text-yellow-400',
  imageAnalyze: 'text-teal-400',
  output: 'text-slate-400',
};

const nodeAccentMap: Record<string, string> = {
  textInput: '#6366f1',
  systemPrompt: '#a855f7',
  llmProcess: '#0ea5e9',
  imageGen: '#f43f5e',
  imageEdit: '#ec4899',
  videoGen: '#f59e0b',
  audioGen: '#22c55e',
  musicGen: '#14b8a6',
  lipSync: '#06b6d4',
  videoMerge: '#eab308',
  imageAnalyze: '#14b8a6',
  output: '#64748b',
};

const StudioNodeComponent: React.FC<NodeProps> = memo(({ data, selected }) => {
  const nodeData = data as unknown as StudioNodeData;
  const meta = getNodeMeta(nodeData.type);
  const accent = nodeAccentMap[nodeData.type] || '#64748b';
  const [imageExpanded, setImageExpanded] = useState(false);
  const IconComponent = nodeIconMap[nodeData.type] || Play;
  const gradient = nodeGradientMap[nodeData.type] || 'from-slate-500/20 to-zinc-500/20';
  const iconColor = nodeIconColorMap[nodeData.type] || 'text-slate-400';

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
        relative rounded-2xl transition-all duration-300 overflow-visible
        ${selected ? 'scale-[1.02]' : 'hover:scale-[1.01]'}
        ${nodeData.error ? 'ring-2 ring-destructive/40' : ''}
        ${nodeData.isProcessing ? '' : ''}
      `}
      style={{
        width: nodeWidth,
        background: 'hsl(var(--card))',
        border: selected ? `2px solid ${accent}` : '1px solid hsl(var(--border))',
        borderRadius: 16,
        boxShadow: selected
          ? `0 0 0 1px ${accent}20, 0 8px 32px -8px ${accent}30, 0 4px 16px -4px rgba(0,0,0,0.1)`
          : '0 2px 12px -4px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Cinematic Header with gradient */}
      <div className={`px-3.5 py-2.5 flex items-center gap-2.5 bg-gradient-to-r ${gradient} rounded-t-2xl border-b border-border/50`}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: `linear-gradient(135deg, ${accent}30, ${accent}15)`,
            border: `1px solid ${accent}30`,
            boxShadow: `0 0 12px ${accent}15`,
          }}
        >
          <IconComponent className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-foreground">{nodeData.label}</p>
          <p className="text-[10px] text-muted-foreground truncate">{meta?.description || ''}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {nodeData.isProcessing && (
            <div className="relative">
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: `${accent}30` }} />
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: accent }} />
            </div>
          )}
          {hasResult && !nodeData.isProcessing && (
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-50" />
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="relative">
        {/* Text input preview */}
        {nodeData.type === 'textInput' && (
          <div className="px-3.5 py-2.5">
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-5 whitespace-pre-wrap font-mono">
              {nodeData.config.text || 'Clique para editar o texto...'}
            </p>
          </div>
        )}
        {nodeData.type === 'systemPrompt' && (
          <div className="px-3.5 py-2.5">
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-5 whitespace-pre-wrap font-mono">
              {nodeData.config.systemPrompt || 'Clique para definir instruções...'}
            </p>
          </div>
        )}

        {/* Model info badges */}
        {!hasResult && nodeData.type === 'llmProcess' && (
          <div className="px-3.5 py-2.5 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
              <Type className="h-2.5 w-2.5" />
              {(nodeData.config.model || 'gemini-2.5-flash').split('/').pop()}
            </span>
            <span className="text-[10px] text-muted-foreground/60">T:{nodeData.config.temperature ?? 0.7}</span>
          </div>
        )}
        {!hasResult && nodeData.type === 'videoGen' && (
          <div className="px-3.5 py-2.5 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              <Film className="h-2.5 w-2.5" />
              {(nodeData.config.videoModel || 'veo-3.1').split('/').pop()}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.duration || 5}s</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.resolution || '1080p'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.aspectRatio || '16:9'}</span>
          </div>
        )}
        {!hasResult && (nodeData.type === 'imageGen' || nodeData.type === 'imageEdit') && (
          <div className="px-3.5 py-2.5 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
              <ImageIcon className="h-2.5 w-2.5" />
              {(nodeData.config.model || 'gemini-flash-image').split('/').pop()}
            </span>
            {nodeData.config.imageStyle && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.imageStyle}</span>
            )}
            {nodeData.config.imageSize && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.imageSize}</span>
            )}
          </div>
        )}
        {!hasResult && nodeData.type === 'musicGen' && (
          <div className="px-3.5 py-2.5 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">
              <Music className="h-2.5 w-2.5" />
              {(nodeData.config.musicModel || 'suno-v4').split('/').pop()}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.genre || 'ambient'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.duration || 30}s</span>
          </div>
        )}
        {!hasResult && nodeData.type === 'audioGen' && (
          <div className="px-3.5 py-2.5 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              <Mic className="h-2.5 w-2.5" />
              {(nodeData.config.audioModel || 'elevenlabs-v3').split('/').pop()}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.type || 'sfx'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.duration || 5}s</span>
          </div>
        )}

        {/* Result display */}
        {hasResult && (
          <div className="relative">
            {resultImage && (
              <div className="relative group px-3 pb-3 pt-1">
                <div className="rounded-xl overflow-hidden border border-border/50" style={{ boxShadow: `0 4px 20px -4px ${accent}20` }}>
                  <img
                    src={resultImage}
                    alt="Resultado gerado"
                    className="w-full object-cover cursor-pointer transition-all"
                    style={{ maxHeight: imageExpanded ? 500 : 180 }}
                    onClick={() => setImageExpanded(!imageExpanded)}
                  />
                </div>
                <div className="absolute top-3 right-5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setImageExpanded(!imageExpanded)}
                    className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors"
                  >
                    <Maximize2 className="h-3 w-3 text-white" />
                  </button>
                </div>
              </div>
            )}

            {resultVideo && (
              <div className="relative group px-3 pb-3 pt-1">
                <div className="rounded-xl overflow-hidden border border-border/50" style={{ boxShadow: `0 4px 20px -4px ${accent}20` }}>
                  <video
                    src={resultVideo}
                    controls
                    className="w-full object-cover"
                    style={{ maxHeight: 200 }}
                  />
                </div>
              </div>
            )}

            {resultText && !resultImage && !resultVideo && (
              <div className="px-3.5 py-2.5">
                <p className="text-xs text-foreground/70 leading-relaxed line-clamp-6 whitespace-pre-wrap">
                  {resultText}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Output node empty */}
        {nodeData.type === 'output' && !hasResult && (
          <div className="px-3.5 py-4 flex flex-col items-center justify-center text-center gap-2">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${accent}15, ${accent}05)`,
                border: `1px dashed ${accent}30`,
              }}
            >
              <Play className="h-5 w-5 text-muted-foreground/40" />
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
            <div className="relative">
              <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: accent, width: 32, height: 32, margin: 'auto' }} />
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: accent }} />
            </div>
            <p className="text-[11px] font-medium text-muted-foreground">Processando...</p>
          </div>
        )}
      </div>

      {/* Handles - cinematic glow style */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3.5 !h-3.5 !rounded-full !border-[2px] !-left-[7px]"
          style={{
            backgroundColor: accent,
            borderColor: 'hsl(var(--card))',
            boxShadow: `0 0 8px ${accent}50`,
          }}
        />
      )}
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3.5 !h-3.5 !rounded-full !border-[2px] !-right-[7px]"
          style={{
            backgroundColor: accent,
            borderColor: 'hsl(var(--card))',
            boxShadow: `0 0 8px ${accent}50`,
          }}
        />
      )}
    </div>
  );
});

StudioNodeComponent.displayName = 'StudioNodeComponent';
export default StudioNodeComponent;
