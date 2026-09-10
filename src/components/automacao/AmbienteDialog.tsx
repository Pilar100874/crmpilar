import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Image as ImageIcon, Monitor, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Ambiente, FORMATOS_TELA, TELA_PADRAO, TIPOS_TELA, TipoTela,
  enviarImagemAutomacao, salvarAmbiente, urlImagemAutomacao,
} from "@/lib/automacao/api";

interface Props {
  ambiente: Partial<Ambiente> | null;
  onChange: (a: Partial<Ambiente> | null) => void;
  onSalvo: () => void;
}

/** Reduz a proporção para o formato "16:9". */
function proporcaoDe(l: number, a: number) {
  const mdc = (x: number, y: number): number => (y ? mdc(y, x % y) : x);
  const d = mdc(Math.round(l), Math.round(a)) || 1;
  return `${Math.round(l / d)}:${Math.round(a / d)}`;
}

const AJUSTES = [
  { valor: "cobrir", label: "Preencher a tela" },
  { valor: "conter", label: "Mostrar a foto inteira" },
  { valor: "esticar", label: "Esticar" },
];

export default function AmbienteDialog({ ambiente, onChange, onSalvo }: Props) {
  const largura = ambiente?.tela_largura ?? TELA_PADRAO.largura;
  const altura = ambiente?.tela_altura ?? TELA_PADRAO.altura;
  const proporcao = proporcaoDe(largura, altura);
  const opacidade = ambiente?.fundo_opacidade ?? 100;
  const ajuste = ambiente?.fundo_ajuste ?? "cobrir";
  const [previa, setPrevia] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const arquivoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let ativo = true;
    const caminho = ambiente?.fundo_caminho;
    if (!caminho) { setPrevia(null); return; }
    if (/^https?:\/\//.test(caminho)) { setPrevia(caminho); return; }
    urlImagemAutomacao(caminho).then((u) => { if (ativo) setPrevia(u); });
    return () => { ativo = false; };
  }, [ambiente?.fundo_caminho]);

  const aplicar = (l: number, a: number) =>
    onChange({ ...ambiente, tela_largura: Math.max(320, Math.round(l)), tela_altura: Math.max(240, Math.round(a)) });

  const enviarFoto = async (arquivo: File) => {
    if (arquivo.size > 20 * 1024 * 1024) { toast.error("A foto precisa ter até 20 MB."); return; }
    setEnviando(true);
    const caminho = await enviarImagemAutomacao(arquivo);
    setEnviando(false);
    if (!caminho) { toast.error("Não foi possível enviar a foto."); return; }
    onChange({ ...ambiente, fundo_caminho: caminho });
  };

  const gravar = async () => {
    if (!ambiente?.nome?.trim()) { toast.error("Informe o nome do ambiente."); return; }
    await salvarAmbiente({
      ...ambiente,
      tela_largura: largura,
      tela_altura: altura,
      fundo_opacidade: opacidade,
      fundo_ajuste: ajuste,
    });
    onChange(null);
    toast.success("Ambiente salvo.");
    onSalvo();
  };

  return (
    <Dialog open={!!ambiente} onOpenChange={(o) => !o && onChange(null)}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0"><DialogTitle>{ambiente?.id ? "Editar ambiente" : "Novo ambiente"}</DialogTitle></DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1">
          <div>
            <Label>Nome</Label>
            <Input
              value={ambiente?.nome ?? ""}
              placeholder="Sala, Garagem, Portaria..."
              onChange={(e) => onChange({ ...ambiente, nome: e.target.value })}
            />
          </div>

          <div className="rounded-xl border p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Monitor className="h-4 w-4 text-primary" /> Onde este painel vai aparecer
            </div>
            <p className="text-xs text-muted-foreground">
              Escolha o tipo de aparelho e o formato da tela. O painel aparece automaticamente para quem
              abrir a tela de parede nesse tipo de aparelho, e o retângulo do editor fica exatamente nesse formato.
            </p>

            <div className="flex flex-wrap gap-2">
              {TIPOS_TELA.map((t) => (
                <Button
                  key={t.valor}
                  type="button"
                  size="sm"
                  title={t.descricao}
                  variant={tipoTela === t.valor ? "default" : "outline"}
                  onClick={() => trocarTipo(t.valor)}
                >
                  {t.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {FORMATOS_TELA[tipoTela].map((p) => (
                <Button
                  key={p.valor}
                  type="button"
                  size="sm"
                  variant={largura === p.largura && altura === p.altura ? "default" : "outline"}
                  onClick={() => aplicar(p.largura, p.altura)}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Largura</Label>
                <Input
                  type="number"
                  min={320}
                  value={largura}
                  onChange={(e) => aplicar(Number(e.target.value) || TELA_PADRAO.largura, altura)}
                />
              </div>
              <div>
                <Label className="text-xs">Altura</Label>
                <Input
                  type="number"
                  min={240}
                  value={altura}
                  onChange={(e) => aplicar(largura, Number(e.target.value) || TELA_PADRAO.altura)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Proporção atual: {proporcao}</p>

            {(tipoTela === "tablet" || tipoTela === "celular") && (
              <div className="rounded-lg bg-muted/50 p-2 space-y-2">
                <Button
                  type="button"
                  size="sm"
                  variant={rolagem ? "default" : "outline"}
                  onClick={() => onChange({ ...ambiente, rolagem: !rolagem })}
                >
                  {rolagem ? "Rolagem para baixo ligada" : "Rolagem para baixo desligada"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Com a rolagem ligada, o painel ocupa toda a largura do aparelho e a pessoa desliza para
                  baixo para ver o resto. Deixe a altura maior que a da tela para ganhar mais espaço.
                </p>
              </div>
            )}
          </div>


          <div className="rounded-xl border p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ImageIcon className="h-4 w-4 text-primary" /> Foto de fundo
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
          <Button variant="outline" onClick={() => onChange(null)}>Cancelar</Button>
          <Button onClick={gravar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
