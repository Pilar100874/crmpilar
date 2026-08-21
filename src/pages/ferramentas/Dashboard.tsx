import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/ferramentas/layout/MainLayout";
import { useAuth } from "@/hooks/ferramentas/useAuth";
import { supabase, Tool, Loan, Profile } from "@/lib/ferramentas/supabase";
import { QRCodeDisplay } from "@/components/ferramentas/QRCodeDisplay";
import { UserLoans } from "@/components/ferramentas/UserLoans";
import {
  Wrench,
  Package,
  AlertTriangle,
  Users,
  Clock,
  CheckCircle,
  PackageCheck,
  Send,
  Repeat,
  Bell,
  ShoppingCart,
  ClipboardList,
  ChevronRight,
  QrCode,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, isPast, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LoanWithDetails extends Loan {
  tools?: Tool;
  profiles?: Profile;
}

type DetailType = "total" | "available" | "loaned" | "overdue" | "maintenance" | "users" | null;

export default function Dashboard() {
  const { profile, isAdmin, isAlmoxarifado, company } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalTools: 0,
    activeLoans: 0,
    overdueLoans: 0,
    maintenanceTools: 0,
    totalUsers: 0,
    availableTools: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Detail view state
  const [detailType, setDetailType] = useState<DetailType>(null);
  const [detailData, setDetailData] = useState<any[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  
  // Notification state
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);
  const [overdueLoans, setOverdueLoans] = useState<LoanWithDetails[]>([]);
  const [selectedLoans, setSelectedLoans] = useState<string[]>([]);
  const [notifyMessage, setNotifyMessage] = useState("Prezado(a), você possui ferramenta(s) com prazo de devolução vencido. Por favor, devolva ou solicite renovação.");
  const [isSendingNotify, setIsSendingNotify] = useState(false);
  
  // QR Code expanded state
  const [showQrExpanded, setShowQrExpanded] = useState(false);

  const isStaff = isAdmin || isAlmoxarifado;

  useEffect(() => {
    fetchDashboardData();
    checkOverdueNotifications();
  }, []);

  const checkOverdueNotifications = async () => {
    try {
      await supabase.rpc("ferr_create_overdue_notifications");
    } catch (error) {
      console.error("Error checking overdue notifications:", error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const { data: tools } = await supabase.from("ferr_tools").select("*");
      const { data: allLoans } = await supabase
        .from("ferr_loans")
        .select("*, tools:ferr_tools(*), profiles:ferr_profiles!ferr_loans_user_id_fkey(*)")
        .eq("status", "ativo");

      const { data: users } = await supabase.from("ferr_profiles").select("id");

      const totalTools = tools?.length || 0;
      const maintenanceTools = tools?.filter((t) => t.is_maintenance).length || 0;
      const activeLoans = allLoans?.length || 0;
      const overdueList = allLoans?.filter((l) => isPast(new Date(l.due_date))) || [];

      setStats({
        totalTools,
        activeLoans,
        overdueLoans: overdueList.length,
        maintenanceTools,
        totalUsers: users?.length || 0,
        availableTools: totalTools - activeLoans - maintenanceTools,
      });

      setOverdueLoans(overdueList as LoanWithDetails[]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatClick = async (type: DetailType) => {
    if (!isStaff) return;
    
    setDetailType(type);
    setIsLoadingDetail(true);

    try {
      switch (type) {
        case "total":
        case "available":
        case "maintenance": {
          const { data } = await supabase.from("ferr_tools").select("*").order("name");
          if (type === "available") {
            const { data: activeLoans } = await supabase.from("ferr_loans").select("tool_id").eq("status", "ativo");
            const loanedIds = activeLoans?.map(l => l.tool_id) || [];
            setDetailData((data || []).filter(t => !t.is_maintenance && !loanedIds.includes(t.id)));
          } else if (type === "maintenance") {
            setDetailData((data || []).filter(t => t.is_maintenance));
          } else {
            setDetailData(data || []);
          }
          break;
        }
        case "loaned":
        case "overdue": {
          const { data } = await supabase
            .from("ferr_loans")
            .select("*, tools:ferr_tools(*), profiles:ferr_profiles!ferr_loans_user_id_fkey(*)")
            .eq("status", "ativo")
            .order("due_date", { ascending: true });
          
          if (type === "overdue") {
            setDetailData((data || []).filter(l => isPast(new Date(l.due_date))));
          } else {
            setDetailData(data || []);
          }
          break;
        }
        case "users": {
          const { data } = await supabase.from("ferr_profiles").select("*").order("full_name");
          setDetailData(data || []);
          break;
        }
      }
    } catch (error) {
      console.error("Error fetching detail:", error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleSendNotifications = async () => {
    if (selectedLoans.length === 0) {
      toast({ variant: "destructive", title: "Selecione ao menos um empréstimo" });
      return;
    }

    setIsSendingNotify(true);
    try {
      const loansToNotify = overdueLoans.filter(l => selectedLoans.includes(l.id));
      const notifications = loansToNotify.map(loan => ({
        user_id: loan.user_id,
        loan_id: loan.id,
        title: "Devolução em Atraso",
        message: notifyMessage,
        type: "warning",
      }));

      const { error } = await supabase.from("ferr_notifications").insert(notifications);
      if (error) throw error;

      toast({ title: `${notifications.length} notificação(ões) enviada(s) com sucesso!` });
      setShowNotifyDialog(false);
      setSelectedLoans([]);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsSendingNotify(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLoans.length === overdueLoans.length) {
      setSelectedLoans([]);
    } else {
      setSelectedLoans(overdueLoans.map(l => l.id));
    }
  };

  const getDaysRemaining = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) return { text: `${Math.abs(days)}d atraso`, variant: "destructive" as const };
    if (days === 0) return { text: "Vence hoje", variant: "warning" as const };
    if (days <= 2) return { text: `${days}d restantes`, variant: "warning" as const };
    return { text: `${days}d restantes`, variant: "secondary" as const };
  };

  const getDetailTitle = () => {
    switch (detailType) {
      case "total": return "Todas as Ferramentas";
      case "available": return "Ferramentas Disponíveis";
      case "loaned": return "Ferramentas Emprestadas";
      case "overdue": return "Empréstimos em Atraso";
      case "maintenance": return "Em Manutenção";
      case "users": return "Usuários";
      default: return "";
    }
  };

  const firstName = profile?.full_name?.split(" ")[0] || "Usuário";

  return (
    <MainLayout>
      {/* Hero Section - Clean Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Olá, {firstName}
          </h1>
          {company && (
            <Badge variant="outline" className="gap-1.5 font-normal">
              <Building2 className="h-3 w-3" />
              {company.name}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        {/* Left Column - Main Actions & Tools */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          {/* Quick Actions - Grid on Mobile, Flex on Desktop */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button asChild size="default" className="gap-2 rounded-xl shadow-sm">
              <Link to="/ferramentas/request-tools">
                <ShoppingCart className="h-4 w-4" />
                <span>Solicitar</span>
              </Link>
            </Button>
            {isStaff && (
              <>
                <Button asChild variant="outline" size="default" className="gap-2 rounded-xl">
                  <Link to="/ferramentas/process-requests">
                    <ClipboardList className="h-4 w-4" />
                    <span>Processar</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" size="default" className="gap-2 rounded-xl">
                  <Link to="/ferramentas/loan/relend">
                    <Repeat className="h-4 w-4" />
                    <span>Reempréstimo</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" size="default" className="gap-2 rounded-xl">
                  <Link to="/ferramentas/loan/return">
                    <PackageCheck className="h-4 w-4" />
                    <span>Devolução</span>
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* User's Active Loans */}
          <UserLoans />

          {/* Alerts Section - Only show if there are issues */}
          {stats.overdueLoans > 0 && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-destructive">{stats.overdueLoans} empréstimo(s) em atraso</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Regularize para evitar pendências</p>
                </div>
                {isStaff && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => setShowNotifyDialog(true)}
                  >
                    <Bell className="h-4 w-4 mr-1" />
                    Avisar
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - QR Code & Stats */}
        <div className="space-y-4 lg:space-y-6">
          {/* QR Code Card - Compact */}
          <button
            onClick={() => setShowQrExpanded(true)}
            className="w-full rounded-2xl border bg-gradient-to-br from-card to-muted/30 p-4 text-left transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-white p-2.5 shadow-sm">
                {profile?.qr_code ? (
                  <QRCodeDisplay value={profile.qr_code} size={64} className="text-black" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center">
                    <QrCode className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">Meu QR Code</p>
                <p className="text-sm text-muted-foreground">Toque para ampliar</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </button>

          {/* Stats Grid - Compact Cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Disponíveis"
              value={stats.availableTools}
              icon={CheckCircle}
              color="success"
              onClick={() => handleStatClick("available")}
              isStaff={isStaff}
            />
            <StatCard
              label="Emprestadas"
              value={stats.activeLoans}
              icon={Package}
              color="default"
              onClick={() => handleStatClick("loaned")}
              isStaff={isStaff}
            />
            <StatCard
              label="Em Atraso"
              value={stats.overdueLoans}
              icon={AlertTriangle}
              color="destructive"
              onClick={() => handleStatClick("overdue")}
              isStaff={isStaff}
            />
            <StatCard
              label="Manutenção"
              value={stats.maintenanceTools}
              icon={Clock}
              color="warning"
              onClick={() => handleStatClick("maintenance")}
              isStaff={isStaff}
            />
          </div>

          {/* Additional Stats for Staff */}
          {isStaff && (
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Total Ferramentas"
                value={stats.totalTools}
                icon={Wrench}
                color="primary"
                onClick={() => handleStatClick("total")}
                isStaff={isStaff}
              />
              <StatCard
                label="Usuários"
                value={stats.totalUsers}
                icon={Users}
                color="default"
                onClick={() => handleStatClick("users")}
                isStaff={isStaff}
              />
            </div>
          )}
        </div>
      </div>

      {/* QR Code Expanded Modal */}
      <Dialog open={showQrExpanded} onOpenChange={setShowQrExpanded}>
        <DialogContent className="max-w-xs sm:max-w-sm">
          <DialogHeader className="text-center">
            <DialogTitle>Meu QR Code</DialogTitle>
            <DialogDescription>
              Use para identificação no almoxarifado
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <div className="rounded-2xl bg-white p-6 shadow-lg">
              {profile?.qr_code ? (
                <QRCodeDisplay value={profile.qr_code} size={200} className="text-black" />
              ) : (
                <div className="flex h-[200px] w-[200px] items-center justify-center">
                  <QrCode className="h-20 w-20 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
          <p className="text-center text-sm font-medium">{profile?.full_name}</p>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={detailType !== null} onOpenChange={(open) => !open && setDetailType(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{getDetailTitle()}</SheetTitle>
            <SheetDescription>{detailData.length} item(ns) encontrado(s)</SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="mt-4 h-[calc(100vh-150px)]">
            {isLoadingDetail ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {detailType === "users" ? (
                  detailData.map((user: Profile) => (
                    <div key={user.id} className="flex items-center gap-3 rounded-xl border p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold uppercase text-primary">
                        {user.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{user.full_name}</p>
                        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  ))
                ) : detailType === "loaned" || detailType === "overdue" ? (
                  detailData.map((loan: LoanWithDetails) => {
                    const daysInfo = getDaysRemaining(loan.due_date);
                    return (
                      <div key={loan.id} className="rounded-xl border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{loan.tools?.name}</p>
                            <p className="text-sm text-muted-foreground">{loan.profiles?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Devolução: {format(new Date(loan.due_date), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <Badge variant={daysInfo.variant}>{daysInfo.text}</Badge>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  detailData.map((tool: Tool) => (
                    <div key={tool.id} className="flex items-center gap-3 rounded-xl border p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                        <Wrench className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{tool.name}</p>
                        <p className="text-sm text-muted-foreground">{tool.type}</p>
                      </div>
                      {tool.is_maintenance && <Badge variant="warning">Manutenção</Badge>}
                    </div>
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Notification Dialog */}
      <Dialog open={showNotifyDialog} onOpenChange={setShowNotifyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Enviar Avisos de Devolução
            </DialogTitle>
            <DialogDescription>
              Selecione os empréstimos em atraso para enviar notificações
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Empréstimos em atraso ({overdueLoans.length})</Label>
              <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                {selectedLoans.length === overdueLoans.length ? "Desmarcar todos" : "Selecionar todos"}
              </Button>
            </div>

            <ScrollArea className="h-48 rounded-xl border p-2">
              {overdueLoans.map((loan) => (
                <div
                  key={loan.id}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedLoans.includes(loan.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedLoans([...selectedLoans, loan.id]);
                      } else {
                        setSelectedLoans(selectedLoans.filter((id) => id !== loan.id));
                      }
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{loan.profiles?.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {loan.tools?.name} - {Math.abs(differenceInDays(new Date(loan.due_date), new Date()))} dias de atraso
                    </p>
                  </div>
                </div>
              ))}
            </ScrollArea>

            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                value={notifyMessage}
                onChange={(e) => setNotifyMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotifyDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendNotifications} disabled={isSendingNotify || selectedLoans.length === 0}>
              <Send className="mr-2 h-4 w-4" />
              {isSendingNotify ? "Enviando..." : `Enviar (${selectedLoans.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

// Stat Card Component
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: "primary" | "success" | "warning" | "destructive" | "default";
  onClick: () => void;
  isStaff: boolean;
}

function StatCard({ label, value, icon: Icon, color, onClick, isStaff }: StatCardProps) {
  const colorClasses = {
    primary: "bg-primary/5 border-primary/20 hover:border-primary/40",
    success: "bg-success/5 border-success/20 hover:border-success/40",
    warning: "bg-warning/5 border-warning/20 hover:border-warning/40",
    destructive: "bg-destructive/5 border-destructive/20 hover:border-destructive/40",
    default: "bg-muted/50 border-border hover:border-muted-foreground/30",
  };

  const iconColorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    default: "bg-muted text-muted-foreground",
  };

  return (
    <button
      onClick={onClick}
      disabled={!isStaff}
      className={`rounded-xl border p-3 text-left transition-all ${colorClasses[color]} ${
        isStaff ? "hover:shadow-sm active:scale-[0.98] cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">{label}</p>
          <p className="text-2xl font-bold mt-0.5">{value}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconColorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </button>
  );
}
