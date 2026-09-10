import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Image as ImageIcon, Monitor, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Ambiente, FORMATOS_TELA, TELA_PADRAO, TIPOS_TELA, TipoTela,
  aplicarFormatoGrupo, enviarImagemAutomacao, salvarAmbiente, urlImagemAutomacao,
} from "@/lib/automacao/api";

interface Props {
  ambiente: Partial<Ambiente> | null;
  onChange: (a: Partial<Ambiente> | null) => void;
  onSalvo: () => void;
  abaInicial?: "tela" | "fundo";
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

export default function AmbienteDialog({ ambiente, onChange, onSalvo, abaInicial = "tela" }: Props) {
  const largura = ambiente?.tela_largura ?? TELA_PADRAO.largura;
  const altura = ambiente?.tela_altura ?? TELA_PADRAO.altura;
  const proporcao = proporcaoDe(largura, altura);
  const opacidade = ambiente?.fundo_opacidade ?? 100;
  const ajuste = ambiente?.fundo_ajuste ?? "cobrir";
  const tipoTela: TipoTela = (ambiente?.dispositivo as TipoTela) ?? "tv";
  const rolagem = ambiente?.rolagem === true;
  const [previa, setPrevia] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [isSalvando, setIsSalvando] = useState(false);
  const [confirmarFormatoAberto, setConfirmarFormatoAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"tela" | "fundo">("tela");
  const arquivoRef = useRef<HTMLInputElement | null>(null);
  /** Guarda como a tela estava ao abrir, para saber se o formato mudou. */
  const original = useRef<{ id?: string; dispositivo: TipoTela; largura: number; altura: number; telaNome: string | null } | null>(null);

  useEffect(() => {
    if (!ambiente) { original.current = null; return; }
    if (original.current?.id === ambiente.id) return;
    original.current = {
      id: ambiente.id,
      dispositivo: (ambiente.dispositivo as TipoTela) ?? "tv",
      largura: ambiente.tela_largura ?? TELA_PADRAO.largura,
      altura: ambiente.tela_altura ?? TELA_PADRAO.altura,
      telaNome: ambiente.tela_nome ?? null,
    };
  }, [ambiente]);


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

  /** Ao trocar o tipo de aparelho, já aplica o formato mais comum dele. */
  const trocarTipo = (t: TipoTela) => {
    const primeiro = FORMATOS_TELA[t][0];
    onChange({
      ...ambiente,
      dispositivo: t,
      tela_largura: primeiro.largura,
      tela_altura: primeiro.altura,
      rolagem: t === "celular" ? true : t === "tablet" ? rolagem : false,
    });
  };

  const enviarFoto = async (arquivo: File) => {
    if (arquivo.size > 20 * 1024 * 1024) { toast.error("A foto precisa ter até 20 MB."); return; }
    setEnviando(true);
    const caminho = await enviarImagemAutomacao(arquivo);
    setEnviando(false);
    if (!caminho) { toast.error("Não foi possível enviar a foto."); return; }
    onChange({ ...ambiente, fundo_caminho: caminho });
  };

  /** Mudou o aparelho ou o formato de uma tela que já existia? */
  const mudouFormato = () => {
    const o = original.current;
    if (!o?.id) return false;
    return o.dispositivo !== tipoTela || o.largura !== largura || o.altura !== altura;
  };

  const salvar = async (aplicarNoGrupo: boolean) => {
    if (isSalvando) return;
    setIsSalvando(true);
    try {
      await salvarAmbiente({
        ...ambiente,
        tela_nome: ambiente?.tela_nome?.trim() || ambiente?.nome?.trim() || null,
        tela_largura: largura,
        tela_altura: altura,
        fundo_opacidade: opacidade,
        fundo_ajuste: ajuste,
        dispositivo: tipoTela,
        rolagem,
        mostrar_abas: ambiente?.mostrar_abas !== false,
      });
      if (aplicarNoGrupo && original.current) {
        await aplicarFormatoGrupo(original.current.dispositivo, {
          dispositivo: tipoTela,
          tela_largura: largura,
          tela_altura: altura,
          rolagem,
        }, original.current.telaNome);
      }
      onChange(null);
      toast.success(aplicarNoGrupo ? "Formato aplicado a todas as telas do grupo." : "Ambiente salvo.");
      onSalvo();
    } finally {
      setIsSalvando(false);
      setConfirmarFormatoAberto(false);
    }
  };

  const gravar = async () => {
    if (!ambiente?.nome?.trim()) { toast.error("Informe o nome do ambiente."); return; }
    if (mudouFormato()) {
      setConfirmarFormatoAberto(true);
      return;
    }
    await salvar(true);
  };

  return (<>
    <Dialog open={!!ambiente} onOpenChange={(o) => !o && onChange(null)}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0"><DialogTitle>{ambiente?.id ? "Editar ambiente" : "Novo ambiente"}</DialogTitle></DialogHeader>

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

          <div className="flex gap-2">
            <Button
              type="button"
              variant={abaAtiva === "tela" ? "default" : "outline"}
              size="sm"
              onClick={() => setAbaAtiva("tela")}
              className="flex-1"
            >
              <Monitor className="h-4 w-4 mr-2" /> Onde aparece
            </Button>
            <Button
              type="button"
              variant={abaAtiva === "fundo" ? "default" : "outline"}
              size="sm"
              onClick={() => setAbaAtiva("fundo")}
              className="flex-1"
            >
              <ImageIcon className="h-4 w-4 mr-2" /> Foto de fundo
            </Button>
          </div>

          {abaAtiva === "tela" && (
            <div className="space-y-3 rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">
                Escolha o aparelho e o formato na lista. O painel aparece automaticamente para quem abrir
                a tela de parede nesse aparelho, e o retângulo do editor fica exatamente nesse formato.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Aparelho</Label>
                  <Select value={tipoTela} onValueChange={(v) => trocarTipo(v as TipoTela)}>
                    <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      {TIPOS_TELA.map((t) => (
                        <SelectItem key={t.valor} value={t.valor}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Formato da tela</Label>
                  <Select
                    value={FORMATOS_TELA[tipoTela].find((p) => p.largura === largura && p.altura === altura)?.valor ?? "personalizado"}
                    onValueChange={(v) => {
                      const p = FORMATOS_TELA[tipoTela].find((f) => f.valor === v);
                      if (p) aplicar(p.largura, p.altura);
                    }}
                  >
                    <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      {FORMATOS_TELA[tipoTela].map((p) => (
                        <SelectItem key={p.valor} value={p.valor}>{p.label}</SelectItem>
                      ))}
                      <SelectItem value="personalizado">Tamanho personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={ambiente?.mostrar_abas !== false}
                  onChange={(e) => onChange({ ...ambiente, mostrar_abas: e.target.checked })}
                />
                Mostrar as abas das telas deste mesmo aparelho
              </label>

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
          )}

          {abaAtiva === "fundo" && (
            <div className="space-y-3 rounded-xl border p-3">
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
          )}
        </div>


        <DialogFooter className="shrink-0 border-t pt-3 bg-background">
          <Button variant="outline" disabled={isSalvando} onClick={() => onChange(null)}>Cancelar</Button>
          <Button disabled={isSalvando} onClick={gravar}>{isSalvando ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>

    <AlertDialog open={confirmarFormatoAberto} onOpenChange={setConfirmarFormatoAberto}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mudar formato em todas as telas?</AlertDialogTitle>
          <AlertDialogDescription>
            Você alterou o aparelho ou formato desta tela. A mudança será aplicada
            em todas as abas do grupo “{original.current?.telaNome || "sem nome"}".
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSalvando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isSalvando}
            onClick={(e) => { e.preventDefault(); salvar(true); }}
          >
            {isSalvando ? "Salvando..." : "Aplicar em todas"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>);
}
