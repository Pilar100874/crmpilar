import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Eye, Loader2, MessageSquare } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimento";

interface Props {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

interface VendedorRow {
  id: string;
  nome: string | null;
  nome_fantasia: string | null;
  whatsapp: string | null;
  telefone: string | null;
  segmento_id: string | null;
  gerente_usuario_id?: string | null;
  gerente_nome?: string | null;
}

export const BroadcastVendedoresConfig = ({ config, handleConfigChange }: Props) => {
  const [estabId, setEstabId] = useState<string>("");
  const [segmentos, setSegmentos] = useState<Array<{ id: string; nome: string }>>([]);
  const [gerentes, setGerentes] = useState<Array<{ id: string; nome: string }>>([]);
  const [preview, setPreview] = useState<VendedorRow[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const filtroTipo: "todos" | "com_gerente" | "gerente_especifico" | "segmento" =
    config.filtroTipo || "todos";
  const gerenteId = config.gerenteId || "";
  const segmentoId = config.segmentoId || "";
  const combinarSegmento = !!config.combinarSegmento;
  const message = config.message || "";
  const usarMensagemPreDefinida = !!config.usarMensagemPreDefinida;
  const preDefinidaVar = config.preDefinidaVar || "last_mensagem_pre_definida";
  const enviarContato = !!config.enviarContato;

  useEffect(() => {
    (async () => {
      const eid = await getEstabelecimentoId();
      if (!eid) return;
      setEstabId(eid);

      const { data: segs } = await supabase
        .from("segmentos")
        .select("id, nome")
        .eq("estabelecimento_id", eid)
        .order("nome");
      setSegmentos((segs as any) || []);

      const { data: gv } = await supabase
        .from("gerente_vendedores")
        .select("gerente_usuario_id, usuarios:gerente_usuario_id(id, nome)")
        .eq("estabelecimento_id", eid);
      const uniq = new Map<string, string>();
      (gv || []).forEach((r: any) => {
        const u = r.usuarios;
        if (u?.id) uniq.set(u.id, u.nome || u.id);
      });
      setGerentes(Array.from(uniq, ([id, nome]) => ({ id, nome })));
    })();
  }, []);

  const resolveDestinatarios = async (): Promise<VendedorRow[]> => {
    if (!estabId) return [];
    let q = supabase
      .from("empresas")
      .select("id, nome, nome_fantasia, whatsapp, telefone, segmento_id")
      .eq("estabelecimento_id", estabId)
      .eq("tipo_cliente", "vendedor")
      .eq("ativo", true);

    if (filtroTipo === "segmento" && segmentoId) q = q.eq("segmento_id", segmentoId);
    if (combinarSegmento && segmentoId && filtroTipo !== "segmento") q = q.eq("segmento_id", segmentoId);

    const { data: vendedores } = await q;
    let rows: VendedorRow[] = (vendedores as any) || [];

    // Vínculos gerente↔vendedor
    if (
      filtroTipo === "com_gerente" ||
      filtroTipo === "gerente_especifico" ||
      rows.length > 0
    ) {
      const ids = rows.map((r) => r.id);
      if (ids.length > 0) {
        const { data: gv } = await supabase
          .from("gerente_vendedores")
          .select("vendedor_empresa_id, gerente_usuario_id, usuarios:gerente_usuario_id(id, nome)")
          .in("vendedor_empresa_id", ids);
        const map = new Map<string, { id: string; nome: string }>();
        (gv || []).forEach((r: any) => {
          if (r.usuarios?.id) map.set(r.vendedor_empresa_id, { id: r.usuarios.id, nome: r.usuarios.nome || "" });
        });
        rows = rows.map((r) => {
          const g = map.get(r.id);
          return { ...r, gerente_usuario_id: g?.id || null, gerente_nome: g?.nome || null };
        });
      }
    }

    if (filtroTipo === "com_gerente") rows = rows.filter((r) => !!r.gerente_usuario_id);
    if (filtroTipo === "gerente_especifico" && gerenteId)
      rows = rows.filter((r) => r.gerente_usuario_id === gerenteId);

    // filtrar quem tem contato válido
    rows = rows.filter((r) => (r.whatsapp || r.telefone || "").replace(/\D/g, "").length >= 10);
    return rows;
  };

  const handlePreview = async () => {
    setLoadingPreview(true);
    try {
      const rows = await resolveDestinatarios();
      setPreview(rows);
    } finally {
      setLoadingPreview(false);
    }
  };

  const totalPreview = preview.length;

  return (
    <div className="space-y-4">
      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Envia a mensagem para vários vendedores de uma vez, aplicando os filtros escolhidos.
          Opcionalmente compartilha um contato (gerente ou fixo) logo depois.
        </AlertDescription>
      </Alert>

      {/* Filtro de destinatários */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Quem receberá</Label>
        <Select value={filtroTipo} onValueChange={(v) => handleConfigChange("filtroTipo", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos" className="text-xs">Todos os vendedores</SelectItem>
            <SelectItem value="com_gerente" className="text-xs">Somente vendedores com gerente vinculado</SelectItem>
            <SelectItem value="gerente_especifico" className="text-xs">Vendedores de um gerente específico</SelectItem>
            <SelectItem value="segmento" className="text-xs">Vendedores de um segmento específico</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtroTipo === "gerente_especifico" && (
        <div className="space-y-1">
          <Label className="text-xs">Gerente</Label>
          <Select value={gerenteId} onValueChange={(v) => handleConfigChange("gerenteId", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {gerentes.map((g) => (
                <SelectItem key={g.id} value={g.id} className="text-xs">{g.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {(filtroTipo === "segmento" || filtroTipo !== "segmento") && (
        <div className="space-y-1">
          {filtroTipo !== "segmento" && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="combinar_segmento"
                checked={combinarSegmento}
                onCheckedChange={(v) => handleConfigChange("combinarSegmento", !!v)}
              />
              <label htmlFor="combinar_segmento" className="text-xs">Combinar com filtro de segmento</label>
            </div>
          )}
          {(filtroTipo === "segmento" || combinarSegmento) && (
            <Select value={segmentoId} onValueChange={(v) => handleConfigChange("segmentoId", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione o segmento..." /></SelectTrigger>
              <SelectContent>
                {segmentos.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Preview */}
      <div className="space-y-2 rounded-md border border-dashed p-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold flex items-center gap-1">
            <Eye className="h-3 w-3" /> Pré-visualização dos destinatários
          </Label>
          <Button size="sm" variant="outline" onClick={handlePreview} disabled={loadingPreview}>
            {loadingPreview ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verificar agora"}
          </Button>
        </div>
        {preview.length > 0 && (
          <>
            <Badge variant="secondary" className="text-[10px]">{totalPreview} vendedor(es) receberão</Badge>
            <div className="max-h-[180px] overflow-y-auto space-y-1">
              {preview.slice(0, 50).map((r) => (
                <div key={r.id} className="text-[11px] px-2 py-1 rounded bg-background flex items-center justify-between gap-2">
                  <span className="truncate">
                    {r.nome_fantasia || r.nome || r.id}
                    {r.gerente_nome && <span className="text-muted-foreground"> · gerente: {r.gerente_nome}</span>}
                  </span>
                  <span className="text-muted-foreground shrink-0">{r.whatsapp || r.telefone}</span>
                </div>
              ))}
              {preview.length > 50 && (
                <p className="text-[10px] text-muted-foreground">…e mais {preview.length - 50}.</p>
              )}
            </div>
          </>
        )}
        {!loadingPreview && preview.length === 0 && (
          <p className="text-[11px] text-muted-foreground">Clique em Verificar agora para simular a lista.</p>
        )}
      </div>

      {/* Mensagem */}
      <div className="space-y-2 border-t pt-3">
        <Label className="text-xs font-semibold flex items-center gap-1">
          <MessageSquare className="h-3 w-3" /> Mensagem a enviar
        </Label>
        <div className="flex items-center gap-2">
          <Checkbox
            id="usar_pre_def"
            checked={usarMensagemPreDefinida}
            onCheckedChange={(v) => handleConfigChange("usarMensagemPreDefinida", !!v)}
          />
          <label htmlFor="usar_pre_def" className="text-xs">
            Usar frase de um bloco <b>Mensagem Pré Definida</b> anterior
          </label>
        </div>
        {usarMensagemPreDefinida ? (
          <Input
            className="h-8 text-xs"
            value={preDefinidaVar}
            onChange={(e) => handleConfigChange("preDefinidaVar", e.target.value)}
            placeholder="last_mensagem_pre_definida"
          />
        ) : (
          <Textarea
            className="text-xs min-h-[80px]"
            placeholder="Escreva a mensagem. Use {{variavel}} para interpolar."
            value={message}
            onChange={(e) => handleConfigChange("message", e.target.value)}
          />
        )}
      </div>

      {/* Envio de contato */}
      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="enviar_contato"
            checked={enviarContato}
            onCheckedChange={(v) => handleConfigChange("enviarContato", !!v)}
          />
          <label htmlFor="enviar_contato" className="text-xs font-semibold">
            Enviar contato logo após a mensagem
          </label>
        </div>
        {enviarContato && (
          <div className="space-y-2 rounded-md border p-3">
            <div className="space-y-1">
              <Label className="text-xs">Qual contato compartilhar?</Label>
              <Select
                value={config.contatoTipo || "gerente_do_vendedor"}
                onValueChange={(v) => handleConfigChange("contatoTipo", v)}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gerente_do_vendedor" className="text-xs">Gerente do vendedor (dinâmico por destinatário)</SelectItem>
                  <SelectItem value="fixo" className="text-xs">Contato fixo (mesmo para todos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(config.contatoTipo || "gerente_do_vendedor") === "gerente_do_vendedor" && (
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Fallback quando o vendedor não tem gerente vinculado</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    className="h-8 text-xs"
                    placeholder="Nome fallback"
                    value={config.fallbackNome || ""}
                    onChange={(e) => handleConfigChange("fallbackNome", e.target.value)}
                  />
                  <Input
                    className="h-8 text-xs"
                    placeholder="WhatsApp fallback"
                    value={config.fallbackWhatsapp || ""}
                    onChange={(e) => handleConfigChange("fallbackWhatsapp", e.target.value)}
                  />
                </div>
              </div>
            )}
            {(config.contatoTipo || "gerente_do_vendedor") === "fixo" && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  className="h-8 text-xs"
                  placeholder="Nome do contato"
                  value={config.contatoNome || ""}
                  onChange={(e) => handleConfigChange("contatoNome", e.target.value)}
                />
                <Input
                  className="h-8 text-xs"
                  placeholder="WhatsApp (com DDD)"
                  value={config.contatoWhatsapp || ""}
                  onChange={(e) => handleConfigChange("contatoWhatsapp", e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1 border-t pt-3">
        <Label className="text-xs">Delay entre envios (segundos)</Label>
        <Input
          type="number"
          min={0}
          max={60}
          className="h-8 text-xs"
          value={config.delaySeconds ?? 3}
          onChange={(e) => handleConfigChange("delaySeconds", Math.max(0, Math.min(60, parseInt(e.target.value) || 0)))}
        />
        <Label className="text-xs pt-2 block">Variável de saída</Label>
        <Input
          className="h-8 text-xs"
          value={config.outputVariable || "broadcast_vendedores_resultado"}
          onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
        />
      </div>
    </div>
  );
};

export default BroadcastVendedoresConfig;
