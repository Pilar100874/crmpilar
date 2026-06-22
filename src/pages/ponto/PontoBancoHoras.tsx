import { useEffect, useState } from "react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase = supabaseTyped as any;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

const fmt = (min: number) => {
  const sign = min < 0 ? "-" : "+";
  const v = Math.abs(min);
  return `${sign}${Math.floor(v / 60)}h${String(v % 60).padStart(2, "0")}`;
};

export default function PontoBancoHoras() {
  const [saldos, setSaldos] = useState<any[]>([]);
  const [lanc, setLanc] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase
        .from("ponto_banco_horas_saldos")
        .select("*, ponto_funcionarios(nome, matricula)")
        .eq("ativo", true)
        .order("saldo_minutos", { ascending: false });
      setSaldos(s || []);
      const { data: l } = await supabase
        .from("ponto_banco_horas_lancamentos")
        .select("*, ponto_funcionarios(nome)")
        .order("data", { ascending: false }).limit(50);
      setLanc(l || []);
    })();
  }, []);

  const totalCredito = saldos.reduce((a, s) => a + Math.max(0, s.saldo_minutos), 0);
  const totalDebito = saldos.reduce((a, s) => a + Math.min(0, s.saldo_minutos), 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="w-6 h-6" /> Banco de Horas</h1>
        <p className="text-muted-foreground text-sm">Saldos, créditos, débitos e compensações</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-emerald-500" />
          <div><div className="text-xs text-muted-foreground">Crédito total</div><div className="text-xl font-bold">{fmt(totalCredito)}</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <TrendingDown className="w-8 h-8 text-destructive" />
          <div><div className="text-xs text-muted-foreground">Débito total</div><div className="text-xl font-bold">{fmt(totalDebito)}</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <AlertCircle className="w-8 h-8 text-amber-500" />
          <div><div className="text-xs text-muted-foreground">Funcionários com saldo</div><div className="text-xl font-bold">{saldos.length}</div></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Saldos por funcionário</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Funcionário</TableHead><TableHead>Matrícula</TableHead>
              <TableHead>Saldo</TableHead><TableHead>Expira em</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {saldos.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.ponto_funcionarios?.nome}</TableCell>
                  <TableCell>{s.ponto_funcionarios?.matricula || "-"}</TableCell>
                  <TableCell><Badge variant={s.saldo_minutos >= 0 ? "default" : "destructive"}>{fmt(s.saldo_minutos)}</Badge></TableCell>
                  <TableCell>{s.data_expiracao ? new Date(s.data_expiracao).toLocaleDateString("pt-BR") : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Últimos lançamentos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead><TableHead>Funcionário</TableHead>
              <TableHead>Tipo</TableHead><TableHead>Minutos</TableHead><TableHead>Origem</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {lanc.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{new Date(l.data).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{l.ponto_funcionarios?.nome}</TableCell>
                  <TableCell><Badge variant="outline">{l.tipo}</Badge></TableCell>
                  <TableCell>{fmt(l.tipo === "debito" || l.tipo === "expiracao" ? -l.minutos : l.minutos)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.origem}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
