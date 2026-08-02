import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { db, useEstabelecimento } from "@/lib/aip/db";
import { AipAsset } from "@/lib/aip/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ReferenciaSelecionada {
  id: string;
  nome: string;
  url: string;
}

interface Props {
  selecionadas: ReferenciaSelecionada[];
  onChange: (refs: ReferenciaSelecionada[]) => void;
  /** Tipos aceitos no upload (padrão: imagens). */
  accept?: string;
}

/**
 * Escolha de imagens de referência: envia arquivos novos ou reaproveita
 * itens já existentes na galeria (aip_assets do tipo imagem).
 */
export default function ReferenciasPicker({ selecionadas, onChange, accept = "image/*" }: Props) {
  const estabelecimentoId = useEstabelecimento();
  const [galeria, setGaleria] = useState<AipAsset[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const carregarGaleria = async () => {
    if (!estabelecimentoId) return;
    setCarregando(true);
    const { data } = await db
      .from("aip_assets")
      .select("*")
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("tipo", "imagem")
      .order("created_at", { ascending: false })
      .limit(60);
    setGaleria((data ?? []) as AipAsset[]);
    setCarregando(false);
  };

  useEffect(() => {
    void carregarGaleria();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estabelecimentoId]);

  const alternar = (asset: { id: string; nome: string; url: string | null }) => {
    if (!asset.url) return;
    const existe = selecionadas.some((s) => s.id === asset.id);
    onChange(
      existe
        ? selecionadas.filter((s) => s.id !== asset.id)
        : [...selecionadas, { id: asset.id, nome: asset.nome, url: asset.url }],
    );
  };

  const enviarArquivos = async (arquivos: FileList | null) => {
    if (!arquivos?.length || !estabelecimentoId) return;
    setEnviando(true);
    try {
      const novas: ReferenciaSelecionada[] = [];
      for (const arquivo of Array.from(arquivos)) {
        const ext = arquivo.name.split(".").pop() ?? "png";
        const caminho = `${estabelecimentoId}/aip-referencias/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("marketing-assets")
          .upload(caminho, arquivo, { upsert: false, contentType: arquivo.type });
        if (error) throw new Error(error.message);

        const { data: pub } = supabase.storage.from("marketing-assets").getPublicUrl(caminho);
        const { data: asset, error: erroAsset } = await db
          .from("aip_assets")
          .insert({
            estabelecimento_id: estabelecimentoId,
            nome: arquivo.name,
            tipo: "imagem",
            mime_type: arquivo.type,
            url: pub.publicUrl,
            storage_path: caminho,
            tamanho_bytes: arquivo.size,
            metadata: { origem: "referencia_wizard" },
          })
          .select()
          .single();
        if (erroAsset) throw new Error(erroAsset.message);
        novas.push({ id: asset.id, nome: asset.nome, url: asset.url });
      }
      onChange([...selecionadas, ...novas]);
      await carregarGaleria();
      toast.success(`${novas.length} referência(s) adicionada(s)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => enviarArquivos(e.target.files)}
        />
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={enviando}>
          {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Enviar do computador
        </Button>
        <Badge variant="secondary">{selecionadas.length} selecionada(s)</Badge>
      </div>

      {selecionadas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selecionadas.map((s) => (
            <div key={s.id} className="group relative">
              <img
                src={s.url}
                alt={s.nome}
                className="h-20 w-20 rounded-lg border border-primary object-cover"
              />
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute -right-2 -top-2 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => onChange(selecionadas.filter((x) => x.id !== s.id))}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <ImagePlus className="h-4 w-4" /> Ou escolha da galeria
        </p>
        {carregando ? (
          <p className="text-sm text-muted-foreground">Carregando galeria…</p>
        ) : galeria.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">
            Nenhuma imagem na galeria ainda. Envie arquivos acima.
          </Card>
        ) : (
          <ScrollArea className="h-52 rounded-lg border border-border p-2">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
              {galeria.map((a) => {
                const ativo = selecionadas.some((s) => s.id === a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => alternar(a)}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-lg border-2 transition-all",
                      ativo ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/40",
                    )}
                    title={a.nome}
                  >
                    {a.url ? (
                      <img src={a.url} alt={a.nome} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-muted text-xs">sem prévia</div>
                    )}
                    {ativo && (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
