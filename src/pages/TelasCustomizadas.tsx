import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  Link as LinkIcon,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Copy,
  Users as UsersIcon,
  Move,
  Eye,
  Monitor,
  Smartphone,
  Tablet,

} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface TelaCustomizada {
  id: string;
  estabelecimento_id: string;
  parent_id: string | null;
  nome: string;
  tipo: "grupo" | "atalho";
  rota: string | null;
  icone: string | null;
  cor: string | null;
  ordem: number;
}

// Rotas mais usadas do sistema - o usuário também pode digitar uma rota livre.
export const ROTAS_SUGERIDAS: { label: string; value: string; grupo: string }[] = [
  // Dashboards
  { label: "Painel Principal", value: "/dashboard", grupo: "Dashboards" },
  { label: "Dashboard Atendente", value: "/dashboard-atendente", grupo: "Dashboards" },
  { label: "Dashboard Supervisor", value: "/dashboard-supervisor", grupo: "Dashboards" },
  { label: "Dashboard SLA", value: "/sla-dashboard", grupo: "Dashboards" },
  { label: "Analytics Avançado", value: "/advanced-analytics", grupo: "Dashboards" },
  { label: "Pesquisas de Satisfação (Dashboard)", value: "/dashboard-pesquisas-satisfacao", grupo: "Dashboards" },
  { label: "Quality Assurance", value: "/quality-assurance", grupo: "Dashboards" },

  // Atendimento / Chats
  { label: "Painel de Chats", value: "/atendimento", grupo: "Atendimento & Chats" },
  { label: "Configurações de Atendimento", value: "/atendimento-config", grupo: "Atendimento & Chats" },
  { label: "Monitor de Filas", value: "/monitor-filas", grupo: "Atendimento & Chats" },
  { label: "Monitor de Funcionários", value: "/monitor-funcionarios", grupo: "Atendimento & Chats" },
  { label: "Teste de Roteamento", value: "/test-roteamento", grupo: "Atendimento & Chats" },
  { label: "Agentes de Chat", value: "/agentes-chat", grupo: "Atendimento & Chats" },
  { label: "Chat Interno", value: "/chat-interno", grupo: "Atendimento & Chats" },
  { label: "Webchat", value: "/webchat", grupo: "Atendimento & Chats" },
  { label: "Softphone", value: "/softphone", grupo: "Atendimento & Chats" },
  { label: "Compartilhar Tela", value: "/compartilhar-tela", grupo: "Atendimento & Chats" },
  { label: "Videochamada", value: "/videocall", grupo: "Atendimento & Chats" },

  // Vendas
  { label: "Orçamento", value: "/orcamentos", grupo: "Vendas" },
  { label: "Configuração de Vendas", value: "/vendas-config", grupo: "Vendas" },
  { label: "Automações de Vendas", value: "/automacoes-vendas", grupo: "Vendas" },
  { label: "Programação de Visitas", value: "/vendas/programacao-visitas", grupo: "Vendas" },
  { label: "Acompanhamento de Visitas", value: "/vendas/acompanhamento-visitas", grupo: "Vendas" },
  { label: "Roteirizador de Visitas", value: "/roteirizador-visitas", grupo: "Vendas" },
  { label: "Funil de Leads", value: "/funil", grupo: "Vendas" },
  { label: "Clientes", value: "/contatos", grupo: "Vendas" },
  { label: "Empresas", value: "/empresas", grupo: "Vendas" },
  { label: "Pedidos Recebidos", value: "/pedidos-recebidos", grupo: "Vendas" },
  { label: "Pedido / Tracking", value: "/pedido-tracking", grupo: "Vendas" },

  // Assistente
  { label: "Contagem Inteligente", value: "/contagem", grupo: "Assistente" },
  { label: "Nova Contagem", value: "/contagem/nova", grupo: "Assistente" },

  // Marketing
  { label: "Marketing (Hub)", value: "/marketing", grupo: "Marketing" },
  { label: "Marketing - Canvas", value: "/marketing/canvas", grupo: "Marketing" },
  { label: "Marketing - Campanhas", value: "/marketing/campanhas", grupo: "Marketing" },
  { label: "Marketing - Automações", value: "/marketing/automacoes", grupo: "Marketing" },
  { label: "Auto Video Wizard", value: "/marketing/auto-video-wizard", grupo: "Marketing" },
  { label: "Campanhas (Calendário)", value: "/campanhas", grupo: "Marketing" },
  { label: "Calendário", value: "/calendario", grupo: "Marketing" },
  { label: "E-mail", value: "/email", grupo: "Marketing" },
  { label: "Ads", value: "/ads", grupo: "Marketing" },
  { label: "Ads - Campanhas", value: "/ads/campaigns", grupo: "Marketing" },
  { label: "Ads - Wizard", value: "/ads/wizard", grupo: "Marketing" },

  // Logística
  { label: "Logística", value: "/logistica", grupo: "Logística" },
  { label: "Logística - Veículos", value: "/logistica/veiculos", grupo: "Logística" },
  { label: "Logística - Rotas", value: "/logistica/rotas", grupo: "Logística" },
  { label: "Logística - Roteirização", value: "/logistica/roteirizacao", grupo: "Logística" },
  { label: "Logística - Monitoramento", value: "/logistica/monitoramento", grupo: "Logística" },
  { label: "Logística - Histórico", value: "/logistica/historico", grupo: "Logística" },
  { label: "Logística - Automações", value: "/logistica/automacoes", grupo: "Logística" },

  // Controle de Veículos
  { label: "Controle de Veículos (Dashboard)", value: "/controle-veiculos", grupo: "Controle de Veículos" },
  { label: "Registrar Saída", value: "/controle-veiculos/saida", grupo: "Controle de Veículos" },
  { label: "Registrar Entrada", value: "/controle-veiculos/entrada", grupo: "Controle de Veículos" },
  { label: "Movimentações", value: "/controle-veiculos/movimentacoes", grupo: "Controle de Veículos" },
  { label: "Cadastro de Veículos", value: "/controle-veiculos/veiculos", grupo: "Controle de Veículos" },
  { label: "Câmeras dos Veículos", value: "/controle-veiculos/cameras", grupo: "Controle de Veículos" },
  { label: "Defeitos & Avarias", value: "/controle-veiculos/defeitos", grupo: "Controle de Veículos" },
  { label: "Histórico de Imagens", value: "/controle-veiculos/historico-imagens", grupo: "Controle de Veículos" },
  { label: "Análise de Manutenção", value: "/controle-veiculos/manutencao", grupo: "Controle de Veículos" },

  // Controle de Visitantes
  { label: "Visitantes (Dashboard)", value: "/controle-visitantes", grupo: "Visitantes" },
  { label: "Visitantes Presentes", value: "/controle-visitantes/presentes", grupo: "Visitantes" },
  { label: "Cadastro de Visitantes", value: "/controle-visitantes/visitantes", grupo: "Visitantes" },
  { label: "Contatos de Visitantes", value: "/controle-visitantes/contatos", grupo: "Visitantes" },

  // Câmeras / TV
  { label: "Câmeras - Dashboard", value: "/cameras", grupo: "Câmeras / TV" },
  { label: "TV Câmeras (Mosaico)", value: "/tv/cameras", grupo: "Câmeras / TV" },
  { label: "TV Vendas", value: "/tv/vendas", grupo: "Câmeras / TV" },
  { label: "TV Veículos", value: "/tv/veiculos", grupo: "Câmeras / TV" },

  // Controle de Ponto
  { label: "Ponto - Dashboard RH", value: "/ponto", grupo: "Controle de Ponto" },
  { label: "Ponto - Tratamento", value: "/ponto/tratamento", grupo: "Controle de Ponto" },
  { label: "Ponto - Ajustes", value: "/ponto/ajustes", grupo: "Controle de Ponto" },
  { label: "Ponto - Aprovações", value: "/ponto/aprovacoes", grupo: "Controle de Ponto" },
  { label: "Ponto - Espelho de Ponto", value: "/ponto/espelho", grupo: "Controle de Ponto" },
  { label: "Ponto - Registro via App", value: "/ponto/registro", grupo: "Controle de Ponto" },
  { label: "Ponto - Configurações", value: "/ponto/config", grupo: "Controle de Ponto" },
  { label: "Ponto - Totem", value: "/ponto/totem", grupo: "Controle de Ponto" },

  // E-commerce
  { label: "E-commerce (Loja)", value: "/ecommerce", grupo: "E-commerce" },
  { label: "E-commerce - Configurações", value: "/ecommerce-config", grupo: "E-commerce" },
  { label: "E-commerce - Regras", value: "/ecommerce-rules", grupo: "E-commerce" },
  { label: "E-commerce - Cupons", value: "/ecommerce-config/cupons", grupo: "E-commerce" },
  { label: "E-commerce - Homepage", value: "/ecommerce-config/homepage", grupo: "E-commerce" },
  { label: "E-commerce - Branding", value: "/ecommerce-config/branding" , grupo: "E-commerce" },
  { label: "E-commerce - Mapa de Calor", value: "/ecommerce-config/mapa-calor", grupo: "E-commerce" },
  { label: "E-commerce - LGPD", value: "/ecommerce-config/lgpd", grupo: "E-commerce" },
  { label: "E-commerce - Newsletter", value: "/ecommerce-config/newsletter", grupo: "E-commerce" },
  { label: "E-commerce - Denúncias", value: "/ecommerce-config/denuncias", grupo: "E-commerce" },
  { label: "Marketplaces", value: "/marketplaces", grupo: "E-commerce" },
  { label: "Robô de Preços", value: "/robo-precos", grupo: "E-commerce" },
  { label: "WhatsApp Catálogo", value: "/whatsapp-catalogo", grupo: "E-commerce" },
  { label: "Importação de Produtos", value: "/importacao-produtos", grupo: "E-commerce" },

  // Editores / Relatórios / Listas
  { label: "Editores de Documento", value: "/editores", grupo: "Editores & Relatórios" },
  { label: "Relatórios", value: "/relatorios", grupo: "Editores & Relatórios" },
  { label: "Listas", value: "/listas", grupo: "Editores & Relatórios" },
  { label: "Conteúdos", value: "/conteudos", grupo: "Editores & Relatórios" },
  { label: "Meus Conjuntos", value: "/meus-conjuntos", grupo: "Editores & Relatórios" },
  { label: "Meus Textos Prontos", value: "/meus-textos-prontos", grupo: "Editores & Relatórios" },
  { label: "Meus Anexos", value: "/meus-anexos", grupo: "Editores & Relatórios" },
  { label: "Meus Tickets", value: "/meus-tickets", grupo: "Editores & Relatórios" },
  { label: "Pesquisas de Satisfação", value: "/pesquisas-satisfacao", grupo: "Editores & Relatórios" },

  // Sistema / Admin
  { label: "Configurações", value: "/config", grupo: "Sistema" },
  { label: "Macros", value: "/macros", grupo: "Sistema" },
  { label: "Avisos", value: "/avisos", grupo: "Sistema" },
  { label: "Gerenciar Atalhos", value: "/gerenciar-atalhos", grupo: "Sistema" },
  { label: "Perfil", value: "/perfil", grupo: "Sistema" },
  { label: "Menu", value: "/menu", grupo: "Sistema" },
  { label: "Bot Builder", value: "/bot-builder", grupo: "Sistema" },
  { label: "Omnichannel Builder", value: "/omnichannel-builder", grupo: "Sistema" },
  { label: "Variáveis Globais", value: "/global-variables", grupo: "Sistema" },
  { label: "Admin - Apps", value: "/admin/apps", grupo: "Sistema" },
  { label: "Admin - Tickets", value: "/admin/support-tickets", grupo: "Sistema" },
  { label: "Admin - Telas Customizadas", value: "/admin/telas-customizadas", grupo: "Sistema" },

  // Watch (Smartwatch)
  { label: "Watch - Dashboard", value: "/watch/dashboard", grupo: "Watch" },
  { label: "Watch - Chats", value: "/watch/chats", grupo: "Watch" },
  { label: "Watch - Agenda", value: "/watch/agenda", grupo: "Watch" },
  { label: "Watch - Vendas", value: "/watch/vendas", grupo: "Watch" },
  { label: "Watch - Logística", value: "/watch/logistica", grupo: "Watch" },
];

