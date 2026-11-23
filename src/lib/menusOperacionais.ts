import {BarChart3, Boxes, ArrowLeftRight, FileInput, ClipboardList, Send, Receipt, FilePlus2, FileText, FilePen, FileX, Ban, Undo2, History, Hash, ClipboardCheck, Download, ShieldCheck, Calculator, Activity, ListChecks, Scale, Server, Wallet, Package, Building2, ShoppingCart, Settings} from 'lucide-react';

/** Shared operational menu catalog; configuration groups use existing screens. */
export const MENUS_OPERACIONAIS = [
  {id:'Compras', title:'Compras', icon:ShoppingCart, subItems:[
    {id:'Necessidade de Compra', title:'Necessidade de Compra', url:'/compras/necessidade', icon:ClipboardList},
    {id:'Cotações de Compra', title:'Cotações', url:'/compras/cotacoes', icon:Send},
    {id:'Config Compras', title:'Configurações', url:'/configuracoes/compras', icon:Settings},
  ]},
  {id:'Estoque', title:'Estoque', icon:Boxes, subItems:[
    {id:'Saldos de Estoque', title:'Saldos', url:'/estoque/saldos', icon:Boxes},
    {id:'Movimentações de Estoque', title:'Movimentações', url:'/estoque/movimentacoes', icon:ArrowLeftRight},
    {id:'Entrada de NF-e', title:'Importar NF-e / XML', url:'/estoque/entrada', icon:FileInput},
    {id:'Painel de Entradas', title:'Painel e Conferência de Entradas', url:'/entradas/painel', icon:ClipboardCheck},
    {id:'Distribuição DF-e', title:'Documentos e Manifestação', url:'/entradas/documentos', icon:Download},
    {id:'Config Estoque', title:'Configurações', url:'/configuracoes/estoque', icon:Settings},
  ]},
  {id:'Módulo Faturamento', title:'Faturamento', icon:Receipt, subItems:[
    {id:'Painel de Faturamento', title:'Painel', url:'/faturamento/painel', icon:BarChart3},
    {id:'Faturamento', title:'Faturar Pedidos', url:'/faturamento', icon:Receipt},
    {id:'Nova NF-e', title:'Nova NF-e', url:'/faturamento/nova', icon:FilePlus2},
    {id:'NF-e Emitidas', title:'NF-e Emitidas', url:'/faturamento/notas/emitidas', icon:FileText},
    {id:'Rascunhos NF-e', title:'Rascunhos', url:'/faturamento/notas/rascunhos', icon:FilePen},
    {id:'Notas Rejeitadas', title:'Rejeitadas', url:'/faturamento/notas/rejeitadas', icon:FileX},
    {id:'Notas Canceladas', title:'Canceladas', url:'/faturamento/notas/canceladas', icon:Ban},
    {id:'Devoluções NF-e', title:'Devoluções', url:'/faturamento/notas/devolucoes', icon:Undo2},
    {id:'Eventos Fiscais', title:'Eventos e Inutilização', url:'/faturamento/eventos', icon:History},
    {id:'Auditoria Fiscal', title:'Auditoria Systax', url:'/fiscal/auditoria', icon:ShieldCheck},
    {id:'Simulador Tributário', title:'Simulador Tributário', url:'/fiscal/simulador', icon:Calculator},
    {id:'Relatórios Fiscais', title:'Relatórios', url:'/fiscal/relatorios', icon:BarChart3},
    {id:'Monitor Fiscal', title:'Monitor e Certificados', url:'/fiscal/monitor', icon:Activity},
    {id:'Config Faturamento', title:'Configurações', url:'/configuracoes/faturamento', icon:Settings},
  ]},
];

/** Configuration hubs (same layout as Configurações de Vendas); tab ids are permission keys. */
export const CONFIGS_OPERACIONAIS: Record<string, {programId:string; titulo:string; descricao:string; abas:{id:string; label:string; icon:typeof Settings}[]}> = {
  compras: {programId:'Config Compras', titulo:'Configurações de Compras', descricao:'Gerencie as condições usadas nas compras', abas:[
    {id:'condicoes', label:'Condições de Pagamento', icon:Wallet},
  ]},
  estoque: {programId:'Config Estoque', titulo:'Configurações de Estoque', descricao:'Gerencie produtos e unidades do estoque', abas:[
    {id:'produtos', label:'Produtos', icon:Package},
    {id:'unidades', label:'Unidades', icon:Building2},
  ]},
  faturamento: {programId:'Config Faturamento', titulo:'Configurações de Faturamento', descricao:'Gerencie séries, operações fiscais, Systax e o emissor NF-e', abas:[
    {id:'series', label:'Séries e Numeração', icon:Hash},
    {id:'tipos-operacao', label:'Tipos de operação', icon:ListChecks},
    {id:'systax', label:'Configuração Systax', icon:Scale},
    {id:'motor-proprio', label:'Emissor NF-e próprio', icon:Server},
  ]},
};

/** Former per-item configuration programs, now tabs inside each hub. */
export const PROGRAMAS_CONFIG_ANTIGOS = ['Config Estab Condicoes Pagamento','Config Estab Produtos','Config Estab Unidades','Séries e Numeração','Tipos de operação','Configuração Systax','Motor próprio NF-e'];
