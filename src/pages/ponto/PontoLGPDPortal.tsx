import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Download, FileText } from "lucide-react";

const TIPOS: Record<string, string> = {
  exportacao: "Exportação dos meus dados",
  portabilidade: "Portabilidade (formato estruturado)",
  correcao: "Correção de dados",
  anonimizacao: "Anonimização",
  exclusao: "Exclusão",
};

export default function PontoLGPDPortal() {
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [tipo, setTipo] = useState("exportacao");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);

  async function carregar() {
    const { data } = await supabase.from("ponto_lgpd_solicitacoes").select("*").order("created_at", { ascending: false });
    setSolicitacoes(data ?? []);
  }
  useEffect(() => { carregar(); }, []);

  async function abrir() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Faça login"); setLoading(false); return; }
    const { data: u } = await supabase.from("usuarios").select("id").eq("auth_id", user.id).maybeSingle();
    const { data: func } = await supabase.from("ponto_funcionarios").select("id").eq("usuario_id", u?.id).maybeSingle();
    if (!func) { toast.error("Funcionário não vinculado"); setLoading(false); return; }
    const { error } = await supabase.from("ponto_lgpd_solicitacoes").insert({
      funcionario_id: func.id, tipo, motivo, status: "pendente",
    });
    if (error) toast.error(error.message); else { toast.success("Solicitação registrada"); setMotivo(""); carregar(); }
    setLoading(false);
  }

  async function executar(id: string) {
    const { data, error } = await supabase.functions.invoke("ponto-lgpd-exportar", { body: { solicitacao_id: id } });
    if (error) toast.error(error.message); else { toast.success("Processado"); carregar(); }
    if ((data as any)?.url) window.open((data as any).url, "_blank");
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Portal LGPD — Meus Dados</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Lei nº 13.709/2018 — você tem direito a acessar, corrigir, portar, anonimizar ou excluir seus dados pessoais.
        Prazo legal de resposta: <Badge variant="outline">15 dias</Badge>
      </p>

      <Card>
        <CardHeader><CardTitle>Nova Solicitação</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TIPOS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea placeholder="Motivo / observações (opcional)" value={motivo} onChange={e => setMotivo(e.target.value)} />
          <Button onClick={abrir} disabled={loading}>Abrir solicitação</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Minhas Solicitações</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {solicitacoes.map(s => (
            <div key={s.id} className="flex items-center justify-between border rounded p-3">
              <div>
                <div className="font-medium">{TIPOS[s.tipo] ?? s.tipo}</div>
                <div className="text-xs text-muted-foreground">
                  Aberta {new Date(s.created_at).toLocaleString("pt-BR")} · Prazo {new Date(s.prazo_resposta).toLocaleDateString("pt-BR")}
                </div>
                {s.resposta && <div className="text-xs mt-1">{s.resposta}</div>}
              </div>
              <div className="flex gap-2 items-center">
                <Badge variant={s.status === "concluida" ? "default" : "outline"}>{s.status}</Badge>
                {s.arquivo_resultado_url && (
                  <Button size="sm" variant="outline" onClick={() => window.open(s.arquivo_resultado_url, "_blank")}>
                    <Download className="h-3 w-3 mr-1" />Baixar
                  </Button>
                )}
                {s.status === "pendente" && (s.tipo === "exportacao" || s.tipo === "portabilidade" || s.tipo === "anonimizacao" || s.tipo === "exclusao") && (
                  <Button size="sm" onClick={() => executar(s.id)}>
                    <FileText className="h-3 w-3 mr-1" />Processar
                  </Button>
                )}
              </div>
            </div>
          ))}
          {!solicitacoes.length && <p className="text-sm text-muted-foreground">Nenhuma solicitação ainda.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
