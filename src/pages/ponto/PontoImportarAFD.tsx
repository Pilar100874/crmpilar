import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";

export default function PontoImportarAFD() {
  const { empresaId } = usePontoEmpresa();
  const [formato, setFormato] = useState("rep-c");
  const [filialId, setFilialId] = useState<string>("");
  const [equipamentoId, setEquipamentoId] = useState<string>("");
  const [filiais, setFiliais] = useState<any[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);

  const carregar = async () => {
    if (!empresaId) return;
    const [f, eq, h] = await Promise.all([
      supabase.from("ponto_filiais").select("id, nome").eq("empresa_id", empresaId),
      supabase.from("ponto_equipamentos").select("id, modelo, numero_serie").eq("empresa_id", empresaId),
      supabase.from("ponto_afd_importacoes").select("*").eq("empresa_id", empresaId)
        .order("created_at", { ascending: false }).limit(20),
    ]);
    setFiliais(f.data || []);
    setEquipamentos(eq.data || []);
    setHistorico(h.data || []);
  };
  useEffect(() => { carregar(); }, [empresaId]);

  const importar = async () => {
    if (!arquivo) return toast.error("Selecione um arquivo AFD");
    if (!empresaId || !estabelecimentoId) return toast.error("Empresa não identificada");
    setEnviando(true);
    try {
      const buf = await arquivo.arrayBuffer();
      // base64 encode (latin1 safe)
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const conteudo_base64 = btoa(bin);

      const { data, error } = await supabase.functions.invoke("ponto-importar-afd", {
        body: {
          empresa_id: empresaId,
          estabelecimento_id: estabelecimentoId,
          conteudo_base64,
          nome_arquivo: arquivo.name,
          formato,
          filial_id: filialId || null,
          equipamento_id: equipamentoId || null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(
        `Importado: ${(data as any).importados} · Duplicados: ${(data as any).duplicados} · Erros: ${(data as any).erros}`
      );
      setArquivo(null);
      carregar();
    } catch (e: any) {
      toast.error(e.message || "Erro ao importar");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" /> Importação AFD (REP-A / REP-C)
        </h1>
        <p className="text-sm text-muted-foreground">
          Importe o Arquivo Fonte de Dados extraído do relógio de ponto. Marcações duplicadas são ignoradas automaticamente.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Novo arquivo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={formato} onValueChange={setFormato}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rep-c">REP-C (Portaria 671/2021)</SelectItem>
                  <SelectItem value="rep-a">REP-A (Alternativo)</SelectItem>
                  <SelectItem value="rep-p">REP-P (Convencional)</SelectItem>
                  <SelectItem value="generico">Genérico (1510/2009)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filial (opcional)</Label>
              <Select value={filialId} onValueChange={setFilialId}>
                <SelectTrigger><SelectValue placeholder="Sem filial específica" /></SelectTrigger>
                <SelectContent>
                  {filiais.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Equipamento (opcional)</Label>
              <Select value={equipamentoId} onValueChange={setEquipamentoId}>
                <SelectTrigger><SelectValue placeholder="Sem equipamento" /></SelectTrigger>
                <SelectContent>
                  {equipamentos.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.modelo} {e.numero_serie ? `· ${e.numero_serie}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Arquivo AFD (.txt)</Label>
            <Input type="file" accept=".txt,.afd" onChange={(e) => setArquivo(e.target.files?.[0] || null)} />
            {arquivo && (
              <p className="text-xs text-muted-foreground">
                {arquivo.name} · {(arquivo.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>

          <Button onClick={importar} disabled={!arquivo || enviando} className="w-full md:w-auto">
            {enviando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Importar marcações
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de importações</CardTitle></CardHeader>
        <CardContent>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma importação ainda</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Importadas</TableHead>
                  <TableHead className="text-right">Duplicadas</TableHead>
                  <TableHead className="text-right">Erros</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs">{new Date(h.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="font-mono text-xs">{h.nome_arquivo}</TableCell>
                    <TableCell><Badge variant="outline">{h.formato}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{h.total_marcacoes}</TableCell>
                    <TableCell className="text-right tabular-nums text-green-600">{h.marcacoes_importadas}</TableCell>
                    <TableCell className="text-right tabular-nums text-orange-600">{h.marcacoes_duplicadas}</TableCell>
                    <TableCell className="text-right tabular-nums text-red-600">{h.marcacoes_erro}</TableCell>
                    <TableCell>
                      {h.status === "concluido" ? (
                        <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Concluído</Badge>
                      ) : h.status === "erro" ? (
                        <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Erro</Badge>
                      ) : (
                        <Badge variant="secondary">Processando</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
