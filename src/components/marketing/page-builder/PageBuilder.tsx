import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Globe, GripVertical, Plus, Trash2, Eye, Code, Image, Video, Type, Play,
  ChevronDown, ChevronUp, Settings, Palette, Layout, Bot, ArrowDown,
  Sparkles, FileText, Monitor, Smartphone, Tablet, Copy, Save, Loader2,
  Columns, Square, AlignLeft, Link, ExternalLink, Upload, FolderOpen,
  Wand2, LayoutTemplate, ImagePlus, Package, GalleryHorizontalEnd,
  MoreVertical, Pencil, FolderInput, Zap, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TEMPLATE_CATEGORIES, ALL_THEMES, getThemeById } from './pageTemplates';
import { FULL_TEMPLATE_CATEGORIES, ALL_FULL_TEMPLATES, FullTemplate } from './fullTemplates';
import { TemplateMiniPreview } from './TemplateMiniPreview';
import { AgentTextBank } from './AgentTextBank';
import {
  DndContext, closestCenter, DragEndEvent, DragStartEvent, DragOverlay,
  useSensor, useSensors, PointerSensor, useDroppable, useDraggable
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Types ──────────────────────────────────────────────────────────────────────
interface PageSection {
  id: string;
  type: 'hero' | 'text' | 'image' | 'video' | 'gallery' | 'cta' | 'features' | 'testimonials' | 'faq' | 'footer' | 'custom_html' | 'spacer' | 'social_proof' | 'guarantee' | 'objections' | 'pricing' | 'process_steps';
  title: string;
  content: Record<string, any>;
  visible: boolean;
  styles: Record<string, string>;
}

interface PageConfig {
  title: string; description: string; favicon: string;
  primaryColor: string; secondaryColor: string; accentColor: string;
  backgroundColor: string; textColor: string;
  fontDisplay: string; fontBody: string; maxWidth: string;
}

interface SavedPage {
  id: string; nome: string; slug: string; sections: any; config: any;
  publicado: boolean; created_at: string; updated_at: string;
}

interface MediaAsset {
  id: string; nome: string; tipo: string; public_url: string; thumbnail_url?: string;
}

// ── Section Templates ──────────────────────────────────────────────────────────
const SECTION_TEMPLATES: { type: PageSection['type']; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'hero', label: 'Hero', icon: <Layout className="h-4 w-4" />, description: 'Título, subtítulo e CTA' },
  { type: 'text', label: 'Texto', icon: <Type className="h-4 w-4" />, description: 'Bloco de texto' },
  { type: 'image', label: 'Imagem', icon: <Image className="h-4 w-4" />, description: 'Imagem com legenda' },
  { type: 'video', label: 'Vídeo', icon: <Video className="h-4 w-4" />, description: 'Player de vídeo' },
  { type: 'features', label: 'Recursos', icon: <Columns className="h-4 w-4" />, description: 'Grade de recursos' },
  { type: 'testimonials', label: 'Depoimentos', icon: <FileText className="h-4 w-4" />, description: 'Depoimentos de clientes' },
  { type: 'social_proof', label: 'Prova Social', icon: <FileText className="h-4 w-4" />, description: 'Números e métricas' },
  { type: 'guarantee', label: 'Garantia', icon: <Square className="h-4 w-4" />, description: 'Seção de garantia' },
  { type: 'objections', label: 'Objeções', icon: <AlignLeft className="h-4 w-4" />, description: 'Quebra de objeções' },
  { type: 'pricing', label: 'Preços', icon: <FileText className="h-4 w-4" />, description: 'Tabela de preços' },
  { type: 'process_steps', label: 'Processo', icon: <Columns className="h-4 w-4" />, description: 'Etapas do processo' },
  { type: 'cta', label: 'CTA', icon: <Square className="h-4 w-4" />, description: 'Call-to-action' },
  { type: 'faq', label: 'FAQ', icon: <AlignLeft className="h-4 w-4" />, description: 'Perguntas frequentes' },
  { type: 'gallery', label: 'Galeria', icon: <Image className="h-4 w-4" />, description: 'Grid de imagens' },
  { type: 'footer', label: 'Rodapé', icon: <Layout className="h-4 w-4" />, description: 'Rodapé do site' },
  { type: 'spacer', label: 'Espaçador', icon: <ArrowDown className="h-4 w-4" />, description: 'Espaço vertical' },
  { type: 'custom_html', label: 'HTML', icon: <Code className="h-4 w-4" />, description: 'Código personalizado' },
];

const defaultContent: Record<PageSection['type'], Record<string, any>> = {
  hero: { headline: 'Título Principal', subheadline: 'Subtítulo descritivo do seu negócio', cta_text: 'Começar Agora', cta_url: '#', cta_type: 'url', whatsapp_number: '', background_image: '' },
  text: { body: 'Seu texto aqui...', alignment: 'left' },
  image: { url: '', alt: '', caption: '', fit: 'cover' },
  video: { url: '', poster: '', autoplay: false },
  features: { items: [{ icon: '🚀', title: 'Recurso 1', description: 'Descrição' }, { icon: '⚡', title: 'Recurso 2', description: 'Descrição' }, { icon: '🎯', title: 'Recurso 3', description: 'Descrição' }] },
  testimonials: { items: [{ name: 'Cliente', role: 'Cargo', text: 'Depoimento...', avatar: '' }] },
  social_proof: { items: [{ number: '1000+', label: 'Clientes Atendidos' }, { number: '98%', label: 'Satisfação' }, { number: '5+', label: 'Anos no Mercado' }] },
  guarantee: { title: 'Garantia Total', description: 'Oferecemos garantia incondicional de 30 dias. Se não ficar satisfeito, devolvemos seu dinheiro.', icon: '🛡️', duration: '30 dias' },
  objections: { title: 'Tire Suas Dúvidas', items: [{ objection: 'É caro demais', response: 'Nosso produto se paga em menos de 30 dias.' }, { objection: 'Não sei se funciona', response: 'Temos centenas de cases de sucesso comprovados.' }] },
  pricing: { title: 'Planos e Preços', items: [{ name: 'Básico', price: 'R$ 97/mês', features: ['Recurso 1', 'Recurso 2'], highlighted: false }, { name: 'Profissional', price: 'R$ 197/mês', features: ['Tudo do Básico', 'Recurso 3', 'Recurso 4'], highlighted: true }] },
  process_steps: { title: 'Como Funciona', items: [{ step: '1', title: 'Cadastre-se', description: 'Crie sua conta em segundos' }, { step: '2', title: 'Configure', description: 'Personalize conforme suas necessidades' }, { step: '3', title: 'Resultados', description: 'Comece a ver resultados imediatos' }] },
  cta: { headline: 'Pronto para começar?', description: 'Não perca essa oportunidade', button_text: 'Fale Conosco', button_url: '#', style: 'primary' },
  faq: { items: [{ question: 'Pergunta?', answer: 'Resposta.' }] },
  gallery: { images: [] },
  footer: { company: 'Sua Empresa', links: [{ label: 'Contato', url: '#' }], copyright: `© ${new Date().getFullYear()}` },
  spacer: { height: '60' },
  custom_html: { code: '<div>Seu HTML aqui</div>' },
};

// ── PAGE TEMPLATES ─────────────────────────────────────────────────────────────
interface PageTemplate {
  id: string; name: string; description: string; icon: React.ReactNode;
  thumbnail: string; sections: PageSection[]; config: Partial<PageConfig>;
}

