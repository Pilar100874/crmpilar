import { useState } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ligarPeloPabx, type RespostaClickToCall } from "@/lib/telefonia/clickToCall";
import { useRamalUsuario } from "@/hooks/useRamalUsuario";

/** Teste de Click-to-Call: o PABX toca o ramal do usuário e depois disca o destino. */
export function UCMTesteLigacao() {
  const { ramal, temRamal, carregando } = useRamalUsuario();
  const [destino, setDestino] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [resposta, setResposta] = useState<RespostaClickToCall | null>(null);

  const testar = async () => {
    setOcupado(true);
    setResposta(null);
    const r = await ligarPeloPabx(destino);
    setResposta(r);
    setOcupado(false);
  };

  return (
    <div className="rounded-lg border border-border p-3 space-y-3">
      <div>
        <Label>Testar ligação (Click-to-Call)</Label>
        <p className="text-xs text-muted-foreground">
          O PABX toca primeiro o seu ramal {temRamal ? ramal : ""} e, ao atender, disca o número informado.
        </p>
      </div>

      {!carregando && !temRamal ? (
        <p className="text-xs text-destructive">
          Seu usuário não tem ramal cadastrado, por isso o teste fica indisponível.
        </p>
      ) : (
        <div className="flex gap-2">
          <Input
            placeholder="(11) 99961-1194"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
          />
          <Button onClick={testar} disabled={ocupado || !destino.trim() || !temRamal}>
            <Phone className="mr-2 h-4 w-4" />
            {ocupado ? "Chamando..." : "Testar ligação"}
          </Button>
        </div>
      )}

      {resposta && (
        <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
          {JSON.stringify(resposta, null, 2)}
        </pre>
      )}
    </div>
  );
}
