import { useEffect, useState } from "react";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEstablishment } from "@/hooks/operacional-hub/useEstablishment";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  UserX, 
  Plus, 
  CalendarDays, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  RefreshCw,
  Clock,
  UserCheck,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInMinutes, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  jobFunctionId: string | null;
  jobFunctionName: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
}

interface Absence {
  id: string;
  userId: string;
  userName: string;
  absenceDate: string;
  reason: string | null;
  isPlanned: boolean;
  tasksCount: number;
  redistributedCount: number;
}

interface AttendanceRecord {
  userId: string;
  userName: string;
  jobFunctionName: string | null;
  shiftStart: string | null;
  checkedInAt: string | null;
  lateMinutes: number;
  status: "present" | "late" | "absent";
}

export default function Absences() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [redistributing, setRedistributing] = useState<string | null>(null);
  
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reason, setReason] = useState("");
  
  const { toast } = useToast();
  const { establishmentId } = useEstablishment();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      
      const [usersRes, absencesRes, attendanceRes] = await Promise.all([
        supabase
          .from("op_profiles")
          .select(`
            id,
            user_id,
            full_name,
            job_function_id,
            job_functions:op_job_functions(name),
            shifts:op_shifts(start_time, end_time)
          `)
          .eq("is_active", true)
          .order("full_name"),
        supabase
          .from("op_absences")
          .select(`id, user_id, absence_date, reason, is_planned`)
          .gte("absence_date", today)
          .order("absence_date"),
        supabase
          .from("op_daily_attendance")
          .select("user_id, checked_in_at")
          .eq("attendance_date", today),
      ]);

      const usersData = usersRes.data || [];
      const absencesData = absencesRes.data || [];
      const attendanceData = attendanceRes.data || [];

      // Map users
      const mappedUsers: UserProfile[] = usersData.map((u: any) => ({
        id: u.id,
        userId: u.user_id,
        fullName: u.full_name,
        jobFunctionId: u.job_function_id,
        jobFunctionName: u.job_functions?.name || null,
        shiftStart: u.shifts?.start_time || null,
        shiftEnd: u.shifts?.end_time || null,
      }));
      setUsers(mappedUsers);

      // Build attendance records for today
      const attendanceMap = new Map(attendanceData.map((a: any) => [a.user_id, a.checked_in_at]));
      const todayAbsences = new Set(
        absencesData
          .filter(a => a.absence_date === today)
          .map(a => a.user_id)
      );

      const now = new Date();
      const attendanceRecords: AttendanceRecord[] = mappedUsers
        .filter(u => u.shiftStart) // Only users with shifts
        .map(user => {
          const checkedInAt = attendanceMap.get(user.userId) as string | undefined;
          const isAbsent = todayAbsences.has(user.userId);
          
          let status: "present" | "late" | "absent" = "absent";
          let lateMinutes = 0;

          if (checkedInAt) {
            // Parse shift start time
            const [hours, minutes] = (user.shiftStart || "08:00").split(":").map(Number);
            const shiftStartTime = new Date(now);
            shiftStartTime.setHours(hours, minutes, 0, 0);
            
            const checkInTime = new Date(checkedInAt);
            lateMinutes = differenceInMinutes(checkInTime, shiftStartTime);
            
            if (lateMinutes > 10) {
              status = "late";
            } else {
              status = "present";
              lateMinutes = 0;
            }
          } else if (isAbsent) {
            status = "absent";
          } else {
            // Check if shift has started
            const [hours, minutes] = (user.shiftStart || "08:00").split(":").map(Number);
            const shiftStartTime = new Date(now);
            shiftStartTime.setHours(hours, minutes, 0, 0);
            
            if (now > shiftStartTime) {
              status = "absent";
              lateMinutes = differenceInMinutes(now, shiftStartTime);
            }
          }

          return {
            userId: user.userId,
            userName: user.fullName,
            jobFunctionName: user.jobFunctionName,
            shiftStart: user.shiftStart,
            checkedInAt: checkedInAt || null,
            lateMinutes,
            status,
          };
        });

      setTodayAttendance(attendanceRecords);

      // Get task counts for absences
      if (absencesData.length > 0) {
        const absencesWithTasks = await Promise.all(
          absencesData.map(async (a: any) => {
            const { count: tasksCount } = await supabase
              .from("op_task_executions")
              .select("*", { count: "exact", head: true })
              .eq("assigned_user_id", a.user_id)
              .eq("scheduled_date", a.absence_date)
              .in("status", ["pending", "in_progress"]);

            const { count: redistributedCount } = await supabase
              .from("op_task_executions")
              .select("*", { count: "exact", head: true })
              .eq("original_assigned_user_id", a.user_id)
              .eq("scheduled_date", a.absence_date)
              .eq("was_redistributed", true);

            const user = mappedUsers.find((u) => u.userId === a.user_id);

            return {
              id: a.id,
              userId: a.user_id,
              userName: user?.fullName || "Desconhecido",
              absenceDate: a.absence_date,
              reason: a.reason,
              isPlanned: a.is_planned || false,
              tasksCount: tasksCount || 0,
              redistributedCount: redistributedCount || 0,
            };
          })
        );
        setAbsences(absencesWithTasks);
      } else {
        setAbsences([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUserId) {
      toast({ title: "Selecione um colaborador", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("op_absences").insert([
        {
          user_id: selectedUserId,
          absence_date: format(selectedDate, "yyyy-MM-dd"),
          reason: reason || null,
          is_planned: true,
          establishment_id: establishmentId,
        },
      ]);

      if (error) throw error;

      toast({ title: "Ausência registrada!" });
      setDialogOpen(false);
      setSelectedUserId("");
      setReason("");
      fetchData();
    } catch (error) {
      console.error("Error saving absence:", error);
      toast({ title: "Erro ao registrar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRedistribute = async (absence: Absence) => {
    setRedistributing(absence.id);
    
    try {
      const user = users.find((u) => u.userId === absence.userId);
      if (!user?.jobFunctionId) {
        toast({ 
          title: "Erro", 
          description: "Colaborador não tem função definida", 
          variant: "destructive" 
        });
        return;
      }

      const { data: tasks, error: tasksError } = await supabase
        .from("op_task_executions")
        .select(`id, task_templates:op_task_templates(name, priority, job_function_id)`)
        .eq("assigned_user_id", absence.userId)
        .eq("scheduled_date", absence.absenceDate)
        .in("status", ["pending", "in_progress"]);

      if (tasksError) throw tasksError;

      if (!tasks || tasks.length === 0) {
        toast({ title: "Nenhuma tarefa para redistribuir" });
        return;
      }

      const availableUsers = users.filter(
        (u) => u.jobFunctionId === user.jobFunctionId && u.userId !== absence.userId
      );

      if (availableUsers.length === 0) {
        toast({ 
          title: "Sem colaboradores disponíveis", 
          description: "Não há outros colaboradores com a mesma função",
          variant: "destructive" 
        });
        return;
      }

      const sortedTasks = [...tasks].sort(
        (a: any, b: any) => (b.task_templates?.priority || 5) - (a.task_templates?.priority || 5)
      );

      let userIndex = 0;
      for (const task of sortedTasks) {
        const targetUser = availableUsers[userIndex % availableUsers.length];
        userIndex++;
        
        await supabase
          .from("op_task_executions")
          .update({
            original_assigned_user_id: absence.userId,
            assigned_user_id: targetUser.userId,
            was_redistributed: true,
          })
          .eq("id", task.id);
      }

      toast({ 
        title: "Tarefas redistribuídas!", 
        description: `${sortedTasks.length} tarefas reatribuídas` 
      });
      
      fetchData();
    } catch (error) {
      console.error("Error redistributing:", error);
      toast({ title: "Erro ao redistribuir", variant: "destructive" });
    } finally {
      setRedistributing(null);
    }
  };

  const presentCount = todayAttendance.filter(a => a.status === "present").length;
  const lateCount = todayAttendance.filter(a => a.status === "late").length;
  const absentCount = todayAttendance.filter(a => a.status === "absent").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Gestão de Presença</h1>
            <p className="text-muted-foreground">
              Gerencie faltas, atrasos e redistribuição de tarefas
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Registrar Ausência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Registrar Ausência</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Colaborador</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.userId} value={user.userId}>
                          {user.fullName}
                          {user.jobFunctionName && (
                            <span className="text-muted-foreground ml-2">
                              ({user.jobFunctionName})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Data da Ausência</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Motivo</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="atestado">Atestado Médico</SelectItem>
                      <SelectItem value="falta">Falta Não Justificada</SelectItem>
                      <SelectItem value="ferias">Férias</SelectItem>
                      <SelectItem value="folga">Folga</SelectItem>
                      <SelectItem value="licenca">Licença</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full" onClick={handleSubmit} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Registrar Ausência"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10 text-success">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{presentCount}</p>
                <p className="text-sm text-muted-foreground">Presentes</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10 text-warning">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lateCount}</p>
                <p className="text-sm text-muted-foreground">Atrasados</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                <UserX className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{absentCount}</p>
                <p className="text-sm text-muted-foreground">Ausentes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today" className="gap-2">
              <Users className="h-4 w-4" />
              Hoje
            </TabsTrigger>
            <TabsTrigger value="late" className="gap-2">
              <Clock className="h-4 w-4" />
              Atrasos
              {lateCount > 0 && (
                <Badge variant="secondary" className="ml-1">{lateCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="absences" className="gap-2">
              <UserX className="h-4 w-4" />
              Faltas
              {absences.length > 0 && (
                <Badge variant="secondary" className="ml-1">{absences.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Today's Attendance */}
          <TabsContent value="today" className="mt-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            ) : todayAttendance.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-border bg-card">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum colaborador com turno configurado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayAttendance.map((record) => (
                  <div
                    key={record.userId}
                    className={cn(
                      "p-4 rounded-xl border bg-card flex items-center justify-between",
                      record.status === "present" && "border-success/30",
                      record.status === "late" && "border-warning/30",
                      record.status === "absent" && "border-destructive/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        record.status === "present" && "bg-success/10 text-success",
                        record.status === "late" && "bg-warning/10 text-warning",
                        record.status === "absent" && "bg-destructive/10 text-destructive"
                      )}>
                        {record.status === "present" && <UserCheck className="h-4 w-4" />}
                        {record.status === "late" && <Clock className="h-4 w-4" />}
                        {record.status === "absent" && <UserX className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium">{record.userName}</p>
                        <p className="text-sm text-muted-foreground">
                          {record.jobFunctionName || "Sem função"} • Turno: {record.shiftStart}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {record.status === "present" && record.checkedInAt && (
                        <p className="text-sm text-success">
                          Entrou às {format(new Date(record.checkedInAt), "HH:mm")}
                        </p>
                      )}
                      {record.status === "late" && (
                        <>
                          <p className="text-sm font-medium text-warning">
                            {record.lateMinutes} min de atraso
                          </p>
                          {record.checkedInAt && (
                            <p className="text-xs text-muted-foreground">
                              Entrou às {format(new Date(record.checkedInAt), "HH:mm")}
                            </p>
                          )}
                        </>
                      )}
                      {record.status === "absent" && (
                        <p className="text-sm text-destructive">Não compareceu</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Late Workers */}
          <TabsContent value="late" className="mt-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            ) : todayAttendance.filter(a => a.status === "late").length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-border bg-card">
                <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum atraso registrado hoje</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayAttendance
                  .filter(a => a.status === "late")
                  .sort((a, b) => b.lateMinutes - a.lateMinutes)
                  .map((record) => (
                    <div
                      key={record.userId}
                      className="p-4 rounded-xl border border-warning/30 bg-card flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-warning/10 text-warning">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{record.userName}</p>
                          <p className="text-sm text-muted-foreground">
                            {record.jobFunctionName} • Turno: {record.shiftStart}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-warning">
                          +{record.lateMinutes} min
                        </p>
                        {record.checkedInAt && (
                          <p className="text-xs text-muted-foreground">
                            Entrou às {format(new Date(record.checkedInAt), "HH:mm")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          {/* Registered Absences */}
          <TabsContent value="absences" className="mt-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            ) : absences.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-border bg-card">
                <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma ausência registrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {absences.map((absence) => (
                  <div
                    key={absence.id}
                    className="p-4 rounded-xl border border-border bg-card"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <UserX className="h-5 w-5 text-destructive" />
                          <p className="font-medium">{absence.userName}</p>
                          {absence.isPlanned && (
                            <Badge variant="outline" className="text-xs">Planejada</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(absence.absenceDate + "T12:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        {absence.reason && (
                          <Badge variant="secondary" className="mt-2">
                            {absence.reason === "atestado" && "Atestado Médico"}
                            {absence.reason === "falta" && "Falta"}
                            {absence.reason === "ferias" && "Férias"}
                            {absence.reason === "folga" && "Folga"}
                            {absence.reason === "licenca" && "Licença"}
                            {absence.reason === "outro" && "Outro"}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {absence.tasksCount > 0 ? (
                            <div className="flex items-center gap-2 text-warning">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                {absence.tasksCount} tarefa{absence.tasksCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                          ) : absence.redistributedCount > 0 ? (
                            <div className="flex items-center gap-2 text-success">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                {absence.redistributedCount} redistribuída{absence.redistributedCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sem tarefas</span>
                          )}
                        </div>

                        {absence.tasksCount > 0 && (
                          <Button
                            size="sm"
                            onClick={() => handleRedistribute(absence)}
                            disabled={redistributing === absence.id}
                          >
                            {redistributing === absence.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Redistribuir
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
