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

      <div>
        <Label>Título</Label>
        <Input
          placeholder={
            context === "logistica"
              ? "Ex: Veículo {placa} parado há {tempo} min"
              : "Ex: Novo pedido chegou {{orcamento.numero}}"
          }
          value={cfg.titulo || ""}
          onChange={(e) => onChange({ titulo: e.target.value })}
        />
      </div>

      <div>
        <Label>Mensagem</Label>
        <Textarea
          placeholder={
            context === "logistica"
              ? "Ex: O motorista {motorista} está com o veículo {placa} parado em {endereco}"
              : "Ex: Cliente {{cliente.nome}} solicitou orçamento de R$ {{orcamento.valor_total}}"
          }
          value={cfg.corpo || ""}
          onChange={(e) => onChange({ corpo: e.target.value })}
          rows={3}
        />
      </div>

      <div>
        <Label>URL ao clicar (opcional)</Label>
        <Input
          placeholder={context === "logistica" ? "/logistica" : "/orcamentos"}
          value={cfg.url || ""}
          onChange={(e) => onChange({ url: e.target.value })}
        />
      </div>

      {context === "logistica" ? (
        <p className="text-xs text-muted-foreground">
          Variáveis: <code className="text-primary">{"{placa}"}</code>,{" "}
          <code className="text-primary">{"{motorista}"}</code>,{" "}
          <code className="text-primary">{"{endereco}"}</code>,{" "}
          <code className="text-primary">{"{velocidade}"}</code>.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Use <code className="text-primary">{"{{campo.subcampo}}"}</code> para interpolar variáveis do fluxo.
        </p>
      )}
    </div>
  );
}
