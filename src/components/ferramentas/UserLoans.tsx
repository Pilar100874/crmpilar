import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase, Loan, Tool, Kit } from "@/lib/supabase";
import {
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle,
  CalendarPlus,
  Package,
  BoxesIcon,
} from "lucide-react";
import { format, isPast, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LoanWithTool extends Loan {
  tools?: Tool;
}

interface KitTool {
  kit_id: string;
  tool_id: string;
}

export function UserLoans() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loans, setLoans] = useState<LoanWithTool[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [kitTools, setKitTools] = useState<KitTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedLoans, setSelectedLoans] = useState<LoanWithTool[]>([]);
  const [selectedKitName, setSelectedKitName] = useState<string | null>(null);
  const [renewReason, setRenewReason] = useState("");
  const [renewDays, setRenewDays] = useState("7");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchData();
    }
  }, [profile?.id]);

  const fetchData = async () => {
    try {
      const [loansRes, kitsRes, kitToolsRes] = await Promise.all([
        supabase
          .from("loans")
          .select("*, tools(*)")
          .eq("user_id", profile?.id)
          .in("status", ["ativo", "renovacao_solicitada"])
          .order("due_date", { ascending: true }),
        supabase.from("kits").select("*"),
        supabase.from("kit_tools").select("kit_id, tool_id"),
      ]);

      setLoans((loansRes.data as LoanWithTool[]) || []);
      setKits((kitsRes.data as Kit[]) || []);
      setKitTools((kitToolsRes.data as KitTool[]) || []);
    } catch (error) {
      console.error("Error fetching loans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Agrupar empréstimos por kit
  const groupedLoans = useMemo(() => {
    const toolIdToKitId = new Map<string, string>();
    kitTools.forEach((kt) => toolIdToKitId.set(kt.tool_id, kt.kit_id));

    const groups: { 
      kitId: string | null; 
      kitName: string | null; 
      loans: LoanWithTool[] 
    }[] = [];
    
    const processedToolIds = new Set<string>();

    loans.forEach((loan) => {
      if (processedToolIds.has(loan.tool_id)) return;

      const kitId = toolIdToKitId.get(loan.tool_id);
      
      if (kitId) {
        // Ferramenta pertence a um kit - agrupar todas do mesmo kit
        const kitToolIds = kitTools
          .filter((kt) => kt.kit_id === kitId)
          .map((kt) => kt.tool_id);
        
        const kitLoans = loans.filter((l) => kitToolIds.includes(l.tool_id));
        kitLoans.forEach((l) => processedToolIds.add(l.tool_id));

        const kit = kits.find((k) => k.id === kitId);
        groups.push({
          kitId,
          kitName: kit?.name || "Kit",
          loans: kitLoans,
        });
      } else {
        // Ferramenta avulsa
        processedToolIds.add(loan.tool_id);
        groups.push({
          kitId: null,
          kitName: null,
          loans: [loan],
        });
      }
    });

    return groups;
  }, [loans, kits, kitTools]);

  const openRenewDialog = (loansToRenew: LoanWithTool[], kitName: string | null) => {
    setSelectedLoans(loansToRenew);
    setSelectedKitName(kitName);
    setRenewReason("");
    setRenewDays("7");
    setRenewDialogOpen(true);
  };

  const handleRenewRequest = async () => {
    if (selectedLoans.length === 0 || !profile) return;

    setIsSubmitting(true);
    try {
      // Criar solicitação de renovação para cada empréstimo do grupo/kit
      for (const loan of selectedLoans) {
        const newDueDate = addDays(new Date(loan.due_date), parseInt(renewDays));

        const { error } = await supabase.from("loan_renewals").insert({
          loan_id: loan.id,
          requested_by: profile.id,
          new_due_date: newDueDate.toISOString(),
          reason: renewReason || null,
        });

        if (error) throw error;

        await supabase
          .from("loans")
          .update({ status: "renovacao_solicitada" })
          .eq("id", loan.id);
      }

      toast({
        title: "Solicitação enviada!",
        description: selectedKitName 
          ? `Prorrogação solicitada para o kit "${selectedKitName}" (${selectedLoans.length} itens)`
          : "Aguarde a aprovação do almoxarifado",
      });
      setRenewDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusInfo = (loan: LoanWithTool) => {
    if (loan.status === "renovacao_solicitada") {
      return {
        icon: Clock,
        color: "bg-info/10 text-info border-info/30",
        badgeVariant: "info" as const,
        label: "Aguardando",
        isOverdue: false,
      };
    }

    const isOverdue = isPast(new Date(loan.due_date));
    const daysLeft = differenceInDays(new Date(loan.due_date), new Date());

    if (isOverdue) {
      return {
        icon: AlertTriangle,
        color: "bg-destructive/5 border-destructive/30",
        badgeVariant: "destructive" as const,
        label: `${Math.abs(daysLeft)}d atraso`,
        isOverdue: true,
      };
    }

    if (daysLeft <= 2) {
      return {
        icon: Clock,
        color: "bg-warning/5 border-warning/30",
        badgeVariant: "warning" as const,
        label: daysLeft === 0 ? "Hoje" : `${daysLeft}d`,
        isOverdue: false,
      };
    }

    return {
      icon: CheckCircle,
      color: "bg-success/5 border-success/30",
      badgeVariant: "success" as const,
      label: `${daysLeft}d`,
      isOverdue: false,
    };
  };

  // Status agregado para kits (pega o pior status)
  const getGroupStatus = (groupLoans: LoanWithTool[]) => {
    // Se algum está aguardando renovação
    if (groupLoans.some((l) => l.status === "renovacao_solicitada")) {
      return {
        icon: Clock,
        color: "bg-info/10 text-info border-info/30",
        badgeVariant: "info" as const,
        label: "Aguardando",
        isOverdue: false,
        canRenew: false,
      };
    }

    // Pega a data de vencimento mais próxima
    const earliestDue = groupLoans.reduce((min, l) => 
      new Date(l.due_date) < new Date(min.due_date) ? l : min
    );

    const isOverdue = isPast(new Date(earliestDue.due_date));
    const daysLeft = differenceInDays(new Date(earliestDue.due_date), new Date());

    if (isOverdue) {
      return {
        icon: AlertTriangle,
        color: "bg-destructive/5 border-destructive/30",
        badgeVariant: "destructive" as const,
        label: `${Math.abs(daysLeft)}d atraso`,
        isOverdue: true,
        canRenew: true,
      };
    }

    if (daysLeft <= 2) {
      return {
        icon: Clock,
        color: "bg-warning/5 border-warning/30",
        badgeVariant: "warning" as const,
        label: daysLeft === 0 ? "Hoje" : `${daysLeft}d`,
        isOverdue: false,
        canRenew: true,
      };
    }

    return {
      icon: CheckCircle,
      color: "bg-success/5 border-success/30",
      badgeVariant: "success" as const,
      label: `${daysLeft}d`,
      isOverdue: false,
      canRenew: true,
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  if (loans.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-muted-foreground/20 p-8 text-center">
        <div className="flex justify-center mb-3">
          <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
        </div>
        <p className="font-medium text-muted-foreground">Nenhuma ferramenta emprestada</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Suas ferramentas aparecerão aqui</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Package className="h-4 w-4" />
            Minhas Ferramentas ({loans.length})
          </h2>
        </div>

        {/* Grouped Loans List */}
        <div className="space-y-2">
          {groupedLoans.map((group, idx) => {
            const isKit = group.kitId !== null;
            const groupStatus = getGroupStatus(group.loans);
            const StatusIcon = groupStatus.icon;

            if (isKit) {
              // Renderizar como kit
              return (
                <div
                  key={group.kitId}
                  className={`rounded-2xl border p-4 transition-all ${groupStatus.color}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Kit Icon */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm">
                      <BoxesIcon className="h-5 w-5 text-foreground" />
                    </div>

                    {/* Kit Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{group.kitName}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {group.loans.length} itens
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {group.loans.map((l) => l.tools?.name).join(", ")}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <Badge variant={groupStatus.badgeVariant} className="shrink-0">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {groupStatus.label}
                    </Badge>

                    {/* Action Button */}
                    {groupStatus.canRenew && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-9 w-9 rounded-lg"
                        onClick={() => openRenewDialog(group.loans, group.kitName)}
                      >
                        <CalendarPlus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            } else {
              // Renderizar ferramenta avulsa
              const loan = group.loans[0];
              const status = getStatusInfo(loan);
              const LoanStatusIcon = status.icon;

              return (
                <div
                  key={loan.id}
                  className={`rounded-2xl border p-4 transition-all ${status.color}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Tool Icon */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm">
                      <Wrench className="h-5 w-5 text-foreground" />
                    </div>

                    {/* Tool Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{loan.tools?.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(loan.due_date), "dd MMM", { locale: ptBR })}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <Badge variant={status.badgeVariant} className="shrink-0">
                      <LoanStatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>

                    {/* Action Button */}
                    {loan.status !== "renovacao_solicitada" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-9 w-9 rounded-lg"
                        onClick={() => openRenewDialog([loan], null)}
                      >
                        <CalendarPlus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            }
          })}
        </div>
      </div>

      {/* Renew Dialog */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Prorrogar Empréstimo</DialogTitle>
            <DialogDescription>
              {selectedKitName 
                ? `Solicite mais tempo para o kit "${selectedKitName}"`
                : "Solicite mais tempo para devolver a ferramenta"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {selectedKitName ? "Kit" : "Ferramenta"}
              </p>
              {selectedKitName ? (
                <>
                  <p className="font-medium mt-0.5">{selectedKitName}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedLoans.length} ferramenta(s): {selectedLoans.map((l) => l.tools?.name).join(", ")}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium mt-0.5">{selectedLoans[0]?.tools?.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vencimento:{" "}
                    {selectedLoans[0] &&
                      format(new Date(selectedLoans[0].due_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>Dias adicionais</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={renewDays}
                onChange={(e) => setRenewDays(e.target.value)}
                className="text-center text-lg font-medium"
              />
              {selectedLoans.length > 0 && (
                <p className="text-sm text-center text-muted-foreground">
                  Nova data:{" "}
                  <span className="font-medium text-foreground">
                    {format(
                      addDays(new Date(selectedLoans[0].due_date), parseInt(renewDays) || 0),
                      "dd/MM/yyyy",
                      { locale: ptBR }
                    )}
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea
                placeholder="Explique por que precisa de mais tempo..."
                value={renewReason}
                onChange={(e) => setRenewReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRenewDialogOpen(false)} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button onClick={handleRenewRequest} disabled={isSubmitting} className="flex-1 sm:flex-none">
              {isSubmitting ? "Enviando..." : "Solicitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
