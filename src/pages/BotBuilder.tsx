import { FloatingAddBlockButton } from "@/components/workflow/FloatingAddBlockButton";
import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Play, Save, ZoomIn, ZoomOut, Maximize2, Lock, Unlock, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  BackgroundVariant,
  SelectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FlowNode } from "@/components/flow/FlowNode";
import { BlockLibrary } from "@/components/flow/BlockLibrary";
import { PropertiesPanel } from "@/components/flow/PropertiesPanel";
import { FlowSimulator } from "@/components/flow/FlowSimulator";
import { VariableManager, FlowVariable } from "@/components/flow/VariableManager";
import { VariableMonitor } from "@/components/flow/VariableMonitor";
import { BlockMonitor } from "@/components/flow/BlockMonitor";
import { EmpresaFieldValidator } from "@/components/flow/EmpresaFieldValidator";
import { ErrorDialog } from "@/components/flow/ErrorDialog";
import { BlockNoteDialog } from "@/components/automacao-vendas/BlockNoteDialog";
import { FlowNodeData, BLOCK_DEFINITIONS } from "@/types/flow";
import { toast } from "@/lib/toast-config";
import { WorkflowAIGenerator } from "@/components/workflow/WorkflowAIGenerator";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import SmartConnectMenu, { SmartBlockOption } from "@/components/flow/SmartConnectMenu";
import { WorkflowFilesMenu } from "@/components/workflow/WorkflowFilesMenu";
import { BotNumberSettingsDialog } from "@/components/atendimento/BotNumberSettingsDialog";
import { WorkflowBuilderLayout } from "@/components/workflow/WorkflowBuilderLayout";
import { boxSelectionProps } from "@/lib/flowSelection";

const nodeTypes = {
  custom: FlowNode,
};


let id = 0;
const getId = () => {
  // Gerar IDs únicos baseados em timestamp + contador + random
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `node_${timestamp}_${id++}_${random}`;
};

