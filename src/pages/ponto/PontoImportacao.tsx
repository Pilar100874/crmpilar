import { useEffect, useState } from "react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase = supabaseTyped as any;
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

const TEMPLATE = "nome;cpf;pis;matricula;email;telefone;cargo;data_admissao\nJoão Silva;12345678901;12345678901;001;joao@x.com;11999990000;Operador;2024-01-15";

export default function PontoImportacao() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [empresa, setEmpresa] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("ponto_importacoes").select("*").order("created_at", { ascending: false }).limit(20);
    setHistorico(data || []);
  };
  useEffect(() => {
    supabase.from("ponto_empresas").select("id, razao_social").then(({ data }) => setEmpresas(data || []));
    load();
  }, []);

  const baixarTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "template_funcionarios.csv"; a.click();
  };

  const importar = async () => {
    if (!file || !empresa) return toast.error("Selecione empresa e arquivo");
    setLoading(true);
    try {
      const estId = await getEstabelecimentoId();
      const csv = await file.text();
      const { data, error } = await supabase.functions.invoke("ponto-import-funcionarios", {
        body: { estabelecimento_id: estId, ponto_empresa_id: empresa, csv, arquivo_nome: file.name },
      });
      if (error) throw error;
      toast.success(`${data.sucesso} importados, ${data.erros} erros`);
      setFile(null); load();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Upload className="w-6 h-6" /> Importação em Lote</h1>
        <p className="text-muted-foreground text-sm">Funcionários, escalas e feriados via CSV</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Importar funcionários</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" size="sm" onClick={baixarTemplate}><FileSpreadsheet className="w-4 h-4 mr-2" />Baixar template</Button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Empresa</Label>
              <Select value={empresa} onValueChange={setEmpresa}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{empresas.map((e) => (<SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Arquivo CSV</Label><Input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
          </div>
          <Button onClick={importar} disabled={loading || !file || !empresa}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}Importar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Arquivo</TableHead>
              <TableHead>Linhas</TableHead><TableHead>Sucesso</TableHead><TableHead>Erros</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {historico.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="text-xs">{new Date(h.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell><Badge variant="outline">{h.tipo}</Badge></TableCell>
                  <TableCell>{h.arquivo_nome || "-"}</TableCell>
                  <TableCell>{h.total_linhas}</TableCell>
                  <TableCell><Badge>{h.total_sucesso}</Badge></TableCell>
                  <TableCell>{h.total_erro > 0 && <Badge variant="destructive">{h.total_erro}</Badge>}</TableCell>
                  <TableCell><Badge>{h.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
