import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppNumeroSelectorProps {
  estabelecimentoId: string | null;
  usuarioId: string | null;
  value: string | null;
  onChange: (numeroId: string | null) => void;
  className?: string;
}

interface Numero {
  id: string;
  nome: string;
  telefone: string | null;
  provider: string;
  is_default: boolean;
}

/**
 * Seletor compacto do número WhatsApp usado pelo atendente.
 * Salva a preferência em usuarios.whatsapp_numero_id.
 */
export function WhatsAppNumeroSelector({
  estabelecimentoId,
  usuarioId,
  value,
  onChange,
  className,
}: WhatsAppNumeroSelectorProps) {
  const [numeros, setNumeros] = useState<Numero[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!estabelecimentoId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("whatsapp_numeros")
        .select("id,nome,telefone,provider,is_default")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("ativo", true)
        .order("is_default", { ascending: false })
        .order("nome");
      if (!error && data) setNumeros(data as Numero[]);
      setLoading(false);
    })();
  }, [estabelecimentoId]);

  const handleChange = async (val: string) => {
    const next = val === "__default__" ? null : val;
    onChange(next);
    if (usuarioId) {
      const { error } = await supabase
        .from("usuarios")
        .update({ whatsapp_numero_id: next })
        .eq("id", usuarioId);
      if (error) toast.error("Não foi possível salvar a preferência");
      else toast.success("Número padrão do chat atualizado");
    }
  };

  if (!numeros.length && !loading) return null;

  return (
    <div className={className}>
      <Select value={value ?? "__default__"} onValueChange={handleChange}>
        <SelectTrigger className="h-8 text-xs gap-1 w-auto min-w-[180px]">
          <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
          <SelectValue placeholder="Número WhatsApp" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__default__">
            <span className="text-muted-foreground">Usar número padrão</span>
          </SelectItem>
          {numeros.map((n) => (
            <SelectItem key={n.id} value={n.id}>
              <span className="flex items-center gap-2">
                <span>{n.nome}</span>
                {n.telefone && <span className="text-xs text-muted-foreground">· {n.telefone}</span>}
                <span className="text-[10px] uppercase text-muted-foreground">
                  {n.provider === "cloud_api" ? "Meta" : "Evo"}
                </span>
                {n.is_default && <span className="text-[10px] text-primary">padrão</span>}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
