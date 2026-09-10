import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Ambiente, TELA_PADRAO,
  enviarImagemAutomacao, salvarAmbiente, urlImagemAutomacao,
} from "@/lib/automacao/api";

const AJUSTES = [
  { valor: "cobrir", label: "Preencher a tela" },
  { valor: "conter", label: "Mostrar a foto inteira" },
  { valor: "esticar", label: "Esticar" },
];

interface Props {
  ambiente: Partial<Ambiente> | null;
  onChange: (a: Partial<Ambiente> | null) => void;
  onSalvo: () => void;
  abaInicial?: "tela" | "fundo";
}

export default function AmbienteDialog({ ambiente, onChange, onSalvo }: Props) {
  const opacidade = ambiente?.fundo_opacidade ?? 100;
  const ajuste = ambiente?.fundo_ajuste ?? "cobrir";
  const [previa, setPrevia] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [isSalvando, setIsSalvando] = useState(false);
  const arquivoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let ativo = true;
    const caminho = ambiente?.fundo_caminho;
    if (!caminho) { setPrevia(null); return; }
    if (/^https?:\/\//.test(caminho)) { setPrevia(caminho); return; }
    urlImagemAutomacao(caminho).then((u) => { if (ativo) setPrevia(u); });
    return () => { ativo = false; };
  }, [ambiente?.fundo_caminho]);

  const enviarFoto = async (arquivo: File) => {
    if (arquivo.size > 20 * 1024 * 1024) { toast.error("A foto precisa ter até 20 MB."); return; }
    setEnviando(true);
    const caminho = await enviarImagemAutomacao(arquivo);
    setEnviando(false);
    if (!caminho) { toast.error("Não foi possível enviar a foto."); return; }
    onChange({ ...ambiente, fundo_caminho: caminho });
  };

  const salvar = async () => {
    if (isSalvando) return;
    if (!ambiente?.nome?.trim()) { toast.error("Informe o nome da aba."); return; }
    setIsSalvando(true);
    try {
      await salvarAmbiente({
        ...ambiente,
        tela_nome: ambiente?.tela_nome?.trim() || ambiente?.nome?.trim() || null,
        fundo_opacidade: opacidade,
        fundo_ajuste: ajuste,
      });
      onChange(null);
      toast.success("Aba salva.");
      onSalvo();
    } finally {
      setIsSalvando(false);
    }
  };

  return (<>
    <Dialog open={!!ambiente} onOpenChange={(o) => !o && onChange(null)}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0"><DialogTitle>{ambiente?.id ? "Editar aba" : "Nova aba"}</DialogTitle></DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1">
          <div>
            <Label>Nome da tela</Label>
            <Input
              value={ambiente?.tela_nome ?? ""}
              placeholder="Painel da Portaria, Casa, Filial..."
              onChange={(e) => onChange({ ...ambiente, tela_nome: e.target.value })}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Telas com o mesmo nome (no mesmo aparelho) viram abas dentro do mesmo cartão.
            </p>
          </div>

          <div>
            <Label>Nome da aba</Label>
            <Input
              value={ambiente?.nome ?? ""}
              placeholder="Sala, Garagem, Portaria..."
              onChange={(e) => onChange({ ...ambiente, nome: e.target.value })}
            />
          </div>

          <div className="space-y-3 rounded-xl border p-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Foto de fundo</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Coloque uma foto da sua casa atrás dos elementos e escolha o quanto ela aparece.
            </p>

            {previa && (
              <div
                className="h-32 w-full rounded-lg border bg-muted"
                style={{
                  backgroundImage: `url(${previa})`,
                  backgroundSize: ajuste === "conter" ? "contain" : ajuste === "esticar" ? "100% 100%" : "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  opacity: Math.max(0, Math.min(100, opacidade)) / 100,
                }}
              />
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" disabled={enviando} onClick={() => arquivoRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> {enviando ? "Enviando..." : previa ? "Trocar foto" : "Escolher foto"}
              </Button>
              {ambiente?.fundo_caminho && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => onChange({ ...ambiente, fundo_caminho: null })}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Remover
                </Button>
              )}
              <input
                ref={arquivoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) enviarFoto(f); e.target.value = ""; }}
              />
            </div>

            <div>
              <Label className="text-xs">Endereço da foto na internet (opcional)</Label>
              <Input
                value={/^https?:\/\//.test(ambiente?.fundo_caminho ?? "") ? (ambiente?.fundo_caminho as string) : ""}
                placeholder="https://..."
                onChange={(e) => onChange({ ...ambiente, fundo_caminho: e.target.value.trim() || null })}
              />
            </div>

            <div>
              <Label className="text-xs">Transparência da foto: {opacidade}%</Label>
              <Slider
                value={[opacidade]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => onChange({ ...ambiente, fundo_opacidade: v[0] })}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {AJUSTES.map((a) => (
                <Button
                  key={a.valor}
                  type="button"
                  size="sm"
                  variant={ajuste === a.valor ? "default" : "outline"}
                  onClick={() => onChange({ ...ambiente, fundo_ajuste: a.valor })}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t pt-3 bg-background">
          <Button variant="outline" disabled={isSalvando} onClick={() => onChange(null)}>Cancelar</Button>
          <Button disabled={isSalvando} onClick={salvar}>{isSalvando ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>);
}
