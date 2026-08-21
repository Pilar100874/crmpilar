import { useEffect, useState } from "react";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEstablishment } from "@/hooks/operacional-hub/useEstablishment";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Clock, Trash2, Edit2, Loader2, UtensilsCrossed, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

const WEEKDAYS_SHORT: Record<number, string> = {
  0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb",
};

interface DaySchedule {
  day: number;
  start: string;
  end: string;
  lunchStart?: string;
  lunchEnd?: string;
}

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  lunchStart: string | null;
  lunchEnd: string | null;
  daySchedules: DaySchedule[];
}

// Helper: convert "HH:MM" to pixel offset in a 24h timeline (0-100%)
const timeToPercent = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return ((h * 60 + m) / (24 * 60)) * 100;
};

// Helper: format hour label
const hourLabel = (h: number) => `${h.toString().padStart(2, "0")}:00`;

export default function Shifts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const { establishmentId } = useEstablishment();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [defaultStart, setDefaultStart] = useState("08:00");
  const [defaultEnd, setDefaultEnd] = useState("18:00");
  const [lunchStart, setLunchStart] = useState("");
  const [lunchEnd, setLunchEnd] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [dayOverrides, setDayOverrides] = useState<Record<number, { start: string; end: string; lunchStart: string; lunchEnd: string }>>({});
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase
        .from("op_shifts")
        .select("*")
        .order("start_time");

      if (error) throw error;
      setShifts(
        (data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          startTime: (s.start_time as string).slice(0, 5),
          endTime: (s.end_time as string).slice(0, 5),
          lunchStart: s.lunch_start ? (s.lunch_start as string).slice(0, 5) : null,
          lunchEnd: s.lunch_end ? (s.lunch_end as string).slice(0, 5) : null,
          daySchedules: ((s.day_schedules as DaySchedule[]) || []).map((ds) => ({
            ...ds,
            start: ds.start.slice(0, 5),
            end: ds.end.slice(0, 5),
            lunchStart: ds.lunchStart ? ds.lunchStart.slice(0, 5) : undefined,
            lunchEnd: ds.lunchEnd ? ds.lunchEnd.slice(0, 5) : undefined,
          })),
        }))
      );
    } catch (error) {
      console.error("Error fetching shifts:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setDefaultStart("08:00");
    setDefaultEnd("18:00");
    setLunchStart("");
    setLunchEnd("");
    setSelectedDays([1, 2, 3, 4, 5]);
    setDayOverrides({});
    setEditingId(null);
    setExpandedDay(null);
  };

  const handleEdit = (shift: Shift) => {
    setFormName(shift.name);
    setLunchStart(shift.lunchStart || "");
    setLunchEnd(shift.lunchEnd || "");

    if (shift.daySchedules.length > 0) {
      const days = shift.daySchedules.map((ds) => ds.day);
      setSelectedDays(days);
      const first = shift.daySchedules[0];
      setDefaultStart(first.start);
      setDefaultEnd(first.end);

      const overrides: Record<number, { start: string; end: string; lunchStart: string; lunchEnd: string }> = {};
      for (const ds of shift.daySchedules) {
        const isDifferentTime = ds.start !== first.start || ds.end !== first.end;
        const hasDayLunch = !!(ds.lunchStart || ds.lunchEnd);
        if (isDifferentTime || hasDayLunch) {
          overrides[ds.day] = {
            start: ds.start,
            end: ds.end,
            lunchStart: ds.lunchStart || "",
            lunchEnd: ds.lunchEnd || "",
          };
        }
      }
      setDayOverrides(overrides);
    } else {
      setDefaultStart(shift.startTime);
      setDefaultEnd(shift.endTime);
      setSelectedDays([1, 2, 3, 4, 5]);
      setDayOverrides({});
    }

    setEditingId(shift.id);
    setDialogOpen(true);
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
      if (!next.includes(day)) {
        setDayOverrides((o) => {
          const copy = { ...o };
          delete copy[day];
          return copy;
        });
      }
      return next;
    });
  };

  const setOverride = (day: number, field: "start" | "end" | "lunchStart" | "lunchEnd", value: string) => {
    setDayOverrides((prev) => ({
      ...prev,
      [day]: {
        start: prev[day]?.start ?? defaultStart,
        end: prev[day]?.end ?? defaultEnd,
        lunchStart: prev[day]?.lunchStart ?? lunchStart,
        lunchEnd: prev[day]?.lunchEnd ?? lunchEnd,
        [field]: value,
      },
    }));
  };

  const clearOverride = (day: number) => {
    setDayOverrides((prev) => {
      const copy = { ...prev };
      delete copy[day];
      return copy;
    });
    setExpandedDay(null);
  };

  const buildDaySchedules = (): DaySchedule[] => {
    return selectedDays.map((day) => {
      const override = dayOverrides[day];
      const dayLunchStart = override?.lunchStart ?? lunchStart;
      const dayLunchEnd = override?.lunchEnd ?? lunchEnd;
      return {
        day,
        start: override?.start ?? defaultStart,
        end: override?.end ?? defaultEnd,
        ...(dayLunchStart && dayLunchEnd ? { lunchStart: dayLunchStart, lunchEnd: dayLunchEnd } : {}),
      };
    });
  };

  const handleSubmit = async () => {
    if (!formName) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (selectedDays.length === 0) {
      toast({ title: "Selecione ao menos um dia", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const daySchedules = buildDaySchedules();
      const payload = {
        name: formName,
        start_time: defaultStart,
        end_time: defaultEnd,
        lunch_start: lunchStart || null,
        lunch_end: lunchEnd || null,
        work_days: selectedDays,
        day_schedules: daySchedules as any,
        establishment_id: establishmentId,
      };

      if (editingId) {
        const { error } = await supabase.from("op_shifts").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Turno atualizado!" });
      } else {
        const { error } = await supabase.from("op_shifts").insert(payload);
        if (error) throw error;
        toast({ title: "Turno criado!" });
      }

      setDialogOpen(false);
      resetForm();
      fetchShifts();
    } catch (error) {
      console.error("Error saving shift:", error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este turno?")) return;
    try {
      const { error } = await supabase.from("op_shifts").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Turno excluído!" });
      fetchShifts();
    } catch (error) {
      console.error("Error deleting shift:", error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const formatTime = (t: string) => t.slice(0, 5);

  // Get day schedule info for visual timeline
  const getDayInfo = (day: number) => {
    const override = dayOverrides[day];
    return {
      start: override?.start ?? defaultStart,
      end: override?.end ?? defaultEnd,
      lunchStart: override?.lunchStart ?? lunchStart,
      lunchEnd: override?.lunchEnd ?? lunchEnd,
      hasOverride: day in dayOverrides,
    };
  };

  // Timeline hours to show (5am to 23pm range)
  const timelineStart = 5;
  const timelineEnd = 23;
  const timelineHours = Array.from({ length: timelineEnd - timelineStart + 1 }, (_, i) => timelineStart + i);

  const renderShiftSchedule = (shift: Shift) => {
    if (shift.daySchedules.length === 0) {
      return (
        <p className="text-sm text-muted-foreground font-mono">
          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
        </p>
      );
    }

    const key = (ds: DaySchedule) => `${ds.start}-${ds.end}-${ds.lunchStart || ""}-${ds.lunchEnd || ""}`;
    const groups: { start: string; end: string; lunchStart?: string; lunchEnd?: string; days: number[] }[] = [];
    for (const ds of shift.daySchedules) {
      const k = key(ds);
      const existing = groups.find((g) => key({ day: 0, start: g.start, end: g.end, lunchStart: g.lunchStart, lunchEnd: g.lunchEnd }) === k);
      if (existing) {
        existing.days.push(ds.day);
      } else {
        groups.push({ start: ds.start, end: ds.end, lunchStart: ds.lunchStart, lunchEnd: ds.lunchEnd, days: [ds.day] });
      }
    }

    return (
      <div className="space-y-0.5">
        {groups.map((g, i) => (
          <p key={i} className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground/70">
              {g.days.map((d) => WEEKDAYS_SHORT[d]).join(", ")}
            </span>{" "}
            <span className="font-mono">
              {formatTime(g.start)} - {formatTime(g.end)}
            </span>
            {g.lunchStart && g.lunchEnd && (
              <span className="text-xs ml-1">🍽️ {g.lunchStart}-{g.lunchEnd}</span>
            )}
          </p>
        ))}
      </div>
    );
  };

  // Render visual timeline bar for a day
  const renderTimelineBar = (day: number) => {
    const info = getDayInfo(day);
    const isSelected = selectedDays.includes(day);
    if (!isSelected) return null;

    const startPct = ((parseInt(info.start.split(":")[0]) * 60 + parseInt(info.start.split(":")[1]) - timelineStart * 60) / ((timelineEnd - timelineStart) * 60)) * 100;
    const endPct = ((parseInt(info.end.split(":")[0]) * 60 + parseInt(info.end.split(":")[1]) - timelineStart * 60) / ((timelineEnd - timelineStart) * 60)) * 100;

    let lunchStartPct = 0;
    let lunchEndPct = 0;
    const hasLunch = !!(info.lunchStart && info.lunchEnd);
    if (hasLunch) {
      lunchStartPct = ((parseInt(info.lunchStart.split(":")[0]) * 60 + parseInt(info.lunchStart.split(":")[1]) - timelineStart * 60) / ((timelineEnd - timelineStart) * 60)) * 100;
      lunchEndPct = ((parseInt(info.lunchEnd.split(":")[0]) * 60 + parseInt(info.lunchEnd.split(":")[1]) - timelineStart * 60) / ((timelineEnd - timelineStart) * 60)) * 100;
    }

    return (
      <div className="relative h-7 w-full">
        {/* Work block */}
        <div
          className={cn(
            "absolute top-0.5 h-6 rounded-md transition-all",
            info.hasOverride ? "bg-accent-foreground/15 border border-accent-foreground/25" : "bg-primary/20 border border-primary/30"
          )}
          style={{ left: `${Math.max(0, startPct)}%`, width: `${Math.max(0, endPct - startPct)}%` }}
        >
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-foreground/70 truncate px-1">
            {info.start} - {info.end}
          </span>
        </div>
        {/* Lunch block overlay */}
        {hasLunch && (
          <div
            className="absolute top-0.5 h-6 rounded-sm bg-warning/30 border border-warning/40 flex items-center justify-center"
            style={{ left: `${Math.max(0, lunchStartPct)}%`, width: `${Math.max(0, lunchEndPct - lunchStartPct)}%` }}
          >
            <UtensilsCrossed className="h-3 w-3 text-warning" />
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Turnos</h1>
            <p className="text-muted-foreground">Configure os turnos de trabalho</p>
          </div>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Turno
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  {editingId ? "Editar Turno" : "Novo Turno"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5 mt-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Nome do Turno *</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Turno Manhã, Turno Comercial..."
                    className="text-base"
                  />
                </div>

                {/* Default hours + lunch in a nice grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-semibold">Jornada Padrão</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Entrada</span>
                        <Input
                          type="time"
                          value={defaultStart}
                          onChange={(e) => setDefaultStart(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Saída</span>
                        <Input
                          type="time"
                          value={defaultEnd}
                          onChange={(e) => setDefaultEnd(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed className="h-4 w-4 text-warning" />
                      <Label className="text-sm font-semibold">Intervalo</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Início</span>
                        <Input
                          type="time"
                          value={lunchStart}
                          onChange={(e) => setLunchStart(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Término</span>
                        <Input
                          type="time"
                          value={lunchEnd}
                          onChange={(e) => setLunchEnd(e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Deixe em branco se não houver</p>
                  </div>
                </div>

                {/* Days selection - pill style */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Dias de Trabalho *</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-medium transition-all border-2",
                          selectedDays.includes(day.value)
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-card text-muted-foreground border-border hover:border-primary/40"
                        )}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual weekly schedule */}
                {selectedDays.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Cronograma Semanal</Label>
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      {/* Timeline header */}
                      <div className="flex items-center border-b border-border bg-muted/30">
                        <div className="w-16 shrink-0 p-2 text-xs font-medium text-muted-foreground text-center">Dia</div>
                        <div className="flex-1 relative h-6">
                          {timelineHours.filter((_, i) => i % 2 === 0).map(h => (
                            <span
                              key={h}
                              className="absolute text-[10px] text-muted-foreground -translate-x-1/2"
                              style={{ left: `${((h - timelineStart) / (timelineEnd - timelineStart)) * 100}%` }}
                            >
                              {h}h
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Day rows */}
                      {[1, 2, 3, 4, 5, 6, 0]
                        .filter(day => selectedDays.includes(day))
                        .map((day) => {
                          const dayLabel = WEEKDAYS_SHORT[day];
                          const isExpanded = expandedDay === day;
                          const info = getDayInfo(day);
                          
                          return (
                            <div key={day}>
                              <div
                                className={cn(
                                  "flex items-center border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/20 transition-colors",
                                  isExpanded && "bg-muted/30"
                                )}
                                onClick={() => setExpandedDay(isExpanded ? null : day)}
                              >
                                <div className={cn(
                                  "w-16 shrink-0 p-2 text-xs font-semibold text-center",
                                  info.hasOverride ? "text-accent-foreground" : "text-foreground"
                                )}>
                                  {dayLabel}
                                  {info.hasOverride && <span className="block text-[9px] text-warning">custom</span>}
                                </div>
                                <div className="flex-1 py-1 pr-2">
                                  {renderTimelineBar(day)}
                                </div>
                              </div>
                              
                              {/* Expanded editing */}
                              {isExpanded && (
                                <div className="px-4 py-3 bg-muted/20 border-b border-border space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                      {WEEKDAYS.find(w => w.value === day)?.label} - Horário Específico
                                    </span>
                                    {info.hasOverride && (
                                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); clearOverride(day); }}>
                                        Usar padrão
                                      </Button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                      <span className="text-xs text-muted-foreground">Entrada</span>
                                      <Input
                                        type="time"
                                        value={info.start}
                                        onChange={(e) => setOverride(day, "start", e.target.value)}
                                        className="h-9"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-xs text-muted-foreground">Saída</span>
                                      <Input
                                        type="time"
                                        value={info.end}
                                        onChange={(e) => setOverride(day, "end", e.target.value)}
                                        className="h-9"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <UtensilsCrossed className="h-3 w-3" /> Início
                                      </span>
                                      <Input
                                        type="time"
                                        value={info.lunchStart}
                                        onChange={(e) => setOverride(day, "lunchStart", e.target.value)}
                                        className="h-9"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <UtensilsCrossed className="h-3 w-3" /> Fim
                                      </span>
                                      <Input
                                        type="time"
                                        value={info.lunchEnd}
                                        onChange={(e) => setOverride(day, "lunchEnd", e.target.value)}
                                        className="h-9"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Clique em um dia para personalizar seu horário. Blocos <span className="text-warning">amarelos</span> indicam intervalo.
                    </p>
                  </div>
                )}

                <Button className="w-full" onClick={handleSubmit} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* List */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : shifts.length === 0 ? (
            <div className="col-span-full text-center py-12 rounded-xl border border-border bg-card">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum turno cadastrado</p>
            </div>
          ) : (
            shifts.map((shift) => (
              <div key={shift.id} className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{shift.name}</p>
                      {renderShiftSchedule(shift)}
                      {shift.lunchStart && shift.lunchEnd && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          🍽️ Almoço: {shift.lunchStart} - {shift.lunchEnd}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(shift)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(shift.id)}>
                      <Trash2 className="h-4 w-4 text-critical" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