function BotBuilderContent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const botIdFromUrl = searchParams.get("id");
  const botNameFromUrl = searchParams.get("name");
  const botDescriptionFromUrl = searchParams.get("description");
  const canaisFromUrl = searchParams.get("canais");
  const whatsappTypeFromUrl = searchParams.get("whatsapp_type");
  const whatsappNumeroIdFromUrl = searchParams.get("whatsapp_numero_id");
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);
  
  // Captura a URL de origem para retornar ao fechar
  const [originUrl] = useState(() => {
    const state = location.state as { from?: string } | null;
    return state?.from || "/bot-create";
  });
  
  // Criar bloco Start por padrão
  const initialNodes: Node[] = [
    {
      id: "start_node",
      type: "custom",
      position: { x: 250, y: 100 },
      data: {
        label: "Iniciar conversa",
        type: "start",
        config: {},
      },
    }
  ];
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [currentBotId, setCurrentBotId] = useState<string | null>(null);
  const [currentBotName, setCurrentBotName] = useState("Novo Bot");
  const [currentBotDescription, setCurrentBotDescription] = useState("");
  const [currentBotCanais, setCurrentBotCanais] = useState<string[]>(["whatsapp"]);
  const [currentBotWhatsAppType, setCurrentBotWhatsAppType] = useState<string>("waha");
  const [currentBotWhatsAppNumeroId, setCurrentBotWhatsAppNumeroId] = useState<string | null>(null);
  const [currentBotForwardToNumeroId, setCurrentBotForwardToNumeroId] = useState<string | null>(null);
  const [savedBots, setSavedBots] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isBlockLibraryExpanded, setIsBlockLibraryExpanded] = useState(false);
  const [flowVariables, setFlowVariables] = useState<FlowVariable[]>([]);
  const [globalVariables, setGlobalVariables] = useState<FlowVariable[]>([]);
  const [breakpointNodes, setBreakpointNodes] = useState<Set<string>>(new Set());
  const [skipNodes, setSkipNodes] = useState<Set<string>>(new Set());
  const [simulatorContext, setSimulatorContext] = useState<Record<string, any>>({});
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title?: string;
    description: string;
  }>({ open: false, description: "" });
  const [isDroppingNode, setIsDroppingNode] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [botToDelete, setBotToDelete] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [simulatorProvider, setSimulatorProvider] = useState<"evolution" | "whatsapp_oficial">("evolution");
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [currentNoteNodeId, setCurrentNoteNodeId] = useState<string | null>(null);
  const [currentNoteValue, setCurrentNoteValue] = useState("");

  const lastSavedSignatureRef = useRef<string | null>(null);
  const getFlowSignature = useCallback(() => {
    const sanitizeNodes = (arr: Node[]) =>
      arr.map((n) => ({
        id: n.id,
        type: n.type,
        // position intencionalmente omitida: mover blocos não é mudança "salvável"
        data: {
          ...(n.data as any)?.label !== undefined ? { label: (n.data as any).label } : {},
          ...(n.data as any)?.type !== undefined ? { type: (n.data as any).type } : {},
          config: (n.data as any)?.config ?? {},
        },
      }));
    const sanitizeEdges = (arr: Edge[]) =>
      arr.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        data: e.data ?? undefined,
      }));

    const payload = {
      nodes: sanitizeNodes(nodes),
      edges: sanitizeEdges(edges),
      variables: flowVariables,
      name: currentBotName,
      description: currentBotDescription,
    };
    return JSON.stringify(payload);
  }, [nodes, edges, flowVariables, currentBotName, currentBotDescription]);

  // Load saved bots on mount
  useEffect(() => {
    loadSavedBots();
    loadGlobalVariables();
  }, []);

  // Definir nome e descrição do bot se vier da URL
  useEffect(() => {
    if (botNameFromUrl && !currentBotId) {
      setCurrentBotName(decodeURIComponent(botNameFromUrl));
    }
    if (botDescriptionFromUrl && !currentBotId) {
      setCurrentBotDescription(decodeURIComponent(botDescriptionFromUrl));
    }
    if (canaisFromUrl && !currentBotId) {
      try {
        const canais = JSON.parse(decodeURIComponent(canaisFromUrl));
        if (Array.isArray(canais)) {
          setCurrentBotCanais(canais);
        }
      } catch (e) {
        console.error("Error parsing canais from URL:", e);
      }
    }
    if (whatsappTypeFromUrl && !currentBotId) {
      setCurrentBotWhatsAppType(whatsappTypeFromUrl);
    }
    if (whatsappNumeroIdFromUrl && !currentBotId) {
      setCurrentBotWhatsAppNumeroId(whatsappNumeroIdFromUrl);
    }
  }, [botNameFromUrl, botDescriptionFromUrl, canaisFromUrl, whatsappTypeFromUrl, whatsappNumeroIdFromUrl, currentBotId]);

  // Auto-save movido abaixo (após handleSave) para evitar closures desatualizadas.


  // Salvamento no unload movido abaixo de handleSave


  const loadSavedBots = async () => {
    const estabelecimentoId = await getEstabelecimentoId();
    
    if (!estabelecimentoId) {
      console.error("No estabelecimento_id found");
      setErrorDialog({
        open: true,
        title: "Erro",
        description: "Não foi possível identificar o estabelecimento. Por favor, selecione um estabelecimento.",
      });
      return;
    }

    const { data, error } = await supabase
      .from("bot_flows")
      .select("*")
      .eq("estabelecimento_id", estabelecimentoId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading bots:", error);
      setErrorDialog({
        open: true,
        title: "Erro ao Carregar Bots",
        description: "Não foi possível carregar a lista de bots. Por favor, tente novamente.",
      });
    } else {
      setSavedBots(data || []);
    }
  };

  const loadGlobalVariables = async () => {
    try {
      const { data, error } = await supabase
        .from("global_variables")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Converter variáveis globais para o formato FlowVariable
      const convertedVariables: FlowVariable[] = (data || []).map((gv: any) => ({
        id: gv.id,
        name: gv.name,
        type: gv.type as "text" | "number" | "date" | "array" | "boolean",
        description: gv.description,
        isConstant: gv.is_constant,
        defaultValue: gv.default_value,
        scope: "global" as const,
      }));

      setGlobalVariables(convertedVariables);
    } catch (error) {
      console.error("Error loading global variables:", error);
      setErrorDialog({
        open: true,
        title: "Erro ao Carregar Variáveis",
        description: "Não foi possível carregar as variáveis globais. Por favor, tente novamente.",
      });
    }
  };

  // Combinar variáveis locais e globais (memorizado para evitar re-renders)
  const allVariables = useMemo(() => [...globalVariables, ...flowVariables], [globalVariables, flowVariables]);

  // Determina quais variáveis estão disponíveis até um bloco específico
  const getAvailableVariablesForNode = useCallback((nodeId: string): FlowVariable[] => {
    // Retorna todas as variáveis (globais + locais)
    return allVariables;
  }, [allVariables]);

  // Highlight node during simulation
  useEffect(() => {
    if (highlightedNodeId) {
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          selected: node.id === highlightedNodeId,
        }))
      );
    }
  }, [highlightedNodeId, setNodes]);

  // Tipos de bloco que possuem MÚLTIPLAS saídas (handles dinâmicos no FlowNode).
  // Blocos não listados aqui são considerados de saída única e não podem ter
  // mais de uma conexão de saída — espelho de getDynamicHandles() em FlowNode.tsx.
  const isMultiOutputNode = useCallback((node: Node | undefined | null): boolean => {
    if (!node) return false;
    const t = (node.data as any)?.type;
    const cfg = (node.data as any)?.config || {};
    if (t === "condition") return true;
    if (t === "keyword_jump") return true;
    if (t === "opt_in_check") return true;
    if (["reply_buttons", "buttons_mixed", "buttons_media"].includes(t)) return true;
    if (t === "carousel" && cfg.mode !== "dynamic" && Array.isArray(cfg.cards)) return true;
    if (t === "list_buttons" && Array.isArray(cfg.sections) && cfg.sections.length > 0) return true;
    if (t === "keyword_options" && (cfg.buttons || cfg.cards)) return true;
    if (t === "ask_question" && cfg.questionType === "multiple" && cfg.options) return true;
    if (t === "content_type" && cfg.mode === "ask" && cfg.splitOutputs) return true;
    return false;
  }, []);

  // Valida em tempo real (linha pontilhada some) — bloqueia uma 2ª saída de
  // qualquer bloco de saída única.
  const isValidConnection = useCallback(
    (conn: Connection) => {
      if (!conn.source) return true;
      const sourceNode = nodes.find((n) => n.id === conn.source);
      if (!sourceNode || isMultiOutputNode(sourceNode)) return true;
      const already = edges.some((e) => e.source === conn.source);
      return !already;
    },
    [nodes, edges, isMultiOutputNode],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      // Prevenir conexões automáticas durante o drop de um novo bloco
      if (isDroppingNode) {
        return;
      }
      // Bloco de saída única só pode ter uma conexão de saída.
      const sourceNode = nodes.find((n) => n.id === params.source);
      if (sourceNode && !isMultiOutputNode(sourceNode)) {
        const already = edges.some((e) => e.source === params.source);
        if (already) {
          toast.error(
            "Este bloco tem apenas 1 saída. Remova a conexão existente antes de criar outra.",
          );
          return;
        }
      }
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges, isDroppingNode, nodes, edges, isMultiOutputNode],
  );


  // ===== Smart connect (make.com style) =====
  const connectStartRef = useRef<{ nodeId: string | null; handleId: string | null; handleType: 'source' | 'target' } | null>(null);
  const [connectMenu, setConnectMenu] = useState<null | { x: number; y: number; flowX: number; flowY: number; fromNodeId: string; handleType: 'source' | 'target' }>(null);

  const onConnectStart = useCallback((_: any, params: any) => {
    connectStartRef.current = {
      nodeId: params.nodeId,
      handleId: params.handleId,
      handleType: params.handleType,
    };
  }, []);

  const onConnectEnd = useCallback((event: any) => {
    const start = connectStartRef.current;
    connectStartRef.current = null;
    if (!start || !start.nodeId || !reactFlowInstance) return;
    const target = event.target as HTMLElement;
    const droppedOnPane = target?.classList?.contains('react-flow__pane');
    if (!droppedOnPane) return;
    // Bloqueia abrir o smart-menu se o bloco-fonte é de saída única e já tem conexão
    if (start.handleType === 'source') {
      const srcNode = nodes.find((n) => n.id === start.nodeId);
      if (srcNode && !isMultiOutputNode(srcNode) && edges.some((e) => e.source === start.nodeId)) {
        toast.error("Este bloco tem apenas 1 saída. Remova a conexão existente antes de criar outra.");
        return;
      }
    }
    const clientX = event.clientX ?? event.changedTouches?.[0]?.clientX;
    const clientY = event.clientY ?? event.changedTouches?.[0]?.clientY;
    if (clientX == null) return;
    const flowPos = reactFlowInstance.screenToFlowPosition({ x: clientX, y: clientY });
    setConnectMenu({
      x: clientX, y: clientY,
      flowX: flowPos.x, flowY: flowPos.y,
      fromNodeId: start.nodeId,
      handleType: start.handleType,
    });
  }, [reactFlowInstance, nodes, edges, isMultiOutputNode]);

  const handleSmartPick = useCallback((type: string) => {
    if (!connectMenu) return;
    const blockDef = BLOCK_DEFINITIONS.find((b) => b.type === type);
    if (!blockDef) return;
    const newNode: Node = {
      id: getId(),
      type: 'custom',
      position: { x: connectMenu.flowX - 120, y: connectMenu.flowY - 40 },
      data: {
        label: blockDef.label,
        type: blockDef.type,
        config: JSON.parse(JSON.stringify(blockDef.defaultData || {})),
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => addEdge(
      connectMenu.handleType === 'source'
        ? { source: connectMenu.fromNodeId, target: newNode.id }
        : { source: newNode.id, target: connectMenu.fromNodeId },
      eds
    ));
    setSelectedNode(newNode);
    toast.success(`Bloco "${blockDef.label}" adicionado!`);
  }, [connectMenu, setNodes, setEdges]);

  const smartBlockOptions: SmartBlockOption[] = useMemo(() =>
    BLOCK_DEFINITIONS.filter(b => b.type !== 'start').map(b => ({
      type: b.type,
      label: b.label,
      description: b.description,
      icon: '▫️',
    })),
  []);

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((els) => {
        const filtered = els.filter((e) => e.id !== oldEdge.id);
        return addEdge(newConnection, filtered);
      });
      toast.success("Conexão movida!");
    },
    [setEdges]
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      toast.success(`${deleted.length} conexão(ões) removida(s)`);
    },
    []
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const blockDef = BLOCK_DEFINITIONS.find((b) => b.type === type);
      if (!blockDef) return;

      // Marcar que está adicionando um novo bloco
      setIsDroppingNode(true);

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const newNode: Node = {
        id: getId(),
        type: "custom",
        position,
        data: {
          label: blockDef.label,
          type: blockDef.type,
          config: JSON.parse(JSON.stringify(blockDef.defaultData || {})),
        },
      };

      setNodes((nds) => [...nds, newNode]);
      
      // Aguardar um pouco antes de permitir conexões novamente e abrir o painel
      setTimeout(() => {
        setIsDroppingNode(false);
        setSelectedNode(newNode);
        setShowSimulator(false);
      }, 100);
      
      toast.success(`Bloco "${blockDef.label}" adicionado!`);
    },
    [reactFlowInstance, setNodes]
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const type = (e as CustomEvent).detail?.type;
      if (!type || !reactFlowWrapper.current || !reactFlowInstance) return;
      const blockDef = BLOCK_DEFINITIONS.find((b) => b.type === type);
      if (!blockDef) return;
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      });
      const newNode: Node = {
        id: getId(),
        type: "custom",
        position,
        data: {
          label: blockDef.label,
          type: blockDef.type,
          config: JSON.parse(JSON.stringify(blockDef.defaultData || {})),
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setSelectedNode(newNode);
      setShowSimulator(false);
      toast.success(`Bloco "${blockDef.label}" adicionado!`);
    };
    window.addEventListener("workflow:add-block", handler);
    return () => window.removeEventListener("workflow:add-block", handler);
  }, [reactFlowInstance, setNodes]);

  // Templates pré-montados (vários blocos + edges)
  useEffect(() => {
    const handler = (e: Event) => {
      const template = (e as CustomEvent).detail?.template;
      if (!template || !reactFlowWrapper.current || !reactFlowInstance) return;

      if (template === "peca_ia_criativa") {
        const bounds = reactFlowWrapper.current.getBoundingClientRect();
        const origin = reactFlowInstance.screenToFlowPosition({
          x: bounds.left + 120,
          y: bounds.top + 120,
        });

        const sequence: Array<{ type: string; configOverride?: Record<string, any> }> = [
          { type: "content_type", configOverride: { mode: "ask" } },
          { type: "ask_influencer" },
          { type: "ask_product_image" },
          {
            type: "text_content",
            configOverride: {
              titleMode: "ask",
              subtitleMode: "ask",
              bodyMode: "ai",
              bodyEnabled: true,
            },
          },
          {
            type: "generate_ai_media",
            configOverride: {
              mediaType: "image",
              styleSource: "visual_identity",
              acceptText: false,
              acceptImageRef: false,
              variations: 4,
              basePrompt: "Crie uma peça gráfica profissional usando as referências fornecidas.",
            },
          },
          {
            type: "publish_social_post",
            configOverride: {
              platforms: ["instagram", "facebook"],
              caption: "{{texto_legenda}}",
              outputVariable: "post_publicado",
            },
          },
        ];

        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        let prevId: string | null = null;
        const createdIds: string[] = [];

        sequence.forEach((step, idx) => {
          const def = BLOCK_DEFINITIONS.find((b) => b.type === step.type);
          if (!def) return;
          const id = getId();
          createdIds.push(id);
          const node: Node = {
            id,
            type: "custom",
            position: { x: origin.x + idx * 320, y: origin.y },
            data: {
              label: def.label,
              type: def.type,
              config: {
                ...JSON.parse(JSON.stringify(def.defaultData || {})),
                ...(step.configOverride || {}),
              },
            },
          };
          newNodes.push(node);
          if (prevId) {
            newEdges.push({
              id: `e_${prevId}_${id}`,
              source: prevId,
              target: id,
              type: "smoothstep",
              animated: true,
            });
          }
          prevId = id;
        });

        // Bloco intermediário de confirmação
        const confirmDef = BLOCK_DEFINITIONS.find((b) => b.type === "reply_buttons");
        const goodbyeDefNo = BLOCK_DEFINITIONS.find((b) => b.type === "goodbye");
        const confirmId = getId();
        const goodbyeNoId = getId();

        if (confirmDef) {
          newNodes.push({
            id: confirmId,
            type: "custom",
            position: { x: origin.x - 320, y: origin.y },
            data: {
              label: confirmDef.label,
              type: confirmDef.type,
              config: {
                text: "Sistema automatizado de postagem. Deseja continuar?",
                variable: "confirmar_postagem",
                buttons: [
                  { label: "Sim", value: "sim" },
                  { label: "Não", value: "nao" },
                ],
              },
            },
          });
        }

        if (goodbyeDefNo) {
          newNodes.push({
            id: goodbyeNoId,
            type: "custom",
            position: { x: origin.x - 320, y: origin.y + 180 },
            data: {
              label: goodbyeDefNo.label,
              type: goodbyeDefNo.type,
              config: {
                ...JSON.parse(JSON.stringify(goodbyeDefNo.defaultData || {})),
                text: "Tudo bem! Se precisar de algo, é só chamar. 👋",
              },
            },
          });
        }

        // Conectar bloco Início ao bloco de confirmação
        newEdges.push({
          id: `e_start_${confirmId}`,
          source: "start_node",
          target: confirmId,
          type: "smoothstep",
          animated: true,
        });

        // Conectar botão "Sim" ao primeiro bloco do roteiro
        const firstNodeId = createdIds[0];
        if (firstNodeId) {
          newEdges.push({
            id: `e_${confirmId}_${firstNodeId}_sim`,
            source: confirmId,
            sourceHandle: "button_0",
            target: firstNodeId,
            type: "smoothstep",
            animated: true,
          });
        }

        // Conectar botão "Não" ao bloco de despedida
        if (goodbyeDefNo) {
          newEdges.push({
            id: `e_${confirmId}_${goodbyeNoId}_nao`,
            source: confirmId,
            sourceHandle: "button_1",
            target: goodbyeNoId,
            type: "smoothstep",
            animated: true,
          });
        }

        // Bloco de loop: pergunta se quer criar mais posts ou finalizar
        const loopDef = BLOCK_DEFINITIONS.find((b) => b.type === "reply_buttons");
        const goodbyeDef = BLOCK_DEFINITIONS.find((b) => b.type === "goodbye");

        if (loopDef && goodbyeDef && prevId && firstNodeId) {
          const loopId = getId();
          const goodbyeId = getId();

          newNodes.push({
            id: loopId,
            type: "custom",
            position: { x: origin.x + sequence.length * 320, y: origin.y },
            data: {
              label: loopDef.label,
              type: loopDef.type,
              config: {
                text: "Deseja criar mais posts ou finalizar?",
                variable: "loop_resposta",
                buttons: [
                  { label: "🔁 Criar mais posts", value: "criar_mais" },
                  { label: "✅ Finalizar", value: "finalizar" },
                ],
              },
            },
          });

          newNodes.push({
            id: goodbyeId,
            type: "custom",
            position: { x: origin.x + (sequence.length + 1) * 320, y: origin.y + 180 },
            data: {
              label: goodbyeDef.label,
              type: goodbyeDef.type,
              config: {
                ...JSON.parse(JSON.stringify(goodbyeDef.defaultData || {})),
                text: "Obrigado! Até a próxima 👋",
              },
            },
          });

          // publish -> loop
          newEdges.push({
            id: `e_${prevId}_${loopId}`,
            source: prevId,
            target: loopId,
            type: "smoothstep",
            animated: true,
          });
          // loop botão 0 (criar mais) -> primeiro nó (volta ao início)
          newEdges.push({
            id: `e_${loopId}_${firstNodeId}_loop`,
            source: loopId,
            sourceHandle: "button_0",
            target: firstNodeId,
            type: "smoothstep",
            animated: true,
            label: "Criar mais",
          });
          // loop botão 1 (finalizar) -> goodbye
          newEdges.push({
            id: `e_${loopId}_${goodbyeId}`,
            source: loopId,
            sourceHandle: "button_1",
            target: goodbyeId,
            type: "smoothstep",
            animated: true,
            label: "Finalizar",
          });
        }

        setNodes((nds) => [...nds, ...newNodes]);
        setEdges((eds) => [...eds, ...newEdges]);
        toast.success("Roteiro 'Criar Peça com IA' adicionado!");
      }
    };
    window.addEventListener("workflow:add-template", handler);
    return () => window.removeEventListener("workflow:add-template", handler);
  }, [reactFlowInstance, setNodes, setEdges]);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (showSimulator) {
      // Não mostrar erro, apenas prevenir a seleção
      // O menu de contexto ainda funciona com botão direito
      return;
    }
    // Um clique já abre o painel de propriedades
    setSelectedNode(node);
    setShowSimulator(false); // Fecha o simulador se estiver aberto
  }, [showSimulator]);

  const onPaneClick = useCallback(() => {
    if (showSimulator) {
      return;
    }
    setSelectedNode(null);
  }, [showSimulator]);

  const handleUpdateNode = useCallback(
    (nodeId: string, data: Partial<FlowNodeData>) => {
      console.log("🔄 [BotBuilder.handleUpdateNode] nodeId:", nodeId, "data:", data);
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            const updatedNode = {
              ...node,
              data: {
                ...node.data,
                ...data,
                config: {
                  ...(node.data as any).config,
                  ...data.config,
                },
              },
            };
            console.log("💾 [BotBuilder.handleUpdateNode] Node atualizado:", updatedNode);
            return updatedNode;
          }
          return node;
        })
      );
      console.log("✅ [BotBuilder.handleUpdateNode] Node updated:", nodeId, data);
    },
    [setNodes]
  );

  const [deleteNodeConfirm, setDeleteNodeConfirm] = useState<{ open: boolean; nodeId: string | null }>({ open: false, nodeId: null });

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const nodeToDelete = nodes.find(n => n.id === nodeId);
      if (nodeToDelete && (nodeToDelete.data as any).type === "start") {
        setErrorDialog({
          open: true,
          title: "Ação não Permitida",
          description: "O bloco Start não pode ser excluído!",
        });
        return;
      }
      setDeleteNodeConfirm({ open: true, nodeId });
    },
    [nodes]
  );

  const confirmDeleteNode = useCallback(() => {
    const nodeId = deleteNodeConfirm.nodeId;
    if (!nodeId) return;
    setDeleteNodeConfirm({ open: false, nodeId: null });

    window.setTimeout(() => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      setSelectedNode((prev) => (prev && prev.id === nodeId ? null : prev));
      document.body.style.pointerEvents = "";
      toast.success("Bloco e conexões excluídos!");
    }, 0);
  }, [deleteNodeConfirm.nodeId, setNodes, setEdges]);

  const handleNodesDelete = useCallback(
    (deleted: Node[]) => {
      if (!deleted || deleted.length === 0) return;
      const deletedIds = new Set(deleted.map((n) => n.id));
      setSelectedNode((prev) => (prev && deletedIds.has(prev.id) ? null : prev));
    },
    []
  );

  const handleAddNote = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      setCurrentNoteNodeId(nodeId);
      setCurrentNoteValue((node.data as any).note || "");
      setNoteDialogOpen(true);
    },
    [nodes]
  );

  const handleSaveNote = useCallback(
    (note: string) => {
      if (!currentNoteNodeId) return;

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === currentNoteNodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                note: note,
              },
            };
          }
          return n;
        })
      );
      toast.success(note ? "Nota adicionada com sucesso!" : "Nota removida com sucesso!");
      setCurrentNoteNodeId(null);
    },
    [currentNoteNodeId, setNodes]
  );

  // Validar se existem blocos desconectados
  const validateConnections = useCallback(() => {
    if (nodes.length === 0) return { isValid: true, disconnectedNodes: [] };

    // Encontrar todos os nós que têm conexões (como fonte ou destino)
    const connectedNodeIds = new Set<string>();
    
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    // Verificar blocos desconectados (exceto o start que pode não ter entrada)
    const disconnectedNodes = nodes.filter(node => {
      const nodeData = node.data as any;
      // O bloco start não precisa de entrada, mas precisa de saída se não for o único bloco
      if (nodeData.type === "start") {
        return nodes.length > 1 && !edges.some(e => e.source === node.id);
      }
      // Outros blocos precisam ter pelo menos uma conexão (entrada ou saída)
      return !connectedNodeIds.has(node.id);
    });

    return {
      isValid: disconnectedNodes.length === 0,
      disconnectedNodes
    };
  }, [nodes, edges]);

  const highlightDisconnectedNodes = useCallback((disconnectedNodes: Node[]) => {
    if (disconnectedNodes.length === 0) return;

    // Destacar o primeiro bloco desconectado
    const firstDisconnected = disconnectedNodes[0];
    
    // Marcar visualmente todos os blocos desconectados e selecionar o primeiro
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: node.id === firstDisconnected.id,
      }))
    );
    
    // Centralizar visualização no primeiro bloco desconectado
    if (reactFlowInstance) {
      reactFlowInstance.setCenter(
        firstDisconnected.position.x + 140,
        firstDisconnected.position.y + 70,
        { zoom: 1.5, duration: 800 }
      );
    }

    // Selecionar o bloco no painel de propriedades
    setSelectedNode(firstDisconnected);
    
    // Mostrar mensagem de erro
    const nodeData = firstDisconnected.data as any;
    const blockLabel = nodeData.label || "Bloco";
    setErrorDialog({
      open: true,
      title: "Blocos Desconectados",
      description: `${blockLabel} está desconectado! ${disconnectedNodes.length > 1 ? `Mais ${disconnectedNodes.length - 1} bloco(s) também estão desconectados.` : ''}`,
    });
  }, [reactFlowInstance, setNodes]);

  const handleSave = useCallback(async (silent = false): Promise<boolean> => {
    if (savingRef.current) {
      return false; // já salvando; evita corrida
    }
    savingRef.current = true;

    let saved = false;
    if (!silent) {
      setIsSaving(true);
    }

    try {
      console.log("[BotBuilder] Salvando...", { id: currentBotId, signature: getFlowSignature() });

      if (!currentBotName.trim()) {
        if (!silent) {
          setErrorDialog({
            open: true,
            title: "Nome Obrigatório",
            description: "Por favor, dê um nome ao bot antes de salvar.",
          });
        }
        return false;
      }

      // Validar conexões antes de salvar (permitir salvar mesmo com blocos desconectados)
      const validation = validateConnections();
      if (!validation.isValid) {
        if (!silent) {
          highlightDisconnectedNodes(validation.disconnectedNodes);
          toast.info("Existem blocos desconectados. Salvando mesmo assim.");
        }
        // Continua o salvamento mesmo com blocos desconectados
      }

      // Obter estabelecimento_id
      const estabelecimentoId = await getEstabelecimentoId();
      
      if (!estabelecimentoId) {
        if (!silent) {
          setErrorDialog({
            open: true,
            title: "Erro",
            description: "Não foi possível identificar o estabelecimento. Por favor, selecione um estabelecimento.",
          });
        }
        return false;
      }

      // Garantir que o bot herda e fixa o estabelecimento atual para todo o fluxo
      try {
        localStorage.setItem("selectedEstabelecimentoId", estabelecimentoId);
      } catch {}


      // Preferir dados do React Flow (garante último estado do canvas)
      const rfData = typeof reactFlowInstance?.toObject === 'function' ? reactFlowInstance.toObject() : null;
      const nodesToSave = rfData?.nodes?.length ? rfData.nodes : nodes;
      const edgesToSave = rfData?.edges?.length ? rfData.edges : edges;

      const flow = {
        nodes: nodesToSave,
        edges: edgesToSave,
        viewport: reactFlowInstance?.getViewport(),
        variables: flowVariables,
      };

      const botInsertData: any = {
        name: currentBotName,
        description: currentBotDescription,
        canais: currentBotCanais,
        flow_data: flow as any,
        updated_at: new Date().toISOString(),
        estabelecimento_id: estabelecimentoId,
      };
      
      // Adicionar whatsapp_type apenas se o bot for para WhatsApp
      if (currentBotCanais.includes('whatsapp')) {
        botInsertData.whatsapp_type = currentBotWhatsAppType;
        botInsertData.whatsapp_numero_id = currentBotWhatsAppNumeroId;
        botInsertData.forward_to_numero_id = currentBotForwardToNumeroId;
      }
      
      const botData = botInsertData;

      let error: any, data: any;
      const targetId = currentBotId || botIdFromUrl;
      if (targetId) {
        // Update existing bot (use id from state or URL to avoid race while carregando)
        ({ error, data } = await supabase
          .from("bot_flows")
          .update(botData)
          .eq("id", targetId)
          .select()
          .single());

        // Garantir que currentBotId esteja setado após update
        if (!currentBotId && data?.id) {
          setCurrentBotId(data.id);
        }
      } else {
        // Create new bot
        ({ error, data } = await supabase
          .from("bot_flows")
          .insert([{ ...botData, active: false }])
          .select()
          .single());
        
        if (data) {
          setCurrentBotId(data.id);
        }
      }

      if (error) {
        console.error("Error saving bot:", error);
        if (!silent) {
          setErrorDialog({
            open: true,
            title: "Erro ao Salvar",
            description: "Não foi possível salvar o bot. Por favor, tente novamente.",
          });
        }
      } else {
        // Pequeno yield para garantir flush de atualizações pendentes no UI
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // Recalcular assinatura com os dados efetivamente salvos
        const sanitizeNodes = (arr: any[]) =>
          arr.map((n) => ({
            id: n.id,
            type: n.type,
            // position intencionalmente omitida da assinatura
            data: {
              ...(n.data?.label !== undefined ? { label: n.data.label } : {}),
              ...(n.data?.type !== undefined ? { type: n.data.type } : {}),
              config: n.data?.config ?? {},
            },
          }));
        const sanitizeEdges = (arr: any[]) =>
          arr.map((e) => ({ id: e.id, source: e.source, target: e.target, type: e.type, data: e.data ?? undefined }));

        const newSignature = JSON.stringify({
          nodes: sanitizeNodes(nodesToSave),
          edges: sanitizeEdges(edgesToSave),
          variables: flowVariables,
          name: currentBotName,
          description: currentBotDescription,
        });
        lastSavedSignatureRef.current = newSignature;
        setHasUnsavedChanges(false);
        
        if (!silent) {
          toast.success("✓ Bot salvo com sucesso!", { duration: 3000 });

          // Avisar sobre conectores de redes sociais não configurados
          try {
            const PLATFORM_REQUIRED_FIELDS: Record<string, { label: string; fields: string[] }> = {
              instagram: { label: 'Instagram', fields: ['access_token', 'page_id'] },
              facebook: { label: 'Facebook', fields: ['access_token', 'page_id'] },
              tiktok: { label: 'TikTok', fields: ['client_key', 'access_token'] },
              linkedin: { label: 'LinkedIn', fields: ['access_token', 'organization_id'] },
              twitter: { label: 'X (Twitter)', fields: ['api_key', 'api_secret', 'access_token', 'access_secret'] },
              youtube: { label: 'YouTube', fields: ['client_id', 'client_secret', 'refresh_token'] },
            };
            const usedPlatforms = new Set<string>();
            nodesToSave.forEach((n: any) => {
              if (n?.data?.type === 'publish_social_post' || n?.type === 'publish_social_post') {
                const plats: string[] = n?.data?.config?.platforms || [];
                plats.forEach((p) => usedPlatforms.add(p));
              }
            });
            if (usedPlatforms.size > 0) {
              const { data: rows } = await supabase
                .from('social_media_credentials')
                .select('platform, credentials')
                .in('platform', Array.from(usedPlatforms));
              const stored: Record<string, any> = {};
              (rows || []).forEach((r: any) => { stored[r.platform] = r.credentials || {}; });
              const missing: string[] = [];
              usedPlatforms.forEach((p) => {
                const def = PLATFORM_REQUIRED_FIELDS[p];
                if (!def) return;
                const c = stored[p] || {};
                const ok = def.fields.every((f) => c[f] && String(c[f]).trim() !== '');
                if (!ok) missing.push(def.label);
              });
              if (missing.length > 0) {
                toast.warning(
                  `Atenção: o bot só publicará nestas plataformas após configurar o conector: ${missing.join(', ')}. Acesse Marketing → Conectores de Redes Sociais.`,
                  { duration: 8000 }
                );
              }
            }
          } catch (e) {
            console.warn('[BotBuilder] Falha ao validar conectores sociais', e);
          }
        }
        
        console.log("[BotBuilder] Salvo com sucesso", { signature: newSignature });
        loadSavedBots();
        saved = true;
      }
    } finally {
      if (!silent) {
        setIsSaving(false);
      }
      savingRef.current = false;
    }

    return saved;
  }, [nodes, edges, reactFlowInstance, currentBotName, currentBotId, botIdFromUrl, currentBotDescription, validateConnections, highlightDisconnectedNodes, flowVariables, getFlowSignature]);

  // Detectar mudanças não salvas (sem auto-save)
  useEffect(() => {
    const currentSig = getFlowSignature();
    // Primeira execução: inicializa a baseline para evitar prompt de "sair do site"
    if (lastSavedSignatureRef.current === null) {
      lastSavedSignatureRef.current = currentSig;
      setHasUnsavedChanges(false);
      return;
    }
    const changed = lastSavedSignatureRef.current !== currentSig;
    setHasUnsavedChanges(changed);
  }, [nodes, edges, flowVariables, currentBotName, currentBotDescription, getFlowSignature]);

  useUnsavedChanges(
    "bot-builder",
    hasUnsavedChanges,
    async () => (await handleSave(true)) !== false,
    currentBotName || "Bot",
  );

  const handleLoadBot = useCallback(async (botId: string) => {
    const { data, error } = await supabase
      .from("bot_flows")
      .select("*")
      .eq("id", botId)
      .single();

    if (error) {
      console.error("Error loading bot:", error);
      setErrorDialog({
        open: true,
        title: "Erro ao Carregar Bot",
        description: "Não foi possível carregar o bot. Por favor, tente novamente.",
      });
      return;
    }

    if (data && data.flow_data) {
      const flowData = data.flow_data as any;
      let loadedNodes = flowData.nodes || [];
      
      // Normalizar IDs de nós para evitar perdas por duplicidade
      const seenIds = new Set<string>();
      loadedNodes = loadedNodes.map((node: any) => {
        let id = node.id || getId();
        if (seenIds.has(id)) {
          id = getId();
        }
        seenIds.add(id);
        return { ...node, id };
      });
      
      // Garantir que tem um bloco Start
      const hasStart = loadedNodes.some((node: any) => node.data.type === "start");
      if (!hasStart) {
        const startNode: Node = {
          id: "start_node",
          type: "custom",
          position: { x: 250, y: 100 },
          data: {
            label: "Iniciar conversa",
            type: "start",
            config: {},
          },
        };
        loadedNodes.unshift(startNode);
      }
      
      setNodes(loadedNodes);
      setEdges(flowData.edges || []);
      setFlowVariables(flowData.variables || []);
      setCurrentBotId(data.id);
      setCurrentBotName(data.name);
      setCurrentBotDescription(data.description || "");
      setCurrentBotCanais(data.canais || ["whatsapp"]);
      setCurrentBotWhatsAppType(data.whatsapp_type || "waha");
      setCurrentBotWhatsAppNumeroId((data as any).whatsapp_numero_id || null);
      setCurrentBotForwardToNumeroId((data as any).forward_to_numero_id || null);
      setSelectedNode(null);
      
      // Fixar estabelecimento do bot como o estabelecimento corrente da sessão
      if ((data as any).estabelecimento_id) {
        try {
          localStorage.setItem("selectedEstabelecimentoId", (data as any).estabelecimento_id);
        } catch {}
      }
      
      // A próxima verificação cria a baseline com o fluxo já carregado.
      lastSavedSignatureRef.current = null;
      setHasUnsavedChanges(false);

      // Centralizar os blocos ao abrir o bot
      setTimeout(() => {
        reactFlowInstance?.fitView({
          padding: 0.2,
          duration: 400,
          maxZoom: 1.0,
          minZoom: 0.5,
        });
      }, 200);
    }
  }, [setNodes, setEdges, reactFlowInstance]);

  // Carregar bot da URL automaticamente
  useEffect(() => {
    if (botIdFromUrl) {
      handleLoadBot(botIdFromUrl);
    }
  }, [botIdFromUrl, handleLoadBot]);

  const handleToggleActive = useCallback(async (botId: string, currentActive: boolean) => {
    // Se está tentando ativar, validar conexões primeiro
    if (!currentActive) {
      // Carregar o bot para validar
      const { data: botData } = await supabase
        .from("bot_flows")
        .select("*")
        .eq("id", botId)
        .single();

      if (botData?.flow_data) {
        const flowData = botData.flow_data as any;
        const botNodes = flowData.nodes || [];
        const botEdges = flowData.edges || [];

        // Validar conexões do bot
        const connectedNodeIds = new Set<string>();
        botEdges.forEach((edge: any) => {
          connectedNodeIds.add(edge.source);
          connectedNodeIds.add(edge.target);
        });

        const disconnectedNodes = botNodes.filter((node: any) => {
          const nodeData = node.data as any;
          if (nodeData.type === "start") {
            return botNodes.length > 1 && !botEdges.some((e: any) => e.source === node.id);
          }
          return !connectedNodeIds.has(node.id);
        });

        if (disconnectedNodes.length > 0) {
          setErrorDialog({
            open: true,
            title: "Blocos Desconectados",
            description: `Não é possível ativar o bot "${botData.name}" pois existem ${disconnectedNodes.length} bloco(s) desconectado(s). Por favor, conecte todos os blocos antes de ativar.`,
          });
          return;
        }
      }

      // Buscar estabelecimento do bot
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        setErrorDialog({
          open: true,
          title: "Erro",
          description: "Não foi possível identificar o estabelecimento.",
        });
        return;
      }

      const botCanais = botData?.canais || ["whatsapp"];

      // Buscar todos os bots ativos do mesmo estabelecimento
      const { data: activeBots } = await supabase
        .from("bot_flows")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("active", true)
        .neq("id", botId);

      // Verificar conflitos de canais
      const botsToDeactivate: string[] = [];
      
      for (const activeBot of activeBots || []) {
        const activeBotCanais = activeBot.canais || ["whatsapp"];
        
        // Verificar se há overlap de canais
        const hasOverlap = botCanais.some(canal => activeBotCanais.includes(canal));
        
        if (hasOverlap) {
          // Para WhatsApp, verificar se há sessões diferentes
          if (botCanais.includes("whatsapp") && activeBotCanais.includes("whatsapp")) {
            // Buscar sessões associadas aos bots
            const { data: sessions } = await supabase
              .from("whatsapp_sessions")
              .select("*")
              .or(`bot_flow_id.eq.${botId},bot_flow_id.eq.${activeBot.id}`);
            
            const botSession = sessions?.find(s => s.bot_flow_id === botId);
            const activeBotSession = sessions?.find(s => s.bot_flow_id === activeBot.id);
            
            // Se ambos têm sessões diferentes, permitir ambos ativos
            if (botSession && activeBotSession && botSession.id !== activeBotSession.id) {
              continue; // Não desativar este bot
            }
          }
          
          // Se chegou aqui, há conflito - desativar o bot ativo
          botsToDeactivate.push(activeBot.id);
        }
      }

      // Desativar bots conflitantes
      if (botsToDeactivate.length > 0) {
        await supabase
          .from("bot_flows")
          .update({ active: false })
          .in("id", botsToDeactivate);
      }
    }

    const { error } = await supabase
      .from("bot_flows")
      .update({ active: !currentActive })
      .eq("id", botId);

    if (error) {
      console.error("Error toggling active:", error);
      setErrorDialog({
        open: true,
        title: "Erro ao Atualizar Status",
        description: "Não foi possível ativar/desativar o bot. Por favor, tente novamente.",
      });
    } else {
      toast.success(!currentActive ? "Bot ativado!" : "Bot desativado!");
      loadSavedBots();
    }
  }, []);

  const handleDeleteBot = useCallback(async (botId: string) => {
    setBotToDelete(botId);
    setDeleteConfirmOpen(true);
  }, []);

  const confirmDeleteBot = useCallback(async () => {
    if (!botToDelete) return;

    const { error } = await supabase
      .from("bot_flows")
      .delete()
      .eq("id", botToDelete);

    if (error) {
      console.error("Error deleting bot:", error);
      setErrorDialog({
        open: true,
        title: "Erro ao Excluir",
        description: "Não foi possível excluir o bot. Por favor, tente novamente.",
      });
    } else {
      toast.success("Bot excluído!");
      loadSavedBots();
    }
    
    setDeleteConfirmOpen(false);
    setBotToDelete(null);
  }, [botToDelete]);

  const handleExport = useCallback(() => {
    const flow = {
      nodes,
      edges,
      viewport: reactFlowInstance?.getViewport(),
    };
    const dataStr = JSON.stringify(flow, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bot-flow-${Date.now()}.json`;
    link.click();
    toast.success("Fluxo exportado!");
  }, [nodes, edges, reactFlowInstance]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const flow = JSON.parse(event.target?.result as string);
          setNodes(flow.nodes || []);
          setEdges(flow.edges || []);
          if (flow.viewport && reactFlowInstance) {
            reactFlowInstance.setViewport(flow.viewport);
          }
          toast.success("Fluxo importado!");
        } catch (error) {
          setErrorDialog({
            open: true,
            title: "Erro ao Importar",
            description: "Não foi possível importar o fluxo. Verifique se o arquivo está correto.",
          });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setNodes, setEdges, reactFlowInstance]);

  const handleTest = useCallback(() => {
    if (showSimulator) {
      setShowSimulator(false);
      setHighlightedNodeId(null);
      setSelectedNode(null); // Limpar seleção ao fechar
      return;
    }
    
    if (nodes.length === 0) {
      setErrorDialog({
        open: true,
        title: "Fluxo Vazio",
        description: "Adicione blocos ao fluxo antes de testar.",
      });
      return;
    }
    
    const hasStart = nodes.some((node) => {
      const nodeData = node.data as any;
      return nodeData.type === "start";
    });
    if (!hasStart) {
      setErrorDialog({
        open: true,
        title: "Bloco Start Ausente",
        description: "Adicione um bloco 'Start' para iniciar o teste.",
      });
      return;
    }

    // Validar conexões antes de testar
    const validation = validateConnections();
    if (!validation.isValid) {
      highlightDisconnectedNodes(validation.disconnectedNodes);
      return;
    }
    
    setShowSimulator(true);
    // Removido toast "Simulador aberto!" a pedido do usuário
  }, [nodes, showSimulator, validateConnections, highlightDisconnectedNodes]);

  const handleNewFlow = useCallback(() => {
    setEdges([]);
    setSelectedNode(null);
    id = 0;
    
    // Criar bloco Start automaticamente
    const startNode: Node = {
      id: "start_node",
      type: "custom",
      position: { x: 250, y: 100 },
      data: {
        label: "Iniciar conversa",
        type: "start",
        config: {},
      },
    };
    setNodes([startNode]);
    
    toast.success("Novo fluxo criado!");
  }, [setNodes, setEdges]);

  const handleZoomIn = useCallback(() => {
    reactFlowInstance?.zoomIn({ duration: 300 });
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance?.zoomOut({ duration: 300 });
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    if (!reactFlowInstance) return;
    
    // Centralizar todos os blocos
    const blockLibraryWidth = isBlockLibraryExpanded ? 256 : 0;
    const viewportWidth = window.innerWidth;
    const availableWidth = viewportWidth - blockLibraryWidth;
    
    const leftPaddingRatio = blockLibraryWidth / availableWidth;
    
    reactFlowInstance.fitView({ 
      padding: { 
        top: 0.15, 
        bottom: 0.15, 
        left: 0.15 + leftPaddingRatio, 
        right: 0.15 
      },
      duration: 300,
      maxZoom: 1.2
    });
  }, [reactFlowInstance, isBlockLibraryExpanded]);

  const handleToggleLock = useCallback(() => {
    setIsLocked(prev => !prev);
    toast.info(isLocked ? "Canvas desbloqueado" : "Canvas bloqueado");
  }, [isLocked]);

  const handleExit = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      navigate(originUrl);
    }
  }, [hasUnsavedChanges, navigate, originUrl]);

  const handleExitWithSave = useCallback(async () => {
    const ok = await handleSave(false);
    if (ok) {
      setShowExitDialog(false);
      navigate(originUrl);
    } else {
      toast.error("Não foi possível salvar. Corrija os erros e tente novamente.");
    }
  }, [handleSave, navigate, originUrl]);

  const handleExitWithoutSave = useCallback(() => {
    setShowExitDialog(false);
    navigate(originUrl);
  }, [navigate, originUrl]);

  return (
    <WorkflowBuilderLayout
      title="CRIAR BOT"
      subtitle="Configure seu fluxo de atendimento automático"
      flowName={currentBotName}
      onSave={() => handleSave(false)}
      isSaving={isSaving}
      onTest={handleTest}
      showTest={showSimulator}
      testLabel="Testar"
      isTestActive={showSimulator}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      onFitView={handleFitView}
      isLocked={isLocked}
      onToggleLock={handleToggleLock}
      hasUnsavedChanges={hasUnsavedChanges}
      defaultReturnUrl={originUrl}
      onClose={() => navigate(originUrl)}
      aiGeneratorContent={
        <WorkflowAIGenerator
          workflowType="Bot Builder"
          blockDefinitions={BLOCK_DEFINITIONS}
          onGenerated={(newNodes, newEdges) => {
            setNodes(nds => [...nds, ...newNodes]);
            setEdges(eds => [...eds, ...newEdges]);
            setHasUnsavedChanges(true);
          }}
        />
      }
      leftContent={
        <div className="hidden lg:flex items-center gap-1">
          <VariableManager variables={flowVariables} onVariablesChange={setFlowVariables} globalVariables={globalVariables} />
          <VariableMonitor variables={allVariables} context={simulatorContext} />
          <BlockMonitor selectedNode={selectedNode} nodes={nodes} edges={edges} context={simulatorContext} allVariables={allVariables} />
          <EmpresaFieldValidator selectedNode={selectedNode} context={simulatorContext} />
        </div>
      }
      rightContent={
        <>
          <WorkflowFilesMenu
            nodes={nodes}
            edges={edges}
            selectedNodes={nodes.filter((n) => n.selected)}
            customImport={{ onClick: handleImport }}
            customExport={{ onClick: handleExport }}
            onLoadTemplate={(newNodes, newEdges) => {
              setNodes((nds) => [...nds, ...newNodes]);
              setEdges((eds) => [...eds, ...newEdges]);
              setHasUnsavedChanges(true);
            }}
          />
          {currentBotCanais.includes('whatsapp') && (
            <BotNumberSettingsDialog
              botId={currentBotId || botIdFromUrl}
              whatsappNumeroId={currentBotWhatsAppNumeroId}
              forwardToNumeroId={currentBotForwardToNumeroId}
              onSaved={(numId, fwdId) => {
                setCurrentBotWhatsAppNumeroId(numId);
                setCurrentBotForwardToNumeroId(fwdId);
              }}
            />
          )}
        </>
      }
    >
          <BlockLibrary 
            onDragStart={onDragStart} 
            isExpanded={isBlockLibraryExpanded}
            onToggleExpanded={setIsBlockLibraryExpanded}
          />

          <div className={`${showSimulator ? "lg:mr-96" : ""} flex-1 relative`} ref={reactFlowWrapper} style={{ touchAction: 'none' }}>
            {!isBlockLibraryExpanded && (
              <FloatingAddBlockButton onClick={() => setIsBlockLibraryExpanded(true)} />
            )}
            <ReactFlow
              nodes={nodes.map(node => ({
                ...node,
                data: {
                  ...node.data,
                  isBreakpoint: breakpointNodes.has(node.id),
                  isSkipped: skipNodes.has(node.id),
                  simulatorActive: showSimulator,
                  onSetBreakpoint: (nodeId: string) => {
                    setBreakpointNodes(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(nodeId)) {
                        newSet.delete(nodeId);
                      } else {
                        newSet.add(nodeId);
                        skipNodes.delete(nodeId);
                      }
                      return newSet;
                    });
                    setSkipNodes(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(nodeId);
                      return newSet;
                    });
                  },
                  onSetSkip: (nodeId: string) => {
                    setSkipNodes(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(nodeId)) {
                        newSet.delete(nodeId);
                      } else {
                        newSet.add(nodeId);
                        breakpointNodes.delete(nodeId);
                      }
                      return newSet;
                    });
                    setBreakpointNodes(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(nodeId);
                      return newSet;
                    });
                  },
                  onClearDebug: (nodeId: string) => {
                    setBreakpointNodes(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(nodeId);
                      return newSet;
                    });
                    setSkipNodes(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(nodeId);
                      return newSet;
                    });
                  },
                  onDuplicate: (nodeId: string) => {
                    const nodeToDuplicate = nodes.find(n => n.id === nodeId);
                    if (nodeToDuplicate) {
                      const newId = getId();
                      const newNode = {
                        ...nodeToDuplicate,
                        id: newId,
                        position: {
                          x: nodeToDuplicate.position.x + 50,
                          y: nodeToDuplicate.position.y + 50,
                        },
                        data: {
                          ...nodeToDuplicate.data,
                        },
                      };
                      setNodes((nds) => [...nds, newNode]);
                      toast.success("Bloco duplicado com sucesso!");
                    }
                  },
                  onDelete: handleDeleteNode,
                  onAddNote: handleAddNote,
                  onUpdateNodeData: (nodeId: string, partial: any) => {
                    setNodes((nds) =>
                      nds.map((n) =>
                        n.id === nodeId
                          ? { ...n, data: { ...n.data, ...partial } }
                          : n
                      )
                    );
                  },
                },
              }))}
              edges={edges.map((edge) => ({
                ...edge,
                style: {
                  stroke: edge.selected ? 'hsl(var(--primary))' : 'hsl(var(--primary))',
                  strokeWidth: edge.selected ? 2.5 : 1.33,
                },
                markerEnd: {
                  type: 'arrowclosed',
                  width: 20,
                  height: 20,
                  color: edge.selected ? 'hsl(var(--primary))' : 'hsl(var(--primary))',
                },
                type: 'smoothstep',
              }))}
              onNodesChange={onNodesChange}
              onNodesDelete={handleNodesDelete}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              onConnectStart={onConnectStart}
              onConnectEnd={onConnectEnd}
              onReconnect={onReconnect}
              onEdgesDelete={onEdgesDelete}
              onInit={(instance) => {
                setReactFlowInstance(instance);
                // Centraliza os blocos ao abrir o bot
                setTimeout(() => {
                  instance.fitView({
                    padding: 0.2,
                    duration: 400,
                    maxZoom: 1.0,
                    minZoom: 0.5,
                  });
                }, 100);
              }}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              nodesDraggable={!isLocked && !showSimulator}
              nodesConnectable={!isLocked && !showSimulator && !isDroppingNode}
              nodesFocusable={!isLocked}
              edgesFocusable={!isLocked}
              className="bg-background"
              connectOnClick={false}
              autoPanOnConnect={false}
              autoPanOnNodeDrag={true}
              {...boxSelectionProps({ disabled: isLocked || showSimulator })}
              onBeforeDelete={async ({ nodes: nodesToDelete, edges: edgesToDelete }) => {
                const filtered = nodesToDelete.filter(n => (n.data as any)?.type !== "start");
                if (filtered.length === nodesToDelete.length) return true;
                if (filtered.length === 0 && edgesToDelete.length === 0) {
                  setErrorDialog({ open: true, title: "Ação não Permitida", description: "O bloco Start não pode ser excluído!" });
                  return false;
                }
                return { nodes: filtered, edges: edgesToDelete };
              }}
              defaultEdgeOptions={{
                animated: true,
                style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
                markerEnd: {
                  type: 'arrowclosed',
                  width: 20,
                  height: 20,
                  color: 'hsl(var(--primary))',
                },
                type: 'smoothstep',
              }}
            >
              <Background 
                variant={BackgroundVariant.Dots} 
                gap={20} 
                size={1.5}
                color="#cbd5e1"
                className="opacity-40"
              />
              <Controls
                className="bg-card border border-border shadow-lg rounded-lg"
                showInteractive={true}
              />
              <MiniMap
                nodeColor={(node) => {
                  const nodeData = node.data as any;
                  const blockDef = BLOCK_DEFINITIONS.find(
                    (b) => b.type === nodeData?.type
                  );
                  return blockDef?.color.includes("primary")
                    ? "#06b6d4"
                    : blockDef?.color.includes("success")
                    ? "#10b981"
                    : blockDef?.color.includes("warning")
                    ? "#f59e0b"
                    : "#475569";
                }}
                className="bg-card border border-border rounded-lg shadow-lg"
                maskColor="rgba(255, 255, 255, 0.8)"
              />
            </ReactFlow>
            {connectMenu && (
              <SmartConnectMenu
                x={connectMenu.x}
                y={connectMenu.y}
                blocks={smartBlockOptions}
                onPick={handleSmartPick}
                onClose={() => setConnectMenu(null)}
              />
            )}
          </div>

          {showSimulator && (
            <>
              {/* Overlay para mobile/tablet permitir fechar tocando fora */}
              <div
                className="fixed inset-0 top-[90px] bg-black/40 z-30 lg:hidden"
                onClick={() => setShowSimulator(false)}
              />
              <div className="fixed right-0 top-[90px] bottom-16 sm:bottom-20 w-full sm:w-[420px] lg:w-[400px] min-h-0 overflow-hidden flex flex-col bg-card backdrop-blur-sm border-l border-border z-40 shadow-2xl lg:top-[64px] lg:m-2 lg:mb-16 lg:rounded-2xl lg:border-2 lg:border-white dark:lg:border-white/10 lg:bg-gradient-to-b lg:from-background lg:to-border lg:shadow-lg lg:border-l-2">
                <button
                  type="button"
                  onClick={() => setShowSimulator(false)}
                  className="lg:hidden absolute top-2 left-2 z-50 h-8 w-8 inline-flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white shadow-md"
                  aria-label="Fechar simulador"
                >
                  ✕
                </button>
                <FlowSimulator
                  nodes={nodes}
                  edges={edges}
                  onHighlightNode={setHighlightedNodeId}
                  breakpointNodes={breakpointNodes}
                  skipNodes={skipNodes}
                  onContextChange={setSimulatorContext}
                  provider={simulatorProvider}
                  onProviderChange={setSimulatorProvider}
                />
              </div>
            </>
          )}

          {!showSimulator && selectedNode && nodes.some(n => n.id === selectedNode.id) && (
            <PropertiesPanel
              selectedNode={nodes.find(n => n.id === selectedNode.id)!}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
              nodes={nodes}
              edges={edges}
              flowVariables={allVariables}
              onClose={() => setSelectedNode(null)}
            />
          )}

        {/* Dialog de erro */}
        <ErrorDialog
          open={errorDialog.open}
          onClose={() => setErrorDialog({ open: false, description: "", title: "" })}
          title={errorDialog.title}
          description={errorDialog.description}
        />

        {/* Dialog de confirmação de exclusão */}
        <DeleteConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          onConfirm={confirmDeleteBot}
          title="Confirmar exclusão"
          description="Tem certeza que deseja excluir este bot? Esta ação não pode ser desfeita."
        />

        <DeleteConfirmDialog
          open={deleteNodeConfirm.open}
          onOpenChange={(open) => setDeleteNodeConfirm((prev) => ({ open, nodeId: open ? prev.nodeId : null }))}
          onConfirm={confirmDeleteNode}
          title="Excluir bloco"
          description="Tem certeza que deseja excluir este bloco? As conexões com ele também serão removidas."
        />



        {/* Dialog de confirmação ao sair */}
        <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mudanças não salvas</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem mudanças não salvas. O que deseja fazer?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <Button variant="outline" onClick={handleExitWithoutSave}>
                Sair sem salvar
              </Button>
              <AlertDialogAction onClick={handleExitWithSave}>
                Salvar e sair
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de nota */}
        <BlockNoteDialog
          open={noteDialogOpen}
          onOpenChange={setNoteDialogOpen}
          currentNote={currentNoteValue}
          onSave={handleSaveNote}
        />
      </WorkflowBuilderLayout>
  );
}

export default function BotBuilder() {
  return (
    <ReactFlowProvider>
      <BotBuilderContent />
    </ReactFlowProvider>
  );
}
