import { useEffect, useState } from "react";
import { MainLayout } from "@/components/ferramentas/layout/MainLayout";
import { PageHeader } from "@/components/ferramentas/ui/page-header";
import { EmptyState } from "@/components/ferramentas/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/ferramentas/useAuth";
import { supabase, Profile, Tool, Warehouse } from "@/lib/ferramentas/supabase";
import { QRScanner } from "@/components/ferramentas/QRScanner";
import {
  Package,
  Search,
  QrCode,
  CheckCircle,
  Clock,
  User,
  AlertCircle,
  Wrench,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDot,
  Lock,
  Camera,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { addDays } from "date-fns";

interface KitToolRelation {
  kit_id: string;
  tool_id: string;
}

interface RequestItem {
  id: string;
  tool_id: string;
  is_kit_item: boolean;
  tools?: Tool;
}

interface LoanRequest {
  id: string;
  user_id: string;
  warehouse_id: string;
  status: string;
  due_days: number;
  custom_due_date: string | null;
  notes: string | null;
  created_at: string;
  profiles?: Profile;
  warehouses?: Warehouse;
  items?: RequestItem[];
}

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  separando: "Separando",
  pronto: "Pronto p/ Retirada",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  separando: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  pronto: "bg-green-500/10 text-green-600 border-green-500/20",
  entregue: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  cancelado: "bg-red-500/10 text-red-600 border-red-500/20",
};

const STEPS = [
  { id: 1, title: "Selecionar", description: "Escolha a solicitação" },
  { id: 2, title: "Separar", description: "Marque os itens separados" },
  { id: 3, title: "Confirmar", description: "Revise os itens" },
  { id: 4, title: "Entregar", description: "Autenticação do usuário" },
];

