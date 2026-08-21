import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/ferramentas/layout/MainLayout";
import { PageHeader } from "@/components/ferramentas/ui/page-header";
import { EmptyState } from "@/components/ferramentas/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ImageZoom } from "@/components/ferramentas/ui/image-zoom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/ferramentas/useAuth";
import { supabase, Tool, Warehouse, Kit, KitTool, ToolType, Profile, Loan } from "@/lib/ferramentas/supabase";
import {
  Wrench,
  Plus,
  Search,
  Edit,
  Trash2,
  Settings,
  BoxesIcon,
  CheckCircle,
  MapPin,
  User,
  Ban,
  RotateCcw,
  ImageOff,
  AlertTriangle,
  Clock,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const toolTypeLabels: Record<ToolType, string> = {
  manual: "Manual",
  eletrica: "Elétrica",
  pneumatica: "Pneumática",
};

const issueTypeLabels: Record<string, string> = {
  manutencao: "Manutenção",
  danificada: "Danificada",
  perdida: "Perdida",
};

interface ActiveLoan extends Loan {
  profiles?: Profile;
}

interface ToolIssue {
  tool_id: string;
  issue_type: string;
  description?: string;
}

export default function ToolsPage() {
  const navigate = useNavigate();
  const { isAdmin, isAlmoxarifado } = useAuth();
  const { toast } = useToast();
  const [tools, setTools] = useState<Tool[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [kitTools, setKitTools] = useState<KitTool[]>([]);
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [toolIssues, setToolIssues] = useState<Map<string, ToolIssue>>(new Map());
  const [pendingRequestTools, setPendingRequestTools] = useState<Map<string, { userName: string; requestId: string }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [issueFilter, setIssueFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");

  // Delete/Deactivate confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toolToDelete, setToolToDelete] = useState<Tool | null>(null);
  const [hasLoanHistory, setHasLoanHistory] = useState(false);
  const [isCheckingHistory, setIsCheckingHistory] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [toolsRes, warehousesRes, kitsRes, kitToolsRes, loansRes, issuesRes, pendingRequestsRes] = await Promise.all([
        supabase.from("ferr_tools").select("*").order("name"),
        supabase.from("ferr_warehouses").select("*").order("name"),
        supabase.from("ferr_kits").select("*").order("name"),
        supabase.from("ferr_kit_tools").select("*"),
        supabase
          .from("ferr_loans")
          .select("*, profiles!loans_user_id_fkey(*)")
          .eq("status", "ativo"),
        supabase
          .from("ferr_return_issues")
          .select("tool_id, issue_type, description")
          .eq("status", "pendente"),
        // Buscar ferramentas com solicitações pendentes
        supabase
          .from("ferr_loan_request_items")
          .select("tool_id, request_id, loan_requests!inner(id, status, user_id, profiles!loan_requests_user_id_fkey(full_name))")
          .in("loan_requests.status", ["pendente", "separando", "pronto"]),
      ]);

      setTools((toolsRes.data as Tool[]) || []);
      setWarehouses((warehousesRes.data as Warehouse[]) || []);
      setKits((kitsRes.data as Kit[]) || []);
      setKitTools((kitToolsRes.data as KitTool[]) || []);
      setActiveLoans((loansRes.data as ActiveLoan[]) || []);
      
      // Mapear ocorrências por ferramenta
      const issuesMap = new Map<string, ToolIssue>();
      (issuesRes.data || []).forEach((issue: any) => {
        issuesMap.set(issue.tool_id, {
          tool_id: issue.tool_id,
          issue_type: issue.issue_type,
          description: issue.description,
        });
      });
      setToolIssues(issuesMap);

      // Mapear solicitações pendentes por ferramenta
      const pendingMap = new Map<string, { userName: string; requestId: string }>();
      (pendingRequestsRes.data || []).forEach((item: any) => {
        pendingMap.set(item.tool_id, {
          userName: item.loan_requests?.profiles?.full_name || "Usuário",
          requestId: item.request_id,
        });
      });
      setPendingRequestTools(pendingMap);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mapa de tool_id -> loan info
  const loanByToolId = new Map<string, ActiveLoan>();
  activeLoans.forEach((loan) => {
    loanByToolId.set(loan.tool_id, loan);
  });

  const isToolLoaned = (toolId: string) => loanByToolId.has(toolId);
  const getLoanInfo = (toolId: string) => loanByToolId.get(toolId);

  const handleOpenForm = (tool?: Tool) => {
    if (tool) {
      // Verifica se a ferramenta está emprestada
      if (isToolLoaned(tool.id)) {
        toast({
          variant: "destructive",
          title: "Não é possível editar",
          description: "Esta ferramenta está emprestada. Aguarde a devolução para editar.",
        });
        return;
      }
      navigate(`/tools/${tool.id}/edit`);
    } else {
      navigate("/ferramentas/tools/new");
    }
  };


  const handleDeleteClick = async (tool: Tool) => {
    // Check if tool is currently loaned
    if (isToolLoaned(tool.id)) {
      toast({
        variant: "destructive",
        title: "Não é possível excluir",
        description: "Esta ferramenta está emprestada. Aguarde a devolução.",
      });
      return;
    }

    setToolToDelete(tool);
    setIsCheckingHistory(true);
    setDeleteDialogOpen(true);

    // Check if tool has any loan history
    const { count } = await supabase
      .from("ferr_loans")
      .select("*", { count: "exact", head: true })
      .eq("tool_id", tool.id);

    setHasLoanHistory((count || 0) > 0);
    setIsCheckingHistory(false);
  };

  const handleConfirmDelete = async () => {
    if (!toolToDelete) return;

    setIsDeleting(true);
    try {
      if (hasLoanHistory) {
        // Deactivate instead of delete
        const { error } = await supabase
          .from("ferr_tools")
          .update({ is_active: false })
          .eq("id", toolToDelete.id);
        if (error) throw error;
        toast({ title: "Ferramenta desativada com sucesso!" });
      } else {
        // Delete completely
        const { error } = await supabase
          .from("ferr_tools")
          .delete()
          .eq("id", toolToDelete.id);
        if (error) throw error;
        toast({ title: "Ferramenta excluída com sucesso!" });
      }
      setDeleteDialogOpen(false);
      setToolToDelete(null);
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReactivateTool = async (tool: Tool) => {
    try {
      const { error } = await supabase
        .from("ferr_tools")
        .update({ is_active: true })
        .eq("id", tool.id);
      if (error) throw error;
      toast({ title: "Ferramenta reativada com sucesso!" });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  // IDs das ferramentas que pertencem a algum kit
  const toolsInKitIds = new Set(kitTools.map((kt) => kt.tool_id));
  
  // Função para obter ferramentas de um kit
  const getKitToolsList = (kitId: string) => {
    const toolIds = kitTools.filter((kt) => kt.kit_id === kitId).map((kt) => kt.tool_id);
    return tools.filter((t) => toolIds.includes(t.id));
  };

  // Verifica se alguma ferramenta do kit está emprestada
  const isKitLoaned = (kitId: string) => {
    const toolIds = kitTools.filter((kt) => kt.kit_id === kitId).map((kt) => kt.tool_id);
    return toolIds.some((id) => isToolLoaned(id));
  };

  // Pega info do primeiro empréstimo do kit
  const getKitLoanInfo = (kitId: string) => {
    const toolIds = kitTools.filter((kt) => kt.kit_id === kitId).map((kt) => kt.tool_id);
    for (const id of toolIds) {
      const loan = getLoanInfo(id);
      if (loan) return loan;
    }
    return null;
  };

  // Filtra TODAS as ferramentas (não separa mais por kit)
  const filteredTools = tools.filter((tool) => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || tool.type === filterType;
    const isActive = (tool as any).is_active !== false;
    
    // Filtro de status (ativas/inativas/todas)
    const matchesStatusFilter = 
      statusFilter === "all" || 
      (statusFilter === "active" && isActive) ||
      (statusFilter === "inactive" && !isActive);
    
    // Filtro de ocorrências
    const toolIssue = toolIssues.get(tool.id);
    const matchesIssueFilter = 
      issueFilter === "all" || 
      (issueFilter === "with_issues" && toolIssue) ||
      (issueFilter === "manutencao" && toolIssue?.issue_type === "manutencao") ||
      (issueFilter === "danificada" && toolIssue?.issue_type === "danificada") ||
      (issueFilter === "perdida" && toolIssue?.issue_type === "perdida");
    
    // Filtro de disponibilidade
    const isLoaned = isToolLoaned(tool.id);
    const hasPendingRequest = pendingRequestTools.has(tool.id);
    const matchesAvailabilityFilter = 
      availabilityFilter === "all" ||
      (availabilityFilter === "available" && !isLoaned && !hasPendingRequest && !toolIssue && !tool.is_maintenance) ||
      (availabilityFilter === "loaned" && isLoaned) ||
      (availabilityFilter === "pending_request" && hasPendingRequest);
    
    return matchesSearch && matchesType && matchesStatusFilter && matchesIssueFilter && matchesAvailabilityFilter;
  });

  // Contagens
  const totalInactive = tools.filter((t) => (t as any).is_active === false).length;
  const totalWithIssues = toolIssues.size;
  const totalPendingRequests = pendingRequestTools.size;
  const totalLoaned = activeLoans.length;

  const canManage = isAdmin || isAlmoxarifado;

  // Componente para renderizar o status da ferramenta
  const ToolStatus = ({ toolId, isMaintenance }: { toolId: string; isMaintenance: boolean }) => {
    const loan = getLoanInfo(toolId);
    const issue = toolIssues.get(toolId);
    
    // Ocorrência pendente tem prioridade
    if (issue) {
      const issueColors: Record<string, string> = {
        manutencao: "bg-blue-500 hover:bg-blue-600",
        danificada: "bg-red-500 hover:bg-red-600",
        perdida: "bg-destructive hover:bg-destructive/90",
      };
      const issueIcons: Record<string, typeof Settings> = {
        manutencao: Settings,
        danificada: AlertTriangle,
        perdida: Ban,
      };
      const IconComponent = issueIcons[issue.issue_type] || AlertTriangle;
      return (
        <Badge className={`gap-1 text-white ${issueColors[issue.issue_type] || "bg-orange-500"}`}>
          <IconComponent className="h-3 w-3" />
          {issueTypeLabels[issue.issue_type] || issue.issue_type}
        </Badge>
      );
    }
    
    if (isMaintenance) {
      return (
        <Badge variant="destructive" className="gap-1">
          <Settings className="h-3 w-3" />
          Manutenção
        </Badge>
      );
    }
    
    if (loan) {
      return (
        <div className="space-y-1">
          <Badge className="gap-1 bg-amber-500 hover:bg-amber-600 text-white">
            <User className="h-3 w-3" />
            Emprestada
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="truncate max-w-[120px]">{loan.profiles?.full_name}</span>
            {loan.profiles?.last_location_lat && (
              <Link
                to={`/tracking?user=${loan.user_id}`}
                className="text-primary hover:underline flex items-center gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <MapPin className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      );
    }

    // Verificar solicitação pendente
    const pendingRequest = pendingRequestTools.get(toolId);
    if (pendingRequest) {
      return (
        <div className="space-y-1">
          <Badge className="gap-1 bg-purple-500 hover:bg-purple-600 text-white">
            <Clock className="h-3 w-3" />
            Solicitação Pendente
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="truncate max-w-[120px]">{pendingRequest.userName}</span>
          </div>
        </div>
      );
    }
    
    return (
      <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
        <CheckCircle className="h-3 w-3" />
        Disponível
      </Badge>
    );
  };

  // Componente para status do kit
  const KitStatus = ({ kitId }: { kitId: string }) => {
    const kitToolsList = getKitToolsList(kitId);
    const hasMaintenanceTool = kitToolsList.some((t) => t.is_maintenance);
    const loanInfo = getKitLoanInfo(kitId);
    
    if (hasMaintenanceTool) {
      return (
        <Badge variant="destructive" className="gap-1">
          <Settings className="h-3 w-3" />
          Manutenção
        </Badge>
      );
    }
    
    if (loanInfo) {
      return (
        <div className="space-y-1">
          <Badge className="gap-1 bg-amber-500 hover:bg-amber-600 text-white">
            <User className="h-3 w-3" />
            Emprestado
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="truncate max-w-[120px]">{loanInfo.profiles?.full_name}</span>
            {loanInfo.profiles?.last_location_lat && (
              <Link
                to={`/tracking?user=${loanInfo.user_id}`}
                className="text-primary hover:underline flex items-center gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <MapPin className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
        <CheckCircle className="h-3 w-3" />
        Disponível
      </Badge>
    );
  };

  return (
    <MainLayout>
      <PageHeader
        title="Ferramentas"
        description="Gerencie o catálogo de ferramentas"
        action={
          canManage && (
            <Button onClick={() => handleOpenForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Ferramenta
            </Button>
          )
        }
      />


      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar ferramentas..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="eletrica">Elétrica</SelectItem>
              <SelectItem value="pneumatica">Pneumática</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Filtro de ocorrências - sempre visível */}
          <Select value={issueFilter} onValueChange={setIssueFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as situações</SelectItem>
              <SelectItem value="with_issues">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                  Com ocorrência {totalWithIssues > 0 && `(${totalWithIssues})`}
                </span>
              </SelectItem>
              <SelectItem value="manutencao">
                <span className="flex items-center gap-1">
                  <Settings className="h-3 w-3 text-blue-500" />
                  Manutenção
                </span>
              </SelectItem>
              <SelectItem value="danificada">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  Danificada
                </span>
              </SelectItem>
              <SelectItem value="perdida">
                <span className="flex items-center gap-1">
                  <Ban className="h-3 w-3 text-destructive" />
                  Perdida
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {/* Filtro de status (ativas/inativas) */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Ativas
                </span>
              </SelectItem>
              <SelectItem value="inactive">
                <span className="flex items-center gap-1">
                  <Ban className="h-3 w-3 text-muted-foreground" />
                  Inativas {totalInactive > 0 && `(${totalInactive})`}
                </span>
              </SelectItem>
              <SelectItem value="all">Todas</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro de disponibilidade */}
          <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Disponibilidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="available">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Disponíveis
                </span>
              </SelectItem>
              <SelectItem value="loaned">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3 text-amber-500" />
                  Emprestadas {totalLoaned > 0 && `(${totalLoaned})`}
                </span>
              </SelectItem>
              <SelectItem value="pending_request">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-purple-500" />
                  Solicitação pendente {totalPendingRequests > 0 && `(${totalPendingRequests})`}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filteredTools.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Nenhuma ferramenta encontrada"
          description={
            tools.length === 0
              ? "Comece cadastrando sua primeira ferramenta"
              : "Tente ajustar os filtros de busca"
          }
          action={
            canManage &&
            tools.length === 0 && (
              <Button onClick={() => handleOpenForm()}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Ferramenta
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {/* Ferramentas */}
            {filteredTools.map((tool) => {
              const loaned = isToolLoaned(tool.id);
              const isInactive = (tool as any).is_active === false;
              const belongsToKit = toolsInKitIds.has(tool.id);
              const kitInfo = belongsToKit 
                ? kits.find(k => kitTools.some(kt => kt.kit_id === k.id && kt.tool_id === tool.id))
                : null;
              return (
                <div
                  key={tool.id}
                  className={`rounded-lg border p-4 ${
                    isInactive
                      ? "border-muted bg-muted/30 opacity-75"
                      : loaned
                      ? "border-amber-500/50 bg-amber-500/10"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail da foto */}
                    <div className="shrink-0">
                      {tool.photo_url ? (
                        <ImageZoom
                          src={tool.photo_url}
                          alt={tool.name}
                          className="h-14 w-14 rounded-lg overflow-hidden"
                          thumbnailClassName="h-14 w-14 object-cover"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
                          <ImageOff className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{tool.name}</p>
                        {isInactive && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Ban className="h-3 w-3" />
                            Desativada
                          </Badge>
                        )}
                        {kitInfo && (
                          <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                            <BoxesIcon className="h-3 w-3 mr-1" />
                            {kitInfo.name}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {toolTypeLabels[tool.type]}
                        </Badge>
                      </div>
                      {!isInactive && (
                        <div className="mt-2">
                          <ToolStatus toolId={tool.id} isMaintenance={tool.is_maintenance} />
                        </div>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {warehouses.find((w) => w.id === tool.warehouse_id)?.name || "Sem almoxarifado"}
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex gap-1 shrink-0">
                        {isInactive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReactivateTool(tool)}
                            className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Reativar
                          </Button>
                        ) : (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleOpenForm(tool)}
                              disabled={loaned}
                              title={loaned ? "Ferramenta emprestada - não é possível editar" : "Editar"}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteClick(tool)}
                                disabled={loaned}
                                title={loaned ? "Ferramenta emprestada - não é possível excluir" : "Excluir"}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Foto</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Almoxarifado</TableHead>
                  <TableHead>Data Compra</TableHead>
                  {canManage && <TableHead className="w-24">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Ferramentas */}
                {filteredTools.map((tool) => {
                  const loaned = isToolLoaned(tool.id);
                  const isInactive = (tool as any).is_active === false;
                  const belongsToKit = toolsInKitIds.has(tool.id);
                  const kitInfo = belongsToKit 
                    ? kits.find(k => kitTools.some(kt => kt.kit_id === k.id && kt.tool_id === tool.id))
                    : null;
                  return (
                    <TableRow
                      key={tool.id}
                      className={
                        isInactive
                          ? "bg-muted/30 opacity-75"
                          : loaned
                          ? "bg-amber-500/10"
                          : ""
                      }
                    >
                      <TableCell>
                        {tool.photo_url ? (
                          <ImageZoom
                            src={tool.photo_url}
                            alt={tool.name}
                            className="h-10 w-10 rounded-lg overflow-hidden"
                            thumbnailClassName="h-10 w-10 object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <ImageOff className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {tool.name}
                          {isInactive && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Ban className="h-3 w-3" />
                              Desativada
                            </Badge>
                          )}
                          {kitInfo && (
                            <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                              <BoxesIcon className="h-3 w-3 mr-1" />
                              {kitInfo.name}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{toolTypeLabels[tool.type]}</Badge>
                      </TableCell>
                      <TableCell>
                        {isInactive ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <ToolStatus toolId={tool.id} isMaintenance={tool.is_maintenance} />
                        )}
                      </TableCell>
                      <TableCell>
                        {warehouses.find((w) => w.id === tool.warehouse_id)?.name || "-"}
                      </TableCell>
                      <TableCell>
                        {tool.purchase_date
                          ? format(new Date(tool.purchase_date), "dd/MM/yyyy", { locale: ptBR })
                          : "-"}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex gap-1">
                            {isInactive ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReactivateTool(tool)}
                                className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                              >
                                <RotateCcw className="h-4 w-4" />
                                Reativar
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenForm(tool)}
                                  disabled={loaned}
                                  title={loaned ? "Ferramenta emprestada - não é possível editar" : "Editar"}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteClick(tool)}
                                    disabled={loaned}
                                    title={loaned ? "Ferramenta emprestada - não é possível excluir" : "Excluir"}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Delete/Deactivate Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isCheckingHistory
                ? "Verificando..."
                : hasLoanHistory
                ? "Desativar ferramenta?"
                : "Excluir ferramenta?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isCheckingHistory ? (
                "Verificando histórico de empréstimos..."
              ) : hasLoanHistory ? (
                <>
                  A ferramenta <strong>{toolToDelete?.name}</strong> possui histórico de
                  empréstimos e não pode ser excluída permanentemente.
                  <br />
                  <br />
                  Ao desativar, ela ficará oculta nas listagens mas o histórico será
                  preservado. Você poderá reativá-la posteriormente.
                </>
              ) : (
                <>
                  Você está prestes a excluir permanentemente a ferramenta{" "}
                  <strong>{toolToDelete?.name}</strong>.
                  <br />
                  <br />
                  Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting || isCheckingHistory}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting || isCheckingHistory}
              className={hasLoanHistory ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              {isDeleting
                ? "Processando..."
                : hasLoanHistory
                ? "Desativar"
                : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
