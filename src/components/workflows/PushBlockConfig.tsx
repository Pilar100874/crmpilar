import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PushBlockConfig } from "@/lib/pushExecutor";

interface Props {
  value: Partial<PushBlockConfig>;
  onChange: (patch: Partial<PushBlockConfig>) => void;
  context?: "bot" | "logistica" | "vendas" | "ads" | "omnichannel" | "marketing";
}

export function PushBlockConfigEditor({ value, onChange, context }: Props) {
  const cfg = value || {};
  const [usuarios, setUsuarios] = useState<Array<{ id: string; nome: string }>>([]);
  const [contatos, setContatos] = useState<Array<{ id: string; nome: string }>>([]);

  useEffect(() => {
    supabase.from("usuarios").select("id, nome").order("nome").limit(500)
      .then(({ data }) => setUsuarios(data || []));
    supabase.from("customers").select("id, nome:name").order("name").limit(500)
      .then(({ data }) => setContatos((data as any) || []));
  }, []);

  const tipo = cfg.destinatario_tipo || "usuario";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
          🔔 Push Notification
        </Badge>
        {context && <span className="text-xs text-muted-foreground">contexto: {context}</span>}
      </div>

      <div>
        <Label>Destinatário</Label>
        <Select value={tipo} onValueChange={(v) => onChange({ destinatario_tipo: v as any })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="usuario">Usuário(s) interno(s)</SelectItem>
            <SelectItem value="contato">Cliente(s) específico(s)</SelectItem>
            <SelectItem value="todos_usuarios">Todos os usuários internos</SelectItem>
            <SelectItem value="todos_contatos">Todos os clientes com app</SelectItem>
            <SelectItem value="variavel">Variável do fluxo (dinâmico)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tipo === "usuario" && (
        <div>
          <Label>Usuário</Label>
          <Select
            value={cfg.usuario_ids?.[0] || ""}
            onValueChange={(v) => onChange({ usuario_ids: v ? [v] : [] })}
          >
            <SelectTrigger><SelectValue placeholder="Selecionar usuário" /></SelectTrigger>
            <SelectContent>
              {usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {tipo === "contato" && (
        <div>
          <Label>Cliente</Label>
          <Select
            value={cfg.contato_ids?.[0] || ""}
            onValueChange={(v) => onChange({ contato_ids: v ? [v] : [] })}
          >
            <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
            <SelectContent>
              {contatos.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {tipo === "variavel" && (
        <div className="space-y-2">
          <div>
            <Label>Tipo da variável</Label>
            <Select
              value={cfg.variavel_tipo || "contato"}
              onValueChange={(v) => onChange({ variavel_tipo: v as any })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="usuario">Usuário interno</SelectItem>
                <SelectItem value="contato">Cliente / contato</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Caminho da variável</Label>
            <Input
              placeholder="ex: contato.id ou orcamento.vendedor_id"
              value={cfg.variavel_destinatario || ""}
              onChange={(e) => onChange({ variavel_destinatario: e.target.value })}
            />
          </div>
        </div>
      )}

      {(() => {
        const ex: Record<string, { titulo: string; corpo: string; url: string; vars: string }> = {
          logistica: {
            titulo: "Ex: Veículo {placa} parado há {tempo} min",
            corpo: "Ex: O motorista {motorista} está com o veículo {placa} parado em {endereco}",
            url: "/logistica",
            vars: "{placa}, {motorista}, {endereco}, {velocidade}",
          },
          vendas: {
            titulo: "Ex: Novo pedido de {{cliente.nome}}",
            corpo: "Ex: Pedido {{pedido.numero}} no valor de R$ {{pedido.total}} foi recebido",
            url: "/vendas",
            vars: "{{cliente.nome}}, {{pedido.numero}}, {{pedido.total}}, {{pedido.status}}",
          },
          ads: {
            titulo: "Ex: Alerta de campanha {{campanha.nome}}",
            corpo: "Ex: A campanha {{campanha.nome}} atingiu R$ {{campanha.gasto}} de investimento com CPA {{campanha.cpa}}",
            url: "/ads",
            vars: "{{campanha.nome}}, {{campanha.gasto}}, {{campanha.cpa}}, {{campanha.roas}}",
          },
          omnichannel: {
            titulo: "Ex: Nova conversa de {{cliente.nome}}",
            corpo: "Ex: {{cliente.nome}} enviou uma mensagem no canal {{canal}}: {{mensagem}}",
            url: "/atendimento",
            vars: "{{cliente.nome}}, {{canal}}, {{mensagem}}, {{conversa.id}}",
          },
          marketing: {
            titulo: "Ex: {{cliente.nome}}, temos uma oferta pra você!",
            corpo: "Ex: Aproveite {{cupom.desconto}} de desconto em {{produto.nome}}",
            url: "/promocoes",
            vars: "{{cliente.nome}}, {{cupom.codigo}}, {{cupom.desconto}}, {{produto.nome}}",
          },
          bot: {
            titulo: "Ex: Olá {{contato.nome}}, tudo bem?",
            corpo: "Ex: Sua solicitação {{atendimento.protocolo}} foi atualizada",
            url: "/atendimento",
            vars: "{{contato.nome}}, {{atendimento.protocolo}}, {{mensagem}}",
          },
        };
        const e = ex[context || "bot"] || ex.bot;
        const isLogistica = context === "logistica";
        return (
          <>
            <div>
              <Label>Título</Label>
              <Input
                placeholder={e.titulo}
                value={cfg.titulo || ""}
                onChange={(ev) => onChange({ titulo: ev.target.value })}
              />
            </div>

            <div>
              <Label>Mensagem</Label>
              <Textarea
                placeholder={e.corpo}
                value={cfg.corpo || ""}
                onChange={(ev) => onChange({ corpo: ev.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label>Tela ao clicar (opcional)</Label>
              <Select
                value={cfg.url || "__none__"}
                onValueChange={(v) => onChange({ url: v === "__none__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tela" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="__none__">Nenhuma (sem redirecionamento)</SelectItem>
                  {APP_SCREENS.map((g) => (
                    <div key={g.grupo}>
                      <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">{g.grupo}</div>
                      {g.telas.map((t) => (
                        <SelectItem key={t.path} value={t.path}>{t.nome}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Tela que será aberta ao tocar na notificação push.
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Variáveis disponíveis: <code className="text-primary">{e.vars}</code>.
              {!isLogistica && (
                <> Use <code className="text-primary">{"{{campo.subcampo}}"}</code> para interpolar valores do fluxo.</>
              )}
            </p>
          </>
        );
      })()}
    </div>
  );
}
