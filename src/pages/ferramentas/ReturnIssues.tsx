import { useEffect, useState } from "react";
import { MainLayout } from "@/components/ferramentas/layout/MainLayout";
import { PageHeader } from "@/components/ferramentas/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ferramentas/ui/empty-state";
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
import { supabase, ReturnIssue, Profile, Tool } from "@/lib/ferramentas/supabase";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Wrench,
  User,
  Calendar,
  DollarSign,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface IssueWithDetails extends ReturnIssue {
  profiles?: Profile;
  tools?: Tool;
  reporter?: Profile;
}

type FilterType = "all" | "pendente" | "resolvido" | "descartado";

export default function ReturnIssuesPage() {
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [issues, setIssues] = useState<IssueWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("pendente");
  
  const [selectedIssue, setSelectedIssue] = useState<IssueWithDetails | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const { data, error } = await supabase
        .from("ferr_return_issues")
        .select(`
          *,
          profiles:ferr_profiles!ferr_return_issues_user_id_fkey(*),
          tools:ferr_tools(*),
          reporter:ferr_profiles!ferr_return_issues_reported_by_fkey(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setIssues((data as IssueWithDetails[]) || []);
    } catch (error) {
      console.error("Error fetching issues:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (action: "resolvido" | "descartado") => {
    if (!selectedIssue || !profile) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("ferr_return_issues")
        .update({
          status: action,
          discount_resolved: action === "resolvido",
          resolved_by: profile.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes || null,
        })
        .eq("id", selectedIssue.id);

      if (error) throw error;

      // Se a ocorrência for "danificada" ou "perdida" e foi resolvida, desativar a ferramenta
      if (action === "resolvido" && (selectedIssue.issue_type === "danificada" || selectedIssue.issue_type === "perdida")) {
        const { error: toolError } = await supabase
          .from("ferr_tools")
          .update({ is_active: false })
          .eq("id", selectedIssue.tool_id);
        
        if (toolError) {
          console.error("Erro ao desativar ferramenta:", toolError);
        }
      }

      // Create notification for user
      let notificationMessage = action === "resolvido"
        ? `A ocorrência referente à ferramenta "${selectedIssue.tools?.name}" foi resolvida.${resolutionNotes ? ` Observação: ${resolutionNotes}` : ""}`
        : `A ocorrência referente à ferramenta "${selectedIssue.tools?.name}" foi descartada.`;
      
      // Adicionar informação sobre desativação
      if (action === "resolvido" && (selectedIssue.issue_type === "danificada" || selectedIssue.issue_type === "perdida")) {
        notificationMessage += ` A ferramenta foi desativada do sistema.`;
      }

      await supabase.from("ferr_notifications").insert({
        user_id: selectedIssue.user_id,
        title: action === "resolvido" 
          ? "Ocorrência Resolvida" 
          : "Ocorrência Descartada",
        message: notificationMessage,
        type: action === "resolvido" ? "warning" : "info",
      });

      const toastTitle = action === "resolvido" ? "Ocorrência resolvida!" : "Ocorrência descartada!";
      const toastDescription = action === "resolvido" && (selectedIssue.issue_type === "danificada" || selectedIssue.issue_type === "perdida")
        ? "A ferramenta foi desativada automaticamente."
        : undefined;
      
      toast({ title: toastTitle, description: toastDescription });
      setSelectedIssue(null);
      setResolutionNotes("");
      fetchIssues();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredIssues = issues.filter((issue) => {
    if (filter === "all") return true;
    return issue.status === filter;
  });

  const pendingDiscountCount = issues.filter(
    (i) => i.requires_discount && i.status === "pendente"
  ).length;

  const getIssueTypeInfo = (type: string) => {
    switch (type) {
      case "manutencao":
        return { label: "Manutenção", icon: Settings, color: "bg-warning/10 text-warning border-warning/20" };
      case "danificada":
        return { label: "Danificada", icon: AlertTriangle, color: "bg-destructive/10 text-destructive border-destructive/20" };
      case "perdida":
        return { label: "Perdida", icon: XCircle, color: "bg-destructive/10 text-destructive border-destructive/20" };
      default:
        return { label: type, icon: AlertTriangle, color: "bg-muted" };
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pendente":
        return { label: "Pendente", color: "warning" as const };
      case "resolvido":
        return { label: "Resolvido", color: "default" as const };
      case "descartado":
        return { label: "Descartado", color: "secondary" as const };
      default:
        return { label: status, color: "secondary" as const };
    }
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <EmptyState
          icon={AlertTriangle}
          title="Acesso Restrito"
          description="Apenas administradores podem gerenciar ocorrências"
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Ocorrências de Devolução"
        description="Gerencie problemas reportados nas devoluções"
      />

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold">
                {issues.filter((i) => i.status === "pendente").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className={pendingDiscountCount > 0 ? "border-destructive/50" : ""}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
              <DollarSign className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aguardando Desconto</p>
              <p className="text-2xl font-bold">{pendingDiscountCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Resolvidos</p>
              <p className="text-2xl font-bold">
                {issues.filter((i) => i.status === "resolvido").length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="resolvido">Resolvidas</SelectItem>
            <SelectItem value="descartado">Descartadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Issues List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filteredIssues.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="Nenhuma ocorrência"
          description={
            filter === "pendente"
              ? "Não há ocorrências pendentes"
              : "Nenhuma ocorrência encontrada"
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredIssues.map((issue) => {
            const typeInfo = getIssueTypeInfo(issue.issue_type);
            const statusInfo = getStatusInfo(issue.status);
            const TypeIcon = typeInfo.icon;

            return (
              <Card
                key={issue.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  issue.requires_discount && issue.status === "pendente"
                    ? "border-destructive/50"
                    : ""
                }`}
                onClick={() => setSelectedIssue(issue)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${typeInfo.color}`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{issue.tools?.name}</p>
                          <Badge variant={statusInfo.color}>{statusInfo.label}</Badge>
                          {issue.requires_discount && (
                            <Badge variant="destructive" className="gap-1">
                              <DollarSign className="h-3 w-3" />
                              Desconto
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {issue.profiles?.full_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(issue.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {issue.description && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                            {issue.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] sm:w-full p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">Detalhes da Ocorrência</DialogTitle>
            <DialogDescription className="text-sm">
              Revise e tome providências
            </DialogDescription>
          </DialogHeader>

          {selectedIssue && (
            <ScrollArea className="max-h-[55vh] sm:max-h-[60vh] -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="space-y-3 sm:space-y-4 pr-2 sm:pr-4">
                {/* Tool Info */}
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Wrench className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{selectedIssue.tools?.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {selectedIssue.tools?.serial_number || "Sem número de série"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* User and Type - Grid on mobile */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {/* User Info */}
                  <div className="rounded-lg border p-2.5 sm:p-3">
                    <Label className="text-[10px] sm:text-xs text-muted-foreground">Responsável</Label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-xs sm:text-sm truncate">{selectedIssue.profiles?.full_name}</span>
                    </div>
                  </div>

                  {/* Issue Type */}
                  <div className="rounded-lg border p-2.5 sm:p-3">
                    <Label className="text-[10px] sm:text-xs text-muted-foreground">Tipo</Label>
                    <div className="mt-1">
                      <Badge className={`text-[10px] sm:text-xs ${getIssueTypeInfo(selectedIssue.issue_type).color}`}>
                        {getIssueTypeInfo(selectedIssue.issue_type).label}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedIssue.description && (
                  <div className="rounded-lg border p-2.5 sm:p-3">
                    <Label className="text-[10px] sm:text-xs text-muted-foreground">Descrição</Label>
                    <p className="mt-1 text-xs sm:text-sm">{selectedIssue.description}</p>
                  </div>
                )}

                {/* Discount Info */}
                {selectedIssue.requires_discount && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-2.5 sm:p-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive shrink-0" />
                      <span className="font-medium text-destructive text-xs sm:text-sm">Desconto Solicitado</span>
                    </div>
                    <p className="text-[11px] sm:text-sm text-muted-foreground mt-1">
                      {selectedIssue.issue_type === "perdida"
                        ? "Ferramenta perdida - desconto obrigatório"
                        : "Providenciar desconto em folha"}
                    </p>
                  </div>
                )}

                {/* Warning about deactivation */}
                {selectedIssue.status === "pendente" && (selectedIssue.issue_type === "danificada" || selectedIssue.issue_type === "perdida") && (
                  <div className="rounded-lg border border-orange-500/50 bg-orange-500/10 p-2.5 sm:p-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600 shrink-0" />
                      <span className="font-medium text-orange-600 text-xs sm:text-sm">Atenção</span>
                    </div>
                    <p className="text-[11px] sm:text-sm text-orange-600 mt-1">
                      Ao resolver, a ferramenta será <strong>desativada</strong> automaticamente.
                    </p>
                  </div>
                )}

                {/* Reporter */}
                <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span>Por {selectedIssue.reporter?.full_name}</span>
                  <span>•</span>
                  <span>{format(new Date(selectedIssue.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                </div>

                {/* Resolution Notes */}
                {selectedIssue.status === "pendente" && (
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Observações (opcional)</Label>
                    <Textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Providências tomadas..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                )}

                {/* Resolution Info */}
                {selectedIssue.status !== "pendente" && (
                  <div className="rounded-lg border p-2.5 sm:p-3 bg-muted/50">
                    <Label className="text-[10px] sm:text-xs text-muted-foreground">Resolução</Label>
                    <p className="mt-1 text-xs sm:text-sm">
                      {getStatusInfo(selectedIssue.status).label} em{" "}
                      {selectedIssue.resolved_at &&
                        format(new Date(selectedIssue.resolved_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </p>
                    {selectedIssue.resolution_notes && (
                      <p className="mt-1 text-[11px] sm:text-sm text-muted-foreground">
                        {selectedIssue.resolution_notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
            {selectedIssue?.status === "pendente" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleResolve("descartado")}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Descartar
                </Button>
                <Button
                  onClick={() => handleResolve("resolvido")}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Salvando..." : "Resolver"}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setSelectedIssue(null)} className="w-full sm:w-auto">
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
