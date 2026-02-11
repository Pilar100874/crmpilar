import React, { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Panel,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Play, Trash2, Clapperboard, Film, Image, Music, Mic, Type, Wand2, Sparkles, Video, ChevronRight, Settings2, SkipForward, Bot, Maximize, Minimize, Coins, Copy, Pause, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { StudioNode, StudioEdge, StudioNodeData, NODE_CATEGORIES, getNodeMeta } from './types';
import StudioNodeComponent from './StudioNodeComponent';
import StudioNodeLibrary from './StudioNodeLibrary';
import StudioNodeConfigPanel from './StudioNodeConfigPanel';
import { useStudioExecution } from './useStudioExecution';
import PresetsGallery, { Preset } from './PresetsGallery';
import AISettingsPanel from './AISettingsPanel';
import CreativeAgentPanel, { StoryboardScene } from './CreativeAgentPanel';
import StudioCreditsPanel from './StudioCreditsPanel';
import ExecutionLogPanel from './ExecutionLogPanel';

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
}

const nodeTypes = {
  studioNode: StudioNodeComponent,
};

const initialNodes: StudioNode[] = [];
const initialEdges: StudioEdge[] = [];

const EDGE_STYLE = { stroke: '#22c55e', strokeWidth: 2 };

const QUICK_TOOLS = [
  { id: 'text-to-video', icon: Video, label: 'Texto p/ Vídeo', desc: 'Gere vídeos a partir de prompts', nodeType: 'videoGen' as const },
  { id: 'image-to-video', icon: Film, label: 'Imagem p/ Vídeo', desc: 'Anime imagens em vídeos', nodeType: 'videoGen' as const },
  { id: 'image-gen', icon: Image, label: 'Gerar Imagem', desc: 'Crie imagens com IA', nodeType: 'imageGen' as const },
  { id: 'music-gen', icon: Music, label: 'Criar Música', desc: 'Compose músicas originais', nodeType: 'musicGen' as const },
  { id: 'audio-gen', icon: Mic, label: 'Gerar Áudio', desc: 'Narração e efeitos sonoros', nodeType: 'audioGen' as const },
  { id: 'text-gen', icon: Type, label: 'Texto com IA', desc: 'Processar com LLM', nodeType: 'llmProcess' as const },
  { id: 'edit-image', icon: Wand2, label: 'Editar Imagem', desc: 'Edite com instruções', nodeType: 'imageEdit' as const },
  { id: 'lip-sync', icon: Sparkles, label: 'Lip Sync', desc: 'Sincronismo labial', nodeType: 'lipSync' as const },
];

