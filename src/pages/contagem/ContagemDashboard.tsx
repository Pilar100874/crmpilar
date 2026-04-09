import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Trash2, Eye, Loader2, Package } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

const ContagemDashboard = () => {
  const navigate = useNavigate();
  const [contagens, setContagens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    const estabId = await getEstabelecimentoId();
    if (!estabId) { setLoading(false); return; }
    const { data } = await supabase
      .from("contagens")
      .select("*")
      .eq("estabelecimento_id", estabId)
      .order("created_at", { ascending: false });
    setContagens(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("contagens").delete().eq("id", deleteId);
      if (error) throw error;
      setContagens(prev => prev.filter(c => c.id !== deleteId));
      toast.success("Contagem excluída");
    } catch {
      toast.error("Erro ao excluir contagem");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contagem Inteligente</h1>
          <p className="text-muted-foreground text-sm">Contagem automática de volumes por IA</p>
        </div>
        <Button onClick={() => navigate("/contagem/nova")} className="gap-2">
          <Camera className="w-4 h-4" /> Nova Contagem
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : contagens.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Nenhuma contagem realizada</p>
            <Button onClick={() => navigate("/contagem/nova")} className="mt-4 gap-2">
              <Camera className="w-4 h-4" /> Iniciar Primeira Contagem
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {contagens.map((c: any) => (
            <Card key={c.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  {c.imagem_url && (
                    <img
                      src={c.imagem_url}
                      alt="Contagem"
                      className="w-14 h-14 rounded-lg object-cover shrink-0 hidden sm:block"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {c.tipo_objeto || "Contagem"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                    {c.observacoes && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{c.observacoes}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold">{c.quantidade_detectada ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">detectados</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => navigate(`/contagem/resultado/${c.id}`)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(c.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir contagem"
        description="Tem certeza que deseja excluir esta contagem? Esta ação não pode ser desfeita."
        isLoading={deleting}
      />
    </div>
  );
};

export default ContagemDashboard;
