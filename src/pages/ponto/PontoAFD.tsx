import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

export default function PontoAFD() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [empresa, setEmpresa] = useState("");
  const [ini, setIni] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [fim, setFim] = useState(new Date().toISOString().slice(0, 10));
  const [layout, setLayout] = useState("AFD");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("ponto_empresas").select("id, razao_social, cnpj").then(({ data }) => setEmpresas(data || []));
  }, []);

  const gerar = async () => {
    const estId = await getEstabelecimentoId();
    if (!estId || !empresa) return toast.error("Selecione a empresa");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ponto-afd-export", {
        body: { estabelecimento_id: estId, empresa_id: empresa, data_inicio: ini, data_fim: fim, layout },
      });
      if (error) throw error;
      toast.success(`${data.linhas} linhas geradas`);
      if (data.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6" /> Arquivos Legais (Portaria 671/2021)</h1>
        <p className="text-muted-foreground text-sm">AFD (marcações), AFDT (tratado) e AEJ (jornada) para fiscalização do MTE</p>
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
                  <SelectItem value="AFD">AFD - Arquivo Fonte de Dados</SelectItem>
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
    </div>
  );
}