const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'landing-startup', name: 'Landing Startup', description: 'Hero + Features + Depoimentos + FAQ + CTA',
    icon: <Layout className="h-5 w-5" />, thumbnail: '🚀',
    config: { primaryColor: '#4f46e5', accentColor: '#06b6d4', fontDisplay: 'Inter' },
    sections: [
      { id: 't-hero', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Transforme sua ideia em realidade', subheadline: 'Plataforma completa para escalar seu negócio digital com inteligência e velocidade.', cta_text: 'Teste Grátis', cta_url: '#', background_image: '' } },
      { id: 't-feat', type: 'features', title: 'Recursos', visible: true, styles: {}, content: { items: [{ icon: '⚡', title: 'Ultra Rápido', description: 'Performance otimizada para carregar em menos de 1 segundo.' }, { icon: '🔒', title: 'Seguro', description: 'Dados protegidos com criptografia de ponta.' }, { icon: '📊', title: 'Analytics', description: 'Dashboards em tempo real.' }, { icon: '🤖', title: 'IA Integrada', description: 'Automações inteligentes.' }, { icon: '🌐', title: 'Global', description: 'Infra em 50+ países.' }, { icon: '💬', title: 'Suporte 24/7', description: 'Especialistas a qualquer momento.' }] } },
      { id: 't-test', type: 'testimonials', title: 'Depoimentos', visible: true, styles: {}, content: { items: [{ name: 'Maria Silva', role: 'CEO, TechCorp', text: 'Aumentamos vendas em 300% nos primeiros 3 meses.' }, { name: 'João Santos', role: 'Fundador, StartupX', text: 'A melhor decisão para nosso negócio.' }] } },
      { id: 't-faq', type: 'faq', title: 'FAQ', visible: true, styles: {}, content: { items: [{ question: 'Como funciona o período de teste?', answer: '14 dias grátis sem cartão de crédito.' }, { question: 'Posso cancelar a qualquer momento?', answer: 'Sim, sem taxa de cancelamento.' }] } },
      { id: 't-cta', type: 'cta', title: 'CTA Final', visible: true, styles: {}, content: { headline: 'Comece agora mesmo', description: 'Junte-se a mais de 10.000 empresas.', button_text: 'Criar Conta Grátis', button_url: '#' } },
      { id: 't-footer', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Sua Startup', copyright: `© ${new Date().getFullYear()}` } },
    ]
  },
  {
    id: 'product-launch', name: 'Lançamento de Produto', description: 'Hero + Imagem + Features + Vídeo + CTA',
    icon: <Package className="h-5 w-5" />, thumbnail: '🎯',
    config: { primaryColor: '#dc2626', accentColor: '#f59e0b', fontDisplay: 'Inter' },
    sections: [
      { id: 't-hero', type: 'hero', title: 'Hero Produto', visible: true, styles: {}, content: { headline: 'Apresentamos o Produto Revolucionário', subheadline: 'A solução que você estava esperando finalmente chegou.', cta_text: 'Comprar Agora', cta_url: '#', background_image: '' } },
      { id: 't-img', type: 'image', title: 'Foto do Produto', visible: true, styles: {}, content: { url: '', alt: 'Imagem do Produto', caption: 'Design premiado e tecnologia de ponta', fit: 'contain' } },
      { id: 't-feat', type: 'features', title: 'Diferenciais', visible: true, styles: {}, content: { items: [{ icon: '✨', title: 'Design Premium', description: 'Acabamento sofisticado.' }, { icon: '🔋', title: 'Bateria Durável', description: 'Até 48h de uso contínuo.' }, { icon: '🎨', title: '5 Cores', description: 'Combine com seu estilo.' }] } },
      { id: 't-vid', type: 'video', title: 'Vídeo Demonstração', visible: true, styles: {}, content: { url: '', poster: '', autoplay: false } },
      { id: 't-test', type: 'testimonials', title: 'Avaliações', visible: true, styles: {}, content: { items: [{ name: 'Ana Costa', role: 'Influenciadora', text: 'Superou todas as minhas expectativas.' }, { name: 'Pedro Lima', role: 'Tech Reviewer', text: 'Melhor custo-benefício do mercado!' }] } },
      { id: 't-cta', type: 'cta', title: 'Compre Agora', visible: true, styles: {}, content: { headline: 'Oferta de Lançamento', description: '30% de desconto exclusivo!', button_text: 'Aproveitar Desconto', button_url: '#' } },
      { id: 't-footer', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Sua Marca', copyright: `© ${new Date().getFullYear()}` } },
    ]
  },
  {
    id: 'sales-page', name: 'Página de Vendas', description: 'Hero + Prova Social + Objeções + Garantia + Preço + CTA',
    icon: <Zap className="h-5 w-5" />, thumbnail: '💰',
    config: { primaryColor: '#059669', accentColor: '#f59e0b', fontDisplay: 'Inter', backgroundColor: '#f0fdf4', textColor: '#064e3b' },
    sections: [
      { id: 't-hero', type: 'hero', title: 'Hero de Vendas', visible: true, styles: {}, content: { headline: 'Descubra Como Triplicar Seus Resultados em 30 Dias', subheadline: 'O método comprovado por mais de 5.000 profissionais que transforma a forma como você trabalha.', cta_text: 'Quero Começar Agora', cta_url: '#', background_image: '' } },
      { id: 't-sp', type: 'social_proof', title: 'Prova Social', visible: true, styles: {}, content: { items: [{ number: '5.000+', label: 'Clientes Ativos' }, { number: '97%', label: 'Satisfação' }, { number: '3x', label: 'Mais Resultados' }, { number: '24h', label: 'Suporte' }] } },
      { id: 't-vid', type: 'video', title: 'Vídeo de Vendas', visible: true, styles: {}, content: { url: '', poster: '', autoplay: false } },
      { id: 't-feat', type: 'features', title: 'O Que Você Recebe', visible: true, styles: {}, content: { items: [{ icon: '📚', title: 'Módulo Completo', description: 'Acesso vitalício a todo conteúdo.' }, { icon: '🎯', title: 'Exercícios Práticos', description: 'Aplique imediatamente no seu negócio.' }, { icon: '👥', title: 'Comunidade VIP', description: 'Grupo exclusivo de alunos.' }] } },
      { id: 't-obj', type: 'objections', title: 'Objeções', visible: true, styles: {}, content: { title: 'Você Pode Estar Pensando...', items: [{ objection: 'É caro demais para mim', response: 'O investimento se paga em menos de 15 dias com os resultados que você vai alcançar.' }, { objection: 'Não tenho tempo', response: 'São apenas 15 minutos por dia. Menos que o tempo de um café.' }, { objection: 'Não sei se funciona pra mim', response: 'Temos alunos de todas as áreas com resultados comprovados.' }] } },
      { id: 't-test', type: 'testimonials', title: 'Depoimentos', visible: true, styles: {}, content: { items: [{ name: 'Carlos M.', role: 'Empresário', text: 'Faturei R$ 50.000 a mais no primeiro mês aplicando o método.', metrics: '+R$ 50.000/mês' }, { name: 'Fernanda S.', role: 'Freelancer', text: 'Saí de 3 para 15 clientes em 60 dias.', metrics: '5x mais clientes' }] } },
      { id: 't-guar', type: 'guarantee', title: 'Garantia', visible: true, styles: {}, content: { icon: '🛡️', title: 'Garantia Incondicional de 30 Dias', description: 'Se em 30 dias você não estiver 100% satisfeito, devolvemos cada centavo. Sem perguntas.', duration: '30 dias de garantia' } },
      { id: 't-price', type: 'pricing', title: 'Preços', visible: true, styles: {}, content: { title: 'Escolha Seu Plano', items: [{ name: 'Essencial', price: 'R$ 197', features: ['Acesso ao curso', 'Suporte por email', 'Certificado'], highlighted: false }, { name: 'Profissional', price: 'R$ 397', features: ['Tudo do Essencial', 'Mentoria em grupo', 'Comunidade VIP', 'Bônus exclusivos'], highlighted: true }, { name: 'Premium', price: 'R$ 997', features: ['Tudo do Profissional', 'Mentoria individual', 'Acesso vitalício', 'Consultoria 1:1'], highlighted: false }] } },
      { id: 't-cta', type: 'cta', title: 'CTA Final', visible: true, styles: {}, content: { headline: 'Não Perca Essa Oportunidade', description: 'Vagas limitadas. Garanta a sua agora!', button_text: 'Quero Garantir Minha Vaga', button_url: '#' } },
      { id: 't-footer', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Sua Empresa', copyright: `© ${new Date().getFullYear()} — Todos os direitos reservados` } },
    ]
  },
  {
    id: 'course-webinar', name: 'Curso / Webinar', description: 'Hero + Passos + Conteúdo + Preços + Garantia',
    icon: <Layout className="h-5 w-5" />, thumbnail: '🎓',
    config: { primaryColor: '#7c3aed', accentColor: '#f59e0b', fontDisplay: 'Inter', backgroundColor: '#faf5ff', textColor: '#1e1b4b' },
    sections: [
      { id: 't-hero', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Domine [Habilidade] em 7 Dias', subheadline: 'Webinar gratuito onde você vai aprender o passo a passo completo.', cta_text: 'Inscrever-se Grátis', cta_url: '#', background_image: '' } },
      { id: 't-steps', type: 'process_steps', title: 'O Que Você Vai Aprender', visible: true, styles: {}, content: { title: 'Sua Jornada de Aprendizado', items: [{ step: '1', title: 'Fundamentos', description: 'Entenda os conceitos essenciais.' }, { step: '2', title: 'Prática Guiada', description: 'Exercícios passo a passo.' }, { step: '3', title: 'Projeto Real', description: 'Aplique em um caso real.' }, { step: '4', title: 'Certificação', description: 'Receba seu certificado.' }] } },
      { id: 't-text', type: 'text', title: 'Para Quem É', visible: true, styles: {}, content: { body: '✅ Iniciantes que querem aprender do zero\n✅ Profissionais que buscam atualização\n✅ Empreendedores que querem aplicar no negócio\n✅ Qualquer pessoa que deseja resultados reais', alignment: 'left' } },
      { id: 't-test', type: 'testimonials', title: 'Alunos', visible: true, styles: {}, content: { items: [{ name: 'Lucas R.', role: 'Aluno Turma 12', text: 'O melhor curso que já fiz. Conteúdo prático e direto ao ponto.', metrics: 'Nota 9.8/10' }, { name: 'Amanda T.', role: 'Aluna Turma 8', text: 'Consegui meu primeiro emprego na área 2 semanas após terminar.' }] } },
      { id: 't-price', type: 'pricing', title: 'Investimento', visible: true, styles: {}, content: { title: 'Escolha Seu Acesso', items: [{ name: 'Básico', price: 'R$ 147', features: ['Acesso ao curso', '6 meses de acesso', 'Certificado'], highlighted: false }, { name: 'Completo', price: 'R$ 297', features: ['Acesso vitalício', 'Comunidade', 'Mentorias semanais', 'Material extra'], highlighted: true }] } },
      { id: 't-guar', type: 'guarantee', title: 'Garantia', visible: true, styles: {}, content: { icon: '🛡️', title: 'Garantia de 7 Dias', description: 'Teste sem risco. Se não gostar, devolvemos seu dinheiro.', duration: '7 dias' } },
      { id: 't-faq', type: 'faq', title: 'Dúvidas', visible: true, styles: {}, content: { items: [{ question: 'Preciso de conhecimento prévio?', answer: 'Não! O curso foi feito para iniciantes.' }, { question: 'Por quanto tempo tenho acesso?', answer: 'Depende do plano escolhido. O Completo é vitalício.' }] } },
      { id: 't-cta', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Comece Hoje Sua Transformação', description: 'Não adie mais seus sonhos.', button_text: 'Matricular-se Agora', button_url: '#' } },
      { id: 't-footer', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Sua Escola', copyright: `© ${new Date().getFullYear()}` } },
    ]
  },
  {
    id: 'portfolio', name: 'Portfólio Profissional', description: 'Hero + Sobre + Galeria + Serviços + Contato',
    icon: <GalleryHorizontalEnd className="h-5 w-5" />, thumbnail: '🎨',
    config: { primaryColor: '#1e293b', accentColor: '#8b5cf6', backgroundColor: '#0f172a', textColor: '#e2e8f0', fontDisplay: 'Playfair Display' },
    sections: [
      { id: 't-hero', type: 'hero', title: 'Apresentação', visible: true, styles: {}, content: { headline: 'Olá, eu sou [Seu Nome]', subheadline: 'Designer & Desenvolvedor criando experiências digitais memoráveis.', cta_text: 'Ver Projetos', cta_url: '#', background_image: '' } },
      { id: 't-text', type: 'text', title: 'Sobre Mim', visible: true, styles: {}, content: { body: 'Com mais de 10 anos de experiência, trabalho com marcas que buscam se destacar no mercado digital. Minha abordagem combina criatividade, estratégia e tecnologia.', alignment: 'center' } },
      { id: 't-gallery', type: 'gallery', title: 'Projetos', visible: true, styles: {}, content: { images: [] } },
      { id: 't-feat', type: 'features', title: 'Serviços', visible: true, styles: {}, content: { items: [{ icon: '🎨', title: 'Design UI/UX', description: 'Interfaces intuitivas e bonitas' }, { icon: '💻', title: 'Desenvolvimento Web', description: 'Sites rápidos e responsivos' }, { icon: '📱', title: 'Apps Mobile', description: 'Aplicativos nativos e híbridos' }] } },
      { id: 't-cta', type: 'cta', title: 'Contato', visible: true, styles: {}, content: { headline: 'Vamos trabalhar juntos?', description: 'Estou disponível para novos projetos.', button_text: 'Enviar Mensagem', button_url: '#' } },
      { id: 't-footer', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: '[Seu Nome]', copyright: `© ${new Date().getFullYear()}` } },
    ]
  },
  {
    id: 'restaurant', name: 'Restaurante / Food', description: 'Hero + História + Galeria + Features + CTA',
    icon: <Layout className="h-5 w-5" />, thumbnail: '🍽️',
    config: { primaryColor: '#92400e', accentColor: '#d97706', backgroundColor: '#fffbeb', textColor: '#451a03', fontDisplay: 'Georgia' },
    sections: [
      { id: 't-hero', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Sabor Autêntico', subheadline: 'Uma experiência gastronômica única com ingredientes frescos.', cta_text: 'Reservar Mesa', cta_url: '#', background_image: '' } },
      { id: 't-text', type: 'text', title: 'Nossa História', visible: true, styles: {}, content: { body: 'Fundado em 2010, nosso restaurante combina tradição e inovação para oferecer pratos que encantam todos os sentidos.', alignment: 'center' } },
      { id: 't-gallery', type: 'gallery', title: 'Nossos Pratos', visible: true, styles: {}, content: { images: [] } },
      { id: 't-feat', type: 'features', title: 'Por que nos escolher', visible: true, styles: {}, content: { items: [{ icon: '🌿', title: 'Ingredientes Frescos', description: 'Direto dos produtores locais' }, { icon: '👨‍🍳', title: 'Chef Premiado', description: 'Reconhecido internacionalmente' }, { icon: '🍷', title: 'Carta de Vinhos', description: 'Seleção exclusiva' }] } },
      { id: 't-test', type: 'testimonials', title: 'Avaliações', visible: true, styles: {}, content: { items: [{ name: 'Carla M.', role: 'Google Reviews ⭐⭐⭐⭐⭐', text: 'Melhor restaurante da cidade!' }] } },
      { id: 't-cta', type: 'cta', title: 'Reserva', visible: true, styles: {}, content: { headline: 'Faça sua Reserva', description: 'Garanta sua mesa.', button_text: 'Reservar Agora', button_url: '#' } },
      { id: 't-footer', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Restaurante Sabor', copyright: `© ${new Date().getFullYear()}` } },
    ]
  },
  {
    id: 'service-business', name: 'Prestação de Serviço', description: 'Hero + Serviços + Metodologia + Depoimentos + FAQ',
    icon: <FileText className="h-5 w-5" />, thumbnail: '💼',
    config: { primaryColor: '#0369a1', accentColor: '#0ea5e9', fontDisplay: 'Inter' },
    sections: [
      { id: 't-hero', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Soluções que Geram Resultados', subheadline: 'Consultoria especializada para transformar desafios em oportunidades.', cta_text: 'Agendar Consultoria', cta_url: '#', background_image: '' } },
      { id: 't-feat', type: 'features', title: 'Nossos Serviços', visible: true, styles: {}, content: { items: [{ icon: '📈', title: 'Estratégia Digital', description: 'Campanhas de alto impacto.' }, { icon: '🎯', title: 'Performance', description: 'Otimização contínua de ROI.' }, { icon: '💡', title: 'Consultoria', description: 'Análise profunda com recomendações.' }, { icon: '🤝', title: 'Mentoria', description: 'Acompanhamento personalizado.' }] } },
      { id: 't-steps', type: 'process_steps', title: 'Como Trabalhamos', visible: true, styles: {}, content: { title: 'Nossa Metodologia', items: [{ step: '1', title: 'Diagnóstico', description: 'Analisamos seu cenário atual.' }, { step: '2', title: 'Estratégia', description: 'Plano de ação personalizado.' }, { step: '3', title: 'Execução', description: 'Implementação com agilidade.' }, { step: '4', title: 'Resultados', description: 'Mensuramos e otimizamos.' }] } },
      { id: 't-test', type: 'testimonials', title: 'Clientes', visible: true, styles: {}, content: { items: [{ name: 'Roberto F.', role: 'Diretor, Empresa XYZ', text: 'Triplicamos nosso faturamento em 6 meses.' }, { name: 'Lucia A.', role: 'Fundadora, Startup ABC', text: 'A consultoria foi transformadora.' }] } },
      { id: 't-faq', type: 'faq', title: 'FAQ', visible: true, styles: {}, content: { items: [{ question: 'Quanto tempo para resultados?', answer: 'Primeiros indicadores em 30-60 dias.' }, { question: 'Qual investimento mínimo?', answer: 'Entre em contato para orçamento personalizado.' }] } },
      { id: 't-cta', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Pronto para crescer?', description: 'Agende uma sessão de diagnóstico.', button_text: 'Falar com Especialista', button_url: '#' } },
      { id: 't-footer', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Sua Consultoria', copyright: `© ${new Date().getFullYear()}` } },
    ]
  },
  {
    id: 'event-launch', name: 'Evento / Lançamento', description: 'Hero + Prova Social + Passos + Vídeo + FAQ + CTA',
    icon: <Zap className="h-5 w-5" />, thumbnail: '🎪',
    config: { primaryColor: '#fbbf24', accentColor: '#f97316', backgroundColor: '#0a0a0a', textColor: '#fefce8', fontDisplay: 'Inter' },
    sections: [
      { id: 't-hero', type: 'hero', title: 'Hero Evento', visible: true, styles: {}, content: { headline: '[Nome do Evento] 2025', subheadline: 'O maior evento de [nicho] do Brasil. 3 dias de imersão total.', cta_text: 'Garantir Ingresso', cta_url: '#', background_image: '' } },
      { id: 't-sp', type: 'social_proof', title: 'Números', visible: true, styles: {}, content: { items: [{ number: '3.000+', label: 'Participantes' }, { number: '50+', label: 'Palestrantes' }, { number: '3 dias', label: 'Imersão' }, { number: '98%', label: 'Aprovação' }] } },
      { id: 't-vid', type: 'video', title: 'Aftermovie', visible: true, styles: {}, content: { url: '', poster: '', autoplay: false } },
      { id: 't-steps', type: 'process_steps', title: 'Programação', visible: true, styles: {}, content: { title: 'O Que Vai Acontecer', items: [{ step: 'Dia 1', title: 'Fundamentos', description: 'Palestras e workshops introdutórios.' }, { step: 'Dia 2', title: 'Aprofundamento', description: 'Painéis e masterclasses.' }, { step: 'Dia 3', title: 'Networking', description: 'Conexões e festa de encerramento.' }] } },
      { id: 't-feat', type: 'features', title: 'O Que Inclui', visible: true, styles: {}, content: { items: [{ icon: '🎤', title: 'Palestras', description: 'Conteúdo exclusivo.' }, { icon: '🍽️', title: 'Alimentação', description: 'Coffee break e almoço inclusos.' }, { icon: '📋', title: 'Material', description: 'Kit do participante.' }] } },
      { id: 't-price', type: 'pricing', title: 'Ingressos', visible: true, styles: {}, content: { title: 'Escolha Seu Ingresso', items: [{ name: 'Standard', price: 'R$ 497', features: ['Acesso geral', 'Coffee break', 'Certificado'], highlighted: false }, { name: 'VIP', price: 'R$ 997', features: ['Área VIP', 'Almoço incluso', 'Meet & Greet', 'Gravações'], highlighted: true }] } },
      { id: 't-faq', type: 'faq', title: 'Dúvidas', visible: true, styles: {}, content: { items: [{ question: 'Onde será o evento?', answer: 'Local será divulgado em breve.' }, { question: 'Tem estacionamento?', answer: 'Sim, estacionamento gratuito.' }] } },
      { id: 't-cta', type: 'cta', title: 'CTA Final', visible: true, styles: {}, content: { headline: 'Vagas Limitadas!', description: 'Os ingressos estão se esgotando.', button_text: 'Comprar Ingresso', button_url: '#' } },
      { id: 't-footer', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: '[Nome do Evento]', copyright: `© ${new Date().getFullYear()}` } },
    ]
  },
  {
    id: 'clinic-health', name: 'Clínica / Saúde', description: 'Hero + Serviços + Equipe + Depoimentos + Contato',
    icon: <Layout className="h-5 w-5" />, thumbnail: '🏥',
    config: { primaryColor: '#0284c7', accentColor: '#38bdf8', backgroundColor: '#f0f9ff', textColor: '#0c4a6e', fontDisplay: 'Inter' },
    sections: [
      { id: 't-hero', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Cuidando da Sua Saúde com Excelência', subheadline: 'Profissionais qualificados e tecnologia de ponta para o seu bem-estar.', cta_text: 'Agendar Consulta', cta_url: '#', background_image: '' } },
      { id: 't-feat', type: 'features', title: 'Especialidades', visible: true, styles: {}, content: { items: [{ icon: '🦷', title: 'Odontologia', description: 'Tratamentos completos.' }, { icon: '👁️', title: 'Oftalmologia', description: 'Exames e cirurgias.' }, { icon: '🩺', title: 'Clínica Geral', description: 'Check-up e prevenção.' }, { icon: '💪', title: 'Fisioterapia', description: 'Reabilitação e esportes.' }] } },
      { id: 't-text', type: 'text', title: 'Nossa Clínica', visible: true, styles: {}, content: { body: 'Com mais de 15 anos de atuação, nossa clínica reúne os melhores profissionais da região. Infraestrutura moderna, equipamentos de última geração e atendimento humanizado.', alignment: 'center' } },
      { id: 't-sp', type: 'social_proof', title: 'Números', visible: true, styles: {}, content: { items: [{ number: '15+', label: 'Anos de Experiência' }, { number: '50.000+', label: 'Pacientes Atendidos' }, { number: '20+', label: 'Especialistas' }, { number: '4.9⭐', label: 'Google Reviews' }] } },
      { id: 't-test', type: 'testimonials', title: 'Pacientes', visible: true, styles: {}, content: { items: [{ name: 'Marcos A.', role: 'Paciente', text: 'Atendimento excelente e profissionais muito competentes.' }, { name: 'Juliana F.', role: 'Paciente', text: 'Ambiente acolhedor. Me senti em boas mãos.' }] } },
      { id: 't-steps', type: 'process_steps', title: 'Como Agendar', visible: true, styles: {}, content: { title: 'Simples e Rápido', items: [{ step: '1', title: 'Escolha', description: 'Selecione a especialidade.' }, { step: '2', title: 'Agende', description: 'Escolha data e horário.' }, { step: '3', title: 'Consulte', description: 'Compareça à sua consulta.' }] } },
      { id: 't-cta', type: 'cta', title: 'Agendar', visible: true, styles: {}, content: { headline: 'Agende Sua Consulta Hoje', description: 'Atendimento rápido e sem fila.', button_text: 'Agendar pelo WhatsApp', button_url: '#' } },
      { id: 't-footer', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Clínica Saúde & Vida', copyright: `© ${new Date().getFullYear()} — CRM XXXXX` } },
    ]
  },
  {
    id: 'blank', name: 'Página em Branco', description: 'Comece do zero com total liberdade criativa',
    icon: <Plus className="h-5 w-5" />, thumbnail: '📄',
    config: {},
    sections: []
  },
];

// ── Draggable Asset Item ───────────────────────────────────────────────────────
const DraggableAsset: React.FC<{
  asset: MediaAsset;
  onDrop: (asset: MediaAsset) => void;
}> = ({ asset, onDrop }) => {
  const isVideo = asset.tipo === 'video';
  return (
    <button
      onClick={() => onDrop(asset)}
      className="relative aspect-video rounded-md overflow-hidden border hover:ring-2 hover:ring-primary transition-all group cursor-grab active:cursor-grabbing"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify(asset));
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      {isVideo ? (
        <div className="flex items-center justify-center h-full bg-muted">
          <Video className="h-5 w-5 text-muted-foreground" />
        </div>
      ) : (
        <img src={asset.thumbnail_url || asset.public_url} alt={asset.nome} className="w-full h-full object-cover" />
      )}
      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
        {asset.nome}
      </div>
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Badge variant="secondary" className="text-[9px] h-4">{isVideo ? 'Vídeo' : 'Imagem'}</Badge>
      </div>
    </button>
  );
};

// ── Assets Panel ───────────────────────────────────────────────────────────────
const AssetsPanel: React.FC<{ onDropAsset: (asset: MediaAsset) => void }> = ({ onDropAsset }) => {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');

  useEffect(() => {
    (async () => {
      const estabId = localStorage.getItem('estabelecimentoId');
      if (!estabId) { setLoading(false); return; }
      const { data } = await supabase
        .from('media_gallery')
        .select('id, nome, tipo, public_url, thumbnail_url')
        .eq('estabelecimento_id', estabId)
        .order('created_at', { ascending: false })
        .limit(80);
      setItems((data || []) as MediaAsset[]);
      setLoading(false);
    })();
  }, []);

  const filtered = items.filter(i => {
    if (filter === 'all') return true;
    if (filter === 'video') return i.tipo === 'video';
    return ['imagem', 'image', 'gif'].includes(i.tipo);
  });

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {(['all', 'image', 'video'] as const).map(f => (
          <Button key={f} variant={filter === f ? 'secondary' : 'ghost'} size="sm" className="h-6 text-[10px] flex-1" onClick={() => setFilter(f)}>
            {f === 'all' ? 'Todos' : f === 'image' ? '🖼️ Imagens' : '🎬 Vídeos'}
          </Button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground italic">Clique ou arraste para o preview para criar uma seção</p>
      <div className="grid grid-cols-2 gap-1.5 max-h-[calc(100%-80px)] overflow-y-auto">
        {filtered.map(asset => (
          <DraggableAsset key={asset.id} asset={asset} onDrop={onDropAsset} />
        ))}
      </div>
      {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Nenhuma mídia encontrada</p>}
    </div>
  );
};

// ── Sortable Section Item ──────────────────────────────────────────────────────
const SortableSectionItem: React.FC<{
  section: PageSection; isSelected: boolean;
  onSelect: () => void; onDelete: () => void; onToggleVisible: () => void;
}> = ({ section, isSelected, onSelect, onDelete, onToggleVisible }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const tpl = SECTION_TEMPLATES.find(t => t.type === section.type);

  return (
    <div ref={setNodeRef} style={style}
      className={cn("flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors border",
        isSelected ? "bg-primary/10 border-primary" : "bg-card border-transparent hover:bg-muted/50"
      )} onClick={onSelect}>
      <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground"><GripVertical className="h-4 w-4" /></div>
      <span className="text-sm">{tpl?.icon}</span>
      <span className={cn("flex-1 text-sm truncate", !section.visible && "line-through text-muted-foreground")}>{section.title}</span>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}>
        <Eye className={cn("h-3 w-3", !section.visible && "opacity-30")} />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

// ── Media Picker Dialog ────────────────────────────────────────────────────────
const MediaPicker: React.FC<{ onSelect: (url: string) => void; type?: 'image' | 'video' }> = ({ onSelect, type = 'image' }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const estabId = localStorage.getItem('estabelecimentoId');
      if (!estabId) return;
      const tipoFilter = type === 'video' ? ['video'] : ['imagem', 'image', 'gif'];
      const { data } = await supabase
        .from('media_gallery')
        .select('id, nome, tipo, public_url, thumbnail_url, created_at')
        .eq('estabelecimento_id', estabId)
        .in('tipo', tipoFilter)
        .order('created_at', { ascending: false })
        .limit(50);
      setItems(data || []);
      setLoading(false);
    })();
  }, [type]);

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
      {items.map((item) => (
        <button key={item.id} onClick={() => onSelect(item.public_url)}
          className="relative aspect-video rounded-md overflow-hidden border hover:ring-2 hover:ring-primary transition-all group">
          {type === 'video' ? (
            item.thumbnail_url ? (
              <div className="relative w-full h-full">
                <img src={item.thumbnail_url} alt={item.nome} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="h-4 w-4 text-foreground ml-0.5" />
                  </div>
                </div>
              </div>
            ) : (
              <video src={item.public_url} className="w-full h-full object-cover" muted preload="metadata"
                onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 1; }} />
            )
          ) : (
            <img src={item.thumbnail_url || item.public_url} alt={item.nome} className="w-full h-full object-cover" />
          )}
          <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">{item.nome}</div>
        </button>
      ))}
      {items.length === 0 && <p className="col-span-3 text-center text-sm text-muted-foreground py-4">Nenhuma mídia encontrada</p>}
    </div>
  );
};

// ── Strategy Text Picker ───────────────────────────────────────────────────────
const StrategyTextPicker: React.FC<{ onSelect: (text: string) => void }> = ({ onSelect }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [memory, setMemory] = useState<Record<string, any>>({});
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAgent, setActiveAgent] = useState<string>('all');
  const [sourceTab, setSourceTab] = useState<'memory' | 'artifacts'>('memory');

  useEffect(() => {
    (async () => {
      const estabId = localStorage.getItem('estabelecimentoId');
      if (!estabId) return;
      const { data: projs } = await supabase.from('strategy_projects').select('id, nome, strategic_memory').eq('estabelecimento_id', estabId).order('updated_at', { ascending: false }).limit(10);
      const projectList = projs || [];
      setProjects(projectList);
      if (projectList.length > 0) {
        const projectIds = projectList.map((p: any) => p.id);
        const { data: arts } = await supabase.from('strategy_artifacts').select('id, tipo, conteudo, created_at, project_id').in('project_id', projectIds).order('created_at', { ascending: false }).limit(50);
        setArtifacts(arts || []);
      }
      if (projectList[0]) { setSelectedProject(projectList[0].id); setMemory((projectList[0].strategic_memory as Record<string, any>) || {}); }
      setLoading(false);
    })();
  }, []);

  const handleProjectChange = (id: string) => { setSelectedProject(id); const p = projects.find(p => p.id === id); setMemory((p?.strategic_memory as Record<string, any>) || {}); };

  const extractTexts = (obj: any, prefix = ''): { path: string; text: string }[] => {
    const results: { path: string; text: string }[] = [];
    if (!obj) return results;
    for (const [key, val] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof val === 'string' && val.length > 10 && val.length < 2000) results.push({ path, text: val });
      else if (Array.isArray(val)) val.forEach((item, i) => {
        if (typeof item === 'string' && item.length > 5) results.push({ path: `${path}[${i}]`, text: item });
        else if (typeof item === 'object') results.push(...extractTexts(item, `${path}[${i}]`));
      });
      else if (typeof val === 'object' && val !== null) results.push(...extractTexts(val, path));
    }
    return results;
  };

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  const agentKeys = Object.keys(memory);
  const filteredKeys = activeAgent === 'all' ? agentKeys : agentKeys.filter(k => k === activeAgent);
  const projectArtifacts = artifacts.filter(a => a.project_id === selectedProject);

  return (
    <div className="space-y-3">
      {projects.length > 1 && (
        <Select value={selectedProject || ''} onValueChange={handleProjectChange}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Selecione projeto" /></SelectTrigger>
          <SelectContent className="bg-popover">{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
        </Select>
      )}
      <Tabs value={sourceTab} onValueChange={(v) => setSourceTab(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="memory" className="flex-1 text-xs">Memória Estratégica</TabsTrigger>
          <TabsTrigger value="artifacts" className="flex-1 text-xs">Artefatos</TabsTrigger>
        </TabsList>
        <TabsContent value="memory" className="mt-2">
          {agentKeys.length > 1 && (
            <div className="flex flex-wrap gap-1 mb-2">
              <Badge variant={activeAgent === 'all' ? 'default' : 'outline'} className="cursor-pointer text-[10px]" onClick={() => setActiveAgent('all')}>Todos</Badge>
              {agentKeys.map(k => <Badge key={k} variant={activeAgent === k ? 'default' : 'outline'} className="cursor-pointer text-[10px]" onClick={() => setActiveAgent(k)}>{k}</Badge>)}
            </div>
          )}
          <ScrollArea className="h-[260px]">
            {filteredKeys.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado estratégico disponível.</p>}
            {filteredKeys.map(agentKey => {
              const texts = extractTexts(memory[agentKey]);
              if (texts.length === 0) return null;
              return (
                <div key={agentKey} className="mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{agentKey}</p>
                  {texts.slice(0, 12).map((t, i) => (
                    <button key={i} onClick={() => onSelect(t.text)} className="block w-full text-left text-xs p-2 rounded hover:bg-muted/50 transition-colors border-b border-border/30">
                      <span className="text-muted-foreground">{t.path}: </span>
                      <span className="text-foreground">{t.text.slice(0, 120)}{t.text.length > 120 ? '...' : ''}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </ScrollArea>
        </TabsContent>
        <TabsContent value="artifacts" className="mt-2">
          <ScrollArea className="h-[280px]">
            {projectArtifacts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum artefato encontrado.</p>}
            {projectArtifacts.map(art => {
              const texts = extractTexts(art.conteudo as any);
              if (texts.length === 0) return null;
              return (
                <div key={art.id} className="mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{art.tipo}</p>
                  {texts.slice(0, 10).map((t, i) => (
                    <button key={i} onClick={() => onSelect(t.text)} className="block w-full text-left text-xs p-2 rounded hover:bg-muted/50 transition-colors border-b border-border/30">
                      <span className="text-muted-foreground">{t.path}: </span>
                      <span className="text-foreground">{t.text.slice(0, 120)}{t.text.length > 120 ? '...' : ''}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ── Site Builder Agent Viewer ─────────────────────────────────────────────────
const SiteBuilderAgentViewer: React.FC<{ onImportSections?: (sections: PageSection[], config?: Partial<PageConfig>) => void }> = ({ onImportSections }) => {
  const [result, setResult] = useState<any>(null);
  const [htmlCompleto, setHtmlCompleto] = useState<string | null>(null);
  const [artifactHtmlList, setArtifactHtmlList] = useState<{ id: string; html: string; projectName: string; date: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [previewingHtml, setPreviewingHtml] = useState<string>('');

  useEffect(() => {
    (async () => {
      const estabId = localStorage.getItem('estabelecimentoId');
      if (!estabId) { setLoading(false); return; }

      // Fetch from strategic memory
      const { data } = await supabase.from('strategy_projects').select('id, nome, strategic_memory, updated_at').eq('estabelecimento_id', estabId).order('updated_at', { ascending: false }).limit(5);
      const projects = data || [];

      let memoryResult: any = null;
      let foundHtml: string | null = null;
      for (const p of projects) {
        const mem = (p.strategic_memory as Record<string, any>) || {};
        if (mem.site_builder) {
          memoryResult = mem.site_builder;
          if (typeof mem.site_builder.html_completo === 'string' && mem.site_builder.html_completo.length > 50) {
            foundHtml = mem.site_builder.html_completo;
          }
          break;
        }
      }
      setResult(memoryResult);
      setHtmlCompleto(foundHtml);

      // Fetch from artifacts (tipo = 'site_builder')
      if (projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        const { data: arts } = await supabase.from('strategy_artifacts').select('id, tipo, conteudo, created_at, project_id').in('project_id', projectIds).eq('tipo', 'site_builder').order('created_at', { ascending: false }).limit(10);
        const htmlItems: typeof artifactHtmlList = [];
        for (const art of (arts || [])) {
          const c = art.conteudo as any;
          if (!c) continue;
          let html = '';
          if (typeof c === 'string') html = c;
          else if (typeof c.html_completo === 'string') html = c.html_completo;
          else if (typeof c.html === 'string') html = c.html;
          if (html.length > 50) {
            const proj = projects.find(p => p.id === art.project_id);
            htmlItems.push({ id: art.id, html, projectName: proj?.nome || 'Projeto', date: art.created_at });
          }
        }
        setArtifactHtmlList(htmlItems);
      }

      setLoading(false);
    })();
  }, []);

  const handleImportHtml = (html: string) => {
    if (!onImportSections) return;
    setImporting(true);
    const section: PageSection = {
      id: `html-import-${Date.now()}`,
      type: 'custom_html',
      title: 'Site Builder (HTML Completo)',
      visible: true,
      styles: {},
      content: { code: html },
    };
    onImportSections([section]);
    toast.success('HTML completo importado como seção!');
    setImporting(false);
  };

  const handleImportSections = () => {
    if (!result || !onImportSections) return;
    setImporting(true);
    try {
      const imported: PageSection[] = [];
      const r = result;
      if (r.headline || r.titulo || r.hero_headline) imported.push({ id: `hero-imp-${Date.now()}`, type: 'hero', title: 'Hero (Importado)', visible: true, styles: {}, content: { headline: r.hero_headline || r.headline || r.titulo || '', subheadline: r.hero_subheadline || r.subheadline || r.subtitulo || r.descricao || '', cta_text: r.cta_text || r.hero_cta || 'Saiba Mais', cta_url: r.cta_url || '#', background_image: r.hero_image || '' } });
      if (r.features || r.recursos || r.beneficios) { const items = r.features || r.recursos || r.beneficios; if (Array.isArray(items) && items.length > 0) imported.push({ id: `feat-imp-${Date.now()}`, type: 'features', title: 'Recursos (Importado)', visible: true, styles: {}, content: { items: items.slice(0, 6).map((f: any) => ({ icon: f.icon || f.icone || '✨', title: f.title || f.titulo || f.name || f.nome || '', description: f.description || f.descricao || '' })) } }); }
      if (r.faq || r.perguntas_frequentes) { const items = r.faq || r.perguntas_frequentes; if (Array.isArray(items) && items.length > 0) imported.push({ id: `faq-imp-${Date.now()}`, type: 'faq', title: 'FAQ (Importado)', visible: true, styles: {}, content: { items: items.map((q: any) => ({ question: q.question || q.pergunta || '', answer: q.answer || q.resposta || '' })) } }); }
      const configHints: Partial<PageConfig> = {};
      if (r.title || r.titulo_pagina) configHints.title = r.title || r.titulo_pagina;
      if (imported.length > 0) { onImportSections(imported, configHints); toast.success(`${imported.length} seções importadas!`); }
      else toast.info('Output do Site Builder sem seções estruturadas reconhecíveis.');
    } catch { toast.error('Erro ao importar'); }
    setImporting(false);
  };

  const handlePreviewHtml = (html: string) => {
    setPreviewingHtml(html);
    setShowHtmlPreview(true);
  };

  if (loading) return <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const hasAnyContent = result || artifactHtmlList.length > 0;
  if (!hasAnyContent) return <p className="text-sm text-muted-foreground text-center py-6">O agente Site Builder ainda não foi executado.</p>;

  return (
    <div className="space-y-3">
      {/* Import full HTML from memory */}
      {htmlCompleto && onImportSections && (
        <div className="space-y-1.5 p-3 rounded-lg border border-primary/20 bg-primary/5">
          <p className="text-xs font-semibold flex items-center gap-1.5"><Code className="h-3.5 w-3.5 text-primary" /> HTML Completo (Memória)</p>
          <p className="text-[10px] text-muted-foreground">HTML gerado pelo Site Builder disponível para importação direta.</p>
          <div className="flex gap-1.5">
            <Button variant="default" size="sm" className="h-7 flex-1 text-xs gap-1" onClick={() => handleImportHtml(htmlCompleto)} disabled={importing}>
              {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <FolderInput className="h-3 w-3" />} Importar HTML
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handlePreviewHtml(htmlCompleto)}>
              <Eye className="h-3 w-3" /> Preview
            </Button>
          </div>
        </div>
      )}

      {/* Import from artifacts */}
      {artifactHtmlList.length > 0 && onImportSections && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">HTML dos Artefatos</p>
          {artifactHtmlList.map(item => (
            <div key={item.id} className="p-2.5 rounded-lg border bg-muted/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium truncate">{item.projectName}</p>
                <span className="text-[10px] text-muted-foreground">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{(item.html.length / 1024).toFixed(1)} KB de HTML</p>
              <div className="flex gap-1.5">
                <Button variant="default" size="sm" className="h-7 flex-1 text-xs gap-1" onClick={() => handleImportHtml(item.html)} disabled={importing}>
                  {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <FolderInput className="h-3 w-3" />} Importar
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handlePreviewHtml(item.html)}>
                  <Eye className="h-3 w-3" /> Preview
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { navigator.clipboard.writeText(item.html); toast.success('HTML copiado!'); }}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Structured sections import */}
      {result && onImportSections && (
        <>
          <Separator />
          <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={handleImportSections} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Importar Seções Estruturadas
          </Button>
        </>
      )}

      {result && (
        <ScrollArea className="h-[200px]"><pre className="text-xs bg-muted p-3 rounded-lg whitespace-pre-wrap font-mono">{JSON.stringify(result, null, 2)}</pre></ScrollArea>
      )}

      {/* HTML Preview Dialog */}
      <Dialog open={showHtmlPreview} onOpenChange={setShowHtmlPreview}>
        <DialogContent className="bg-background max-w-[95vw] h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> Preview do HTML — Site Builder
              <Button variant="outline" size="sm" className="ml-auto h-7 gap-1 text-xs" onClick={() => { navigator.clipboard.writeText(previewingHtml); toast.success('HTML copiado!'); }}>
                <Copy className="h-3 w-3" /> Copiar HTML
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden rounded border" style={{ height: 'calc(90vh - 80px)' }}>
            <iframe srcDoc={previewingHtml} className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Section Editor ─────────────────────────────────────────────────────────────
// ── Alternatives Picker (for auto-generated content) ──────────────────────────
const AlternativesPicker: React.FC<{
  field: string;
  alternatives: { agent: string; icon: string; text: string }[];
  currentValue: string;
  onSelect: (text: string) => void;
}> = ({ field, alternatives, currentValue, onSelect }) => {
  const [open, setOpen] = useState(false);
  if (!alternatives || alternatives.length <= 1) return null;
  const currentIdx = alternatives.findIndex(a => a.text === currentValue);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="h-6 text-[10px] gap-1 border-primary/30 text-primary hover:bg-primary/10"
        onClick={() => setOpen(!open)}
      >
        <ArrowDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        {alternatives.length} opções
      </Button>
      {open && (
        <div className="absolute z-50 right-0 top-7 w-72 bg-popover border rounded-lg shadow-lg p-1.5 space-y-1 max-h-[200px] overflow-y-auto animate-in fade-in slide-in-from-top-1">
          {alternatives.map((alt, i) => (
            <button
              key={i}
              onClick={() => { onSelect(alt.text); setOpen(false); }}
              className={cn(
                "w-full text-left p-2 rounded-md text-xs transition-colors",
                alt.text === currentValue
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-muted/60"
              )}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm">{alt.icon}</span>
                <span className="font-semibold text-[10px] text-muted-foreground uppercase">{alt.agent}</span>
                {alt.text === currentValue && <Badge variant="secondary" className="text-[8px] h-3 ml-auto">Atual</Badge>}
              </div>
              <p className="text-foreground line-clamp-2">{alt.text}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Section Editor ─────────────────────────────────────────────────────────────
const SectionEditor: React.FC<{ section: PageSection; onChange: (u: PageSection) => void }> = ({ section, onChange }) => {
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showStrategyPicker, setShowStrategyPicker] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState('');
  const [strategyTarget, setStrategyTarget] = useState('');

  const updateContent = (key: string, value: any) => onChange({ ...section, content: { ...section.content, [key]: value } });
  const openMediaPicker = (t: string) => { setMediaPickerTarget(t); setShowMediaPicker(true); };
  const openStrategyPicker = (t: string) => { setStrategyTarget(t); setShowStrategyPicker(true); };

  const SB: React.FC<{ t: string }> = ({ t }) => {
    const alts = section.content[`_alt_${t}`];
    return (
      <div className="flex items-center gap-1">
        {alts && alts.length > 1 && (
          <AlternativesPicker
            field={t}
            alternatives={alts}
            currentValue={section.content[t] || ''}
            onSelect={(text) => updateContent(t, text)}
          />
        )}
        <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-1" onClick={() => openStrategyPicker(t)}><Sparkles className="h-3 w-3" /> Estratégia</Button>
      </div>
    );
  };

  const renderFields = () => {
    switch (section.type) {
      case 'hero': return (
        <div className="space-y-3">
          <div><div className="flex items-center justify-between mb-1"><Label className="text-xs">Título</Label><SB t="headline" /></div><Input value={section.content.headline} onChange={e => updateContent('headline', e.target.value)} /></div>
          <div><div className="flex items-center justify-between mb-1"><Label className="text-xs">Subtítulo</Label><SB t="subheadline" /></div><Textarea value={section.content.subheadline} onChange={e => updateContent('subheadline', e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-2"><div><Label className="text-xs">Texto Botão</Label><Input value={section.content.cta_text} onChange={e => updateContent('cta_text', e.target.value)} /></div><div><Label className="text-xs">URL Botão</Label><Input value={section.content.cta_url} onChange={e => updateContent('cta_url', e.target.value)} /></div></div>
          <div><Label className="text-xs">Imagem de Fundo</Label><div className="flex gap-2 mt-1"><Input value={section.content.background_image} onChange={e => updateContent('background_image', e.target.value)} placeholder="URL" className="flex-1" /><Button variant="outline" size="sm" onClick={() => openMediaPicker('background_image')}><Image className="h-4 w-4" /></Button></div></div>
        </div>
      );
      case 'text': return (<div className="space-y-3"><div className="flex items-center justify-between mb-1"><Label className="text-xs">Conteúdo</Label><SB t="body" /></div><Textarea value={section.content.body} onChange={e => updateContent('body', e.target.value)} rows={5} /></div>);
      case 'image': return (
        <div className="space-y-3">
          <div><Label className="text-xs">URL da Imagem</Label><div className="flex gap-2 mt-1"><Input value={section.content.url} onChange={e => updateContent('url', e.target.value)} className="flex-1" /><Button variant="outline" size="sm" onClick={() => openMediaPicker('url')}><Image className="h-4 w-4" /></Button></div></div>
          {section.content.url && <img src={section.content.url} alt="" className="w-full max-h-40 object-contain rounded border" />}
          <Input value={section.content.alt} onChange={e => updateContent('alt', e.target.value)} placeholder="Texto alternativo" />
          <Input value={section.content.caption} onChange={e => updateContent('caption', e.target.value)} placeholder="Legenda" />
        </div>
      );
      case 'video': return (
        <div className="space-y-3">
          <div><Label className="text-xs">URL do Vídeo</Label><div className="flex gap-2 mt-1"><Input value={section.content.url} onChange={e => updateContent('url', e.target.value)} className="flex-1" placeholder="URL" /><Button variant="outline" size="sm" onClick={() => { setMediaPickerTarget('url'); setShowMediaPicker(true); }}><Video className="h-4 w-4" /></Button></div></div>
          {section.content.url && <video src={section.content.url} controls className="w-full max-h-40 rounded border" />}
        </div>
      );
      case 'cta': return (
        <div className="space-y-3">
          <div><div className="flex items-center justify-between mb-1"><Label className="text-xs">Título</Label><SB t="headline" /></div><Input value={section.content.headline} onChange={e => updateContent('headline', e.target.value)} /></div>
          <div><div className="flex items-center justify-between mb-1"><Label className="text-xs">Descrição</Label><SB t="description" /></div><Textarea value={section.content.description} onChange={e => updateContent('description', e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-2"><Input value={section.content.button_text} onChange={e => updateContent('button_text', e.target.value)} placeholder="Botão" /><Input value={section.content.button_url} onChange={e => updateContent('button_url', e.target.value)} placeholder="URL" /></div>
        </div>
      );
      case 'features': return (
        <div className="space-y-3">
          {(section.content.items || []).map((item: any, i: number) => (
            <Card key={i} className="p-2">
              <div className="grid grid-cols-[40px_1fr] gap-2">
                <Input value={item.icon} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, icon: e.target.value }; updateContent('items', items); }} className="text-center" />
                <Input value={item.title} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, title: e.target.value }; updateContent('items', items); }} placeholder="Título" />
              </div>
              <Textarea value={item.description} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, description: e.target.value }; updateContent('items', items); }} rows={1} className="mt-1" />
              <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs mt-1" onClick={() => updateContent('items', section.content.items.filter((_: any, idx: number) => idx !== i))}>Remover</Button>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateContent('items', [...(section.content.items || []), { icon: '✨', title: 'Novo', description: 'Descrição' }])}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
        </div>
      );
      case 'faq': return (
        <div className="space-y-3">
          {(section.content.items || []).map((item: any, i: number) => (
            <Card key={i} className="p-2 space-y-1">
              <Input value={item.question} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, question: e.target.value }; updateContent('items', items); }} placeholder="Pergunta" />
              <Textarea value={item.answer} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, answer: e.target.value }; updateContent('items', items); }} rows={2} placeholder="Resposta" />
              <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs" onClick={() => updateContent('items', section.content.items.filter((_: any, idx: number) => idx !== i))}>Remover</Button>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateContent('items', [...(section.content.items || []), { question: 'Pergunta?', answer: 'Resposta.' }])}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
        </div>
      );
      case 'gallery': return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(section.content.images || []).map((url: string, i: number) => (
              <div key={i} className="relative aspect-square rounded border overflow-hidden group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => updateContent('images', section.content.images.filter((_: any, idx: number) => idx !== i))} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => openMediaPicker('gallery_add')}><Image className="h-3 w-3 mr-1" /> Adicionar da Galeria</Button>
        </div>
      );
      case 'testimonials': return (
        <div className="space-y-3">
          {(section.content.items || []).map((item: any, i: number) => (
            <Card key={i} className="p-2 space-y-1">
              <div className="grid grid-cols-2 gap-2">
                <Input value={item.name} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, name: e.target.value }; updateContent('items', items); }} placeholder="Nome" />
                <Input value={item.role} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, role: e.target.value }; updateContent('items', items); }} placeholder="Cargo" />
              </div>
              <Textarea value={item.text} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, text: e.target.value }; updateContent('items', items); }} rows={2} placeholder="Depoimento" />
              {item.metrics && <Input value={item.metrics} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, metrics: e.target.value }; updateContent('items', items); }} placeholder="Resultado/Métrica (ex: +300% vendas)" />}
              <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs" onClick={() => updateContent('items', section.content.items.filter((_: any, idx: number) => idx !== i))}>Remover</Button>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateContent('items', [...(section.content.items || []), { name: 'Cliente', role: '', text: 'Depoimento...', metrics: '' }])}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
        </div>
      );
      case 'social_proof': return (
        <div className="space-y-3">
          {(section.content.items || []).map((item: any, i: number) => (
            <Card key={i} className="p-2">
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <Input value={item.number} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, number: e.target.value }; updateContent('items', items); }} placeholder="1000+" className="text-center font-bold" />
                <Input value={item.label} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, label: e.target.value }; updateContent('items', items); }} placeholder="Clientes" />
              </div>
              <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs mt-1" onClick={() => updateContent('items', section.content.items.filter((_: any, idx: number) => idx !== i))}>Remover</Button>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateContent('items', [...(section.content.items || []), { number: '100+', label: 'Novo Indicador' }])}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
        </div>
      );
      case 'guarantee': return (
        <div className="space-y-3">
          <div><Label className="text-xs">Ícone</Label><Input value={section.content.icon} onChange={e => updateContent('icon', e.target.value)} /></div>
          <div><div className="flex items-center justify-between mb-1"><Label className="text-xs">Título</Label><SB t="title" /></div><Input value={section.content.title} onChange={e => updateContent('title', e.target.value)} /></div>
          <div><div className="flex items-center justify-between mb-1"><Label className="text-xs">Descrição</Label><SB t="description" /></div><Textarea value={section.content.description} onChange={e => updateContent('description', e.target.value)} rows={3} /></div>
          <div><Label className="text-xs">Duração</Label><Input value={section.content.duration} onChange={e => updateContent('duration', e.target.value)} placeholder="30 dias" /></div>
        </div>
      );
      case 'objections': return (
        <div className="space-y-3">
          <div><div className="flex items-center justify-between mb-1"><Label className="text-xs">Título da Seção</Label><SB t="title" /></div><Input value={section.content.title} onChange={e => updateContent('title', e.target.value)} /></div>
          {(section.content.items || []).map((item: any, i: number) => (
            <Card key={i} className="p-2 space-y-1">
              <Input value={item.objection} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, objection: e.target.value }; updateContent('items', items); }} placeholder="Objeção (ex: É caro)" />
              <Textarea value={item.response} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, response: e.target.value }; updateContent('items', items); }} rows={2} placeholder="Resposta persuasiva" />
              <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs" onClick={() => updateContent('items', section.content.items.filter((_: any, idx: number) => idx !== i))}>Remover</Button>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateContent('items', [...(section.content.items || []), { objection: 'Nova objeção', response: 'Resposta...' }])}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
        </div>
      );
      case 'pricing': return (
        <div className="space-y-3">
          <div><Label className="text-xs">Título</Label><Input value={section.content.title} onChange={e => updateContent('title', e.target.value)} /></div>
          {(section.content.items || []).map((item: any, i: number) => (
            <Card key={i} className="p-2 space-y-1">
              <div className="grid grid-cols-2 gap-2">
                <Input value={item.name} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, name: e.target.value }; updateContent('items', items); }} placeholder="Nome do plano" />
                <Input value={item.price} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, price: e.target.value }; updateContent('items', items); }} placeholder="R$ 97/mês" />
              </div>
              <Textarea value={(item.features || []).join('\n')} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, features: e.target.value.split('\n') }; updateContent('items', items); }} rows={3} placeholder="Um recurso por linha" />
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={item.highlighted} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, highlighted: e.target.checked }; updateContent('items', items); }} /> Destacar</label>
              <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs" onClick={() => updateContent('items', section.content.items.filter((_: any, idx: number) => idx !== i))}>Remover</Button>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateContent('items', [...(section.content.items || []), { name: 'Plano', price: 'R$ 0', features: ['Recurso'], highlighted: false }])}><Plus className="h-3 w-3 mr-1" /> Adicionar Plano</Button>
        </div>
      );
      case 'process_steps': return (
        <div className="space-y-3">
          <div><Label className="text-xs">Título</Label><Input value={section.content.title} onChange={e => updateContent('title', e.target.value)} /></div>
          {(section.content.items || []).map((item: any, i: number) => (
            <Card key={i} className="p-2">
              <div className="grid grid-cols-[40px_1fr] gap-2">
                <Input value={item.step} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, step: e.target.value }; updateContent('items', items); }} className="text-center font-bold" />
                <Input value={item.title} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, title: e.target.value }; updateContent('items', items); }} placeholder="Título da etapa" />
              </div>
              <Textarea value={item.description} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, description: e.target.value }; updateContent('items', items); }} rows={1} className="mt-1" placeholder="Descrição" />
              <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs mt-1" onClick={() => updateContent('items', section.content.items.filter((_: any, idx: number) => idx !== i))}>Remover</Button>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateContent('items', [...(section.content.items || []), { step: `${(section.content.items || []).length + 1}`, title: 'Nova Etapa', description: '' }])}><Plus className="h-3 w-3 mr-1" /> Adicionar Etapa</Button>
        </div>
      );
      case 'spacer': return (<div><Label className="text-xs">Altura (px)</Label><Input type="number" value={section.content.height} onChange={e => updateContent('height', e.target.value)} /></div>);
      case 'custom_html': return (<div><Label className="text-xs">Código HTML</Label><Textarea value={section.content.code} onChange={e => updateContent('code', e.target.value)} rows={8} className="font-mono text-xs" /></div>);
      case 'footer': return (<div className="space-y-3"><Input value={section.content.company} onChange={e => updateContent('company', e.target.value)} placeholder="Empresa" /><Input value={section.content.copyright} onChange={e => updateContent('copyright', e.target.value)} placeholder="Copyright" /></div>);
      default: return <p className="text-xs text-muted-foreground">Editor não disponível.</p>;
    }
  };

  return (
    <div className="space-y-3">
      <div><Label className="text-xs">Título da Seção</Label><Input value={section.title} onChange={e => onChange({ ...section, title: e.target.value })} /></div>
      {section.content._media_suggestion && (
        <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs text-amber-700 dark:text-amber-400 space-y-1">
          <p className="font-semibold flex items-center gap-1">💡 Sugestão de mídia (IA)</p>
          <p>{section.content._media_suggestion}</p>
        </div>
      )}
      <Separator />
      {renderFields()}
      <Dialog open={showMediaPicker} onOpenChange={setShowMediaPicker}>
        <DialogContent className="bg-background sm:max-w-lg">
          <DialogHeader><DialogTitle>Selecionar Mídia</DialogTitle></DialogHeader>
          <MediaPicker type={section.type === 'video' || mediaPickerTarget === 'video_url' ? 'video' : 'image'} onSelect={(url) => { if (mediaPickerTarget === 'gallery_add') updateContent('images', [...(section.content.images || []), url]); else updateContent(mediaPickerTarget, url); setShowMediaPicker(false); }} />
        </DialogContent>
      </Dialog>
      <Dialog open={showStrategyPicker} onOpenChange={setShowStrategyPicker}>
        <DialogContent className="bg-background sm:max-w-lg">
          <DialogHeader><DialogTitle>Importar Texto Estratégico</DialogTitle></DialogHeader>
          <StrategyTextPicker onSelect={(text) => { updateContent(strategyTarget, text); setShowStrategyPicker(false); toast.success('Texto importado!'); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Contrast helper ────────────────────────────────────────────────────────────
function getContrastText(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1a1a1a' : '#ffffff';
}

function getContrastTextForAccent(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1a1a1a' : '#ffffff';
}

// ── Preview Renderer ───────────────────────────────────────────────────────────
const SectionPreview: React.FC<{ section: PageSection; config: PageConfig }> = ({ section, config }) => {
  if (!section.visible) return null;
  const c = section.content;
  const layout = section.styles?.layout || '';
  switch (section.type) {
    case 'hero': {
      const primaryText = getContrastText(config.primaryColor);
      const accentText = getContrastTextForAccent(config.accentColor);
      if (layout === 'split-left' || layout === 'split-right') {
        const isRight = layout === 'split-right';
        return (
          <div className="relative py-12 px-6" style={{ backgroundColor: config.primaryColor, color: primaryText }}>
            <div className={`max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-8 ${isRight ? 'md:flex-row-reverse' : ''}`}>
              <div className="flex-1 text-left">
                <h1 className="text-3xl md:text-5xl font-bold mb-4" style={{ fontFamily: config.fontDisplay }}>{c.headline}</h1>
                <p className="text-lg md:text-xl mb-8 opacity-90">{c.subheadline}</p>
                {c.cta_text && <a href={c.cta_url} className="inline-block px-8 py-3 rounded-lg font-semibold text-lg" style={{ backgroundColor: config.accentColor, color: accentText }}>{c.cta_text}</a>}
              </div>
              <div className="flex-1 w-full">
                {c.background_image ? <img src={c.background_image} alt="" className="w-full rounded-xl shadow-2xl" /> : <div className="w-full aspect-[4/3] rounded-xl flex items-center justify-center text-sm" style={{ background: primaryText === '#ffffff' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: primaryText === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }}>Imagem do Hero</div>}
              </div>
            </div>
          </div>
        );
      }
      return (<div className="relative py-20 px-6 text-center" style={{ backgroundImage: c.background_image ? `url(${c.background_image})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: c.background_image ? undefined : config.primaryColor, color: c.background_image ? '#fff' : primaryText }}>{c.background_image && <div className="absolute inset-0 bg-black/50" />}<div className="relative z-10 max-w-3xl mx-auto"><h1 className="text-3xl md:text-5xl font-bold mb-4" style={{ fontFamily: config.fontDisplay }}>{c.headline}</h1><p className="text-lg md:text-xl mb-8 opacity-90">{c.subheadline}</p>{c.cta_text && <a href={c.cta_url} className="inline-block px-8 py-3 rounded-lg font-semibold text-lg" style={{ backgroundColor: config.accentColor, color: accentText }}>{c.cta_text}</a>}</div></div>);
    }
    case 'text': return <div className="py-10 px-6 max-w-3xl mx-auto" style={{ textAlign: c.alignment as any }}><p className="text-base leading-relaxed whitespace-pre-wrap">{c.body}</p></div>;
    case 'image': return (<div className="py-8 px-6 max-w-4xl mx-auto text-center">{c.url ? <img src={c.url} alt={c.alt} className="w-full rounded-lg shadow-lg" style={{ objectFit: c.fit }} /> : <div className="h-48 bg-muted rounded-lg flex items-center justify-center"><Image className="h-10 w-10 text-muted-foreground" /></div>}{c.caption && <p className="text-sm text-muted-foreground mt-2">{c.caption}</p>}</div>);
    case 'video': return (<div className="py-8 px-6 max-w-4xl mx-auto">{c.url ? <video src={c.url} controls poster={c.poster} className="w-full rounded-lg shadow-lg" /> : c.poster ? <div className="relative w-full rounded-lg shadow-lg overflow-hidden"><img src={c.poster} alt="Video poster" className="w-full aspect-video object-cover" style={{ filter: 'brightness(0.7)' }} /><div className="absolute inset-0 flex items-center justify-center"><div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"><Play className="h-7 w-7 text-white ml-1" /></div></div></div> : <div className="h-48 bg-muted rounded-lg flex items-center justify-center"><Video className="h-10 w-10 text-muted-foreground" /></div>}</div>);
    case 'features': {
      if (layout === 'zigzag') {
        return (<div className="py-12 px-6 max-w-5xl mx-auto space-y-8">{(c.items || []).map((item: any, i: number) => (<div key={i} className={`flex flex-col md:flex-row items-center gap-6 ${i % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}><div className="flex-1 text-center md:text-left"><span className="text-4xl block mb-3">{item.icon}</span><h3 className="font-semibold text-xl mb-2">{item.title}</h3><p className="text-muted-foreground">{item.description}</p></div><div className="flex-1 w-full"><div className="aspect-video rounded-xl bg-muted/30 border flex items-center justify-center text-muted-foreground text-sm">Imagem</div></div></div>))}</div>);
      }
      if (layout === 'icons-left') {
        return (<div className="py-12 px-6 max-w-4xl mx-auto space-y-4">{(c.items || []).map((item: any, i: number) => (<div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-card border"><span className="text-3xl shrink-0">{item.icon}</span><div><h3 className="font-semibold text-lg mb-1">{item.title}</h3><p className="text-sm text-muted-foreground">{item.description}</p></div></div>))}</div>);
      }
      return (<div className="py-12 px-6 max-w-5xl mx-auto"><div className="grid grid-cols-1 md:grid-cols-3 gap-6">{(c.items || []).map((item: any, i: number) => (<div key={i} className="text-center p-6 rounded-xl bg-card border"><span className="text-3xl mb-3 block">{item.icon}</span><h3 className="font-semibold text-lg mb-2">{item.title}</h3><p className="text-sm text-muted-foreground">{item.description}</p></div>))}</div></div>);
    }
    case 'cta': { const ctaPrimaryText = getContrastText(config.primaryColor); const ctaAccentText = getContrastTextForAccent(config.accentColor); return (<div className="py-16 px-6 text-center" style={{ backgroundColor: config.primaryColor, color: ctaPrimaryText }}><h2 className="text-2xl md:text-3xl font-bold mb-3">{c.headline}</h2><p className="text-lg mb-6 opacity-90">{c.description}</p><a href={c.button_url} className="inline-block px-8 py-3 rounded-lg font-semibold" style={{ backgroundColor: config.accentColor, color: ctaAccentText }}>{c.button_text}</a></div>); }
    case 'testimonials': return (<div className="py-12 px-6 max-w-4xl mx-auto"><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{(c.items || []).map((item: any, i: number) => (<div key={i} className="p-6 rounded-xl bg-card border italic"><p className="mb-3">"{item.text}"</p>{item.metrics && <p className="text-sm font-bold not-italic mb-2" style={{ color: config.accentColor }}>📈 {item.metrics}</p>}<p className="text-sm font-semibold not-italic">{item.name}{item.role ? ` — ${item.role}` : ''}</p></div>))}</div></div>);
    case 'social_proof': { const spText = getContrastText(config.primaryColor); return (<div className="py-12 px-6 text-center" style={{ backgroundColor: config.primaryColor, color: spText }}><div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">{(c.items || []).map((item: any, i: number) => (<div key={i} className="flex flex-col items-center justify-start"><p className="text-3xl md:text-4xl font-bold mb-1">{item.number}</p><p className="text-sm opacity-80">{item.label}</p></div>))}</div></div>); }
    case 'guarantee': return (<div className="py-12 px-6 max-w-3xl mx-auto text-center"><div className="p-8 rounded-2xl border-2 border-dashed" style={{ borderColor: config.accentColor }}><span className="text-5xl block mb-4">{c.icon || '🛡️'}</span><h3 className="text-2xl font-bold mb-3">{c.title}</h3><p className="text-base text-muted-foreground mb-2">{c.description}</p>{c.duration && <Badge variant="secondary" className="text-sm">{c.duration}</Badge>}</div></div>);
    case 'objections': return (<div className="py-12 px-6 max-w-3xl mx-auto"><h3 className="text-2xl font-bold text-center mb-8">{c.title || 'Tire Suas Dúvidas'}</h3><div className="space-y-4">{(c.items || []).map((item: any, i: number) => (<div key={i} className="p-5 rounded-xl border bg-card"><p className="font-semibold text-destructive mb-2">❌ "{item.objection}"</p><p className="text-sm text-foreground">✅ {item.response}</p></div>))}</div></div>);
    case 'pricing': return (<div className="py-12 px-6 max-w-4xl mx-auto"><h3 className="text-2xl font-bold text-center mb-8">{c.title || 'Planos'}</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{(c.items || []).map((item: any, i: number) => (<div key={i} className={cn("p-6 rounded-xl border-2 text-center", item.highlighted ? "border-primary shadow-lg scale-105" : "border-border")}><h4 className="font-bold text-lg mb-2">{item.name}</h4><p className="text-3xl font-bold mb-4" style={{ color: config.primaryColor }}>{item.price}</p><ul className="text-sm space-y-2 text-left">{(item.features || []).map((f: string, fi: number) => <li key={fi} className="flex items-center gap-2">✅ {f}</li>)}</ul></div>))}</div></div>);
    case 'process_steps': return (<div className="py-12 px-6 max-w-4xl mx-auto"><h3 className="text-2xl font-bold text-center mb-8">{c.title || 'Como Funciona'}</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-6">{(c.items || []).map((item: any, i: number) => (<div key={i} className="text-center p-6"><div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3" style={{ backgroundColor: config.accentColor, color: '#fff' }}>{item.step}</div><h4 className="font-semibold text-lg mb-2">{item.title}</h4><p className="text-sm text-muted-foreground">{item.description}</p></div>))}</div></div>);
    case 'faq': return (<div className="py-12 px-6 max-w-3xl mx-auto space-y-4">{(c.items || []).map((item: any, i: number) => (<div key={i} className="border rounded-lg p-4"><h4 className="font-semibold mb-2">{item.question}</h4><p className="text-sm text-muted-foreground">{item.answer}</p></div>))}</div>);
    case 'gallery': return (<div className="py-8 px-6 max-w-5xl mx-auto"><div className="grid grid-cols-2 md:grid-cols-3 gap-3">{(c.images || []).map((url: string, i: number) => <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />)}</div></div>);
    case 'footer': return (<div className="py-8 px-6 text-center border-t bg-muted/30"><p className="font-semibold mb-2">{c.company}</p><p className="text-xs text-muted-foreground">{c.copyright}</p></div>);
    case 'spacer': return <div style={{ height: `${c.height || 60}px` }} />;
    case 'custom_html': return <div className="py-4 px-6 max-w-4xl mx-auto" dangerouslySetInnerHTML={{ __html: c.code || '' }} />;
    default: return null;
  }
};

function generateSlug(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `page-${Date.now()}`;
}

// ── Shared HTML Generator ───────────────────────────────────────────────────────
function generateFullHTML(sections: PageSection[], config: PageConfig): string {
  const cfg: PageConfig = {
    title: '', description: '', favicon: '', primaryColor: '#1e40af', secondaryColor: '#3b82f6',
    accentColor: '#f59e0b', backgroundColor: '#ffffff', textColor: '#1f2937',
    fontDisplay: 'Inter', fontBody: 'Inter', maxWidth: '1200px', ...config,
  };
  const vs = sections.filter((s: PageSection) => s.visible);

  let html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${cfg.title}</title><meta name="description" content="${cfg.description}">
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(cfg.fontDisplay)}:wght@400;600;700&family=${encodeURIComponent(cfg.fontBody)}:wght@400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'${cfg.fontBody}',sans-serif;color:${cfg.textColor};background:${cfg.backgroundColor};-webkit-text-size-adjust:100%}
.container{max-width:${cfg.maxWidth};margin:0 auto;padding:0 24px}
img{max-width:100%;height:auto}video{max-width:100%;height:auto}
a{text-decoration:none}
.btn{display:inline-block;padding:14px 36px;border-radius:8px;font-weight:600;font-size:1.1rem;cursor:pointer;transition:opacity .2s;text-align:center}
.btn:hover{opacity:.9}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}
.text-center{text-align:center}
section{overflow-x:hidden}
@media(max-width:1024px){
  .grid-3{grid-template-columns:repeat(2,1fr)}
  .grid-4{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:768px){
  .grid-3,.grid-2{grid-template-columns:1fr}
  .grid-4{grid-template-columns:repeat(2,1fr)}
  .container{padding:0 16px}
  .btn{padding:12px 24px;font-size:1rem;width:100%;max-width:320px}
}
@media(max-width:480px){
  .grid-4{grid-template-columns:1fr}
  body{font-size:15px}
}
</style></head><body>`;

  const primaryTextHTML = getContrastText(cfg.primaryColor);
  const accentTextHTML = getContrastTextForAccent(cfg.accentColor);

  for (const s of vs) {
    const c = s.content;
    switch (s.type) {
      case 'hero': {
        const heroLayout = s.styles?.layout || '';
        if (heroLayout === 'split-left' || heroLayout === 'split-right') {
          const isRight = heroLayout === 'split-right';
          html += `<section style="padding:60px 24px;background:${cfg.primaryColor};color:${primaryTextHTML}"><div class="container" style="display:flex;flex-wrap:wrap;align-items:center;gap:40px;${isRight ? 'flex-direction:row-reverse' : ''}"><div style="flex:1;min-width:280px"><h1 style="font-size:clamp(2rem,5vw,3.5rem);font-weight:700;margin-bottom:16px;font-family:'${cfg.fontDisplay}',sans-serif">${c.headline||''}</h1><p style="font-size:clamp(1rem,2vw,1.3rem);margin-bottom:32px;opacity:.9">${c.subheadline||''}</p>${c.cta_text ? `<a href="${c.cta_url||'#'}" class="btn" style="background:${cfg.accentColor};color:${accentTextHTML}">${c.cta_text}</a>` : ''}</div><div style="flex:1;min-width:280px">${c.background_image ? `<img src="${c.background_image}" style="width:100%;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.3)">` : `<div style="width:100%;aspect-ratio:4/3;background:rgba(${primaryTextHTML === '#ffffff' ? '255,255,255' : '0,0,0'},.1);border-radius:16px;display:flex;align-items:center;justify-content:center;color:rgba(${primaryTextHTML === '#ffffff' ? '255,255,255' : '0,0,0'},.3)">Imagem</div>`}</div></div></section>\n`;
        } else {
          html += `<section style="padding:80px 24px;text-align:center;${c.background_image ? `background:linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.5)),url(${c.background_image}) center/cover` : `background:${cfg.primaryColor}`};color:${c.background_image ? '#fff' : primaryTextHTML}"><div class="container"><h1 style="font-size:clamp(2rem,5vw,3.5rem);font-weight:700;margin-bottom:16px;font-family:'${cfg.fontDisplay}',sans-serif">${c.headline||''}</h1><p style="font-size:clamp(1rem,2vw,1.3rem);margin-bottom:32px;opacity:.9;max-width:700px;margin-left:auto;margin-right:auto">${c.subheadline||''}</p>${c.cta_text ? `<a href="${c.cta_url||'#'}" class="btn" style="background:${cfg.accentColor};color:${accentTextHTML}">${c.cta_text}</a>` : ''}</div></section>\n`;
        }
        break;
      }
      case 'text':
        html += `<section style="padding:48px 24px"><div class="container" style="max-width:768px;text-align:${c.alignment||'left'}"><p style="font-size:1.1rem;line-height:1.8;white-space:pre-wrap">${c.body||''}</p></div></section>\n`; break;
      case 'image':
        html += `<section style="padding:40px 24px"><div class="container text-center">${c.url ? `<img src="${c.url}" alt="${c.alt||''}" style="border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.1);width:100%;object-fit:${c.fit||'cover'}">` : ''}${c.caption ? `<p style="margin-top:12px;color:#6b7280;font-size:.9rem">${c.caption}</p>` : ''}</div></section>\n`; break;
      case 'video': {
        const hasVideo = c.url && c.url.length > 5;
        const hasPoster = c.poster && c.poster.length > 5;
        const storyboard = c._storyboard || [];
        const headlineOverlay = c._headline_overlay || '';
        const ctaOverlay = c._cta_overlay || '';
        if (hasVideo) {
          html += `<section style="padding:40px 24px"><div class="container" style="max-width:900px"><video src="${c.url}" controls ${hasPoster ? `poster="${c.poster}"` : ''} style="width:100%;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.1)"></video></div></section>\n`;
        } else if (hasPoster || storyboard.length > 0) {
          html += `<section style="padding:40px 24px"><div class="container" style="max-width:900px">`;
          if (hasPoster) {
            html += `<div style="position:relative;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)"><img src="${c.poster}" style="width:100%;aspect-ratio:16/9;object-fit:cover;filter:brightness(0.7)" />`;
            html += `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;padding:24px">`;
            html += `<div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.2);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;margin-bottom:16px"><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div>`;
            if (headlineOverlay) html += `<p style="font-size:1.3rem;font-weight:700;margin-bottom:8px;text-shadow:0 2px 8px rgba(0,0,0,.5)">${headlineOverlay}</p>`;
            if (ctaOverlay) html += `<p style="font-size:1rem;opacity:.9;text-shadow:0 2px 4px rgba(0,0,0,.5)">${ctaOverlay}</p>`;
            html += `</div></div>`;
          }
          if (storyboard.length > 0) {
            html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-top:20px">`;
            storyboard.forEach((scene: any) => {
              html += `<div style="padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb"><p style="font-size:.75rem;font-weight:700;color:${cfg.accentColor};margin-bottom:4px">⏱ ${scene.timestamp || ''}</p><p style="font-size:.85rem;color:#374151">${scene.description || ''}</p></div>`;
            });
            html += `</div>`;
          }
          html += `</div></section>\n`;
        }
        break;
      }
      case 'features':
        html += `<section style="padding:64px 24px"><div class="container"><div class="grid-3">${(c.items||[]).map((f:any)=>`<div style="text-align:center;padding:32px 20px;border-radius:16px;border:1px solid #e5e7eb;background:#fff"><span style="font-size:2.5rem;display:block;margin-bottom:12px">${f.icon||'✨'}</span><h3 style="font-weight:600;font-size:1.2rem;margin-bottom:8px">${f.title||''}</h3><p style="color:#6b7280;font-size:.95rem">${f.description||''}</p></div>`).join('')}</div></div></section>\n`; break;
      case 'cta':
        html += `<section style="padding:80px 24px;text-align:center;background:${cfg.primaryColor};color:${primaryTextHTML}"><div class="container"><h2 style="font-size:clamp(1.5rem,4vw,2.5rem);font-weight:700;margin-bottom:12px">${c.headline||''}</h2><p style="font-size:1.2rem;margin-bottom:32px;opacity:.9">${c.description||''}</p>${c.button_text ? `<a href="${c.button_url||'#'}" class="btn" style="background:${cfg.accentColor};color:${accentTextHTML}">${c.button_text}</a>` : ''}</div></section>\n`; break;
      case 'testimonials':
        html += `<section style="padding:64px 24px;background:#f9fafb"><div class="container"><div class="grid-2">${(c.items||[]).map((t:any)=>`<div style="padding:28px;border-radius:16px;background:#fff;border:1px solid #e5e7eb;font-style:italic"><p style="margin-bottom:16px;font-size:1.05rem;line-height:1.7">"${t.text||''}"</p>${t.metrics?`<p style="font-size:.95rem;font-weight:700;font-style:normal;color:${cfg.accentColor};margin-bottom:8px">📈 ${t.metrics}</p>`:''}<p style="font-weight:600;font-style:normal;font-size:.95rem">${t.name||''}${t.role ? ` — ${t.role}`:''}</p></div>`).join('')}</div></div></section>\n`; break;
      case 'social_proof':
        html += `<section style="padding:56px 24px;text-align:center;background:${cfg.primaryColor};color:${primaryTextHTML}"><div class="container"><div class="grid-4" style="align-items:start">${(c.items||[]).map((item:any)=>`<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start"><p style="font-size:clamp(2rem,4vw,3rem);font-weight:bold;margin-bottom:4px">${item.number||''}</p><p style="font-size:.95rem;opacity:.8">${item.label||''}</p></div>`).join('')}</div></div></section>\n`; break;
      case 'guarantee':
        html += `<section style="padding:64px 24px;text-align:center"><div class="container" style="max-width:640px"><div style="padding:48px;border:2px dashed ${cfg.accentColor};border-radius:20px"><span style="font-size:3.5rem;display:block;margin-bottom:16px">${c.icon||'🛡️'}</span><h3 style="font-size:1.8rem;font-weight:700;margin-bottom:12px">${c.title||''}</h3><p style="font-size:1.05rem;color:#6b7280;margin-bottom:12px;line-height:1.7">${c.description||''}</p>${c.duration?`<span style="display:inline-block;padding:6px 16px;background:#f3f4f6;border-radius:24px;font-size:.95rem;font-weight:500">${c.duration}</span>`:''}</div></div></section>\n`; break;
      case 'objections':
        html += `<section style="padding:64px 24px"><div class="container" style="max-width:768px"><h3 style="font-size:1.8rem;font-weight:700;text-align:center;margin-bottom:40px">${c.title||''}</h3>${(c.items||[]).map((item:any)=>`<div style="padding:24px;border:1px solid #e5e7eb;border-radius:16px;margin-bottom:16px"><p style="font-weight:600;color:#dc2626;margin-bottom:10px;font-size:1.05rem">❌ "${item.objection||''}"</p><p style="color:#374151;line-height:1.7">✅ ${item.response||''}</p></div>`).join('')}</div></section>\n`; break;
      case 'pricing':
        html += `<section style="padding:64px 24px"><div class="container"><h3 style="font-size:1.8rem;font-weight:700;text-align:center;margin-bottom:40px">${c.title||'Planos'}</h3><div class="grid-3">${(c.items||[]).map((item:any)=>`<div style="padding:36px;border:${item.highlighted?`2px solid ${cfg.primaryColor}`:'1px solid #e5e7eb'};border-radius:20px;text-align:center;${item.highlighted?'box-shadow:0 10px 40px rgba(0,0,0,.1);transform:scale(1.03)':''}"><h4 style="font-weight:600;font-size:1.3rem;margin-bottom:8px">${item.name||''}</h4><p style="font-size:2.2rem;font-weight:700;color:${cfg.primaryColor};margin-bottom:20px">${item.price||''}</p><ul style="list-style:none;text-align:left;font-size:.95rem">${(item.features||[]).map((f:string)=>`<li style="padding:6px 0;border-bottom:1px solid #f3f4f6">✅ ${f}</li>`).join('')}</ul></div>`).join('')}</div></div></section>\n`; break;
      case 'process_steps':
        html += `<section style="padding:64px 24px"><div class="container"><h3 style="font-size:1.8rem;font-weight:700;text-align:center;margin-bottom:40px">${c.title||'Como Funciona'}</h3><div class="grid-3">${(c.items||[]).map((item:any)=>`<div style="text-align:center;padding:28px"><div style="width:56px;height:56px;border-radius:50%;background:${cfg.accentColor};color:${accentTextHTML};display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:bold;margin:0 auto 16px">${item.step||''}</div><h4 style="font-weight:600;font-size:1.15rem;margin-bottom:8px">${item.title||''}</h4><p style="color:#6b7280;line-height:1.6">${item.description||''}</p></div>`).join('')}</div></div></section>\n`; break;
      case 'faq':
        html += `<section style="padding:64px 24px"><div class="container" style="max-width:768px">${(c.items||[]).map((q:any)=>`<div style="padding:20px 0;border-bottom:1px solid #e5e7eb"><h4 style="font-weight:600;font-size:1.1rem;margin-bottom:8px">${q.question||''}</h4><p style="color:#6b7280;line-height:1.7">${q.answer||''}</p></div>`).join('')}</div></section>\n`; break;
      case 'gallery':
        html += `<section style="padding:40px 24px"><div class="container"><div class="grid-3">${(c.images||[]).map((url:string)=>`<img src="${url}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px">`).join('')}</div></div></section>\n`; break;
      case 'footer':
        html += `<footer style="padding:40px 24px;text-align:center;border-top:1px solid #e5e7eb;background:#f9fafb"><p style="font-weight:600;margin-bottom:8px">${c.company||''}</p><p style="color:#9ca3af;font-size:.85rem">${c.copyright||''}</p></footer>\n`; break;
      case 'spacer':
        html += `<div style="height:${c.height||60}px"></div>\n`; break;
      case 'custom_html':
        html += c.code || ''; break;
    }
  }
  html += '</body></html>';
  return html;
}

