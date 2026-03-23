// Full ThemeForest-style templates — combining visual themes + section structures + layout variants
import React from 'react';

export interface FullTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  config: {
    primaryColor: string;
    secondaryColor?: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    fontDisplay: string;
    fontBody: string;
    maxWidth?: string;
    heroStyle?: string;
    cardStyle?: string;
    borderRadius?: string;
  };
  sections: {
    id: string;
    type: string;
    title: string;
    visible: boolean;
    styles: Record<string, string>;
    content: Record<string, any>;
  }[];
}

export interface FullTemplateCategory {
  id: string;
  name: string;
  icon: string;
  templates: FullTemplate[];
}

const yr = new Date().getFullYear();

export const FULL_TEMPLATE_CATEGORIES: FullTemplateCategory[] = [
  {
    id: 'landing', name: 'Landing Pages', icon: '🚀',
    templates: [
      {
        id: 'ft-saas-dark', name: 'SaaS Dark Pro', category: 'landing',
        description: 'Landing escura para SaaS com hero split, features em grid e pricing',
        tags: ['dark', 'saas', 'tech', 'split-hero'],
        config: { primaryColor: '#7c3aed', accentColor: '#06d6a0', backgroundColor: '#0f0c29', textColor: '#e2e8f0', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'split', cardStyle: 'glass', borderRadius: '16px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: { layout: 'split-left' }, content: { headline: 'Automatize Tudo. Escale Sem Limites.', subheadline: 'A plataforma de automação que reduz custos em 60% e acelera resultados em 3x. Usado por mais de 2.000 empresas.', cta_text: 'Comece Grátis →', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'social_proof', title: 'Métricas', visible: true, styles: {}, content: { items: [{ number: '2.000+', label: 'Empresas' }, { number: '99.9%', label: 'Uptime' }, { number: '60%', label: 'Economia' }, { number: '< 1s', label: 'Latência' }] } },
          { id: 's3', type: 'features', title: 'Recursos', visible: true, styles: { layout: 'grid-icons' }, content: { items: [{ icon: '⚡', title: 'Ultra Rápido', description: 'Processamento em tempo real com latência inferior a 100ms.' }, { icon: '🔒', title: 'Segurança Total', description: 'Criptografia end-to-end e compliance SOC2/GDPR.' }, { icon: '🤖', title: 'IA Integrada', description: 'Machine learning para otimizar seus fluxos automaticamente.' }, { icon: '📊', title: 'Analytics Avançado', description: 'Dashboards customizáveis com insights em tempo real.' }, { icon: '🔗', title: '200+ Integrações', description: 'Conecte com todas as ferramentas que sua equipe já usa.' }, { icon: '💬', title: 'Suporte Premium', description: 'Especialistas disponíveis 24/7 via chat e vídeo.' }] } },
          { id: 's4', type: 'process_steps', title: 'Como Funciona', visible: true, styles: {}, content: { title: 'Comece em 3 Passos', items: [{ step: '1', title: 'Conecte', description: 'Integre suas ferramentas em 2 cliques.' }, { step: '2', title: 'Configure', description: 'Use templates prontos ou crie do zero.' }, { step: '3', title: 'Escale', description: 'Automatize e veja resultados imediatos.' }] } },
          { id: 's5', type: 'testimonials', title: 'Cases', visible: true, styles: {}, content: { items: [{ name: 'Renato Dias', role: 'CTO, Fintech X', text: 'Reduzimos 80% do trabalho manual com a plataforma.', metrics: '-80% trabalho manual' }, { name: 'Camila Lopes', role: 'VP Ops, Corp Y', text: 'ROI de 400% no primeiro trimestre. Inacreditável.', metrics: '+400% ROI' }] } },
          { id: 's6', type: 'pricing', title: 'Planos', visible: true, styles: {}, content: { title: 'Preços Transparentes', items: [{ name: 'Starter', price: 'R$ 97/mês', features: ['1.000 automações', '5 integrações', 'Suporte email'], highlighted: false }, { name: 'Growth', price: 'R$ 297/mês', features: ['10.000 automações', 'Todas integrações', 'IA inclusa', 'Suporte prioritário'], highlighted: true }, { name: 'Enterprise', price: 'Sob consulta', features: ['Ilimitado', 'SLA dedicado', 'Onboarding', 'API custom'], highlighted: false }] } },
          { id: 's7', type: 'faq', title: 'FAQ', visible: true, styles: {}, content: { items: [{ question: 'Preciso de conhecimento técnico?', answer: 'Não. Nossa interface visual permite configurar tudo sem código.' }, { question: 'Quanto tempo leva para integrar?', answer: 'A maioria das integrações leva menos de 5 minutos.' }, { question: 'Posso cancelar a qualquer momento?', answer: 'Sim, sem multas ou fidelidade.' }] } },
          { id: 's8', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Pronto para Automatizar?', description: '14 dias grátis. Sem cartão de crédito.', button_text: 'Criar Conta Gratuita', button_url: '#' } },
          { id: 's9', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'AutoScale', copyright: `© ${yr} AutoScale. Todos os direitos reservados.` } },
        ]
      },
      {
        id: 'ft-saas-clean', name: 'SaaS Clean Minimal', category: 'landing',
        description: 'Landing minimalista e clara para SaaS com hero centrado',
        tags: ['light', 'minimal', 'clean', 'centered'],
        config: { primaryColor: '#2563eb', accentColor: '#3b82f6', backgroundColor: '#ffffff', textColor: '#1e293b', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'minimal', cardStyle: 'bordered', borderRadius: '12px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Simplifique. Otimize. Cresça.', subheadline: 'A ferramenta que equipes modernas usam para gerenciar projetos com clareza e foco.', cta_text: 'Experimentar Grátis', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'features', title: 'Features', visible: true, styles: {}, content: { items: [{ icon: '📋', title: 'Gestão Visual', description: 'Kanban, Timeline e Lista em um só lugar.' }, { icon: '⏱️', title: 'Time Tracking', description: 'Acompanhe horas automaticamente.' }, { icon: '📊', title: 'Reports', description: 'Relatórios que geram insights de verdade.' }] } },
          { id: 's3', type: 'video', title: 'Demo', visible: true, styles: {}, content: { url: '', poster: '', autoplay: false } },
          { id: 's4', type: 'testimonials', title: 'Clientes', visible: true, styles: {}, content: { items: [{ name: 'Equipe Acme', role: 'Startup', text: 'Economizamos 15 horas por semana com a ferramenta.' }] } },
          { id: 's5', type: 'pricing', title: 'Preços', visible: true, styles: {}, content: { title: 'Escolha o Ideal', items: [{ name: 'Free', price: 'R$ 0', features: ['3 projetos', '5 membros', 'Básico'], highlighted: false }, { name: 'Pro', price: 'R$ 49/mês', features: ['Ilimitado', 'Time tracking', 'Integrações'], highlighted: true }] } },
          { id: 's6', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Comece hoje', description: 'Nenhum cartão necessário.', button_text: 'Criar Conta', button_url: '#' } },
          { id: 's7', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'TaskFlow', copyright: `© ${yr}` } },
        ]
      },
      {
        id: 'ft-startup-aurora', name: 'Startup Aurora', category: 'landing',
        description: 'Gradientes vibrantes com hero imersivo e prova social forte',
        tags: ['gradient', 'vibrant', 'modern', 'startup'],
        config: { primaryColor: '#7c3aed', accentColor: '#ec4899', backgroundColor: '#faf5ff', textColor: '#1e1b4b', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'shadow', borderRadius: '16px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'O Futuro da Comunicação Digital', subheadline: 'Conecte sua marca com milhões. Inteligência artificial e dados em uma plataforma unificada.', cta_text: 'Solicitar Acesso', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'social_proof', title: 'Números', visible: true, styles: {}, content: { items: [{ number: '50M+', label: 'Mensagens/dia' }, { number: '150+', label: 'Países' }, { number: '99.99%', label: 'Disponibilidade' }] } },
          { id: 's3', type: 'features', title: 'Plataforma', visible: true, styles: {}, content: { items: [{ icon: '🌐', title: 'Omnichannel', description: 'WhatsApp, Email, SMS, Push em um painel.' }, { icon: '🧠', title: 'IA Conversacional', description: 'Chatbots que entendem contexto e sentimento.' }, { icon: '📈', title: 'Growth Engine', description: 'Automações que convertem leads em clientes.' }, { icon: '🔐', title: 'Enterprise Ready', description: 'SSO, audit logs e compliance garantidos.' }] } },
          { id: 's4', type: 'testimonials', title: 'Depoimentos', visible: true, styles: {}, content: { items: [{ name: 'TechStartup Inc.', role: 'Scale-up', text: 'Crescemos de 1.000 para 100.000 usuários usando a plataforma.', metrics: '100x crescimento' }, { name: 'E-commerce Pro', role: 'Enterprise', text: 'Conversão subiu 340% com os chatbots inteligentes.', metrics: '+340% conversão' }] } },
          { id: 's5', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Junte-se às Maiores Marcas', description: 'Agende uma demo personalizada.', button_text: 'Agendar Demo', button_url: '#' } },
          { id: 's6', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'ConnectAI', copyright: `© ${yr} ConnectAI` } },
        ]
      },
    ]
  },
  {
    id: 'vendas', name: 'Páginas de Vendas', icon: '💰',
    templates: [
      {
        id: 'ft-vendas-expert', name: 'Expert Authority', category: 'vendas',
        description: 'Página de vendas dark para infoprodutos e mentoria com prova social massiva',
        tags: ['dark', 'authority', 'infoproduct', 'conversion'],
        config: { primaryColor: '#6366f1', accentColor: '#fbbf24', backgroundColor: '#0f0a2e', textColor: '#e0e7ff', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'glass', borderRadius: '12px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'O Método Que Gera R$ 100K/Mês em Piloto Automático', subheadline: 'Descubra a estratégia secreta usada por +3.000 empreendedores para faturar alto sem depender de anúncios caros.', cta_text: '🔥 Quero Acesso Agora', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'social_proof', title: 'Prova', visible: true, styles: {}, content: { items: [{ number: 'R$ 47M', label: 'Faturados por alunos' }, { number: '3.200+', label: 'Alunos ativos' }, { number: '97%', label: 'Recomendam' }, { number: '4.9/5', label: 'Nota média' }] } },
          { id: 's3', type: 'video', title: 'VSL', visible: true, styles: {}, content: { url: '', poster: '', autoplay: false, _headline_overlay: 'Assista e descubra o método', _cta_overlay: 'Vídeo de 12 minutos' } },
          { id: 's4', type: 'process_steps', title: 'Método', visible: true, styles: {}, content: { title: 'Os 4 Pilares do Método', items: [{ step: '1', title: 'Posicionamento', description: 'Torne-se referência no seu nicho.' }, { step: '2', title: 'Oferta Irresistível', description: 'Crie ofertas que vendem sozinhas.' }, { step: '3', title: 'Funil Automático', description: 'Venda 24h por dia, 7 dias por semana.' }, { step: '4', title: 'Escala', description: 'Multiplique resultados com tráfego pago.' }] } },
          { id: 's5', type: 'features', title: 'O Que Você Recebe', visible: true, styles: {}, content: { items: [{ icon: '📚', title: '12 Módulos Completos', description: 'Do zero ao avançado, tudo explicado.' }, { icon: '🎯', title: '50+ Templates Prontos', description: 'Copy, criativos, funis, emails.' }, { icon: '👥', title: 'Comunidade Exclusiva', description: 'Networking com outros empreendedores.' }, { icon: '📞', title: 'Mentorias Semanais', description: 'Tire dúvidas ao vivo com especialistas.' }, { icon: '🏆', title: 'Certificado', description: 'Certificação reconhecida pelo mercado.' }, { icon: '♾️', title: 'Acesso Vitalício', description: 'Sem mensalidade. Pague uma vez.' }] } },
          { id: 's6', type: 'objections', title: 'Objeções', visible: true, styles: {}, content: { title: 'Você Pode Estar Pensando...', items: [{ objection: 'É caro demais', response: 'O investimento se paga com a primeira venda. Alunos faturam em média R$ 15K no primeiro mês.' }, { objection: 'Não tenho tempo', response: 'São 20 minutos por dia. Menos que o tempo que você gasta rolando o feed.' }, { objection: 'Já tentei de tudo', response: 'Este é o último método que você vai precisar. 97% dos alunos recomendam.' }] } },
          { id: 's7', type: 'testimonials', title: 'Cases', visible: true, styles: {}, content: { items: [{ name: 'Marcos Oliveira', role: 'Ex-CLT', text: 'Saí do emprego e em 90 dias já faturava R$ 30K/mês.', metrics: 'R$ 30K/mês em 90 dias' }, { name: 'Fernanda Costa', role: 'Nutricionista', text: 'Transformei meu conhecimento em um negócio de 6 dígitos.', metrics: 'R$ 150K em 6 meses' }, { name: 'Ricardo Santos', role: 'Engenheiro', text: 'Larguei a engenharia. Hoje faturo mais e trabalho menos.', metrics: 'R$ 85K/mês' }] } },
          { id: 's8', type: 'guarantee', title: 'Garantia', visible: true, styles: {}, content: { icon: '🛡️', title: 'Garantia Blindada de 30 Dias', description: 'Se em 30 dias você não ver resultados, devolvemos 100% do seu investimento. Sem perguntas, sem burocracia.', duration: '30 dias de garantia total' } },
          { id: 's9', type: 'pricing', title: 'Oferta', visible: true, styles: {}, content: { title: '🔥 Oferta Especial de Lançamento', items: [{ name: 'Acesso Completo', price: 'de R$ 1.997 por R$ 997', features: ['12 Módulos', 'Templates', 'Comunidade', 'Mentorias', 'Acesso Vitalício', 'Certificado', 'Bônus Exclusivos'], highlighted: true }] } },
          { id: 's10', type: 'cta', title: 'CTA Final', visible: true, styles: {}, content: { headline: '⏰ Últimas Vagas com Desconto', description: 'O preço sobe em breve. Garanta agora.', button_text: 'QUERO MINHA VAGA AGORA →', button_url: '#' } },
          { id: 's11', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Expert Academy', copyright: `© ${yr} — Todos os direitos reservados` } },
        ]
      },
      {
        id: 'ft-vendas-eco', name: 'Eco Product', category: 'vendas',
        description: 'Página de produto sustentável com tons verdes e hero com imagem',
        tags: ['green', 'organic', 'product', 'nature'],
        config: { primaryColor: '#2d6a4f', accentColor: '#52b788', backgroundColor: '#f0fdf4', textColor: '#1b4332', fontDisplay: 'Georgia', fontBody: 'Georgia', heroStyle: 'image-overlay', cardStyle: 'bordered', borderRadius: '16px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: { layout: 'split-left' }, content: { headline: 'Beleza Natural. Resultados Reais.', subheadline: 'Cosméticos orgânicos certificados, feitos com ingredientes 100% naturais e embalagens biodegradáveis.', cta_text: 'Comprar Agora', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'features', title: 'Diferenciais', visible: true, styles: { layout: 'zigzag' }, content: { items: [{ icon: '🌿', title: '100% Orgânico', description: 'Sem parabenos, sulfatos ou químicos agressivos.' }, { icon: '🐰', title: 'Cruelty-Free', description: 'Jamais testado em animais.' }, { icon: '♻️', title: 'Eco-Friendly', description: 'Embalagens recicláveis e compostáveis.' }] } },
          { id: 's3', type: 'testimonials', title: 'Avaliações', visible: true, styles: {}, content: { items: [{ name: 'Marina S.', role: 'Cliente', text: 'Minha pele nunca esteve tão saudável. Amo que é tudo natural!', metrics: '⭐⭐⭐⭐⭐' }, { name: 'Bianca L.', role: 'Influenciadora', text: 'Finalmente uma marca que entrega o que promete. Super recomendo.' }] } },
          { id: 's4', type: 'guarantee', title: 'Garantia', visible: true, styles: {}, content: { icon: '🌱', title: 'Garantia Verde de 60 Dias', description: 'Se não amar os resultados, devolvemos seu dinheiro e plantamos uma árvore em seu nome.', duration: '60 dias' } },
          { id: 's5', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Transforme Sua Rotina de Beleza', description: 'Frete grátis acima de R$ 99.', button_text: 'Comprar com Desconto', button_url: '#' } },
          { id: 's6', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Natura Verde', copyright: `© ${yr}` } },
        ]
      },
      {
        id: 'ft-vendas-fire', name: 'Fire Sale', category: 'vendas',
        description: 'Página de promoção agressiva com urgência e escassez',
        tags: ['red', 'urgent', 'sale', 'black-friday'],
        config: { primaryColor: '#dc2626', accentColor: '#fbbf24', backgroundColor: '#fef2f2', textColor: '#7f1d1d', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'shadow', borderRadius: '12px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: '🔥 MEGA OFERTA — Só Hoje!', subheadline: 'Até 70% de desconto em todos os produtos. Estoque limitado. Quando acabar, acabou.', cta_text: 'VER OFERTAS →', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'social_proof', title: 'Urgência', visible: true, styles: {}, content: { items: [{ number: '847', label: 'Pessoas olhando agora' }, { number: '70%', label: 'OFF' }, { number: '127', label: 'Produtos restantes' }] } },
          { id: 's3', type: 'features', title: 'Top Ofertas', visible: true, styles: {}, content: { items: [{ icon: '📱', title: 'Smartphones', description: 'A partir de R$ 599.' }, { icon: '💻', title: 'Notebooks', description: 'A partir de R$ 1.999.' }, { icon: '🎧', title: 'Acessórios', description: 'A partir de R$ 29.' }, { icon: '📺', title: 'Smart TVs', description: 'A partir de R$ 899.' }] } },
          { id: 's4', type: 'guarantee', title: 'Garantia', visible: true, styles: {}, content: { icon: '🛡️', title: 'Garantia de Menor Preço', description: 'Encontrou mais barato? Cobrimos a oferta e damos 10% a mais de desconto.', duration: 'Garantia Price Match' } },
          { id: 's5', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: '⏰ Oferta Expira em Poucas Horas', description: 'Não perca. Clique e aproveite.', button_text: 'GARANTIR MINHA OFERTA', button_url: '#' } },
          { id: 's6', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'MegaShop', copyright: `© ${yr}` } },
        ]
      },
    ]
  },
  {
    id: 'servicos', name: 'Serviços & Negócios', icon: '💼',
    templates: [
      {
        id: 'ft-agency-dark', name: 'Agency Bold', category: 'servicos',
        description: 'Agência digital com visual escuro e forte impacto visual',
        tags: ['dark', 'agency', 'bold', 'orange'],
        config: { primaryColor: '#f97316', accentColor: '#fb923c', backgroundColor: '#18181b', textColor: '#fafafa', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'minimal', cardStyle: 'glass', borderRadius: '12px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Criamos Marcas Que Dominam o Digital', subheadline: 'Estratégia + Design + Performance. Sua marca no próximo nível.', cta_text: 'Solicitar Proposta', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'social_proof', title: 'Números', visible: true, styles: {}, content: { items: [{ number: '200+', label: 'Projetos' }, { number: 'R$ 50M+', label: 'Gerados para clientes' }, { number: '8+', label: 'Anos' }] } },
          { id: 's3', type: 'features', title: 'Serviços', visible: true, styles: {}, content: { items: [{ icon: '🎨', title: 'Branding', description: 'Identidade visual que marca.' }, { icon: '📱', title: 'Web & Mobile', description: 'Apps e sites de alta performance.' }, { icon: '📈', title: 'Growth Marketing', description: 'Tráfego que converte.' }, { icon: '🎬', title: 'Conteúdo', description: 'Vídeos e copy que vendem.' }] } },
          { id: 's4', type: 'gallery', title: 'Portfolio', visible: true, styles: {}, content: { images: [] } },
          { id: 's5', type: 'process_steps', title: 'Método', visible: true, styles: {}, content: { title: 'Nosso Processo', items: [{ step: '01', title: 'Discovery', description: 'Entendemos seu negócio.' }, { step: '02', title: 'Strategy', description: 'Planejamos cada detalhe.' }, { step: '03', title: 'Execute', description: 'Entregamos resultados.' }] } },
          { id: 's6', type: 'testimonials', title: 'Cases', visible: true, styles: {}, content: { items: [{ name: 'CEO, Fintech X', role: 'Cliente', text: 'A melhor agência que já trabalhamos. Resultados absurdos.' }] } },
          { id: 's7', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Vamos Construir Algo Incrível?', description: 'Mande um oi. A primeira conversa é grátis.', button_text: 'Falar com a Gente', button_url: '#' } },
          { id: 's8', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Nex Agency', copyright: `© ${yr}` } },
        ]
      },
      {
        id: 'ft-consultoria-warm', name: 'Consultoria Premium', category: 'servicos',
        description: 'Tons quentes e acolhedores para consultores e coaches',
        tags: ['warm', 'consulting', 'coaching', 'trust'],
        config: { primaryColor: '#92400e', accentColor: '#d97706', backgroundColor: '#fffbeb', textColor: '#451a03', fontDisplay: 'Playfair Display', fontBody: 'Georgia', heroStyle: 'split', cardStyle: 'shadow', borderRadius: '16px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: { layout: 'split-left' }, content: { headline: 'Estratégias que Transformam Negócios', subheadline: 'Mais de 15 anos ajudando empresas a alcançar resultados extraordinários com consultoria personalizada.', cta_text: 'Agendar Sessão Gratuita', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'text', title: 'Sobre', visible: true, styles: {}, content: { body: '"Acredito que todo negócio tem potencial para ser extraordinário. Minha missão é encontrar e liberar esse potencial."\n\n— Com mais de 15 anos de experiência, atendi +500 empresas em 12 países, gerando mais de R$ 200 milhões em resultados para meus clientes.', alignment: 'center' } },
          { id: 's3', type: 'features', title: 'Como Posso Ajudar', visible: true, styles: {}, content: { items: [{ icon: '🎯', title: 'Diagnóstico Profundo', description: 'Análise completa do seu negócio.' }, { icon: '📊', title: 'Plano Estratégico', description: 'Roadmap personalizado de crescimento.' }, { icon: '🤝', title: 'Acompanhamento', description: 'Mentoria mensal com métricas.' }] } },
          { id: 's4', type: 'testimonials', title: 'Resultados', visible: true, styles: {}, content: { items: [{ name: 'Alberto M.', role: 'CEO', text: 'O faturamento dobrou em 8 meses de consultoria.', metrics: '+100% faturamento' }, { name: 'Patrícia R.', role: 'Diretora Comercial', text: 'A equipe de vendas nunca performou tão bem.', metrics: '+65% vendas' }] } },
          { id: 's5', type: 'faq', title: 'FAQ', visible: true, styles: {}, content: { items: [{ question: 'Qual o investimento?', answer: 'Os valores variam conforme o escopo. Agende uma sessão gratuita para conversarmos.' }, { question: 'Atende empresas de qualquer porte?', answer: 'Sim, de startups a grandes corporações.' }] } },
          { id: 's6', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Pronto para Transformar Seu Negócio?', description: 'Vagas limitadas para consultoria individual.', button_text: 'Agendar Conversa', button_url: '#' } },
          { id: 's7', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Consultoria', copyright: `© ${yr}` } },
        ]
      },
      {
        id: 'ft-clinica-clean', name: 'Clínica Medical', category: 'servicos',
        description: 'Design limpo e confiável para clínicas e profissionais de saúde',
        tags: ['medical', 'clean', 'trust', 'blue'],
        config: { primaryColor: '#0284c7', accentColor: '#38bdf8', backgroundColor: '#f0f9ff', textColor: '#0c4a6e', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'split', cardStyle: 'shadow', borderRadius: '16px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: { layout: 'split-left' }, content: { headline: 'Sua Saúde em Boas Mãos', subheadline: 'Equipe médica especializada, tecnologia de ponta e atendimento humanizado.', cta_text: 'Agendar Consulta', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'features', title: 'Especialidades', visible: true, styles: {}, content: { items: [{ icon: '🦷', title: 'Odontologia', description: 'Estética e implantes.' }, { icon: '👁️', title: 'Oftalmologia', description: 'Exames e cirurgias.' }, { icon: '🩺', title: 'Clínica Geral', description: 'Check-up completo.' }, { icon: '💆', title: 'Dermatologia', description: 'Pele saudável e bonita.' }] } },
          { id: 's3', type: 'social_proof', title: 'Credibilidade', visible: true, styles: {}, content: { items: [{ number: '20+', label: 'Anos de Experiência' }, { number: '50.000+', label: 'Pacientes Atendidos' }, { number: '4.9⭐', label: 'Google Reviews' }] } },
          { id: 's4', type: 'process_steps', title: 'Agendamento', visible: true, styles: {}, content: { title: 'Agende em 3 Passos', items: [{ step: '1', title: 'Escolha', description: 'Selecione a especialidade.' }, { step: '2', title: 'Agende', description: 'Horário que preferir.' }, { step: '3', title: 'Consulte', description: 'Atendimento personalizado.' }] } },
          { id: 's5', type: 'testimonials', title: 'Pacientes', visible: true, styles: {}, content: { items: [{ name: 'Maria C.', role: 'Paciente', text: 'Atendimento impecável. Me senti segura do início ao fim.' }] } },
          { id: 's6', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Cuide da Sua Saúde Hoje', description: 'Agende pelo WhatsApp ou telefone.', button_text: 'Agendar Consulta', button_url: '#' } },
          { id: 's7', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Clínica Saúde & Vida', copyright: `© ${yr} — CRM/SP XXXXX` } },
        ]
      },
    ]
  },
  {
    id: 'ecommerce', name: 'E-commerce & Produto', icon: '🛍️',
    templates: [
      {
        id: 'ft-luxury-product', name: 'Luxury Black', category: 'ecommerce',
        description: 'Produto premium com visual sofisticado em preto e dourado',
        tags: ['dark', 'luxury', 'premium', 'gold'],
        config: { primaryColor: '#d4af37', accentColor: '#f1c40f', backgroundColor: '#1a1a2e', textColor: '#f5f5f5', fontDisplay: 'Playfair Display', fontBody: 'Inter', heroStyle: 'image-overlay', cardStyle: 'glass', borderRadius: '8px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Elegância Redefinida', subheadline: 'Peças exclusivas para quem não aceita o ordinário. Edição limitada.', cta_text: 'Explorar Coleção', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'image', title: 'Produto', visible: true, styles: {}, content: { url: '', alt: 'Produto Premium', caption: 'Crafted with perfection. Limited edition.', fit: 'contain' } },
          { id: 's3', type: 'features', title: 'Detalhes', visible: true, styles: {}, content: { items: [{ icon: '💎', title: 'Materiais Premium', description: 'Couro italiano, metais nobres.' }, { icon: '✋', title: 'Feito à Mão', description: 'Cada peça é artesanalmente criada.' }, { icon: '📦', title: 'Embalagem Exclusiva', description: 'Apresentação digna de presente.' }] } },
          { id: 's4', type: 'testimonials', title: 'Reviews', visible: true, styles: {}, content: { items: [{ name: 'Collector', role: 'VIP Client', text: 'A qualidade é incomparável. Vale cada centavo.' }] } },
          { id: 's5', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Edição Limitada', description: 'Restam apenas 50 unidades.', button_text: 'Garantir a Minha', button_url: '#' } },
          { id: 's6', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Maison Luxe', copyright: `© ${yr}` } },
        ]
      },
      {
        id: 'ft-tech-product', name: 'Tech Launch', category: 'ecommerce',
        description: 'Lançamento de produto tech com visual escuro Apple-like',
        tags: ['dark', 'tech', 'product', 'apple-style'],
        config: { primaryColor: '#3b82f6', accentColor: '#60a5fa', backgroundColor: '#111827', textColor: '#f9fafb', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'image-overlay', cardStyle: 'glass', borderRadius: '16px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'O Novo Padrão de Tecnologia', subheadline: 'Mais rápido. Mais inteligente. Mais bonito. Conheça o futuro.', cta_text: 'Comprar Agora', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'image', title: 'Produto', visible: true, styles: {}, content: { url: '', alt: 'Produto Tech', caption: '', fit: 'contain' } },
          { id: 's3', type: 'social_proof', title: 'Specs', visible: true, styles: {}, content: { items: [{ number: '5nm', label: 'Processador' }, { number: '120Hz', label: 'Display' }, { number: '48h', label: 'Bateria' }, { number: '5G', label: 'Conectividade' }] } },
          { id: 's4', type: 'features', title: 'Features', visible: true, styles: {}, content: { items: [{ icon: '🖥️', title: 'Display Pro', description: 'Tela OLED 120Hz com cores precisas.' }, { icon: '📷', title: 'Câmera 108MP', description: 'Fotos profissionais no bolso.' }, { icon: '🔋', title: 'Bateria Gigante', description: '48 horas de uso contínuo.' }] } },
          { id: 's5', type: 'video', title: 'Unboxing', visible: true, styles: {}, content: { url: '', poster: '', autoplay: false } },
          { id: 's6', type: 'pricing', title: 'Preço', visible: true, styles: {}, content: { title: 'Escolha Seu Modelo', items: [{ name: 'Standard', price: 'R$ 2.999', features: ['128GB', 'Display Pro', 'Câmera dupla'], highlighted: false }, { name: 'Pro Max', price: 'R$ 4.999', features: ['512GB', 'Display ProMotion', 'Câmera tripla', 'Lidar'], highlighted: true }] } },
          { id: 's7', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Pré-venda Exclusiva', description: 'Reserve o seu com desconto.', button_text: 'Reservar', button_url: '#' } },
          { id: 's8', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'TechBrand', copyright: `© ${yr}` } },
        ]
      },
    ]
  },
  {
    id: 'educacao', name: 'Educação & Cursos', icon: '📚',
    templates: [
      {
        id: 'ft-curso-pro', name: 'Course Pro', category: 'educacao',
        description: 'Página de curso online profissional com módulos e preços',
        tags: ['education', 'course', 'professional', 'blue'],
        config: { primaryColor: '#1d4ed8', accentColor: '#3b82f6', backgroundColor: '#eff6ff', textColor: '#1e3a8a', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'shadow', borderRadius: '16px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Domine [Habilidade] em 30 Dias', subheadline: 'O curso mais completo do mercado. Do zero ao avançado com projetos práticos.', cta_text: 'Matricular-se Agora', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'video', title: 'Aula Grátis', visible: true, styles: {}, content: { url: '', poster: '', autoplay: false, _headline_overlay: 'Assista a primeira aula grátis' } },
          { id: 's3', type: 'social_proof', title: 'Números', visible: true, styles: {}, content: { items: [{ number: '10.000+', label: 'Alunos' }, { number: '4.9/5', label: 'Avaliação' }, { number: '95%', label: 'Conclusão' }] } },
          { id: 's4', type: 'process_steps', title: 'Jornada', visible: true, styles: {}, content: { title: 'Sua Jornada de Aprendizado', items: [{ step: '1', title: 'Fundamentos', description: 'Base sólida em 1 semana.' }, { step: '2', title: 'Prática', description: 'Projetos reais do mercado.' }, { step: '3', title: 'Avançado', description: 'Técnicas de profissional.' }, { step: '4', title: 'Certificação', description: 'Certificado reconhecido.' }] } },
          { id: 's5', type: 'features', title: 'O Que Inclui', visible: true, styles: {}, content: { items: [{ icon: '📹', title: '60h de Vídeo', description: 'Conteúdo atualizado.' }, { icon: '💻', title: 'Projetos Práticos', description: '15 projetos para portfolio.' }, { icon: '🏆', title: 'Certificado', description: 'Reconhecido pelo mercado.' }, { icon: '👥', title: 'Comunidade', description: 'Suporte entre alunos.' }] } },
          { id: 's6', type: 'testimonials', title: 'Alunos', visible: true, styles: {}, content: { items: [{ name: 'Lucas R.', role: 'Dev Jr → Dev Pleno', text: 'Consegui promoção 2 meses depois de terminar o curso.', metrics: '+85% salário' }, { name: 'Amanda T.', role: 'Mudança de carreira', text: 'Saí do RH e hoje sou dev. O curso mudou minha vida.' }] } },
          { id: 's7', type: 'pricing', title: 'Investimento', visible: true, styles: {}, content: { title: 'Invista em Você', items: [{ name: 'Básico', price: 'R$ 197', features: ['Acesso 1 ano', 'Certificado', 'Suporte'], highlighted: false }, { name: 'Completo', price: 'R$ 397', features: ['Acesso vitalício', 'Mentoria', 'Projetos extras', 'Comunidade VIP'], highlighted: true }] } },
          { id: 's8', type: 'guarantee', title: 'Garantia', visible: true, styles: {}, content: { icon: '🛡️', title: 'Garantia de 7 Dias', description: 'Não curtiu? Devolvemos 100% do valor.', duration: '7 dias' } },
          { id: 's9', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Vagas Limitadas Para Esta Turma', description: 'Próxima turma só em 3 meses.', button_text: 'Garantir Minha Vaga', button_url: '#' } },
          { id: 's10', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Academy Pro', copyright: `© ${yr}` } },
        ]
      },
    ]
  },
  {
    id: 'eventos', name: 'Eventos', icon: '🎪',
    templates: [
      {
        id: 'ft-evento-gala', name: 'Gala Night', category: 'eventos',
        description: 'Evento premium com visual sofisticado e dourado',
        tags: ['dark', 'luxury', 'event', 'gala'],
        config: { primaryColor: '#fbbf24', accentColor: '#f59e0b', backgroundColor: '#0a0a0a', textColor: '#fefce8', fontDisplay: 'Playfair Display', fontBody: 'Inter', heroStyle: 'image-overlay', cardStyle: 'glass', borderRadius: '12px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Gala Awards 2025', subheadline: 'Uma noite inesquecível celebrando os melhores do mercado. Black tie obrigatório.', cta_text: 'Reservar Convite', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'social_proof', title: 'Dados', visible: true, styles: {}, content: { items: [{ number: '500', label: 'Convidados VIP' }, { number: '20+', label: 'Premiações' }, { number: '1', label: 'Noite Mágica' }] } },
          { id: 's3', type: 'process_steps', title: 'Programação', visible: true, styles: {}, content: { title: 'Programação da Noite', items: [{ step: '19h', title: 'Welcome Drinks', description: 'Coquetel de boas-vindas.' }, { step: '20h', title: 'Jantar', description: 'Menu degustação 5 etapas.' }, { step: '22h', title: 'Premiação', description: 'Cerimônia principal.' }] } },
          { id: 's4', type: 'features', title: 'Experiência', visible: true, styles: {}, content: { items: [{ icon: '🥂', title: 'Open Bar Premium', description: 'Champagne, vinhos e destilados.' }, { icon: '🎵', title: 'DJ Internacional', description: 'Set exclusivo até 3h.' }, { icon: '📸', title: 'Fotografia', description: 'Cobertura profissional.' }] } },
          { id: 's5', type: 'pricing', title: 'Mesas', visible: true, styles: {}, content: { title: 'Reserve Sua Mesa', items: [{ name: 'Individual', price: 'R$ 1.500', features: ['1 convite', 'Open bar', 'Jantar'], highlighted: false }, { name: 'Mesa VIP (10)', price: 'R$ 12.000', features: ['10 convites', 'Área VIP', 'Garçom exclusivo', 'Meet & Greet'], highlighted: true }] } },
          { id: 's6', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Uma Noite. Infinitas Conexões.', description: 'Convites limitados por exclusividade.', button_text: 'Reservar Meu Lugar', button_url: '#' } },
          { id: 's7', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Gala Awards', copyright: `© ${yr}` } },
        ]
      },
      {
        id: 'ft-conference', name: 'Tech Conference', category: 'eventos',
        description: 'Conferência tech com visual dark e cyan moderno',
        tags: ['dark', 'tech', 'conference', 'cyan'],
        config: { primaryColor: '#06b6d4', accentColor: '#22d3ee', backgroundColor: '#0f172a', textColor: '#f0f9ff', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'glass', borderRadius: '12px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'DevConf 2025', subheadline: 'A maior conferência de tecnologia da América Latina. 3 dias. 100+ speakers. 5.000 devs.', cta_text: 'Garantir Ingresso', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'social_proof', title: 'Stats', visible: true, styles: {}, content: { items: [{ number: '5.000+', label: 'Participantes' }, { number: '100+', label: 'Speakers' }, { number: '3 dias', label: 'Imersão' }, { number: '50+', label: 'Workshops' }] } },
          { id: 's3', type: 'features', title: 'Tracks', visible: true, styles: {}, content: { items: [{ icon: '🧠', title: 'AI & ML', description: 'LLMs, Computer Vision, MLOps.' }, { icon: '☁️', title: 'Cloud & DevOps', description: 'K8s, Serverless, IaC.' }, { icon: '⚛️', title: 'Frontend', description: 'React, Vue, Next.js, WASM.' }, { icon: '🔐', title: 'Security', description: 'Zero Trust, AppSec, CTF.' }] } },
          { id: 's4', type: 'process_steps', title: 'Agenda', visible: true, styles: {}, content: { title: 'Agenda do Evento', items: [{ step: 'Dia 1', title: 'Keynotes', description: 'Abertura e palestras principais.' }, { step: 'Dia 2', title: 'Workshops', description: 'Mão na massa em todas as tracks.' }, { step: 'Dia 3', title: 'Hackathon', description: '24h de código e networking.' }] } },
          { id: 's5', type: 'pricing', title: 'Ingressos', visible: true, styles: {}, content: { title: 'Ingresso DevConf', items: [{ name: 'Early Bird', price: 'R$ 297', features: ['Acesso geral', 'Coffee', 'Certificado'], highlighted: false }, { name: 'All Access', price: 'R$ 697', features: ['Tudo do Early Bird', 'Workshops', 'Afterparty', 'Gravações'], highlighted: true }] } },
          { id: 's6', type: 'faq', title: 'FAQ', visible: true, styles: {}, content: { items: [{ question: 'Tem transmissão online?', answer: 'Sim! O ingresso Online custa R$ 97.' }, { question: 'Qual a política de cancelamento?', answer: 'Reembolso total até 30 dias antes.' }] } },
          { id: 's7', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Nos Vemos na DevConf! 🚀', description: 'Ingressos Early Bird com 40% off.', button_text: 'Comprar Agora', button_url: '#' } },
          { id: 's8', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'DevConf Brasil', copyright: `© ${yr}` } },
        ]
      },
    ]
  },
  {
    id: 'portfolio', name: 'Portfólio & Criativo', icon: '🎨',
    templates: [
      {
        id: 'ft-portfolio-dark', name: 'Dark Portfolio', category: 'portfolio',
        description: 'Portfólio minimalista escuro para designers e criativos',
        tags: ['dark', 'minimal', 'portfolio', 'designer'],
        config: { primaryColor: '#8b5cf6', accentColor: '#a78bfa', backgroundColor: '#0f172a', textColor: '#e2e8f0', fontDisplay: 'Playfair Display', fontBody: 'Inter', heroStyle: 'minimal', cardStyle: 'glass', borderRadius: '16px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Design É Resolver Problemas com Beleza', subheadline: 'Designer & Diretor Criativo com 12+ anos criando experiências memoráveis para marcas globais.', cta_text: 'Ver Projetos', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'gallery', title: 'Portfolio', visible: true, styles: {}, content: { images: [] } },
          { id: 's3', type: 'features', title: 'Serviços', visible: true, styles: {}, content: { items: [{ icon: '🎨', title: 'Brand Identity', description: 'Marcas que comunicam e conectam.' }, { icon: '🖥️', title: 'UI/UX Design', description: 'Interfaces intuitivas e bonitas.' }, { icon: '📱', title: 'Mobile Apps', description: 'Experiências nativas fluidas.' }, { icon: '🎬', title: 'Motion Design', description: 'Animações que contam histórias.' }] } },
          { id: 's4', type: 'social_proof', title: 'Números', visible: true, styles: {}, content: { items: [{ number: '150+', label: 'Projetos' }, { number: '80+', label: 'Clientes' }, { number: '12', label: 'Prêmios' }] } },
          { id: 's5', type: 'testimonials', title: 'Clientes', visible: true, styles: {}, content: { items: [{ name: 'Google', role: 'Cliente', text: 'Trabalho excepcional. Entregou além do briefing.' }, { name: 'Spotify', role: 'Cliente', text: 'Criatividade e precisão. Perfeito.' }] } },
          { id: 's6', type: 'cta', title: 'Contato', visible: true, styles: {}, content: { headline: 'Vamos Criar Algo Incrível?', description: 'Disponível para projetos selecionados.', button_text: 'hello@designer.com', button_url: '#' } },
          { id: 's7', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Studio [Seu Nome]', copyright: `© ${yr}` } },
        ]
      },
      {
        id: 'ft-portfolio-brutalist', name: 'Brutalist Portfolio', category: 'portfolio',
        description: 'Estilo brutalist com alto contraste e tipografia ousada',
        tags: ['brutalist', 'bold', 'contrast', 'experimental'],
        config: { primaryColor: '#000000', accentColor: '#ef4444', backgroundColor: '#fafafa', textColor: '#000000', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'minimal', cardStyle: 'bordered', borderRadius: '0px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'NÃO SOU MAIS UM DESIGNER.', subheadline: 'Crio experiências que desafiam o status quo. Se você quer "bonitinho", procure outro.', cta_text: 'VER TRABALHO →', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'text', title: 'Manifesto', visible: true, styles: {}, content: { body: 'Design não é decoração. É função. É impacto. É a diferença entre ser ignorado e ser inesquecível.\n\nCada pixel tem propósito. Cada escolha tem razão. Zero concessões.', alignment: 'left' } },
          { id: 's3', type: 'gallery', title: 'Trabalhos', visible: true, styles: {}, content: { images: [] } },
          { id: 's4', type: 'features', title: 'Faço', visible: true, styles: {}, content: { items: [{ icon: '→', title: 'IDENTIDADE', description: 'Marcas que gritam, não sussurram.' }, { icon: '→', title: 'DIGITAL', description: 'Sites que performam e impressionam.' }, { icon: '→', title: 'EDITORIAL', description: 'Layout que conta histórias.' }] } },
          { id: 's5', type: 'cta', title: 'Contato', visible: true, styles: {}, content: { headline: 'INTERESSOU?', description: 'Manda um email. Sou direto também.', button_text: 'CONTATO', button_url: '#' } },
          { id: 's6', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: '[NOME]', copyright: `© ${yr}` } },
        ]
      },
    ]
  },
  {
    id: 'gastronomia', name: 'Gastronomia', icon: '🍽️',
    templates: [
      {
        id: 'ft-fine-dining', name: 'Fine Dining', category: 'gastronomia',
        description: 'Restaurante sofisticado com visual escuro e dourado elegante',
        tags: ['dark', 'elegant', 'restaurant', 'premium'],
        config: { primaryColor: '#d4af37', accentColor: '#b8860b', backgroundColor: '#1c1917', textColor: '#f5f5f4', fontDisplay: 'Playfair Display', fontBody: 'Inter', heroStyle: 'image-overlay', cardStyle: 'glass', borderRadius: '8px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Uma Experiência Gastronômica Única', subheadline: 'Menu degustação com ingredientes sazonais, harmonizados pelo Chef premiado.', cta_text: 'Reservar Mesa', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'text', title: 'Filosofia', visible: true, styles: {}, content: { body: '"Cozinhar é um ato de amor. Cada prato conta uma história, cada ingrediente é escolhido com devoção. Aqui, não servimos refeições — criamos memórias."', alignment: 'center' } },
          { id: 's3', type: 'gallery', title: 'Pratos', visible: true, styles: {}, content: { images: [] } },
          { id: 's4', type: 'features', title: 'Experiência', visible: true, styles: {}, content: { items: [{ icon: '🌿', title: 'Farm to Table', description: 'Ingredientes orgânicos de produtores locais.' }, { icon: '🍷', title: 'Sommelier', description: 'Harmonização exclusiva para cada prato.' }, { icon: '👨‍🍳', title: 'Chef Estrela', description: '2 estrelas Michelin. 20 anos de carreira.' }] } },
          { id: 's5', type: 'testimonials', title: 'Reviews', visible: true, styles: {}, content: { items: [{ name: 'Guia Michelin', role: '⭐⭐', text: 'Cozinha excepcional com técnica impecável e criatividade.' }, { name: 'Veja SP', role: 'Top 10', text: 'Um dos melhores restaurantes da cidade.' }] } },
          { id: 's6', type: 'cta', title: 'Reserva', visible: true, styles: {}, content: { headline: 'Reserve Sua Experiência', description: 'Menu degustação a partir de R$ 380/pessoa.', button_text: 'Fazer Reserva', button_url: '#' } },
          { id: 's7', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Restaurante [Nome]', copyright: `© ${yr}` } },
        ]
      },
      {
        id: 'ft-street-food', name: 'Urban Kitchen', category: 'gastronomia',
        description: 'Hamburgueria/street food com visual escuro e moderno',
        tags: ['dark', 'urban', 'burger', 'modern'],
        config: { primaryColor: '#ef4444', accentColor: '#f97316', backgroundColor: '#111827', textColor: '#f9fafb', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'glass', borderRadius: '12px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Smash Burgers Artesanais 🔥', subheadline: 'Carne 100% Angus, pão brioche artesanal, ingredientes premium. Delivery em até 30min.', cta_text: 'Pedir Agora', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'features', title: 'Menu', visible: true, styles: {}, content: { items: [{ icon: '🍔', title: 'Classic Smash', description: 'R$ 29,90 — 2 carnes, queijo, molho special.' }, { icon: '🍔', title: 'Bacon Beast', description: 'R$ 34,90 — Bacon crocante, onion rings.' }, { icon: '🍔', title: 'Truffle King', description: 'R$ 39,90 — Aioli de trufa, gruyère.' }, { icon: '🍟', title: 'Sides', description: 'Batata, onion rings, milkshake.' }] } },
          { id: 's3', type: 'social_proof', title: 'Stats', visible: true, styles: {}, content: { items: [{ number: '4.8⭐', label: 'iFood' }, { number: '50K+', label: 'Burgers vendidos' }, { number: '< 30min', label: 'Delivery' }] } },
          { id: 's4', type: 'testimonials', title: 'Reviews', visible: true, styles: {}, content: { items: [{ name: 'Foodie SP', role: 'Blogger', text: 'O melhor smash burger da cidade. Sem concorrente.' }] } },
          { id: 's5', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Bateu a Fome? 🍔', description: 'Peça agora e receba em 30 minutos.', button_text: 'Pedir pelo iFood', button_url: '#' } },
          { id: 's6', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Urban Smash', copyright: `© ${yr}` } },
        ]
      },
    ]
  },
  {
    id: 'minimal', name: 'Minimalista', icon: '✨',
    templates: [
      {
        id: 'ft-minimal-zen', name: 'Zen Minimal', category: 'minimal',
        description: 'Ultra minimalista — muito espaço em branco, tipografia elegante, zero ruído',
        tags: ['minimal', 'zen', 'clean', 'whitespace'],
        config: { primaryColor: '#18181b', accentColor: '#a1a1aa', backgroundColor: '#fafafa', textColor: '#27272a', fontDisplay: 'Playfair Display', fontBody: 'Inter', heroStyle: 'minimal', cardStyle: 'bordered', borderRadius: '4px', maxWidth: '800px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Menos é mais.', subheadline: 'Uma frase clara sobre o que você faz e por que importa.', cta_text: 'Saiba mais', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'text', title: 'Sobre', visible: true, styles: {}, content: { body: 'Uma descrição breve e direta. Sem adjetivos desnecessários. Apenas a verdade sobre o que entregamos.', alignment: 'left' } },
          { id: 's3', type: 'features', title: 'O que fazemos', visible: true, styles: { layout: 'icons-left' }, content: { items: [{ icon: '—', title: 'Simplicidade', description: 'Direto ao ponto, sempre.' }, { icon: '—', title: 'Qualidade', description: 'Cada detalhe importa.' }, { icon: '—', title: 'Resultado', description: 'Métricas que falam por si.' }] } },
          { id: 's4', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Vamos conversar?', description: '', button_text: 'Entrar em contato →', button_url: '#' } },
          { id: 's5', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: '', copyright: `© ${yr}` } },
        ]
      },
      {
        id: 'ft-minimal-mono', name: 'Mono Studio', category: 'minimal',
        description: 'Design monocromático preto e branco, tipografia bold, estilo editorial',
        tags: ['mono', 'black-white', 'editorial', 'bold'],
        config: { primaryColor: '#000000', accentColor: '#525252', backgroundColor: '#ffffff', textColor: '#171717', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'minimal', cardStyle: 'bordered', borderRadius: '0px', maxWidth: '960px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'FAÇA DIFERENTE.', subheadline: 'Design, estratégia e execução para marcas que não seguem a manada.', cta_text: 'VER TRABALHO', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'social_proof', title: 'Números', visible: true, styles: {}, content: { items: [{ number: '200+', label: 'Projetos' }, { number: '50+', label: 'Clientes' }, { number: '8', label: 'Anos' }] } },
          { id: 's3', type: 'features', title: 'Serviços', visible: true, styles: {}, content: { items: [{ icon: '01', title: 'Estratégia', description: 'Planejamento e posicionamento.' }, { icon: '02', title: 'Design', description: 'Identidade visual e interfaces.' }, { icon: '03', title: 'Execução', description: 'Desenvolvimento e entrega.' }] } },
          { id: 's4', type: 'gallery', title: 'Projetos', visible: true, styles: {}, content: { images: [] } },
          { id: 's5', type: 'cta', title: 'Contato', visible: true, styles: {}, content: { headline: 'Próximo projeto?', description: 'hello@studio.com', button_text: 'CONTATO', button_url: '#' } },
          { id: 's6', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Studio', copyright: `© ${yr}` } },
        ]
      },
      {
        id: 'ft-minimal-soft', name: 'Soft Touch', category: 'minimal',
        description: 'Tons suaves, cantos arredondados, sensação acolhedora e feminina',
        tags: ['soft', 'pastel', 'feminine', 'rounded'],
        config: { primaryColor: '#be185d', accentColor: '#f9a8d4', backgroundColor: '#fdf2f8', textColor: '#831843', fontDisplay: 'Playfair Display', fontBody: 'Inter', heroStyle: 'minimal', cardStyle: 'shadow', borderRadius: '24px', maxWidth: '960px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Cuidado e atenção em cada detalhe', subheadline: 'Produtos pensados para quem valoriza qualidade, beleza e propósito.', cta_text: 'Conhecer →', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'image', title: 'Visual', visible: true, styles: {}, content: { url: '', alt: 'Produto', caption: '', fit: 'cover' } },
          { id: 's3', type: 'features', title: 'Diferenciais', visible: true, styles: {}, content: { items: [{ icon: '🌸', title: 'Natural', description: 'Ingredientes selecionados com carinho.' }, { icon: '💜', title: 'Artesanal', description: 'Feito à mão, peça a peça.' }, { icon: '🌱', title: 'Sustentável', description: 'Embalagens eco-friendly.' }] } },
          { id: 's4', type: 'testimonials', title: 'Clientes', visible: true, styles: {}, content: { items: [{ name: 'Ana', role: 'Cliente', text: 'Amei cada detalhe. Superou minhas expectativas.' }] } },
          { id: 's5', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Pronta para experimentar?', description: 'Frete grátis no primeiro pedido.', button_text: 'Quero conhecer', button_url: '#' } },
          { id: 's6', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: '', copyright: `© ${yr}` } },
        ]
      },
    ]
  },
  {
    id: 'ugc', name: 'UGC & Creator', icon: '🤳',
    templates: [
      {
        id: 'ft-ugc-creator', name: 'Creator Bio', category: 'ugc',
        description: 'Bio page estilo Linktree premium para criadores de conteúdo e influenciadores',
        tags: ['ugc', 'creator', 'bio', 'linktree'],
        config: { primaryColor: '#7c3aed', accentColor: '#c084fc', backgroundColor: '#0c0a1d', textColor: '#e9e5f5', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'minimal', cardStyle: 'glass', borderRadius: '16px', maxWidth: '640px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: '@seunome', subheadline: 'Creator • Estrategista • Empreendedor | +500K seguidores', cta_text: 'Me siga no Instagram', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'social_proof', title: 'Stats', visible: true, styles: {}, content: { items: [{ number: '500K+', label: 'Seguidores' }, { number: '10M+', label: 'Views/mês' }, { number: '200+', label: 'Marcas parceiras' }] } },
          { id: 's3', type: 'features', title: 'Links', visible: true, styles: {}, content: { items: [{ icon: '🎥', title: 'Meu Curso', description: 'Aprenda a criar conteúdo que vende.' }, { icon: '📱', title: 'Preset Pack', description: 'Filtros e templates exclusivos.' }, { icon: '📧', title: 'Newsletter', description: 'Dicas semanais no seu email.' }, { icon: '🤝', title: 'Parcerias', description: 'Mídia kit e propostas.' }] } },
          { id: 's4', type: 'testimonials', title: 'Depoimentos', visible: true, styles: {}, content: { items: [{ name: 'Marca X', role: 'Parceria', text: 'ROI de 5x na campanha. Melhor creator que já trabalhamos.' }, { name: 'Aluno', role: 'Curso', text: 'Comecei do zero e em 30 dias já monetizei meu perfil.' }] } },
          { id: 's5', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Quer criar conteúdo que converte?', description: 'Entre para a comunidade.', button_text: 'Acessar agora', button_url: '#' } },
          { id: 's6', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: '@seunome', copyright: `© ${yr}` } },
        ]
      },
      {
        id: 'ft-ugc-portfolio', name: 'UGC Portfolio', category: 'ugc',
        description: 'Portfólio para criadores UGC mostrando trabalhos, métricas e contato para marcas',
        tags: ['ugc', 'portfolio', 'brands', 'media-kit'],
        config: { primaryColor: '#f59e0b', accentColor: '#fbbf24', backgroundColor: '#fffbeb', textColor: '#78350f', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'split', cardStyle: 'shadow', borderRadius: '16px', maxWidth: '1000px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: { layout: 'split-left' }, content: { headline: 'Conteúdo autêntico que converte', subheadline: 'Criadora UGC especializada em lifestyle, beleza e tech. Conteúdo que parece orgânico e performa como anúncio.', cta_text: 'Ver Mídia Kit', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'social_proof', title: 'Resultados', visible: true, styles: {}, content: { items: [{ number: '150+', label: 'Conteúdos entregues' }, { number: '45+', label: 'Marcas atendidas' }, { number: '3.2x', label: 'ROAS médio' }, { number: '< 48h', label: 'Entrega' }] } },
          { id: 's3', type: 'gallery', title: 'Portfolio', visible: true, styles: {}, content: { images: [] } },
          { id: 's4', type: 'features', title: 'Serviços', visible: true, styles: {}, content: { items: [{ icon: '📱', title: 'UGC para Ads', description: 'Vídeos nativos para Meta e TikTok Ads.' }, { icon: '📸', title: 'Fotos Lifestyle', description: 'Fotos autênticas para feed e stories.' }, { icon: '🎬', title: 'Unboxing & Review', description: 'Conteúdo de prova social genuíno.' }, { icon: '✍️', title: 'Roteiro + Produção', description: 'Do briefing à entrega final.' }] } },
          { id: 's5', type: 'process_steps', title: 'Processo', visible: true, styles: {}, content: { title: 'Como funciona', items: [{ step: '1', title: 'Briefing', description: 'Envie o produto e briefing.' }, { step: '2', title: 'Roteiro', description: 'Aprovo o roteiro em 24h.' }, { step: '3', title: 'Entrega', description: 'Conteúdo pronto em 48h.' }] } },
          { id: 's6', type: 'testimonials', title: 'Marcas', visible: true, styles: {}, content: { items: [{ name: 'Brand Manager', role: 'E-commerce de beleza', text: 'Os vídeos da [nome] tiveram CTR 3x maior que nossos criativos internos.', metrics: '+300% CTR' }, { name: 'Head de Growth', role: 'Startup Tech', text: 'Conteúdo autêntico que realmente converte. Parceria contínua.', metrics: '4.5x ROAS' }] } },
          { id: 's7', type: 'pricing', title: 'Pacotes', visible: true, styles: {}, content: { title: 'Pacotes', items: [{ name: 'Starter', price: 'R$ 500', features: ['2 vídeos UGC', 'Até 60s cada', '1 revisão'], highlighted: false }, { name: 'Pro', price: 'R$ 1.200', features: ['5 vídeos UGC', 'Fotos lifestyle', '2 revisões', 'Roteiro incluso'], highlighted: true }, { name: 'Brand Deal', price: 'Sob consulta', features: ['Conteúdo mensal', 'Exclusividade', 'Estratégia', 'Relatório de métricas'], highlighted: false }] } },
          { id: 's8', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Vamos criar juntos?', description: 'Respondo em até 24h.', button_text: 'Solicitar orçamento', button_url: '#' } },
          { id: 's9', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'UGC Creator', copyright: `© ${yr}` } },
        ]
      },
      {
        id: 'ft-ugc-launch', name: 'Product Drop', category: 'ugc',
        description: 'Página de lançamento estilo drop/hype com countdown e escassez visual',
        tags: ['ugc', 'drop', 'hype', 'launch'],
        config: { primaryColor: '#dc2626', accentColor: '#ffffff', backgroundColor: '#000000', textColor: '#fafafa', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'minimal', cardStyle: 'glass', borderRadius: '0px', maxWidth: '900px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'DROP 001 — ESGOTA RÁPIDO', subheadline: 'Edição limitada. Sem reposição. Quando acabar, acabou.', cta_text: 'GARANTIR O MEU', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'image', title: 'Produto', visible: true, styles: {}, content: { url: '', alt: 'Produto Drop', caption: '', fit: 'contain' } },
          { id: 's3', type: 'social_proof', title: 'Hype', visible: true, styles: {}, content: { items: [{ number: '73', label: 'Unidades' }, { number: '2.4K', label: 'Na lista de espera' }, { number: '1', label: 'Chance' }] } },
          { id: 's4', type: 'features', title: 'Detalhes', visible: true, styles: {}, content: { items: [{ icon: '🔥', title: 'Edição Limitada', description: 'Apenas 73 unidades produzidas.' }, { icon: '📦', title: 'Entrega Express', description: 'Envio em 24h após compra.' }, { icon: '🏷️', title: 'Certificado', description: 'Numeração individual exclusiva.' }] } },
          { id: 's5', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'NÃO PERCA', description: 'Drop abre em breve.', button_text: 'ENTRAR NA LISTA VIP', button_url: '#' } },
          { id: 's6', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: '', copyright: `© ${yr}` } },
        ]
      },
    ]
  },
];

export const ALL_FULL_TEMPLATES: FullTemplate[] = FULL_TEMPLATE_CATEGORIES.flatMap(c => c.templates);

export function getFullTemplateById(id: string): FullTemplate | undefined {
  return ALL_FULL_TEMPLATES.find(t => t.id === id);
}
