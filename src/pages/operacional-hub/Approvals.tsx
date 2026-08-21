import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PendingTemplate {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by_user_id: string | null;
  approval_status: string;
  rejection_reason: string | null;
  creatorName?: string;
}

export default function Approvals() {
  const [templates, setTemplates] = useState<PendingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  useEffect(() => {
    fetchPendingTemplates();
  }, []);

  const fetchPendingTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("task_templates")
        .select("id, name, description, created_at, created_by_user_id, approval_status, rejection_reason")
        .eq("is_irregularity_template", true)
        .in("approval_status", ["pending", "rejected"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch creator names
      const userIds = [...new Set((data || []).map(t => t.created_by_user_id).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds as string[]);
        profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
      }

      setTemplates((data || []).map(t => ({
        ...t,
        creatorName: t.created_by_user_id ? profileMap[t.created_by_user_id] || "Desconhecido" : "Sistema",
      })));
    } catch (error) {
      console.error("Error fetching pending templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (templateId: string) => {
    setActionLoading(templateId);
    try {
      const { error } = await supabase
        .from("task_templates")
        .update({
          approval_status: "approved",
          approved_by_user_id: user?.id,
          approved_at: new Date().toISOString(),
          is_active: true,
        })
        .eq("id", templateId);

      if (error) throw error;

      toast({ title: "Template aprovado!", description: "O template agora está ativo." });
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (error) {
      console.error("Error approving:", error);
      toast({ title: "Erro ao aprovar", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectionReason.trim()) return;
    setActionLoading(rejectingId);
    try {
      const { error } = await supabase
        .from("task_templates")
        .update({
          approval_status: "rejected",
          rejection_reason: rejectionReason,
          is_active: false,
        })
        .eq("id", rejectingId);

      if (error) throw error;

      toast({ title: "Template rejeitado", description: "O solicitante será notificado." });
      setTemplates(prev => prev.map(t => t.id === rejectingId ? { ...t, approval_status: "rejected", rejection_reason: rejectionReason } : t));
      setRejectDialogOpen(false);
      setRejectingId(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Error rejecting:", error);
      toast({ title: "Erro ao rejeitar", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = templates.filter(t => t.approval_status === "pending").length;
  const rejectedCount = templates.filter(t => t.approval_status === "rejected").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Aprovações</h1>
          <p className="text-muted-foreground">
            Templates de irregularidade aguardando aprovação
          </p>
        </div>

        {/* Summary */}
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-warning/10 border border-warning/30">
            <Clock className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium">{pendingCount} pendente(s)</span>
          </div>
          {rejectedCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 border border-destructive/30">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">{rejectedCount} rejeitado(s)</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-muted/30 rounded-xl border border-border p-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Nenhuma aprovação pendente</p>
            <p className="text-sm text-muted-foreground mt-1">
              Todos os templates de irregularidade foram revisados
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <Card key={template.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-warning" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{template.name}</h3>
                          <Badge
                            variant="outline"
                            className={
                              template.approval_status === "pending"
                                ? "border-warning/50 text-warning bg-warning/10"
                                : "border-destructive/50 text-destructive bg-destructive/10"
                            }
                          >
                            {template.approval_status === "pending" ? "Pendente" : "Rejeitado"}
                          </Badge>
                        </div>
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span>Criado por: <strong>{template.creatorName}</strong></span>
                          <span>{format(new Date(template.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                        </div>
                        {template.rejection_reason && (
                          <div className="mt-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Motivo da rejeição: {template.rejection_reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {template.approval_status === "pending" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 border-destructive/50 text-destructive hover:bg-destructive/10"
                          disabled={actionLoading === template.id}
                          onClick={() => {
                            setRejectingId(template.id);
                            setRejectDialogOpen(true);
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                          Rejeitar
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1 bg-success hover:bg-success/90 text-success-foreground"
                          disabled={actionLoading === template.id}
                          onClick={() => handleApprove(template.id)}
                        >
                          {actionLoading === template.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Aprovar
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Rejeitar Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Motivo da rejeição *</Label>
              <Textarea
                placeholder="Descreva o motivo da rejeição..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRejectDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={!rejectionReason.trim() || !!actionLoading}
                onClick={handleReject}
              >
                Confirmar Rejeição
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
