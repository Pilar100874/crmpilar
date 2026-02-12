import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Handle, Position, NodeProps, useUpdateNodeInternals } from '@xyflow/react';
import { StudioNodeData, getNodeMeta } from './types';
import { useNodeResult } from './useNodeResults';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { 
  Loader2, Play, Maximize2, Image as ImageIcon, Film, Music, Type, 
  MoreHorizontal, GripVertical, Mic, Wand2, FileText, Clapperboard,
  Search, LinkIcon, Headphones, ScanEye, PauseCircle, Upload, Download,
  DollarSign, Volume2, Edit3, Package
} from 'lucide-react';

const nodeIconMap: Record<string, React.ElementType> = {
  textInput: FileText,
  systemPrompt: Clapperboard,
  imageInput: Upload,
  productImageSelect: Package,
  llmProcess: Type,
  imageGen: ImageIcon,
  imageEdit: Wand2,
  productComposite: Wand2,
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
  imageInput: 'from-orange-500/20 to-amber-500/20',
  productImageSelect: 'from-emerald-500/20 to-teal-500/20',
  llmProcess: 'from-sky-500/20 to-cyan-500/20',
  imageGen: 'from-rose-500/20 to-pink-500/20',
  imageEdit: 'from-pink-500/20 to-fuchsia-500/20',
  productComposite: 'from-violet-500/20 to-purple-500/20',
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
  imageInput: 'text-orange-400',
  productImageSelect: 'text-emerald-400',
  llmProcess: 'text-sky-400',
  imageGen: 'text-rose-400',
  imageEdit: 'text-pink-400',
  productComposite: 'text-violet-400',
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
  imageInput: '#f97316',
  productImageSelect: '#10b981',
  llmProcess: '#0ea5e9',
  imageGen: '#f43f5e',
  imageEdit: '#ec4899',
  productComposite: '#8b5cf6',
  videoGen: '#f59e0b',
  audioGen: '#22c55e',
  musicGen: '#14b8a6',
  lipSync: '#06b6d4',
  videoMerge: '#eab308',
  imageAnalyze: '#14b8a6',
  output: '#64748b',
};
// Blocks that REQUIRE paid external APIs (no free alternative)
const PAID_ONLY_BLOCKS: Set<string> = new Set(['musicGen', 'lipSync', 'videoMerge']);

// Helper: dispatch config update via custom event (avoids prop drilling through ReactFlow)
const dispatchConfigUpdate = (nodeId: string, config: Record<string, any>) => {
  window.dispatchEvent(new CustomEvent('studio-node-config-update', { detail: { nodeId, config } }));
};

