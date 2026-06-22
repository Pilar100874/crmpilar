import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { toast } from "sonner";

/**
 * Exportação para Domínio Sistemas Web (Folha)
 * Layout TXT posicional simplificado por evento/rubrica.
 * Cada linha: CPF(11) | MATRICULA(10) | DATA(YYYYMMDD) | RUBRICA(4) | QUANTIDADE(5, em horas decimais x100)
 */
export default function PontoExportacao() {
  const { empresaId } = usePontoEmpresa();
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [inicio, setInicio] = useState(firstDay);
  const [fim, setFim] = useState(lastDay);
  const [logs, setLogs] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  const loadLogs = async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from("ponto_export_logs")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(20);
    setLogs(data || []);
  };
  useEffect(() => { loadLogs(); }, [empresaId]);

  const pad = (s: string | number, n: number, c = "0") => String(s).padStart(n, c).slice(0, n);

  const gerar = async () => {
    if (!empresaId) return toast.error("Selecione empresa");
    setGenerating(true);
    try {
      // Busca funcionários da empresa
      const { data: funcs } = await supabase
        .from("ponto_funcionarios")
        .select("id, cpf, matricula, codigo_dominio")
        .eq("empresa_id", empresaId);
      const ids = (funcs || []).map((f) => f.id);
      if (!ids.length) { toast.error("Sem funcionários"); setGenerating(false); return; }
      const fmap = Object.fromEntries((funcs || []).map((f) => [f.id, f]));

      // Espelho do período
      const { data: esp } = await supabase
        .from("ponto_espelho_diario")
        .select("*")
        .in("funcionario_id", ids)
        .gte("data", inicio).lte("data", fim);

      // Mapeamento de eventos → rubricas
      const { data: rubricas } = await supabase
        .from("ponto_rubricas_dominio")
        .select("evento, codigo_rubrica")
        .eq("empresa_id", empresaId)
        .eq("ativo", true);
      const rmap = Object.fromEntries((rubricas || []).map((r) => [r.evento, r.codigo_rubrica]));
      const r = (k: string, def: string) => rmap[k] || def;

      const lines: string[] = [];
      let total = 0;
      for (const e of esp || []) {
        const fun = fmap[e.funcionario_id];
        if (!fun) continue;
        const cpf = pad((fun.cpf || "").replace(/\D/g, ""), 11);
        const mat = pad(fun.codigo_dominio || fun.matricula || "", 10);
        const dt = (e.data as string).replace(/-/g, "");
        const push = (rub: string, min: number) => {
          if (!min) return;
          const qtd = pad(Math.round((min / 60) * 100), 5);
          lines.push(`${cpf}${mat}${dt}${pad(rub, 4)}${qtd}`);
          total++;
        };
        push(r("hora_extra", "0050"), e.extra_min || 0);
        push(r("adicional_noturno", "0060"), e.noturno_min || 0);
        push(r("atraso", "0070"), e.atraso_min || 0);
        push(r("falta", "0080"), e.falta ? 480 : 0);
      }

      const conteudo = lines.join("\n");
      const blob = new Blob([conteudo], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dominio_ponto_${inicio}_${fim}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      await supabase.from("ponto_export_logs").insert({
        empresa_id: empresaId,
        periodo_inicio: inicio,
        periodo_fim: fim,
        formato: "dominio_txt",
        arquivo_conteudo: conteudo,
        total_registros: total,
        total_funcionarios: ids.length,
        status: "gerado",
      });
      toast.success(`Arquivo gerado: ${total} lançamentos`);
      loadLogs();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold sm:text-2xl">Exportação Domínio Sistemas</h2>
        <p className="text-sm text-muted-foreground">
          Gera arquivo TXT com mapeamento de eventos → rubricas para importação na folha do Domínio.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Início</Label>
              <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div>
              <Label>Fim</Label>
              <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={gerar} disabled={generating || !empresaId} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                {generating ? "Gerando…" : "Gerar TXT"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Dica: configure os códigos de rubrica em <strong>Empresas → Rubricas Domínio</strong> (em breve)
            para personalizar o mapeamento. Sem configuração, são usados códigos padrão.
          </p>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-2 font-semibold">Exportações recentes</h3>
        {logs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhuma exportação ainda.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-3">Quando</th>
                  <th className="p-3">Período</th>
                  <th className="p-3 hidden sm:table-cell">Funcionários</th>
                  <th className="p-3">Lançamentos</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="p-3">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                    <td className="p-3">{l.periodo_inicio} → {l.periodo_fim}</td>
                    <td className="p-3 hidden sm:table-cell">{l.total_funcionarios}</td>
                    <td className="p-3">{l.total_registros}</td>
                    <td className="p-3">{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
