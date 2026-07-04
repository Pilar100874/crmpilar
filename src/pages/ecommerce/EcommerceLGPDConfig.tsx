import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Shield, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Secao { titulo: string; texto: string; }
interface LgpdConfig {
  titulo: string;
  intro: string;
  encarregado_nome: string;
  encarregado_email: string;
  controlador_nome: string;
  controlador_cnpj: string;
  controlador_endereco: string;
  secoes: Secao[];
}

const DEFAULT_CFG: LgpdConfig = {
  titulo: "Política de Privacidade e Proteção de Dados (LGPD)",
  intro: "Esta política descreve como coletamos, utilizamos, armazenamos e protegemos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).",
  encarregado_nome: "",
  encarregado_email: "",
  controlador_nome: "",
  controlador_cnpj: "",
  controlador_endereco: "",
  secoes: [
    { titulo: "1. Dados que coletamos", texto: "Coletamos dados que você nos fornece diretamente ao se cadastrar, realizar compras ou entrar em contato: nome, CPF/CNPJ, endereço, e-mail, telefone e informações de pagamento. Também coletamos automaticamente dados de navegação (cookies, IP, dispositivo) para melhorar sua experiência." },
    { titulo: "2. Finalidade do tratamento", texto: "Utilizamos seus dados para: processar pedidos e pagamentos; emitir notas fiscais; realizar entregas; oferecer suporte; enviar comunicações sobre pedidos; cumprir obrigações legais e regulatórias; e, com seu consentimento, enviar ofertas e novidades." },
    { titulo: "3. Base legal", texto: "O tratamento é realizado com base em: execução de contrato (compra); cumprimento de obrigação legal; legítimo interesse; e consentimento do titular, quando aplicável (ex.: marketing)." },
    { titulo: "4. Compartilhamento de dados", texto: "Podemos compartilhar seus dados com parceiros essenciais à operação: transportadoras, gateways de pagamento, plataformas de e-mail e órgãos públicos, quando exigido por lei. Não vendemos seus dados a terceiros." },
    { titulo: "5. Armazenamento e segurança", texto: "Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, perda ou alteração, incluindo criptografia, controle de acesso e monitoramento." },
    { titulo: "6. Cookies", texto: "Utilizamos cookies para autenticação, carrinho de compras, análise de uso e personalização. Você pode gerenciar cookies nas configurações do seu navegador." },
    { titulo: "7. Direitos do titular", texto: "Você pode, a qualquer momento: confirmar a existência de tratamento; acessar seus dados; corrigir; solicitar anonimização, bloqueio ou eliminação; portabilidade; revogar consentimento; e obter informações sobre compartilhamento." },
    { titulo: "8. Como exercer seus direitos", texto: "Para exercer seus direitos, entre em contato com nosso Encarregado de Dados (DPO) pelo e-mail informado no topo desta página. Responderemos no prazo legal de até 15 dias." },
    { titulo: "9. Alterações desta política", texto: "Esta política pode ser atualizada. A versão vigente sempre estará disponível nesta página." },
  ],
};

export default function EcommerceLGPDConfig() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);
  const [cfg, setCfg] = useState<LgpdConfig>(DEFAULT_CFG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const estId = localStorage.getItem("estabelecimentoId");
    if (!estId) { setLoading(false); return; }
    const { data } = await supabase.from("ecommerce_config" as any)
      .select("lgpd_enabled, lgpd_config").eq("estabelecimento_id", estId).maybeSingle();
    if (data) {
      setEnabled(!!(data as any).lgpd_enabled);
      const c = (data as any).lgpd_config;
      if (c) setCfg({ ...DEFAULT_CFG, ...c, secoes: c.secoes?.length ? c.secoes : DEFAULT_CFG.secoes });
    }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    const estId = localStorage.getItem("estabelecimentoId");
    if (!estId) { setSaving(false); return; }
    const { error } = await supabase.from("ecommerce_config" as any)
      .update({ lgpd_enabled: enabled, lgpd_config: cfg as any })
      .eq("estabelecimento_id", estId);
    if (error) toast.error(error.message); else toast.success("Configurações LGPD salvas");
    setSaving(false);
  }

  function updateSecao(i: number, patch: Partial<Secao>) {
    setCfg(p => ({ ...p, secoes: p.secoes.map((s, idx) => idx === i ? { ...s, ...patch } : s) }));
  }
  function addSecao() {
    setCfg(p => ({ ...p, secoes: [...p.secoes, { titulo: "Nova seção", texto: "" }] }));
  }
  function delSecao(i: number) {
    setCfg(p => ({ ...p, secoes: p.secoes.filter((_, idx) => idx !== i) }));
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ecommerce-config")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" /> LGPD - Política de Privacidade</h1>
            <p className="text-muted-foreground text-sm">Habilite a página de LGPD no e-commerce e edite os textos</p>
          </div>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2"><Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Habilitar página de LGPD no e-commerce</span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </CardTitle>
          <CardDescription>Quando ativada, a página fica acessível em <code className="text-xs">/ecommerce/lgpd</code></CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Cabeçalho</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Título</Label><Input value={cfg.titulo} onChange={e => setCfg({ ...cfg, titulo: e.target.value })} /></div>
          <div><Label>Introdução</Label><Textarea rows={3} value={cfg.intro} onChange={e => setCfg({ ...cfg, intro: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Controlador dos Dados</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Razão social</Label><Input value={cfg.controlador_nome} onChange={e => setCfg({ ...cfg, controlador_nome: e.target.value })} /></div>
            <div><Label>CNPJ</Label><Input value={cfg.controlador_cnpj} onChange={e => setCfg({ ...cfg, controlador_cnpj: e.target.value })} /></div>
          </div>
          <div><Label>Endereço</Label><Input value={cfg.controlador_endereco} onChange={e => setCfg({ ...cfg, controlador_endereco: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Encarregado de Dados (DPO)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Nome</Label><Input value={cfg.encarregado_nome} onChange={e => setCfg({ ...cfg, encarregado_nome: e.target.value })} /></div>
          <div><Label>E-mail</Label><Input type="email" value={cfg.encarregado_email} onChange={e => setCfg({ ...cfg, encarregado_email: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Seções da Política</CardTitle>
          <Button size="sm" variant="outline" onClick={addSecao}><Plus className="h-4 w-4 mr-1" /> Adicionar seção</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {cfg.secoes.map((s, i) => (
            <div key={i} className="border rounded-xl p-3 space-y-2">
              <div className="flex gap-2">
                <Input value={s.titulo} onChange={e => updateSecao(i, { titulo: e.target.value })} placeholder="Título" />
                <Button size="icon" variant="ghost" onClick={() => delSecao(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
              <Textarea rows={4} value={s.texto} onChange={e => updateSecao(i, { texto: e.target.value })} placeholder="Texto da seção" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
