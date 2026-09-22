import { useCallback, useEffect, useState } from "react";
import {
  Disc3,
  PhoneIncoming,
  PhoneOutgoing,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

const BUCKET = "gravacoes-chamadas";

interface Gravacao {
  id: string;
  numero: string | null;
  nome: string | null;
  direcao: string;
  inicio: string;
  duracao_seg: number;
  caminho: string;
  tamanho_bytes: number | null;
}

function formatarDuracao(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Lista as conversas gravadas pelo usuário no Pilar Fone, com player para ouvir. */
export default function PilarFoneGravacoes() {
  const { toast } = useToast();
  const [lista, setLista] = useState<Gravacao[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [alvoExclusao, setAlvoExclusao] = useState<Gravacao | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("gravacoes_chamadas")
      .select("id, numero, nome, direcao, inicio, duracao_seg, caminho, tamanho_bytes")
      .order("inicio", { ascending: false })
      .limit(100);

    if (error) {
      toast({
        title: "Erro ao carregar gravações",
        description: error.message,
        variant: "destructive",
      });
      setCarregando(false);
      return;
    }

    const itens = (data ?? []) as Gravacao[];
    setLista(itens);

    const novasUrls: Record<string, string> = {};
    await Promise.all(
      itens.map(async (g) => {
        const { data: assinada } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(g.caminho, 3600);
        if (assinada?.signedUrl) novasUrls[g.id] = assinada.signedUrl;
      }),
    );
    setUrls(novasUrls);
    setCarregando(false);
  }, [toast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const confirmarExclusao = async () => {
    const alvo = alvoExclusao;
    if (!alvo) return;
    setExcluindo(true);
    const { error: erroArquivo } = await supabase.storage.from(BUCKET).remove([alvo.caminho]);
    const { error: erroRegistro } = await supabase
      .from("gravacoes_chamadas")
      .delete()
      .eq("id", alvo.id);
    setExcluindo(false);

    if (erroRegistro) {
      toast({
        title: "Erro ao excluir",
        description: erroRegistro.message,
        variant: "destructive",
      });
      return;
    }
    if (erroArquivo) {
      console.warn("Registro excluído, mas o arquivo não foi removido:", erroArquivo.message);
    }
    setLista((prev) => prev.filter((g) => g.id !== alvo.id));
    setAlvoExclusao(null);
    toast({ title: "Gravação excluída" });
  };

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#00A884]">
        <span className="inline-flex items-center gap-2">
          <Disc3 className="h-4 w-4" /> Minhas gravações ({lista.length})
        </span>
        <button type="button" aria-label="Atualizar gravações" onClick={() => void carregar()}>
          <RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
        </button>
      </div>

      {carregando && lista.length === 0 && (
        <p className="px-4 py-6 text-sm text-[#8696A0]">Carregando gravações...</p>
      )}
      {!carregando && lista.length === 0 && (
        <p className="px-4 py-6 text-sm text-[#8696A0]">
          Nenhuma conversa gravada ainda. Durante uma ligação, toque no botão de gravação para
          começar.
        </p>
      )}

      {lista.map((g) => {
        const titulo = g.nome || g.numero || "Número desconhecido";
        const IconeDirecao = g.direcao === "entrada" ? PhoneIncoming : PhoneOutgoing;
        return (
          <div key={g.id} className="border-b border-white/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                <IconeDirecao className="h-4 w-4 text-red-400" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{titulo}</p>
                <p className="truncate text-[12px] text-[#8696A0]">
                  {new Date(g.inicio).toLocaleString("pt-BR")} · {formatarDuracao(g.duracao_seg)} ·{" "}
                  {g.direcao === "entrada" ? "Recebida" : "Feita"}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Excluir gravação de ${titulo}`}
                title="Excluir gravação"
                onClick={() => setAlvoExclusao(g)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[#8696A0] transition hover:text-red-400 active:scale-95"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {urls[g.id] ? (
              <audio
                controls
                preload="none"
                src={urls[g.id]}
                className="mt-2 h-9 w-full"
              />
            ) : (
              <p className="mt-2 text-[12px] text-[#8696A0]">Áudio indisponível.</p>
            )}
          </div>
        );
      })}

      <DeleteConfirmDialog
        open={!!alvoExclusao}
        onOpenChange={(aberto) => !aberto && setAlvoExclusao(null)}
        onConfirm={() => void confirmarExclusao()}
        title="Excluir gravação"
        itemName={
          alvoExclusao
            ? `${alvoExclusao.nome || alvoExclusao.numero || "gravação"} · ${new Date(alvoExclusao.inicio).toLocaleString("pt-BR")}`
            : undefined
        }
        isLoading={excluindo}
      />
    </div>
  );
}
