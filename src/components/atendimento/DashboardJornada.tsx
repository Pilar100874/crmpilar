import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, startOfYear, subDays } from "date-fns";
import { BarChart3, RefreshCw, X, Phone, Mail, MessageSquare, MapPin, ShoppingCart, TrendingUp, CalendarClock, Download, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { DadosJornada, DiarioJornada, METRICAS_JORNADA, periodoAnterior, serieJornada, totalJornada, valorJornada, variacaoJornada } from "@/lib/atendimento/jornada";
import { PainelAtendimentoHeader } from "./PainelAtendimentoHeader";

export default function DashboardJornada({ equipe = false, onClose }: { equipe?: boolean; onClose?: () => void }) {
  const hoje = format(new Date(), "yyyy-MM-dd");
  const [inicio, setInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [fim, setFim] = useState(hoje);
  const [dados, setDados] = useState<DadosJornada | null>(null);
  const [usuario, setUsuario] = useState("todos");
  const [metrica, setMetrica] = useState("atendimentos");
  const [mensal, setMensal] = useState(false);
  const [aba, setAba] = useState(equipe ? "equipe" : "evolucao");
  const [erro, setErro] = useState(""); const [carregando, setCarregando] = useState(true); const [versao, setVersao] = useState(0);
  const periodoValido = !!inicio && !!fim && inicio <= fim && (new Date(fim).getTime() - new Date(inicio).getTime()) / 86400000 <= 366;
  useEffect(() => {
    let ativo = true;
    if (!inicio || !fim || inicio > fim || (new Date(fim).getTime() - new Date(inicio).getTime()) / 86400000 > 366) { setErro("Escolha um período válido de até um ano."); setCarregando(false); return; }
    setCarregando(true); setErro("");
    Promise.all([
      supabase.rpc("dashboard_jornada_atendimento", { p_inicio: inicio, p_fim: fim, p_equipe: equipe }),
      supabase.rpc("dashboard_resultados_disparo", { p_inicio: inicio, p_fim: fim, p_equipe: equipe }),
    ]).then(([base, massa]) => {
      if (!ativo) return;
      if (base.error || massa.error) { setErro("Não foi possível carregar os registros. Tente atualizar."); setDados(null); }
      else { const d = base.data as unknown as DadosJornada; setDados({ ...d, diarios: [...d.diarios, ...massa.data as unknown as DiarioJornada[]] }); }
      setCarregando(false);
    }).catch(() => { if (ativo) { setErro("Não foi possível carregar os registros."); setCarregando(false); } });
    return () => { ativo = false; };
  }, [inicio, fim, equipe, versao]);
  useEffect(() => { const t = window.setInterval(() => setVersao(v => v + 1), 60000); return () => clearInterval(t); }, []);
  const filtrado = equipe ? usuario : dados?.usuario_id || "todos";
  const diarios = dados?.diarios || [];
  const anterior = periodoValido ? periodoAnterior(inicio, fim) : { inicio: "", fim: "" };
  const total = (m: string, u = filtrado) => totalJornada(diarios, m, inicio, fim, u);
  const variacao = (m: string) => { const v = variacaoJornada(total(m), totalJornada(diarios,m,anterior.inicio,anterior.fim,filtrado)); return v === null ? "Sem base anterior" : `${v > 0 ? "+" : ""}${v.toFixed(1)}% no período`; };
  const pendencias = dados?.pendencias.filter(p => filtrado === "todos" || p.usuario_id === filtrado) || [];
  const serie = useMemo(() => !periodoValido ? [] : serieJornada(diarios,metrica,inicio,fim,filtrado,mensal), [dados,metrica,inicio,fim,filtrado,mensal,periodoValido]);
  const usuarios = dados?.usuarios.filter(u => filtrado === "todos" || u.id === filtrado) || [];
  const resumo = [
    { id:"atendimentos",nome:"Atendimentos finalizados",icon:Activity,tom:"text-primary" },
    { id:"ligacoes_atendidas",nome:"Ligações atendidas",icon:Phone,tom:"text-info" },
    { id:"massa_whatsapp_encaminhado",nome:"WhatsApp em massa encaminhados",icon:MessageSquare,tom:"text-success" },
    { id:"emails_respondidos",nome:"Respostas de e-mail registradas",icon:Mail,tom:"text-info" },
    { id:"atendimento_presencial",nome:"Visitas finalizadas",icon:MapPin,tom:"text-warning" },
    { id:"pedidos_fechados",nome:"Pedidos fechados",icon:ShoppingCart,tom:"text-success" },
    { id:"valor_vendas",nome:"Valor dos pedidos fechados",icon:TrendingUp,tom:"text-success" },
  ];
  const baixar = () => {
    const linhas = [["Usuário","Dia","Indicador","Valor"], ...diarios.filter(d=>d.dia>=inicio && d.dia<=fim && (filtrado==="todos" || d.usuario_id===filtrado)).map(d=>[dados?.usuarios.find(u=>u.id===d.usuario_id)?.nome || "Sem nome",d.dia,METRICAS_JORNADA.find(m=>m.id===d.metrica)?.nome || d.metrica.replace(/_/g," "),String(d.valor)])];
    const csv = linhas.map(l=>l.map(v=>'"'+v.replace(/"/g,'""').replace(/^[=+@-]/,"'")+'"').join(";")).join("\n");
    const url=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"})); const a=document.createElement("a");a.href=url;a.download=`jornada-${inicio}-${fim}.csv`;a.click();URL.revokeObjectURL(url);
  };
  return <div data-tour="dashboard-jornada" className="h-full min-w-0 overflow-y-auto overflow-x-hidden bg-background text-foreground">
    <header className="jornada-cabecalho border-b border-border pb-4">
      <PainelAtendimentoHeader className="jornada-cabecalho" title={equipe ? "Jornada da equipe" : "Minha jornada"} subtitle="Atividades, resultados e evolução" icon={BarChart3} onClose={onClose} closeLabel="Fechar Minha jornada" actions={<><Button variant="ghost" size="icon" title="Atualizar registros" aria-label="Atualizar registros" disabled={carregando} onClick={()=>setVersao(v=>v+1)}><RefreshCw className={carregando?"h-4 w-4 animate-spin":"h-4 w-4"}/></Button><Button variant="ghost" size="icon" title="Exportar registros" aria-label="Exportar registros" onClick={baixar} disabled={!dados}><Download className="h-4 w-4"/></Button></>} />
      <div className="mt-4 flex flex-wrap items-end gap-3"><label className="min-w-0 text-xs text-muted-foreground">De<Input aria-label="Data inicial" type="date" value={inicio} onChange={e=>setInicio(e.target.value)} className="mt-1 w-36"/></label><label className="min-w-0 text-xs text-muted-foreground">Até<Input aria-label="Data final" type="date" value={fim} onChange={e=>setFim(e.target.value)} className="mt-1 w-36"/></label><div className="flex flex-wrap gap-1">{[{nome:"Hoje",data:hoje},{nome:"7 dias",data:format(subDays(new Date(),6),"yyyy-MM-dd")},{nome:"Este mês",data:format(startOfMonth(new Date()),"yyyy-MM-dd")},{nome:"Este ano",data:format(startOfYear(new Date()),"yyyy-MM-dd")}].map(p=><Button key={p.nome} variant="outline" size="sm" onClick={()=>{setInicio(p.data);setFim(hoje)}}>{p.nome}</Button>)}</div>{equipe&&dados?.pode_comparar&&<Select value={usuario} onValueChange={setUsuario}><SelectTrigger className="w-48" aria-label="Usuário do painel"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="todos">Toda a equipe</SelectItem>{dados.usuarios.map(u=><SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent></Select>}</div>
    </header>
    <main className="space-y-6 px-4 py-5 sm:px-6">
      {erro?<div role="alert" className="text-destructive">{erro}</div>:carregando?<p role="status" className="text-muted-foreground">Carregando sua jornada…</p>:dados&&<>
      {equipe&&!dados.pode_comparar&&<p className="text-sm text-muted-foreground">Seu acesso permite acompanhar apenas sua própria jornada.</p>}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{resumo.map(m=><article key={m.id} className="rounded-lg border border-border bg-card p-4 transition-shadow motion-safe:hover:shadow-md"><m.icon className={`mb-3 h-5 w-5 ${m.tom}`}/><p className="text-xs text-muted-foreground">{m.nome}</p><p className="mt-1 break-words text-xl font-bold">{valorJornada(total(m.id),m.id)}</p><p className="mt-2 text-xs text-muted-foreground">{variacao(m.id)}</p></article>)}<article className="rounded-lg border border-border bg-card p-4"><CalendarClock className="mb-3 h-5 w-5 text-destructive"/><p className="text-xs text-muted-foreground">Contatos atrasados agora</p><p className="mt-1 text-xl font-bold">{pendencias.reduce((n,p)=>n+Number(p.atrasados),0)}</p><p className="mt-2 text-xs text-muted-foreground">{pendencias.reduce((n,p)=>n+Number(p.agendados_hoje),0)} agendados para hoje</p></article></div>
      <Tabs value={aba} onValueChange={setAba}><TabsList className="flex h-auto w-fit max-w-full flex-wrap"><TabsTrigger value="evolucao">Evolução</TabsTrigger>{equipe&&dados.pode_comparar&&<TabsTrigger value="equipe">Comparar usuários</TabsTrigger>}<TabsTrigger value="dia">Dia a dia</TabsTrigger><TabsTrigger value="indicadores">Indicadores</TabsTrigger></TabsList>
      <TabsContent value="evolucao" className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Evolução no período</h2><div className="flex max-w-full flex-wrap gap-2"><Select value={metrica} onValueChange={setMetrica}><SelectTrigger aria-label="Indicador da evolução" className="w-64 max-w-full"><SelectValue/></SelectTrigger><SelectContent>{METRICAS_JORNADA.map(m=><SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent></Select><Select value={mensal?"mes":"dia"} onValueChange={v=>setMensal(v==="mes")}><SelectTrigger aria-label="Agrupamento" className="w-28"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="dia">Diário</SelectItem><SelectItem value="mes">Mensal</SelectItem></SelectContent></Select></div></div><ChartContainer className="h-64 w-full" config={{valor:{label:METRICAS_JORNADA.find(m=>m.id===metrica)?.nome,color:"hsl(var(--info))"}}}><BarChart data={serie}><CartesianGrid vertical={false}/><XAxis dataKey="nome" minTickGap={24}/><YAxis width={48}/><ChartTooltip content={<ChartTooltipContent/>}/><Bar dataKey="valor" fill="var(--color-valor)" radius={3}/></BarChart></ChartContainer></TabsContent>
      <TabsContent value="equipe" className="space-y-4"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Comparação por usuário</h2><Select value={metrica} onValueChange={setMetrica}><SelectTrigger aria-label="Indicador da comparação" className="w-64 max-w-full"><SelectValue/></SelectTrigger><SelectContent>{METRICAS_JORNADA.map(m=><SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent></Select></div><div className="divide-y divide-border">{[...usuarios].sort((a,b)=>total(metrica,b.id)-total(metrica,a.id)).map(u=><div key={u.id} className="flex min-w-0 items-center justify-between gap-3 py-3"><span className="min-w-0 break-words font-medium">{u.nome}</span><span className="shrink-0 text-sm font-semibold">{valorJornada(total(metrica,u.id),metrica)}</span></div>)}</div></TabsContent>
      <TabsContent value="dia"><h2 className="mb-3 font-semibold">Atividades por dia</h2><div className="divide-y divide-border">{serieJornada(diarios,"atendimentos",inicio,fim,filtrado).reverse().map(d=><div key={d.data} className="py-3"><h3 className="text-sm font-semibold">{format(new Date(`${d.data}T12:00:00`),"dd/MM/yyyy")}</h3><div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">{METRICAS_JORNADA.filter(m=>totalJornada(diarios,m.id,d.data,d.data,filtrado)>0).map(m=><span key={m.id} className="text-xs text-muted-foreground">{m.nome}: <strong className="text-foreground">{valorJornada(totalJornada(diarios,m.id,d.data,d.data,filtrado),m.id)}</strong></span>)}{!diarios.some(r=>r.dia===d.data&&(filtrado==="todos"||r.usuario_id===filtrado))&&<span className="text-xs text-muted-foreground">Sem atividade registrada</span>}</div></div>)}</div></TabsContent>
      <TabsContent value="indicadores"><div className="divide-y divide-border">{METRICAS_JORNADA.map(m=><div key={m.id} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0 text-sm">{m.nome}</span><strong className="shrink-0 text-sm">{valorJornada(total(m.id),m.id)}</strong></div>)}</div></TabsContent></Tabs>
      <section className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground"><h2 className="mb-2 font-semibold text-foreground">Critérios dos registros</h2><p>Ligações atendidas exigem horário de atendimento salvo. Respostas de e-mail são identificadas pelo assunto Re:/Res:. Visitas finalizadas e presença confirmada são contagens distintas. WhatsApp registrado não comprova entrega; encaminhado em massa significa aceito pela integração. Retornos agendados não são mensagens enviadas.</p><p className="mt-2">Vendas usam o autor e a data do fechamento registrados no histórico. Atividades assumidas pertencem a quem executou, não ao titular da carteira. Pendências representam a situação atual, não o saldo histórico.</p>{!!(dados.sem_autoria.mensagens||dados.sem_autoria.pedidos)&&<p className="mt-2 text-warning">Sem autoria histórica: {dados.sem_autoria.mensagens} mensagens e {dados.sem_autoria.pedidos} pedidos; não entram na comparação individual.</p>}</section>
      </>}
    </main>
  </div>;
}