import { useEffect, useState } from "react";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Download, 
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Image,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HistoryRecord {
  id: string;
  taskName: string;
  sectorName: string;
  sectorColor: string;
  executorName: string;
  status: string;
  scheduledDate: string;
  completedAt: string | null;
  timeSpent: number | null;
  estimatedTime: number;
  hasPhoto: boolean;
  hasLocation: boolean;
  observations: string | null;
}

interface Sector {
  id: string;
  name: string;
}

export default function History() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [sectorFilter, statusFilter, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sectorsRes, profilesRes] = await Promise.all([
        supabase.from("op_sectors").select("id, name").order("name"),
        supabase.from("op_profiles").select("user_id, full_name"),
      ]);

      if (sectorsRes.data) setSectors(sectorsRes.data);

      let query = supabase
        .from("op_task_executions")
        .select(`
          id, status, scheduled_date, completed_at, time_spent_minutes,
          photo_completion_url, latitude, longitude, observations,
          executed_by_user_id,
          task_templates:op_task_templates(
            name, estimated_time_minutes,
            sectors:op_sectors(id, name, color)
          )
        `)
        .order("scheduled_date", { ascending: false })
        .limit(500);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "completed" | "delayed" | "in_progress" | "not_done" | "pending");
      }

      if (startDate) {
        query = query.gte("scheduled_date", startDate);
      }

      if (endDate) {
        query = query.lte("scheduled_date", endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const profiles = profilesRes.data || [];

      let mapped = (data || []).map((r) => {
        const template = r.task_templates as { name: string; estimated_time_minutes: number; sectors: { id: string; name: string; color: string } | null } | null;
        const profile = profiles.find(p => p.user_id === r.executed_by_user_id);
        
        return {
          id: r.id,
          taskName: template?.name || "Sem nome",
          sectorName: template?.sectors?.name || "Sem setor",
          sectorColor: template?.sectors?.color || "#3b82f6",
          sectorId: template?.sectors?.id || "",
          executorName: profile?.full_name || "-",
          status: r.status || "pending",
          scheduledDate: r.scheduled_date,
          completedAt: r.completed_at,
          timeSpent: r.time_spent_minutes,
          estimatedTime: template?.estimated_time_minutes || 30,
          hasPhoto: !!r.photo_completion_url,
          hasLocation: !!r.latitude && !!r.longitude,
          observations: r.observations,
        };
      });

      if (sectorFilter !== "all") {
        mapped = mapped.filter(r => r.sectorId === sectorFilter);
      }

      setRecords(mapped);
    } catch (error) {
      console.error("Error fetching history:", error);
      toast({ title: "Erro ao carregar histórico", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((r) =>
    r.taskName.toLowerCase().includes(search.toLowerCase()) ||
    r.executorName.toLowerCase().includes(search.toLowerCase()) ||
    r.sectorName.toLowerCase().includes(search.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ["Data", "Tarefa", "Setor", "Executor", "Status", "Tempo Gasto (min)", "Tempo Estimado (min)", "Foto", "GPS", "Observações"];
    const rows = filteredRecords.map(r => [
      r.scheduledDate,
      r.taskName,
      r.sectorName,
      r.executorName,
      statusLabels[r.status] || r.status,
      r.timeSpent || "",
      r.estimatedTime,
      r.hasPhoto ? "Sim" : "Não",
      r.hasLocation ? "Sim" : "Não",
      r.observations || ""
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `historico_tarefas_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast({ title: "Arquivo exportado com sucesso!" });
  };

  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    in_progress: "Em Execução",
    completed: "Concluída",
    delayed: "Atrasada",
    not_done: "Não Realizada",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-4 w-4" />,
    in_progress: <Clock className="h-4 w-4 text-primary" />,
    completed: <CheckCircle2 className="h-4 w-4 text-success" />,
    delayed: <AlertTriangle className="h-4 w-4 text-warning" />,
    not_done: <XCircle className="h-4 w-4 text-critical" />,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Histórico e Auditoria</h1>
            <p className="text-muted-foreground">
              Visualize o histórico completo de execuções
            </p>
          </div>
          <Button onClick={exportToCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefa, executor, setor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Setor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Setores</SelectItem>
              {sectors.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="completed">Concluídas</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="delayed">Atrasadas</SelectItem>
              <SelectItem value="not_done">Não Realizadas</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Data início"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Data fim"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum registro encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tarefa</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Executor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Tempo</TableHead>
                    <TableHead className="text-center">Evidências</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-sm">
                        {new Date(record.scheduledDate).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {record.taskName}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: record.sectorColor }}
                          />
                          <span className="truncate">{record.sectorName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{record.executorName}</TableCell>
                      <TableCell>
                        <div className={cn(
                          "flex items-center gap-2 px-2 py-1 rounded-lg w-fit text-sm",
                          record.status === "completed" && "bg-success/10 text-success",
                          record.status === "delayed" && "bg-warning/10 text-warning",
                          record.status === "not_done" && "bg-critical/10 text-critical",
                          record.status === "pending" && "bg-muted text-muted-foreground",
                          record.status === "in_progress" && "bg-primary/10 text-primary"
                        )}>
                          {statusIcons[record.status]}
                          {statusLabels[record.status]}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {record.timeSpent !== null ? (
                          <span className={cn(
                            record.timeSpent > record.estimatedTime ? "text-warning" : "text-success"
                          )}>
                            {record.timeSpent}min
                          </span>
                        ) : "-"}
                        <span className="text-muted-foreground text-xs ml-1">
                          /{record.estimatedTime}min
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Image className={cn(
                            "h-4 w-4",
                            record.hasPhoto ? "text-success" : "text-muted-foreground/30"
                          )} />
                          <MapPin className={cn(
                            "h-4 w-4",
                            record.hasLocation ? "text-success" : "text-muted-foreground/30"
                          )} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Mostrando {filteredRecords.length} registros
        </p>
      </div>
    </AppLayout>
  );
}
