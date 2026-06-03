import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserSquare2, Info, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { cn } from "@/lib/utils";

interface Props {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const AskInfluencerConfig = ({ config, handleConfigChange }: Props) => {
  const [influencers, setInfluencers] = useState<Array<{ id: string; nome: string; image_url: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const estId = await getEstabelecimentoId();
      let q = supabase
        .from("studio_gallery_images")
        .select("id,nome,image_url")
        .eq("categoria", "influencer")
        .order("created_at", { ascending: false })
        .limit(100);
      if (estId) q = q.eq("estabelecimento_id", estId);
      const { data, error } = await q;
      if (!cancelled) {
        if (!error && data) {
          setInfluencers(data as any[]);
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectedId = config.fixedInfluencerId || "";
  const selectedItem = influencers.find((i) => i.id === selectedId);

  return (
    <div className="space-y-4">
      <Alert className="border-purple-500/30 bg-purple-500/5">
        <Info className="h-4 w-4 text-purple-600" />
        <AlertDescription className="text-xs">
          Pergunta ao usuário se a peça terá um <strong>influencer</strong>. Em caso afirmativo,
          utiliza o <strong>influencer fixo</strong> selecionado abaixo (cadastrado na Galeria de Influencers).
          A imagem vai para o bloco <strong>Gerar Mídia IA</strong> como referência (papel INFLUENCER).
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <UserSquare2 className="h-3.5 w-3.5 text-purple-600" />
          Influencer fixo {selectedItem && <span className="text-xs text-muted-foreground">— {selectedItem.nome}</span>}
        </Label>
        {loading ? (
          <p className="text-xs text-muted-foreground">Carregando influencers...</p>
        ) : influencers.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum influencer encontrado na galeria.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto p-1">
            {influencers.map((it) => {
              const isSelected = it.id === selectedId;
              return (
                <button
                  type="button"
                  key={it.id}
                  onClick={() => {
                    handleConfigChange("fixedInfluencerId", it.id);
                    handleConfigChange("fixedInfluencerUrl", it.image_url);
                  }}
                  className={cn(
                    "relative aspect-square rounded-md overflow-hidden border-2 transition-all hover:opacity-90",
                    isSelected ? "border-purple-600 ring-2 ring-purple-500/40" : "border-border"
                  )}
                  title={it.nome || "Sem nome"}
                >
                  <img
                    src={it.image_url}
                    alt={it.nome || "Influencer"}
                    className="h-full w-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-purple-600 text-white rounded-full p-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <UserSquare2 className="h-3.5 w-3.5 text-purple-600" />
          Pergunta inicial
        </Label>
        <Input
          value={config.askQuestion || ""}
          onChange={(e) => handleConfigChange("askQuestion", e.target.value)}
          placeholder="A peça terá um influencer?"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Variável de saída (URL da foto)</Label>
        <Input
          value={config.outputVariable || ""}
          onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
          placeholder="influencer_image_url"
        />
      </div>
    </div>
  );
};
