import { useEffect, useState } from "react";
import { MainLayout } from "@/components/ferramentas/layout/MainLayout";
import { PageHeader } from "@/components/ferramentas/ui/page-header";
import { EmptyState } from "@/components/ferramentas/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/ferramentas/useAuth";
import { supabase, Profile, Tool, Loan, Kit } from "@/lib/ferramentas/supabase";
import { 
  CalendarClock, 
  Check, 
  X, 
  Clock, 
  Wrench,
  User,
  Calendar,
  MessageSquare,
  Package,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LoanRenewal {
  id: string;
  loan_id: string;
  requested_by: string;
  new_due_date: string;
  reason: string | null;
  status: "pendente" | "aprovada" | "rejeitada";
  request_date: string;
  approval_date: string | null;
  approved_by: string | null;
  loans?: Loan & {
    tools?: Tool;
    profiles?: Profile;
  };
  requester?: Profile;
}

type FilterType = "all" | "pendente" | "aprovada" | "rejeitada";

export default function LoanRenewalsPage() {
  const { isAdmin, isAlmoxarifado, profile } = useAuth();
  const { toast } = useToast();
  const [renewals, setRenewals] = useState<LoanRenewal[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [kitTools, setKitTools] = useState<{ kit_id: string; tool_id: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("pendente");
  const [selectedRenewal, setSelectedRenewal] = useState<LoanRenewal | null>(null);
  const [selectedGroupRenewals, setSelectedGroupRenewals] = useState<LoanRenewal[]>([]);
  const [selectedGroupKitName, setSelectedGroupKitName] = useState<string | null>(null);
  const [expandedKits, setExpandedKits] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const isStaff = isAdmin || isAlmoxarifado;

  useEffect(() => {
    fetchRenewals();
    fetchKitsAndTools();
  }, []);

  const fetchKitsAndTools = async () => {
    const [kitsRes, kitToolsRes] = await Promise.all([
      supabase.from("ferr_kits").select("*"),
      supabase.from("ferr_kit_tools").select("kit_id, tool_id"),
    ]);
    setKits((kitsRes.data as Kit[]) || []);
    setKitTools(kitToolsRes.data || []);
  };

  const fetchRenewals = async () => {
    try {
      const { data, error } = await supabase
        .from("ferr_loan_renewals")
        .select(`
          *,
          loans!inner(*, tools(*), profiles!loans_user_id_fkey(*)),
          requester:profiles!loan_renewals_requested_by_fkey(*)
        `)
        .order("request_date", { ascending: false });

      if (error) throw error;
      setRenewals((data as LoanRenewal[]) || []);
    } catch (error) {
      console.error("Error fetching renewals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Encontrar todas as renovações pendentes do mesmo kit
  const getKitRenewals = async (renewal: LoanRenewal): Promise<LoanRenewal[]> => {
    const tool = renewal.loans?.tools;
    if (!tool?.kit_id) {
      return [renewal];
    }

    // Buscar todas as ferramentas do mesmo kit
    const { data: kitTools } = await supabase
      .from("ferr_kit_tools")
      .select("tool_id")
      .eq("kit_id", tool.kit_id);

    if (!kitTools || kitTools.length === 0) {
      return [renewal];
    }

    const kitToolIds = kitTools.map((kt) => kt.tool_id);

    // Buscar renovações pendentes do mesmo usuário para ferramentas do kit
    const pendingKitRenewals = renewals.filter(
      (r) =>
        r.status === "pendente" &&
        r.requested_by === renewal.requested_by &&
        r.loans?.tools &&
        kitToolIds.includes(r.loans.tools.id)
    );

    return pendingKitRenewals.length > 0 ? pendingKitRenewals : [renewal];
  };

  const handleApprove = async () => {
    if (!selectedRenewal || !profile) return;

    setIsProcessing(true);
    try {
      // Buscar todas as renovações do kit
      const kitRenewals = await getKitRenewals(selectedRenewal);
      const isKit = kitRenewals.length > 1;

      // Atualizar todas as solicitações de renovação do kit
      for (const renewal of kitRenewals) {
        const { error: renewalError } = await supabase
          .from("ferr_loan_renewals")
          .update({
            status: "aprovada",
            approved_by: profile.id,
            approval_date: new Date().toISOString(),
          })
          .eq("id", renewal.id);

        if (renewalError) throw renewalError;

        // Atualizar a data de vencimento do empréstimo
        const { error: loanError } = await supabase
          .from("ferr_loans")
          .update({
            due_date: renewal.new_due_date,
            status: "ativo",
          })
          .eq("id", renewal.loan_id);

        if (loanError) throw loanError;
      }

      // Criar notificação para o usuário
      await supabase.from("ferr_notifications").insert({
        user_id: selectedRenewal.requested_by,
        loan_id: selectedRenewal.loan_id,
        title: "Prorrogação Aprovada",
        message: isKit 
          ? `Sua solicitação de prorrogação do kit foi aprovada. Nova data de devolução: ${format(new Date(selectedRenewal.new_due_date), "dd/MM/yyyy", { locale: ptBR })}`
          : `Sua solicitação de prorrogação foi aprovada. Nova data de devolução: ${format(new Date(selectedRenewal.new_due_date), "dd/MM/yyyy", { locale: ptBR })}`,
        type: "success",
      });

      toast({ 
        title: isKit 
          ? `${kitRenewals.length} prorrogações do kit aprovadas!` 
          : "Prorrogação aprovada com sucesso!" 
      });
      setSelectedRenewal(null);
      fetchRenewals();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRenewal || !profile) return;

    setIsProcessing(true);
    try {
      // Buscar todas as renovações do kit
      const kitRenewals = await getKitRenewals(selectedRenewal);
      const isKit = kitRenewals.length > 1;

      // Atualizar todas as solicitações de renovação do kit
      for (const renewal of kitRenewals) {
        const { error: renewalError } = await supabase
          .from("ferr_loan_renewals")
          .update({
            status: "rejeitada",
            approved_by: profile.id,
            approval_date: new Date().toISOString(),
          })
          .eq("id", renewal.id);

        if (renewalError) throw renewalError;

        // Voltar status do empréstimo para ativo
        const { error: loanError } = await supabase
          .from("ferr_loans")
          .update({ status: "ativo" })
          .eq("id", renewal.loan_id);

        if (loanError) throw loanError;
      }

      // Criar notificação para o usuário
      await supabase.from("ferr_notifications").insert({
        user_id: selectedRenewal.requested_by,
        loan_id: selectedRenewal.loan_id,
        title: "Prorrogação Recusada",
        message: isKit
          ? "Sua solicitação de prorrogação do kit foi recusada. Por favor, devolva as ferramentas no prazo original."
          : "Sua solicitação de prorrogação foi recusada. Por favor, devolva a ferramenta no prazo original.",
        type: "warning",
      });

      toast({ 
        title: isKit 
          ? `${kitRenewals.length} prorrogações do kit recusadas` 
          : "Prorrogação recusada" 
      });
      setSelectedRenewal(null);
      fetchRenewals();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pendente":
        return { label: "Pendente", variant: "warning" as const, icon: Clock };
      case "aprovada":
        return { label: "Aprovada", variant: "default" as const, icon: Check };
      case "rejeitada":
        return { label: "Rejeitada", variant: "destructive" as const, icon: X };
      default:
        return { label: status, variant: "secondary" as const, icon: Clock };
    }
  };

  const filteredRenewals = renewals.filter((r) => 
    filter === "all" ? true : r.status === filter
  );

  // Agrupar renovações por kit
  const groupedRenewals = (() => {
    const toolIdToKitId = new Map<string, string>();
    kitTools.forEach((kt) => toolIdToKitId.set(kt.tool_id, kt.kit_id));

    interface RenewalGroup {
      groupKey: string;
      kitId: string | null;
      kitName: string | null;
      renewals: LoanRenewal[];
      requestedBy: string;
      requesterName: string;
      status: string;
      requestDate: string;
      newDueDate: string;
      reason: string | null;
    }

    const groups: RenewalGroup[] = [];
    const processedIds = new Set<string>();

    filteredRenewals.forEach((renewal) => {
      if (processedIds.has(renewal.id)) return;

      const toolId = renewal.loans?.tools?.id;
      if (!toolId) {
        processedIds.add(renewal.id);
        groups.push({
          groupKey: renewal.id,
          kitId: null,
          kitName: null,
          renewals: [renewal],
          requestedBy: renewal.requested_by,
          requesterName: renewal.requester?.full_name || renewal.loans?.profiles?.full_name || "",
          status: renewal.status,
          requestDate: renewal.request_date,
          newDueDate: renewal.new_due_date,
          reason: renewal.reason,
        });
        return;
      }

      const kitId = toolIdToKitId.get(toolId);

      if (kitId) {
        // Ferramenta pertence a um kit - agrupar todas do mesmo kit, mesmo usuário e mesmo status
        const kitToolIds = kitTools
          .filter((kt) => kt.kit_id === kitId)
          .map((kt) => kt.tool_id);

        const relatedRenewals = filteredRenewals.filter(
          (r) =>
            !processedIds.has(r.id) &&
            r.requested_by === renewal.requested_by &&
            r.status === renewal.status &&
            r.loans?.tools?.id &&
            kitToolIds.includes(r.loans.tools.id)
        );

        relatedRenewals.forEach((r) => processedIds.add(r.id));

        const kit = kits.find((k) => k.id === kitId);
        groups.push({
          groupKey: `${kitId}-${renewal.requested_by}-${renewal.status}`,
          kitId,
          kitName: kit?.name || "Kit",
          renewals: relatedRenewals,
          requestedBy: renewal.requested_by,
          requesterName: renewal.requester?.full_name || renewal.loans?.profiles?.full_name || "",
          status: renewal.status,
          requestDate: renewal.request_date,
          newDueDate: renewal.new_due_date,
          reason: renewal.reason,
        });
      } else {
        // Ferramenta avulsa
        processedIds.add(renewal.id);
        groups.push({
          groupKey: renewal.id,
          kitId: null,
          kitName: null,
          renewals: [renewal],
          requestedBy: renewal.requested_by,
          requesterName: renewal.requester?.full_name || renewal.loans?.profiles?.full_name || "",
          status: renewal.status,
          requestDate: renewal.request_date,
          newDueDate: renewal.new_due_date,
          reason: renewal.reason,
        });
      }
    });

    return groups;
  })();

  const handleOpenGroup = (group: typeof groupedRenewals[0]) => {
    setSelectedGroupRenewals(group.renewals);
    setSelectedGroupKitName(group.kitName);
    setSelectedRenewal(group.renewals[0]);
  };

  const handleApproveGroup = async () => {
    if (selectedGroupRenewals.length === 0 || !profile) return;

    setIsProcessing(true);
    try {
      for (const renewal of selectedGroupRenewals) {
        await supabase
          .from("ferr_loan_renewals")
          .update({
            status: "aprovada",
            approved_by: profile.id,
            approval_date: new Date().toISOString(),
          })
          .eq("id", renewal.id);

        await supabase
          .from("ferr_loans")
          .update({
            due_date: renewal.new_due_date,
            status: "ativo",
          })
          .eq("id", renewal.loan_id);
      }

      // Notificação
      await supabase.from("ferr_notifications").insert({
        user_id: selectedGroupRenewals[0].requested_by,
        loan_id: selectedGroupRenewals[0].loan_id,
        title: "Prorrogação Aprovada",
        message: selectedGroupKitName
          ? `Prorrogação do kit "${selectedGroupKitName}" aprovada. Nova data: ${format(new Date(selectedGroupRenewals[0].new_due_date), "dd/MM/yyyy", { locale: ptBR })}`
          : `Prorrogação aprovada. Nova data: ${format(new Date(selectedGroupRenewals[0].new_due_date), "dd/MM/yyyy", { locale: ptBR })}`,
        type: "success",
      });

      toast({
        title: selectedGroupKitName
          ? `Kit "${selectedGroupKitName}" aprovado (${selectedGroupRenewals.length} itens)`
          : "Prorrogação aprovada!",
      });
      setSelectedRenewal(null);
      setSelectedGroupRenewals([]);
      setSelectedGroupKitName(null);
      fetchRenewals();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectGroup = async () => {
    if (selectedGroupRenewals.length === 0 || !profile) return;

    setIsProcessing(true);
    try {
      for (const renewal of selectedGroupRenewals) {
        await supabase
          .from("ferr_loan_renewals")
          .update({
            status: "rejeitada",
            approved_by: profile.id,
            approval_date: new Date().toISOString(),
          })
          .eq("id", renewal.id);

        await supabase
          .from("ferr_loans")
          .update({ status: "ativo" })
          .eq("id", renewal.loan_id);
      }

      await supabase.from("ferr_notifications").insert({
        user_id: selectedGroupRenewals[0].requested_by,
        loan_id: selectedGroupRenewals[0].loan_id,
        title: "Prorrogação Recusada",
        message: selectedGroupKitName
          ? `Prorrogação do kit "${selectedGroupKitName}" foi recusada.`
          : "Sua solicitação de prorrogação foi recusada.",
        type: "warning",
      });

      toast({
        title: selectedGroupKitName
          ? `Kit "${selectedGroupKitName}" recusado`
          : "Prorrogação recusada",
      });
      setSelectedRenewal(null);
      setSelectedGroupRenewals([]);
      setSelectedGroupKitName(null);
      fetchRenewals();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingCount = renewals.filter((r) => r.status === "pendente").length;

  if (!isStaff) {
    return (
      <MainLayout>
        <EmptyState
          icon={CalendarClock}
          title="Acesso Restrito"
          description="Apenas administradores e almoxarifados podem gerenciar prorrogações"
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Solicitações de Prorrogação"
        description="Aprove ou recuse pedidos de extensão de prazo"
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
            {pendingCount > 0 && (
              <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                Ação necessária
              </Badge>
            )}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aprovadas</p>
              <p className="text-2xl font-bold">
                {renewals.filter((r) => r.status === "aprovada").length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <X className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rejeitadas</p>
              <p className="text-2xl font-bold">
                {renewals.filter((r) => r.status === "rejeitada").length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border p-1 bg-muted/30">
          {[
            { value: "all", label: "Todas" },
            { value: "pendente", label: "Pendentes" },
            { value: "aprovada", label: "Aprovadas" },
            { value: "rejeitada", label: "Rejeitadas" },
          ].map((item) => (
            <Button
              key={item.value}
              variant={filter === item.value ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(item.value as FilterType)}
              className="h-8"
            >
              {item.label}
              {item.value === "pendente" && pendingCount > 0 && (
                <Badge className="ml-1.5 h-5 min-w-5 rounded-full bg-yellow-500 text-white text-xs">
                  {pendingCount}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filteredRenewals.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nenhuma solicitação"
          description={
            filter === "pendente"
              ? "Não há solicitações de prorrogação pendentes"
              : "Nenhuma solicitação encontrada"
          }
        />
      ) : (
        <div className="space-y-3">
          {groupedRenewals.map((group) => {
            const statusInfo = getStatusInfo(group.status);
            const StatusIcon = statusInfo.icon;
            const isKit = group.kitId !== null;
            const isExpanded = expandedKits.has(group.groupKey);
            const daysDiff = differenceInDays(
              new Date(group.newDueDate),
              new Date(group.renewals[0]?.loans?.due_date || new Date())
            );
            const requestDate = format(
              new Date(group.requestDate),
              "dd/MM 'às' HH:mm",
              { locale: ptBR }
            );

            return (
              <Card
                key={group.groupKey}
                className={`transition-all ${
                  group.status === "pendente"
                    ? "border-yellow-500/50 bg-yellow-500/5"
                    : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isKit ? "bg-primary/10" : "bg-primary/10"}`}>
                          {isKit ? (
                            <Package className="h-5 w-5 text-primary" />
                          ) : (
                            <Wrench className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">
                              {isKit ? group.kitName : group.renewals[0]?.loans?.tools?.name || "Ferramenta"}
                            </p>
                            {isKit && (
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {group.renewals.length} itens
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate">{group.requesterName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            group.status === "pendente"
                              ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                              : group.status === "aprovada"
                              ? "bg-green-500/10 text-green-600 border-green-500/20"
                              : "bg-red-500/10 text-red-600 border-red-500/20"
                          }
                        >
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                        {isKit && (
                          <Collapsible open={isExpanded} onOpenChange={(open) => {
                            setExpandedKits(prev => {
                              const newSet = new Set(prev);
                              if (open) newSet.add(group.groupKey);
                              else newSet.delete(group.groupKey);
                              return newSet;
                            });
                          }}>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            </CollapsibleTrigger>
                          </Collapsible>
                        )}
                      </div>
                    </div>

                    {/* Kit tools list */}
                    {isKit && (
                      <Collapsible open={isExpanded}>
                        <CollapsibleContent>
                          <div className="ml-13 pl-3 border-l-2 border-muted space-y-1 py-2">
                            {group.renewals.map((r) => (
                              <div key={r.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Wrench className="h-3 w-3" />
                                <span>{r.loans?.tools?.name}</span>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Info row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground pl-13">
                      <div className="flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        <span className="font-medium text-foreground">
                          +{daysDiff} dia{daysDiff !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{requestDate}</span>
                      </div>
                      {group.reason && (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[150px]">
                            {group.reason}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions row - only for pending */}
                    {group.status === "pendente" && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenGroup(group);
                            setTimeout(() => handleRejectGroup(), 100);
                          }}
                        >
                          <X className="mr-1.5 h-4 w-4" />
                          Recusar{isKit ? ` Kit` : ""}
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenGroup(group);
                            setTimeout(() => handleApproveGroup(), 100);
                          }}
                        >
                          <Check className="mr-1.5 h-4 w-4" />
                          Aprovar{isKit ? ` Kit` : ""}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedRenewal && selectedGroupRenewals.length > 0} onOpenChange={() => {
        setSelectedRenewal(null);
        setSelectedGroupRenewals([]);
        setSelectedGroupKitName(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
            <DialogDescription>
              {selectedGroupKitName 
                ? `Prorrogação do kit "${selectedGroupKitName}"`
                : "Revise os detalhes e aprove ou recuse a prorrogação"
              }
            </DialogDescription>
          </DialogHeader>

          {selectedRenewal && (
            <div className="space-y-4 py-4">
              {/* Tool/Kit Info */}
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  {selectedGroupKitName ? (
                    <Package className="h-5 w-5 text-primary" />
                  ) : (
                    <Wrench className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {selectedGroupKitName ? (
                    <>
                      <p className="font-medium">{selectedGroupKitName}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedGroupRenewals.length} ferramenta(s)
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">{selectedRenewal.loans?.tools?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedRenewal.loans?.tools?.type}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Kit tools list */}
              {selectedGroupKitName && selectedGroupRenewals.length > 1 && (
                <div className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">Ferramentas do kit:</p>
                  <div className="space-y-1">
                    {selectedGroupRenewals.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 text-sm">
                        <Wrench className="h-3 w-3 text-muted-foreground" />
                        <span>{r.loans?.tools?.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* User Info */}
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">
                    {selectedRenewal.requester?.full_name || selectedRenewal.loans?.profiles?.full_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRenewal.requester?.email || selectedRenewal.loans?.profiles?.email}
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Data Atual</p>
                  <p className="font-medium">
                    {selectedRenewal.loans?.due_date
                      ? format(new Date(selectedRenewal.loans.due_date), "dd/MM/yyyy", { locale: ptBR })
                      : "-"}
                  </p>
                </div>
                <div className="rounded-lg border p-3 border-primary/30 bg-primary/5">
                  <p className="text-xs text-muted-foreground">Nova Data</p>
                  <p className="font-medium text-primary">
                    {format(new Date(selectedRenewal.new_due_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {/* Reason */}
              {selectedRenewal.reason && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <MessageSquare className="h-3 w-3" />
                    Motivo
                  </div>
                  <p className="text-sm">{selectedRenewal.reason}</p>
                </div>
              )}

              {/* Request Date */}
              <div className="text-center text-sm text-muted-foreground">
                Solicitado em {format(new Date(selectedRenewal.request_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>

              {/* Status */}
              <div className="flex justify-center">
                <Badge variant={getStatusInfo(selectedRenewal.status).variant} className="text-sm px-4 py-1">
                  {getStatusInfo(selectedRenewal.status).label}
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedRenewal?.status === "pendente" ? (
              <>
                <Button
                  variant="destructive"
                  onClick={handleRejectGroup}
                  disabled={isProcessing}
                >
                  <X className="mr-2 h-4 w-4" />
                  Recusar{selectedGroupKitName ? " Kit" : ""}
                </Button>
                <Button onClick={handleApproveGroup} disabled={isProcessing}>
                  <Check className="mr-2 h-4 w-4" />
                  Aprovar{selectedGroupKitName ? " Kit" : ""}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => {
                setSelectedRenewal(null);
                setSelectedGroupRenewals([]);
                setSelectedGroupKitName(null);
              }}>
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}