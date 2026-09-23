import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { KeyRound, Loader2, Mail, Phone, UserCheck } from "lucide-react";

interface Props {
  vendedorEmpresaId: string;
  vendedorNome: string;
  vendedorEmail?: string | null;
  vendedorTelefone?: string | null;
  estabelecimentoId: string;
}

const GRUPO_ATENDIMENTO = "Representante (Atendimento)";
const PERM = { view: true, create: true, edit: true, delete: false };

/** Aba "Acesso ao sistema" do representante: cria usuário com acesso somente ao Atendimento. */
export function VendedorAcessoTab({ vendedorEmpresaId, vendedorNome, vendedorEmail, vendedorTelefone, estabelecimentoId }: Props) {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [temLogin, setTemLogin] = useState(false);
  const [grupos, setGrupos] = useState<{ id: string; nome: string }[]>([]);
  const [f, setF] = useState({
    ativo: true, nome: vendedorNome, email: vendedorEmail || "", senha: "", whatsapp: vendedorTelefone || "",
    grupo_acesso_id: "", ramal: "", usuario_sip: "", senha_sip: "",
    senha_email: "", smtp: "", porta_smtp: "587", imap: "", porta_imap: "993",
    hora_inicial: "", hora_final: "",
  });
  const set = (k: keyof typeof f, v: any) => setF((p) => ({ ...p, [k]: v }));

  const carregar = async () => {
    setCarregando(true);
    const [{ data: gs }, { data: u }] = await Promise.all([
      supabase.from("grupos_acesso").select("id, nome").eq("estabelecimento_id", estabelecimentoId).order("nome"),
      supabase.from("usuarios").select("*").eq("vendedor_empresa_id" as any, vendedorEmpresaId).maybeSingle(),
    ]);
    setGrupos(gs || []);
    if (u) {
      const x: any = u;
      setUsuarioId(x.id);
      setTemLogin(!!x.auth_user_id);
      setF((p) => ({
        ...p, ativo: x.ativo !== false, nome: x.nome || p.nome, email: x.email || "", whatsapp: x.whatsapp || "",
        grupo_acesso_id: x.grupo_acesso_id || "", ramal: x.ramal || "", usuario_sip: x.usuario_sip || "",
        senha_sip: x.senha_sip || "", senha_email: x.senha_email || "", smtp: x.smtp || "",
        porta_smtp: String(x.porta_smtp ?? "587"), imap: x.imap || "", porta_imap: String(x.porta_imap ?? "993"),
        hora_inicial: x.hora_inicial || "", hora_final: x.hora_final || "",
      }));
    }
    setCarregando(false);
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [vendedorEmpresaId]);

  const criarGrupoAtendimento = async () => {
    const existente = grupos.find((g) => g.nome === GRUPO_ATENDIMENTO);
    if (existente) { set("grupo_acesso_id", existente.id); return; }
    const { data, error } = await supabase.from("grupos_acesso").insert({
      nome: GRUPO_ATENDIMENTO, perfil: "vendedor", estabelecimento_id: estabelecimentoId,
      menus_permitidos: { Atendimento: PERM, Orçamentos: PERM, Orçamento: PERM, Email: PERM, Softphone: PERM },
    } as any).select("id, nome").single();
    if (error) { toast.error("Não foi possível criar o grupo: " + error.message); return; }
    setGrupos((g) => [...g, data]);
    set("grupo_acesso_id", data.id);
    toast.success(`Grupo "${GRUPO_ATENDIMENTO}" criado com acesso somente ao Atendimento.`);
  };

  const salvar = async () => {
    const email = f.email.trim().toLowerCase();
    if (!f.nome.trim()) return toast.error("Informe o nome.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Informe um e-mail válido para o login.");
    if (!f.grupo_acesso_id) return toast.error("Selecione o grupo de usuário.");
    if (!temLogin && f.senha.length < 8) return toast.error("Informe a senha inicial (mínimo 8 caracteres).");
    if (f.senha && f.senha.length < 8) return toast.error("A senha precisa ter no mínimo 8 caracteres.");

    setSalvando(true);
    try {
      const payload: any = {
        nome: f.nome.trim(), email, whatsapp: f.whatsapp || null, ativo: f.ativo, tipo: "vendedor",
        grupo_acesso_id: f.grupo_acesso_id, estabelecimento_id: estabelecimentoId, vendedor_empresa_id: vendedorEmpresaId,
        ramal: f.ramal || null, usuario_sip: f.usuario_sip || null, senha_sip: f.senha_sip || null,
        senha_email: f.senha_email || null, smtp: f.smtp || null, porta_smtp: f.porta_smtp ? Number(f.porta_smtp) : null,
        imap: f.imap || null, porta_imap: f.porta_imap ? Number(f.porta_imap) : null,
        usar_autenticacao: !!f.senha_email,
        hora_inicial: f.hora_inicial || null, hora_final: f.hora_final || null,
      };
      let id = usuarioId;
      if (id) {
        const { error } = await supabase.from("usuarios").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("usuarios").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
        setUsuarioId(id);
      }

      if (f.senha) {
        const { data, error } = await supabase.functions.invoke("criar-acesso-usuario", { body: { usuario_id: id, senha: f.senha } });
        let msg = (data as any)?.error ?? null;
        if (!msg && error) {
          const resp = (error as any).context as Response | undefined;
          const corpo = resp && typeof resp.json === "function" ? await resp.json().catch(() => null) : null;
          msg = corpo?.error ?? error.message;
        }
        if (msg) throw new Error(msg === "somente_admin" ? "Somente administradores podem liberar o login." : msg);
        setTemLogin(true);
        set("senha", "");
      }
      toast.success("Acesso do representante salvo. Ele já pode entrar com o e-mail e a senha.");
    } catch (e: any) {
      toast.error("Erro ao salvar acesso: " + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) return <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <Card className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Acesso ao sistema</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ${temLogin ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
              {temLogin ? "Login ativo" : "Sem login"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="ativo-rep">Usuário ativo</Label>
            <Switch id="ativo-rep" checked={f.ativo} onCheckedChange={(v) => set("ativo", v)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          O representante entra com o e-mail e a senha abaixo e vê somente a tela de Atendimento, com os clientes vinculados a ele.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Nome *</Label><Input value={f.nome} onChange={(e) => set("nome", e.target.value)} /></div>
          <div className="space-y-2"><Label>E-mail de login *</Label><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
          <div className="space-y-2">
            <Label>{temLogin ? "Nova senha (deixe vazio para manter)" : "Senha inicial *"}</Label>
            <Input type="password" autoComplete="new-password" value={f.senha} onChange={(e) => set("senha", e.target.value)} placeholder="Mínimo 8 caracteres" />
          </div>
          <div className="space-y-2">
            <Label>Grupo de usuário *</Label>
            <div className="flex gap-2">
              <Select value={f.grupo_acesso_id} onValueChange={(v) => set("grupo_acesso_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{grupos.map((g) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}</SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" onClick={criarGrupoAtendimento} className="shrink-0">Só Atendimento</Button>
            </div>
          </div>
          <div className="space-y-2"><Label>WhatsApp</Label><Input value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2"><Label>Horário inicial</Label><Input type="time" value={f.hora_inicial} onChange={(e) => set("hora_inicial", e.target.value)} /></div>
            <div className="space-y-2"><Label>Horário final</Label><Input type="time" value={f.hora_final} onChange={(e) => set("hora_final", e.target.value)} /></div>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2"><Phone className="w-5 h-5 text-primary" /><h2 className="font-semibold">Telefone (Pilar Fone)</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Ramal</Label><Input value={f.ramal} onChange={(e) => set("ramal", e.target.value)} /></div>
          <div className="space-y-2"><Label>Usuário SIP</Label><Input value={f.usuario_sip} onChange={(e) => set("usuario_sip", e.target.value)} /></div>
          <div className="space-y-2"><Label>Senha SIP</Label><Input type="password" value={f.senha_sip} onChange={(e) => set("senha_sip", e.target.value)} /></div>
        </div>
      </Card>

      <Card className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2"><Mail className="w-5 h-5 text-primary" /><h2 className="font-semibold">E-mail (envio e recebimento)</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Senha do e-mail</Label><Input type="password" value={f.senha_email} onChange={(e) => set("senha_email", e.target.value)} /></div>
          <div className="space-y-2"><Label>Servidor SMTP</Label><Input value={f.smtp} onChange={(e) => set("smtp", e.target.value)} /></div>
          <div className="space-y-2"><Label>Porta SMTP</Label><Input value={f.porta_smtp} onChange={(e) => set("porta_smtp", e.target.value)} /></div>
          <div className="md:col-start-2 space-y-2"><Label>Servidor IMAP</Label><Input value={f.imap} onChange={(e) => set("imap", e.target.value)} /></div>
          <div className="space-y-2"><Label>Porta IMAP</Label><Input value={f.porta_imap} onChange={(e) => set("porta_imap", e.target.value)} /></div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
          {temLogin ? "Salvar acesso" : "Ativar como usuário"}
        </Button>
      </div>
    </div>
  );
}