export default function TelasCustomizadas() {
  const navigate = useNavigate();
  const [items, setItems] = useState<TelaCustomizada[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentParent, setCurrentParent] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<TelaCustomizada[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TelaCustomizada | null>(null);
  const [form, setForm] = useState({
    nome: "",
    tipo: "grupo" as "grupo" | "atalho",
    rota: "",
    rotaLivre: false,
  });

  const [confirmDel, setConfirmDel] = useState<TelaCustomizada | null>(null);

  // Vincular usuários
  const [linkDialogFor, setLinkDialogFor] = useState<TelaCustomizada | null>(null);
  const [usuariosList, setUsuariosList] = useState<{ id: string; nome: string; email: string }[]>([]);
  const [linkedUserIds, setLinkedUserIds] = useState<Set<string>>(new Set());
  const [savingLinks, setSavingLinks] = useState(false);

  const openLinkDialog = async (item: TelaCustomizada) => {
    setLinkDialogFor(item);
    setLinkedUserIds(new Set());
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) return;
      const [{ data: users }, { data: links }] = await Promise.all([
        supabase.from("usuarios").select("id, nome, email").eq("estabelecimento_id", estabId).order("nome"),
        supabase.from("usuario_telas_customizadas").select("usuario_id").eq("tela_id", item.id),
      ]);
      setUsuariosList((users || []) as any);
      setLinkedUserIds(new Set((links || []).map((l: any) => l.usuario_id)));
    } catch (e: any) {
      toast.error("Erro ao carregar usuários: " + e.message);
    }
  };

  const toggleLinkedUser = (uid: string) => {
    setLinkedUserIds((prev) => {
      const n = new Set(prev);
      n.has(uid) ? n.delete(uid) : n.add(uid);
      return n;
    });
  };

  const saveLinks = async () => {
    if (!linkDialogFor) return;
    setSavingLinks(true);
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) throw new Error("Estabelecimento não encontrado");
      // Substitui todos os vínculos desta tela
      const { error: delErr } = await supabase
        .from("usuario_telas_customizadas")
        .delete()
        .eq("tela_id", linkDialogFor.id);
      if (delErr) throw delErr;
      const rows = Array.from(linkedUserIds).map((uid) => ({
        usuario_id: uid,
        tela_id: linkDialogFor.id,
        estabelecimento_id: estabId,
      }));
      if (rows.length > 0) {
        const { error: insErr } = await supabase.from("usuario_telas_customizadas").insert(rows);
        if (insErr) throw insErr;
      }
      toast.success("Vínculos atualizados");
      setLinkDialogFor(null);
    } catch (e: any) {
      toast.error("Erro ao salvar vínculos: " + e.message);
    } finally {
      setSavingLinks(false);
    }
  };

  // Mover item para outro grupo
  const [moveDialogFor, setMoveDialogFor] = useState<TelaCustomizada | null>(null);
  const [simulateFor, setSimulateFor] = useState<TelaCustomizada | null>(null);
  const [simDevice, setSimDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const grupos = useMemo(() => items.filter((i) => i.tipo === "grupo"), [items]);

  const isDescendant = (candidateId: string, ofId: string): boolean => {
    // true se candidateId está dentro (descendente) de ofId
    let cur = items.find((i) => i.id === candidateId);
    while (cur) {
      if (cur.parent_id === ofId) return true;
      cur = items.find((i) => i.id === cur!.parent_id);
    }
    return false;
  };

  const moveItem = async (destParentId: string | null) => {
    if (!moveDialogFor) return;
    try {
      const { error } = await supabase
        .from("telas_customizadas")
        .update({ parent_id: destParentId })
        .eq("id", moveDialogFor.id);
      if (error) throw error;
      toast.success("Movido");
      setMoveDialogFor(null);
      await load();
    } catch (e: any) {
      toast.error("Erro ao mover: " + e.message);
    }
  };


  const load = async () => {
    setLoading(true);
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) return;
      const { data, error } = await supabase
        .from("telas_customizadas")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      setItems((data || []) as TelaCustomizada[]);
    } catch (e: any) {
      toast.error("Erro ao carregar telas: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visibleItems = useMemo(
    () => items.filter((i) => (i.parent_id ?? null) === currentParent),
    [items, currentParent]
  );

  const enterGroup = (item: TelaCustomizada) => {
    setBreadcrumb((prev) => [...prev, item]);
    setCurrentParent(item.id);
  };

  const goBack = () => {
    const nb = breadcrumb.slice(0, -1);
    setBreadcrumb(nb);
    setCurrentParent(nb.length ? nb[nb.length - 1].id : null);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ nome: "", tipo: "grupo", rota: "", rotaLivre: false });
    setDialogOpen(true);
  };

  const openEdit = (item: TelaCustomizada) => {
    setEditing(item);
    const isPreset = ROTAS_SUGERIDAS.some((r) => r.value === item.rota);
    setForm({
      nome: item.nome,
      tipo: item.tipo,
      rota: item.rota || "",
      rotaLivre: !isPreset && !!item.rota,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome");
      return;
    }
    if (form.tipo === "atalho" && !form.rota.trim()) {
      toast.error("Selecione ou informe uma rota");
      return;
    }
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) throw new Error("Estabelecimento não encontrado");

      const payload = {
        estabelecimento_id: estabId,
        parent_id: currentParent,
        nome: form.nome.trim(),
        tipo: form.tipo,
        rota: form.tipo === "atalho" ? form.rota.trim() : null,
        ordem: visibleItems.length,
      };

      if (editing) {
        const { error } = await supabase
          .from("telas_customizadas")
          .update({
            nome: payload.nome,
            tipo: payload.tipo,
            rota: payload.rota,
          })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Atualizado");
      } else {
        const { error } = await supabase
          .from("telas_customizadas")
          .insert(payload);
        if (error) throw error;
        toast.success("Criado");
      }
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    }
  };

  const remove = async () => {
    if (!confirmDel) return;
    try {
      const { error } = await supabase
        .from("telas_customizadas")
        .delete()
        .eq("id", confirmDel.id);
      if (error) throw error;
      toast.success("Removido");
      setConfirmDel(null);
      await load();
    } catch (e: any) {
      toast.error("Erro ao remover: " + e.message);
    }
  };

  const rotasAgrupadas = useMemo(() => {
    const map: Record<string, typeof ROTAS_SUGERIDAS> = {};
    ROTAS_SUGERIDAS.forEach((r) => {
      map[r.grupo] = map[r.grupo] || [];
      map[r.grupo].push(r);
    });
    return map;
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Telas Customizadas</h1>
          <p className="text-sm text-muted-foreground">
            Crie telas com botões de atalho para restringir o que cada usuário
            visualiza (ex: porteiro só vê registrar entrada/saída, câmeras e
            visitantes).
          </p>
        </div>
        <div className="flex gap-2">
          {breadcrumb.length > 0 && (
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
          )}
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Novo
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center flex-wrap gap-1 text-sm text-muted-foreground">
        <button
          className="hover:text-foreground"
          onClick={() => {
            setBreadcrumb([]);
            setCurrentParent(null);
          }}
        >
          Início
        </button>
        {breadcrumb.map((b, i) => (
          <div key={b.id} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            <button
              className="hover:text-foreground"
              onClick={() => {
                const nb = breadcrumb.slice(0, i + 1);
                setBreadcrumb(nb);
                setCurrentParent(b.id);
              }}
            >
              {b.nome}
            </button>
          </div>
        ))}
      </div>

      {/* Preview / list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {currentParent
              ? `Dentro de: ${breadcrumb[breadcrumb.length - 1]?.nome}`
              : "Telas de nível principal"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : visibleItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum item aqui. Clique em <b>Novo</b> para criar.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleItems.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-3 flex items-center gap-3 bg-card hover:bg-accent/40 transition"
                >
                  <div className="flex-shrink-0">
                    {item.tipo === "grupo" ? (
                      <FolderOpen className="w-6 h-6 text-primary" />
                    ) : (
                      <LinkIcon className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.tipo === "grupo"
                        ? "Grupo (contém outros botões)"
                        : item.rota}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {item.tipo === "grupo" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => enterGroup(item)}
                        title="Abrir grupo"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                    {item.parent_id === null && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openLinkDialog(item)}
                          title="Vincular usuários"
                        >
                          <UsersIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSimDevice("desktop");
                            setSimulateFor(item);
                          }}
                          title="Simular visão do usuário"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setMoveDialogFor(item)}
                      title="Mover para outro grupo"
                    >
                      <Move className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(item)}
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setConfirmDel(item)}
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Dialog Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar item" : "Novo item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do botão *</Label>
              <Input
                value={form.nome}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nome: e.target.value }))
                }
                placeholder="Ex: Portaria"
              />
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, tipo: v as "grupo" | "atalho" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grupo">
                    Grupo (contém outros botões dentro)
                  </SelectItem>
                  <SelectItem value="atalho">
                    Atalho (abre uma tela do sistema)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.tipo === "atalho" && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Tela do sistema *</Label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() =>
                        setForm((f) => ({ ...f, rotaLivre: !f.rotaLivre, rota: "" }))
                      }
                    >
                      {form.rotaLivre
                        ? "Escolher da lista"
                        : "Digitar rota manual"}
                    </button>
                  </div>
                  {form.rotaLivre ? (
                    <Input
                      value={form.rota}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, rota: e.target.value }))
                      }
                      placeholder="/exemplo/da/rota"
                    />
                  ) : (
                    <Select
                      value={form.rota}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, rota: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma tela" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {Object.entries(rotasAgrupadas).map(([grupo, rotas]) => (
                          <div key={grupo}>
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                              {grupo}
                            </div>
                            {rotas.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá "{confirmDel?.nome}" e todos os botões dentro dele.
              Ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Simular visão do usuário */}
      <Dialog open={!!simulateFor} onOpenChange={(o) => !o && setSimulateFor(null)}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col gap-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <DialogTitle className="text-base">
                Simulando: {simulateFor?.nome}
              </DialogTitle>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={simDevice === "desktop" ? "default" : "outline"}
                  onClick={() => setSimDevice("desktop")}
                >
                  <Monitor className="w-4 h-4 mr-1" /> Desktop
                </Button>
                <Button
                  size="sm"
                  variant={simDevice === "tablet" ? "default" : "outline"}
                  onClick={() => setSimDevice("tablet")}
                >
                  <Tablet className="w-4 h-4 mr-1" /> Tablet
                </Button>
                <Button
                  size="sm"
                  variant={simDevice === "mobile" ? "default" : "outline"}
                  onClick={() => setSimDevice("mobile")}
                >
                  <Smartphone className="w-4 h-4 mr-1" /> Mobile
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Pré-visualização de como o usuário vinculado enxerga esta tela ao logar (modo solo, sem menu principal).
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/40 flex items-start justify-center p-4">
            {simulateFor && (
              <div
                className="bg-background border rounded-lg shadow-lg overflow-hidden transition-all"
                style={{
                  width:
                    simDevice === "desktop"
                      ? "100%"
                      : simDevice === "tablet"
                      ? 820
                      : 390,
                  height:
                    simDevice === "desktop"
                      ? "100%"
                      : simDevice === "tablet"
                      ? 1100
                      : 780,
                  maxWidth: "100%",
                }}
              >
                <iframe
                  key={`${simulateFor.id}-${simDevice}`}
                  src={`/tela-customizada/${simulateFor.id}?solo=1`}
                  title="Simulação"
                  className="w-full h-full border-0"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Vincular usuários */}
      <Dialog open={!!linkDialogFor} onOpenChange={(o) => !o && setLinkDialogFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular usuários — {linkDialogFor?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            <p className="text-xs text-muted-foreground">
              Ao logar, os usuários vinculados irão direto para esta tela em vez do sistema completo.
            </p>
            {usuariosList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
            ) : (
              usuariosList.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={linkedUserIds.has(u.id)}
                    onCheckedChange={() => toggleLinkedUser(u.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogFor(null)} disabled={savingLinks}>
              Cancelar
            </Button>
            <Button onClick={saveLinks} disabled={savingLinks}>
              {savingLinks ? "Salvando..." : "Salvar vínculos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mover item */}
      <Dialog open={!!moveDialogFor} onOpenChange={(o) => !o && setMoveDialogFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover "{moveDialogFor?.nome}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            <button
              className="w-full text-left p-2 rounded hover:bg-muted border"
              onClick={() => moveItem(null)}
              disabled={moveDialogFor?.parent_id === null}
            >
              <span className="font-medium">📂 Raiz (nível principal)</span>
            </button>
            {grupos
              .filter(
                (g) =>
                  g.id !== moveDialogFor?.id &&
                  !(moveDialogFor && isDescendant(g.id, moveDialogFor.id))
              )
              .map((g) => (
                <button
                  key={g.id}
                  className="w-full text-left p-2 rounded hover:bg-muted border flex items-center gap-2"
                  onClick={() => moveItem(g.id)}
                  disabled={g.id === moveDialogFor?.parent_id}
                >
                  <FolderOpen className="w-4 h-4 text-primary" />
                  <span>{g.nome}</span>
                  {g.id === moveDialogFor?.parent_id && (
                    <span className="ml-auto text-xs text-muted-foreground">(atual)</span>
                  )}
                </button>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogFor(null)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

