import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";

interface NovaAutomacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  automationToEdit?: any;
}

interface WebhookVariable {
  name: string;
  type: string;
  required: boolean;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  method: string;
  variables: WebhookVariable[];
}

export default function NovaAutomacaoDialog({
  open,
  onOpenChange,
  onSuccess,
  automationToEdit,
}: NovaAutomacaoDialogProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoDisparo, setTipoDisparo] = useState<"manual" | "data">("manual");
  
  // Manual
  const [localDisponivel, setLocalDisponivel] = useState<string[]>([]);
  
  // Por data
  const [periodicidade, setPeriodicidade] = useState("");
  const [diaSemana, setDiaSemana] = useState("");
  const [diaMes, setDiaMes] = useState("");
  const [dataEspecifica, setDataEspecifica] = useState("");
  const [horario, setHorario] = useState("");
  
  // Método de disparo
  const [metodoDisparo, setMetodoDisparo] = useState<"webhook" | "bot">("webhook");
  
  // Webhook
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhookSelecionado, setWebhookSelecionado] = useState("");
  const [variaveisWebhook, setVariaveisWebhook] = useState<Record<string, string>>({});
  
  // Bot
  const [bots, setBots] = useState<Array<{ id: string; name: string }>>([]);
  const [botSelecionado, setBotSelecionado] = useState("");

  // Variáveis personalizadas (Bot ou Webhook)
  const [variaveisCustom, setVariaveisCustom] = useState<Array<{ nome: string; valor: string }>>([]);
  const [formatoSaida, setFormatoSaida] = useState<"json" | "form" | "multipart" | "xml" | "text" | "query">("json");

  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open) {
      loadWebhooks();
      loadBots();
    }
  }, [open]);

  useEffect(() => {
    if (webhookSelecionado) {
      const webhook = webhooks.find(w => w.id === webhookSelecionado);
      if (webhook?.variables) {
        const initialVars: Record<string, string> = {};
        webhook.variables.forEach(v => {
          initialVars[v.name] = "";
        });
        setVariaveisWebhook(initialVars);
      }
    } else {
      setVariaveisWebhook({});
    }
  }, [webhookSelecionado, webhooks]);

  useEffect(() => {
    if (open && automationToEdit) {
      setNome(automationToEdit.name || "");
      setDescricao(automationToEdit.description || "");
      const cfg = automationToEdit.config || {};
      const tipo = cfg.tipo_disparo === "automatico" ? "manual" : (cfg.tipo_disparo || "manual");
      setTipoDisparo(tipo);
      setLocalDisponivel(Array.isArray(cfg.local_disponivel) ? cfg.local_disponivel : (cfg.local_disponivel ? [cfg.local_disponivel] : []));
      setPeriodicidade(cfg.periodicidade || "");
      setDiaSemana(cfg.dia_semana || "");
      setDiaMes(cfg.dia_mes || "");
      setDataEspecifica(cfg.data_especifica || "");
      setHorario(cfg.horario || "");
      setMetodoDisparo(cfg.metodo_disparo || (cfg.bot_id ? "bot" : "webhook"));
      setWebhookSelecionado(cfg.webhook_id || "");
      setVariaveisWebhook(cfg.variaveis || {});
      setBotSelecionado(cfg.bot_id || "");
      const vc = cfg.variaveis_custom;
      if (Array.isArray(vc)) {
        setVariaveisCustom(vc);
      } else if (vc && typeof vc === "object") {
        setVariaveisCustom(Object.entries(vc).map(([nome, valor]) => ({ nome, valor: String(valor ?? "") })));
      } else {
        setVariaveisCustom([]);
      }
      setFormatoSaida(cfg.formato_saida || "json");
    } else if (open && !automationToEdit) {
      // Resetar ao abrir para criar nova
      setNome("");
      setDescricao("");
      setTipoDisparo("manual");
      setLocalDisponivel([]);
      setPeriodicidade("");
      setDiaSemana("");
      setDiaMes("");
      setDataEspecifica("");
      setHorario("");
      setMetodoDisparo("webhook");
      setWebhookSelecionado("");
      setVariaveisWebhook({});
      setBotSelecionado("");
      setVariaveisCustom([]);
      setFormatoSaida("json");
    }
  }, [open, automationToEdit]);

  const loadWebhooks = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;

      const { data, error } = await supabase
        .from("webhooks")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("active", true);

      if (error) throw error;
      
      // Filtrar webhooks que têm "automacoes" ou "campanha" em usage_locations
      const filteredData = (data || []).filter((webhook: any) => {
        const locations = webhook.usage_locations || [];
        return locations.includes("automacoes") || locations.includes("campanha");
      });
      
      // Parse variables from JSON
      const parsedWebhooks = filteredData.map(webhook => ({
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        method: webhook.method,
        variables: Array.isArray(webhook.variables) 
          ? (webhook.variables as unknown as WebhookVariable[])
          : []
      }));
      
      setWebhooks(parsedWebhooks);
    } catch (error) {
      console.error("Erro ao carregar webhooks:", error);
    }
  };

  const loadBots = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;

      const { data, error } = await supabase
        .from("bot_flows")
        .select("id, name, canais, active")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("active", true);

      if (error) throw error;

      const filtered = (data || []).filter((b: any) =>
        Array.isArray(b.canais) && b.canais.includes("marketing_automation")
      );

      setBots(filtered.map((b: any) => ({ id: b.id, name: b.name })));
    } catch (error) {
      console.error("Erro ao carregar bots:", error);
    }
  };

  const handleCreate = async () => {
    if (!nome.trim()) {
      toast.error("Por favor, informe um nome para a automação");
      return;
    }

    if (metodoDisparo === "webhook" && !webhookSelecionado) {
      toast.error("Por favor, selecione um webhook");
      return;
    }

    if (metodoDisparo === "bot" && !botSelecionado) {
      toast.error("Por favor, selecione um bot");
      return;
    }

    setIsCreating(true);

    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Não foi possível identificar o estabelecimento");
        return;
      }

      // Montar configuração baseado no tipo
      let config: any = {
        tipo_disparo: tipoDisparo,
        metodo_disparo: metodoDisparo,
      };

      if (metodoDisparo === "webhook") {
        config.webhook_id = webhookSelecionado;
        config.variaveis = variaveisWebhook;
      } else {
        config.bot_id = botSelecionado;
      }

      // Variáveis personalizadas (válidas para Bot ou Webhook)
      const customMap: Record<string, string> = {};
      variaveisCustom.forEach((v) => {
        const k = (v.nome || "").trim();
        if (k) customMap[k] = v.valor ?? "";
      });
      config.variaveis_custom = customMap;
      config.formato_saida = formatoSaida;

      if (tipoDisparo === "manual") {
        config.local_disponivel = localDisponivel;
      } else if (tipoDisparo === "data") {
        config.periodicidade = periodicidade;
        config.dia_semana = diaSemana;
        config.dia_mes = diaMes;
        config.data_especifica = dataEspecifica;
        config.horario = horario;
      }

      let savedId: string | null = null;
      let isNew = false;

      if (automationToEdit?.id) {
        const { error } = await supabase
          .from("marketing_automations" as any)
          .update({
            name: nome.trim(),
            description: descricao.trim(),
            config: config,
          })
          .eq("id", automationToEdit.id);

        if (error) throw error;
        savedId = automationToEdit.id;
        toast.success("Automação atualizada com sucesso!");
      } else {
        const { data: inserted, error } = await supabase
          .from("marketing_automations" as any)
          .insert({
            name: nome.trim(),
            description: descricao.trim(),
            config: config,
            active: true,
            estabelecimento_id: estabelecimentoId,
          })
          .select("id")
          .single();

        if (error) throw error;
        savedId = (inserted as any)?.id ?? null;
        isNew = true;
        toast.success("Automação criada com sucesso!");
      }

      // Disparar imediatamente após criação (webhook ou bot vinculado)
      if (isNew && savedId) {
        try {
          const { error: execErr } = await supabase.functions.invoke(
            "marketing-automation-execute",
            { body: { automationId: savedId } },
          );
          if (execErr) {
            toast.error(`Automação criada, mas falha ao disparar: ${execErr.message}`);
          } else {
            toast.success(`Disparo ${metodoDisparo === "bot" ? "do bot" : "do webhook"} iniciado!`);
          }
        } catch (e: any) {
          toast.error(`Falha ao disparar: ${e?.message ?? e}`);
        }
      }

      // Resetar estado e fechar
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar automação:", error);
      toast.error("Erro ao salvar automação");
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setNome("");
    setDescricao("");
    setTipoDisparo("manual");
    setLocalDisponivel([]);
    setPeriodicidade("");
    setDiaSemana("");
    setDiaMes("");
    setDataEspecifica("");
    setHorario("");
    setMetodoDisparo("webhook");
    setWebhookSelecionado("");
    setVariaveisWebhook({});
    setBotSelecionado("");
    setVariaveisCustom([]);
  };

  const selectedWebhook = webhooks.find(w => w.id === webhookSelecionado);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Automação</DialogTitle>
          <DialogDescription>
            Configure uma nova automação de marketing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Automação</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Boas-vindas novos clientes"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição da Automação</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o objetivo desta automação"
              rows={3}
            />
          </div>

          {/* Tipo de Disparo */}
          <div className="space-y-3">
            <Label>Tipo de Disparo</Label>
            <RadioGroup value={tipoDisparo} onValueChange={(value: any) => setTipoDisparo(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="font-normal cursor-pointer">Manual</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="data" id="data" />
                <Label htmlFor="data" className="font-normal cursor-pointer">Por Data</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Condicional: Manual */}
          {tipoDisparo === "manual" && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <Label>Local onde vai ficar disponível</Label>
              <p className="text-xs text-muted-foreground">Selecione um ou mais locais</p>
              <div className="space-y-2">
                {[
                  { value: "chat", label: "Tela de Chat" },
                  { value: "orcamento", label: "Tela de Orçamento" },
                ].map((opt) => {
                  const checked = localDisponivel.includes(opt.value);
                  return (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`local-${opt.value}`}
                        checked={checked}
                        onCheckedChange={(v) => {
                          setLocalDisponivel((prev) =>
                            v ? Array.from(new Set([...prev, opt.value])) : prev.filter((x) => x !== opt.value)
                          );
                        }}
                      />
                      <Label htmlFor={`local-${opt.value}`} className="font-normal cursor-pointer">
                        {opt.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Condicional: Por Data */}
          {tipoDisparo === "data" && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label>Periodicidade</Label>
                <Select value={periodicidade} onValueChange={setPeriodicidade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a periodicidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data_especifica">Data específica</SelectItem>
                    <SelectItem value="diario">Todo dia</SelectItem>
                    <SelectItem value="semanal">1 vez por semana</SelectItem>
                    <SelectItem value="quinzenal">A cada 15 dias</SelectItem>
                    <SelectItem value="mensal">1 vez por mês</SelectItem>
                    <SelectItem value="anual">1 vez por ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {periodicidade === "data_especifica" && (
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={dataEspecifica}
                    onChange={(e) => setDataEspecifica(e.target.value)}
                  />
                </div>
              )}

              {periodicidade === "semanal" && (
                <div className="space-y-2">
                  <Label>Dia da semana</Label>
                  <Select value={diaSemana} onValueChange={setDiaSemana}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Domingo</SelectItem>
                      <SelectItem value="1">Segunda-feira</SelectItem>
                      <SelectItem value="2">Terça-feira</SelectItem>
                      <SelectItem value="3">Quarta-feira</SelectItem>
                      <SelectItem value="4">Quinta-feira</SelectItem>
                      <SelectItem value="5">Sexta-feira</SelectItem>
                      <SelectItem value="6">Sábado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(periodicidade === "mensal" || periodicidade === "quinzenal" || periodicidade === "anual") && (
                <div className="space-y-2">
                  <Label>Dia do mês</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={diaMes}
                    onChange={(e) => setDiaMes(e.target.value)}
                    placeholder="Ex: 15"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Método de Disparo */}
          <div className="space-y-3">
            <Label>Método de Disparo</Label>
            <RadioGroup value={metodoDisparo} onValueChange={(value: any) => setMetodoDisparo(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="webhook" id="metodo-webhook" />
                <Label htmlFor="metodo-webhook" className="font-normal cursor-pointer">Webhook</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bot" id="metodo-bot" />
                <Label htmlFor="metodo-bot" className="font-normal cursor-pointer">Bot</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Seleção de Webhook */}
          {metodoDisparo === "webhook" && (
            <div className="space-y-2">
              <Label>Webhook</Label>
              <Select value={webhookSelecionado} onValueChange={setWebhookSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um webhook" />
                </SelectTrigger>
                <SelectContent>
                  {webhooks.map((webhook) => (
                    <SelectItem key={webhook.id} value={webhook.id}>
                      {webhook.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {webhooks.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum webhook ativo encontrado. Configure webhooks primeiro.
                </p>
              )}
            </div>
          )}

          {/* Seleção de Bot */}
          {metodoDisparo === "bot" && (
            <div className="space-y-2">
              <Label>Bot</Label>
              <Select value={botSelecionado} onValueChange={setBotSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um bot" />
                </SelectTrigger>
                <SelectContent>
                  {bots.map((bot) => (
                    <SelectItem key={bot.id} value={bot.id}>
                      {bot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {bots.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum bot encontrado com Setor de Disparo "Automação de Marketing". Crie um bot com este setor primeiro.
                </p>
              )}
            </div>
          )}

          {/* Variáveis do Webhook */}
          {selectedWebhook && selectedWebhook.variables && selectedWebhook.variables.length > 0 && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <Label className="text-sm font-semibold">Variáveis do Webhook</Label>
              {selectedWebhook.variables.map((variable) => (
                <div key={variable.name} className="space-y-2">
                  <Label htmlFor={`var-${variable.name}`} className="text-sm">
                    {variable.name}
                    {variable.required && <span className="text-destructive ml-1">*</span>}
                    <span className="text-muted-foreground ml-2">({variable.type})</span>
                  </Label>
                  <Input
                    id={`var-${variable.name}`}
                    value={variaveisWebhook[variable.name] || ""}
                    onChange={(e) => setVariaveisWebhook({
                      ...variaveisWebhook,
                      [variable.name]: e.target.value,
                    })}
                    placeholder={`Digite o valor para ${variable.name}`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Variáveis Personalizadas (Bot ou Webhook) */}
          {(metodoDisparo === "bot" || metodoDisparo === "webhook") && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label className="text-sm font-semibold">Variáveis Personalizadas</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Defina variáveis dinâmicas (ex: {"{{nome_cliente}}"}) que poderão ser usadas no {metodoDisparo === "bot" ? "bot" : "webhook"} desta automação.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVariaveisCustom((prev) => [...prev, { nome: "", valor: "" }])}
                >
                  + Adicionar
                </Button>
              </div>

              {variaveisCustom.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhuma variável personalizada definida.</p>
              ) : (
                <div className="space-y-2">
                  {variaveisCustom.map((v, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <Input
                        value={v.nome}
                        onChange={(e) => {
                          const next = [...variaveisCustom];
                          next[idx] = { ...next[idx], nome: e.target.value };
                          setVariaveisCustom(next);
                        }}
                        placeholder="nome_variavel"
                        className="flex-1"
                      />
                      <Input
                        value={v.valor}
                        onChange={(e) => {
                          const next = [...variaveisCustom];
                          next[idx] = { ...next[idx], valor: e.target.value };
                          setVariaveisCustom(next);
                        }}
                        placeholder="valor"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setVariaveisCustom((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-destructive shrink-0"
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview da Requisição */}
          {((metodoDisparo === "webhook" && webhookSelecionado) || (metodoDisparo === "bot" && botSelecionado)) && (() => {
            const customMap: Record<string, string> = {};
            variaveisCustom.forEach((v) => {
              const k = (v.nome || "").trim();
              if (k) customMap[k] = v.valor ?? "";
            });

            if (metodoDisparo === "webhook" && selectedWebhook) {
              const allVars = { ...variaveisWebhook, ...customMap };
              const method = (selectedWebhook.method || "POST").toUpperCase();
              let urlPreview = selectedWebhook.url || "";
              let bodyPreview: string | null = null;

              // 1) Substitui placeholders na própria URL: {{var}}, {var}, :var
              const usedKeys = new Set<string>();
              Object.entries(allVars).forEach(([k, v]) => {
                if (!k) return;
                const val = encodeURIComponent(v ?? "");
                const patterns = [
                  new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g"),
                  new RegExp(`\\{\\s*${k}\\s*\\}`, "g"),
                  new RegExp(`(?<![A-Za-z0-9_]):${k}(?![A-Za-z0-9_])`, "g"),
                ];
                patterns.forEach((re) => {
                  if (re.test(urlPreview)) {
                    urlPreview = urlPreview.replace(re, val);
                    usedKeys.add(k);
                  }
                });
              });

              // 2) Variáveis restantes vão para query string (GET/DELETE) ou body (demais)
              const remaining = Object.entries(allVars).filter(([k]) => k && !usedKeys.has(k));
              if (method === "GET" || method === "DELETE") {
                const qs = remaining
                  .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v || "")}`)
                  .join("&");
                if (qs) urlPreview += (urlPreview.includes("?") ? "&" : "?") + qs;
              } else if (remaining.length > 0) {
                bodyPreview = JSON.stringify(Object.fromEntries(remaining), null, 2);
              }

              const headers: Record<string, string> = {
                "Accept": "application/json",
                "User-Agent": "MarketingAutomation/1.0",
              };
              if (bodyPreview) headers["Content-Type"] = "application/json";
              const headersText = Object.entries(headers)
                .map(([k, v]) => `${k}: ${v}`)
                .join("\n");

              const curlLines = [`curl -X ${method} "${urlPreview}"`];
              Object.entries(headers).forEach(([k, v]) => curlLines.push(`  -H "${k}: ${v}"`));
              if (bodyPreview) curlLines.push(`  -d '${bodyPreview.replace(/'/g, "'\\''")}'`);
              const curlText = curlLines.join(" \\\n");

              return (
                <div className="space-y-3 p-4 bg-muted/40 border rounded-lg">
                  <Label className="text-sm font-semibold">Pré-visualização da requisição HTTP</Label>
                  <p className="text-xs text-muted-foreground">
                    Exemplo completo do que será enviado ao executar esta automação.
                  </p>

                  <div>
                    <p className="text-xs font-semibold mb-1">Request Line</p>
                    <div className="text-xs font-mono bg-background border rounded p-3 break-all">
                      <span className="font-semibold text-primary">{method}</span>{" "}
                      <span>{urlPreview || "(URL não definida)"}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold mb-1">Headers</p>
                    <pre className="text-xs font-mono bg-background border rounded p-3 overflow-x-auto whitespace-pre-wrap">{headersText}</pre>
                  </div>

                  {bodyPreview && (
                    <div>
                      <p className="text-xs font-semibold mb-1">Body (JSON)</p>
                      <pre className="text-xs font-mono bg-background border rounded p-3 overflow-x-auto whitespace-pre-wrap">{bodyPreview}</pre>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold mb-1">cURL equivalente</p>
                    <pre className="text-xs font-mono bg-background border rounded p-3 overflow-x-auto whitespace-pre-wrap">{curlText}</pre>
                  </div>
                </div>
              );
            }

            if (metodoDisparo === "bot") {
              const selBot = bots.find((b) => b.id === botSelecionado);
              const payload = {
                bot_id: botSelecionado,
                bot_name: selBot?.name,
                variaveis: customMap,
              };
              const supaUrl = (import.meta as any)?.env?.VITE_SUPABASE_URL || "https://<projeto>.supabase.co";
              const fullUrl = `${supaUrl}/functions/v1/marketing-automation-execute`;
              const headers: Record<string, string> = {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer <SUPABASE_ANON_KEY>",
              };
              const headersText = Object.entries(headers)
                .map(([k, v]) => `${k}: ${v}`)
                .join("\n");
              const bodyText = JSON.stringify(payload, null, 2);
              const curlText = [
                `curl -X POST "${fullUrl}"`,
                ...Object.entries(headers).map(([k, v]) => `  -H "${k}: ${v}"`),
                `  -d '${bodyText.replace(/'/g, "'\\''")}'`,
              ].join(" \\\n");

              return (
                <div className="space-y-3 p-4 bg-muted/40 border rounded-lg">
                  <Label className="text-sm font-semibold">Pré-visualização da requisição HTTP</Label>
                  <p className="text-xs text-muted-foreground">
                    Exemplo completo do disparo que será enviado ao bot.
                  </p>

                  <div>
                    <p className="text-xs font-semibold mb-1">Request Line</p>
                    <div className="text-xs font-mono bg-background border rounded p-3 break-all">
                      <span className="font-semibold text-primary">POST</span>{" "}
                      <span>{fullUrl}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold mb-1">Headers</p>
                    <pre className="text-xs font-mono bg-background border rounded p-3 overflow-x-auto whitespace-pre-wrap">{headersText}</pre>
                  </div>

                  <div>
                    <p className="text-xs font-semibold mb-1">Body (JSON)</p>
                    <pre className="text-xs font-mono bg-background border rounded p-3 overflow-x-auto whitespace-pre-wrap">{bodyText}</pre>
                  </div>

                  <div>
                    <p className="text-xs font-semibold mb-1">cURL equivalente</p>
                    <pre className="text-xs font-mono bg-background border rounded p-3 overflow-x-auto whitespace-pre-wrap">{curlText}</pre>
                  </div>
                </div>
              );
            }

            return null;
          })()}

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Criando..." : "Criar Automação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
