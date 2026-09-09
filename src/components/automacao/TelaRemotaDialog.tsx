import { useState } from "react";
import { Copy, ExternalLink, MonitorPlay } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ambiente, TELA_PADRAO } from "@/lib/automacao/api";

const TAMANHOS = [
  { id: "auto", nome: "Tamanho do ambiente", l: 0, a: 0 },
  { id: "1920", nome: "Full HD 1920×1080 (16:9)", l: 1920, a: 1080 },
  { id: "3840", nome: "4K 3840×2160 (16:9)", l: 3840, a: 2160 },
  { id: "1080v", nome: "Vertical 1080×1920 (9:16)", l: 1080, a: 1920 },
  { id: "1280", nome: "HD 1280×720 (16:9)", l: 1280, a: 720 },
  { id: "1024", nome: "Tablet 1024×768 (4:3)", l: 1024, a: 768 },
  { id: "livre", nome: "Personalizado", l: 0, a: 0 },
];

interface Props {
  aberto: boolean;
  onFechar: () => void;
  ambientes: Ambiente[];
  ambienteAtual?: string;
}

/** Monta o endereço da tela remota do painel (TV, totem, monitor de parede). */
export default function TelaRemotaDialog({ aberto, onFechar, ambientes, ambienteAtual }: Props) {
  const [ambiente, setAmbiente] = useState(ambienteAtual || "todos");
  const [tamanho, setTamanho] = useState("auto");
  const [largura, setLargura] = useState(String(TELA_PADRAO.largura));
  const [altura, setAltura] = useState(String(TELA_PADRAO.altura));
  const [barra, setBarra] = useState(true);

  const preset = TAMANHOS.find((t) => t.id === tamanho)!;
  const l = tamanho === "livre" ? Number(largura) || 0 : preset.l;
  const a = tamanho === "livre" ? Number(altura) || 0 : preset.a;

  const params = new URLSearchParams({ ambiente });
  if (l && a) { params.set("largura", String(l)); params.set("altura", String(a)); }
  if (!barra) params.set("barra", "0");
  const url = `${window.location.origin}/automacao/tela?${params.toString()}`;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MonitorPlay className="h-5 w-5" /> Tela remota
          </DialogTitle>
          <DialogDescription>
            Abra este endereço na TV, no totem ou em outro computador. O painel funciona
            normalmente com mouse e toque, mas não permite editar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Ambiente</Label>
            <Select value={ambiente} onValueChange={setAmbiente}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos (com abas para trocar)</SelectItem>
                {ambientes.map((am) => (
                  <SelectItem key={am.id} value={am.id}>{am.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tamanho da tela</Label>
            <Select value={tamanho} onValueChange={setTamanho}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TAMANHOS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tamanho === "livre" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Largura (px)</Label>
                <Input type="number" value={largura} onChange={(e) => setLargura(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Altura (px)</Label>
                <Input type="number" value={altura} onChange={(e) => setAltura(e.target.value)} />
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={barra} onChange={(e) => setBarra(e.target.checked)} />
            Mostrar abas de ambiente na tela remota
          </label>

          <div className="rounded-lg border bg-muted/40 p-2 text-xs break-all">{url}</div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => { navigator.clipboard.writeText(url); toast.success("Endereço copiado."); }}
              variant="outline"
            >
              <Copy className="h-4 w-4 mr-2" /> Copiar endereço
            </Button>
            <Button onClick={() => window.open(url, "_blank")}>
              <ExternalLink className="h-4 w-4 mr-2" /> Abrir agora
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
