import { useEffect, useState } from "react";
import { Copy, KeyRound, Plus, Trash2, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

type Chave = {
  id: string;
  nome: string;
  chave: string;
  app: string;
  bloqueado: boolean;
  ultima_comunicacao: string | null;
  dispositivo_id?: string | null;
};

/** Programas que pedem a chave da empresa no primeiro acesso. */
const APPS = [
  { valor: "pilar-fone", rotulo: "Pilar Fone (Android)" },
  { valor: "automacao", rotulo: "Pilar Automação (celular/tablet)" },
  { valor: "controle", rotulo: "Pilar Controle (Automação e Ponto)" },
  { valor: "coletor", rotulo: "Coletor (Windows / ISO)" },
  { valor: "coletor-tv", rotulo: "Coletor TV (Android TV)" },
] as const;

const rotuloApp = (valor: string) =>
  APPS.find((a) => a.valor === valor)?.rotulo ?? "Pilar Automação (celular/tablet)";

/** Gera uma chave curta e fácil de digitar no aparelho. */
function gerarChave() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let saida = "";
  for (let i = 0; i < 8; i++) saida += letras[Math.floor(Math.random() * letras.length)];
  return `${saida.slice(0, 4)}-${saida.slice(4)}`;
}

export default function AutomacaoChavesApp() {
  const [chaves, setChaves] = useState<Chave[]>([]);
  const [nome, setNome] = useState("");
  const [app, setApp] = useState<string>("automacao");
  const [filtro, setFiltro] = useState<string>("todos");
  const [carregando, setCarregando] = useState(true);
  const [excluir, setExcluir] = useState<Chave | null>(null);

  const carregar = async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("automacao_app_chaves")
      .select("id, nome, chave, app, bloqueado, ultima_comunicacao, dispositivo_id")
      .order("created_at", { ascending: false });
    if (error) toast.error("Não foi possível carregar as chaves");
    setChaves((data as Chave[]) ?? []);
    setCarregando(false);
  };

  useEffect(() => { carregar(); }, []);

  const criar = async () => {
    if (!nome.trim()) return toast.error("Dê um nome para identificar o aparelho");
    const { data: auth } = await supabase.auth.getUser();
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("estabelecimento_id")
      .eq("auth_user_id", auth.user?.id ?? "")
      .maybeSingle();
    if (!usuario?.estabelecimento_id) return toast.error("Seu usuário não está ligado a uma empresa");

    const { error } = await supabase.from("automacao_app_chaves").insert({
      nome: nome.trim(),
      chave: gerarChave(),
      app,
      estabelecimento_id: usuario.estabelecimento_id,
    });
    if (error) return toast.error("Não foi possível criar a chave");
    setNome("");
    toast.success("Chave criada");
    carregar();
  };

  const alternarBloqueio = async (c: Chave) => {
    const { error } = await supabase
      .from("automacao_app_chaves")
      .update({ bloqueado: !c.bloqueado })
      .eq("id", c.id);
    if (error) return toast.error("Não foi possível alterar");
    carregar();
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    const { error } = await supabase.from("automacao_app_chaves").delete().eq("id", excluir.id);
    setExcluir(null);
    if (error) return toast.error("Não foi possível excluir");
    toast.success("Chave removida");
    carregar();
  };

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-4 p-3 sm:p-5 lg:p-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" /> Chaves do aplicativo
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Cada aparelho usa uma chave para saber a qual empresa pertence. Depois da chave, a pessoa entra
            com usuário e senha e vê apenas o painel definido para ela.
          </p>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)_auto]">
          <Input
            placeholder="Nome do aparelho (ex.: Tablet da portaria)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criar()}
            className="md:col-span-2 lg:col-span-1"
          />
          <select
            value={app}
            onChange={(e) => setApp(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            aria-label="Programa que vai usar a chave"
          >
            {APPS.map((a) => (
              <option key={a.valor} value={a.valor}>{a.rotulo}</option>
            ))}
          </select>
          <Button onClick={criar} className="w-full gap-2 md:w-auto">
            <Plus className="h-4 w-4" /> Gerar chave
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Mostrar:</span>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          aria-label="Filtrar chaves por programa"
        >
          <option value="todos">Todos os programas</option>
          {APPS.map((a) => (
            <option key={a.valor} value={a.valor}>{a.rotulo}</option>
          ))}
        </select>
      </div>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : chaves.filter((c) => filtro === "todos" || (c.app ?? "automacao") === filtro).length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma chave criada até agora.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {chaves.filter((c) => filtro === "todos" || (c.app ?? "automacao") === filtro).map((c) => (
            <Card key={c.id} className="transition-shadow hover:shadow-md">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.nome}</p>
                    <p className="font-mono text-lg tracking-widest">{c.chave}</p>
                  </div>
                  <Badge variant={c.bloqueado ? "destructive" : "secondary"}>
                    {c.bloqueado ? "Bloqueada" : "Ativa"}
                  </Badge>
                </div>
                <Badge variant="outline" className="text-[11px]">{rotuloApp(c.app ?? "automacao")}</Badge>
                <p className="text-xs text-muted-foreground">
                  {c.ultima_comunicacao
                    ? `Último uso: ${new Date(c.ultima_comunicacao).toLocaleString("pt-BR")}`
                    : "Ainda não usada"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(c.chave);
                      toast.success("Chave copiada");
                    }}
                  >
                    <Copy className="mr-1 h-4 w-4" /> Copiar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => alternarBloqueio(c)}>
                    {c.bloqueado ? <Unlock className="mr-1 h-4 w-4" /> : <Lock className="mr-1 h-4 w-4" />}
                    {c.bloqueado ? "Liberar" : "Bloquear"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setExcluir(c)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(v) => !v && setExcluir(null)}
        onConfirm={confirmarExclusao}
        itemName={excluir?.nome}
      />
    </div>
  );
}
