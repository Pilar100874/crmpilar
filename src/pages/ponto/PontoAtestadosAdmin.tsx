import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Check, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";

export default function PontoAtestadosAdmin() {
  const { empresaId } = usePontoEmpresa();
  const [items, setItems] = useState<any[]>([]);
  const [filtro, setFiltro] = useState("pendente");
  const [sel, setSel] = useState<any>(null);
  const [preview, setPreview] = useState<string>("");
  const [observacao, setObservacao] = useState("");

  const load = async () => {
    if (!empresaId) return;
    const { data } = await (supabase.from as any)("ponto_atestados")
      .select("*, ponto_funcionarios!inner(nome, empresa_id, matricula)")
      .eq("ponto_funcionarios.empresa_id", empresaId)
      .eq("status", filtro)
      .order("created_at", { ascending: false }).limit(100);
    setItems(data || []);
  };
  useEffect(() => { load(); }, [empresaId, filtro]);

  const abrir = async (a: any) => {
    setSel(a);
    setObservacao(a.observacao || "");
    const { data } = await supabase.storage.from("ponto-atestados").createSignedUrl(a.arquivo_url, 300);
    setPreview(data?.signedUrl || "");
  };

  const decidir = async (status: "aprovado" | "rejeitado") => {
    if (!sel) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase.from as any)("ponto_atestados")
      .update({ status, observacao, revisado_em: new Date().toISOString(), revisado_por: user?.id })
      .eq("id", sel.id);
    if (error) return toast.error(error.message);
    toast.success(`Atestado ${status}`);
    setSel(null); load();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> Atestados</h1>
          <p className="text-muted-foreground text-sm">Revisar atestados enviados pelos funcionários.</p>
        </div>
        <div className="flex gap-2">
          {["pendente", "aprovado", "rejeitado"].map((s) => (
            <Button key={s} variant={filtro === s ? "default" : "outline"} size="sm" onClick={() => setFiltro(s)}>
              {s}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Nenhum atestado {filtro}.</p> :
            <div className="divide-y">
              {items.map((a) => (
                <div key={a.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{a.ponto_funcionarios?.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      Mat. {a.ponto_funcionarios?.matricula || "—"} · {a.data_inicio} → {a.data_fim}
                      {a.cid && <span> · CID {a.cid}</span>}
                    </div>
                  </div>
                  <Badge variant={a.status === "aprovado" ? "default" : a.status === "rejeitado" ? "destructive" : "secondary"}>
                    {a.status}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => abrir(a)}><Eye className="h-4 w-4 mr-1" /> Ver</Button>
                </div>
              ))}
            </div>
          }
        </CardContent>
      </Card>

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Atestado de {sel?.ponto_funcionarios?.nome}</DialogTitle></DialogHeader>
          {sel && (
            <div className="space-y-3">
              <div className="text-sm">
                <strong>Período:</strong> {sel.data_inicio} → {sel.data_fim}<br />
                {sel.cid && <><strong>CID:</strong> {sel.cid}<br /></>}
              </div>
              {preview && (
                <div className="border rounded overflow-hidden bg-muted">
                  {preview.match(/\.(png|jpe?g|webp)/i) ?
                    <img src={preview} alt="atestado" className="max-h-96 w-full object-contain" /> :
                    <iframe src={preview} className="w-full h-96" />
                  }
                </div>
              )}
              <Textarea placeholder="Observação (opcional)" value={observacao}
                onChange={(e) => setObservacao(e.target.value)} />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => decidir("rejeitado")}><X className="h-4 w-4 mr-1" /> Rejeitar</Button>
            <Button onClick={() => decidir("aprovado")}><Check className="h-4 w-4 mr-1" /> Aprovar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