const AICreativeStudioInner: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<StudioNode | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreativeAgent, setShowCreativeAgent] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const { executeWorkflow, isExecuting, executionLog, currentNodeId, clearLog } = useStudioExecution();

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, animated: true, style: EDGE_STYLE, type: 'smoothstep' }, eds));
  }, [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/studioNodeType');
    if (!type) return;
    const meta = getNodeMeta(type as any);
    if (!meta) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const newNode: StudioNode = {
      id: `${type}_${Date.now()}`,
      type: 'studioNode',
      position,
      data: { label: meta.label, type: type as any, config: { ...meta.defaultConfig } },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [screenToFlowPosition, setNodes]);

  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedNode(node as StudioNode);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setContextMenu(null);
  }, []);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: any) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
    setSelectedNode(node as StudioNode);
  }, []);

  const duplicateNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const nd = node.data as StudioNodeData;
    const newNode: StudioNode = {
      id: `${nd.type}_${Date.now()}`,
      type: 'studioNode',
      position: { x: (node.position?.x ?? 0) + 50, y: (node.position?.y ?? 0) + 80 },
      data: { ...nd, config: { ...nd.config }, result: undefined, error: undefined, isProcessing: false },
    };
    setNodes((nds) => [...nds, newNode as any]);
    setContextMenu(null);
    toast.success('Bloco duplicado!');
  }, [nodes, setNodes]);

  const togglePauseNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === nodeId) {
        const d = n.data as StudioNodeData;
        const paused = !d.config?._paused;
        return { ...n, data: { ...d, config: { ...d.config, _paused: paused } } };
      }
      return n;
    }));
    setContextMenu(null);
    toast.info('Estado do bloco alterado');
  }, [setNodes]);

  const updateNodeConfig = useCallback((nodeId: string, config: Record<string, any>) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === nodeId) {
        const d = n.data as StudioNodeData;
        return { ...n, data: { ...d, config: { ...d.config, ...config } } };
      }
      return n;
    }));
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, config: { ...prev.data.config, ...config } } } : null);
    }
  }, [setNodes, selectedNode]);

  const deleteSelected = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes, setEdges]);

  const handleExecute = useCallback(async (startFromNodeId?: string) => {
    try {
      const updatedNodes = await executeWorkflow(
        nodes as StudioNode[],
        edges,
        startFromNodeId,
        (realtimeNodes) => {
          // Use functional update to ensure ReactFlow detects data changes
          setNodes(() => realtimeNodes.map(n => ({ ...n, data: { ...n.data } })) as any);
        }
      );
      // Final update with all results - force new references
      setNodes(() => updatedNodes.map(n => ({ ...n, data: { ...n.data } })) as any);
      toast.success(startFromNodeId ? 'Execução parcial concluída!' : 'Workflow executado com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao executar workflow');
    }
  }, [nodes, edges, executeWorkflow, setNodes]);

  const handleExecuteFromNode = useCallback(() => {
    if (selectedNode) {
      handleExecute(selectedNode.id);
    }
  }, [selectedNode, handleExecute]);

  const handleStoryboardToWorkflow = useCallback((scenes: StoryboardScene[]) => {
    const newNodes: StudioNode[] = [];
    const newEdges: StudioEdge[] = [];
    let x = 100;
    const yBase = 150;

    scenes.forEach((scene, i) => {
      const promptId = `prompt_${Date.now()}_${i}`;
      newNodes.push({
        id: promptId,
        type: 'studioNode',
        position: { x, y: yBase },
        data: {
          label: `📝 ${scene.title}`,
          type: 'textInput',
          config: { text: `${scene.description}\n\nNarração: ${scene.narration}\nCâmera: ${scene.cameraMovement}\nMood: ${scene.mood}` },
        },
      });

      if (scene.mediaType !== 'none') {
        const mediaId = `media_${Date.now()}_${i}`;
        const mediaType = scene.mediaType === 'video' ? 'videoGen' : 'imageGen';
        const meta = getNodeMeta(mediaType);
        newNodes.push({
          id: mediaId,
          type: 'studioNode',
          position: { x: x + 380, y: yBase - 60 },
          data: {
            label: scene.mediaType === 'video' ? `🎬 Vídeo: ${scene.title}` : `🖼️ Imagem: ${scene.title}`,
            type: mediaType,
            config: { ...meta?.defaultConfig, ...(scene.mediaType === 'video' ? { duration: scene.duration } : {}) },
          },
        });
        newEdges.push({ id: `e_${promptId}_${mediaId}`, source: promptId, target: mediaId, animated: true, style: EDGE_STYLE, type: 'smoothstep' });
      }

      if (scene.audioType !== 'none') {
        const audioId = `audio_${Date.now()}_${i}`;
        const audioType = scene.audioType === 'music' ? 'musicGen' : 'audioGen';
        const meta = getNodeMeta(audioType);
        newNodes.push({
          id: audioId,
          type: 'studioNode',
          position: { x: x + 380, y: yBase + 80 },
          data: {
            label: scene.audioType === 'music' ? `🎵 Música: ${scene.title}` :
                   scene.audioType === 'narration' ? `🎙️ Narração: ${scene.title}` :
                   `🔊 SFX: ${scene.title}`,
            type: audioType,
            config: { ...meta?.defaultConfig, duration: scene.duration, ...(scene.audioType === 'narration' ? { type: 'narration' } : {}), ...(scene.audioType === 'sfx' ? { type: 'sfx' } : {}) },
          },
        });
        newEdges.push({ id: `e_${promptId}_${audioId}`, source: promptId, target: audioId, animated: true, style: EDGE_STYLE, type: 'smoothstep' });
      }

      x += 750;
    });

    const outputId = `output_${Date.now()}`;
    newNodes.push({
      id: outputId,
      type: 'studioNode',
      position: { x, y: yBase },
      data: { label: 'Resultado Final', type: 'output', config: { format: 'auto' } },
    });

    setNodes(newNodes as any);
    setEdges(newEdges as any);
    setShowCreativeAgent(false);
    setShowCanvas(true);
  }, [setNodes, setEdges]);

  const clearAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const handlePresetSelect = useCallback((preset: Preset) => {
    const inputNode: StudioNode = {
      id: `textInput_${Date.now()}`,
      type: 'studioNode',
      position: { x: 100, y: 200 },
      data: { label: `Preset: ${preset.name}`, type: 'textInput', config: { text: preset.prompt } },
    };
    const videoNode: StudioNode = {
      id: `videoGen_${Date.now()}`,
      type: 'studioNode',
      position: { x: 500, y: 200 },
      data: { label: 'Gerar Vídeo', type: 'videoGen', config: { duration: 5, resolution: '1080p', aspectRatio: '16:9', videoModel: 'google/veo-3.1' } },
    };
    setNodes((nds) => [...nds, inputNode, videoNode]);
    setEdges((eds) => [
      ...eds,
      { id: `e_${inputNode.id}_${videoNode.id}`, source: inputNode.id, target: videoNode.id, animated: true, style: EDGE_STYLE, type: 'smoothstep' },
    ]);
    setShowPresets(false);
    setShowCanvas(true);
    toast.success(`Preset "${preset.name}" aplicado ao workflow!`);
  }, [setNodes, setEdges]);

  const handleQuickTool = useCallback((toolId: string, nodeType: string) => {
    const meta = getNodeMeta(nodeType as any);
    if (!meta) return;

    const inputNode: StudioNode = {
      id: `textInput_${Date.now()}`,
      type: 'studioNode',
      position: { x: 100, y: 200 },
      data: { label: 'Prompt', type: 'textInput', config: { text: '' } },
    };
    const processNode: StudioNode = {
      id: `${nodeType}_${Date.now()}`,
      type: 'studioNode',
      position: { x: 500, y: 200 },
      data: { label: meta.label, type: nodeType as any, config: { ...meta.defaultConfig } },
    };
    const outputNode: StudioNode = {
      id: `output_${Date.now()}`,
      type: 'studioNode',
      position: { x: 900, y: 200 },
      data: { label: 'Resultado Final', type: 'output', config: { format: 'auto' } },
    };

    setNodes([inputNode, processNode, outputNode]);
    setEdges([
      { id: `e1_${Date.now()}`, source: inputNode.id, target: processNode.id, animated: true, style: EDGE_STYLE, type: 'smoothstep' },
      { id: `e2_${Date.now()}`, source: processNode.id, target: outputNode.id, animated: true, style: EDGE_STYLE, type: 'smoothstep' },
    ]);
    setShowCanvas(true);
    toast.success(`Workflow "${meta.label}" criado!`);
  }, [setNodes, setEdges]);

  // Landing page
  if (!showCanvas && nodes.length === 0) {
    return (
      <div className="h-[calc(100vh-200px)] min-h-[600px] rounded-xl overflow-hidden bg-card border border-border text-card-foreground flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-[100px]" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 text-center max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Powered by Veo 3.1, Sora 3, Gemini & mais
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              <span className="text-foreground">AI Creative</span>
              <br />
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">Studio</span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
              Crie vídeos, imagens, músicas e áudio com os modelos de IA mais avançados do mundo.
            </p>

            <div className="flex items-center justify-center gap-3 mb-12 flex-wrap">
              <Button onClick={() => setShowCanvas(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 rounded-full font-medium gap-2">
                <Play className="h-4 w-4" />
                Criar Workflow
              </Button>
              <Button onClick={() => setShowPresets(true)} variant="outline" className="px-6 py-2.5 rounded-full font-medium gap-2">
                <Clapperboard className="h-4 w-4" />
                Explorar Presets
              </Button>
              <Button onClick={() => setShowCreativeAgent(true)} variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 px-6 py-2.5 rounded-full font-medium gap-2">
                <Bot className="h-4 w-4" />
                Agente Criativo
              </Button>
              <Button onClick={() => setShowSettings(true)} variant="outline" className="px-6 py-2.5 rounded-full font-medium gap-2">
                <Settings2 className="h-4 w-4" />
                Configurações IA
              </Button>
              <Button onClick={() => setShowCredits(true)} variant="outline" className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10 px-6 py-2.5 rounded-full font-medium gap-2">
                <Coins className="h-4 w-4" />
                Créditos
              </Button>
            </div>
          </motion.div>

          {/* Quick Tools */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative z-10 w-full max-w-4xl"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-widest text-center mb-4">Ferramentas</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {QUICK_TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <motion.button
                    key={tool.id}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleQuickTool(tool.id, tool.nodeType)}
                    className="group flex flex-col items-start gap-2 p-4 rounded-xl bg-muted/50 border border-border hover:bg-accent hover:border-primary/30 transition-all text-left"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">{tool.label}</p>
                      <p className="text-[11px] text-muted-foreground">{tool.desc}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {showPresets && (
            <PresetsGallery onSelectPreset={handlePresetSelect} onClose={() => setShowPresets(false)} />
          )}
        </AnimatePresence>
        <AISettingsPanel open={showSettings} onClose={() => setShowSettings(false)} />
        <CreativeAgentPanel open={showCreativeAgent} onClose={() => setShowCreativeAgent(false)} onCreateWorkflow={handleStoryboardToWorkflow} />
        <StudioCreditsPanel open={showCredits} onClose={() => setShowCredits(false)} />
      </div>
    );
  }

  return (
    <div
      className={`flex border border-border rounded-xl overflow-hidden bg-background transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none border-0'
          : 'h-[calc(100vh-200px)] min-h-[600px]'
      }`}
    >
      {/* Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        {/* Node Library (floating, collapsible) */}
        <StudioNodeLibrary />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onNodeClick={onNodeClick}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          className="bg-background"
          defaultEdgeOptions={{ animated: true, style: EDGE_STYLE, type: 'smoothstep' }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground) / 0.15)" />
          <Controls
            showInteractive={false}
            className="!bg-card !border-border !shadow-md !rounded-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-muted-foreground [&>button:hover]:!bg-accent"
          />
          <MiniMap
            className="!bg-card !border-border !rounded-lg"
            nodeColor={() => 'hsl(25 95% 53%)'}
            maskColor="hsl(var(--background) / 0.7)"
          />

          {/* Toolbar */}
          <Panel position="top-center">
            <div className="flex items-center gap-2 bg-card/95 backdrop-blur border border-border rounded-xl px-3 py-1.5 shadow-md">
              <Button
                size="sm"
                onClick={() => handleExecute()}
                disabled={isExecuting || nodes.length === 0}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground border-0 rounded-lg text-xs h-8"
              >
                <Play className="h-3.5 w-3.5" />
                {isExecuting ? 'Executando...' : 'Executar Tudo'}
              </Button>
              {selectedNode && (
                <Button
                  size="sm"
                  onClick={handleExecuteFromNode}
                  disabled={isExecuting}
                  className="gap-2 bg-warning hover:bg-warning/90 text-warning-foreground border-0 rounded-lg text-xs h-8"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Daqui em diante
                </Button>
              )}
              <div className="w-px h-5 bg-border" />
              <Button size="icon" variant="ghost" onClick={deleteSelected} disabled={!selectedNode} title="Excluir" className="h-8 w-8">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={clearAll} title="Limpar" className="h-8 w-8 text-destructive/60 hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-5 bg-border" />
              <Button size="sm" variant="ghost" onClick={() => setShowPresets(true)} className="gap-1.5 text-xs h-8">
                <Clapperboard className="h-3.5 w-3.5" />
                Presets
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowSettings(true)} className="gap-1.5 text-xs h-8">
                <Settings2 className="h-3.5 w-3.5" />
                Config
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCredits(true)} className="gap-1.5 text-xs h-8 text-amber-600">
                <Coins className="h-3.5 w-3.5" />
                Créditos
              </Button>
              <div className="w-px h-5 bg-border" />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Sair do Fullscreen' : 'Tela Cheia'}
                className="h-8 w-8"
              >
                {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
              </Button>
              {!isFullscreen && (
                <Button size="sm" variant="ghost" onClick={() => { clearAll(); setShowCanvas(false); }} className="text-xs h-8">
                  Início
                </Button>
              )}
              {isFullscreen && (
                <Button size="sm" variant="ghost" onClick={() => setIsFullscreen(false)} className="text-xs h-8">
                  Voltar
                </Button>
              )}
            </div>
          </Panel>

          {/* Empty state */}
          {nodes.length === 0 && (
            <Panel position="top-center" className="!top-1/2 !-translate-y-1/2">
              <div className="text-center p-8">
                <div className="text-6xl mb-4">🎬</div>
                <h3 className="text-lg font-semibold mb-2 text-foreground/80">Arraste blocos para começar</h3>
                <p className="text-sm max-w-md text-muted-foreground">
                  Clique no botão <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">+</span> para adicionar blocos ao canvas.
                </p>
              </div>
            </Panel>
          )}
        </ReactFlow>

        <AnimatePresence>
          {showPresets && (
            <PresetsGallery onSelectPreset={handlePresetSelect} onClose={() => setShowPresets(false)} />
          )}
        </AnimatePresence>

        {/* Context Menu */}
        <AnimatePresence>
          {contextMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.12 }}
              className="fixed z-[100] min-w-[180px] rounded-xl border border-border bg-card shadow-xl overflow-hidden"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const ctxNode = nodes.find(n => n.id === contextMenu.nodeId);
                const isPaused = (ctxNode?.data as StudioNodeData)?.config?._paused;
                return (
                  <>
                    <button
                      onClick={() => { handleExecute(contextMenu.nodeId); setContextMenu(null); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                    >
                      <PlayCircle className="h-4 w-4 text-emerald-500" />
                      <span className="text-foreground">Executar daqui</span>
                    </button>
                    <button
                      onClick={() => duplicateNode(contextMenu.nodeId)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                    >
                      <Copy className="h-4 w-4 text-sky-500" />
                      <span className="text-foreground">Duplicar</span>
                    </button>
                    <button
                      onClick={() => togglePauseNode(contextMenu.nodeId)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                    >
                      <Pause className="h-4 w-4 text-amber-500" />
                      <span className="text-foreground">{isPaused ? 'Ativar bloco' : 'Pausar bloco'}</span>
                    </button>
                    <div className="h-px bg-border mx-2" />
                    <button
                      onClick={() => {
                        setNodes((nds) => nds.filter(n => n.id !== contextMenu.nodeId));
                        setEdges((eds) => eds.filter(e => e.source !== contextMenu.nodeId && e.target !== contextMenu.nodeId));
                        if (selectedNode?.id === contextMenu.nodeId) setSelectedNode(null);
                        setContextMenu(null);
                        toast.success('Bloco excluído');
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-destructive/10 transition-colors text-left"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="text-destructive">Excluir</span>
                    </button>
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Execution Log Panel */}
        <AnimatePresence>
          {executionLog.length > 0 && (
            <ExecutionLogPanel
              log={executionLog}
              isExecuting={isExecuting}
              currentNodeId={currentNodeId}
              onClear={clearLog}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Config Panel */}
      {selectedNode && (
        <StudioNodeConfigPanel
          node={selectedNode}
          onUpdateConfig={updateNodeConfig}
          onClose={() => setSelectedNode(null)}
          onExecuteFromNode={(nodeId) => handleExecute(nodeId)}
        />
      )}

      <AISettingsPanel open={showSettings} onClose={() => setShowSettings(false)} />
      <CreativeAgentPanel open={showCreativeAgent} onClose={() => setShowCreativeAgent(false)} onCreateWorkflow={handleStoryboardToWorkflow} />
      <StudioCreditsPanel open={showCredits} onClose={() => setShowCredits(false)} />
    </div>
  );
};

const AICreativeStudio: React.FC = () => (
  <ReactFlowProvider>
    <AICreativeStudioInner />
  </ReactFlowProvider>
);

export default AICreativeStudio;
