import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Tag, Trash2, Plus, Search } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface Segmento { id: string; nome: string; }
interface Usuario { id: string; nome: string; email: string; }
interface Vinculo { id: string; usuario_id: string; segmento_id: string; }

export default function VinculosSegmentoProspectUsuario() {
  const [estabId, setEstabId] = useState<string>("");
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [selectedSegmento, setSelectedSegmento] = useState<string | null>(null);
  const [novoUsuarioIds, setNovoUsuarioIds] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const id = await getEstabelecimentoId();
      if (id) setEstabId(id);
    })();
  }, []);

  useEffect(() => { if (estabId) carregar(); }, [estabId]);

  const carregar = async () => {
    setLoading(true);
    const [segRes, usrRes, vincRes] = await Promise.all([
      supabase.from("segmentos").select("id, nome").eq("estabelecimento_id", estabId).eq("is_prospect", true).order("nome"),
      supabase.from("usuarios").select("id, nome, email").eq("estabelecimento_id", estabId).eq("tipo", "gerente").order("nome"),
      supabase.from("usuario_segmentos").select("id, usuario_id, segmento_id"),
    ]);
    setSegmentos((segRes.data as any) || []);
    setUsuarios((usrRes.data as any) || []);
    setVinculos((vincRes.data as any) || []);
    setLoading(false);
  };

  const usuariosDoSegmento = (segId: string) =>
    vinculos.filter(v => v.segmento_id === segId).map(v => ({
      vinculoId: v.id,
      user: usuarios.find(u => u.id === v.usuario_id),
    })).filter(x => x.user);

  const adicionar = async () => {
    if (!selectedSegmento || novoUsuarioIds.length === 0) {
      return toast.error("Selecione um segmento e ao menos um usuário");
    }
    const jaVinculados = new Set(usuariosDoSegmento(selectedSegmento).map(x => x.user!.id));
    const paraInserir = novoUsuarioIds.filter(uid => !jaVinculados.has(uid));
    if (paraInserir.length === 0) return toast.info("Gerentes já estão vinculados");
    const payload = paraInserir.map(uid => ({ segmento_id: selectedSegmento, usuario_id: uid }));
    const { error } = await supabase.from("usuario_segmentos").insert(payload as any);
    if (error) return toast.error(error.message);
    toast.success(`${paraInserir.length} gerente(s) vinculado(s)`);
    setNovoUsuarioIds([]);
    carregar();
  };

  const remover = async (vinculoId: string) => {
    const { error } = await supabase.from("usuario_segmentos").delete().eq("id", vinculoId);
    if (error) return toast.error(error.message);
    toast.success("Vínculo removido");
    carregar();
  };

  const segmentosFiltrados = segmentos.filter(s =>
    !busca.trim() || s.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Vínculo Segmento Prospect x Gerente</h1>
        <p className="text-muted-foreground mt-2">
          Direcione o atendimento de novos prospects para gerentes com base no segmento retornado pela IA (Cloud Code / Cursor / ChatGPT).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4" /> Segmentos de Prospect
            </CardTitle>
            <CardDescription>
              Selecione um segmento para gerenciar seus responsáveis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar segmento..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8" />
            </div>
            <div className="space-y-1 max-h-[420px] overflow-y-auto">
              {loading && <p className="text-sm text-muted-foreground p-2">Carregando...</p>}
              {!loading && segmentosFiltrados.length === 0 && (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  Nenhum segmento de prospect. Eles são criados automaticamente ao importar registros da Prospecção via Cloud Code / Cursor / ChatGPT.
                </p>
              )}
              {segmentosFiltrados.map(s => {
                const qtd = usuariosDoSegmento(s.id).length;
                return (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedSegmento(s.id); setNovoUsuarioIds([]); }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between ${
                      selectedSegmento === s.id ? "bg-primary/10 border-primary" : "hover:bg-accent/50 border-border"
                    }`}
                  >
                    <span className="text-sm font-medium">{s.nome}</span>
                    <Badge variant="secondary">{qtd} gerente(s)</Badge>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Usuários Responsáveis
            </CardTitle>
            <CardDescription>
              {selectedSegmento
                ? `Gerencie os usuários vinculados ao segmento selecionado.`
                : "Selecione um segmento à esquerda."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSegmento ? (
              <>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Já vinculados</h4>
                  {usuariosDoSegmento(selectedSegmento).length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/30 text-center">
                      Nenhum gerente vinculado
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {usuariosDoSegmento(selectedSegmento).map(({ vinculoId, user }) => (
                        <div key={vinculoId} className="p-3 border rounded-lg bg-muted/30 flex items-center justify-between group">
                          <div>
                            <p className="text-sm font-medium">{user!.nome}</p>
                            <p className="text-xs text-muted-foreground">{user!.email}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => remover(vinculoId)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 space-y-3">
                    <h4 className="text-sm font-semibold">Adicionar usuários</h4>
                    <div className="space-y-1 max-h-[240px] overflow-y-auto border rounded-lg p-2 bg-background">
                      {usuarios.map(u => {
                        const jaVinc = usuariosDoSegmento(selectedSegmento).some(x => x.user!.id === u.id);
                        return (
                          <div key={u.id} className={`flex items-center gap-2 p-1.5 rounded ${jaVinc ? "opacity-40" : "hover:bg-accent/50"}`}>
                            <Checkbox
                              id={`u-${u.id}`}
                              disabled={jaVinc}
                              checked={novoUsuarioIds.includes(u.id)}
                              onCheckedChange={(c) => {
                                if (c) setNovoUsuarioIds([...novoUsuarioIds, u.id]);
                                else setNovoUsuarioIds(novoUsuarioIds.filter(x => x !== u.id));
                              }}
                            />
                            <label htmlFor={`u-${u.id}`} className="text-sm cursor-pointer flex-1">
                              {u.nome} <span className="text-xs text-muted-foreground">({u.email})</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                    <Button onClick={adicionar} className="w-full" size="sm" disabled={novoUsuarioIds.length === 0}>
                      <Plus className="w-4 h-4 mr-2" />
                      Vincular Selecionados
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Selecione um segmento à esquerda para gerenciar os usuários.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
