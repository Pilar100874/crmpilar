import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function CVMovements() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("cv_vehicle_movements")
        .select("*, vehicle:cv_vehicles(name, plate), driver:cv_drivers(name)")
        .order("exit_time", { ascending: false }).limit(200);
      setRows(data ?? []);
    })();
  }, []);

  const filtered = rows.filter(r => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.vehicle?.name || "").toLowerCase().includes(s)
      || (r.vehicle?.plate || "").toLowerCase().includes(s)
      || (r.driver?.name || "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3">
        <h2 className="text-lg font-semibold">Movimentações</h2>
        <Input placeholder="Buscar veículo, placa, motorista..." value={q} onChange={e => setQ(e.target.value)} className="max-w-sm" />
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Veículo</TableHead><TableHead>Motorista</TableHead>
            <TableHead>Saída</TableHead><TableHead>Entrada</TableHead>
            <TableHead>KM</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map(m => (
              <TableRow key={m.id}>
                <TableCell><div className="font-medium">{m.vehicle?.name}</div><div className="text-xs text-muted-foreground">{m.vehicle?.plate}</div></TableCell>
                <TableCell>{m.driver?.name}</TableCell>
                <TableCell className="text-sm">{new Date(m.exit_time).toLocaleString()}</TableCell>
                <TableCell className="text-sm">{m.entry_time ? new Date(m.entry_time).toLocaleString() : "—"}</TableCell>
                <TableCell className="text-sm">{m.exit_km}{m.entry_km ? ` → ${m.entry_km}` : ""}</TableCell>
                <TableCell>
                  {m.status === "out"
                    ? <Badge variant="secondary">Em uso</Badge>
                    : <Badge>Retornado</Badge>}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma movimentação</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
