import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Delete,
  Settings2,
  PlugZap,
  Unplug,
  X,
} from "lucide-react";
import { SessionState } from "sip.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useSipConnection } from "@/hooks/useSipConnection";
import { useToast } from "@/hooks/use-toast";
import AvisoInline from "@/components/portaria/AvisoInline";

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
  const [aviso, setAviso] = useState<string | null>(null);

  const configValida = useMemo(
    () => !!(config.servidor && config.ramal && config.senha),
    [config.servidor, config.ramal, config.senha],
  );

  const conectar = useCallback(async () => {
    if (!configValida) {
      setEditando(true);
      setAviso("Informe servidor, ramal e senha SIP para registrar o aparelho.");
      return;
    }
    setAviso(null);
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
    setAviso(null);
    toast({ title: "Ramal salvo", description: "Configuração guardada neste aparelho." });
  };

  const status = isConnecting
    ? { texto: "Conectando...", cor: "secondary" as const }
    : isRegistered
      ? { texto: `Ramal ${config.ramal} online`, cor: "default" as const }
      : { texto: "Desconectado", cor: "destructive" as const };

  const btnEscuro = dark ? "border-white/15 !bg-white/10 text-white hover:!bg-white/20" : "";
  const btnLaranja = dark ? "!bg-orange-500 font-semibold text-white shadow-lg shadow-orange-500/25 hover:!bg-orange-600" : "";
  const inputEscuro = dark
    ? "border-white/25 !bg-[#16233B] !text-white placeholder:text-slate-400 focus-visible:ring-orange-500"
    : "";

  const casca = dark
    ? "rounded-3xl border border-white/10 bg-[#0F1B2E] p-4 text-white shadow-2xl"
    : "rounded-3xl border bg-card p-4 shadow-sm";

  return (
    <div className={casca}>
      <div className="mb-3 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <PhoneCall className={`h-4 w-4 ${dark ? "text-orange-400" : ""}`} /> Ramal SIP
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              isRegistered
                ? "bg-emerald-500/15 text-emerald-400"
                : isConnecting
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-red-500/15 text-red-400"
            }`}
          >
            {status.texto}
          </span>
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
      </div>

      <div className="space-y-4">

        {aviso && <AvisoInline tipo="aviso">{aviso}</AvisoInline>}


        {editando && (
          <div className={`space-y-3 rounded-lg border p-3 ${dark ? "border-white/10 bg-white/5" : ""}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="sip-servidor">Servidor (PABX)</Label>
                <Input
                  id="sip-servidor"
                  className={inputEscuro}
                  value={config.servidor}
                  onChange={(e) => setConfig({ ...config, servidor: e.target.value })}
                  placeholder="pabx.empresa.com.br"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sip-remoto">Servidor alternativo</Label>
                <Input
                  id="sip-remoto"
                  className={inputEscuro}
                  value={config.servidorRemoto}
                  onChange={(e) => setConfig({ ...config, servidorRemoto: e.target.value })}
                  placeholder="opcional"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sip-ramal">Ramal</Label>
                <Input
                  id="sip-ramal"
                  className={inputEscuro}
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
                  className={inputEscuro}
                  type="password"
                  value={config.senha}
                  onChange={(e) => setConfig({ ...config, senha: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sip-nome">Nome exibido</Label>
                <Input
                  id="sip-nome"
                  className={inputEscuro}
                  value={config.nome}
                  onChange={(e) => setConfig({ ...config, nome: e.target.value })}
                  placeholder="Portaria"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sip-portaria">Ramal da portaria/interfone</Label>
                <Input
                  id="sip-portaria"
                  className={inputEscuro}
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

            <Button className={`w-full ${btnLaranja}`} onClick={salvar}>
              Salvar ramal
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          {isRegistered ? (
            <Button variant="outline" className={`flex-1 ${btnEscuro}`} onClick={() => void disconnect()}>
              <Unplug className="mr-2 h-4 w-4" /> Desconectar
            </Button>
          ) : (
            <Button className={`flex-1 ${btnLaranja}`} disabled={isConnecting} onClick={() => void conectar()}>
              <PlugZap className="mr-2 h-4 w-4" />
              {isConnecting ? "Conectando..." : "Conectar ramal"}
            </Button>
          )}
          {config.ramalPortaria && (
            <Button
              variant="secondary"
              className={btnEscuro}
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
                  className={`flex items-center justify-between rounded-lg border p-3 ${dark ? "border-white/10 bg-white/5" : "bg-muted/40"}`}
                >
                  <div>
                    <p className="text-sm font-medium">{call.phoneNumber}</p>
                    <p className={`text-xs ${dark ? "text-slate-400" : "text-muted-foreground"}`}>
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
          <div
            className={`flex h-14 items-center justify-center rounded-2xl text-2xl font-semibold tracking-[0.3em] ${
              dark ? "bg-white/5 text-white" : "bg-muted"
            }`}
          >
            {numero || <span className={dark ? "text-slate-600" : "text-muted-foreground"}>—</span>}
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {TECLAS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setNumero((n) => n + t)}
                className={`h-14 rounded-2xl text-xl font-semibold transition active:scale-95 ${
                  dark
                    ? "border border-white/10 bg-white/10 text-white hover:bg-white/20"
                    : "border bg-background hover:bg-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNumero((n) => n.slice(0, -1))}
              aria-label="Apagar"
              className={`flex h-14 w-16 items-center justify-center rounded-2xl transition active:scale-95 ${
                dark ? "border border-white/10 bg-white/10 text-white hover:bg-white/20" : "border bg-background"
              }`}
            >
              <Delete className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={!isRegistered || !numero.trim()}
              onClick={() => void dial(numero.trim())}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition active:scale-95 disabled:opacity-40"
            >
              <Phone className="h-5 w-5" /> Ligar
            </button>
          </div>
        </div>

      </div>
    </div>

  );
}
