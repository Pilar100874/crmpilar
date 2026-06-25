import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function PontoAFD() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [empresa, setEmpresa] = useState("");
  const [ini, setIni] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [fim, setFim] = useState(new Date().toISOString().slice(0, 10));
  const [layout, setLayout] = useState("AFD");
  const [loading, setLoading] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);

  const loadHist = async () => {
    if (!empresa) return setHistorico([]);
    const { data } = await (supabase as any).from("ponto_afd_arquivos")
      .select("*").eq("empresa_id", empresa).order("created_at", { ascending: false }).limit(20);
    setHistorico(data || []);
  };

  useEffect(() => {
    supabase.from("ponto_empresas").select("id, razao_social, cnpj").then(({ data }) => setEmpresas(data || []));
  }, []);
  useEffect(() => { loadHist(); }, [empresa]);

  const gerar = async () => {
    if (!empresa) return toast.error("Selecione a empresa");
    setLoading(true);
    try {
      const fn = layout === "AFD" ? "ponto-gerar-afd" : "ponto-afd-export";
      const { data, error } = await supabase.functions.invoke(fn, {
        body: { empresa_id: empresa, data_inicio: ini, data_fim: fim, layout },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${data.total_registros ?? data.linhas ?? 0} registros · hash ${(data.hash || "").slice(0, 16)}…`);
      if (data?.download_url) window.open(data.download_url, "_blank");
      else if (data?.url) window.open(data.url, "_blank");
      loadHist();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const baixar = async (path: string) => {
    const { data } = await supabase.storage.from("ponto-exports").createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6" /> Arquivos Legais (Portaria 671/2021)</h1>
        <p className="text-muted-foreground text-sm">AFD com NSR sequencial e hash SHA-256 encadeado para fiscalização do MTE</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Gerar arquivo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Empresa</Label>
              <Select value={empresa} onValueChange={setEmpresa}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{empresas.map((e) => (<SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Layout</Label>
              <Select value={layout} onValueChange={setLayout}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AFD">AFD - Arquivo Fonte de Dados (Portaria 671)</SelectItem>
                  <SelectItem value="AFDT">AFDT - Arquivo Tratado</SelectItem>
                  <SelectItem value="AEJ">AEJ - Arquivo de Jornada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Início</Label><Input type="date" value={ini} onChange={(e) => setIni(e.target.value)} /></div>
            <div><Label>Fim</Label><Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
          </div>
          <Button onClick={gerar} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Gerar e baixar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Histórico AFD</CardTitle></CardHeader>
        <CardContent>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum arquivo gerado para esta empresa.</p>
          ) : (
            <div className="space-y-2">
              {historico.map((h) => (
                <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-md p-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{h.data_inicio} → {h.data_fim}</div>
                    <div className="text-xs text-muted-foreground">
                      NSR {h.nsr_inicial}–{h.nsr_final} · {h.total_registros} registros
                    </div>
                    <div className="text-[10px] font-mono break-all text-muted-foreground">SHA-256: {h.hash_arquivo}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{new Date(h.created_at).toLocaleString("pt-BR")}</Badge>
                    {h.storage_path && (
                      <Button size="sm" variant="outline" onClick={() => baixar(h.storage_path)}>
                        <Download className="w-3 h-3 mr-1" /> Baixar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
