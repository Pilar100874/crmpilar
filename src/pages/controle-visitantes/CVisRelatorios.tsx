import { useState } from "react";
import { Search, Download, User, Car, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CVPageHeader } from "@/pages/controle-veiculos/CVPageHeader";
import { useVisitantesControl } from "@/hooks/useVisitantesControl";
import type { AccessFilters } from "@/types/visitantes";

function fmt(dt: string) {
  const d = new Date(dt);
  return { date: d.toLocaleDateString("pt-BR"), time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) };
}
function duration(a: string, b?: string) {
  const diff = (b ? new Date(b) : new Date()).getTime() - new Date(a).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function CVisRelatorios() {
  const [filters, setFilters] = useState<AccessFilters>({
    cpf: "", name: "", vehiclePlate: "", startDate: "", endDate: "", status: "all",
  });
  const { getFilteredRecords } = useVisitantesControl();
  const records = getFilteredRecords(filters);

  const exportCSV = () => {
    const headers = ["CPF","Nome","Empresa","Contato","Placa","Data Entrada","Hora Entrada","Data Saída","Hora Saída","Duração","Status","Motivo","Obs"];
    const rows = records.map((r) => {
      const e = fmt(r.entryDate);
      const s = r.exitDate ? fmt(r.exitDate) : { date: "-", time: "-" };
      return [
        r.visitor.cpf, r.visitor.name, r.visitor.company, r.contactPerson,
        r.vehiclePlate || "-", e.date, e.time, s.date, s.time,
        r.exitDate ? duration(r.entryDate, r.exitDate) : "Em andamento",
        r.status === "inside" ? "Presente" : "Saiu",
        r.purpose || "-", r.notes || "-",
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `visitantes_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };
  const clear = () => setFilters({ cpf: "", name: "", vehiclePlate: "", startDate: "", endDate: "", status: "all" });

  return (
    <div className="space-y-5">
      <CVPageHeader icon={FileText} title="Relatórios de Acesso" subtitle="Histórico completo com filtros e exportação" />

      <div className="max-w-6xl mx-auto space-y-4">
        <Card>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">CPF</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="000.000.000-00" value={filters.cpf}
                    onChange={(e) => setFilters((p) => ({ ...p, cpf: e.target.value }))} className="pl-9 font-mono" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome</Label>
                <Input value={filters.name} onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Placa</Label>
                <div className="relative">
                  <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input value={filters.vehiclePlate}
                    onChange={(e) => setFilters((p) => ({ ...p, vehiclePlate: e.target.value.toUpperCase() }))}
                    className="pl-9 font-mono uppercase" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data Início</Label>
                <Input type="date" value={filters.startDate}
                  onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data Fim</Label>
                <Input type="date" value={filters.endDate}
                  onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters((p) => ({ ...p, status: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="inside">Presentes</SelectItem>
                    <SelectItem value="exited">Saíram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button variant="outline" onClick={clear} size="sm" className="text-xs">Limpar Filtros</Button>
              <Button onClick={exportCSV} disabled={records.length === 0} size="sm" className="text-xs font-semibold">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar CSV ({records.length})
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Search className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhum registro encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Visitante</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Empresa</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider hidden md:table-cell">Visitando</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider hidden lg:table-cell">Placa</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Entrada</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider hidden sm:table-cell">Saída</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => {
                      const e = fmt(r.entryDate);
                      const s = r.exitDate ? fmt(r.exitDate) : null;
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {r.visitor.photo ? (
                                <img src={r.visitor.photo} alt="" className="w-7 h-9 object-cover rounded-md border border-border" />
                              ) : (
                                <div className="w-7 h-9 bg-muted rounded-md flex items-center justify-center border border-border">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-semibold truncate">{r.visitor.name}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  {r.visitor.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{r.visitor.company}</TableCell>
                          <TableCell className="text-xs hidden md:table-cell">{r.contactPerson}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {r.vehiclePlate ? (
                              <Badge variant="outline" className="text-[10px] font-mono">{r.vehiclePlate}</Badge>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <div className="font-medium">{e.date}</div>
                              <div className="text-muted-foreground text-[10px]">{e.time}</div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {s ? (
                              <div className="text-xs">
                                <div className="font-medium">{s.date}</div>
                                <div className="text-muted-foreground text-[10px]">{s.time}</div>
                              </div>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant={r.status === "inside" ? "default" : "secondary"}
                              className={`text-[10px] font-semibold ${
                                r.status === "inside" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" : ""
                              }`}>
                              {r.status === "inside" ? "Presente" : "Saiu"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
