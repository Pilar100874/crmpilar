import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;
type Status = { ambiente: string; tem_token_homologacao: boolean; tem_token_producao: boolean; updated_at: string } | null;

export default function ConfigNfe() {
  const [status, setStatus] = useState<Status>(null);
  const [ambiente, setAmbiente] = useState("homologacao");
  const [hom, setHom] = useState(""); const [prod, setProd] = useState("");
  const [salvando, setSalvando] = useState(false);
  const carregar = async () => {
    const { data } = await sb.rpc("nfe_config_status");
    const s = data?.[0] ?? null; setStatus(s); if (s) setAmbiente(s.ambiente);
  };
  useEffect(() => { carregar(); }, []);
  const salvar = async () => {
    if (ambiente === "producao" && !prod.trim() && !status?.tem_token_producao) return toast.error("Informe o token de produção antes de ativar produção");
    setSalvando(true);
    const { error } = await sb.rpc("nfe_config_salvar", { p_ambiente: ambiente, p_token_homologacao: hom, p_token_producao: prod });
    setSalvando(false);
    if (error) return toast.error(error.message);
    setHom(""); setProd(""); toast.success("Configuração salva"); carregar();
  };
  const situacao = (ok?: boolean) => ok ? <Badge>Configurado</Badge> : <Badge variant="outline">Não informado</Badge>;
  return (
    <div className="max-w-2xl space-y-4 p-3 sm:p-6">
      <div className="flex items-center gap-2"><KeyRound className="h-6 w-6 text-primary" /><h1 className="text-xl font-semibold sm:text-2xl">Configuração NF-e</h1></div>
      <p className="text-sm text-muted-foreground">Tokens do Focus NFe usados para emitir as notas de saída. Por segurança, depois de salvo o token não é mostrado de novo; para trocar, basta digitar o novo. Deixe em branco para manter o atual.</p>
      <Card><CardContent className="space-y-4 p-4">
        <div><Label>Ambiente de emissão</Label>
          <Select value={ambiente} onValueChange={setAmbiente}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="homologacao">Homologação (notas de teste, sem valor fiscal)</SelectItem>
            <SelectItem value="producao">Produção (notas reais)</SelectItem>
          </SelectContent></Select></div>
        <div className="space-y-1"><div className="flex items-center gap-2"><Label>Token de homologação</Label>{situacao(status?.tem_token_homologacao)}</div>
          <Input type="password" autoComplete="off" value={hom} onChange={(e) => setHom(e.target.value)} placeholder={status?.tem_token_homologacao ? "•••••••• (digite para substituir)" : "Cole o token de homologação"} /></div>
        <div className="space-y-1"><div className="flex items-center gap-2"><Label>Token de produção</Label>{situacao(status?.tem_token_producao)}</div>
          <Input type="password" autoComplete="off" value={prod} onChange={(e) => setProd(e.target.value)} placeholder={status?.tem_token_producao ? "•••••••• (digite para substituir)" : "Cole o token de produção"} /></div>
        {status?.updated_at && <p className="text-xs text-muted-foreground">Atualizado em {new Date(status.updated_at).toLocaleString("pt-BR")}</p>}
        <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</Button>
      </CardContent></Card>
      <p className="text-xs text-muted-foreground">Onde encontrar: painel do Focus NFe → Minhas empresas → empresa → Tokens. Cada CNPJ emissor precisa estar cadastrado lá com o certificado digital A1.</p>
    </div>
  );
}
