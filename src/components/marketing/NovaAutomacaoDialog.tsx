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
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { PushBlockConfigEditor } from "@/components/workflows/PushBlockConfig";

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
  const [metodoDisparo, setMetodoDisparo] = useState<"webhook" | "bot" | "push">("webhook");
  const [pushConfig, setPushConfig] = useState<any>({ destinatario_tipo: "todos_contatos", titulo: "", corpo: "" });
  
  // Webhook
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhookSelecionado, setWebhookSelecionado] = useState("");
  const [variaveisWebhook, setVariaveisWebhook] = useState<Record<string, string>>({});

  // Modo de webhook: reutilizar existente ou criar novo aqui mesmo
  const [webhookMode, setWebhookMode] = useState<"existente" | "novo">("existente");
  const [novoWebhookNome, setNovoWebhookNome] = useState("");
  const [novoWebhookUrl, setNovoWebhookUrl] = useState("");
  const [novoWebhookMetodo, setNovoWebhookMetodo] = useState("POST");
  const [novoWebhookVars, setNovoWebhookVars] = useState<WebhookVariable[]>([]);

  // Edição inline de webhook existente
  const [editandoWebhook, setEditandoWebhook] = useState(false);
  const [editWhNome, setEditWhNome] = useState("");
  const [editWhUrl, setEditWhUrl] = useState("");
  const [editWhMetodo, setEditWhMetodo] = useState("POST");
  const [editWhVars, setEditWhVars] = useState<WebhookVariable[]>([]);
  const [salvandoEdicaoWh, setSalvandoEdicaoWh] = useState(false);
  const [excluindoWebhook, setExcluindoWebhook] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [automacoesUsando, setAutomacoesUsando] = useState<Array<{ id: string; name: string }>>([]);
  
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
    if (webhookMode === "novo") {
      // Sincroniza chaves de variaveisWebhook com as definidas no novo webhook
      const initial: Record<string, string> = {};
      novoWebhookVars.forEach((v) => {
        const k = (v.name || "").trim();
        if (k) initial[k] = variaveisWebhook[k] || "";
      });
      setVariaveisWebhook(initial);
      return;
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webhookSelecionado, webhooks, webhookMode, JSON.stringify(novoWebhookVars.map(v => v.name))]);

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
      setPushConfig(cfg.push_config || { destinatario_tipo: "todos_contatos", titulo: "", corpo: "" });
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
      setWebhookMode("existente");
      setNovoWebhookNome("");
      setNovoWebhookUrl("");
      setNovoWebhookMetodo("POST");
      setNovoWebhookVars([]);
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

    if (metodoDisparo === "webhook") {
      if (webhookMode === "existente" && !webhookSelecionado) {
        toast.error("Por favor, selecione um webhook ou crie um novo");
        return;
      }
      if (webhookMode === "novo") {
        if (!novoWebhookNome.trim()) {
          toast.error("Informe o nome do novo webhook");
          return;
        }
        if (!novoWebhookUrl.trim()) {
          toast.error("Informe a URL do novo webhook");
          return;
        }
      }
    }

    if (metodoDisparo === "bot" && !botSelecionado) {
      toast.error("Por favor, selecione um bot");
      return;
    }

    if (metodoDisparo === "push" && !pushConfig?.titulo?.trim()) {
      toast.error("Informe pelo menos o título do push");
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
        let finalWebhookId = webhookSelecionado;

        // Persistir edições inline do webhook existente, se houver
        if (webhookMode === "existente" && editandoWebhook && existingWebhook) {
          if (!editWhNome.trim() || !editWhUrl.trim()) {
            toast.error("Nome e URL do webhook são obrigatórios");
            setIsCreating(false);
            return;
          }
          const cleanEditVars = editWhVars
            .map((v) => ({ ...v, name: (v.name || "").trim() }))
            .filter((v) => v.name);
          const { error: updWhErr } = await supabase
            .from("webhooks")
            .update({
              name: editWhNome.trim(),
              url: editWhUrl.trim(),
              method: editWhMetodo,
              has_variables: cleanEditVars.length > 0,
              variables: cleanEditVars as any,
            })
            .eq("id", existingWebhook.id);
          if (updWhErr) throw updWhErr;
          finalWebhookId = existingWebhook.id;
          setEditandoWebhook(false);
        }

        // Criar novo webhook reutilizável se solicitado
        if (webhookMode === "novo") {
          const cleanVars = novoWebhookVars
            .map((v) => ({ ...v, name: (v.name || "").trim() }))
            .filter((v) => v.name);
          const { data: createdWh, error: whErr } = await supabase
            .from("webhooks")
            .insert({
              estabelecimento_id: estabelecimentoId,
              name: novoWebhookNome.trim(),
              url: novoWebhookUrl.trim(),
              method: novoWebhookMetodo,
              type: "automacoes",
              usage_locations: ["automacoes"],
              has_variables: cleanVars.length > 0,
              variables: cleanVars as any,
              active: true,
            })
            .select("id")
            .single();
          if (whErr) throw whErr;
          finalWebhookId = (createdWh as any).id;
          toast.success("Webhook criado e disponível para reutilização");
        }

        config.webhook_id = finalWebhookId;
        config.variaveis = variaveisWebhook;
      } else if (metodoDisparo === "push") {
        config.push_config = pushConfig;
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
    setFormatoSaida("json");
    setWebhookMode("existente");
    setNovoWebhookNome("");
    setNovoWebhookUrl("");
    setNovoWebhookMetodo("POST");
    setNovoWebhookVars([]);
  };

  const existingWebhook = webhooks.find(w => w.id === webhookSelecionado);

  // Sincroniza estado de edição quando seleciona outro webhook
  useEffect(() => {
    if (existingWebhook) {
      setEditWhNome(existingWebhook.name);
      setEditWhUrl(existingWebhook.url);
      setEditWhMetodo(existingWebhook.method);
      setEditWhVars(Array.isArray(existingWebhook.variables) ? existingWebhook.variables : []);
    }
    setEditandoWebhook(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webhookSelecionado]);

  const handleSalvarEdicaoWebhook = async () => {
    if (!existingWebhook) return;
    if (!editWhNome.trim() || !editWhUrl.trim()) {
      toast.error("Nome e URL do webhook são obrigatórios");
      return;
    }
    setSalvandoEdicaoWh(true);
    try {
      const cleanVars = editWhVars
        .map((v) => ({ ...v, name: (v.name || "").trim() }))
        .filter((v) => v.name);
      const { error } = await supabase
        .from("webhooks")
        .update({
          name: editWhNome.trim(),
          url: editWhUrl.trim(),
          method: editWhMetodo,
          has_variables: cleanVars.length > 0,
          variables: cleanVars as any,
        })
        .eq("id", existingWebhook.id);
      if (error) throw error;
      toast.success("Webhook atualizado");
      setEditandoWebhook(false);
      await loadWebhooks();
    } catch (e: any) {
      toast.error(`Erro ao atualizar webhook: ${e?.message ?? e}`);
    } finally {
      setSalvandoEdicaoWh(false);
    }
  };

  const handleSolicitarExclusaoWebhook = async () => {
    if (!existingWebhook) return;
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;
      const { data, error } = await supabase
        .from("marketing_automations" as any)
        .select("id, name, config")
        .eq("estabelecimento_id", estabelecimentoId);
      if (error) throw error;
      const usando = (data || [])
        .filter((a: any) => {
          const wid = a?.config?.webhook_id;
          if (automationToEdit?.id && a.id === automationToEdit.id) return false;
          return wid === existingWebhook.id;
        })
        .map((a: any) => ({ id: a.id, name: a.name }));
      setAutomacoesUsando(usando);
      setConfirmDeleteOpen(true);
    } catch (e: any) {
      toast.error(`Erro ao verificar uso do webhook: ${e?.message ?? e}`);
    }
  };

  const handleConfirmarExclusaoWebhook = async () => {
    if (!existingWebhook) return;
    setExcluindoWebhook(true);
    try {
      const { error } = await supabase
        .from("webhooks")
        .delete()
        .eq("id", existingWebhook.id);
      if (error) throw error;
      toast.success("Webhook excluído");
      setConfirmDeleteOpen(false);
      setWebhookSelecionado("");
      setEditandoWebhook(false);
      await loadWebhooks();
    } catch (e: any) {
      toast.error(`Erro ao excluir webhook: ${e?.message ?? e}`);
    } finally {
      setExcluindoWebhook(false);
    }
  };

  // Webhook "efetivo": existente selecionado OU rascunho do novo webhook
  const selectedWebhook: Webhook | undefined =
    metodoDisparo === "webhook" && webhookMode === "novo"
      ? {
          id: "__novo__",
          name: novoWebhookNome,
          url: novoWebhookUrl,
          method: novoWebhookMetodo,
          variables: novoWebhookVars.filter(v => (v.name || "").trim()),
        }
      : editandoWebhook && existingWebhook
      ? {
          id: existingWebhook.id,
          name: editWhNome,
          url: editWhUrl,
          method: editWhMetodo,
          variables: editWhVars.filter(v => (v.name || "").trim()),
        }
      : existingWebhook;

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
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="push" id="metodo-push" />
                <Label htmlFor="metodo-push" className="font-normal cursor-pointer">🔔 Push Notification</Label>
              </div>
            </RadioGroup>
          </div>

          {metodoDisparo === "push" && (
            <div className="space-y-3 p-4 bg-muted/30 border rounded-lg">
              <Label className="text-sm font-semibold">Configuração do Push</Label>
              <PushBlockConfigEditor
                value={pushConfig}
                onChange={(patch) => setPushConfig({ ...pushConfig, ...patch })}
                context="marketing"
              />
            </div>
          )}

          {/* Configuração de Webhook (criar novo ou reutilizar) */}
          {metodoDisparo === "webhook" && (
            <div className="space-y-3 p-4 bg-muted/30 border rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-semibold">Configuração do Webhook</Label>
                <RadioGroup
                  value={webhookMode}
                  onValueChange={(v: any) => {
                    setWebhookMode(v);
                    setWebhookSelecionado("");
                  }}
                  className="flex gap-3"
                >
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="existente" id="wh-existente" />
                    <Label htmlFor="wh-existente" className="font-normal cursor-pointer text-sm">Reutilizar existente</Label>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="novo" id="wh-novo" />
                    <Label htmlFor="wh-novo" className="font-normal cursor-pointer text-sm">Criar novo</Label>
                  </div>
                </RadioGroup>
              </div>
              <p className="text-xs text-muted-foreground">
                Webhooks criados aqui ficam salvos e podem ser reutilizados em outras automações.
              </p>

              {webhookMode === "existente" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Select value={webhookSelecionado} onValueChange={setWebhookSelecionado}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione um webhook salvo" />
                      </SelectTrigger>
                      <SelectContent>
                        {webhooks.map((webhook) => (
                          <SelectItem key={webhook.id} value={webhook.id}>
                            {webhook.name} <span className="text-muted-foreground ml-1">({webhook.method})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {existingWebhook && !editandoWebhook && (
                      <>
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditandoWebhook(true)}>
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleSolicitarExclusaoWebhook()}
                          disabled={excluindoWebhook}
                        >
                          Excluir
                        </Button>
                      </>
                    )}
                  </div>
                  {webhooks.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Nenhum webhook salvo ainda. Use "Criar novo" para começar.
                    </p>
                  )}

                  {existingWebhook && editandoWebhook && (
                    <div className="space-y-3 mt-3 p-3 border rounded-md bg-background">
                      <div className="grid grid-cols-[1fr,120px] gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Nome</Label>
                          <Input value={editWhNome} onChange={(e) => setEditWhNome(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Método</Label>
                          <Select value={editWhMetodo} onValueChange={setEditWhMetodo}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">URL</Label>
                        <Input value={editWhUrl} onChange={(e) => setEditWhUrl(e.target.value)} />
                      </div>
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">Variáveis do Webhook</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditWhVars((prev) => [...prev, { name: "", type: "string", required: false }])}
                          >
                            + Adicionar
                          </Button>
                        </div>
                        {editWhVars.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Nenhuma variável definida.</p>
                        ) : (
                          editWhVars.map((v, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <Input
                                value={v.name}
                                onChange={(e) => {
                                  const next = [...editWhVars];
                                  next[idx] = { ...next[idx], name: e.target.value };
                                  setEditWhVars(next);
                                }}
                                placeholder="nome_variavel"
                                className="flex-1"
                              />
                              <Select
                                value={v.type}
                                onValueChange={(t) => {
                                  const next = [...editWhVars];
                                  next[idx] = { ...next[idx], type: t };
                                  setEditWhVars(next);
                                }}
                              >
                                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="string">string</SelectItem>
                                  <SelectItem value="number">number</SelectItem>
                                  <SelectItem value="boolean">boolean</SelectItem>
                                </SelectContent>
                              </Select>
                              <label className="flex items-center gap-1.5 text-xs">
                                <Checkbox
                                  checked={v.required}
                                  onCheckedChange={(c) => {
                                    const next = [...editWhVars];
                                    next[idx] = { ...next[idx], required: !!c };
                                    setEditWhVars(next);
                                  }}
                                />
                                obrig.
                              </label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditWhVars((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-destructive shrink-0"
                              >
                                X
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditandoWebhook(false)} disabled={salvandoEdicaoWh}>
                          Cancelar
                        </Button>
                        <Button type="button" size="sm" onClick={handleSalvarEdicaoWebhook} disabled={salvandoEdicaoWh}>
                          {salvandoEdicaoWh ? "Salvando..." : "Salvar alterações"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {webhookMode === "novo" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-[1fr,120px] gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome do Webhook</Label>
                      <Input
                        value={novoWebhookNome}
                        onChange={(e) => setNovoWebhookNome(e.target.value)}
                        placeholder="Ex: Notificar CRM"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Método</Label>
                      <Select value={novoWebhookMetodo} onValueChange={setNovoWebhookMetodo}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">URL</Label>
                    <Input
                      value={novoWebhookUrl}
                      onChange={(e) => setNovoWebhookUrl(e.target.value)}
                      placeholder="https://exemplo.com/webhook/{{id}}"
                    />
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Variáveis do Webhook</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNovoWebhookVars((prev) => [...prev, { name: "", type: "string", required: false }])}
                      >
                        + Adicionar
                      </Button>
                    </div>
                    {novoWebhookVars.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Nenhuma variável definida.</p>
                    ) : (
                      novoWebhookVars.map((v, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <Input
                            value={v.name}
                            onChange={(e) => {
                              const next = [...novoWebhookVars];
                              next[idx] = { ...next[idx], name: e.target.value };
                              setNovoWebhookVars(next);
                            }}
                            placeholder="nome_variavel"
                            className="flex-1"
                          />
                          <Select
                            value={v.type}
                            onValueChange={(t) => {
                              const next = [...novoWebhookVars];
                              next[idx] = { ...next[idx], type: t };
                              setNovoWebhookVars(next);
                            }}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="string">string</SelectItem>
                              <SelectItem value="number">number</SelectItem>
                              <SelectItem value="boolean">boolean</SelectItem>
                            </SelectContent>
                          </Select>
                          <label className="flex items-center gap-1.5 text-xs">
                            <Checkbox
                              checked={v.required}
                              onCheckedChange={(c) => {
                                const next = [...novoWebhookVars];
                                next[idx] = { ...next[idx], required: !!c };
                                setNovoWebhookVars(next);
                              }}
                            />
                            obrig.
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setNovoWebhookVars((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-destructive shrink-0"
                          >
                            X
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
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
          {metodoDisparo === "webhook" && selectedWebhook && selectedWebhook.variables && selectedWebhook.variables.length > 0 && (
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

          {/* Variáveis Personalizadas (somente Bot) */}
          {metodoDisparo === "bot" && (
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
      <DeleteConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        onConfirm={handleConfirmarExclusaoWebhook}
        isLoading={excluindoWebhook}
        title="Excluir Webhook"
        itemName={existingWebhook?.name}
        description={
          automacoesUsando.length > 0
            ? `Atenção: este webhook está sendo usado em ${automacoesUsando.length} outra(s) automação(ões): ${automacoesUsando.map(a => a.name).join(", ")}. Se excluir, essas automações deixarão de funcionar. Deseja realmente excluir "${existingWebhook?.name}"?`
            : `Tem certeza que deseja excluir o webhook "${existingWebhook?.name}"? Esta ação não pode ser desfeita.`
        }
      />
    </Dialog>
  );
}