export default function ProcessRequestsPage() {
  const { profile, isAdmin, isAlmoxarifado } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<LoanRequest[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Stepper state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(null);
  const [separatedItems, setSeparatedItems] = useState<Set<string>>(new Set());
  const [unavailableToolIds, setUnavailableToolIds] = useState<Set<string>>(new Set());
  const [toolsWithIssues, setToolsWithIssues] = useState<Set<string>>(new Set());
  const [kitToolsMap, setKitToolsMap] = useState<Map<string, string>>(new Map()); // tool_id -> kit_id

  // Authentication state
  const [authMode, setAuthMode] = useState<"qr" | "password">("qr");
  const [qrCode, setQrCode] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<LoanRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [requestsRes, usersRes] = await Promise.all([
        supabase
          .from("ferr_loan_requests")
          .select("*, profiles!loan_requests_user_id_fkey(*), warehouses(*)")
          .in("status", ["pendente", "separando", "pronto"])
          .order("created_at", { ascending: false }),
        supabase.from("ferr_profiles").select("*").order("full_name"),
      ]);

      const requestsWithItems = await Promise.all(
        (requestsRes.data || []).map(async (req) => {
          const { data: items } = await supabase
            .from("ferr_loan_request_items")
            .select("*, tools(*)")
            .eq("request_id", req.id);
          return { ...req, items: items || [] };
        })
      );

      setRequests(requestsWithItems as LoanRequest[]);
      setUsers((usersRes.data as Profile[]) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetFlow = () => {
    setCurrentStep(1);
    setSelectedRequest(null);
    setSeparatedItems(new Set());
    setQrCode("");
    setUserPassword("");
    setAuthMode("qr");
  };

  const handleSelectRequest = async (request: LoanRequest) => {
    setSelectedRequest(request);
    
    // Verifica quais ferramentas ainda estão disponíveis (não emprestadas e sem ocorrências)
    const toolIds = request.items?.map((item) => item.tool_id) || [];
    
    const [activeLoansRes, kitToolsRes, issuesRes] = await Promise.all([
      supabase
        .from("ferr_loans")
        .select("tool_id")
        .in("tool_id", toolIds)
        .in("status", ["ativo", "vencido", "renovacao_solicitada"]),
      supabase
        .from("ferr_kit_tools")
        .select("kit_id, tool_id")
        .in("tool_id", toolIds),
      supabase
        .from("ferr_return_issues")
        .select("tool_id")
        .in("tool_id", toolIds)
        .eq("status", "pendente"),
    ]);
    
    // Combina ferramentas emprestadas E com ocorrências pendentes como indisponíveis
    const loanedToolIds = new Set((activeLoansRes.data || []).map((l) => l.tool_id));
    const issueToolIds = new Set((issuesRes.data || []).map((i: any) => i.tool_id));
    const unavailable = new Set([...loanedToolIds, ...issueToolIds]);
    setUnavailableToolIds(unavailable);
    setToolsWithIssues(issueToolIds);
    
    // Cria mapa de tool_id -> kit_id para agrupar itens de kit
    const ktMap = new Map<string, string>();
    (kitToolsRes.data || []).forEach((kt) => {
      ktMap.set(kt.tool_id, kt.kit_id);
    });
    setKitToolsMap(ktMap);
    
    // Marca apenas os itens disponíveis como separados
    const availableItemIds = new Set(
      request.items
        ?.filter((item) => !unavailable.has(item.tool_id))
        .map((item) => item.id) || []
    );
    setSeparatedItems(availableItemIds);
    setCurrentStep(2);
  };

  const toggleItem = (itemId: string) => {
    if (!selectedRequest?.items) return;
    
    const clickedItem = selectedRequest.items.find((i) => i.id === itemId);
    if (!clickedItem) return;
    
    // Se o item faz parte de um kit, seleciona/desmarca todos os itens do mesmo kit
    const kitId = kitToolsMap.get(clickedItem.tool_id);
    const itemsToToggle = kitId
      ? selectedRequest.items.filter(
          (i) => kitToolsMap.get(i.tool_id) === kitId && !unavailableToolIds.has(i.tool_id)
        )
      : [clickedItem];
    
    setSeparatedItems((prev) => {
      const newSet = new Set(prev);
      const isCurrentlySelected = newSet.has(itemId);
      
      itemsToToggle.forEach((item) => {
        if (isCurrentlySelected) {
          newSet.delete(item.id);
        } else {
          newSet.add(item.id);
        }
      });
      
      return newSet;
    });
  };

  const verifyUserByQR = async (): Promise<boolean> => {
    if (!selectedRequest) return false;

    const user = users.find((u) => u.qr_code === qrCode);
    if (!user) {
      toast({ variant: "destructive", title: "QR Code não encontrado" });
      return false;
    }
    if (user.id !== selectedRequest.user_id) {
      toast({ variant: "destructive", title: "QR Code não pertence ao solicitante" });
      return false;
    }
    return true;
  };

  const verifyUserByPassword = async (): Promise<boolean> => {
    if (!selectedRequest || !userPassword) return false;

    setIsVerifying(true);
    try {
      const response = await supabase.functions.invoke("verify-user-password", {
        body: {
          user_id: selectedRequest.user_id,
          password: userPassword,
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

  const handleDeliver = async () => {
    if (!selectedRequest) return;

    // Verify user identity
    const isVerified = authMode === "qr" 
      ? await verifyUserByQR() 
      : await verifyUserByPassword();

    if (!isVerified) return;

    setIsProcessing(true);
    try {
      const dueDate = selectedRequest.custom_due_date
        ? new Date(selectedRequest.custom_due_date)
        : addDays(new Date(), selectedRequest.due_days);

      const itemsToDeliver = selectedRequest.items?.filter((item) =>
        separatedItems.has(item.id)
      );

      const loanPromises = (itemsToDeliver || []).map((item) =>
        supabase.from("ferr_loans").insert({
          tool_id: item.tool_id,
          user_id: selectedRequest.user_id,
          warehouse_id: selectedRequest.warehouse_id,
          registered_by: profile?.id,
          due_date: dueDate.toISOString(),
          notes: selectedRequest.notes,
        })
      );

      await Promise.all(loanPromises);

      await supabase
        .from("ferr_loan_requests")
        .update({
          status: "entregue",
          processed_by: profile?.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      toast({ title: "Ferramentas entregues com sucesso!" });
      resetFlow();
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRequest = (request: LoanRequest, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setRequestToDelete(request);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteRequest = async () => {
    if (!requestToDelete) return;

    setIsDeleting(true);
    try {
      // First delete the items related to this request
      await supabase
        .from("ferr_loan_request_items")
        .delete()
        .eq("request_id", requestToDelete.id);

      // Then delete the request itself
      const { error } = await supabase
        .from("ferr_loan_requests")
        .delete()
        .eq("id", requestToDelete.id);

      if (error) throw error;

      toast({ title: "Solicitação excluída com sucesso!" });
      setDeleteDialogOpen(false);
      setRequestToDelete(null);
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir a solicitação",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.items?.some((item) =>
        item.tools?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    return matchesSearch;
  });

  const canManage = isAdmin || isAlmoxarifado;

  if (!canManage) {
    return (
      <MainLayout>
        <EmptyState
          icon={Package}
          title="Acesso Restrito"
          description="Apenas administradores e almoxarifes podem processar solicitações"
        />
      </MainLayout>
    );
  }

  const separatedItemsList = selectedRequest?.items?.filter((item) =>
    separatedItems.has(item.id)
  );

  const canSubmit = authMode === "qr" ? qrCode.length > 0 : userPassword.length >= 6;

  return (
    <MainLayout>
      <PageHeader
        title="Processar Solicitações"
        description="Gerencie as solicitações de empréstimo"
      />

      {/* Stepper */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                    currentStep > step.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : currentStep === step.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/30 text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="h-4 w-4" />
                  ) : currentStep === step.id ? (
                    <CircleDot className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                <div className="mt-1 text-center hidden sm:block">
                  <p
                    className={`text-xs font-medium ${
                      currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </p>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    currentStep > step.id ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Selecionar Solicitação */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuário ou ferramenta..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhuma solicitação pendente"
              description="As solicitações de empréstimo aparecem aqui"
            />
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <Card
                  key={request.id}
                  className="cursor-pointer transition-colors hover:bg-accent/50"
                  onClick={() => handleSelectRequest(request)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="font-medium truncate">
                          {request.profiles?.full_name}
                        </span>
                        <Badge className={`shrink-0 text-xs ${statusColors[request.status]}`}>
                          {statusLabels[request.status]}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{request.items?.length || 0} itens</span>
                        <span>•</span>
                        <span>{request.warehouses?.name}</span>
                        <span>•</span>
                        <span>
                          {format(new Date(request.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => handleDeleteRequest(request, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Separar Itens */}
      {currentStep === 2 && selectedRequest && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {selectedRequest.profiles?.full_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.warehouses?.name} • {selectedRequest.due_days} dias
                  </p>
                </div>
                <Badge className={statusColors[selectedRequest.status]}>
                  {statusLabels[selectedRequest.status]}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          <div className="space-y-2">
            {unavailableToolIds.size > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-3">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive">
                  {unavailableToolIds.size} ferramenta(s) indisponível(is): 
                  {toolsWithIssues.size > 0 && ` ${toolsWithIssues.size} com ocorrência pendente`}
                  {toolsWithIssues.size > 0 && (unavailableToolIds.size - toolsWithIssues.size) > 0 && ","}
                  {(unavailableToolIds.size - toolsWithIssues.size) > 0 && ` ${unavailableToolIds.size - toolsWithIssues.size} já emprestada(s)`}
                </p>
              </div>
            )}
            {selectedRequest.items?.some((item) => kitToolsMap.has(item.tool_id)) && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-3">
                <Package className="h-4 w-4 text-blue-600 shrink-0" />
                <p className="text-sm text-blue-600">
                  Itens de kit são selecionados em conjunto e não podem ser desmarcados individualmente.
                </p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Marque os itens separados ({separatedItems.size}/{(selectedRequest.items?.length || 0) - unavailableToolIds.size} disponíveis)
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const availableItems = selectedRequest.items?.filter(
                    (item) => !unavailableToolIds.has(item.tool_id)
                  ) || [];
                  if (separatedItems.size === availableItems.length) {
                    setSeparatedItems(new Set());
                  } else {
                    setSeparatedItems(new Set(availableItems.map((item) => item.id)));
                  }
                }}
              >
                {separatedItems.size === (selectedRequest.items?.filter(
                  (item) => !unavailableToolIds.has(item.tool_id)
                ).length || 0)
                  ? "Desmarcar Todos"
                  : "Marcar Todos"}
              </Button>
            </div>

            <div className="space-y-2">
              {selectedRequest.items?.map((item) => {
                const isUnavailable = unavailableToolIds.has(item.tool_id);
                const hasIssue = toolsWithIssues.has(item.tool_id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      isUnavailable
                        ? "border-destructive/30 bg-destructive/5 opacity-60 cursor-not-allowed"
                        : separatedItems.has(item.id)
                        ? "border-primary bg-primary/5 cursor-pointer"
                        : "border-border cursor-pointer"
                    }`}
                    onClick={() => !isUnavailable && toggleItem(item.id)}
                  >
                    <Checkbox
                      checked={!isUnavailable && separatedItems.has(item.id)}
                      onCheckedChange={() => !isUnavailable && toggleItem(item.id)}
                      disabled={isUnavailable}
                    />
                    <Wrench className={`h-4 w-4 ${isUnavailable ? "text-destructive/50" : "text-muted-foreground"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium truncate ${isUnavailable ? "line-through text-muted-foreground" : ""}`}>
                          {item.tools?.name}
                        </p>
                        {hasIssue && (
                          <Badge variant="destructive" className="shrink-0 text-[10px] px-1.5 py-0 h-4">
                            Ocorrência
                          </Badge>
                        )}
                        {isUnavailable && !hasIssue && (
                          <Badge variant="destructive" className="shrink-0 text-[10px] px-1.5 py-0 h-4">
                            Emprestada
                          </Badge>
                        )}
                      </div>
                      {item.tools?.serial_number && (
                        <p className="text-xs text-muted-foreground">
                          SN: {item.tools.serial_number}
                        </p>
                      )}
                    </div>
                    {item.is_kit_item && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        Kit
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* Step 3: Confirmar Itens */}
      {currentStep === 3 && selectedRequest && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resumo da Entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedRequest.profiles?.full_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Prazo: {selectedRequest.due_days} dias</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>{selectedRequest.warehouses?.name}</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Itens a entregar ({separatedItemsList?.length || 0})
            </p>
            <div className="rounded-lg border divide-y">
              {separatedItemsList?.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{item.tools?.name}</p>
                    {item.tools?.serial_number && (
                      <p className="text-xs text-muted-foreground">
                        SN: {item.tools.serial_number}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Step 4: Autenticação do Usuário */}
      {currentStep === 4 && selectedRequest && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Confirmar Identidade</CardTitle>
              <p className="text-sm text-muted-foreground">
                O usuário deve mostrar seu QR Code ou digitar sua senha para confirmar o recebimento
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-sm font-medium text-muted-foreground">Solicitante</p>
                <p className="text-lg font-medium">{selectedRequest.profiles?.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.profiles?.email}</p>
              </div>

              <Tabs
                value={authMode}
                onValueChange={(v) => {
                  setAuthMode(v as "qr" | "password");
                  setQrCode("");
                  setUserPassword("");
                }}
              >
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
                  <div className="space-y-2">
                    <Label>Escaneie o QR Code do usuário</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Digite ou escaneie o QR Code"
                        value={qrCode}
                        onChange={(e) => setQrCode(e.target.value)}
                        autoFocus
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowScanner(true)}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div
                    className="cursor-pointer rounded-lg border border-dashed p-6 text-center transition-colors hover:bg-muted/50"
                    onClick={() => setShowScanner(true)}
                  >
                    <Camera className="mx-auto h-16 w-16 text-muted-foreground/30" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Toque para abrir a câmera
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="password" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Senha do usuário ou administrador</Label>
                    <Input
                      type="password"
                      placeholder="Digite a senha"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      autoFocus
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

      {/* Navigation Buttons - Sticky */}
      {currentStep > 1 && (
        <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t pt-3 pb-3 mt-6 z-50">
          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => {
                if (currentStep === 2) resetFlow();
                else if (currentStep === 3) setCurrentStep(2);
                else if (currentStep === 4) setCurrentStep(3);
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>

            {currentStep === 4 ? (
              <Button
                onClick={handleDeliver}
                disabled={isProcessing || isVerifying || !canSubmit}
                className="flex-1"
              >
                {isVerifying ? "Verificando..." : isProcessing ? "Processando..." : "Confirmar Entrega"}
                <CheckCircle className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="flex-1"
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={currentStep === 2 && separatedItems.size === 0}
              >
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScan={(result) => setQrCode(result)}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir solicitação?</AlertDialogTitle>
            <AlertDialogDescription>
              {requestToDelete && (
                <>
                  Você está prestes a excluir a solicitação de{" "}
                  <strong>{requestToDelete.profiles?.full_name}</strong> com{" "}
                  <strong>{requestToDelete.items?.length || 0} itens</strong>.
                  <br />
                  <br />
                  Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRequest}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
