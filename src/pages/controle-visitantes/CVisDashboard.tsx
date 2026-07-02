import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, UserCheck, Clock, LogOut, TrendingUp, RefreshCw,
  LogIn, ListChecks, Contact, UserCog, FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CVPageHeader, CVKpiCard } from "@/pages/controle-veiculos/CVPageHeader";
import { useVisitantesControl } from "@/hooks/useVisitantesControl";
import { toast } from "sonner";

export default function CVisDashboard() {
  const navigate = useNavigate();
  const { accessRecords, pendingVisitors, isLoading, loadData } = useVisitantesControl();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setLastUpdate(new Date());
    setRefreshing(false);
    toast.success("Painel atualizado");
  }, [loadData]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todays = accessRecords.filter((r) => new Date(r.entryDate).toDateString() === today);
    const inside = accessRecords.filter((r) => r.status === "inside");
    const exited = todays.filter((r) => r.status === "exited");
    const pend = pendingVisitors.filter((p) => p.status === "pending").length;
    return {
      inside: inside.length,
      entriesToday: todays.length,
      pending: pend,
      exitsToday: exited.length,
    };
  }, [accessRecords, pendingVisitors]);

  const kpis: Array<Parameters<typeof CVKpiCard>[0]> = [
    { label: "Presentes", value: stats.inside, sub: "No local agora", icon: Users, tone: "success" },
    { label: "Entradas Hoje", value: stats.entriesToday, sub: "Desde meia-noite", icon: UserCheck, tone: "primary" },
    { label: "Pendentes", value: stats.pending, sub: "Aguardando aprovação", icon: Clock, tone: "warning" },
    { label: "Saídas Hoje", value: stats.exitsToday, sub: "Registradas hoje", icon: LogOut, tone: "info" },
  ];

  return (
    <div className="space-y-5">
      <CVPageHeader
        icon={TrendingUp}
        title="Painel da Portaria"
        subtitle="Visão geral em tempo real"
        actions={
          <>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3.5 w-3.5" />
              {lastUpdate.toLocaleTimeString("pt-BR")}
            </Badge>
            <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing || isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => <CVKpiCard key={k.label} {...k} />)}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/40">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4 text-primary" />
              Operação da Portaria
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">Ações rápidas do dia a dia.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="h-11 bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => navigate("/controle-visitantes/entrada")}
              >
                <LogIn className="h-4 w-4 mr-1" /> Entrada
              </Button>
              <Button
                className="h-11 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => navigate("/controle-visitantes/presentes")}
              >
                <UserCheck className="h-4 w-4 mr-1" /> Presentes
              </Button>
              <Button
                variant="outline"
                className="h-11 relative"
                onClick={() => navigate("/controle-visitantes/autorizacoes")}
              >
                <Clock className="h-4 w-4 mr-1" /> Autorizações
                {stats.pending > 0 && (
                  <Badge variant="destructive" className="ml-auto h-5 px-1.5">{stats.pending}</Badge>
                )}
              </Button>
              <Button
                variant="outline"
                className="h-11"
                onClick={() => navigate("/controle-visitantes/relatorios")}
              >
                <FileText className="h-4 w-4 mr-1" /> Relatórios
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/40">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="h-4 w-4 text-primary" />
              Cadastros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-3">Bases de visitantes e contatos internos.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-10 justify-start" onClick={() => navigate("/controle-visitantes/visitantes")}>
                <UserCog className="h-4 w-4 mr-1" /> Visitantes
              </Button>
              <Button variant="outline" className="h-10 justify-start" onClick={() => navigate("/controle-visitantes/contatos")}>
                <Contact className="h-4 w-4 mr-1" /> Contatos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
