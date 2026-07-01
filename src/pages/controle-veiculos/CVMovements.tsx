import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  List, Search, Filter, Car, LogIn, LogOut, Clock, User, Users, AlertTriangle, CheckCircle,
} from "lucide-react";

export default function CVMovements() {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("cv_vehicle_movements")
        .select("*, vehicle:cv_vehicles(name, plate), driver:cv_drivers(name)")
        .order("exit_time", { ascending: false })
        .limit(500);
      setMovements(data ?? []);
      setLoading(false);
    })();
  }, []);

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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <List className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Movimentações</h1>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar:</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Veículo, placa ou motorista..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status:</label>
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-primary">{movements.length}</div>
          <p className="text-sm text-muted-foreground">Total de Movimentações</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-warning">
            {movements.filter((m) => m.status === "out").length}
          </div>
          <p className="text-sm text-muted-foreground">Veículos em Trânsito</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-success">
            {movements.filter((m) => m.status === "returned").length}
          </div>
          <p className="text-sm text-muted-foreground">Retornados</p>
        </CardContent></Card>
      </div>

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
                : "Não há movimentações registradas ainda"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((m) => (
            <Card key={m.id} className="shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Car className="h-5 w-5 text-primary" />
                    {m.vehicle?.name} — {m.vehicle?.plate}
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