// Inline product image selector component
const ProductImageSelectInline: React.FC<{ config: Record<string, any>; onUpdate: (key: string, value: any) => void }> = ({ config, onUpdate }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);

  const fetchProducts = useCallback(async () => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) return;
    setLoading(true);
    const { data } = await supabase
      .from('produtos')
      .select('id, nome, codigo, foto_url, foto_url_2, foto_url_3')
      .eq('estabelecimento_id', estabId)
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .limit(200);
    setProducts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (showList && products.length === 0) fetchProducts();
  }, [showList, fetchProducts, products.length]);

  const filtered = products.filter(p => 
    p.nome?.toLowerCase().includes(search.toLowerCase()) || 
    p.codigo?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedProduct = config.productName;
  const selectedImage = config.selectedImageUrl;

  if (selectedImage) {
    return (
      <div className="px-3 pb-3 pt-1">
        <div className="rounded-xl overflow-hidden border border-border/50 relative group">
          <img src={selectedImage} alt={selectedProduct || 'Produto'} className="w-full h-40 object-contain bg-muted/30" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={(e) => { e.stopPropagation(); onUpdate('selectedImageUrl', ''); onUpdate('productId', ''); onUpdate('productName', ''); setShowList(true); }}
              className="px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white text-xs font-medium hover:bg-white/30 transition-colors"
            >
              Trocar produto
            </button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 truncate">📦 {selectedProduct}</p>
      </div>
    );
  }

  return (
    <div className="px-3 pb-3 pt-1">
      {!showList ? (
        <button
          onClick={(e) => { e.stopPropagation(); setShowList(true); }}
          className="w-full flex flex-col items-center gap-1.5 py-4 border border-dashed border-emerald-500/30 rounded-xl cursor-pointer hover:bg-emerald-500/5 transition-colors"
        >
          <Package className="h-5 w-5 text-emerald-500/40" />
          <p className="text-[10px] text-muted-foreground">Clique para selecionar um produto</p>
        </button>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Buscar produto..."
              className="w-full h-7 pl-7 pr-2 text-[11px] rounded-lg bg-muted/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto space-y-1 rounded-lg">
            {loading && <p className="text-[10px] text-muted-foreground text-center py-3">Carregando...</p>}
            {!loading && filtered.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-3">Nenhum produto com imagem</p>}
            {filtered.filter(p => p.foto_url).map((p) => (
              <button
                key={p.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate('productId', p.id);
                  onUpdate('selectedImageUrl', p.foto_url);
                  onUpdate('productName', p.nome);
                  setShowList(false);
                }}
                className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors text-left"
              >
                <img src={p.foto_url} alt={p.nome} className="w-8 h-8 rounded-md object-cover border border-border/50 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium truncate text-foreground">{p.nome}</p>
                  {p.codigo && <p className="text-[9px] text-muted-foreground truncate">{p.codigo}</p>}
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowList(false); }}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full text-center py-1"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
};

const StudioNodeComponent: React.FC<NodeProps> = ({ data, selected, id }) => {
  const nodeData = data as unknown as StudioNodeData;
  const meta = getNodeMeta(nodeData.type);
  const accent = nodeAccentMap[nodeData.type] || '#64748b';
  const [imageExpanded, setImageExpanded] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const IconComponent = nodeIconMap[nodeData.type] || Play;
  const gradient = nodeGradientMap[nodeData.type] || 'from-slate-500/20 to-zinc-500/20';
  const iconColor = nodeIconColorMap[nodeData.type] || 'text-slate-400';
  const isPaused = !!nodeData.config?._paused;
  const isPaidBlock = PAID_ONLY_BLOCKS.has(nodeData.type);
  const updateNodeInternals = useUpdateNodeInternals();

  const hasInput = !['textInput', 'systemPrompt', 'imageInput', 'productImageSelect'].includes(nodeData.type);
  const hasOutput = nodeData.type !== 'output';

  // Use external store for results (bypasses ReactFlow's shallow diff)
  const { result: storeResult, isProcessing: storeProcessing, error: storeError } = useNodeResult(id);
  
  // Keep a persistent ref so the result survives ReactFlow re-renders
  const persistedResult = useRef<any>(null);
  if (storeResult !== undefined && storeResult !== null) {
    persistedResult.current = storeResult;
  }
  
  const activeResult = storeResult ?? persistedResult.current ?? nodeData.result;
  const activeProcessing = storeProcessing || nodeData.isProcessing;
  const activeError = storeError || nodeData.error;

  const resultFrames: string[] | undefined = activeResult?._animFrames;
  const resultFps: number = activeResult?._fps || 2;
  const resultGif: string | undefined = activeResult?._gifUrl;
  const resultImage = resultFrames ? undefined : activeResult?.imageUrl;
  const resultVideo = activeResult?.videoUrl;
  const resultAudio = activeResult?.audioUrl;
  const resultText = typeof activeResult === 'string'
    ? activeResult
    : activeResult?.text;
  const hasResult = !!(resultImage || resultVideo || resultAudio || resultText || resultFrames);

  // Stabilize frames reference to avoid flickering re-renders
  const stableFramesRef = useRef<string[]>([]);
  const stableFramesLengthRef = useRef(0);
  if (resultFrames && resultFrames.length !== stableFramesLengthRef.current) {
    stableFramesRef.current = resultFrames;
    stableFramesLengthRef.current = resultFrames.length;
  }
  const stableFrames = resultFrames ? stableFramesRef.current : undefined;
  const frameCount = stableFrames?.length || 0;

  // Animated frames playback
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (frameCount > 1 && isPlaying) {
      frameIntervalRef.current = setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % frameCount);
      }, 1000 / resultFps);
      return () => { if (frameIntervalRef.current) clearInterval(frameIntervalRef.current); };
    }
    return () => { if (frameIntervalRef.current) clearInterval(frameIntervalRef.current); };
  }, [frameCount, resultFps, isPlaying]);

  // Force ReactFlow to re-measure node dimensions when result changes
  useEffect(() => {
    if (hasResult || activeProcessing) {
      const t1 = setTimeout(() => updateNodeInternals(id), 50);
      const t2 = setTimeout(() => updateNodeInternals(id), 200);
      const t3 = setTimeout(() => updateNodeInternals(id), 500);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [hasResult, activeProcessing, resultImage, resultVideo, resultAudio, resultText, id, updateNodeInternals]);

  const nodeWidth = (resultImage || resultVideo || resultAudio || (nodeData.type === 'imageInput' && nodeData.config?.images?.length > 0) || (nodeData.type === 'productImageSelect' && nodeData.config?.selectedImageUrl)) ? 340 : 280;

  // Inline edit handler
  const handleInlineUpdate = useCallback((key: string, value: any) => {
    dispatchConfigUpdate(id, { [key]: value });
  }, [id]);

  return (
    <>
    <div
      className={`
        relative rounded-2xl transition-all duration-300 overflow-visible
        ${selected ? 'scale-[1.02]' : 'hover:scale-[1.01]'}
        ${nodeData.error ? 'ring-2 ring-destructive/40' : ''}
        ${isPaused ? 'opacity-50 grayscale' : ''}
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
      {/* Paused badge */}
      {isPaused && (
        <div className="absolute -top-2.5 right-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold shadow-md">
          <PauseCircle className="h-3 w-3" />
          PAUSADO
        </div>
      )}
      {isPaidBlock && (
        <div className="absolute -top-2.5 left-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[9px] font-bold shadow-md" title="Este bloco requer API paga externa">
          <DollarSign className="h-3 w-3" />
          API PAGA
        </div>
      )}
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
          {activeProcessing && (
            <div className="relative">
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: `${accent}30` }} />
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: accent }} />
            </div>
          )}
          {hasResult && !activeProcessing && (
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-50" />
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="relative">
        {/* Inline editable text input */}
        {nodeData.type === 'textInput' && (
          <div className="px-3.5 py-2.5">
            {isEditing ? (
              <textarea
                autoFocus
                value={nodeData.config.text || ''}
                onChange={(e) => handleInlineUpdate('text', e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => { if (e.key === 'Escape') setIsEditing(false); }}
                className="w-full text-xs text-foreground leading-relaxed whitespace-pre-wrap font-mono bg-muted/50 border border-border rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 min-h-[80px] max-h-[200px]"
                placeholder="Escreva seu prompt aqui..."
              />
            ) : (
              <div
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                className="cursor-text hover:bg-muted/30 rounded-lg p-1.5 -m-1.5 transition-colors group/edit"
              >
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-5 whitespace-pre-wrap font-mono">
                  {nodeData.config.text || <span className="italic opacity-50">Clique para editar o texto...</span>}
                </p>
                <Edit3 className="h-3 w-3 text-muted-foreground/30 group-hover/edit:text-muted-foreground/60 transition-colors mt-1" />
              </div>
            )}
          </div>
        )}
        {nodeData.type === 'systemPrompt' && (
          <div className="px-3.5 py-2.5">
            {isEditing ? (
              <textarea
                autoFocus
                value={nodeData.config.systemPrompt || ''}
                onChange={(e) => handleInlineUpdate('systemPrompt', e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => { if (e.key === 'Escape') setIsEditing(false); }}
                className="w-full text-xs text-foreground leading-relaxed whitespace-pre-wrap font-mono bg-muted/50 border border-border rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 min-h-[80px] max-h-[200px]"
                placeholder="Defina instruções do sistema..."
              />
            ) : (
              <div
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                className="cursor-text hover:bg-muted/30 rounded-lg p-1.5 -m-1.5 transition-colors group/edit"
              >
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-5 whitespace-pre-wrap font-mono">
                  {nodeData.config.systemPrompt || <span className="italic opacity-50">Clique para definir instruções...</span>}
                </p>
                <Edit3 className="h-3 w-3 text-muted-foreground/30 group-hover/edit:text-muted-foreground/60 transition-colors mt-1" />
              </div>
            )}
          </div>
        )}
        {/* Image input with inline upload */}
        {nodeData.type === 'imageInput' && (
          <div className="px-3 pb-3 pt-1">
            {(nodeData.config.images?.length > 0) ? (
              <div className="grid grid-cols-2 gap-1.5">
                {nodeData.config.images.slice(0, 4).map((img: string, idx: number) => (
                  <div key={idx} className="rounded-lg overflow-hidden border border-border/50 aspect-square relative group/img">
                    <img src={img} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInlineUpdate('images', nodeData.config.images.filter((_: any, i: number) => i !== idx));
                      }}
                      className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity text-[8px]"
                    >✕</button>
                  </div>
                ))}
                {nodeData.config.images.length > 4 && (
                  <div className="rounded-lg border border-border/50 aspect-square flex items-center justify-center bg-muted/50">
                    <span className="text-xs text-muted-foreground font-medium">+{nodeData.config.images.length - 4}</span>
                  </div>
                )}
              </div>
            ) : null}
            <label className="flex flex-col items-center gap-1.5 py-3 border border-dashed border-border/50 rounded-xl cursor-pointer hover:bg-muted/30 transition-colors mt-1.5">
              <Upload className="h-5 w-5 text-muted-foreground/40" />
              <p className="text-[10px] text-muted-foreground">Clique ou arraste imagens</p>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach((file) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const base64 = reader.result as string;
                      handleInlineUpdate('images', [...(nodeData.config.images || []), base64]);
                    };
                    reader.readAsDataURL(file);
                  });
                  e.target.value = '';
                }}
              />
            </label>
            {nodeData.config.images?.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1.5">{nodeData.config.images.length} imagem(ns) de referência</p>
            )}
          </div>
        )}

        {/* Product image select inline display */}
        {nodeData.type === 'productImageSelect' && (
          <ProductImageSelectInline config={nodeData.config} onUpdate={handleInlineUpdate} />
        )}

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
            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
              (nodeData.config.videoModel || 'free/gif-animated') === 'free/gif-animated'
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              <Film className="h-2.5 w-2.5" />
              {(nodeData.config.videoModel || 'free/gif-animated') === 'free/gif-animated' ? 'GIF Animado' : (nodeData.config.videoModel || '').split('/').pop()}
            </span>
            {(nodeData.config.videoModel || 'free/gif-animated') === 'free/gif-animated' ? (
              <>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.frameCount || 4} frames</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.fps || 2} fps</span>
              </>
            ) : (
              <>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.duration || 5}s</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.resolution || '1080p'}</span>
              </>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{nodeData.config.aspectRatio || '16:9'}</span>
          </div>
        )}
        {!hasResult && (nodeData.type === 'imageGen' || nodeData.type === 'imageEdit' || nodeData.type === 'productComposite') && (
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
            {/* Animated frames player */}
            {stableFrames && stableFrames.length > 0 && (
              <div className="relative group px-3 pb-3 pt-1">
                <div
                  className="rounded-xl overflow-hidden border border-border/50 cursor-pointer relative"
                  style={{
                    boxShadow: `0 4px 20px -4px ${accent}20`,
                    height: imageExpanded ? 400 : 200,
                    width: '100%',
                    backgroundImage: `url(${stableFrames[currentFrame % stableFrames.length]})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    backgroundColor: 'hsl(var(--muted))',
                  }}
                  onClick={() => setImageExpanded(!imageExpanded)}
                >
                  {/* Frame counter */}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono">
                    {(currentFrame % stableFrames.length) + 1}/{stableFrames.length}
                    {activeResult?._totalFrames && stableFrames.length < activeResult._totalFrames && (
                      <span className="text-amber-300 ml-1">({activeResult._totalFrames} total)</span>
                    )}
                  </div>
                  {/* Play/Pause */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
                    className="absolute bottom-2 right-2 p-1.5 rounded-md bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors"
                  >
                    {isPlaying ? (
                      <PauseCircle className="h-3.5 w-3.5 text-white" />
                    ) : (
                      <Play className="h-3.5 w-3.5 text-white" />
                    )}
                  </button>
                </div>
                {/* Frame dots (max 20 shown) */}
                {stableFrames.length <= 20 && (
                  <div className="flex justify-center gap-1 mt-1.5">
                    {stableFrames.map((_: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => { setCurrentFrame(idx); setIsPlaying(false); }}
                        className={`w-2 h-2 rounded-full transition-all ${idx === currentFrame ? 'scale-125' : 'opacity-50'}`}
                        style={{ backgroundColor: idx === currentFrame ? accent : 'hsl(var(--muted-foreground))' }}
                      />
                    ))}
                  </div>
                )}
                {stableFrames.length > 20 && (
                  <div className="flex items-center gap-2 mt-1.5 px-1">
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${((currentFrame % stableFrames.length) / stableFrames.length) * 100}%`, backgroundColor: accent }} />
                    </div>
                    <span className="text-[9px] text-muted-foreground font-mono">{stableFrames.length}f</span>
                  </div>
                )}
                <div className="absolute top-3 right-5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {resultGif && (
                     <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        try {
                          const base64 = resultGif.split(',')[1];
                          if (!base64) { console.error('GIF data missing'); return; }
                          const byteChars = atob(base64);
                          const byteArray = new Uint8Array(byteChars.length);
                          for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
                          const blob = new Blob([byteArray], { type: 'image/gif' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `studio-animation-${id}.gif`;
                          link.style.display = 'none';
                          document.body.appendChild(link);
                          setTimeout(() => {
                            link.click();
                            setTimeout(() => {
                              document.body.removeChild(link);
                              URL.revokeObjectURL(url);
                            }, 200);
                          }, 0);
                        } catch (err) {
                          console.error('Download GIF error:', err);
                        }
                      }}
                      className="px-2 py-1.5 rounded-lg bg-emerald-600/80 backdrop-blur-sm hover:bg-emerald-600 transition-colors flex items-center gap-1"
                      title="Download GIF animado"
                    >
                      <Download className="h-3 w-3 text-white" />
                      <span className="text-[10px] text-white font-medium">GIF</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      stableFrames.forEach((frame: string, idx: number) => {
                        const link = document.createElement('a');
                        link.href = frame;
                        link.download = `studio-video-${id}-frame${idx + 1}.png`;
                        link.click();
                      });
                    }}
                    className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors"
                    title="Download todos os frames"
                  >
                    <Download className="h-3 w-3 text-white" />
                  </button>
                  <button
                    onClick={() => setImageExpanded(!imageExpanded)}
                    className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors"
                  >
                    <Maximize2 className="h-3 w-3 text-white" />
                  </button>
                </div>
              </div>
            )}

           {resultImage && (
              <div className="relative group px-3 pb-3 pt-1">
                <div 
                  className="rounded-xl overflow-hidden border border-border/50 cursor-pointer"
                  style={{ 
                    boxShadow: `0 4px 20px -4px ${accent}20`,
                    height: imageExpanded ? 400 : 200,
                    width: '100%',
                    backgroundColor: 'hsl(var(--muted))',
                  }}
                  onClick={() => setImageExpanded(!imageExpanded)}
                >
                  <img 
                    src={resultImage} 
                    alt="Generated" 
                    className="w-full h-full object-contain"
                    loading="eager"
                  />
                </div>
                <div className="absolute top-3 right-5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={resultImage}
                    download={`studio-${nodeData.type}-${id}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors cursor-pointer"
                    title="Download / Abrir imagem"
                  >
                    <Download className="h-3 w-3 text-white" />
                  </a>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setImagePreviewOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors"
                  >
                    <Maximize2 className="h-3 w-3 text-white" />
                  </button>
                </div>
              </div>
            )}

            {resultVideo && (
              <div className="relative group px-3 pb-3 pt-1">
                <div 
                  className="rounded-xl overflow-hidden border border-border/50"
                  style={{ boxShadow: `0 4px 20px -4px ${accent}20` }}
                >
                  <video
                    src={resultVideo}
                    controls
                    className="w-full object-cover"
                    style={{ maxHeight: imageExpanded ? 400 : 200 }}
                  />
                </div>
                <div className="absolute top-3 right-5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const link = document.createElement('a');
                      link.href = resultVideo;
                      link.download = `studio-${nodeData.type}-${id}.mp4`;
                      link.click();
                    }}
                    className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors"
                    title="Download"
                  >
                    <Download className="h-3 w-3 text-white" />
                  </button>
                  <button
                    onClick={() => setImageExpanded(!imageExpanded)}
                    className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors"
                    title={imageExpanded ? 'Reduzir' : 'Expandir'}
                  >
                    <Maximize2 className="h-3 w-3 text-white" />
                  </button>
                </div>
              </div>
            )}

            {resultAudio && (
              <div className="px-3 pb-3 pt-1 space-y-2">
                <audio controls src={resultAudio} className="w-full h-10 rounded-lg" />
                <div className="flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const link = document.createElement('a');
                      link.href = resultAudio;
                      link.download = `studio-${nodeData.type}-${id}.mp3`;
                      link.click();
                    }}
                    className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    title="Download áudio"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Web Speech API playback button */}
            {activeResult?._webSpeechText && !resultAudio && (
              <div className="px-3 pb-2 pt-1 space-y-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if ('speechSynthesis' in window) {
                      speechSynthesis.cancel();
                      const utt = new SpeechSynthesisUtterance(activeResult._webSpeechText);
                      utt.lang = activeResult._webSpeechLang || 'pt-BR';
                      utt.rate = activeResult._webSpeechRate || 1.0;
                      utt.pitch = activeResult._webSpeechPitch || 1.0;
                      const voices = speechSynthesis.getVoices();
                      const ptVoice = voices.find((v: SpeechSynthesisVoice) => v.lang.startsWith('pt')) || voices[0];
                      if (ptVoice) utt.voice = ptVoice;
                      speechSynthesis.speak(utt);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                >
                  <Volume2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-500">Reproduzir (Gratuito)</span>
                </button>
              </div>
            )}

            {resultText && !resultImage && !resultVideo && !resultAudio && (
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
        {activeError && (
          <div className="mx-3 mb-3 px-3 py-2 bg-destructive/5 rounded-lg border border-destructive/10">
            <p className="text-[11px] text-destructive line-clamp-2">{activeError}</p>
          </div>
        )}

        {/* Processing overlay */}
        {activeProcessing && (
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

    {resultImage && (
      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
          <img 
            src={resultImage} 
            alt="Preview" 
            className="w-full h-full object-contain max-h-[85vh] rounded-lg"
          />
        </DialogContent>
      </Dialog>
    )}
    </>
  );
};

StudioNodeComponent.displayName = 'StudioNodeComponent';
export default StudioNodeComponent;
