import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import { carregarRamaisUsuario, type RamaisUsuario } from "@/lib/voz/ramaisUsuario";

const db = supabase as any;

/** Ramais de IA do usuário: atendente virtual (com agente) e fazer ligações. */
export function UsuarioRamaisIA({ usuarioId, estabelecimentoId }: { usuarioId: string; estabelecimentoId: string }) {
  const { toast } = useToast();
  const vazio: RamaisUsuario = {
    usuario_id: usuarioId, estabelecimento_id: estabelecimentoId, virtual_ativo: false, ramal_virtual: "",
    senha_virtual: "", agente_virtual_id: null, ligacoes_ativo: false, ramal_ligacoes: "", senha_ligacoes: "", ajuda_ativa: false, escuta_geral: false,
  };
  const [r, setR] = useState<RamaisUsuario>(vazio);
  const [agentes, setAgentes] = useState<{ id: string; nome: string }[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    void carregarRamaisUsuario(usuarioId).then((d) => setR(d ? { ...vazio, ...d } : vazio));
    void db.from("voz_agentes").select("id, nome").eq("estabelecimento_id", estabelecimentoId).eq("ativo", true).order("nome")
      .then(({ data }: any) => setAgentes(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId, estabelecimentoId]);

  const m = (p: Partial<RamaisUsuario>) => setR((x) => ({ ...x, ...p }));

  const salvar = async () => {
    if (r.virtual_ativo && (!r.ramal_virtual?.trim() || !r.agente_virtual_id)) {
      toast({ title: "Atendente virtual incompleto", description: "Informe o ramal e escolha o agente de voz.", variant: "destructive" });
      return;
    }
    if (r.ligacoes_ativo && !r.ramal_ligacoes?.trim()) {
      toast({ title: "Informe o ramal para fazer ligações", variant: "destructive" });
      return;
    }
    setSalvando(true);
    const { error } = await db.from("voz_ramais_usuario").upsert({
      ...r, ramal_virtual: r.ramal_virtual?.trim() || null, ramal_ligacoes: r.ramal_ligacoes?.trim() || null,
      estabelecimento_id: estabelecimentoId, updated_at: new Date().toISOString(),
    });
    setSalvando(false);
    toast(error
      ? { title: "Erro ao salvar ramais de IA", description: error.message, variant: "destructive" }
      : { title: "Ramais de IA salvos", description: "Desligue e ligue o Pilar Voz para registrar os ramais." });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-sm font-medium text-foreground">🤖 Ramais de IA do usuário</p>
      <div className="space-y-2 rounded-md border border-border/60 p-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Ramal de atendente virtual</Label>
          <Switch checked={r.virtual_ativo} onCheckedChange={(v) => m({ virtual_ativo: v })} />
        </div>
        {r.virtual_ativo && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1"><Label className="text-xs">Ramal</Label>
              <Input value={r.ramal_virtual ?? ""} placeholder="3301" onChange={(e) => m({ ramal_virtual: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Senha SIP</Label>
              <Input type="password" value={r.senha_virtual ?? ""} onChange={(e) => m({ senha_virtual: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Agente de voz</Label>
              <Select value={r.agente_virtual_id ?? ""} onValueChange={(v) => m({ agente_virtual_id: v })}>
                <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                <SelectContent>{agentes.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
              </Select></div>
          </div>
        )}
      </div>
      <div className="space-y-2 rounded-md border border-border/60 p-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Ramal para fazer ligações</Label>
          <Switch checked={r.ligacoes_ativo} onCheckedChange={(v) => m({ ligacoes_ativo: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Ligado, libera o disparo em massa "Ligação com IA" para este usuário.</p>
        {r.ligacoes_ativo && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-xs">Ramal</Label>
              <Input value={r.ramal_ligacoes ?? ""} placeholder="3302" onChange={(e) => m({ ramal_ligacoes: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Senha SIP</Label>
              <Input type="password" value={r.senha_ligacoes ?? ""} onChange={(e) => m({ senha_ligacoes: e.target.value })} /></div>
          </div>
        )}
      </div>
      <div className="space-y-1 rounded-md border border-border/60 p-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Pode escutar ramais de outros usuários</Label>
          <Switch checked={!!r.escuta_geral} onCheckedChange={(v) => m({ escuta_geral: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Ligado, este usuário escolhe qualquer usuário pelo nome e ouve o ramal dele em silêncio (precisa do ramal para fazer ligações).</p>
      </div>
      <Button type="button" size="sm" onClick={salvar} disabled={salvando}><Save className="h-4 w-4 mr-1" />Salvar ramais de IA</Button>
    </div>
  );
}
