import { useEffect, useMemo, useState } from "react";
import { Copy, KeyRound, Plus, Trash2, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

export const APPS_CHAVE = [
  { valor: "fone", nome: "Pilar Fone" },
  { valor: "sms", nome: "Pilar SMS" },
  { valor: "automacao", nome: "Pilar Automação" },
  { valor: "remotas", nome: "Pilar Remotas" },
] as const;

type AppChave = (typeof APPS_CHAVE)[number]["valor"];

type Chave = {
  id: string;
  nome: string;
  chave: string;
  app: string;
  bloqueado: boolean;
  ultima_comunicacao: string | null;
};

/** Gera uma chave curta e fácil de digitar no aparelho. */
function gerarChave() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let saida = "";
  for (let i = 0; i < 8; i++) saida += letras[Math.floor(Math.random() * letras.length)];
  return `${saida.slice(0, 4)}-${saida.slice(4)}`;
}

const nomeApp = (valor: string) =>
  APPS_CHAVE.find((a) => a.valor === valor)?.nome ?? valor;

export default function ChavesAppsManager() {
  const [chaves, setChaves] = useState<Chave[]>([]);
  const [nome, setNome] = useState("");
  const [app, setApp] = useState<AppChave>("fone");
  const [filtro, setFiltro] = useState<"todos" | AppChave>("todos");
  const [carregando, setCarregando] = useState(true);
  const [excluir, setExcluir] = useState<Chave | null>(null);

  const carregar = async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("automacao_app_chaves")
      .select("id, nome, chave, app, bloqueado, ultima_comunicacao")
      .order("created_at", { ascending: false });
    if (error) toast.error("Não foi possível carregar as chaves");
    setChaves((data as Chave[]) ?? []);
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const visiveis = useMemo(
    () => (filtro === "todos" ? chaves : chaves.filter((c) => c.app === filtro)),
    [chaves, filtro],
  );

  const criar = async () => {
    if (!nome.trim()) return toast.error("Dê um nome para identificar o aparelho");
    const { data: auth } = await supabase.auth.getUser();
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("estabelecimento_id")
      .eq("auth_user_id", auth.user?.id ?? "")
      .maybeSingle();
    if (!usuario?.estabelecimento_id)
      return toast.error("Seu usuário não está ligado a uma empresa");

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
    const { error } = await supabase
      .from("automacao_app_chaves")
      .delete()
      .eq("id", excluir.id);
    setExcluir(null);
    if (error) return toast.error("Não foi possível excluir");
    toast.success("Chave removida");
    carregar();
  };

  return (
    <Card className="rounded-2xl sm:rounded-3xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4 text-primary" /> Chaves dos aplicativos
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Todo aplicativo Pilar começa pedindo uma chave, que identifica a empresa do aparelho.
          Depois da chave, a pessoa entra com usuário e senha normalmente.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={app} onValueChange={(v) => setApp(v as AppChave)}>
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APPS_CHAVE.map((a) => (
                <SelectItem key={a.valor} value={a.valor}>
                  {a.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Nome do aparelho (ex.: Tablet da portaria)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criar()}
          />
          <Button onClick={criar} className="gap-2">
            <Plus className="h-4 w-4" /> Gerar chave
          </Button>
        </div>

        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as "todos" | AppChave)}>
          <TabsList className="flex w-full flex-wrap justify-start">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            {APPS_CHAVE.map((a) => (
              <TabsTrigger key={a.valor} value={a.valor}>
                {a.nome}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {carregando ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : visiveis.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma chave criada até agora.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visiveis.map((c) => (
              <Card key={c.id} className="transition-shadow hover:shadow-md">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.nome}</p>
                      <p className="font-mono text-lg tracking-widest">{c.chave}</p>
                      <Badge variant="outline" className="mt-1">
                        {nomeApp(c.app)}
                      </Badge>
                    </div>
                    <Badge variant={c.bloqueado ? "destructive" : "secondary"}>
                      {c.bloqueado ? "Bloqueada" : "Ativa"}
                    </Badge>
                  </div>
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
                      {c.bloqueado ? (
                        <Unlock className="mr-1 h-4 w-4" />
                      ) : (
                        <Lock className="mr-1 h-4 w-4" />
                      )}
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
      </CardContent>

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(v) => !v && setExcluir(null)}
        onConfirm={confirmarExclusao}
        itemName={excluir?.nome}
      />
    </Card>
  );
}
