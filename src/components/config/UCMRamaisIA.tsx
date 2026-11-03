import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AgenteRamal {
  id: string;
  nome: string;
  ramal_ia: string | null;
  senha_ramal_ia: string | null;
  codigo_escuta: string | null;
}

/** Ramal da IA é da empresa (um por agente de voz), não de cada usuário. */
export function UCMRamaisIA({ estabelecimentoId }: { estabelecimentoId: string }) {
  const { toast } = useToast();
  const [agentes, setAgentes] = useState<AgenteRamal[]>([]);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [emp, setEmp] = useState({ voz_ramal_empresa: "", voz_senha_ramal_empresa: "", voz_agente_empresa_id: "" });

  useEffect(() => {
    (supabase as any).from("ucm_config").select("voz_ramal_empresa, voz_senha_ramal_empresa, voz_agente_empresa_id")
      .eq("estabelecimento_id", estabelecimentoId).maybeSingle()
      .then(({ data }: any) => data && setEmp({
        voz_ramal_empresa: data.voz_ramal_empresa ?? "", voz_senha_ramal_empresa: data.voz_senha_ramal_empresa ?? "",
        voz_agente_empresa_id: data.voz_agente_empresa_id ?? "",
      }));
  }, [estabelecimentoId]);

  const salvarEmpresa = async () => {
    setSalvando("empresa");
    const { error } = await (supabase as any).from("ucm_config").update({
      voz_ramal_empresa: emp.voz_ramal_empresa.trim() || null,
      voz_senha_ramal_empresa: emp.voz_senha_ramal_empresa || null,
      voz_agente_empresa_id: emp.voz_agente_empresa_id || null,
    }).eq("estabelecimento_id", estabelecimentoId);
    setSalvando(null);
    toast(error
      ? { title: "Erro ao salvar ramal da empresa", description: error.message, variant: "destructive" }
      : { title: "Ramal do atendente virtual da empresa salvo", description: "Desligue e ligue o Pilar Voz para aplicar." });
  };

  useEffect(() => {
    supabase
      .from("voz_agentes")
      .select("id, nome, ramal_ia, senha_ramal_ia, codigo_escuta")
      .eq("estabelecimento_id", estabelecimentoId)
      .order("nome")
      .then(({ data }) => setAgentes((data as AgenteRamal[]) || []));
  }, [estabelecimentoId]);

  const alterar = (id: string, campo: keyof AgenteRamal, valor: string) =>
    setAgentes((l) => l.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)));

  const salvar = async (a: AgenteRamal) => {
    setSalvando(a.id);
    const { error } = await supabase
      .from("voz_agentes")
      .update({
        ramal_ia: a.ramal_ia?.trim() || null,
        senha_ramal_ia: a.senha_ramal_ia || null,
        codigo_escuta: a.codigo_escuta?.trim() || null,
      })
      .eq("id", a.id);
    setSalvando(null);
    toast(error
      ? { title: "Erro ao salvar ramal da IA", description: error.message, variant: "destructive" }
      : { title: "Ramal da IA salvo", description: "Desligue e ligue o Pilar Voz para aplicar." });
  };

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div className="rounded-md border border-border p-2 space-y-2">
        <p className="text-sm font-medium text-foreground">Atendente virtual da empresa</p>
        <p className="text-xs text-muted-foreground">Ramal geral da empresa atendido pela IA. Os ramais de cada usuário ficam em Editar usuário.</p>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1 w-28"><Label className="text-xs">Ramal</Label>
            <Input value={emp.voz_ramal_empresa} placeholder="3333" onChange={(e) => setEmp({ ...emp, voz_ramal_empresa: e.target.value })} /></div>
          <div className="space-y-1 flex-1 min-w-[8rem]"><Label className="text-xs">Senha SIP</Label>
            <Input type="password" value={emp.voz_senha_ramal_empresa} onChange={(e) => setEmp({ ...emp, voz_senha_ramal_empresa: e.target.value })} /></div>
          <div className="space-y-1 flex-1 min-w-[10rem]"><Label className="text-xs">Agente de voz</Label>
            <Select value={emp.voz_agente_empresa_id} onValueChange={(v) => setEmp({ ...emp, voz_agente_empresa_id: v })}>
              <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
              <SelectContent>{agentes.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
            </Select></div>
          <Button size="sm" onClick={salvarEmpresa} disabled={salvando === "empresa"}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
        </div>
      </div>
      <Label>Ramal da IA por agente</Label>
      <p className="text-xs text-muted-foreground">
        Um ramal por agente de voz, para toda a empresa (não é por usuário). Use um ramal SIP que exista no UCM;
        a senha é a senha SIP desse ramal. Os atendentes recebem a transferência no próprio ramal.
      </p>
      {agentes.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum agente de voz cadastrado. Crie um em Agentes de voz.</p>
      )}
      {agentes.map((a) => (
        <div key={a.id} className="rounded-md border border-border p-2 space-y-2">
          <p className="text-sm font-medium text-foreground">{a.nome}</p>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-1 w-28">
              <Label className="text-xs">Ramal</Label>
              <Input value={a.ramal_ia || ""} placeholder="1050" onChange={(e) => alterar(a.id, "ramal_ia", e.target.value)} />
            </div>
            <div className="space-y-1 flex-1 min-w-[10rem]">
              <Label className="text-xs">Senha SIP</Label>
              <Input type="password" value={a.senha_ramal_ia || ""} onChange={(e) => alterar(a.id, "senha_ramal_ia", e.target.value)} />
            </div>
            <div className="space-y-1 w-32">
              <Label className="text-xs">Código de escuta</Label>
              <Input value={a.codigo_escuta || ""} placeholder="opcional" onChange={(e) => alterar(a.id, "codigo_escuta", e.target.value)} />
            </div>
            <Button size="sm" onClick={() => salvar(a)} disabled={salvando === a.id}>
              <Save className="h-4 w-4 mr-1" /> Salvar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
