import {BarChart3, Boxes, ArrowLeftRight, FileInput, ClipboardList, Send, Receipt, FilePlus2, FileText, FilePen, FileX, Ban, Undo2, History, Hash, ClipboardCheck, Download, ShieldCheck, Calculator, Activity, ListChecks, Scale, Server, Wallet, Package, Building2, ShoppingCart, Settings, MoreHorizontal} from 'lucide-react';

/** Shared operational menu catalog; configuration groups use existing screens. */
type SubItemOperacional = {id:string; title:string; url:string; icon:typeof Settings; group?:string};
export const MENUS_OPERACIONAIS: {id:string; title:string; icon:typeof Settings; subItems:SubItemOperacional[]}[] = [
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
    {id:'Mais Faturamento', title:'Mais opções', url:'/configuracoes/mais-faturamento', icon:MoreHorizontal},
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
  'mais-faturamento': {programId:'Mais Faturamento', titulo:'Mais opções de Faturamento', descricao:'Notas canceladas, devoluções, eventos, auditoria, simulador, relatórios e monitor', abas:[
    {id:'canceladas', label:'Canceladas', icon:Ban},
    {id:'devolucoes', label:'Devoluções', icon:Undo2},
    {id:'eventos', label:'Eventos e Inutilização', icon:History},
    {id:'auditoria', label:'Auditoria Systax', icon:ShieldCheck},
    {id:'simulador', label:'Simulador Tributário', icon:Calculator},
    {id:'relatorios', label:'Relatórios', icon:BarChart3},
    {id:'monitor', label:'Monitor e Certificados', icon:Activity},
  ]},
  faturamento: {programId:'Config Faturamento', titulo:'Configurações de Faturamento', descricao:'Gerencie séries, operações fiscais, Systax e o emissor NF-e', abas:[
    {id:'series', label:'Séries e Numeração', icon:Hash},
    {id:'tipos-operacao', label:'Tipos de operação', icon:ListChecks},
    {id:'systax', label:'Configuração Systax', icon:Scale},
    {id:'motor-proprio', label:'Emissor NF-e próprio', icon:Server},
  ]},
};

/** Former per-item configuration programs, now tabs inside each hub. */
export const PROGRAMAS_CONFIG_ANTIGOS = ['Config Estab Condicoes Pagamento','Config Estab Produtos','Config Estab Unidades','Séries e Numeração','Tipos de operação','Configuração Systax','Motor próprio NF-e','Notas Canceladas','Devoluções NF-e','Eventos Fiscais','Auditoria Fiscal','Simulador Tributário','Relatórios Fiscais','Monitor Fiscal'];