// ── Preview Iframe (standalone) ─────────────────────────────────────────────────
const PreviewIframe: React.FC<{ sections: PageSection[]; config: any }> = ({ sections, config }) => {
  return <iframe srcDoc={generateFullHTML(sections, config as PageConfig)} className="w-full h-full border-0" />;
};

// ── Auto Generate Page from Strategy ──────────────────────────────────────────
const AutoGeneratePage: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (page: SavedPage) => void;
}> = ({ open, onOpenChange, onGenerated }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('ft-saas-clean');
  const [selectedCategory, setSelectedCategory] = useState<string>('landing');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState<'select' | 'template' | 'product' | 'generating' | 'done'>('select');
  const [progress, setProgress] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const estabId = localStorage.getItem('estabelecimentoId');
      if (!estabId) { setLoading(false); return; }
      const { data } = await supabase
        .from('strategy_projects')
        .select('id, nome, descricao_negocio, strategic_memory, updated_at')
        .eq('estabelecimento_id', estabId)
        .order('updated_at', { ascending: false })
        .limit(20);
      const projs = data || [];
      setProjects(projs);
      if (projs.length > 0) setSelectedProject(projs[0].id);
      setLoading(false);
      setStep('select');
      setProgress([]);
    })();
  }, [open]);

  const extractText = (obj: any, key: string): string => {
    if (!obj) return '';
    if (typeof obj[key] === 'string') return obj[key];
    return '';
  };

  const extractArray = (obj: any, ...keys: string[]): any[] => {
    if (!obj) return [];
    for (const k of keys) {
      if (Array.isArray(obj[k])) return obj[k];
    }
    return [];
  };

  const generatePage = async () => {
    const project = projects.find(p => p.id === selectedProject);
    if (!project) return;

    setGenerating(true);
    setStep('generating');
    const mem: Record<string, any> = (project.strategic_memory as Record<string, any>) || {};
    const sections: PageSection[] = [];
    const addProgress = (msg: string) => setProgress(prev => [...prev, msg]);

    // ── Fetch ALL artifacts (including custom agents) ──
    addProgress('📦 Buscando TODOS os artefatos do projeto...');
    const { data: artifacts } = await supabase
      .from('strategy_artifacts')
      .select('tipo, conteudo')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false });
    const artMap = new Map<string, any>();
    for (const art of (artifacts || [])) {
      if (!artMap.has(art.tipo)) artMap.set(art.tipo, art.conteudo);
    }

    // Merge memory + artifacts for complete data
    const allData: Record<string, any> = { ...mem };
    artMap.forEach((val, key) => {
      if (!allData[key]) allData[key] = val;
    });

    const agentKeys = Object.keys(allData);
    addProgress(`✅ ${agentKeys.length} agentes encontrados: ${agentKeys.slice(0, 8).join(', ')}${agentKeys.length > 8 ? '...' : ''}`);

    // ── Call AI to generate compelling marketing copy ──
    addProgress('🤖 Gerando textos de marketing com IA...');
    
    const summaryForAI = JSON.stringify({
      nome_negocio: project.nome,
      descricao: project.descricao_negocio,
      agentes_disponiveis: agentKeys,
      dados: Object.fromEntries(
        Object.entries(allData).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v).slice(0, 1500) : String(v).slice(0, 500)])
      ),
    });

    let aiCopy: any = null;
    try {
      const { data: aiResult, error: aiError } = await supabase.functions.invoke('strategy-engine', {
        body: {
          action: 'generate_page_copy',
          projectId: project.id,
          contextSummary: summaryForAI,
        }
      });
      if (!aiError && aiResult?.success && aiResult?.copy) {
        aiCopy = aiResult.copy;
        addProgress('✨ Textos de marketing gerados com sucesso!');
      } else {
        addProgress('⚠️ IA indisponível — usando dados diretos dos agentes...');
      }
    } catch {
      addProgress('⚠️ IA indisponível — usando dados diretos dos agentes...');
    }

    // Helper functions
    const collectAlternatives = (sources: { agent: string; icon: string; data: any; keys: string[] }[]): { agent: string; icon: string; text: string }[] => {
      const alts: { agent: string; icon: string; text: string }[] = [];
      for (const src of sources) {
        if (!src.data) continue;
        for (const key of src.keys) {
          const val = src.data[key];
          if (typeof val === 'string' && val.length > 5) {
            if (!alts.find(a => a.text === val)) {
              alts.push({ agent: src.agent, icon: src.icon, text: val });
            }
            break;
          }
        }
      }
      return alts;
    };

    const getData = (key: string) => allData[key] || null;

    const pos = getData('positioning');
    const vox = getData('vox');
    const lp = getData('landing_page');
    const creative = getData('creative');
    const influencer = getData('influencer_content');
    const funnel = getData('funnel');
    const vsl = getData('vsl');
    const videoProd = getData('video_producer');
    const seoData = getData('seo');
    const emailData = getData('email');
    const socialData = getData('social_media');
    const reelData = getData('reel');
    const cipherData = getData('cipher');
    const paidMedia = getData('paid_media');
    const siteBuilder = getData('site_builder');

    // ── 1. Hero Section ──
    addProgress('🎯 Construindo Hero com textos persuasivos...');
    const heroHeadline = aiCopy?.hero_headline 
      || pos?.proposta_unica || pos?.headline || lp?.headline || lp?.hero_headline 
      || creative?.headline || project.descricao_negocio || 'Transforme Seus Resultados Agora';
    const heroSub = aiCopy?.hero_subheadline
      || pos?.subheadline || pos?.descricao || lp?.subheadline || lp?.hero_subheadline
      || vox?.dor_principal || seoData?.meta_description || 'Descubra a solução que vai revolucionar seu negócio.';
    const heroCta = aiCopy?.hero_cta
      || lp?.cta_text || lp?.hero_cta || creative?.cta || 'Quero Começar Agora';

    const headlineAlts = collectAlternatives([
      { agent: 'IA Marketing', icon: '🤖', data: aiCopy, keys: ['hero_headline'] },
      { agent: 'Posicionamento', icon: '🎯', data: pos, keys: ['proposta_unica', 'headline', 'titulo', 'proposta_valor', 'slogan'] },
      { agent: 'Landing Page', icon: '🏗️', data: lp, keys: ['headline', 'hero_headline', 'titulo', 'h1'] },
      { agent: 'SEO', icon: '🔎', data: seoData, keys: ['titulo_pagina', 'title', 'h1'] },
      { agent: 'Criativos', icon: '🎨', data: creative, keys: ['headline', 'titulo_principal', 'gancho'] },
    ]);
    const subAlts = collectAlternatives([
      { agent: 'IA Marketing', icon: '🤖', data: aiCopy, keys: ['hero_subheadline'] },
      { agent: 'Posicionamento', icon: '🎯', data: pos, keys: ['descricao', 'subheadline', 'subtitulo', 'proposta_descricao'] },
      { agent: 'Landing Page', icon: '🏗️', data: lp, keys: ['subheadline', 'hero_subheadline', 'subtitulo', 'descricao'] },
      { agent: 'Voz do Cliente', icon: '🎙️', data: vox, keys: ['dor_principal', 'resumo', 'perfil_cliente'] },
    ]);
    const ctaAlts = collectAlternatives([
      { agent: 'IA Marketing', icon: '🤖', data: aiCopy, keys: ['hero_cta'] },
      { agent: 'Landing Page', icon: '🏗️', data: lp, keys: ['cta_text', 'hero_cta', 'botao_principal'] },
      { agent: 'Criativos', icon: '🎨', data: creative, keys: ['cta', 'cta_text', 'chamada_acao'] },
    ]);

    sections.push({
      id: `auto-hero-${Date.now()}`, type: 'hero', title: 'Hero Principal', visible: true, styles: {},
      content: {
        headline: heroHeadline,
        subheadline: heroSub,
        cta_text: heroCta,
        cta_url: '#contato',
        background_image: '',
        _alt_headline: headlineAlts,
        _alt_subheadline: subAlts,
        _alt_cta_text: ctaAlts,
        _media_suggestion: '🖼️ Insira uma imagem de fundo impactante que represente seu negócio.',
      }
    });

    // ── 2. Social Proof ──
    addProgress('📊 Extraindo métricas e prova social...');
    const socialProofItems: any[] = [];
    if (aiCopy?.social_proof && Array.isArray(aiCopy.social_proof)) {
      aiCopy.social_proof.forEach((sp: any) => socialProofItems.push(sp));
    }
    if (socialProofItems.length === 0) {
      const numSources = [pos, lp, funnel, cipherData, socialData, emailData];
      const numKeys = ['clientes', 'usuarios', 'cases', 'resultados', 'metricas', 'numeros', 'stats', 'kpis', 'social_proof', 'provas_numericas'];
      for (const src of numSources) {
        if (!src) continue;
        for (const key of numKeys) {
          const val = src[key];
          if (Array.isArray(val)) {
            val.slice(0, 4).forEach((item: any) => {
              if (typeof item === 'object' && item) {
                socialProofItems.push({ number: item.numero || item.number || item.valor || '?', label: item.label || item.nome || item.descricao || '' });
              }
            });
          }
        }
      }
      if (vox?.tamanho_mercado) socialProofItems.push({ number: vox.tamanho_mercado, label: 'Tamanho do Mercado' });
    }
    if (socialProofItems.length === 0) {
      socialProofItems.push({ number: '1000+', label: 'Clientes Atendidos' }, { number: '98%', label: 'Satisfação' }, { number: '24/7', label: 'Suporte' });
    }
    sections.push({
      id: `auto-social-${Date.now()}`, type: 'social_proof', title: '📊 Prova Social', visible: true, styles: {},
      content: { items: socialProofItems.slice(0, 4) }
    });

    // ── 3. Image — generate with AI if product selected ──
    let mainImageUrl = '';
    let mainImageAlt = 'Imagem do produto/serviço';
    const selectedProd = selectedProduct ? products.find(p => p.id === selectedProduct) : null;

    if (selectedProd) {
      addProgress(`📸 Gerando imagem publicitária do produto "${selectedProd.nome}" com IA...`);
      try {
        const { data: mediaResult, error: mediaError } = await supabase.functions.invoke('strategy-engine', {
          body: {
            action: 'generate_page_media',
            mediaType: 'image',
            productName: selectedProd.nome,
            productDescription: selectedProd.descricao || '',
            productImageUrl: selectedProd.foto_url || '',
            marketingContext: `Headline: ${heroHeadline}. ${project.descricao_negocio || ''}`,
          }
        });
        if (!mediaError && mediaResult?.success && mediaResult?.generatedImageUrl) {
          mainImageUrl = mediaResult.generatedImageUrl;
          mainImageAlt = mediaResult.data?.alt_text || `Anúncio - ${selectedProd.nome}`;
          addProgress('✅ Imagem publicitária gerada com sucesso!');
        } else {
          addProgress('⚠️ Não foi possível gerar imagem — usando placeholder...');
        }
      } catch {
        addProgress('⚠️ Erro na geração de imagem — usando placeholder...');
      }
    } else {
      addProgress('📸 Reservando espaço para imagem principal...');
    }
    const imgSuggestion = aiCopy?.image_suggestion || creative?.conceito_visual || creative?.estilo_visual || 'Imagem profissional do produto';
    sections.push({
      id: `auto-img-${Date.now()}`, type: 'image', title: '📸 Imagem Principal', visible: true, styles: {},
      content: { url: mainImageUrl, alt: mainImageAlt, caption: mainImageUrl ? (selectedProd?.nome || '') : imgSuggestion, fit: 'cover', _media_suggestion: mainImageUrl ? '' : `🖼️ ${imgSuggestion}` }
    });

    // ── 4. Features ──
    addProgress('⚡ Montando diferenciais com títulos persuasivos...');
    let featureItems: any[] = [];
    if (aiCopy?.features && Array.isArray(aiCopy.features)) {
      featureItems = aiCopy.features.slice(0, 6);
    }
    if (featureItems.length === 0) {
      const featureSources = [
        extractArray(pos, 'diferenciais', 'features', 'beneficios', 'pontos_fortes'),
        extractArray(lp, 'features', 'recursos', 'beneficios', 'diferenciais'),
        extractArray(funnel, 'etapas', 'stages', 'features'),
        extractArray(creative, 'beneficios', 'features'),
        extractArray(cipherData, 'diferenciais', 'vantagens_competitivas', 'pontos_fortes'),
        extractArray(paidMedia, 'beneficios', 'argumentos', 'features'),
      ].filter(arr => arr.length > 0);

      const allFeats: any[] = [];
      for (const source of featureSources) {
        for (const f of source) {
          const title = typeof f === 'string' ? f.slice(0, 50) : (f.title || f.titulo || f.name || f.nome || '');
          if (title && !allFeats.find(e => e.title === title)) {
            allFeats.push({
              icon: f.icon || f.icone || ['🚀', '⚡', '🎯', '💡', '🔒', '📊'][allFeats.length % 6],
              title,
              description: typeof f === 'string' ? f : (f.description || f.descricao || f.texto || ''),
            });
          }
        }
      }
      featureItems = allFeats.slice(0, 6);
    }
    if (featureItems.length === 0) {
      featureItems = [
        { icon: '🚀', title: 'Agilidade', description: 'Descreva seu diferencial aqui' },
        { icon: '🎯', title: 'Precisão', description: 'Descreva seu diferencial aqui' },
        { icon: '💡', title: 'Inovação', description: 'Descreva seu diferencial aqui' },
      ];
    }
    sections.push({
      id: `auto-feat-${Date.now()}`, type: 'features', title: aiCopy?.features_title || 'Por Que Nos Escolher', visible: true, styles: {},
      content: { items: featureItems }
    });

    // ── 5. Process Steps ──
    addProgress('🔄 Montando etapas do processo...');
    let processItems: any[] = [];
    if (aiCopy?.process_steps && Array.isArray(aiCopy.process_steps)) {
      processItems = aiCopy.process_steps;
    }
    if (processItems.length === 0) {
      const rawSteps = [
        ...extractArray(funnel, 'etapas', 'stages', 'passos', 'steps', 'jornada'),
        ...extractArray(lp, 'steps', 'como_funciona', 'etapas', 'processo'),
        ...extractArray(pos, 'jornada_cliente', 'processo', 'etapas'),
      ];
      if (rawSteps.length > 0) {
        processItems = rawSteps.slice(0, 5).map((s: any, i: number) => ({
          step: `${i + 1}`,
          title: typeof s === 'string' ? s.slice(0, 40) : (s.title || s.titulo || s.name || s.nome || s.etapa || `Etapa ${i + 1}`),
          description: typeof s === 'string' ? s : (s.description || s.descricao || s.texto || s.acao || ''),
        }));
      }
    }
    if (processItems.length >= 2) {
      sections.push({
        id: `auto-process-${Date.now()}`, type: 'process_steps', title: '🔄 Como Funciona', visible: true, styles: {},
        content: { title: aiCopy?.process_title || 'Como Funciona', items: processItems }
      });
    }

    // ── 6. About text ──
    addProgress('📝 Criando seção sobre o negócio...');
    const aboutText = aiCopy?.about_text
      || pos?.historia || pos?.manifesto || pos?.narrativa || pos?.storytelling
      || vox?.resumo || seoData?.conteudo_principal
      || project.descricao_negocio || 'Conte a história do seu negócio aqui.';
    const aboutAlts = collectAlternatives([
      { agent: 'IA Marketing', icon: '🤖', data: aiCopy, keys: ['about_text'] },
      { agent: 'Posicionamento', icon: '🎯', data: pos, keys: ['historia', 'sobre', 'manifesto', 'narrativa', 'storytelling'] },
      { agent: 'Voz do Cliente', icon: '🎙️', data: vox, keys: ['perfil_cliente', 'resumo', 'contexto'] },
      { agent: 'SEO', icon: '🔎', data: seoData, keys: ['conteudo_principal', 'about', 'sobre'] },
    ]);
    sections.push({
      id: `auto-about-${Date.now()}`, type: 'text', title: aiCopy?.about_title || 'Nossa História', visible: true, styles: {},
      content: { body: aboutText, alignment: 'center', _alt_body: aboutAlts }
    });

    // ── 7. Video — generate storyboard with AI if product selected ──
    let videoContent: Record<string, any> = { url: '', poster: '', autoplay: false };
    if (selectedProd) {
      addProgress(`🎬 Gerando roteiro de vídeo para "${selectedProd.nome}" com IA...`);
      try {
        const { data: videoResult, error: videoError } = await supabase.functions.invoke('strategy-engine', {
          body: {
            action: 'generate_page_media',
            mediaType: 'video',
            productName: selectedProd.nome,
            productDescription: selectedProd.descricao || '',
            productImageUrl: selectedProd.foto_url || '',
            marketingContext: `Headline: ${heroHeadline}. ${project.descricao_negocio || ''}`,
          }
        });
        if (!videoError && videoResult?.success && videoResult?.data) {
          const vd = videoResult.data;
          videoContent = {
            url: '',
            poster: mainImageUrl || selectedProd.foto_url || '',
            autoplay: false,
            _video_prompt: vd.video_prompt || '',
            _storyboard: vd.storyboard || [],
            _headline_overlay: vd.headline_overlay || '',
            _cta_overlay: vd.cta_overlay || '',
            _media_suggestion: `🎬 Roteiro gerado pela IA: ${vd.headline_overlay || ''}. Use o AI Creative Studio para produzir o vídeo.`,
          };
          addProgress('✅ Roteiro de vídeo gerado com sucesso!');
        } else {
          const videoSuggestion = aiCopy?.video_suggestion || vsl?.titulo || vsl?.gancho || videoProd?.conceito || 'Grave um vídeo de apresentação do seu negócio.';
          videoContent._media_suggestion = `🎬 ${videoSuggestion}`;
          addProgress('⚠️ Não foi possível gerar roteiro — usando sugestão...');
        }
      } catch {
        const videoSuggestion = aiCopy?.video_suggestion || vsl?.titulo || 'Grave um vídeo de apresentação.';
        videoContent._media_suggestion = `🎬 ${videoSuggestion}`;
        addProgress('⚠️ Erro na geração de roteiro — usando sugestão...');
      }
    } else {
      addProgress('🎬 Reservando espaço para vídeo...');
      const videoSuggestion = aiCopy?.video_suggestion || vsl?.titulo || vsl?.gancho || videoProd?.conceito || 'Grave um vídeo de apresentação do seu negócio.';
      videoContent._media_suggestion = `🎬 ${videoSuggestion}`;
    }
    sections.push({
      id: `auto-video-${Date.now()}`, type: 'video', title: '🎬 Vídeo de Apresentação', visible: true, styles: {},
      content: videoContent
    });

    // ── 8. Testimonials ──
    addProgress('💬 Montando depoimentos...');
    let testimonialItems: any[] = [];
    if (aiCopy?.testimonials && Array.isArray(aiCopy.testimonials)) {
      testimonialItems = aiCopy.testimonials;
    }
    if (testimonialItems.length === 0) {
      const rawTest = [
        ...extractArray(lp, 'testimonials', 'depoimentos', 'provas_sociais'),
        ...extractArray(vox, 'depoimentos', 'testimonials', 'provas_sociais', 'cases_sucesso'),
        ...extractArray(pos, 'depoimentos', 'cases', 'testimonials'),
        ...extractArray(funnel, 'depoimentos', 'cases', 'resultados'),
      ];
      if (rawTest.length > 0) {
        testimonialItems = rawTest.slice(0, 6).map((t: any) => ({
          name: t.name || t.nome || t.cliente || 'Cliente',
          role: t.role || t.cargo || t.empresa || '',
          text: t.text || t.texto || t.depoimento || t.citacao || t.quote || '',
          metrics: t.metrics || t.resultado || '',
        }));
      }
    }
    if (testimonialItems.length === 0) {
      testimonialItems = [
        { name: 'Cliente Satisfeito', role: 'Empresa', text: 'Insira um depoimento real aqui com números e resultados concretos.', metrics: '' },
        { name: 'Outro Cliente', role: 'Empresa', text: 'Mais um depoimento. Inclua métricas de resultado para credibilidade.', metrics: '' },
        { name: 'Terceiro Cliente', role: 'Empresa', text: 'Um terceiro depoimento. Quanto mais específico, melhor.', metrics: '' },
      ];
    }
    sections.push({
      id: `auto-test-${Date.now()}`, type: 'testimonials', title: aiCopy?.testimonials_title || 'O Que Nossos Clientes Dizem', visible: true, styles: {},
      content: { items: testimonialItems }
    });

    // ── 9. Objections ──
    addProgress('🚫 Extraindo objeções e respostas...');
    let objectionItems: any[] = [];
    if (aiCopy?.objections && Array.isArray(aiCopy.objections)) {
      objectionItems = aiCopy.objections;
    }
    if (objectionItems.length === 0) {
      const rawObj = [
        ...extractArray(vox, 'objecoes', 'objections', 'barreiras', 'medos', 'duvidas'),
        ...extractArray(pos, 'objecoes', 'barreiras', 'resistencias'),
        ...extractArray(lp, 'objecoes', 'objections', 'quebra_objecoes'),
        ...extractArray(cipherData, 'objecoes', 'fraquezas_concorrentes'),
      ];
      if (rawObj.length > 0) {
        objectionItems = rawObj.slice(0, 5).map((o: any) => ({
          objection: typeof o === 'string' ? o : (o.objecao || o.objection || o.barreira || o.duvida || ''),
          response: typeof o === 'string' ? 'Responda aqui.' : (o.resposta || o.response || o.solucao || o.contra_argumento || ''),
        }));
      }
    }
    if (objectionItems.length > 0) {
      sections.push({
        id: `auto-obj-${Date.now()}`, type: 'objections', title: aiCopy?.objections_title || '🚫 Ainda Tem Dúvidas?', visible: true, styles: {},
        content: { title: aiCopy?.objections_title || 'Ainda tem dúvidas?', items: objectionItems }
      });
    }

    // ── 10. Guarantee ──
    addProgress('🛡️ Montando seção de garantia...');
    let guaranteeData = {
      title: aiCopy?.guarantee_title || 'Garantia Total',
      description: aiCopy?.guarantee_description || '',
      icon: '🛡️',
      duration: aiCopy?.guarantee_duration || '',
    };
    if (!guaranteeData.description) {
      const rawGuarantee = pos?.garantia || lp?.garantia || lp?.guarantee || funnel?.garantia;
      if (rawGuarantee) {
        if (typeof rawGuarantee === 'string') {
          guaranteeData.description = rawGuarantee;
        } else {
          guaranteeData.title = rawGuarantee.titulo || rawGuarantee.title || guaranteeData.title;
          guaranteeData.description = rawGuarantee.descricao || rawGuarantee.description || rawGuarantee.texto || '';
          guaranteeData.duration = rawGuarantee.duracao || rawGuarantee.prazo || '';
        }
      }
    }
    if (!guaranteeData.description) {
      guaranteeData.description = 'Se você não ficar 100% satisfeito, devolvemos seu dinheiro. Sem burocracia, sem perguntas.';
      guaranteeData.duration = '30 dias';
    }
    sections.push({
      id: `auto-guarantee-${Date.now()}`, type: 'guarantee', title: '🛡️ Garantia', visible: true, styles: {},
      content: guaranteeData
    });

    // ── 11. Pricing ──
    addProgress('💰 Montando preços...');
    let pricingItems: any[] = [];
    if (aiCopy?.pricing && Array.isArray(aiCopy.pricing)) {
      pricingItems = aiCopy.pricing;
    }
    if (pricingItems.length === 0) {
      const rawPricing = [
        ...extractArray(lp, 'planos', 'pricing', 'precos', 'tabela_precos'),
        ...extractArray(funnel, 'planos', 'ofertas', 'precos'),
        ...extractArray(pos, 'planos', 'precos', 'ofertas'),
      ];
      if (rawPricing.length > 0) {
        pricingItems = rawPricing.slice(0, 3).map((p: any, i: number) => ({
          name: p.name || p.nome || p.plano || `Plano ${i + 1}`,
          price: p.price || p.preco || p.valor || 'Consulte',
          features: Array.isArray(p.features || p.recursos || p.beneficios) ? (p.features || p.recursos || p.beneficios) : [],
          highlighted: i === 1,
        }));
      }
    }
    if (pricingItems.length > 0) {
      sections.push({
        id: `auto-pricing-${Date.now()}`, type: 'pricing', title: aiCopy?.pricing_title || '💰 Planos e Preços', visible: true, styles: {},
        content: { title: aiCopy?.pricing_title || 'Escolha seu Plano', items: pricingItems }
      });
    }

    // ── 12. Gallery ──
    addProgress('🖼️ Reservando galeria...');
    sections.push({
      id: `auto-gallery-${Date.now()}`, type: 'gallery', title: '📸 Galeria', visible: true, styles: {},
      content: { images: [], _media_suggestion: '🖼️ Adicione 3-6 fotos profissionais do produto, serviço ou bastidores.' }
    });

    // ── 13. FAQ ──
    addProgress('❓ Montando FAQ...');
    let faqItems: any[] = [];
    if (aiCopy?.faq && Array.isArray(aiCopy.faq)) {
      faqItems = aiCopy.faq;
    }
    if (faqItems.length === 0) {
      const rawFaq = [
        ...extractArray(lp, 'faq', 'perguntas_frequentes'),
        ...extractArray(seoData, 'faq', 'perguntas', 'perguntas_frequentes'),
        ...extractArray(vox, 'duvidas_frequentes', 'faq', 'perguntas'),
      ];
      if (rawFaq.length > 0) {
        faqItems = rawFaq.slice(0, 7).map((q: any) => ({
          question: q.question || q.pergunta || '',
          answer: q.answer || q.resposta || '',
        }));
      }
    }
    if (faqItems.length === 0) {
      faqItems = [
        { question: 'Como funciona?', answer: 'Descreva como funciona.' },
        { question: 'Quais os diferenciais?', answer: 'Liste seus diferenciais.' },
        { question: 'Como entro em contato?', answer: 'Informe seus canais.' },
      ];
    }
    sections.push({
      id: `auto-faq-${Date.now()}`, type: 'faq', title: 'FAQ', visible: true, styles: {},
      content: { items: faqItems }
    });

    // ── 14. CTA Final ──
    addProgress('🎯 Criando CTA final persuasivo...');
    const ctaFinalHeadline = aiCopy?.cta_final_headline
      || lp?.cta_headline || funnel?.cta_final || emailData?.assunto_principal
      || 'Pronto para Transformar Seus Resultados?';
    const ctaFinalDesc = aiCopy?.cta_final_description
      || lp?.cta_description || pos?.urgencia || pos?.chamada_acao
      || 'Não perca mais tempo. Entre em contato agora e descubra como podemos ajudar.';
    const ctaFinalButton = aiCopy?.cta_final_button || heroCta;

    const ctaHAlts = collectAlternatives([
      { agent: 'IA Marketing', icon: '🤖', data: aiCopy, keys: ['cta_final_headline'] },
      { agent: 'Landing Page', icon: '🏗️', data: lp, keys: ['cta_headline', 'cta_final_headline'] },
      { agent: 'Funil', icon: '📊', data: funnel, keys: ['cta_final', 'headline_conversao'] },
    ]);
    const ctaDAlts = collectAlternatives([
      { agent: 'IA Marketing', icon: '🤖', data: aiCopy, keys: ['cta_final_description'] },
      { agent: 'Posicionamento', icon: '🎯', data: pos, keys: ['chamada_acao', 'urgencia', 'promessa_final'] },
      { agent: 'Email', icon: '📧', data: emailData, keys: ['cta_description', 'preview_text'] },
    ]);

    sections.push({
      id: `auto-cta-${Date.now()}`, type: 'cta', title: 'CTA Final', visible: true, styles: {},
      content: {
        headline: ctaFinalHeadline,
        description: ctaFinalDesc,
        button_text: ctaFinalButton,
        button_url: '#contato',
        _alt_headline: ctaHAlts,
        _alt_description: ctaDAlts,
        _alt_button_text: ctaAlts,
      }
    });

    // ── 15. Footer ──
    const businessName = project.descricao_negocio?.split(/[.\n]/)?.[0]?.trim()?.slice(0, 60) || 'Sua Empresa';
    sections.push({
      id: `auto-footer-${Date.now()}`, type: 'footer', title: 'Rodapé', visible: true, styles: {},
      content: { company: businessName, copyright: `© ${new Date().getFullYear()} Todos os direitos reservados.` }
    });

    // ── Config & Save ──
    addProgress('🔍 Aplicando estilo do template e SEO...');
    const fullTpl = ALL_FULL_TEMPLATES.find(t => t.id === selectedTemplate);
    const tplConfig: Record<string, string> = (fullTpl?.config || {}) as Record<string, string>;
    const primaryColor = tplConfig.primaryColor || creative?.cor_primaria || creative?.cores?.primaria || '#0f172a';
    const accentColor = tplConfig.accentColor || creative?.cor_destaque || creative?.cores?.destaque || '#3b82f6';
    const bgColor = tplConfig.backgroundColor || '#ffffff';
    const txtColor = tplConfig.textColor || '#1f2937';
    const fontDisplay = tplConfig.fontDisplay || 'Inter';
    const maxWidth = tplConfig.maxWidth || '1200px';

    // AI-generated page name or smart fallback
    const pageName = aiCopy?.page_name || `${project.nome} — Página de Vendas`;
    const uniqueSuffix = Date.now().toString(36);
    const slug = generateSlug(`${pageName} ${uniqueSuffix}`);
    const estabId = localStorage.getItem('estabelecimentoId');

    const seoTitle = aiCopy?.seo_title || seoData?.titulo_pagina || seoData?.title || pageName;
    const seoDesc = aiCopy?.seo_description || seoData?.meta_description || seoData?.descricao || project.descricao_negocio || '';

    const { data: saved, error } = await supabase.from('published_pages').insert({
      nome: pageName, slug,
      sections: sections as any,
      config: {
        title: seoTitle,
        description: seoDesc,
        favicon: '', primaryColor, secondaryColor: '#1e293b',
        accentColor, backgroundColor: bgColor, textColor: txtColor,
        fontDisplay, fontBody: fontDisplay, maxWidth,
      } as any,
      estabelecimento_id: estabId,
      publicado: false,
    }).select().single();

    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      setStep('select');
    } else {
      addProgress('✅ Página de vendas gerada com sucesso!');
      setStep('done');
      toast.success('Página de vendas completa gerada! 🎉');
      setTimeout(() => {
        onGenerated(saved as unknown as SavedPage);
        onOpenChange(false);
      }, 1500);
    }
    setGenerating(false);
  };

  const selectedProj = projects.find(p => p.id === selectedProject);
  const agentCount = selectedProj ? Object.keys((selectedProj.strategic_memory as Record<string, any>) || {}).length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("bg-background", step === 'template' ? 'sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col' : 'sm:max-w-2xl')}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Gerar Página Automática
            {step === 'template' && (
              <Badge variant="outline" className="ml-auto text-[10px]">Passo 2 de 3</Badge>
            )}
            {step === 'product' && (
              <Badge variant="outline" className="ml-auto text-[10px]">Passo 3 de 3</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum projeto de estratégia encontrado.</p>
            <p className="text-xs text-muted-foreground mt-1">Crie um projeto no Motor de Estratégia primeiro.</p>
          </div>
        ) : step === 'select' ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong>Passo 1:</strong> Selecione o projeto do Motor de Estratégia que será usado como base.
            </p>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Projeto</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span>{p.nome}</span>
                        <Badge variant="outline" className="text-[10px] ml-auto">
                          {Object.keys((p.strategic_memory as Record<string, any>) || {}).length} agentes
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProj && (
              <Card className="p-3 space-y-2 bg-muted/30">
                <p className="text-xs font-semibold">{selectedProj.nome}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{selectedProj.descricao_negocio}</p>
                {agentCount > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.keys((selectedProj.strategic_memory as Record<string, any>) || {}).map(key => {
                      const info = (AGENT_INFO_MAP as any)[key];
                      return (
                        <Badge key={key} variant="secondary" className="text-[10px] gap-0.5">
                          {info?.icon || '🔹'} {info?.name || key}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            <Button 
              onClick={() => {
                setStep('template');
              }} 
              disabled={!selectedProject} 
              className="w-full gap-2"
            >
              Próximo: Escolher Estilo <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
            </Button>
          </div>
        ) : step === 'template' ? (
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <strong>Passo 2:</strong> Escolha o template completo (layout + estilo visual).
              </p>
              <Button variant="ghost" size="sm" onClick={() => setStep('select')} className="text-xs gap-1">
                ← Voltar
              </Button>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {FULL_TEMPLATE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    const currentInCat = cat.templates.find(t => t.id === selectedTemplate);
                    if (!currentInCat && cat.templates.length > 0) {
                      setSelectedTemplate(cat.templates[0].id);
                    }
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border',
                    selectedCategory === cat.id
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                  <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-0.5">{cat.templates.length}</Badge>
                </button>
              ))}
            </div>

            {/* Template Grid with Mini Previews */}
            <ScrollArea className="flex-1 min-h-0 pr-2">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {FULL_TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.templates.map(ft => {
                  const isSelected = selectedTemplate === ft.id;
                  return (
                    <button
                      key={ft.id}
                      onClick={() => setSelectedTemplate(ft.id)}
                      className={cn(
                        'relative flex flex-col rounded-xl border-2 transition-all text-left group overflow-hidden',
                        isSelected
                          ? 'border-primary shadow-lg ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50 hover:shadow-md'
                      )}
                    >
                      {/* Mini Preview */}
                      <div className="h-[140px] w-full overflow-hidden bg-muted/20 relative">
                        <TemplateMiniPreview config={ft.config} sectionTypes={ft.sections.map(s => s.type)} />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 z-10">
                            <CheckCircle2 className="h-5 w-5 text-primary drop-shadow-lg" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="px-3 py-2.5 space-y-1">
                        <p className={cn('text-xs font-semibold', isSelected ? 'text-primary' : 'text-foreground')}>{ft.name}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">{ft.description}</p>
                        <div className="flex items-center gap-1 pt-0.5">
                          {[ft.config.primaryColor, ft.config.accentColor, ft.config.backgroundColor].filter(Boolean).map((c, i) => (
                            <div key={i} className="w-3 h-3 rounded-full border border-border shadow-sm" style={{ backgroundColor: c }} />
                          ))}
                          <span className="text-[9px] text-muted-foreground ml-1">{ft.sections.length} seções</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Selected Template Footer */}
            {(() => {
              const currentFt = ALL_FULL_TEMPLATES.find(t => t.id === selectedTemplate);
              if (!currentFt) return null;
              return (
                <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: `linear-gradient(135deg, ${currentFt.config.primaryColor}, ${currentFt.config.backgroundColor})` }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white drop-shadow-sm">{currentFt.name}</p>
                    <p className="text-[10px] text-white/70">{currentFt.description}</p>
                  </div>
                  <div className="flex gap-1">
                    {[currentFt.config.primaryColor, currentFt.config.accentColor].filter(Boolean).map((c, i) => (
                      <div key={i} className="w-5 h-5 rounded-full border-2 border-white/30 shadow-lg" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              );
            })()}

            <Button
              onClick={async () => {
                // Fetch products for selection
                setLoadingProducts(true);
                const estabId = localStorage.getItem('estabelecimentoId');
                if (estabId) {
                  const { data } = await supabase
                    .from('produtos')
                    .select('id, nome, codigo, foto_url, descricao, preco_tabela, marca')
                    .eq('estabelecimento_id', estabId)
                    .eq('ativo', true)
                    .order('nome')
                    .limit(100);
                  setProducts(data || []);
                }
                setLoadingProducts(false);
                setStep('product');
              }}
              disabled={generating}
              className="w-full gap-2"
            >
              <Package className="h-4 w-4" /> Próximo: Selecionar Produto
            </Button>
          </div>
        ) : step === 'product' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <strong>Passo 3:</strong> Selecione o produto (opcional) para gerar imagem e vídeo com IA.
              </p>
              <Button variant="ghost" size="sm" onClick={() => setStep('template')} className="text-xs gap-1">
                ← Voltar
              </Button>
            </div>

            {/* Search */}
            <Input
              placeholder="🔍 Buscar produto por nome ou código..."
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              className="text-sm"
            />

            {loadingProducts ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <ScrollArea className="h-[300px] pr-2">
                <div className="space-y-2">
                  {/* Option: No product */}
                  <button
                    onClick={() => setSelectedProduct('')}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                      !selectedProduct
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-lg">🚫</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Sem produto específico</p>
                      <p className="text-[11px] text-muted-foreground">Gerar página apenas com dados da estratégia</p>
                    </div>
                    {!selectedProduct && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                  </button>

                  {/* Products */}
                  {products
                    .filter(p => {
                      if (!productSearch) return true;
                      const search = productSearch.toLowerCase();
                      return (p.nome || '').toLowerCase().includes(search) || (p.codigo || '').toLowerCase().includes(search);
                    })
                    .map(product => {
                      const isSelected = selectedProduct === product.id;
                      return (
                        <button
                          key={product.id}
                          onClick={() => setSelectedProduct(product.id)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                            isSelected
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border hover:border-primary/40'
                          )}
                        >
                          {product.foto_url ? (
                            <img src={product.foto_url} alt={product.nome} className="w-12 h-12 rounded-lg object-cover border" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-lg">📦</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.nome}</p>
                            <div className="flex items-center gap-2">
                              {product.codigo && <span className="text-[10px] text-muted-foreground">#{product.codigo}</span>}
                              {product.marca && <Badge variant="outline" className="text-[9px] h-4">{product.marca}</Badge>}
                              {product.preco_tabela && (
                                <span className="text-[10px] font-semibold text-primary">
                                  R$ {Number(product.preco_tabela).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                        </button>
                      );
                    })}

                  {products.length === 0 && !loadingProducts && (
                    <div className="text-center py-6">
                      <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Nenhum produto encontrado.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {/* Selected product info */}
            {selectedProduct && (() => {
              const prod = products.find(p => p.id === selectedProduct);
              if (!prod) return null;
              return (
                <Card className="p-3 flex items-center gap-3 bg-primary/5 border-primary/30">
                  {prod.foto_url ? (
                    <img src={prod.foto_url} alt={prod.nome} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">📦</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{prod.nome}</p>
                    <p className="text-[10px] text-muted-foreground">🖼️ Imagem + 🎬 Vídeo serão gerados com IA</p>
                  </div>
                  <ImagePlus className="h-4 w-4 text-primary" />
                </Card>
              );
            })()}

            <Button
              onClick={generatePage}
              disabled={generating}
              className="w-full gap-2"
            >
              <Zap className="h-4 w-4" /> {selectedProduct ? 'Gerar Página com Produto e IA' : 'Gerar Página com Este Tema'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 py-4">
            <div className="space-y-2">
              {progress.map((msg, i) => (
                <div key={i} className="flex items-center gap-2 text-sm animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${i * 100}ms` }}>
                  {step === 'done' || i < progress.length - 1 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  )}
                  <span className={i === progress.length - 1 && step !== 'done' ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                    {msg}
                  </span>
                </div>
              ))}
            </div>
            {step === 'done' && (
              <div className="text-center pt-4">
                <Badge variant="default" className="text-sm px-4 py-1.5 gap-1.5">
                  <Sparkles className="h-4 w-4" /> Página pronta para edição!
                </Badge>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// AGENT_INFO reference for the auto-generator
const AGENT_INFO_MAP: Record<string, { name: string; icon: string }> = {
  vox: { name: 'Voz do Cliente', icon: '🎙️' },
  cipher: { name: 'Inteligência Competitiva', icon: '🔍' },
  positioning: { name: 'Posicionamento', icon: '🎯' },
  funnel: { name: 'Arquiteto de Funil', icon: '📊' },
  vsl: { name: 'Roteirista de Vídeo', icon: '🎬' },
  landing_page: { name: 'Landing Page', icon: '🏗️' },
  creative: { name: 'Criativos', icon: '🎨' },
  email: { name: 'Email Marketing', icon: '📧' },
  reel: { name: 'Roteirista de Reels', icon: '📱' },
  seo: { name: 'SEO & Conteúdo', icon: '🔎' },
  paid_media: { name: 'Mídia Paga', icon: '💰' },
  social_media: { name: 'Social Media', icon: '📲' },
  site_builder: { name: 'Site Builder', icon: '🌐' },
  video_producer: { name: 'Produtor de Vídeo', icon: '🎥' },
  influencer_content: { name: 'Influencer & Imagens', icon: '🤳' },
};

// ── Project Listing (Landing) ──────────────────────────────────────────────────
const PageBuilderLanding: React.FC<{
  onOpen: (page: SavedPage) => void;
  onCreateNew: () => void;
}> = ({ onOpen, onCreateNew }) => {
  const [pages, setPages] = useState<SavedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogAction, setDialogAction] = useState<{ type: 'rename' | 'duplicate' | 'delete' | 'publish' | 'unpublish'; page: SavedPage } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [processing, setProcessing] = useState(false);
  const [previewPage, setPreviewPage] = useState<SavedPage | null>(null);
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const load = useCallback(async () => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) { setLoading(false); return; }
    const { data } = await supabase.from('published_pages').select('*').eq('estabelecimento_id', estabId).order('updated_at', { ascending: false });
    setPages((data || []) as unknown as SavedPage[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDialog = (type: 'rename' | 'duplicate' | 'delete' | 'publish' | 'unpublish', page: SavedPage) => {
    setDialogAction({ type, page });
    if (type === 'rename') setRenameValue(page.nome);
  };

  const closeDialog = () => { setDialogAction(null); setProcessing(false); };

  const handleConfirm = async () => {
    if (!dialogAction) return;
    setProcessing(true);
    const { type, page } = dialogAction;

    try {
      switch (type) {
        case 'rename': {
          if (!renameValue.trim()) { setProcessing(false); return; }
          const slug = generateSlug(renameValue);
          const { error } = await supabase.from('published_pages').update({ nome: renameValue, slug }).eq('id', page.id);
          if (error) toast.error('Erro ao renomear');
          else toast.success('Página renomeada!');
          break;
        }
        case 'duplicate': {
          const estabId = localStorage.getItem('estabelecimentoId');
          if (!estabId) break;
          const newName = `${page.nome} (Cópia)`;
          const { error } = await supabase.from('published_pages').insert({
            nome: newName, slug: generateSlug(newName), sections: page.sections, config: page.config,
            estabelecimento_id: estabId, publicado: false,
          });
          if (error) toast.error('Erro ao duplicar');
          else toast.success('Página duplicada!');
          break;
        }
        case 'delete': {
          const { error } = await supabase.from('published_pages').delete().eq('id', page.id);
          if (error) toast.error('Erro ao excluir');
          else toast.success('Página excluída!');
          break;
        }
        case 'publish': {
          const { error } = await supabase.from('published_pages').update({ publicado: true }).eq('id', page.id);
          if (error) toast.error('Erro ao publicar');
          else toast.success('Página publicada! 🎉');
          break;
        }
        case 'unpublish': {
          const { error } = await supabase.from('published_pages').update({ publicado: false }).eq('id', page.id);
          if (error) toast.error('Erro ao despublicar');
          else toast.success('Página despublicada.');
          break;
        }
      }
    } catch { toast.error('Erro inesperado'); }

    closeDialog();
    load();
  };

  const getDialogContent = () => {
    if (!dialogAction) return { title: '', description: '', confirmLabel: '', variant: 'default' as const };
    const { type, page } = dialogAction;
    switch (type) {
      case 'rename': return { title: 'Renomear Página', description: `Altere o nome da página "${page.nome}".`, confirmLabel: 'Renomear', variant: 'default' as const };
      case 'duplicate': return { title: 'Duplicar Página', description: `Deseja criar uma cópia de "${page.nome}"? A cópia será salva como rascunho.`, confirmLabel: 'Duplicar', variant: 'default' as const };
      case 'delete': return { title: 'Excluir Página', description: `Tem certeza que deseja excluir "${page.nome}"? Esta ação não pode ser desfeita.`, confirmLabel: 'Excluir', variant: 'destructive' as const };
      case 'publish': return { title: 'Publicar Página', description: `Deseja publicar "${page.nome}"? Ela ficará acessível publicamente em /p/${page.slug}.`, confirmLabel: 'Publicar', variant: 'default' as const };
      case 'unpublish': return { title: 'Despublicar Página', description: `Deseja despublicar "${page.nome}"? Ela deixará de estar acessível publicamente.`, confirmLabel: 'Despublicar', variant: 'destructive' as const };
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const dialogContent = getDialogContent();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Page Builder</h2>
          <p className="text-sm text-muted-foreground">Crie e gerencie suas páginas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAutoGenerate(true)} className="gap-2">
            <Zap className="h-4 w-4" /> Gerar Automática
          </Button>
          <Button onClick={onCreateNew} className="gap-2"><Plus className="h-4 w-4" /> Nova Página</Button>
        </div>
      </div>

      {pages.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Globe className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-1">Nenhuma página criada</h3>
          <p className="text-sm text-muted-foreground mb-4">Comece criando sua primeira página</p>
          <Button onClick={onCreateNew} className="gap-2"><Plus className="h-4 w-4" /> Criar Página</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <button onClick={onCreateNew}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary hover:bg-primary/5 transition-all min-h-[200px]">
            <Plus className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Nova Página</span>
          </button>

          {pages.map(page => (
            <Card key={page.id} className="overflow-hidden group hover:shadow-md transition-shadow relative">
              {/* Context menu */}
              <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-7 w-7 shadow-sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover w-48">
                    <DropdownMenuItem onClick={() => onOpen(page)} className="gap-2 cursor-pointer">
                      <FolderOpen className="h-4 w-4" /> Abrir
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openDialog('rename', page)} className="gap-2 cursor-pointer">
                      <Pencil className="h-4 w-4" /> Renomear
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openDialog('duplicate', page)} className="gap-2 cursor-pointer">
                      <Copy className="h-4 w-4" /> Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {page.publicado ? (
                      <DropdownMenuItem onClick={() => openDialog('unpublish', page)} className="gap-2 cursor-pointer">
                        <ExternalLink className="h-4 w-4" /> Despublicar
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => openDialog('publish', page)} className="gap-2 cursor-pointer">
                        <Upload className="h-4 w-4" /> Publicar
                      </DropdownMenuItem>
                    )}
                    {page.publicado && (
                      <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/p/${page.slug}`); toast.success('URL copiada!'); }} className="gap-2 cursor-pointer">
                        <Link className="h-4 w-4" /> Copiar URL
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openDialog('delete', page)} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <button onClick={() => onOpen(page)}
                className="w-full h-32 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <Globe className="h-10 w-10 text-primary/30" />
              </button>
              <div className="p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm truncate flex-1">{page.nome}</h4>
                  {page.publicado && <Badge variant="default" className="text-[9px] h-4 ml-1">Publicada</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground">/p/{page.slug}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(page.updated_at).toLocaleString('pt-BR')}</p>
                <div className="flex gap-1 mt-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => onOpen(page)}>
                    Abrir Editor
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setPreviewPage(page)}>
                    <Eye className="h-3 w-3" /> Preview
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Unified action confirmation dialog */}
      <Dialog open={!!dialogAction} onOpenChange={() => closeDialog()}>
        <DialogContent className="bg-background sm:max-w-sm">
          <DialogHeader><DialogTitle>{dialogContent.title}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{dialogContent.description}</p>
          {dialogAction?.type === 'rename' && (
            <div className="space-y-2">
              <Label className="text-xs">Novo nome</Label>
              <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }} />
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={closeDialog} disabled={processing}>Cancelar</Button>
            <Button variant={dialogContent.variant} onClick={handleConfirm} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {dialogContent.confirmLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewPage} onOpenChange={() => setPreviewPage(null)}>
        <DialogContent className="bg-background max-w-[95vw] h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> Preview — {previewPage?.nome}
              {previewPage?.publicado && (
                <Button variant="outline" size="sm" className="ml-auto h-7 gap-1 text-xs" onClick={() => window.open(`${window.location.origin}/p/${previewPage.slug}`, '_blank')}>
                  <ExternalLink className="h-3 w-3" /> Abrir URL
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewPage && (
            <div className="flex-1 overflow-hidden rounded border" style={{ height: 'calc(90vh - 80px)' }}>
              <PreviewIframe sections={(previewPage.sections as any[]) || []} config={previewPage.config as any} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Auto Generate Dialog */}
      <AutoGeneratePage
        open={showAutoGenerate}
        onOpenChange={setShowAutoGenerate}
        onGenerated={(page) => {
          onOpen(page);
        }}
      />
    </div>
  );
};

// ── Editor Component ───────────────────────────────────────────────────────────
const PageBuilderEditor: React.FC<{
  initialPage?: SavedPage | null;
  onBack: () => void;
}> = ({ initialPage, onBack }) => {
  const [sections, setSections] = useState<PageSection[]>((initialPage?.sections as any[]) || []);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [config, setConfig] = useState<PageConfig>({
    title: 'Meu Site', description: '', favicon: '', primaryColor: '#1e40af', secondaryColor: '#3b82f6',
    accentColor: '#f59e0b', backgroundColor: '#ffffff', textColor: '#1f2937',
    fontDisplay: 'Inter', fontBody: 'Inter', maxWidth: '1200px',
    ...(initialPage?.config as any || {}),
  });
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [rightPanel, setRightPanel] = useState<'editor' | 'agent' | 'config'>('editor');
  const [leftTab, setLeftTab] = useState<'sections' | 'assets'>('sections');
  const [showAddSection, setShowAddSection] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(!initialPage && sections.length === 0);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);

  const [currentPageId, setCurrentPageId] = useState<string | null>(initialPage?.id || null);
  const [pageName, setPageName] = useState(initialPage?.nome || 'Meu Site');
  const [pageSlug, setPageSlug] = useState(initialPage?.slug || 'meu-site');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(initialPage?.publicado || false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [themeCategoryFilter, setThemeCategoryFilter] = useState(TEMPLATE_CATEGORIES[0]?.id || 'startup');
  const [fullTemplateCategoryFilter, setFullTemplateCategoryFilter] = useState(FULL_TEMPLATE_CATEGORIES[0]?.id || 'landing');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const selectedSection = sections.find(s => s.id === selectedSectionId) || null;

  // Track changes
  useEffect(() => { setHasChanges(true); }, [sections, config]);

  const handleBack = () => {
    if (hasChanges && sections.length > 0) {
      setShowUnsavedDialog(true);
      return;
    }
    onBack();
  };

  const handleSaveAndBack = async () => {
    await savePage();
    setShowUnsavedDialog(false);
    onBack();
  };

  const handleDiscardAndBack = () => {
    setShowUnsavedDialog(false);
    onBack();
  };

  const addSection = (type: PageSection['type'], content?: Record<string, any>) => {
    const id = `${type}-${Date.now()}`;
    const tpl = SECTION_TEMPLATES.find(t => t.type === type);
    setSections(prev => [...prev, { id, type, title: tpl?.label || type, visible: true, content: content || { ...defaultContent[type] }, styles: {} }]);
    setSelectedSectionId(id);
    setShowAddSection(false);
    setRightPanel('editor');
    toast.success(`Seção "${tpl?.label}" adicionada`);
  };

  const updateSection = (updated: PageSection) => setSections(prev => prev.map(s => s.id === updated.id ? updated : s));
  const deleteSection = (id: string) => { setSections(prev => prev.filter(s => s.id !== id)); if (selectedSectionId === id) setSelectedSectionId(sections[0]?.id || null); };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragActiveId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSections(prev => { const oi = prev.findIndex(s => s.id === active.id); const ni = prev.findIndex(s => s.id === over.id); return arrayMove(prev, oi, ni); });
    }
  };

  const handlePreviewDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      const asset: MediaAsset = JSON.parse(data);
      const isVideo = asset.tipo === 'video';
      if (isVideo) addSection('video', { url: asset.public_url, poster: '', autoplay: false });
      else addSection('image', { url: asset.public_url, alt: asset.nome, caption: '', fit: 'cover' });
    } catch { /* ignore */ }
  }, []);

  const handleAssetClick = (asset: MediaAsset) => {
    const isVideo = asset.tipo === 'video';
    if (isVideo) addSection('video', { url: asset.public_url, poster: '', autoplay: false });
    else addSection('image', { url: asset.public_url, alt: asset.nome, caption: '', fit: 'cover' });
  };

  const applyTemplate = (template: PageTemplate) => {
    const timestamped = template.sections.map(s => ({ ...s, id: `${s.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` }));
    setSections(timestamped);
    setConfig(c => ({ ...c, ...template.config }));
    if (!currentPageId) { setPageName(template.name); setPageSlug(generateSlug(template.name)); }
    setSelectedSectionId(timestamped[0]?.id || null);
    setShowTemplateDialog(false);
    toast.success(`Template "${template.name}" aplicado!`);
  };

  const applyFullTemplate = (ft: FullTemplate) => {
    const timestamped = ft.sections.map(s => ({ ...s, id: `${s.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` })) as PageSection[];
    setSections(timestamped);
    setConfig(c => ({ ...c, ...ft.config }));
    if (!currentPageId) { setPageName(ft.name); setPageSlug(generateSlug(ft.name)); }
    setSelectedSectionId(timestamped[0]?.id || null);
    setShowTemplateDialog(false);
    toast.success(`Template "${ft.name}" aplicado com tema completo!`);
  };

  const savePage = async () => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) { toast.error('Estabelecimento não encontrado'); return; }
    setSaving(true);
    const payload = { nome: pageName, slug: pageSlug, sections: sections as any, config: config as any, estabelecimento_id: estabId };
    let result;
    if (currentPageId) result = await supabase.from('published_pages').update(payload).eq('id', currentPageId).select().single();
    else result = await supabase.from('published_pages').insert(payload).select().single();
    if (result.error) { toast.error(result.error.message.includes('unique') ? 'Slug já em uso.' : 'Erro: ' + result.error.message); }
    else { setCurrentPageId(result.data.id); setIsPublished((result.data as any).publicado); setHasChanges(false); toast.success('Salvo!'); }
    setSaving(false); setShowSaveDialog(false);
  };

  const togglePublish = async () => {
    if (!currentPageId) { setShowSaveDialog(true); toast.info('Salve a página primeiro.'); return; }
    setPublishing(true);
    const ns = !isPublished;
    const { error } = await supabase.from('published_pages').update({ publicado: ns }).eq('id', currentPageId);
    if (error) toast.error('Erro: ' + error.message);
    else { setIsPublished(ns); toast.success(ns ? 'Publicada! 🎉' : 'Despublicada.'); }
    setPublishing(false);
  };

  const handleImportFromAgent = (imported: PageSection[], configHints?: Partial<PageConfig>) => {
    setSections(prev => [...prev, ...imported]);
    if (configHints) setConfig(c => ({ ...c, ...configHints }));
  };

  const generateHTML = useCallback(() => {
    return generateFullHTML(sections, config);
  }, [sections, config]);

  const previewWidth = viewMode === 'mobile' ? 375 : viewMode === 'tablet' ? 768 : '100%';
  const publicUrl = currentPageId && isPublished ? `${window.location.origin}/p/${pageSlug}` : null;

  return (
    <div className="flex h-[calc(100vh-200px)] gap-0 overflow-hidden -mx-3 sm:-mx-6 -mb-3 sm:-mb-6">
      {/* Left Panel */}
      <div className="w-64 border-r bg-muted/20 flex flex-col shrink-0">
        <div className="p-2 border-b">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 w-full justify-start mb-1" onClick={handleBack}>
            <ChevronUp className="h-3 w-3 rotate-[-90deg]" /> Voltar aos Projetos
          </Button>
          <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as any)}>
            <TabsList className="w-full h-8">
              <TabsTrigger value="sections" className="flex-1 text-xs h-7 gap-1"><Layout className="h-3 w-3" /> Seções</TabsTrigger>
              <TabsTrigger value="assets" className="flex-1 text-xs h-7 gap-1"><ImagePlus className="h-3 w-3" /> Mídias</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {leftTab === 'sections' && (
          <>
            <div className="p-2 border-b space-y-1.5">
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 flex-1 text-xs gap-1" onClick={() => setShowAddSection(true)}><Plus className="h-3 w-3" /> Seção</Button>
                <Button variant="outline" size="sm" className="h-7 flex-1 text-xs gap-1" onClick={() => setShowTemplateDialog(true)}><LayoutTemplate className="h-3 w-3" /> Template</Button>
              </div>
              <Button variant="outline" size="sm" className="h-7 w-full text-xs gap-1" onClick={() => setShowSaveDialog(true)}><Save className="h-3 w-3" /> Salvar</Button>
            </div>
            <ScrollArea className="flex-1 p-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e: DragStartEvent) => setDragActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
                <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {sections.map(s => (
                    <SortableSectionItem key={s.id} section={s} isSelected={s.id === selectedSectionId}
                      onSelect={() => { setSelectedSectionId(s.id); setRightPanel('editor'); }}
                      onDelete={() => deleteSection(s.id)}
                      onToggleVisible={() => updateSection({ ...s, visible: !s.visible })} />
                  ))}
                </SortableContext>
              </DndContext>
              {sections.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <LayoutTemplate className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Escolha um template ou adicione seções</p>
                </div>
              )}
            </ScrollArea>
          </>
        )}

        {leftTab === 'assets' && (
          <ScrollArea className="flex-1 p-2">
            <AssetsPanel onDropAsset={handleAssetClick} />
          </ScrollArea>
        )}
      </div>

      {/* Center - Preview */}
      <div className="flex-1 flex flex-col bg-muted/10 overflow-hidden">
        <div className="border-b px-4 py-2 flex items-center justify-between bg-card">
          <div className="flex items-center gap-2">
            <Button variant={viewMode === 'desktop' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('desktop')}><Monitor className="h-4 w-4" /></Button>
            <Button variant={viewMode === 'tablet' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('tablet')}><Tablet className="h-4 w-4" /></Button>
            <Button variant={viewMode === 'mobile' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('mobile')}><Smartphone className="h-4 w-4" /></Button>
            {publicUrl && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l">
                <Badge variant="secondary" className="text-[10px] gap-1"><Link className="h-3 w-3" /><span className="max-w-[200px] truncate">/p/{pageSlug}</span></Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success('URL copiada!'); }}><Copy className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(publicUrl, '_blank')}><ExternalLink className="h-3 w-3" /></Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 gap-1" onClick={() => setShowTemplateDialog(true)}><LayoutTemplate className="h-3 w-3" /> Template</Button>
            <Button variant="outline" size="sm" className="h-7 gap-1" onClick={() => setShowPreviewDialog(true)}><Eye className="h-3 w-3" /> Preview</Button>
            <Button variant="outline" size="sm" className="h-7 gap-1" onClick={() => setShowCodeDialog(true)}><Code className="h-3 w-3" /> HTML</Button>
            <Button variant={isPublished ? 'secondary' : 'default'} size="sm" className="h-7 gap-1" onClick={togglePublish} disabled={publishing}>
              {publishing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} {isPublished ? 'Despublicar' : 'Publicar'}
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div ref={previewRef} className="flex justify-center py-4 px-4" style={{ minHeight: '100%' }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
            onDrop={handlePreviewDrop}
          >
            <div className="bg-background border rounded-lg shadow-sm overflow-hidden transition-all" style={{ width: previewWidth, maxWidth: '100%' }}>
              {sections.filter(s => s.visible).length === 0 ? (
                <div className="py-20 text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg mx-4 my-4">
                  <ImagePlus className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium mb-1">Arraste mídias aqui</p>
                  <p className="text-xs">ou escolha um template para começar</p>
                </div>
              ) : (
                sections.map(s => (
                  <div key={s.id} onClick={() => { setSelectedSectionId(s.id); setRightPanel('editor'); }}
                    className={cn("relative cursor-pointer transition-all", selectedSectionId === s.id && "ring-2 ring-primary ring-inset", !s.visible && "hidden")}>
                    <SectionPreview section={s} config={config} />
                    <div className={cn("absolute top-1 left-1 z-10", selectedSectionId === s.id ? "opacity-100" : "opacity-0 hover:opacity-100")}>
                      <Badge variant="secondary" className="text-[10px] shadow">{s.title}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel */}
      <div className="w-80 border-l bg-card flex flex-col shrink-0">
        <div className="border-b p-2 flex items-center gap-1">
          <Button variant={rightPanel === 'editor' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs flex-1" onClick={() => setRightPanel('editor')}><Settings className="h-3 w-3 mr-1" /> Editor</Button>
          <Button variant={rightPanel === 'config' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs flex-1" onClick={() => setRightPanel('config')}><Palette className="h-3 w-3 mr-1" /> Estilo</Button>
          <Button variant={rightPanel === 'agent' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs flex-1" onClick={() => setRightPanel('agent')}><Bot className="h-3 w-3 mr-1" /> Agente</Button>
        </div>
        <ScrollArea className="flex-1 p-3">
          {rightPanel === 'editor' && (selectedSection ? <SectionEditor section={selectedSection} onChange={updateSection} /> : <p className="text-sm text-muted-foreground text-center py-6">Selecione uma seção para editar</p>)}
          {rightPanel === 'config' && (
            <div className="space-y-4">
              <div><Label className="text-xs">Título do Site</Label><Input value={config.title} onChange={e => setConfig(c => ({ ...c, title: e.target.value }))} /></div>
              <div><Label className="text-xs">Descrição (SEO)</Label><Textarea value={config.description} onChange={e => setConfig(c => ({ ...c, description: e.target.value }))} rows={2} /></div>
              <Separator /><p className="text-xs font-semibold text-muted-foreground uppercase">Cores</p>
              <div className="grid grid-cols-2 gap-2">
                {([['primaryColor', 'Primária'], ['secondaryColor', 'Secundária'], ['accentColor', 'Destaque'], ['backgroundColor', 'Fundo'], ['textColor', 'Texto']] as const).map(([key, label]) => (
                  <div key={key}><Label className="text-[10px]">{label}</Label><div className="flex gap-1"><input type="color" value={(config as any)[key]} onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))} className="w-8 h-8 rounded border cursor-pointer" /><Input value={(config as any)[key]} onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))} className="text-xs h-8" /></div></div>
                ))}
              </div>
              <Separator /><p className="text-xs font-semibold text-muted-foreground uppercase">Tipografia</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px]">Display (Títulos)</Label>
                  <select value={config.fontDisplay} onChange={e => setConfig(c => ({ ...c, fontDisplay: e.target.value }))} className="w-full h-8 rounded-md border bg-background px-2 text-xs" style={{ fontFamily: config.fontDisplay }}>
                    {['Inter', 'Poppins', 'Montserrat', 'Roboto', 'Open Sans', 'Lato', 'Raleway', 'Oswald', 'Playfair Display', 'Merriweather', 'Nunito', 'Rubik', 'Work Sans', 'DM Sans', 'Space Grotesk', 'Outfit', 'Sora', 'Bricolage Grotesque', 'Plus Jakarta Sans', 'Georgia', 'Bebas Neue', 'Archivo', 'Barlow', 'Manrope', 'Lexend', 'Satoshi', 'Cabinet Grotesk'].map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                  </select>
                </div>
                <div><Label className="text-[10px]">Body (Textos)</Label>
                  <select value={config.fontBody} onChange={e => setConfig(c => ({ ...c, fontBody: e.target.value }))} className="w-full h-8 rounded-md border bg-background px-2 text-xs" style={{ fontFamily: config.fontBody }}>
                    {['Inter', 'Poppins', 'Montserrat', 'Roboto', 'Open Sans', 'Lato', 'Raleway', 'Nunito', 'Rubik', 'Work Sans', 'DM Sans', 'Space Grotesk', 'Outfit', 'Sora', 'Plus Jakarta Sans', 'Georgia', 'Barlow', 'Manrope', 'Lexend', 'Merriweather', 'Source Sans Pro', 'Noto Sans', 'IBM Plex Sans', 'Figtree'].map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div><Label className="text-[10px]">Largura Máxima</Label><Input value={config.maxWidth} onChange={e => setConfig(c => ({ ...c, maxWidth: e.target.value }))} className="text-xs" /></div>
            </div>
          )}
          {rightPanel === 'agent' && <AgentTextBank />}
        </ScrollArea>
      </div>

      {/* Template & Theme Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="bg-background sm:max-w-5xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><LayoutTemplate className="h-5 w-5" /> Templates & Temas</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="full" className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="full" className="gap-1.5"><Package className="h-3.5 w-3.5" /> Templates Completos</TabsTrigger>
              <TabsTrigger value="themes" className="gap-1.5"><Palette className="h-3.5 w-3.5" /> Só Tema Visual</TabsTrigger>
              <TabsTrigger value="structure" className="gap-1.5"><Layout className="h-3.5 w-3.5" /> Só Estrutura</TabsTrigger>
            </TabsList>

            {/* Full Templates Tab (ThemeForest-style) */}
            <TabsContent value="full" className="flex-1 min-h-0 mt-3 flex flex-col gap-3">
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {FULL_TEMPLATE_CATEGORIES.map(cat => (
                  <button key={cat.id}
                    onClick={() => setFullTemplateCategoryFilter(cat.id)}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all",
                      fullTemplateCategoryFilter === cat.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-transparent hover:bg-muted"
                    )}>
                    <span>{cat.icon}</span> {cat.name}
                  </button>
                ))}
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pr-2">
                  {(FULL_TEMPLATE_CATEGORIES.find(c => c.id === fullTemplateCategoryFilter)?.templates || ALL_FULL_TEMPLATES.slice(0, 9)).map(ft => (
                    <button key={ft.id}
                      onClick={() => applyFullTemplate(ft)}
                      onMouseEnter={() => setHoveredTemplate(ft.id)}
                      onMouseLeave={() => setHoveredTemplate(null)}
                      className="flex flex-col gap-2 rounded-xl border-2 border-transparent hover:border-primary transition-all text-left group overflow-hidden">
                      {/* Mini Preview */}
                      <div className="w-full aspect-[3/4] overflow-hidden rounded-t-lg relative">
                        <TemplateMiniPreview
                          config={ft.config}
                          sectionTypes={ft.sections.map(s => s.type)}
                          className="w-full h-full"
                        />
                        {hoveredTemplate === ft.id && (
                          <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-semibold shadow-lg">
                              Aplicar Template
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="px-3 pb-3">
                        <p className="text-sm font-semibold truncate">{ft.name}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{ft.description}</p>
                        <div className="flex gap-1 flex-wrap mt-2">
                          {ft.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">{tag}</Badge>
                          ))}
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{ft.sections.length} seções</Badge>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Themes Tab */}
            <TabsContent value="themes" className="flex-1 min-h-0 mt-3 flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">Aplica apenas cores, fontes e estilo visual — mantém suas seções atuais.</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {TEMPLATE_CATEGORIES.map(cat => (
                  <button key={cat.id}
                    onClick={() => setThemeCategoryFilter(cat.id)}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all",
                      themeCategoryFilter === cat.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-transparent hover:bg-muted"
                    )}>
                    <span>{cat.icon}</span> {cat.name}
                  </button>
                ))}
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pr-2">
                  {(TEMPLATE_CATEGORIES.find(c => c.id === themeCategoryFilter)?.themes || ALL_THEMES.slice(0, 12)).map(theme => (
                    <button key={theme.id}
                      onClick={() => {
                        setConfig(c => ({ ...c, ...theme.config }));
                        setShowTemplateDialog(false);
                        toast.success(`Tema "${theme.name}" aplicado!`);
                      }}
                      className="flex flex-col gap-2 p-3 rounded-xl border-2 border-transparent hover:border-primary transition-all text-left group">
                      <div className="w-full aspect-[4/3] rounded-lg overflow-hidden" style={{ background: theme.preview_gradient }}>
                        <div className="w-full h-full flex flex-col items-center justify-center p-3 gap-1.5">
                          <span className="text-2xl">{theme.thumbnail}</span>
                          <div className="flex gap-1">
                            {[theme.config.primaryColor, theme.config.accentColor, theme.config.backgroundColor].filter(Boolean).map((color, i) => (
                              <div key={i} className="w-4 h-4 rounded-full border border-white/30" style={{ backgroundColor: color }} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold truncate">{theme.name}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{theme.description}</p>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {theme.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">{tag}</Badge>
                        ))}
                        {theme.config.fontDisplay && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{theme.config.fontDisplay}</Badge>}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Structure Tab */}
            <TabsContent value="structure" className="flex-1 min-h-0 mt-3">
              <p className="text-xs text-muted-foreground mb-3">Aplica apenas a estrutura de seções — mantém seu tema visual atual.</p>
              <ScrollArea className="h-full">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pr-2">
                  {PAGE_TEMPLATES.map(tpl => (
                    <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                      className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-transparent hover:border-primary hover:bg-primary/5 transition-all text-center group">
                      <div className="text-4xl">{tpl.thumbnail}</div>
                      <div>
                        <p className="text-sm font-semibold">{tpl.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{tpl.description}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{tpl.sections.length} seções</Badge>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Add Section Dialog */}
      <Dialog open={showAddSection} onOpenChange={setShowAddSection}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader><DialogTitle>Adicionar Seção</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
            {SECTION_TEMPLATES.map(tpl => (
              <button key={tpl.type} onClick={() => addSection(tpl.type)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border hover:bg-muted/50 hover:border-primary transition-all text-center">
                {tpl.icon}<span className="text-xs font-medium">{tpl.label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader><DialogTitle>Salvar Página</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={pageName} onChange={e => { setPageName(e.target.value); if (!currentPageId) setPageSlug(generateSlug(e.target.value)); }} /></div>
            <div><Label>Slug (URL)</Label><div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">/p/</span><Input value={pageSlug} onChange={e => setPageSlug(generateSlug(e.target.value))} className="flex-1" /></div><p className="text-[10px] text-muted-foreground mt-1">{window.location.origin}/p/{pageSlug}</p></div>
            <Button onClick={savePage} disabled={saving || !pageName.trim()} className="w-full">{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}{currentPageId ? 'Atualizar' : 'Salvar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="bg-background max-w-[95vw] h-[90vh]">
          <DialogHeader><DialogTitle>Preview</DialogTitle></DialogHeader>
          <iframe srcDoc={generateHTML()} className="w-full flex-1 rounded border" style={{ height: 'calc(90vh - 80px)' }} />
        </DialogContent>
      </Dialog>

      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="bg-background sm:max-w-3xl">
          <DialogHeader><DialogTitle className="flex items-center justify-between">HTML<Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(generateHTML()); toast.success('Copiado!'); }}><Copy className="h-3 w-3 mr-1" /> Copiar</Button></DialogTitle></DialogHeader>
          <ScrollArea className="h-[500px]"><pre className="text-xs bg-muted p-4 rounded font-mono whitespace-pre-wrap">{generateHTML()}</pre></ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Alterações não salvas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você tem alterações que ainda não foram salvas. O que deseja fazer?
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleSaveAndBack} className="w-full gap-2">
                <Save className="h-4 w-4" /> Salvar e sair
              </Button>
              <Button variant="destructive" onClick={handleDiscardAndBack} className="w-full gap-2">
                <Trash2 className="h-4 w-4" /> Descartar alterações
              </Button>
              <Button variant="outline" onClick={() => setShowUnsavedDialog(false)} className="w-full">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Main Component (Router) ────────────────────────────────────────────────────
const PageBuilder: React.FC = () => {
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingPage, setEditingPage] = useState<SavedPage | null>(null);

  const handleOpen = (page: SavedPage) => {
    setEditingPage(page);
    setView('editor');
  };

  const handleCreateNew = () => {
    setEditingPage(null);
    setView('editor');
  };

  const handleBack = () => {
    setEditingPage(null);
    setView('list');
  };

  if (view === 'editor') {
    return <PageBuilderEditor key={editingPage?.id || 'new'} initialPage={editingPage} onBack={handleBack} />;
  }

  return <PageBuilderLanding onOpen={handleOpen} onCreateNew={handleCreateNew} />;
};

export default PageBuilder;
