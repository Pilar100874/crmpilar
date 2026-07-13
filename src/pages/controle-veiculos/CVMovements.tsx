import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  List, Search, Filter, Car, LogIn, LogOut, Clock, User, Users, AlertTriangle, CheckCircle, CalendarIcon,
} from "lucide-react";
import { CVPageHeader, CVKpiCard } from "./CVPageHeader";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function CVMovements() {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<Date>(new Date());

  useEffect(() => {
    (async () => {
      setLoading(true);
      const start = new Date(dateFilter);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateFilter);
      end.setHours(23, 59, 59, 999);

      const { data } = await supabase
        .from("cv_vehicle_movements")
        .select("*, vehicle:cv_vehicles(name, plate), driver:cv_drivers(name)")
        .gte("exit_time", start.toISOString())
        .lte("exit_time", end.toISOString())
        .order("exit_time", { ascending: false })
        .limit(500);
      setMovements(data ?? []);
      setLoading(false);
    })();
  }, [dateFilter]);

  const filtered = movements.filter((m) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      !s ||
      (m.vehicle?.name || "").toLowerCase().includes(s) ||
      (m.vehicle?.plate || "").toLowerCase().includes(s) ||
      (m.driver?.name || "").toLowerCase().includes(s);
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <CVPageHeader
        icon={List}
        title="Movimentações"
        subtitle="Histórico completo de saídas e entradas"
      />

      <div className="grid gap-2 sm:gap-3 grid-cols-3">
        <CVKpiCard label="Total" value={movements.length} icon={List} tone="primary" />
        <CVKpiCard label="Em Trânsito" value={movements.filter((m) => m.status === "out").length} icon={LogOut} tone="warning" />
        <CVKpiCard label="Retornados" value={movements.filter((m) => m.status === "returned").length} icon={LogIn} tone="success" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-primary" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Data</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, "PPP", { locale: ptBR }) : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={(d) => d && setDateFilter(d)}
                    initialFocus
                    className="p-3"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Veículo, placa ou motorista..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="out">Em Trânsito</SelectItem>
                  <SelectItem value="returned">Retornados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="text-center py-12">
          <CardContent>
            <List className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Carregando movimentações...</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <List className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma movimentação encontrada</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== "all"
                ? "Tente ajustar os filtros"
                : "Não há movimentações registradas nesta data"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((m) => (
            <Card key={m.id} className="shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg min-w-0">
                    <Car className="h-5 w-5 text-primary shrink-0" />
                    <span className="truncate">{m.vehicle?.name} — {m.vehicle?.plate}</span>
                  </CardTitle>
                  <Badge className={m.status === "out" ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground"}>
                    {m.status === "out" ? "Em Trânsito" : "Retornado"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm"><LogOut className="h-4 w-4 text-warning" /><span className="font-medium">Saída:</span>{new Date(m.exit_time).toLocaleString("pt-BR")}</div>
                    <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-primary" /><span className="font-medium">Motorista:</span>{m.driver?.name}</div>
                    <div className="flex items-center gap-2 text-sm"><span className="font-medium">KM Saída:</span>{m.exit_km?.toLocaleString()}</div>
                    {m.has_helper && (
                      <div className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-accent" /><span className="font-medium">Ajudante:</span>{m.helper_name}</div>
                    )}
                    {m.exit_notes && (
                      <div className="text-sm text-muted-foreground italic">"{m.exit_notes}"</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {m.status === "returned" && m.entry_time ? (
                      <>
                        <div className="flex items-center gap-2 text-sm"><LogIn className="h-4 w-4 text-success" /><span className="font-medium">Entrada:</span>{new Date(m.entry_time).toLocaleString("pt-BR")}</div>
                        <div className="flex items-center gap-2 text-sm"><span className="font-medium">KM Entrada:</span>{m.entry_km?.toLocaleString()}
                          {m.entry_km > m.exit_km && (
                            <Badge variant="outline" className="text-xs">+{(m.entry_km - m.exit_km).toLocaleString()} km</Badge>
                          )}
                        </div>
                        {m.inspected_all_sides && (
                          <div className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-success" /><span className="font-medium">Vistoria completa</span></div>
                        )}
                        {m.reported_defects && (
                          <div className="p-2 bg-warning/10 rounded border-l-4 border-warning">
                            <div className="flex items-center gap-2 text-sm font-medium text-warning mb-1"><AlertTriangle className="h-4 w-4" /> Defeitos Reportados:</div>
                            <p className="text-sm">{m.reported_defects}</p>
                          </div>
                        )}
                        {m.damage_notes && (
                          <div className="p-2 bg-muted/50 rounded border-l-4 border-muted">
                            <div className="flex items-center gap-2 text-sm font-medium mb-1"><CheckCircle className="h-4 w-4" /> Avarias:</div>
                            <p className="text-sm text-muted-foreground">{m.damage_notes}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-center pt-4 text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        <span className="text-sm">Aguardando entrada</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
