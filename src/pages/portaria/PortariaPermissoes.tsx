import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Search } from "lucide-react";
import type { PortRole } from "@/lib/portaria/api";

interface UsuarioLinha {
  id: string;
  nome: string | null;
  email: string | null;
  authUserId: string | null;
  ativo: boolean | null;
  papel: PortRole | "sem_papel";
}

const PAPEIS: { valor: PortRole | "sem_papel"; rotulo: string; descricao: string }[] = [
  { valor: "sem_papel", rotulo: "Padrão (gestor)", descricao: "Usuário interno sem papel específico" },
  { valor: "super_admin", rotulo: "Super administrador", descricao: "Acesso total à Portaria" },
  { valor: "admin", rotulo: "Gestor", descricao: "Dispositivos e configurações" },
  { valor: "porteiro", rotulo: "Porteiro", descricao: "Operação e visitantes" },
  { valor: "morador", rotulo: "Morador", descricao: "Acesso restrito" },
];

export default function PortariaPermissoes() {
  const [linhas, setLinhas] = useState<UsuarioLinha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState<string | null>(null);

  const carregar = async () => {
    setCarregando(true);
    const [{ data: usuarios, error }, { data: papeis }] = await Promise.all([
      supabase
        .from("usuarios")
        .select("id, nome, email, auth_user_id, ativo")
        .order("nome", { ascending: true }),
      supabase.from("port_user_roles").select("user_id, role"),
    ]);
    if (error) {
      toast({ title: "Não foi possível carregar os usuários", description: error.message, variant: "destructive" });
      setCarregando(false);
      return;
    }
    const mapa = new Map<string, PortRole>();
    (papeis ?? []).forEach((p) => mapa.set(p.user_id as string, p.role as PortRole));
    setLinhas(
      (usuarios ?? []).map((u) => ({
        id: u.id as string,
        nome: u.nome as string | null,
        email: u.email as string | null,
        authUserId: (u.auth_user_id as string | null) ?? null,
        ativo: (u.ativo as boolean | null) ?? true,
        papel: (u.auth_user_id && mapa.get(u.auth_user_id as string)) || "sem_papel",
      })),
    );
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return linhas;
    return linhas.filter(
      (l) => (l.nome ?? "").toLowerCase().includes(termo) || (l.email ?? "").toLowerCase().includes(termo),
    );
  }, [linhas, busca]);

  const alterar = async (linha: UsuarioLinha, papel: PortRole | "sem_papel") => {
    if (!linha.authUserId) {
      toast({
        title: "Usuário sem login vinculado",
        description: "Este usuário ainda não possui acesso de login no sistema.",
        variant: "destructive",
      });
      return;
    }
    setSalvando(linha.id);
    const { error: erroDelete } = await supabase
      .from("port_user_roles")
      .delete()
      .eq("user_id", linha.authUserId);
    let erro = erroDelete?.message;
    if (!erro && papel !== "sem_papel") {
      const { error } = await supabase
        .from("port_user_roles")
        .insert({ user_id: linha.authUserId, role: papel });
      erro = error?.message;
    }
    setSalvando(null);
    if (erro) {
      toast({ title: "Não foi possível salvar", description: erro, variant: "destructive" });
      return;
    }
    setLinhas((atual) => atual.map((l) => (l.id === linha.id ? { ...l, papel } : l)));
    toast({ title: "Permissão atualizada", description: linha.nome ?? linha.email ?? "Usuário" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Permissões da Portaria
          </h2>
          <p className="text-sm text-muted-foreground">
            Defina rapidamente quem é gestor, porteiro ou morador.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por nome ou e-mail"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {carregando ? (
        <div className="flex items-center gap-2 text-muted-foreground py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando usuários...
        </div>
      ) : filtradas.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Nenhum usuário encontrado.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((linha) => (
            <Card key={linha.id} className="border-border/60">
              <CardContent className="p-4 space-y-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{linha.nome || "Sem nome"}</span>
                    {linha.ativo === false && <Badge variant="secondary">Inativo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{linha.email || "Sem e-mail"}</p>
                </div>
                <Select
                  value={linha.papel}
                  disabled={salvando === linha.id}
                  onValueChange={(v) => alterar(linha, v as PortRole | "sem_papel")}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {PAPEIS.map((p) => (
                      <SelectItem key={p.valor} value={p.valor}>
                        <div className="flex flex-col">
                          <span>{p.rotulo}</span>
                          <span className="text-xs text-muted-foreground">{p.descricao}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!linha.authUserId && (
                  <p className="text-xs text-destructive">Sem login vinculado</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={carregar} disabled={carregando}>
          Atualizar lista
        </Button>
      </div>
    </div>
  );
}
