import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Delete,
  Settings2,
  PlugZap,
  Unplug,
} from "lucide-react";
import { SessionState } from "sip.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSipConnection } from "@/hooks/useSipConnection";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "portaria.sip.config";

export interface PortariaSipConfig {
  servidor: string;
  servidorRemoto: string;
  ramal: string;
  senha: string;
  nome: string;
  ramalPortaria: string;
  autoConectar: boolean;
  autoAtender: boolean;
}

const CONFIG_PADRAO: PortariaSipConfig = {
  servidor: "",
  servidorRemoto: "",
  ramal: "",
  senha: "",
  nome: "",
  ramalPortaria: "",
  autoConectar: true,
  autoAtender: false,
};

export function lerConfigSip(): PortariaSipConfig {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    if (!bruto) return CONFIG_PADRAO;
    return { ...CONFIG_PADRAO, ...(JSON.parse(bruto) as Partial<PortariaSipConfig>) };
  } catch {
    return CONFIG_PADRAO;
  }
}

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

/** Ramal SIP embarcado no app da Portaria: registra no PABX e permite atender/ligar. */
export default function PortariaSipRamal({ dark = false }: { dark?: boolean }) {

  const { toast } = useToast();
  const { connect, disconnect, dial, hangup, answer, isRegistered, isConnecting, activeCalls } =
    useSipConnection();

  const [config, setConfig] = useState<PortariaSipConfig>(() => lerConfigSip());
  const [editando, setEditando] = useState(false);
  const [numero, setNumero] = useState("");
  const [tentouAuto, setTentouAuto] = useState(false);

  const configValida = useMemo(
    () => !!(config.servidor && config.ramal && config.senha),
    [config.servidor, config.ramal, config.senha],
  );

  const conectar = useCallback(async () => {
    if (!configValida) {
      setEditando(true);
      toast({
        title: "Configure o ramal",
        description: "Informe servidor, ramal e senha SIP para registrar o aparelho.",
        variant: "destructive",
      });
      return;
    }
    await connect({
      server: config.servidor.trim(),
      remoteServer: config.servidorRemoto.trim() || undefined,
      extension: config.ramal.trim(),
      password: config.senha,
      displayName: config.nome.trim() || config.ramal.trim(),
    });
  }, [config, configValida, connect, toast]);

  // Conexão automática ao abrir o app
  useEffect(() => {
    if (tentouAuto || !config.autoConectar || !configValida || isRegistered || isConnecting) return;
    setTentouAuto(true);
    void conectar();
  }, [tentouAuto, config.autoConectar, configValida, isRegistered, isConnecting, conectar]);

  const chamadaEntrante = activeCalls.find(
    (c) => c.direction === "inbound" && c.state !== SessionState.Established,
  );

  // Atendimento automático (viva-voz)
  useEffect(() => {
    if (!config.autoAtender || !chamadaEntrante) return;
    void answer(chamadaEntrante.id);
  }, [config.autoAtender, chamadaEntrante, answer]);

  const salvar = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setEditando(false);
    setTentouAuto(false);
    toast({ title: "Ramal salvo", description: "Configuração guardada neste aparelho." });
  };

  const status = isConnecting
    ? { texto: "Conectando...", cor: "secondary" as const }
    : isRegistered
      ? { texto: `Ramal ${config.ramal} online`, cor: "default" as const }
      : { texto: "Desconectado", cor: "destructive" as const };

  const btnEscuro = dark ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : "";
  const btnLaranja = dark ? "bg-orange-500 font-semibold text-white hover:bg-orange-600" : "";

  return (
    <Card className={dark ? "border-white/10 bg-white/5 text-white backdrop-blur" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <PhoneCall className={`h-4 w-4 ${dark ? "text-orange-400" : ""}`} /> Ramal SIP
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge
            variant={status.cor}
            className={dark && isRegistered ? "bg-orange-500 text-white hover:bg-orange-500" : ""}
          >
            {status.texto}
          </Badge>
          <Button
            size="icon"
            variant="ghost"
            className={`h-8 w-8 ${dark ? "text-slate-300 hover:bg-white/10 hover:text-white" : ""}`}
            onClick={() => setEditando((v) => !v)}
            aria-label="Configurar ramal SIP"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>


      <CardContent className="space-y-4">
        {editando && (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="sip-servidor">Servidor (PABX)</Label>
                <Input
                  id="sip-servidor"
                  value={config.servidor}
                  onChange={(e) => setConfig({ ...config, servidor: e.target.value })}
                  placeholder="pabx.empresa.com.br"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sip-remoto">Servidor alternativo</Label>
                <Input
                  id="sip-remoto"
                  value={config.servidorRemoto}
                  onChange={(e) => setConfig({ ...config, servidorRemoto: e.target.value })}
                  placeholder="opcional"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sip-ramal">Ramal</Label>
                <Input
                  id="sip-ramal"
                  value={config.ramal}
                  onChange={(e) => setConfig({ ...config, ramal: e.target.value })}
                  placeholder="1001"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sip-senha">Senha SIP</Label>
                <Input
                  id="sip-senha"
                  type="password"
                  value={config.senha}
                  onChange={(e) => setConfig({ ...config, senha: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sip-nome">Nome exibido</Label>
                <Input
                  id="sip-nome"
                  value={config.nome}
                  onChange={(e) => setConfig({ ...config, nome: e.target.value })}
                  placeholder="Portaria"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sip-portaria">Ramal da portaria/interfone</Label>
                <Input
                  id="sip-portaria"
                  value={config.ramalPortaria}
                  onChange={(e) => setConfig({ ...config, ramalPortaria: e.target.value })}
                  placeholder="2000"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sip-auto" className="text-sm font-normal">
                Conectar automaticamente ao abrir
              </Label>
              <Switch
                id="sip-auto"
                checked={config.autoConectar}
                onCheckedChange={(v) => setConfig({ ...config, autoConectar: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sip-atender" className="text-sm font-normal">
                Atender chamadas automaticamente
              </Label>
              <Switch
                id="sip-atender"
                checked={config.autoAtender}
                onCheckedChange={(v) => setConfig({ ...config, autoAtender: v })}
              />
            </div>

            <Button className="w-full" onClick={salvar}>
              Salvar ramal
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          {isRegistered ? (
            <Button variant="outline" className="flex-1" onClick={() => void disconnect()}>
              <Unplug className="mr-2 h-4 w-4" /> Desconectar
            </Button>
          ) : (
            <Button className="flex-1" disabled={isConnecting} onClick={() => void conectar()}>
              <PlugZap className="mr-2 h-4 w-4" />
              {isConnecting ? "Conectando..." : "Conectar ramal"}
            </Button>
          )}
          {config.ramalPortaria && (
            <Button
              variant="secondary"
              disabled={!isRegistered}
              onClick={() => void dial(config.ramalPortaria)}
            >
              <Phone className="mr-2 h-4 w-4" /> Portaria
            </Button>
          )}
        </div>

        {activeCalls.length > 0 && (
          <div className="space-y-2">
            {activeCalls.map((call) => {
              const emChamada = call.state === SessionState.Established;
              const tocando = call.direction === "inbound" && !emChamada;
              return (
                <div
                  key={call.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/40 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{call.phoneNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {tocando
                        ? "Chamando você..."
                        : emChamada
                          ? "Em conversa"
                          : call.direction === "outbound"
                            ? "Discando"
                            : "Chamada"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {tocando && (
                      <Button size="sm" onClick={() => void answer(call.id)}>
                        <Phone className="mr-1 h-4 w-4" /> Atender
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => void hangup(call.id)}>
                      <PhoneOff className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-3">
          <Input
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="Digite o número ou ramal"
            inputMode="tel"
            className={`text-center text-lg tracking-widest ${dark ? "border-white/15 bg-white/10 text-white placeholder:text-slate-500" : ""}`}
          />
          <div className="grid grid-cols-3 gap-2">
            {TECLAS.map((t) => (
              <Button
                key={t}
                variant="outline"
                className={`h-12 text-lg ${btnEscuro}`}
                onClick={() => setNumero((n) => n + t)}
              >
                {t}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className={`w-14 ${btnEscuro}`}
              onClick={() => setNumero((n) => n.slice(0, -1))}
              aria-label="Apagar"
            >
              <Delete className="h-4 w-4" />
            </Button>
            <Button
              className={`flex-1 ${btnLaranja}`}
              disabled={!isRegistered || !numero.trim()}
              onClick={() => void dial(numero.trim())}
            >
              <Phone className="mr-2 h-4 w-4" /> Ligar
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
