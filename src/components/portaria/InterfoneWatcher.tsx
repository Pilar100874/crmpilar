import { useState } from "react";
import { BellRing, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useUnidadeAtual } from "@/lib/unidadeAtual";
import { useCampainha, useInterfoneConfig, tocarAlerta } from "@/lib/portaria/interfone";
import InterfonePopup from "./InterfonePopup";

/**
 * Fica ativo em toda a Portaria: escuta a campainha em tempo real e abre
 * o popup do interfone (câmera + câmeras extras + botões de abertura).
 * Também expõe a flag "Interfone ativo" no menu principal.
 */
export default function InterfoneWatcher({ comFlag = true }: { comFlag?: boolean }) {
  const { unidadeId } = useUnidadeAtual();
  const { config, salvar } = useInterfoneConfig(unidadeId);
  const [toqueId, setToqueId] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);

  const ativo = !!config?.ativo;

  useCampainha(unidadeId, ativo && !!config?.auto_popup, (toque) => {
    setToqueId(toque.id);
    setAberto(true);
    if (config?.som) tocarAlerta();
  });

  return (
    <>
      {comFlag && (
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5">
          {ativo ? <BellRing className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
          <Label htmlFor="flag-interfone" className="text-xs font-medium cursor-pointer">
            Interfone ativo
          </Label>
          <Switch
            id="flag-interfone"
            checked={ativo}
            onCheckedChange={async (v) => {
              const r = await salvar({ ativo: v });
              if (!r.ok) toast.error(r.mensagem);
              else toast.success(v ? "Interfone ativado" : "Interfone desativado");
            }}
          />
        </div>
      )}

      {config && (
        <InterfonePopup
          aberto={aberto}
          onFechar={() => setAberto(false)}
          config={config}
          unidadeId={unidadeId}
          toqueId={toqueId}
        />
      )}
    </>
  );
}
