import { useEffect, useMemo, useState } from "react";
import { BellRing, Check, ChevronsUpDown, Loader2, Save, Video, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUnidadeAtual } from "@/lib/unidadeAtual";
import { useInterfoneConfig, registrarToque } from "@/lib/portaria/interfone";


export default function InterfoneConfigCard() {
  const { unidadeId } = useUnidadeAtual();
  const { config, carregando, salvar } = useInterfoneConfig(unidadeId);
  const [devices, setDevices] = useState<{ id: string; nome: string }[]>([]);
  const [cameras, setCameras] = useState<{ id: string; nome: string }[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [sip, setSip] = useState("");

  useEffect(() => {
    setSip(config?.sip_uri ?? "");
  }, [config?.sip_uri]);

  useEffect(() => {
    (async () => {
      let qd = supabase.from("port_devices").select("id, nome").eq("tipo", "idface").order("nome");
      let qc = supabase.from("cv_cameras").select("id, nome").eq("ativo", true).order("nome");
      if (unidadeId) {
        qd = qd.or(`unidade_id.eq.${unidadeId},unidade_id.is.null`);
        qc = qc.or(`filial_id.eq.${unidadeId},filial_id.is.null`);
      }
      const [{ data: d }, { data: c }] = await Promise.all([qd, qc]);
      setDevices(d ?? []);
      setCameras(c ?? []);
    })();
  }, [unidadeId]);

  if (carregando || !config) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando configuração do interfone...
      </div>
    );
  }

  const alternarCamera = (id: string, marcado: boolean) => {
    const atual = config.cameras_extras ?? [];
    const novas = marcado ? [...new Set([...atual, id])] : atual.filter((c) => c !== id);
    void salvar({ cameras_extras: novas });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="font-medium text-sm">Interfone ativo</p>
            <p className="text-xs text-muted-foreground">Quando desligado, a campainha não abre popup.</p>
          </div>
          <Switch checked={config.ativo} onCheckedChange={(v) => void salvar({ ativo: v })} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="font-medium text-sm">Abrir popup automático</p>
            <p className="text-xs text-muted-foreground">Mostra a tela do interfone ao tocar a campainha.</p>
          </div>
          <Switch checked={config.auto_popup} onCheckedChange={(v) => void salvar({ auto_popup: v })} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="font-medium text-sm">Som de alerta</p>
            <p className="text-xs text-muted-foreground">Toca um bip no computador ao chamar.</p>
          </div>
          <Switch checked={config.som} onCheckedChange={(v) => void salvar({ som: v })} />
        </div>
        <div className="rounded-lg border p-3 space-y-2">
          <Label className="text-sm">Dispositivo do interfone (iDFace)</Label>
          <Select
            value={config.device_id ?? ""}
            onValueChange={(v) => void salvar({ device_id: v || null })}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Selecione o interfone" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {devices.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <Label className="text-sm flex items-center gap-2">
          <Video className="h-4 w-4" /> Câmeras que abrem junto com o interfone
        </Label>
        <p className="text-xs text-muted-foreground">
          Além da câmera do interfone, estas imagens aparecem no popup antes de abrir o portão.
        </p>

        <Popover open={abertoCams} onOpenChange={setAbertoCams}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="w-full justify-between bg-background">
              <span className="truncate text-sm font-normal">
                {selecionadas.length === 0
                  ? "Selecionar câmeras..."
                  : `${selecionadas.length} câmera(s) selecionada(s)`}
              </span>
              <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover z-50" align="start">
            <Command>
              <CommandInput placeholder="Buscar câmera..." />
              <CommandList>
                <CommandEmpty>Nenhuma câmera ativa nesta unidade.</CommandEmpty>
                <CommandGroup>
                  {cameras.map((c) => {
                    const marcado = (config.cameras_extras ?? []).includes(c.id);
                    return (
                      <CommandItem key={c.id} value={c.nome} onSelect={() => alternarCamera(c.id, !marcado)}>
                        <Check className={`mr-2 h-4 w-4 ${marcado ? "opacity-100" : "opacity-0"}`} />
                        <span className="truncate">{c.nome}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {selecionadas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selecionadas.map((c) => (
              <Badge key={c.id} variant="secondary" className="gap-1 pr-1">
                <span className="truncate max-w-[160px]">{c.nome}</span>
                <button
                  type="button"
                  aria-label={`Remover ${c.nome}`}
                  onClick={() => alternarCamera(c.id, false)}
                  className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>


      <div className="rounded-lg border p-3 space-y-2">
        <Label className="text-sm">Ramal de áudio (SIP) para falar pelo computador</Label>
        <p className="text-xs text-muted-foreground">
          Ex.: sip:1001@192.168.88.10 — usado pelo botão "Falar" do popup. Sem SIP, o botão abre a interface local do
          interfone.
        </p>
        <div className="flex gap-2">
          <Input value={sip} onChange={(e) => setSip(e.target.value)} placeholder="sip:1001@192.168.88.10" />
          <Button
            disabled={salvando}
            onClick={async () => {
              setSalvando(true);
              const r = await salvar({ sip_uri: sip.trim() || null });
              setSalvando(false);
              r.ok ? toast.success(r.mensagem) : toast.error(r.mensagem);
            }}
          >
            <Save className="h-4 w-4 mr-2" /> Salvar
          </Button>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={async () => {
          const r = await registrarToque(unidadeId, config.device_id, "teste");
          r.ok ? toast.success("Campainha simulada — o popup deve abrir.") : toast.error(r.mensagem);
        }}
      >
        <BellRing className="h-4 w-4 mr-2" /> Simular campainha (teste)
      </Button>
    </div>
  );
}
