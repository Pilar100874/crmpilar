import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
const supabase = supabaseTyped as any;

type Props = {
  tipo: "he_pendente" | "atestado_pendente" | "falta" | "atraso" | "fraude" | "custom";
  funcionarioId?: string | null;
  titulo?: string;
  mensagemPadrao?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "sm" | "default" | "lg";
};

const CANAIS = ["push","whatsapp","sms","email"] as const;

export default function EnviarNotificacaoAgoraButton({
  tipo, funcionarioId, titulo = "Notificar agora",
  mensagemPadrao = "", variant = "outline", size = "sm",
}: Props) {
  const [open, setOpen] = useState(false);
  const [mensagem, setMensagem] = useState(mensagemPadrao);
  const [canais, setCanais] = useState<string[]>(["whatsapp","push"]);
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    const est = await getEstabelecimentoId();
    if (!est) return toast.error("Estabelecimento não identificado");
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke("ponto-notificar-canal", {
        body: {
          estabelecimento_id: est, tipo, funcionario_id: funcionarioId,
          canais, mensagem, titulo, forcar: true,
          dados: { data: new Date().toLocaleDateString("pt-BR") },
        },
      });
      if (error) throw error;
      const ok = (data?.resultados || []).filter((r: any) => r.ok).length;
      toast.success(`${ok} envio(s) realizado(s)`);
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || String(e));
    } finally { setEnviando(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}><Send className="w-4 h-4 mr-2" />{titulo}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{titulo}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Mensagem</Label>
            <Textarea rows={3} value={mensagem} onChange={(e) => setMensagem(e.target.value)}
              placeholder="Deixe em branco para usar o template configurado." />
          </div>
          <div>
            <Label className="mb-2 block">Canais</Label>
            <div className="flex flex-wrap gap-3">
              {CANAIS.map(c => {
                const on = canais.includes(c);
                return (
                  <label key={c} className="flex items-center gap-2 text-sm capitalize">
                    <Checkbox checked={on} onCheckedChange={() =>
                      setCanais(on ? canais.filter(x => x !== c) : [...canais, c])} /> {c}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={enviar} disabled={enviando || !canais.length}>
            <Send className="w-4 h-4 mr-2" />Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
