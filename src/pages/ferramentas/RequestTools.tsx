import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase, Tool, Warehouse, Kit, Profile, ToolType } from "@/lib/supabase";
import { QRScanner } from "@/components/QRScanner";
import { ToolPhotoRecognition } from "@/components/ToolPhotoRecognition";
import { ImageZoom } from "@/components/ui/image-zoom";
import { KitGalleryZoom } from "@/components/ui/kit-gallery-zoom";
import {
  Wrench,
  Plus,
  Search,
  X,
  ShoppingCart,
  Package,
  Send,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  User,
  UserCircle,
  Users,
  QrCode,
  Lock,
  Camera,
  Filter,
  Zap,
  Wind,
  Hand,
  Trash2,
  Sparkles,
  MapPin,
  Clock,
} from "lucide-react";
import { addDays, differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ToolWithKit extends Tool {
  kit?: Kit;
}

interface UserWarehouse {
  warehouse_id: string;
  warehouse?: Warehouse;
}

const dueDateOptions = [
  { value: "1", label: "1 dia" },
  { value: "2", label: "2 dias" },
  { value: "7", label: "7 dias" },
  { value: "10", label: "10 dias" },
  { value: "30", label: "30 dias" },
  { value: "custom", label: "Data específica" },
];

const getSteps = (isAlmoxarifadoOrAdmin: boolean) => {
  const baseSteps = [
    { number: 1, title: "Destinatário", description: "Para quem é a solicitação?" },
    { number: 2, title: "Ferramentas", description: "Escolha as ferramentas" },
    { number: 3, title: "Prazo", description: "Defina o prazo de devolução" },
    { number: 4, title: "Confirmar", description: "Revise e confirme" },
  ];

  // Se for almoxarifado/admin, adiciona etapas de presença e autenticação (mesmo para si mesmo)
  if (isAlmoxarifadoOrAdmin) {
    baseSteps.push({ number: 5, title: "Presença", description: "Confirmação de presença" });
    baseSteps.push({ number: 6, title: "Liberar", description: "Autenticação do operador" });
  }

  return baseSteps;
};

export default function RequestToolsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, isAdmin, isAlmoxarifado, user } = useAuth();
  const { toast } = useToast();
  const [tools, setTools] = useState<ToolWithKit[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [userWarehouses, setUserWarehouses] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [kitTools, setKitTools] = useState<{ kit_id: string; tool_id: string }[]>([]);
  const [activeLoans, setActiveLoans] = useState<string[]>([]);
  const [activeLoanDetails, setActiveLoanDetails] = useState<Record<string, { userId: string; userName: string; dueDate: string }>>({});
  const [pendingRequestToolIds, setPendingRequestToolIds] = useState<string[]>([]);
  const [pendingRequestDetails, setPendingRequestDetails] = useState<Map<string, { userName: string; requestId: string }>>(new Map());
  const [toolsWithIssues, setToolsWithIssues] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [userSearchTerm, setUserSearchTerm] = useState("");

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);

  // Destination user state
  const [isForSelf, setIsForSelf] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Cart state
  const [selectedTools, setSelectedTools] = useState<{ tool: ToolWithKit; isKitItem: boolean }[]>([]);
  const [dueDays, setDueDays] = useState("7");
  const [customDate, setCustomDate] = useState("");
  const [notes, setNotes] = useState("");

  // Authentication state (for operator - quem está fazendo o pedido)
  const [authMode, setAuthMode] = useState<"qr" | "password">("qr");
  const [qrCode, setQrCode] = useState("");
  const [operatorPassword, setOperatorPassword] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Presence state (colaborador está no local?)
  const [isUserPresent, setIsUserPresent] = useState<boolean | null>(null);
  const [mobileCartExpanded, setMobileCartExpanded] = useState(false);

  // Photo recognition state
  const [showPhotoRecognition, setShowPhotoRecognition] = useState(false);

  // Pre-selected tools from assistant
  const [preselectedToolIds, setPreselectedToolIds] = useState<string[]>([]);
  const [preselectedKitIds, setPreselectedKitIds] = useState<string[]>([]);
  const [fromAssistant, setFromAssistant] = useState(false);
  const [skipRecipientStep, setSkipRecipientStep] = useState(false);

  const canManageLoans = isAdmin || isAlmoxarifado;
  const steps = getSteps(canManageLoans);

  // Capturar ferramentas pré-selecionadas do assistente
  useEffect(() => {
    if (location.state?.preselectedToolIds) {
      setPreselectedToolIds(location.state.preselectedToolIds);
      setPreselectedKitIds(location.state.preselectedKitIds || []);
      setFromAssistant(location.state.fromAssistant || false);
      setSkipRecipientStep(location.state.skipRecipientStep || false);
      
      // Se vier do assistente com flag skipRecipientStep, usar usuário logado e ir direto para etapa 2
      if (location.state.skipRecipientStep) {
        setIsForSelf(true);
        setCurrentStep(2); // Ir direto para ferramentas
      } else if (!canManageLoans) {
        setCurrentStep(2); // Usuário comum vai direto para ferramentas
      }
    }
  }, [location.state, canManageLoans]);

  // Refetch data when page is accessed or when returning to it
  useEffect(() => {
    fetchData();
  }, [profile?.id, location.key]);

  const fetchData = async () => {
    if (!profile?.id) return;
    
    try {
      const [toolsRes, warehousesRes, kitsRes, kitToolsRes, loansRes, userWarehousesRes, usersRes, pendingRequestsRes, issuesRes] = await Promise.all([
        supabase.from("tools").select("*").eq("is_active", true).order("name"),
        supabase.from("warehouses").select("*").order("name"),
        supabase.from("kits").select("*").order("name"),
        supabase.from("kit_tools").select("kit_id, tool_id"),
        supabase.from("loans").select("tool_id, due_date, user_id, profiles!loans_user_id_fkey(full_name)").in("status", ["ativo", "vencido", "renovacao_solicitada"]),
        supabase.from("user_warehouses").select("warehouse_id").eq("user_id", profile.id),
        (isAdmin || isAlmoxarifado) 
          ? supabase.from("profiles").select("*").order("full_name")
          : Promise.resolve({ data: [] as Profile[], error: null }),
        supabase
          .from("loan_request_items")
          .select("tool_id, request_id, loan_requests!inner(id, status, user_id, profiles!loan_requests_user_id_fkey(full_name))")
          .in("loan_requests.status", ["pendente", "separando", "pronto"]),
        // Buscar ferramentas com ocorrências pendentes (manutenção, danificada, perdida)
        supabase
          .from("return_issues")
          .select("tool_id")
          .eq("status", "pendente"),
      ]);

      // Ferramentas com ocorrências pendentes
      const issueToolIds = new Set((issuesRes.data || []).map((item: any) => item.tool_id));
      setToolsWithIssues(issueToolIds);

      // Ferramentas que já foram solicitadas por outros (pendentes)
      const pendingToolIds = (pendingRequestsRes.data || []).map((item: any) => item.tool_id);
      setPendingRequestToolIds(pendingToolIds);

      // Mapear detalhes das solicitações pendentes por ferramenta
      const pendingMap = new Map<string, { userName: string; requestId: string }>();
      (pendingRequestsRes.data || []).forEach((item: any) => {
        pendingMap.set(item.tool_id, {
          userName: item.loan_requests?.profiles?.full_name || "Usuário",
          requestId: item.request_id,
        });
      });
      setPendingRequestDetails(pendingMap);

      if (isAdmin || isAlmoxarifado) {
        setAllUsers((usersRes.data as Profile[]) || []);
      }

      const userWarehouseIds = (userWarehousesRes.data || []).map(uw => uw.warehouse_id);
      setUserWarehouses(userWarehouseIds);

      // Filtrar ferramentas pelos almoxarifados do usuário
      const allTools = (toolsRes.data || []) as Tool[];
      const filteredTools = allTools.filter(
        tool => !tool.warehouse_id || userWarehouseIds.length === 0 || userWarehouseIds.includes(tool.warehouse_id)
      );

      const allKits = (kitsRes.data as Kit[]) || [];
      const toolsWithKits = filteredTools.map((tool) => ({
        ...tool,
        kit: allKits.find((k) => k.id === tool.kit_id),
      }));

      setTools(toolsWithKits as ToolWithKit[]);
      
      // Filtrar almoxarifados pelos vínculos do usuário
      const allWarehouses = (warehousesRes.data || []) as Warehouse[];
      const filteredWarehouses = allWarehouses.filter(
        w => userWarehouseIds.length === 0 || userWarehouseIds.includes(w.id)
      );
      setWarehouses(filteredWarehouses);
      
      setKits(allKits);
      setKitTools(kitToolsRes.data || []);
      
      // Processar empréstimos ativos com detalhes
      const loansData = loansRes.data || [];
      setActiveLoans(loansData.map((l: any) => l.tool_id));
      
      const loanDetailsMap: Record<string, { userId: string; userName: string; dueDate: string }> = {};
      loansData.forEach((loan: any) => {
        loanDetailsMap[loan.tool_id] = {
          userId: loan.user_id,
          userName: loan.profiles?.full_name || "Usuário",
          dueDate: loan.due_date,
        };
      });
      setActiveLoanDetails(loanDetailsMap);

      // Adicionar ferramentas pré-selecionadas do assistente (incluindo kits)
      // Usar diretamente do location.state para evitar problemas de timing com setState
      const assistantToolIds = location.state?.preselectedToolIds || [];
      const assistantKitIds = location.state?.preselectedKitIds || [];
      
      if ((assistantToolIds.length > 0 || assistantKitIds.length > 0) && selectedTools.length === 0) {
        const activeToolIds = loansData.map((l: any) => l.tool_id);
        const newItems: { tool: ToolWithKit; isKitItem: boolean }[] = [];
        const addedToolIds = new Set<string>();
        const kitToolsData = kitToolsRes.data || [];

        // Identificar kits a partir das ferramentas sugeridas
        // 1. Verificar se a ferramenta tem kit_id direto
        // 2. Verificar se a ferramenta está vinculada a algum kit via kit_tools
        const toolsFromAssistant = toolsWithKits.filter((t) => assistantToolIds.includes(t.id));
        
        const kitIdsFromKitId = toolsFromAssistant.filter((t) => t.kit_id).map((t) => t.kit_id!);
        const kitIdsFromKitTools = kitToolsData
          .filter((kt: any) => assistantToolIds.includes(kt.tool_id))
          .map((kt: any) => kt.kit_id);
        
        const allKitIds = [...new Set([...assistantKitIds, ...kitIdsFromKitId, ...kitIdsFromKitTools])];

        // Adicionar kits completos
        if (allKitIds.length > 0) {
          for (const kitId of allKitIds) {
            // Buscar todas as ferramentas deste kit via kit_tools
            const kitToolIds = kitToolsData
              .filter((kt: any) => kt.kit_id === kitId)
              .map((kt: any) => kt.tool_id);
            
            const kitToolsList = toolsWithKits.filter((t) => 
              kitToolIds.includes(t.id) && !activeToolIds.includes(t.id)
            );
            
            const kit = allKits.find((k) => k.id === kitId);
            kitToolsList.forEach((tool) => {
              if (!addedToolIds.has(tool.id)) {
                newItems.push({
                  tool: { ...tool, kit } as ToolWithKit,
                  isKitItem: true,
                });
                addedToolIds.add(tool.id);
              }
            });
          }
        }

        // Adicionar ferramentas individuais que não pertencem a nenhum kit
        const kitToolsData2 = kitToolsRes.data || [];
        const allToolsInKits = new Set(kitToolsData2.map((kt: any) => kt.tool_id));
        
        const toolsToPreselect = toolsWithKits.filter((t) => 
          assistantToolIds.includes(t.id) && 
          !activeToolIds.includes(t.id) &&
          !addedToolIds.has(t.id) &&
          !t.kit_id && // Não tem kit_id direto
          !allToolsInKits.has(t.id) // Não está vinculada a nenhum kit via kit_tools
        );
        
        toolsToPreselect.forEach((tool) => {
          newItems.push({
            tool: tool as ToolWithKit,
            isKitItem: false,
          });
        });

        if (newItems.length > 0) {
          setSelectedTools(newItems);
          
          const kitsCount = allKitIds.length;
          const individualToolsCount = toolsToPreselect.length;
          
          let description = "";
          if (kitsCount > 0 && individualToolsCount > 0) {
            description = `${kitsCount} kit(s) e ${individualToolsCount} ferramenta(s) individual(is) adicionada(s)`;
          } else if (kitsCount > 0) {
            description = `${kitsCount} kit(s) adicionado(s) com ${newItems.length} ferramenta(s)`;
          } else {
            description = `${newItems.length} ferramenta(s) pré-selecionada(s)`;
          }
          
          toast({
            title: "Ferramentas do assistente adicionadas",
            description,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTool = (tool: ToolWithKit, skipKitExpansion: boolean = false) => {
    if (selectedTools.some((st) => st.tool.id === tool.id)) {
      return; // Silently skip if already added
    }

    const newItems: { tool: ToolWithKit; isKitItem: boolean }[] = [{ tool, isKitItem: false }];

    if (!skipKitExpansion) {
      // Verificar se a ferramenta pertence a um kit via kit_id OU via kit_tools
      let kitId = tool.kit_id;
      
      // Se não tem kit_id direto, verificar via kit_tools
      if (!kitId) {
        const kitToolEntry = kitTools.find((kt) => kt.tool_id === tool.id);
        if (kitToolEntry) {
          kitId = kitToolEntry.kit_id;
        }
      }

      if (kitId) {
        const kitToolIds = kitTools
          .filter((kt) => kt.kit_id === kitId)
          .map((kt) => kt.tool_id);

        const kitToolsToAdd = tools.filter(
          (t) =>
            kitToolIds.includes(t.id) &&
            t.id !== tool.id &&
            !selectedTools.some((st) => st.tool.id === t.id) &&
            !activeLoans.includes(t.id)
        );

        kitToolsToAdd.forEach((t) => {
          newItems.push({ tool: t as ToolWithKit, isKitItem: true });
        });

        if (kitToolsToAdd.length > 0) {
          const kit = kits.find((k) => k.id === kitId);
          toast({
            title: `Kit "${kit?.name || tool.kit?.name || 'Kit'}" adicionado`,
            description: `${kitToolsToAdd.length + 1} itens adicionados automaticamente`,
          });
        }
      }
    }

    setSelectedTools((prev) => [...prev, ...newItems]);
  };

  const removeTool = (toolId: string) => {
    const toolToRemove = selectedTools.find((st) => st.tool.id === toolId);
    if (!toolToRemove) return;

    // Se a ferramenta faz parte de um kit, remover todo o kit
    if (toolsInKits.has(toolId)) {
      // Encontrar o kit_id desta ferramenta
      const kitToolEntry = kitTools.find((kt) => kt.tool_id === toolId);
      if (kitToolEntry) {
        // Remover todas as ferramentas deste kit
        const kitToolIds = kitTools
          .filter((kt) => kt.kit_id === kitToolEntry.kit_id)
          .map((kt) => kt.tool_id);
        setSelectedTools(selectedTools.filter((st) => !kitToolIds.includes(st.tool.id)));
        
        const kit = kits.find((k) => k.id === kitToolEntry.kit_id);
        toast({
          title: `Kit "${kit?.name || 'Kit'}" removido`,
          description: "Kits devem ser solicitados/removidos por completo",
        });
        return;
      }
    }

    setSelectedTools(selectedTools.filter((st) => st.tool.id !== toolId));
  };

  const addToolsByIds = (toolIds: string[], isKitExpansion: boolean = false) => {
    // Se já veio com expansão de kit do componente, não expandir novamente
    const toolsToAdd = tools.filter((t) => toolIds.includes(t.id) && !selectedTools.some((st) => st.tool.id === t.id));
    
    if (isKitExpansion) {
      // Adicionar todos de uma vez sem expandir novamente
      const newItems = toolsToAdd.map((tool) => ({ tool, isKitItem: false }));
      setSelectedTools((prev) => [...prev, ...newItems]);
    } else {
      // Adicionar com expansão de kit
      toolsToAdd.forEach((tool) => addTool(tool));
    }
  };

  const addKit = (kit: Kit) => {
    // Buscar todas as ferramentas do kit
    const kitToolIds = kitTools.filter((kt) => kt.kit_id === kit.id).map((kt) => kt.tool_id);
    const kitToolsList = tools.filter((t) => kitToolIds.includes(t.id));
    
    if (kitToolsList.length === 0) {
      toast({ variant: "destructive", title: "Kit não possui ferramentas" });
      return;
    }

    // Verificar se alguma ferramenta já está selecionada
    const alreadySelected = kitToolsList.filter((t) => 
      selectedTools.some((st) => st.tool.id === t.id)
    );
    
    if (alreadySelected.length === kitToolsList.length) {
      toast({ variant: "destructive", title: "Kit já adicionado" });
      return;
    }

    // Adicionar todas as ferramentas do kit que ainda não estão selecionadas
    const newItems: { tool: ToolWithKit; isKitItem: boolean }[] = [];
    kitToolsList.forEach((tool) => {
      if (!selectedTools.some((st) => st.tool.id === tool.id)) {
        newItems.push({ 
          tool: { ...tool, kit } as ToolWithKit, 
          isKitItem: true 
        });
      }
    });

    if (newItems.length > 0) {
      setSelectedTools([...selectedTools, ...newItems]);
      toast({
        title: `Kit "${kit.name}" adicionado`,
        description: `${newItems.length} ferramenta(s) adicionada(s)`,
      });
    }
  };

  const verifyOperatorByQR = async (): Promise<boolean> => {
    if (!profile) return false;

    // Verifica se o QR code pertence ao operador logado
    if (profile.qr_code !== qrCode) {
      toast({ variant: "destructive", title: "QR Code não corresponde ao seu usuário" });
      return false;
    }
    return true;
  };

  const verifyOperatorByPassword = async (): Promise<boolean> => {
    if (!user || !operatorPassword) return false;

    setIsVerifying(true);
    try {
      const response = await supabase.functions.invoke("verify-user-password", {
        body: {
          user_id: user.id,
          password: operatorPassword,
          allow_admin_override: true,
        },
      });

      if (response.error) {
        toast({ variant: "destructive", title: "Erro ao verificar senha" });
        return false;
      }

      if (!response.data?.valid) {
        toast({ variant: "destructive", title: response.data?.error || "Senha incorreta" });
        return false;
      }

      if (response.data?.verified_by === "admin") {
        toast({ title: "Verificado com senha de administrador" });
      }

      return true;
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao verificar senha" });
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedTools.length === 0) {
      toast({ variant: "destructive", title: "Selecione pelo menos uma ferramenta" });
      return;
    }

    const targetUserId = isForSelf ? profile?.id : selectedUserId;
    if (!targetUserId) {
      toast({ variant: "destructive", title: "Selecione um usuário" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Pegar o warehouse da primeira ferramenta selecionada
      const warehouseId = selectedTools[0].tool.warehouse_id;

      // Se for almoxarifado/admin e o usuário está presente → cria empréstimo direto
      // Caso contrário (usuário não presente) → cria solicitação para retirada posterior
      const shouldCreateDirectLoan = canManageLoans && isUserPresent === true;

      if (shouldCreateDirectLoan) {
        const dueDate = dueDays === "custom" && customDate
          ? new Date(customDate)
          : addDays(new Date(), parseInt(dueDays));

        const loanPromises = selectedTools.map((st) =>
          supabase.from("loans").insert({
            tool_id: st.tool.id,
            user_id: targetUserId,
            warehouse_id: warehouseId || warehouses[0]?.id,
            registered_by: profile?.id,
            due_date: dueDate.toISOString(),
            notes: notes || null,
          })
        );

        await Promise.all(loanPromises);

        toast({
          title: "Empréstimo realizado!",
          description: "Ferramentas entregues com sucesso",
        });
      } else {
        // Cria solicitação normal (para si mesmo OU usuário não está presente)
        const { data: request, error: requestError } = await supabase
          .from("loan_requests")
          .insert({
            user_id: targetUserId,
            warehouse_id: warehouseId,
            due_days: parseInt(dueDays),
            custom_due_date: dueDays === "custom" && customDate ? new Date(customDate).toISOString() : null,
            notes: notes || null,
          })
          .select()
          .single();

        if (requestError) throw requestError;

        // Adicionar itens
        const items = selectedTools.map((st) => ({
          request_id: request.id,
          tool_id: st.tool.id,
          is_kit_item: st.isKitItem,
        }));

        const { error: itemsError } = await supabase
          .from("loan_request_items")
          .insert(items);

        if (itemsError) throw itemsError;

        let message = "Aguarde a separação pelo almoxarifado";
        if (canManageLoans && isUserPresent === false) {
          message = isForSelf 
            ? `Solicitação criada. Finalize na tela "Processar Solicitações" quando vier retirar.`
            : `Solicitação criada para ${selectedUser?.full_name}. Finalize na tela "Processar Solicitações" quando o colaborador chegar.`;
        }

        toast({
          title: "Solicitação criada!",
          description: message,
        });
      }

      navigate("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmit = async () => {
    // Se for almoxarifado/admin, sempre verifica autenticação do operador
    if (canManageLoans) {
      const isVerified = authMode === "qr"
        ? await verifyOperatorByQR()
        : await verifyOperatorByPassword();

      if (!isVerified) return;
    }

    await handleSubmit();
  };

  const typeLabels: Record<string, { label: string; icon: typeof Wrench }> = {
    manual: { label: "Manual", icon: Hand },
    eletrica: { label: "Elétrica", icon: Zap },
    pneumatica: { label: "Pneumática", icon: Wind },
  };

  // IDs de ferramentas que pertencem a algum kit
  const toolsInKits = useMemo(() => {
    return new Set(kitTools.map((kt) => kt.tool_id));
  }, [kitTools]);

  // Ferramentas disponíveis para solicitação individual:
  // - Ferramentas marcadas como "Não faz parte de kit" (requires_kit = true)
  // - OU ferramentas que não estão vinculadas a nenhum kit (órfãs)
  // - Ferramentas com requires_kit = false E vinculadas a kit devem ser solicitadas através de kits
  // - Não emprestadas e não selecionadas
  const availableTools = useMemo(() => {
    return tools.filter(
      (t) =>
        !activeLoans.includes(t.id) &&
        !selectedTools.some((st) => st.tool.id === t.id) &&
        !pendingRequestToolIds.includes(t.id) &&
        !toolsWithIssues.has(t.id) && // Ferramentas com ocorrências pendentes não podem ser solicitadas
        !t.is_maintenance && // Ferramentas em manutenção não podem ser solicitadas
        // Mostrar se: requires_kit = true OU não está vinculada a nenhum kit
        (t.requires_kit === true || !toolsInKits.has(t.id)) &&
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (typeFilter === "all" || t.type === typeFilter)
    );
  }, [tools, activeLoans, selectedTools, pendingRequestToolIds, toolsWithIssues, toolsInKits, searchTerm, typeFilter]);

  // Kits disponíveis (todos os itens do kit disponíveis e sem ocorrências)
  const availableKits = useMemo(() => {
    return kits.filter((kit) => {
      // Buscar todas as ferramentas do kit
      const kitToolIds = kitTools.filter((kt) => kt.kit_id === kit.id).map((kt) => kt.tool_id);
      const kitToolsList = tools.filter((t) => kitToolIds.includes(t.id));
      
      // Verificar se o kit já foi selecionado (todas as ferramentas do kit estão selecionadas)
      const allSelected = kitToolsList.length > 0 && kitToolsList.every((t) => 
        selectedTools.some((st) => st.tool.id === t.id)
      );
      if (allSelected) return false;
      
      // Verificar se alguma ferramenta do kit está emprestada
      const anyBorrowed = kitToolsList.some((t) => activeLoans.includes(t.id));
      if (anyBorrowed) return false;
      
      // Verificar se alguma ferramenta do kit tem ocorrência pendente (manutenção/danificada/perdida)
      const anyWithIssue = kitToolsList.some((t) => toolsWithIssues.has(t.id));
      if (anyWithIssue) return false;
      
      // Verificar se o kit está ativo e tem ferramentas
      if (!kit.is_active || kitToolsList.length === 0) return false;
      
      // Filtro de busca
      if (searchTerm && !kit.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      
      return true;
    });
  }, [kits, kitTools, tools, activeLoans, selectedTools, toolsWithIssues, searchTerm]);

  // Ferramentas emprestadas (para visualização)
  // Mostrar TODAS as ferramentas emprestadas, incluindo itens de kit, para o usuário ver o que está em uso
  const borrowedTools = useMemo(() => {
    return tools.filter(
      (t) =>
        activeLoans.includes(t.id) &&
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (typeFilter === "all" || t.type === typeFilter)
    );
  }, [tools, activeLoans, searchTerm, typeFilter]);

  // Ferramentas com solicitação pendente (para visualização)
  const pendingRequestTools = useMemo(() => {
    return tools.filter(
      (t) =>
        pendingRequestToolIds.includes(t.id) &&
        !activeLoans.includes(t.id) && // Não mostrar se já está emprestada
        !toolsWithIssues.has(t.id) && // Não mostrar se tem ocorrência
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (typeFilter === "all" || t.type === typeFilter)
    );
  }, [tools, pendingRequestToolIds, activeLoans, toolsWithIssues, searchTerm, typeFilter]);

  // Ferramentas com ocorrências pendentes (danificada, perdida)
  const issueTools = useMemo(() => {
    return tools.filter(
      (t) =>
        toolsWithIssues.has(t.id) &&
        !t.is_maintenance && // Não duplicar com maintenanceTools
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (typeFilter === "all" || t.type === typeFilter)
    );
  }, [tools, toolsWithIssues, searchTerm, typeFilter]);

  // Ferramentas em manutenção (is_maintenance = true)
  const maintenanceTools = useMemo(() => {
    return tools.filter(
      (t) =>
        t.is_maintenance === true &&
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (typeFilter === "all" || t.type === typeFilter)
    );
  }, [tools, searchTerm, typeFilter]);

  // Helper para calcular dias restantes
  const getDaysRemaining = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    return days;
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      u.id !== profile?.id &&
      u.full_name.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const selectedUser = allUsers.find((u) => u.id === selectedUserId);

  // Group selected tools by kit
  const groupedSelectedTools = useMemo(() => {
    const groups: Record<string, { tool: ToolWithKit; isKitItem: boolean }[]> = {};
    const standalone: { tool: ToolWithKit; isKitItem: boolean }[] = [];

    selectedTools.forEach((item) => {
      if (item.tool.kit_id && item.tool.kit) {
        const kitName = item.tool.kit.name;
        if (!groups[kitName]) groups[kitName] = [];
        groups[kitName].push(item);
      } else {
        standalone.push(item);
      }
    });

    return { groups, standalone };
  }, [selectedTools]);

  const canGoNext = () => {
    if (currentStep === 1) {
      return isForSelf || selectedUserId !== null;
    }
    if (currentStep === 2) return selectedTools.length > 0;
    if (currentStep === 3) return dueDays !== "custom" || (dueDays === "custom" && customDate);
    if (currentStep === 5 && canManageLoans) {
      return isUserPresent !== null;
    }
    return true;
  };

  const getDueDate = () => {
    if (dueDays === "custom" && customDate) {
      return new Date(customDate).toLocaleDateString("pt-BR");
    }
    const date = new Date();
    date.setDate(date.getDate() + parseInt(dueDays));
    return date.toLocaleDateString("pt-BR");
  };

  const progressValue = (currentStep / steps.length) * 100;
  const canSubmitAuth = authMode === "qr" ? qrCode.length > 0 : operatorPassword.length >= 6;
  const isLastStep = currentStep === steps.length;
  // Etapa 6 é sempre autenticação (para si mesmo ou para terceiros)
  const needsAuth = canManageLoans && currentStep === 6;
  // Etapa 5 é sempre presença (para si mesmo ou para terceiros)
  const isPresenceStep = canManageLoans && currentStep === 5;

  return (
    <MainLayout>
      <PageHeader
        title="Solicitar Ferramentas"
        description={steps[currentStep - 1]?.description || ""}
      />

      {/* Banner do assistente */}
      {fromAssistant && selectedTools.length > 0 && (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">Ferramentas do Assistente:</span>
              <span className="text-muted-foreground">
                {selectedTools.length} ferramenta(s) pré-selecionada(s). 
                Adicione mais itens ou siga para definir o prazo.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Bar */}
      <div className="mb-4 sm:mb-6 overflow-hidden">
        <div className="flex justify-between mb-2 gap-0 pb-1 sm:pb-0">
          {steps.map((step) => (
            <div
              key={step.number}
              className={`flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm min-w-0 ${
                step.number === currentStep
                  ? "text-primary font-medium"
                  : step.number < currentStep
                  ? "text-muted-foreground"
                  : "text-muted-foreground/50"
              }`}
            >
              <div
                className={`flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full text-[10px] sm:text-xs font-medium shrink-0 ${
                  step.number < currentStep
                    ? "bg-primary text-primary-foreground"
                    : step.number === currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.number < currentStep ? (
                  <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                ) : (
                  step.number
                )}
              </div>
              <span className="hidden lg:inline truncate">{step.title}</span>
            </div>
          ))}
        </div>
        <Progress value={progressValue} className="h-1.5 sm:h-2" />
      </div>

      {/* Step 1: Destinatário */}
      {currentStep === 1 && (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Para quem é a solicitação?
              </CardTitle>
              <CardDescription>
                Selecione se é para você ou para outro colaborador
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card
                  className={`cursor-pointer transition-all ${
                    isForSelf
                      ? "border-primary ring-2 ring-primary/20"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => {
                    setIsForSelf(true);
                    setSelectedUserId(null);
                  }}
                >
                  <CardContent className="flex flex-col items-center gap-3 p-6">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full ${
                      isForSelf ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      <User className="h-8 w-8" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Para mim</p>
                      <p className="text-sm text-muted-foreground">
                        Solicitar ferramentas para uso próprio
                      </p>
                    </div>
                    {isForSelf && (
                      <Badge variant="default" className="mt-2">
                        <Check className="mr-1 h-3 w-3" />
                        Selecionado
                      </Badge>
                    )}
                  </CardContent>
                </Card>

                {canManageLoans && (
                  <Card
                    className={`cursor-pointer transition-all ${
                      !isForSelf
                        ? "border-primary ring-2 ring-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setIsForSelf(false)}
                  >
                    <CardContent className="flex flex-col items-center gap-3 p-6">
                      <div className={`flex h-16 w-16 items-center justify-center rounded-full ${
                        !isForSelf ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}>
                        <Users className="h-8 w-8" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium">Para outro usuário</p>
                        <p className="text-sm text-muted-foreground">
                          Empréstimo direto no balcão
                        </p>
                      </div>
                      {!isForSelf && (
                        <Badge variant="default" className="mt-2">
                          <Check className="mr-1 h-3 w-3" />
                          Selecionado
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Lista de usuários quando seleciona "Para outro usuário" */}
              {!isForSelf && canManageLoans && (
                <div className="mt-6 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar colaborador..."
                      className="pl-10"
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                    />
                  </div>

                  <ScrollArea className="h-[250px]">
                    <div className="space-y-2 pr-4">
                      {filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <Users className="h-10 w-10 text-muted-foreground/50" />
                          <p className="mt-2 text-sm text-muted-foreground">
                            Nenhum colaborador encontrado
                          </p>
                        </div>
                      ) : (
                        filteredUsers.map((u) => (
                          <Card
                            key={u.id}
                            className={`cursor-pointer transition-colors ${
                              selectedUserId === u.id
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted/50"
                            }`}
                            onClick={() => setSelectedUserId(u.id)}
                          >
                            <CardContent className="flex items-center gap-3 p-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                <User className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{u.full_name}</p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {u.email}
                                </p>
                              </div>
                              {selectedUserId === u.id && (
                                <Check className="h-5 w-5 text-primary shrink-0" />
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Select Tools */}
      {currentStep === 2 && (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Lista de ferramentas disponíveis */}
          <div className="lg:col-span-3 space-y-3 sm:space-y-4 pb-32 lg:pb-0 min-w-0">
            {/* Photo Recognition */}
            {showPhotoRecognition ? (
              <ToolPhotoRecognition
                tools={tools}
                activeLoans={activeLoans}
                pendingRequestToolIds={pendingRequestToolIds}
                selectedToolIds={selectedTools.map((st) => st.tool.id)}
                kitTools={kitTools}
                onAddTools={addToolsByIds}
                onClose={() => setShowPhotoRecognition(false)}
              />
            ) : (
              <Button
                variant="outline"
                className="w-full h-10 sm:h-14 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-xs sm:text-sm flex-shrink-0"
                onClick={() => setShowPhotoRecognition(true)}
              >
                <Sparkles className="mr-1.5 sm:mr-2 h-4 w-4 text-primary" />
                <span className="text-primary">Identificar por foto (IA)</span>
              </Button>
            )}

            <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-semibold">Ferramentas Disponíveis</span>
                </div>
                {/* Filters */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      className="pl-9 h-9 sm:h-10 bg-background text-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-24 sm:w-[180px] h-9 sm:h-10 bg-background text-xs sm:text-sm">
                      <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground sm:hidden" />
                      <Filter className="h-4 w-4 mr-2 text-muted-foreground hidden sm:inline" />
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="manual">
                        <span className="flex items-center gap-2">
                          <Hand className="h-4 w-4" /> Manual
                        </span>
                      </SelectItem>
                      <SelectItem value="eletrica">
                        <span className="flex items-center gap-2">
                          <Zap className="h-4 w-4" /> Elétrica
                        </span>
                      </SelectItem>
                      <SelectItem value="pneumatica">
                        <span className="flex items-center gap-2">
                          <Wind className="h-4 w-4" /> Pneumática
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Active filters indicator */}
                {(searchTerm || typeFilter !== "all") && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Filtros:</span>
                    {searchTerm && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        "{searchTerm}"
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-destructive" 
                          onClick={() => setSearchTerm("")}
                        />
                      </Badge>
                    )}
                    {typeFilter !== "all" && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        {typeLabels[typeFilter]?.label || typeFilter}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-destructive" 
                          onClick={() => setTypeFilter("all")}
                        />
                      </Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs px-2"
                      onClick={() => { setSearchTerm(""); setTypeFilter("all"); }}
                    >
                      Limpar todos
                    </Button>
                  </div>
                )}

                {/* Tools list */}
                {isLoading ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                    ))}
                  </div>
                ) : userWarehouses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                      <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Você não tem almoxarifados vinculados.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Entre em contato com o administrador.
                    </p>
                  </div>
                ) : availableTools.length === 0 && availableKits.length === 0 && borrowedTools.length === 0 && pendingRequestTools.length === 0 && issueTools.length === 0 && maintenanceTools.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Wrench className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm || typeFilter !== "all" 
                        ? "Nenhuma ferramenta encontrada com esses filtros" 
                        : "Todas ferramentas foram adicionadas"}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2">
                      {availableKits.length > 0 && `${availableKits.length} kit(s) • `}
                      {availableTools.length} disponível(is)
                      {borrowedTools.length > 0 && ` • ${borrowedTools.length} emprestada(s)`}
                      {pendingRequestTools.length > 0 && ` • ${pendingRequestTools.length} pendente(s)`}
                      {issueTools.length > 0 && ` • ${issueTools.length} ocorrência(s)`}
                      {maintenanceTools.length > 0 && ` • ${maintenanceTools.length} manutenção`}
                    </div>
                    <div className="lg:h-[420px] lg:overflow-y-auto lg:pr-2 overflow-hidden">
                      <div className="grid gap-2 w-full overflow-hidden">
                        {/* Kits disponíveis */}
                        {availableKits.map((kit) => {
                          const kitToolIds = kitTools.filter((kt) => kt.kit_id === kit.id).map((kt) => kt.tool_id);
                          const kitToolsCount = kitToolIds.length;
                          const kitToolsList = tools.filter((t) => kitToolIds.includes(t.id));
                          const firstToolWithPhoto = kitToolsList.find((t) => t.photo_url);
                          
                          return (
                            <div
                              key={`kit-${kit.id}`}
                              className="group flex items-center gap-2 sm:gap-3 rounded-lg bg-primary/10 p-2.5 sm:p-3 cursor-pointer transition-all hover:bg-primary/20 active:scale-[0.98] overflow-hidden"
                              onClick={() => addKit(kit)}
                            >
                              {firstToolWithPhoto ? (
                                <KitGalleryZoom
                                  kitName={kit.name}
                                  tools={kitToolsList.map((t) => ({
                                    id: t.id,
                                    name: t.name,
                                    photo_url: t.photo_url,
                                    type: t.type,
                                  }))}
                                  trigger={
                                    <div className="relative shrink-0 h-10 w-10 rounded-lg overflow-hidden cursor-zoom-in group/thumb">
                                      <img
                                        src={firstToolWithPhoto.photo_url!}
                                        alt={kit.name}
                                        className="h-10 w-10 object-cover transition-transform group-hover/thumb:scale-110"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/thumb:bg-black/30 transition-colors">
                                        <Package className="h-4 w-4 text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity drop-shadow-lg" />
                                      </div>
                                      <div className="absolute -bottom-0.5 -right-0.5 bg-primary text-primary-foreground rounded-full h-4 w-4 flex items-center justify-center text-[9px] font-bold shadow">
                                        {kitToolsCount}
                                      </div>
                                    </div>
                                  }
                                />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                  <Package className="h-5 w-5" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="flex items-start gap-1 sm:gap-2 min-w-0">
                                  <p className="text-xs sm:text-sm font-medium leading-tight line-clamp-2 min-w-0">{kit.name}</p>
                                  <Badge variant="secondary" className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0 h-4 shrink-0 bg-primary/20 text-primary whitespace-nowrap">
                                    {kitToolsCount} itens
                                  </Badge>
                                </div>
                                {kit.description && (
                                  <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate mt-0.5 max-w-full">
                                    {kit.description}
                                  </p>
                                )}
                              </div>
                              <Plus className="h-4 w-4 text-primary group-hover:scale-110 transition-transform shrink-0" />
                            </div>
                          );
                        })}

                        {/* Separador entre kits e ferramentas */}
                        {availableKits.length > 0 && availableTools.length > 0 && (
                          <div className="col-span-full my-2 flex items-center gap-2">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider whitespace-nowrap shrink-0">
                              Ferramentas Individuais
                            </span>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                        )}

                        {/* Ferramentas disponíveis */}
                        {availableTools.map((tool) => {
                          const toolWarehouse = warehouses.find(w => w.id === tool.warehouse_id);
                          const TypeIcon = typeLabels[tool.type]?.icon || Wrench;
                          const isAlreadyRequested = pendingRequestToolIds.includes(tool.id);
                          return (
                            <div
                              key={tool.id}
                              className={`group flex items-center gap-2 sm:gap-3 rounded-lg p-2.5 sm:p-3 cursor-pointer transition-all hover:bg-accent active:scale-[0.98] overflow-hidden ${
                                isAlreadyRequested ? "bg-warning/10" : "bg-muted/50"
                              }`}
                              onClick={() => addTool(tool)}
                            >
                              {tool.photo_url ? (
                                <div 
                                  className="shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ImageZoom
                                    src={tool.photo_url}
                                    alt={tool.name}
                                    className="h-10 w-10 rounded-lg overflow-hidden"
                                    thumbnailClassName="h-10 w-10 object-cover"
                                  />
                                </div>
                              ) : (
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                                  isAlreadyRequested ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
                                }`}>
                                  <TypeIcon className="h-5 w-5" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="flex items-start gap-1 sm:gap-2 min-w-0">
                                  <p className="text-xs sm:text-sm font-medium leading-tight line-clamp-2 min-w-0">{tool.name}</p>
                                  {isAlreadyRequested && (
                                    <Badge variant="warning" className="text-[9px] px-1.5 py-0 h-4 shrink-0 whitespace-nowrap">
                                      Já solicitada
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1">
                                  <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">
                                    {typeLabels[tool.type]?.label}
                                  </span>
                                  {tool.kit && (
                                    <>
                                      <span className="text-muted-foreground/30">•</span>
                                      <span className="text-[9px] sm:text-[10px] text-primary/80 flex items-center gap-0.5">
                                        <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                        Kit
                                      </span>
                                    </>
                                  )}
                                  {toolWarehouse && (
                                    <>
                                      <span className="text-muted-foreground/30 hidden sm:inline">•</span>
                                      <span className="text-[10px] text-muted-foreground truncate max-w-[60px] hidden sm:inline">
                                        {toolWarehouse.name}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                            </div>
                          );
                        })}

                        {/* Separador visual se houver ferramentas emprestadas */}
                        {borrowedTools.length > 0 && availableTools.length > 0 && (
                          <div className="col-span-full my-2 flex items-center gap-2">
                            <div className="flex-1 h-px bg-amber-300/50" />
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider whitespace-nowrap shrink-0">
                              Emprestadas
                            </span>
                            <div className="flex-1 h-px bg-amber-300/50" />
                          </div>
                        )}

                        {/* Ferramentas emprestadas */}
                        {borrowedTools.map((tool) => {
                          const toolWarehouse = warehouses.find(w => w.id === tool.warehouse_id);
                          const TypeIcon = typeLabels[tool.type]?.icon || Wrench;
                          const loanDetails = activeLoanDetails[tool.id];
                          const daysRemaining = loanDetails ? getDaysRemaining(loanDetails.dueDate) : 0;
                          const isOverdue = daysRemaining < 0;
                          
                          return (
                            <div
                              key={tool.id}
                              className="flex items-center gap-2 sm:gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 p-2.5 sm:p-3 cursor-not-allowed opacity-80 overflow-hidden"
                            >
                              {tool.photo_url ? (
                                <div className="shrink-0">
                                  <ImageZoom
                                    src={tool.photo_url}
                                    alt={tool.name}
                                    className="h-10 w-10 rounded-lg overflow-hidden"
                                    thumbnailClassName="h-10 w-10 object-cover opacity-70"
                                  />
                                </div>
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                  <TypeIcon className="h-5 w-5" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <p className="text-xs sm:text-sm font-medium line-clamp-2 leading-tight text-amber-900 dark:text-amber-200 min-w-0">{tool.name}</p>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {loanDetails && (
                                    <>
                                      <span 
                                        className="text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-0.5 cursor-pointer hover:underline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/tracking?userId=${loanDetails.userId}`);
                                        }}
                                        title="Ver localização do usuário"
                                      >
                                        <User className="h-3 w-3" />
                                        {loanDetails.userName}
                                        <MapPin className="h-3 w-3 ml-0.5" />
                                      </span>
                                      <span className="text-amber-400">•</span>
                                    </>
                                  )}
                                  <span className={`text-[10px] flex items-center gap-0.5 ${
                                    isOverdue 
                                      ? "text-destructive font-medium" 
                                      : "text-amber-600 dark:text-amber-400"
                                  }`}>
                                    <Clock className="h-3 w-3" />
                                    {isOverdue 
                                      ? `${Math.abs(daysRemaining)} dia(s) em atraso`
                                      : daysRemaining === 0
                                        ? "Devolução hoje"
                                        : `${daysRemaining} dia(s) restante(s)`
                                    }
                                  </span>
                                  {toolWarehouse && (
                                    <>
                                      <span className="text-amber-400">•</span>
                                      <span className="text-[10px] text-amber-600 dark:text-amber-400 truncate max-w-[60px]">
                                        {toolWarehouse.name}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[9px] border-amber-400 text-amber-600 dark:text-amber-400 shrink-0">
                                Em uso
                              </Badge>
                            </div>
                          );
                        })}

                        {/* Separador visual se houver ferramentas com solicitação pendente */}
                        {pendingRequestTools.length > 0 && (availableTools.length > 0 || borrowedTools.length > 0) && (
                          <div className="col-span-full my-2 flex items-center gap-2">
                            <div className="flex-1 h-px bg-purple-300/50" />
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium uppercase tracking-wider whitespace-nowrap shrink-0">
                              Solicitação Pendente
                            </span>
                            <div className="flex-1 h-px bg-purple-300/50" />
                          </div>
                        )}

                        {/* Ferramentas com solicitação pendente */}
                        {pendingRequestTools.map((tool) => {
                          const toolWarehouse = warehouses.find(w => w.id === tool.warehouse_id);
                          const TypeIcon = typeLabels[tool.type]?.icon || Wrench;
                          const requestDetails = pendingRequestDetails.get(tool.id);
                          
                          return (
                            <div
                              key={tool.id}
                              className="flex items-center gap-2 sm:gap-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 p-2.5 sm:p-3 cursor-not-allowed opacity-80 overflow-hidden"
                            >
                              {tool.photo_url ? (
                                <div className="shrink-0">
                                  <ImageZoom
                                    src={tool.photo_url}
                                    alt={tool.name}
                                    className="h-10 w-10 rounded-lg overflow-hidden"
                                    thumbnailClassName="h-10 w-10 object-cover opacity-70"
                                  />
                                </div>
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                                  <TypeIcon className="h-5 w-5" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs sm:text-sm font-medium line-clamp-2 leading-tight text-purple-900 dark:text-purple-200 min-w-0">{tool.name}</p>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {requestDetails && (
                                    <>
                                      <span className="text-[10px] text-purple-700 dark:text-purple-300 flex items-center gap-0.5">
                                        <User className="h-3 w-3" />
                                        Solicitado por: {requestDetails.userName}
                                      </span>
                                    </>
                                  )}
                                  {toolWarehouse && (
                                    <>
                                      <span className="text-purple-400">•</span>
                                      <span className="text-[10px] text-purple-600 dark:text-purple-400 truncate max-w-[60px]">
                                        {toolWarehouse.name}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[9px] border-purple-400 text-purple-600 dark:text-purple-400 shrink-0">
                                Pendente
                              </Badge>
                            </div>
                          );
                        })}

                        {/* Separador visual se houver ferramentas com ocorrências */}
                        {issueTools.length > 0 && (availableTools.length > 0 || borrowedTools.length > 0 || pendingRequestTools.length > 0) && (
                          <div className="col-span-full my-2 flex items-center gap-2">
                            <div className="flex-1 h-px bg-red-300/50" />
                            <span className="text-[10px] text-red-600 dark:text-red-400 font-medium uppercase tracking-wider whitespace-nowrap shrink-0">
                              Com Ocorrência
                            </span>
                            <div className="flex-1 h-px bg-red-300/50" />
                          </div>
                        )}

                        {/* Ferramentas com ocorrências (manutenção, danificada, perdida) */}
                        {issueTools.map((tool) => {
                          const toolWarehouse = warehouses.find(w => w.id === tool.warehouse_id);
                          const TypeIcon = typeLabels[tool.type]?.icon || Wrench;
                          
                          return (
                            <div
                              key={tool.id}
                              className="flex items-center gap-2 sm:gap-3 rounded-lg bg-red-50 dark:bg-red-950/20 p-2.5 sm:p-3 cursor-not-allowed opacity-80 overflow-hidden"
                            >
                              {tool.photo_url ? (
                                <div className="shrink-0">
                                  <ImageZoom
                                    src={tool.photo_url}
                                    alt={tool.name}
                                    className="h-10 w-10 rounded-lg overflow-hidden"
                                    thumbnailClassName="h-10 w-10 object-cover opacity-70"
                                  />
                                </div>
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                  <TypeIcon className="h-5 w-5" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs sm:text-sm font-medium line-clamp-2 leading-tight text-red-900 dark:text-red-200 min-w-0">{tool.name}</p>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <span className="text-[10px] text-red-700 dark:text-red-300 flex items-center gap-0.5">
                                    <AlertTriangle className="h-3 w-3" />
                                    Possui ocorrência pendente
                                  </span>
                                  {toolWarehouse && (
                                    <>
                                      <span className="text-red-400">•</span>
                                      <span className="text-[10px] text-red-600 dark:text-red-400 truncate max-w-[60px]">
                                        {toolWarehouse.name}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[9px] border-red-400 text-red-600 dark:text-red-400 shrink-0">
                                Ocorrência
                              </Badge>
                            </div>
                          );
                        })}

                        {/* Separador visual se houver ferramentas em manutenção */}
                        {maintenanceTools.length > 0 && (availableTools.length > 0 || borrowedTools.length > 0 || pendingRequestTools.length > 0 || issueTools.length > 0) && (
                          <div className="col-span-full my-2 flex items-center gap-2">
                            <div className="flex-1 h-px bg-orange-300/50" />
                            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wider whitespace-nowrap shrink-0">
                              Em Manutenção
                            </span>
                            <div className="flex-1 h-px bg-orange-300/50" />
                          </div>
                        )}

                        {/* Ferramentas em manutenção */}
                        {maintenanceTools.map((tool) => {
                          const toolWarehouse = warehouses.find(w => w.id === tool.warehouse_id);
                          const TypeIcon = typeLabels[tool.type]?.icon || Wrench;
                          
                          return (
                            <div
                              key={tool.id}
                              className="flex items-center gap-2 sm:gap-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 p-2.5 sm:p-3 cursor-not-allowed opacity-80 overflow-hidden"
                            >
                              {tool.photo_url ? (
                                <div className="shrink-0">
                                  <ImageZoom
                                    src={tool.photo_url}
                                    alt={tool.name}
                                    className="h-10 w-10 rounded-lg overflow-hidden"
                                    thumbnailClassName="h-10 w-10 object-cover opacity-70"
                                  />
                                </div>
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                                  <TypeIcon className="h-5 w-5" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs sm:text-sm font-medium line-clamp-2 leading-tight text-orange-900 dark:text-orange-200 min-w-0">{tool.name}</p>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <span className="text-[10px] text-orange-700 dark:text-orange-300 flex items-center gap-0.5">
                                    <Wrench className="h-3 w-3" />
                                    Em manutenção
                                  </span>
                                  {toolWarehouse && (
                                    <>
                                      <span className="text-orange-400">•</span>
                                      <span className="text-[10px] text-orange-600 dark:text-orange-400 truncate max-w-[60px]">
                                        {toolWarehouse.name}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[9px] border-orange-400 text-orange-600 dark:text-orange-400 shrink-0">
                                Manutenção
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
            </div>
          </div>

          {/* Carrinho / Selecionados - Desktop */}
          <div className="hidden lg:block lg:col-span-2 space-y-4">
            <Card className="border-primary/20 shadow-sm sticky top-4">
              <CardHeader className="pb-3 border-b bg-primary/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    {isForSelf ? "Sua Solicitação" : "Itens Selecionados"}
                  </CardTitle>
                  <Badge variant="default" className="font-mono">
                    {selectedTools.length}
                  </Badge>
                </div>
                {!isForSelf && selectedUser && (
                  <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-background/80 border">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-sm truncate">{selectedUser.full_name}</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-4">
                {selectedTools.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Nenhum item selecionado
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique nas ferramentas ao lado para adicionar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ScrollArea className="h-[320px] lg:h-[380px]">
                      <div className="space-y-4 pr-4">
                        {/* Kits agrupados */}
                        {Object.entries(groupedSelectedTools.groups).map(([kitName, items]) => (
                          <div key={kitName} className="space-y-1.5">
                            <div className="flex items-center gap-2 px-1">
                              <Package className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                                {kitName}
                              </span>
                              <Badge variant="outline" className="text-[10px] h-5">
                                {items.length} itens
                              </Badge>
                            </div>
                            <div className="space-y-1 pl-1 border-l-2 border-primary/20 ml-1.5">
                              {items.map(({ tool }) => {
                                const TypeIcon = typeLabels[tool.type]?.icon || Wrench;
                                return (
                                  <div
                                    key={tool.id}
                                    className="flex items-center gap-2 rounded-md bg-muted/50 p-2 ml-2"
                                  >
                                    <TypeIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-sm flex-1 truncate">{tool.name}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => removeTool(tool.id)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        {/* Ferramentas avulsas */}
                        {groupedSelectedTools.standalone.length > 0 && (
                          <div className="space-y-1.5">
                            {Object.keys(groupedSelectedTools.groups).length > 0 && (
                              <div className="flex items-center gap-2 px-1">
                                <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  Ferramentas Avulsas
                                </span>
                                <Badge variant="outline" className="text-[10px] h-5">
                                  {groupedSelectedTools.standalone.length}
                                </Badge>
                              </div>
                            )}
                            <div className="space-y-1">
                              {groupedSelectedTools.standalone.map(({ tool }) => {
                                const TypeIcon = typeLabels[tool.type]?.icon || Wrench;
                                return (
                                  <div
                                    key={tool.id}
                                    className="flex items-center gap-2 rounded-md border bg-background p-2"
                                  >
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/10">
                                      <TypeIcon className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm truncate">{tool.name}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {typeLabels[tool.type]?.label}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => removeTool(tool.id)}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Clear all button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setSelectedTools([])}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Limpar tudo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Carrinho Mobile - Barra flutuante com navegação */}
          <div className="lg:hidden fixed bottom-0 left-0 md:left-64 right-0 z-40 bg-background border-t shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]">
            {/* Cart content */}
            {selectedTools.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-2 px-4 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span className="text-sm">Toque nas ferramentas para adicionar</span>
              </div>
            ) : (
              <div className="px-3 pt-2">
                {/* Header - always visible, clickable to expand */}
                <button
                  className="w-full flex items-center justify-between"
                  onClick={() => setMobileCartExpanded(!mobileCartExpanded)}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {selectedTools.length}
                    </div>
                    <span className="text-sm font-medium">
                      {selectedTools.length === 1 ? "1 ferramenta" : `${selectedTools.length} ferramentas`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:bg-destructive/10"
                      onClick={(e) => { e.stopPropagation(); setSelectedTools([]); setMobileCartExpanded(false); }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Limpar
                    </Button>
                    <div className={`transition-transform duration-200 ${mobileCartExpanded ? "rotate-180" : ""}`}>
                      <ArrowRight className="h-4 w-4 -rotate-90" />
                    </div>
                  </div>
                </button>

                {/* Expanded list */}
                {mobileCartExpanded && (
                  <div className="mt-2 border-t pt-2 max-h-[40vh] overflow-y-auto space-y-1.5">
                    {selectedTools.map(({ tool, isKitItem }) => {
                      const TypeIcon = typeLabels[tool.type]?.icon || Wrench;
                      return (
                        <div key={tool.id} className="flex items-center gap-2 rounded-md bg-muted/50 p-2">
                          {tool.photo_url ? (
                            <img src={tool.photo_url} alt={tool.name} className="h-8 w-8 rounded object-cover shrink-0" />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10">
                              <TypeIcon className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium line-clamp-1">{tool.name}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-muted-foreground">{typeLabels[tool.type]?.label}</span>
                              {isKitItem && (
                                <>
                                  <span className="text-muted-foreground/30">•</span>
                                  <span className="text-[9px] text-primary">Kit</span>
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeTool(tool.id)}
                            className="shrink-0 p-1 rounded-full hover:bg-destructive/10"
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Nav buttons always below cart */}
            <div className="flex justify-between gap-3 px-3 py-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Voltar
              </Button>
              <Button
                size="sm"
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canGoNext()}
              >
                Próximo
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Due Date */}
      {currentStep === 3 && (
        <div className="max-w-lg mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Prazo de Devolução
              </CardTitle>
              <CardDescription>
                Selecione por quanto tempo as ferramentas serão necessárias
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {dueDateOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={dueDays === opt.value ? "default" : "outline"}
                    className="h-auto py-3"
                    onClick={() => setDueDays(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>

              {dueDays === "custom" && (
                <div className="space-y-2 pt-4">
                  <Label>Selecione a data</Label>
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
              )}

              <div className="space-y-2 pt-4">
                <Label>Observações (opcional)</Label>
                <Textarea
                  placeholder="Motivo da solicitação ou observações..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Confirm */}
      {currentStep === 4 && (
        <div className="max-w-lg mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Confirmar {canManageLoans && !isForSelf ? "Empréstimo" : "Solicitação"}
              </CardTitle>
              <CardDescription>
                Revise os detalhes antes de {canManageLoans && !isForSelf ? "liberar" : "enviar"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Destinatário */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Destinatário</h4>
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm flex-1">
                    {isForSelf ? profile?.full_name : selectedUser?.full_name}
                  </span>
                  <Badge variant={isForSelf ? "secondary" : "default"}>
                    {isForSelf ? "Você" : "Empréstimo Direto"}
                  </Badge>
                </div>
              </div>

              {/* Ferramentas */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Ferramentas ({selectedTools.length})
                </h4>
                <div className="space-y-2">
                  {selectedTools.map(({ tool, isKitItem }) => (
                    <div key={tool.id} className="flex items-center gap-2 rounded-lg border p-3">
                      <Wrench className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm flex-1">{tool.name}</span>
                      {isKitItem && (
                        <Badge variant="outline" className="text-xs">Kit</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Prazo */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Prazo de Devolução</h4>
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm">{getDueDate()}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {dueDays === "custom" ? "Data específica" : `${dueDays} dia(s)`}
                  </Badge>
                </div>
              </div>

              {/* Observações */}
              {notes && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Observações</h4>
                  <div className="rounded-lg border p-3 text-sm">{notes}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 5: Presença (para todos os empréstimos de almoxarifado/admin) */}
      {currentStep === 5 && canManageLoans && (
        <div className="max-w-lg mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Confirmação de Presença
              </CardTitle>
              <CardDescription>
                {isForSelf 
                  ? "Você está pronto para retirar as ferramentas agora?"
                  : <>O colaborador <strong>{selectedUser?.full_name}</strong> está presente no local de retirada?</>
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card
                  className={`cursor-pointer transition-all ${
                    isUserPresent === true
                      ? "border-green-500 ring-2 ring-green-500/20 bg-green-500/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setIsUserPresent(true)}
                >
                  <CardContent className="flex flex-col items-center gap-3 p-6">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full ${
                      isUserPresent === true ? "bg-green-500 text-white" : "bg-muted"
                    }`}>
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{isForSelf ? "Sim, retirar agora" : "Sim, está presente"}</p>
                      <p className="text-sm text-muted-foreground">
                        Entregar ferramentas agora
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all ${
                    isUserPresent === false
                      ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setIsUserPresent(false)}
                >
                  <CardContent className="flex flex-col items-center gap-3 p-6">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full ${
                      isUserPresent === false ? "bg-amber-500 text-white" : "bg-muted"
                    }`}>
                      <AlertCircle className="h-7 w-7" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{isForSelf ? "Não, retirar depois" : "Não está presente"}</p>
                      <p className="text-sm text-muted-foreground">
                        Criar solicitação para retirada posterior
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {isUserPresent === false && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-sm text-amber-700">
                    <strong>Atenção:</strong> Será criada uma solicitação que aparecerá em "Processar Solicitações" 
                    {isForSelf ? " quando você vier buscar as ferramentas." : " quando o colaborador vier buscar as ferramentas."}
                  </p>
                </div>
              )}

              {isUserPresent === true && (
                <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
                  <p className="text-sm text-green-700">
                    <strong>Próximo passo:</strong> Você precisará confirmar sua identidade para liberar o empréstimo.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 6: Authentication (para todos os empréstimos diretos) */}
      {currentStep === 6 && canManageLoans && (
        <div className="max-w-lg mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Autenticação do Operador
              </CardTitle>
              <CardDescription>
                Confirme sua identidade para liberar o empréstimo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-sm font-medium">Liberando para:</p>
                <p className="text-sm text-muted-foreground">{isForSelf ? profile?.full_name : selectedUser?.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedTools.length} ferramenta(s)</p>
              </div>

              <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as "qr" | "password")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="qr">
                    <QrCode className="mr-2 h-4 w-4" />
                    QR Code
                  </TabsTrigger>
                  <TabsTrigger value="password">
                    <Lock className="mr-2 h-4 w-4" />
                    Senha
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="qr" className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Escaneie seu QR Code de funcionário para confirmar
                  </p>
                  {showScanner ? (
                    <QRScanner
                      onScan={(result) => {
                        setQrCode(result);
                        setShowScanner(false);
                      }}
                      onClose={() => setShowScanner(false)}
                    />
                  ) : (
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowScanner(true)}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Abrir Câmera
                      </Button>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">ou digite</span>
                        </div>
                      </div>
                      <Input
                        placeholder="Código QR..."
                        value={qrCode}
                        onChange={(e) => setQrCode(e.target.value)}
                      />
                    </div>
                  )}
                  {qrCode && (
                    <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3">
                      <p className="text-sm text-green-600">QR Code capturado ✓</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="password" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Senha do usuário ou administrador</Label>
                    <Input
                      type="password"
                      placeholder="Digite a senha"
                      value={operatorPassword}
                      onChange={(e) => setOperatorPassword(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use a senha do próprio usuário ou de qualquer administrador
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Buttons - Sticky (hidden on step 2 mobile, shown in cart instead) */}
      <div className={`sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t pt-3 pb-3 mt-6 z-50 ${currentStep === 2 ? 'hidden lg:block' : ''}`}>
        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (currentStep === 1) {
                navigate("/");
              } else {
                setCurrentStep(currentStep - 1);
              }
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {currentStep === 1 ? "Cancelar" : "Voltar"}
          </Button>

          {/* Lógica de botão de próximo/finalizar */}
          {isPresenceStep && isUserPresent === false ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? "Criando..." : "Criar Solicitação"}
            </Button>
          ) : isPresenceStep && isUserPresent === true ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canGoNext()}
            >
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : currentStep < steps.length ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canGoNext()}
            >
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : needsAuth ? (
            <Button
              onClick={handleFinalSubmit}
              disabled={isSubmitting || isVerifying || !canSubmitAuth}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {isSubmitting || isVerifying ? "Processando..." : "Liberar Empréstimo"}
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? "Enviando..." : "Enviar Solicitação"}
            </Button>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
