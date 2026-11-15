import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;
type Status = { ambiente: string; url_api: string | null; usuario: string | null; tem_token: boolean; tem_licenca: boolean; updated_at: string } | null;

export default function ConfigSystax() {
  const [status, setStatus] = useState<Status>(null);
  const [ambiente, setAmbiente] = useState("homologacao");
  const [url, setUrl] = useState(""); const [usuario, setUsuario] = useState("");
  const [token, setToken] = useState(""); const [licenca, setLicenca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const carregar = async () => {
    const { data } = await sb.rpc("systax_config_status");
    const s = data?.[0] ?? null; setStatus(s);
    if (s) { setAmbiente(s.ambiente); setUrl(s.url_api ?? ""); setUsuario(s.usuario ?? ""); }
  };
  useEffect(() => { carregar(); }, []);
  const salvar = async () => {
    if (url.trim() && !url.trim().startsWith("https://")) return toast.error("O endereço da API deve começar com https://");
    setSalvando(true);
    const { error } = await sb.rpc("systax_config_salvar", { p_ambiente: ambiente, p_url_api: url, p_usuario: usuario, p_token: token, p_licenca: licenca });
    setSalvando(false);
    if (error) return toast.error(error.message);
    setToken(""); setLicenca(""); toast.success("Configuração salva"); carregar();
  };
  const situacao = (ok?: boolean) => ok ? <Badge>Configurado</Badge> : <Badge variant="outline">Não informado</Badge>;
  return (
    <div className="max-w-2xl space-y-4 p-3 sm:p-6">
      <div className="flex items-center gap-2"><Scale className="h-6 w-6 text-primary" /><h1 className="text-xl font-semibold sm:text-2xl">Configuração Systax</h1></div>
      <p className="text-sm text-muted-foreground">O motor fiscal Systax devolve CFOP, CST/CSOSN, ICMS, ST, DIFAL, FCP, IPI, PIS e COFINS de cada item no faturamento. Token e licença não são mostrados de novo depois de salvos; deixe em branco para manter os atuais.</p>
      <Card><CardContent className="space-y-4 p-4">
        <div><Label>Ambiente</Label>
          <Select value={ambiente} onValueChange={setAmbiente}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="homologacao">Homologação (testes)</SelectItem>
            <SelectItem value="producao">Produção</SelectItem>
          </SelectContent></Select></div>
        <div><Label>Endereço da API de cálculo</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… (informado pela Systax)" /></div>
        <div><Label>Usuário / código do cliente</Label><Input value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Opcional" /></div>
        <div className="space-y-1"><div className="flex items-center gap-2"><Label>Token de acesso</Label>{situacao(status?.tem_token)}</div>
          <Input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder={status?.tem_token ? "•••••••• (digite para substituir)" : "Cole o token"} /></div>
        <div className="space-y-1"><div className="flex items-center gap-2"><Label>Licença</Label>{situacao(status?.tem_licenca)}</div>
          <Input type="password" autoComplete="off" value={licenca} onChange={(e) => setLicenca(e.target.value)} placeholder={status?.tem_licenca ? "•••••••• (digite para substituir)" : "Cole a chave de licença"} /></div>
        {status?.updated_at && <p className="text-xs text-muted-foreground">Atualizado em {new Date(status.updated_at).toLocaleString("pt-BR")}</p>}
        <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</Button>
      </CardContent></Card>
    </div>
  );
}
