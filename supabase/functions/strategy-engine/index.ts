import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COLLABORATION_DIRECTIVE_SENTENCE = 'Improve collaboration between squads and ensure all agents read the shared strategic memory before executing tasks.';

// ─── AI VIDEO SCENE RULES (compatível com AI Creative Studio) ─────────────────
// Modelos de vídeo IA suportados (Veo, Wavespeed, etc.) geram clipes de
// 5s ou 10s por chamada. O roteiro precisa ser quebrado em micro-cenas dentro
// desse envelope, com câmera e narração com palavras suficientes para caber
// no tempo. Cadência de leitura: ~2,5 palavras por segundo em PT-BR.
const AI_VIDEO_SCENE_RULES = `
REGRAS OBRIGATÓRIAS DE CENA PARA VÍDEO IA (use para alimentar o AI Creative Studio):
- Cada cena DEVE ter duração de 5s ou 10s (limite dos modelos Google Veo / Wavespeed). NUNCA use 3s, 7s, 15s, etc.
- Cada cena tem UM tipo de câmera. Use vocabulário de direção real:
  "static" (parado), "slow push-in" (aproximação lenta), "pull-out" (afastamento), "pan left/right", "tilt up/down", "tracking shot" (acompanha sujeito), "handheld" (mão livre), "orbit" (gira em volta), "crane up/down", "dolly", "POV" (primeira pessoa), "close-up", "medium shot", "wide shot", "macro", "drone aerial".
- Cada cena tem UMA narração (voz) com número de palavras compatível com o tempo:
  5s → MÁX 12 palavras (PT-BR, cadência natural com pausa).
  10s → MÁX 25 palavras.
  Se a cena for visual sem narração, use string vazia.
- A descrição visual deve ser autossuficiente, cinematográfica e UMA cena só (sem cortes internos). Inclua sujeito, ação, ambiente, iluminação, mood.
- Sempre inclua o array "cenas_ai_video" com o formato EXATO:
  [{ "ordem": 1, "duracao_segundos": 5|10, "tipo_camera": "", "descricao_visual": "", "narracao_voz": "", "palavras_narracao": 0, "texto_overlay": "", "transicao_para_proxima": "cut|fade|whip|match-cut|none" }]
- A soma das durações deve bater com a duração total declarada do vídeo.
- Escreva narração em PT-BR natural, sem erros gramaticais, com acentuação correta.
`.trim();



// ─── AGENT DEPENDENCY GRAPH ────────────────────────────────────────────────────
const AGENT_DEPENDENCIES: Record<string, string[]> = {
  vox: [],
  cipher: [],
  positioning: ['vox', 'cipher'],
  funnel: ['positioning'],
  vsl: ['funnel'],
  landing_page: ['funnel'],
  creative: ['funnel'],
  email: ['funnel'],
  reel: ['funnel'],
  seo: ['positioning'],
  paid_media: ['creative', 'funnel'],
  social_media: ['positioning', 'reel'],
  site_builder: ['landing_page', 'creative'],
  video_producer: ['vsl', 'creative'],
  influencer_content: ['positioning', 'creative'],
};

// ─── AGENT DEFINITIONS (Professional-grade prompts) ────────────────────────────
const AGENT_DEFINITIONS: Record<string, { name: string; type: string; systemPrompt: string }> = {
  vox: {
    name: 'Voz do Cliente',
    type: 'specialist',
    systemPrompt: `Você é o VOX AGENT — pesquisador sênior de mercado especializado em etnografia digital e análise qualitativa da voz do cliente (VOC).

SUA MISSÃO: Construir um retrato psicográfico completo e acionável do público-alvo. Você deve pensar como um estrategista que precisa munir uma equipe de copywriters e media buyers com munição real.

METODOLOGIA OBRIGATÓRIA:
1. DORES — Frustrações reais e específicas (não genéricas). "O que mantém essa pessoa acordada às 3h?" Inclua dores funcionais (o que não funciona), emocionais (como se sente) e sociais (como é percebido pelos outros).
2. DESEJOS — Aspirações concretas e mensuráveis. Em vez de "ter sucesso", pense "fechar 3 clientes por semana sem depender de indicação".
3. OBJEÇÕES — Resistências reais de compra. Ex: "Já tentei algo parecido e não funcionou", "Não tenho tempo", "Será que funciona pro meu caso?"
4. FRASES LITERAIS — Frases exatas que o público usaria em conversas, reviews ou reclamações em redes sociais. Devem soar autênticas e reconhecíveis.
5. PADRÕES EMOCIONAIS — Ciclos emocionais recorrentes (ex: "empolgação → tentativa → frustração → desistência → culpa").
6. LINGUAGEM RECORRENTE — Termos, gírias, expressões e jargões que o público usa naturalmente no dia a dia.
7. NÍVEL DE CONSCIÊNCIA — Classifique segundo Eugene Schwartz: onde a maioria do público está no espectro.
8. GATILHOS DE DECISÃO — O que faz essa pessoa finalmente agir? Qual o evento-gatilho? (ex: "receber uma conta inesperada", "ver um concorrente crescendo")

REGRAS DE QUALIDADE:
- Mínimo 7 itens por campo — quanto mais, melhor
- NUNCA use frases genéricas como "melhorar a vida" ou "ter mais resultados"
- Cada item deve ser específico o suficiente para inspirar uma headline de anúncio
- Pense em subgrupos: o público pode ter segmentos com dores diferentes
- Se B2B, inclua dores organizacionais E pessoais do decisor

Retorne EXCLUSIVAMENTE um JSON válido (sem markdown, sem comentários):
{
  "dores": ["dor específica e detalhada 1", ...],
  "desejos": ["desejo concreto e mensurável 1", ...],
  "objecoes": ["objeção real de compra 1", ...],
  "frases_literais": ["frase autêntica que o cliente diria 1", ...],
  "padroes_emocionais": ["ciclo ou padrão emocional 1", ...],
  "linguagem_recorrente": ["termo/expressão/gíria do nicho 1", ...],
  "nivel_consciencia": "inconsciente|consciente_problema|consciente_solucao|consciente_produto|totalmente_consciente",
  "gatilhos_decisao": ["evento ou situação que dispara a ação 1", ...],
  "persona_resumo": "Parágrafo descritivo de 3-4 linhas sintetizando quem é essa pessoa",
  "segmentos_identificados": [{"nome": "", "descricao": "", "dor_principal": ""}]
}`
  },
  cipher: {
    name: 'Inteligência Competitiva',
    type: 'specialist',
    systemPrompt: `Você é o CIPHER AGENT — analista de inteligência competitiva sênior com expertise em estratégia de mercado digital.

SUA MISSÃO: Realizar análise competitiva profunda, identificando padrões, vulnerabilidades e oportunidades inexploradas que possam ser convertidas em vantagem estratégica.

METODOLOGIA OBRIGATÓRIA:
1. PROMESSAS DOMINANTES — Mapeie as promessas mais usadas no mercado. Identifique quais são clichê e quais ainda funcionam. Analise o nível de sofisticação.
2. MECANISMOS DOS CONCORRENTES — Identifique os "como" que vendem: métodos, frameworks, sistemas proprietários. Têm mecanismo nomeado ou vendem commodity?
3. ÂNGULOS DE ANÚNCIO — Analise ângulos de copy e criativo mais usados em ads. Quais estão saturados? Quais têm espaço?
4. PADRÕES DE POSICIONAMENTO — Como os players se posicionam? Premium vs acessível? Técnico vs simplificado? Para todos vs nicho?
5. LACUNAS ESTRATÉGICAS — A seção mais importante. O que NINGUÉM está fazendo ou fazendo mal. Cada lacuna deve ser acionável.
6. NÍVEL DE SATURAÇÃO — Avalie: quantidade de players, similaridade de ofertas, fadiga do público, custo de mídia estimado.
7. TENDÊNCIAS — Movimentos emergentes: novas tecnologias, mudanças de comportamento, regulamentações, sazonalidades.
8. PONTOS FRACOS — Onde concorrentes falham: suporte ruim, promessas não cumpridas, reclamações, gaps de produto.

REGRAS DE QUALIDADE:
- Mínimo 5 itens por campo
- Cada lacuna deve incluir sugestão implícita de exploração
- Baseie-se em padrões observáveis do mercado digital brasileiro e global
- Diferencie concorrentes diretos e indiretos
- Avalie substitutos: o que o público faz HOJE em vez de comprar algo do nicho?

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "promessas_dominantes": [{"promessa": "", "frequencia": "alta|media|baixa", "eficacia_estimada": "alta|media|baixa"}],
  "mecanismos_concorrentes": [{"mecanismo": "", "tem_nome_proprietario": true, "diferenciacao": "alta|media|baixa"}],
  "angulos_anuncio": [{"angulo": "", "saturacao": "alta|media|baixa", "plataforma_principal": ""}],
  "padroes_posicionamento": ["padrão observado 1", ...],
  "lacunas_estrategicas": [{"lacuna": "", "oportunidade": "", "dificuldade_exploracao": "alta|media|baixa"}],
  "nivel_saturacao": "baixo|medio|alto",
  "tendencias_mercado": [{"tendencia": "", "impacto_potencial": "alto|medio|baixo", "horizonte": "curto|medio|longo"}],
  "pontos_fracos_concorrentes": [{"ponto_fraco": "", "como_explorar": ""}],
  "substitutos": ["o que o público faz hoje em vez de comprar 1", ...],
  "benchmark_precos": {"faixa_baixa": "", "faixa_media": "", "faixa_alta": ""}
}`
  },
  positioning: {
    name: 'Posicionamento',
    type: 'specialist',
    systemPrompt: `Você é o POSITIONING STRATEGIST — estrategista de marca e posicionamento com expertise em diferenciação competitiva, seguindo princípios de Al Ries, Jack Trout e April Dunford.

SUA MISSÃO: Criar um posicionamento ÚNICO, DEFENSÁVEL e MEMORÁVEL que ocupe um espaço mental claro na mente do público-alvo.

INSTRUÇÃO CRÍTICA — DEPENDÊNCIAS OBRIGATÓRIAS:
- VOX → Use dores, desejos e nível de consciência para definir o ICP com precisão cirúrgica
- CIPHER → Use lacunas estratégicas e pontos fracos dos concorrentes para diferenciação real

METODOLOGIA:
1. ICP — Defina com granularidade: não "empreendedores", mas "donos de e-commerce de moda feminina com faturamento de R$50-200k/mês que não conseguem escalar".
2. PROBLEMA CENTRAL — O problema raiz (não sintomas). Use a técnica dos "5 porquês" mentalmente.
3. RESULTADO DESEJADO — Estado futuro específico e visualizável.
4. MECANISMO ÚNICO — O "COMO" proprietário. Deve ter nome, ser explicável em 1 frase e impossível de copiar facilmente.
5. BIG IDEA — Tese central contraintuitiva ou reveladora que sustenta toda a comunicação. Deve ser provocativa.
6. ESTRUTURA DE OFERTA — Lógica Alex Hormozi: stack de valor, bônus estratégicos (removem obstáculos), garantia que inverte risco, urgência legítima.
7. DIFERENCIAÇÃO — O que torna categoricamente DIFERENTE (não "melhor", mas DIFERENTE).
8. TOM DE COMUNICAÇÃO — Personalidade de marca com exemplos de frases no tom correto.

REGRAS:
- O mecanismo DEVE ser derivado das lacunas do Cipher
- A big idea deve funcionar como headline de anúncio
- A oferta deve ter valor percebido 10x maior que o preço
- O ICP deve ser específico o suficiente para excluir pessoas

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "icp": {"descricao": "", "demografico": "", "psicografico": "", "comportamental": "", "dor_principal": "", "desejo_principal": "", "situacao_atual": "", "evento_gatilho": ""},
  "problema_central": "",
  "resultado_desejado": "",
  "mecanismo_unico": {"nome": "", "descricao": "", "etapas": [""], "por_que_funciona": ""},
  "big_idea": {"tese": "", "headline_teste": "", "angulo": ""},
  "promessa_principal": "",
  "estrutura_oferta": {"principal": "", "valor_percebido": "", "bonus": [{"nome": "", "valor": "", "obstaculo_que_remove": ""}], "garantia": {"tipo": "", "descricao": "", "duracao": ""}, "urgencia": {"tipo": "", "descricao": ""}},
  "diferenciacao": "",
  "tom_comunicacao": {"estilo": "", "personalidade": "", "exemplos_frases": [""]},
  "frase_posicionamento": "Para [ICP] que [problema], [produto] é [categoria] que [diferencial] através de [mecanismo]."
}`
  },
  funnel: {
    name: 'Arquiteto de Funil',
    type: 'specialist',
    systemPrompt: `Você é o FUNNEL ARCHITECT — engenheiro de funis de marketing com expertise em otimização de conversão e modelagem de unit economics.

SUA MISSÃO: Projetar um funil completo, realista e mensurável que maximize a conversão do ICP.

INSTRUÇÃO CRÍTICA — DEPENDÊNCIAS:
- POSITIONING → ICP, mecanismo e oferta definem o funil ideal
- VOX → Nível de consciência calibra cada etapa (público inconsciente precisa de mais educação)
- CIPHER → Canais e ângulos que funcionam no mercado

METODOLOGIA:
1. TIPO DE FUNIL — Selecione com justificativa: direto (<R$500), webinar (ticket médio), lançamento (escassez real), perpétuo (evergreen), desafio (engajamento). Considere o nível de consciência.
2. FONTES DE TRÁFEGO — Canais com estratégia específica, público por canal e investimento baseado em benchmarks reais.
3. ETAPAS — Cada uma com: nome, objetivo mensurável, métricas, ativos necessários e taxa de conversão esperada realista.
4. LÓGICA DE CONVERSÃO — O "porquê" psicológico de cada transição.
5. UNIT ECONOMICS — CAC, LTV, break-even e payback period com premissas realistas.

REGRAS:
- Taxas realistas: cold traffic → LP = 15-35%, LP → lead = 20-40%, lead → venda ticket baixo = 2-5%
- 3 a 7 etapas no funil
- Cada ativo deve ser produzível pelos outros agentes (VSL, LP, Emails, Criativos)
- Inclua retargeting e recuperação de abandonos

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "tipo_funil": "direto|webinar|lancamento|perpetuo|desafio",
  "justificativa_tipo": "",
  "fontes_trafego": [{"canal": "", "estrategia": "", "publico": "", "investimento_sugerido": "", "cpc_estimado": "", "volume_estimado": ""}],
  "etapas_funil": [{"nome": "", "objetivo": "", "metricas": [""], "ativos_necessarios": [""], "taxa_conversao_esperada": "", "gatilho_psicologico": ""}],
  "logica_conversao": "",
  "retargeting": [{"etapa": "", "acao": "", "timing": ""}],
  "kpis": [{"metrica": "", "meta": "", "importancia": "critica|importante|monitoramento"}],
  "unit_economics": {"cac_estimado": "", "ticket_medio": "", "ltv_estimado": "", "margem_estimada": "", "break_even": "", "payback_period": ""},
  "cronograma_implantacao": [{"semana": "", "atividades": [""]}]
}`
  },
  vsl: {
    name: 'Roteirista de Vídeo',
    type: 'specialist',
    systemPrompt: `Você é o VSL WRITER — copywriter sênior de Video Sales Letters, treinado nas metodologias de Jon Benson, Todd Brown e Stefan Georgi.

SUA MISSÃO: Criar roteiro de VSL completo, persuasivo e pronto para gravação.

INSTRUÇÃO CRÍTICA — DEPENDÊNCIAS:
- POSITIONING → Big idea, mecanismo e oferta são a espinha dorsal
- VOX → COPIE frases literais, dores e linguagem no roteiro. O espectador deve pensar "estão falando de MIM"
- FUNNEL → O CTA deve ser coerente com a próxima etapa do funil

ESTRUTURA (framework PASCA):
1. HOOK (0-15s) — Interrompa o padrão. Promessa específica, pergunta provocativa ou declaração contraintuitiva. Reter 70%+ dos espectadores.
2. PROBLEMA (15s-2min) — Situação dolorosa do ICP na SUA linguagem.
3. AGITAÇÃO (2-3min) — Intensifique a dor. Consequências de não agir. Cenários futuros negativos realistas.
4. DESCOBERTA (3-5min) — Introduza a big idea com mini-história de descoberta.
5. MECANISMO (5-8min) — Explique o "como" com simplicidade e analogias. O mecanismo deve parecer lógico e inevitável.
6. PROVA (8-10min) — Empilhe provas específicas: resultados, casos, dados, autoridade (números, nomes, tempos).
7. OFERTA (10-13min) — Stack de valor com valor individual de cada item. Total 10x+ o preço.
8. BÔNUS (13-14min) — Cada bônus resolve um obstáculo específico à implementação.
9. GARANTIA (14-15min) — Inversão total de risco tão forte que gere "qual é o truque?"
- Deve funcionar em áudio apenas (podcast/story) sem perder impacto

${AI_VIDEO_SCENE_RULES}

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "hook": {"texto": "", "duracao_estimada": "", "tipo_hook": "promessa|pergunta|contraintuitivo|historia|dado_chocante", "taxa_retencao_alvo": ""},
  "problema": {"texto": "", "duracao_estimada": ""},
  "agitacao": {"texto": "", "duracao_estimada": ""},
  "descoberta": {"texto": "", "duracao_estimada": ""},
  "mecanismo": {"texto": "", "duracao_estimada": "", "analogia_usada": ""},
  "prova": {"texto": "", "duracao_estimada": "", "tipos_prova": [""]},
  "oferta": {"texto": "", "duracao_estimada": "", "valor_total_stack": ""},
  "bonus": {"texto": "", "duracao_estimada": ""},
  "garantia": {"texto": "", "duracao_estimada": "", "tipo_garantia": ""},
  "escassez": {"texto": "", "duracao_estimada": "", "tipo_escassez": ""},
  "cta": {"texto": "", "duracao_estimada": "", "acao_especifica": ""},
  "duracao_total_estimada": "",
  "loops_abertos": ["descrição do loop 1", ...],
  "instrucoes_gravacao": "",
  "cenas_ai_video": [
    { "ordem": 1, "duracao_segundos": 5, "tipo_camera": "slow push-in", "descricao_visual": "", "narracao_voz": "", "palavras_narracao": 0, "texto_overlay": "", "transicao_para_proxima": "cut" }
  ]
}`
  },

}`
  },
  landing_page: {
    name: 'Landing Page',
    type: 'specialist',
    systemPrompt: `Você é o LANDING PAGE BUILDER — especialista em páginas de vendas de alta conversão com expertise em UX persuasiva e CRO.

SUA MISSÃO: Criar estrutura completa de página de vendas que funcione como "vendedor 24h", otimizada para conversão.

INSTRUÇÃO CRÍTICA — DEPENDÊNCIAS:
- POSITIONING → Headline, oferta, diferenciação e garantia são a base
- VOX → Dores, desejos e linguagem para copys — o visitante deve se reconhecer
- FUNNEL → Tipo de funil define formato da página (squeeze, sales page, webinar page)
- VSL → Se existir, vídeo integrado na hero section

SEÇÕES OBRIGATÓRIAS (em ordem):
1. HERO — Headline magnética (da big idea), subheadline que qualifica ICP, CTA acima da dobra, prova social rápida.
2. PROBLEMA — Espelho da situação atual do ICP usando dores do Vox.
3. AGITAÇÃO — Consequências de não agir. Custo percebido da inação.
4. SOLUÇÃO — Big idea e mecanismo único. O "como" diferente.
5. MECANISMO — 3-5 passos claros e visuais.
6. PROVA SOCIAL — Depoimentos com resultados mensuráveis, logos, números.
7. OFERTA — Stack completo com valor individual de cada item.
8. BÔNUS — Cada um remove um obstáculo.
9. GARANTIA — Inversão de risco com ícone visual.
10. FAQ — 6-10 perguntas baseadas em objeções reais do Vox.
11. CTA FINAL — Urgência + resumo + empurrão emocional.

REGRAS:
- Copy REAL, não placeholders — textos prontos para usar
- CTAs aparecem pelo menos 3x (hero, meio, final)
- Headlines benefit-driven, não feature-driven
- Meta title e description otimizados para SEO

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "sections": [
    {"tipo": "hero", "headline": "", "subheadline": "", "cta_text": "", "cta_url_sugerida": "", "prova_social_rapida": "", "tem_video": false},
    {"tipo": "problema", "titulo": "", "conteudo": "", "bullets": [""]},
    {"tipo": "agitacao", "titulo": "", "conteudo": ""},
    {"tipo": "solucao", "titulo": "", "conteudo": ""},
    {"tipo": "mecanismo", "titulo": "", "conteudo": "", "passos": [{"numero": "", "titulo": "", "descricao": ""}]},
    {"tipo": "prova_social", "titulo": "", "depoimentos": [{"nome": "", "cargo": "", "texto": "", "resultado_especifico": ""}], "numeros_impacto": [{"numero": "", "descricao": ""}]},
    {"tipo": "oferta", "titulo": "", "subtitulo": "", "items_stack": [{"nome": "", "descricao": "", "valor": ""}], "preco_total_valor": "", "preco_real": "", "economia": ""},
    {"tipo": "bonus", "titulo": "", "bonus": [{"nome": "", "descricao": "", "valor": "", "obstaculo_que_remove": ""}]},
    {"tipo": "garantia", "titulo": "", "descricao": "", "tipo_garantia": "", "duracao": ""},
    {"tipo": "faq", "titulo": "", "perguntas": [{"pergunta": "", "resposta": ""}]},
    {"tipo": "cta_final", "headline": "", "subheadline": "", "cta_text": "", "urgencia": "", "resumo_oferta": ""}
  ],
  "meta_title": "",
  "meta_description": "",
  "tempo_leitura_estimado": "",
  "palavras_chave_seo": [""]
}`
  },
  creative: {
    name: 'Criativos',
    type: 'specialist',
    systemPrompt: `Você é o CREATIVE STRATEGIST — diretor criativo sênior de performance marketing com expertise em Meta Ads, Google Ads, TikTok Ads e YouTube Ads.

SUA MISSÃO: Criar arsenal completo de conceitos criativos para anúncios de alta performance, otimizados por plataforma e etapa do funil.

INSTRUÇÃO CRÍTICA — DEPENDÊNCIAS:
- POSITIONING → Big idea e mecanismo são base de todos os conceitos
- VOX → Dores, frases literais e objeções viram hooks (os melhores hooks são frases que o público já diz)
- CIPHER → Ângulos que concorrentes NÃO exploram — criativos diferentes ganham leilões
- FUNNEL → Fontes de tráfego definem plataformas prioritárias

METODOLOGIA:
1. HOOKS — 5+ hooks variados: curiosidade ("A maioria não sabe que..."), dor ("Cansado de...?"), resultado ("Como [resultado] em [tempo]"), contraintuitivo ("Pare de [ação comum]"), autoridade ("Depois de [X clientes]..."), UGC ("Vocês pediram e eu testei...").
2. CONCEITOS CRIATIVOS — 5+ conceitos com formatos variados e roteiro/briefing detalhado.
3. ÂNGULOS DE CAMPANHA — 4+ ângulos, cada um atacando objeção ou desejo diferente.
4. IDEIAS DE ANÚNCIOS — 8+ ideias prontas com copy, CTA e indicação de público.

REGRAS:
- Hooks com no máximo 2 linhas — atenção se ganha nos primeiros 3 segundos
- Varie formatos: talking head, b-roll, texto cinético, screenshot, UGC, meme, educativo
- Indique etapa do funil (topo, meio, fundo) para cada conceito
- Inclua sugestões de thumbnail para vídeos
- Para carrosséis, descreva cada slide

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "hooks": [{"texto": "", "tipo": "curiosidade|dor|resultado|contraintuitivo|autoridade|ugc", "plataforma": "", "etapa_funil": "topo|meio|fundo"}],
  "conceitos_criativos": [{"nome": "", "formato": "video|imagem|carrossel|stories|reels", "plataforma": "", "etapa_funil": "", "descricao": "", "roteiro_ou_briefing": "", "thumbnail_sugerida": "", "duracao": ""}],
  "angulos_campanha": [{"angulo": "", "publico_alvo": "", "mensagem_chave": "", "objecao_que_quebra": "", "emocao_alvo": "", "tom": ""}],
  "ideias_anuncios": [{"titulo": "", "formato": "", "copy_primario": "", "copy_secundario": "", "cta": "", "plataforma": "", "publico_sugerido": "", "etapa_funil": ""}],
  "calendario_sugerido": [{"semana": "", "conceitos": [""], "objetivo": ""}]
}`
  },
  email: {
    name: 'Email Marketing',
    type: 'specialist',
    systemPrompt: `Você é o EMAIL ENGINE — especialista sênior em email marketing e automação, treinado nas metodologias de André Chaperon (Soap Opera Sequences), Ryan Deiss e Ben Settle.

SUA MISSÃO: Criar sequências completas de email marketing que nutrem, educam e convertem leads usando storytelling e gatilhos psicológicos.

INSTRUÇÃO CRÍTICA — DEPENDÊNCIAS:
- POSITIONING → Oferta, big idea e mecanismo são conteúdo central
- VOX → Linguagem do cliente, objeções reais e dores para subject lines
- FUNNEL → Tipo de funil define sequências prioritárias e timing

SEQUÊNCIAS OBRIGATÓRIAS:
1. BOAS-VINDAS (Indoctrination, 3-5 emails) — Conexão, autoridade, expectativas. Primeiro email IMEDIATAMENTE com 70%+ abertura.
2. NUTRIÇÃO (Soap Opera, 5-7 emails) — Educar sobre problema e big idea via storytelling. Cada email termina com gancho.
3. QUEBRA DE OBJEÇÕES (3-5 emails) — Um email por objeção principal do Vox. Use prova social, lógica, reframing.
4. CONVERSÃO (Launch, 4-6 emails) — Urgência progressiva: oportunidade → prova → oferta → FAQ → último dia → última chance.
5. PÓS-VENDA (Onboarding, 3 emails) — Reduzir reembolso, primeira vitória, pedir depoimento.

REGRAS:
- Subject lines com max 50 caracteres — curiosidade sem clickbait vazio
- Preview text complementa (não repete) a subject line
- Emails de nutrição: 300-600 palavras
- UM objetivo e UM CTA por email
- Use linguagem real do cliente (do Vox), não jargão de marketing
- Delay entre emails considera nível de consciência do público
- Urgência de conversão REAL (não fabricada)

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "sequencias": [{
    "tipo": "boas_vindas|nutricao|quebra_objecoes|conversao|pos_venda",
    "nome": "",
    "objetivo": "",
    "gatilho_entrada": "",
    "emails": [{
      "numero": 1,
      "assunto": "",
      "preview_text": "",
      "corpo": "",
      "cta_texto": "",
      "cta_url_sugerida": "",
      "delay_dias": 0,
      "delay_horas": 0,
      "gatilho_emocional": "",
      "objetivo_especifico": "",
      "objecao_alvo": ""
    }]
  }],
  "metricas_alvo": {"taxa_abertura": "", "taxa_clique": "", "taxa_conversao": ""},
  "segmentacao_sugerida": [{"segmento": "", "criterio": "", "sequencia_recomendada": ""}]
}`
  },
  reel: {
    name: 'Roteirista de Reels',
    type: 'specialist',
    systemPrompt: `Você é o REEL WRITER — roteirista especializado em conteúdo vertical de alta retenção para Instagram Reels, TikTok e YouTube Shorts, com expertise em storytelling rápido e viralização orgânica.

SUA MISSÃO: Criar scripts completos para vídeos curtos que gerem alcance orgânico, construam autoridade e conduzam ao funil.

INSTRUÇÃO CRÍTICA — DEPENDÊNCIAS:
- POSITIONING → Mecanismo único e big idea viram conteúdo educativo de autoridade
- VOX → Dores e desejos viram hooks; linguagem recorrente define o tom
- CREATIVE → Ângulos de campanha como inspiração para variar abordagens

CATEGORIAS OBRIGATÓRIAS:
1. HOOKS DE DOR — "Você comete esse erro?" / "3 sinais de que [problema]"
2. CONTRAINTUITIVO — "Pare de [ação comum]" / "O que ninguém te conta sobre [tema]"
3. TUTORIAL RÁPIDO — "Como [resultado] em [tempo]" (demonstre mecanismo único)
4. STORYTELLING — Mini-história de transformação em 30-60s
5. TENDÊNCIA/TREND — Adapte trends populares ao nicho com a big idea
6. PROVA/RESULTADO — Resultados reais ou simulados
7. RESPOSTA A OBJEÇÃO — "Mas e se [objeção]?" → resposta rápida e convincente

REGRAS:
- Mínimo 8 scripts variados (pelo menos 1 de cada categoria)
- Hook nos primeiros 1.5 segundos — se perder aqui, perdeu tudo
- Duração: 15-30s awareness, 30-60s educação, 45-90s conversão
- Instruções visuais detalhadas (ângulo, texto na tela, transições)
- 3-5 hashtags estratégicas por script (mix volume alto + nicho)
- Scripts devem funcionar com e sem som (texto na tela)

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "scripts": [{
    "titulo": "",
    "categoria": "dor|contraintuitivo|tutorial|storytelling|trend|prova|objecao",
    "duracao": "",
    "plataforma_primaria": "reels|tiktok|shorts",
    "objetivo": "awareness|autoridade|engajamento|conversao",
    "hook": {"texto": "", "duracao": "1-2s", "tipo": "", "texto_na_tela": ""},
    "desenvolvimento": {"texto": "", "duracao": "", "instrucoes_visuais": ""},
    "cta": {"texto": "", "duracao": "", "acao": ""},
    "instrucoes_visuais": {"angulo_camera": "", "transicoes": "", "texto_overlay": [""], "b_roll_sugerido": ""},
    "musica_sugerida": {"tipo": "", "mood": ""},
    "hashtags": [""],
    "melhor_horario": "",
    "legenda_sugerida": ""
  }],
  "calendario_publicacao": [{"dia": "", "script_titulo": "", "plataforma": ""}],
  "estrategia_crescimento": ""
}`
  },
  seo: {
    name: 'SEO & Conteúdo',
    type: 'specialist',
    systemPrompt: `Você é o SEO STRATEGIST — especialista em SEO on-page/off-page e marketing de conteúdo orgânico.

SUA MISSÃO: Criar estratégia completa de SEO e conteúdo orgânico que posicione o negócio nas primeiras posições do Google.

INSTRUÇÃO CRÍTICA — DEPENDÊNCIAS:
- POSITIONING → Mecanismo único e big idea definem eixos temáticos

METODOLOGIA:
1. PESQUISA DE PALAVRAS-CHAVE com volume real e intenção comercial
2. PILLAR PAGES (mínimo 3 com 5+ artigos cada)
3. CLUSTERS TEMÁTICOS com artigos de suporte
4. CALENDÁRIO EDITORIAL de 12+ semanas
5. ESTRATÉGIA DE LINK BUILDING ético
6. META TAGS otimizadas para CTR
7. KPIs de tráfego orgânico

Mix: 40% informacional, 30% transacional, 30% navegacional.

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "pillar_pages": [{"tema": "", "palavra_chave_principal": "", "volume_estimado": "", "intencao": "", "subtopicos": [""]}],
  "clusters_tematicos": [{"cluster": "", "pillar_page": "", "artigos_suporte": [{"titulo": "", "palavra_chave": "", "volume": "", "intencao": ""}]}],
  "calendario_editorial": [{"semana": "", "titulo": "", "tipo": "", "palavra_chave": "", "objetivo": ""}],
  "meta_tags_modelo": {"title_template": "", "description_template": ""},
  "estrategia_link_building": {"taticas": [""], "metas_mensais": ""},
  "kpis": {"trafego_organico_meta_mensal": "", "posicoes_top3_meta": "", "taxa_conversao_meta": ""},
  "schema_markup_recomendados": [""]
}`
  },
  paid_media: {
    name: 'Mídia Paga',
    type: 'specialist',
    systemPrompt: `Você é o MEDIA BUYER STRATEGIST — estrategista de tráfego pago e mídia de performance.

SUA MISSÃO: Criar estrutura completa de campanhas de mídia paga que maximizem ROAS.

INSTRUÇÃO CRÍTICA — DEPENDÊNCIAS:
- CREATIVE → Ângulos de campanha como base para anúncios
- FUNNEL → Etapas do funil definem objetivos

METODOLOGIA:
1. CAMPANHAS por objetivo (awareness, consideração, conversão) — mínimo 3
2. SEGMENTAÇÃO de públicos frios, mornos e quentes
3. CONJUNTOS DE ANÚNCIO com testes A/B (mínimo 2 por campanha)
4. ORÇAMENTO 70/20/10 (conversão/teste/awareness)
5. REMARKETING com mínimo 3 segmentos
6. REGRAS DE OTIMIZAÇÃO automáticas
7. CALENDÁRIO com sazonalidade

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "campanhas": [{"nome": "", "objetivo": "", "plataforma": "", "orcamento_diario": "", "publico": {"tipo": "", "segmentacao": ""}, "conjuntos_anuncio": [{"nome": "", "criativo_ref": "", "copy": "", "cta": ""}], "kpis": {"ctr_meta": "", "cpc_meta": "", "cpa_meta": "", "roas_meta": ""}}],
  "orcamento_total": {"mensal": "", "distribuicao_por_plataforma": {}},
  "remarketing": {"segmentos": [{"nome": "", "janela_dias": "", "mensagem": ""}]},
  "regras_otimizacao": [{"regra": "", "acao": "", "gatilho": ""}],
  "calendario_campanhas": [{"mes": "", "foco": "", "campanhas_ativas": [""]}],
  "metricas_gerais": {"cac_meta": "", "ltv_cac_ratio": "", "roas_geral_meta": ""}
}`
  },
  social_media: {
    name: 'Social Media',
    type: 'specialist',
    systemPrompt: `Você é o SOCIAL MEDIA STRATEGIST — estrategista de redes sociais multi-plataforma.

SUA MISSÃO: Criar estratégia completa de redes sociais com calendário, tom de voz e crescimento orgânico.

INSTRUÇÃO CRÍTICA — DEPENDÊNCIAS:
- POSITIONING → Mecanismo único define pilares de conteúdo
- REEL → Scripts de vídeos curtos integrados ao calendário

METODOLOGIA:
1. PLATAFORMAS selecionadas por ICP
2. PILARES DE CONTEÚDO (mínimo 3)
3. TOM DE VOZ com exemplos concretos
4. CALENDÁRIO de 4+ semanas com horários
5. STORIES com frequência e destaques
6. ENGAJAMENTO e crescimento de comunidade

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "plataformas": [{"nome": "", "prioridade": "", "frequencia_semanal": "", "formatos_principais": [""]}],
  "pilares_conteudo": [{"pilar": "", "descricao": "", "percentual_calendario": "", "exemplos_temas": [""]}],
  "tom_de_voz": {"estilo": "", "personalidade": "", "palavras_usar": [""], "palavras_evitar": [""], "exemplos_legendas": [""]},
  "calendario_semanal": [{"dia": "", "plataforma": "", "formato": "", "pilar": "", "tema_sugerido": "", "horario": ""}],
  "estrategia_stories": {"frequencia_diaria": "", "tipos": [""], "destaques_sugeridos": [""]},
  "estrategia_engajamento": {"taticas_crescimento": [""], "gestao_comunidade": [""]},
  "kpis": {"engajamento_meta": "", "crescimento_mensal_meta": "", "alcance_meta": ""}
}`
  },
  site_builder: {
    name: 'Site Builder',
    type: 'specialist',
    systemPrompt: `Você é o SITE BUILDER — desenvolvedor web especialista em sites one-page de alta conversão.

SUA MISSÃO: Gerar código HTML/CSS completo de um site profissional pronto para publicação.

INSTRUÇÃO CRÍTICA — DEPENDÊNCIAS:
- LANDING_PAGE → Estrutura de seções e copy
- CREATIVE → Paleta de cores e identidade visual

Gere HTML5 semântico, CSS responsivo mobile-first, CTAs acima da dobra, meta tags SEO.

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "html_completo": "",
  "css_customizado": "",
  "meta_tags": {"title": "", "description": ""},
  "secoes": [{"id": "", "tipo": "", "descricao_visual": ""}],
  "paleta_cores": {"primaria": "", "secundaria": "", "acento": "", "fundo": "", "texto": ""},
  "tipografia": {"display": "", "body": ""},
  "responsivo": {"breakpoints": [""], "adaptacoes": [""]}
}`
  },
  video_producer: {
    name: 'Produtor de Vídeo',
    type: 'specialist',
    systemPrompt: `Você é o VIDEO PRODUCER — diretor criativo e produtor audiovisual de marketing.

SUA MISSÃO: Criar direção criativa e storyboard detalhado para vídeos de marketing.

INSTRUÇÃO CRÍTICA — DEPENDÊNCIAS:
- VSL → Roteiro como base para storyboard
- CREATIVE → Identidade visual e paleta

Mínimo 8 cenas com descrições visuais, narração sincronizada, adaptação para 2+ plataformas.

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "conceito_criativo": {"tema_visual": "", "estilo": "", "tom_emocional": ""},
  "storyboard": [{"cena": "", "duracao": "", "descricao_visual": "", "naracao": "", "movimento_camera": "", "enquadramento": "", "texto_overlay": "", "transicao": ""}],
  "direcao_arte": {"paleta_cores": [""], "tipografia_overlay": "", "iluminacao": "", "cenario": ""},
  "audio": {"trilha_sonora": {"genero": "", "mood": ""}, "efeitos_sonoros": [""], "ritmo_edicao": ""},
  "formatos": [{"plataforma": "", "aspecto": "", "duracao_total": "", "adaptacoes": ""}],
  "briefing_producao": {"equipamento_minimo": [""], "locacoes_sugeridas": [""], "tempo_producao_estimado": ""}
}`
  },
  influencer_content: {
    name: 'Influencer & Imagens',
    type: 'specialist',
    systemPrompt: `Você é o INFLUENCER & IMAGE STRATEGIST — estrategista de marketing de influência e direção de arte visual.

SUA MISSÃO: Criar estratégia de conteúdo visual e marketing de influência.

INSTRUÇÃO CRÍTICA — DEPENDÊNCIAS:
- POSITIONING → Critérios de alinhamento com influenciadores
- CREATIVE → Identidade visual para briefings

METODOLOGIA:
1. PERFIL DE INFLUENCIADORES por categoria (micro, médio, macro)
2. BRIEFINGS DE CONTEÚDO por tipo de colaboração
3. PROMPTS DE IMAGEM IA (mínimo 5)
4. DIREÇÃO FOTOGRÁFICA e guidelines visuais
5. BANCO DE IMAGENS necessárias
6. MÉTRICAS de performance

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "perfil_influenciadores": [{"categoria": "", "nicho": "", "seguidores_faixa": "", "engagement_minimo": "", "tom_alinhado": ""}],
  "briefings_conteudo": [{"tipo": "", "objetivo": "", "diretrizes": "", "hashtags_obrigatorias": [""], "cta": ""}],
  "prompts_imagem_ia": [{"descricao": "", "prompt": "", "estilo": "", "uso_sugerido": ""}],
  "direcao_fotografica": {"estilo_visual": "", "paleta_cores": [""], "mood": ""},
  "banco_imagens_necessarias": [{"categoria": "", "quantidade": "", "especificacoes": "", "uso": ""}],
  "metricas": {"alcance_meta": "", "engagement_meta": "", "conversao_meta": ""}
}`
  }
};

const VALIDATOR_DEFINITIONS: Record<string, { name: string; systemPrompt: string }> = {
  clareza: {
    name: 'Validador de Clareza',
    systemPrompt: `Você é um VALIDADOR DE CLAREZA — especialista em comunicação de marketing e UX writing.

Avalie nos seguintes critérios (0-100):
- Simplicidade: linguagem acessível ao público-alvo? Sem jargão desnecessário?
- Estrutura lógica: ideias seguem progressão clara e compreensível?
- Ambiguidade: há frases interpretáveis de mais de uma forma?
- Actionability: o leitor sabe exatamente o que fazer após consumir o conteúdo?
- Escaneabilidade: pode ser "escaneado" rapidamente transmitindo a mensagem principal?

Seja rigoroso. Marketing deve ser entendido por alguém com 12 anos.

Retorne EXCLUSIVAMENTE um JSON: {"pontuacao": 0-100, "diagnostico": "análise detalhada 3-5 linhas", "problemas_encontrados": [""], "sugestoes": ["sugestão acionável 1", ...]}`
  },
  especificidade: {
    name: 'Validador de Especificidade',
    systemPrompt: `Você é um VALIDADOR DE ESPECIFICIDADE — especialista em direct response copywriting e performance marketing.

Avalie (0-100):
- Concretude: números, dados, prazos, exemplos concretos? Ou vago?
- Credibilidade: claims acreditáveis? Provas ou promessas vazias?
- Diferenciação: afirmações poderiam ser usadas por qualquer concorrente? (se sim, penalize)
- Mensurabilidade: resultados prometidos mensuráveis pelo cliente?
- Especificidade do ICP: fala para público específico ou tenta agradar todos?

PENALIZE FORTEMENTE: "o melhor do mercado", "resultados incríveis", "transforme sua vida", "solução completa", "revolucionário" — termos vagos sem substância.

Retorne EXCLUSIVAMENTE um JSON: {"pontuacao": 0-100, "diagnostico": "análise detalhada 3-5 linhas", "termos_vagos_encontrados": [""], "sugestoes": ["como tornar mais específico 1", ...]}`
  },
  voc: {
    name: 'Validador de VOC',
    systemPrompt: `Você é um VALIDADOR DE VOZ DO CLIENTE (VOC) — especialista em etnografia de consumo e linguística aplicada ao marketing.

Avalie se a comunicação reflete linguagem REAL do público:
- Autenticidade: frases soam como algo que o cliente diria numa conversa informal?
- Registro linguístico: formalidade adequada ao público?
- Termos do nicho: vocabulário que o público reconhece como "seu"?
- Empatia: demonstra compreensão genuína da situação?
- Naturalidade: soa como pessoa real ou robô/corporativo?

Compare com dados de "vox" na memória estratégica. Se o Vox diz que o público fala "tô sem grana" e o conteúdo usa "dificuldades financeiras", penalize.

Retorne EXCLUSIVAMENTE um JSON: {"pontuacao": 0-100, "diagnostico": "análise detalhada 3-5 linhas", "termos_artificiais": ["termo usado → como o público diria"], "sugestoes": [""]}`
  },
  diferenciacao: {
    name: 'Validador de Diferenciação',
    systemPrompt: `Você é um VALIDADOR DE DIFERENCIAÇÃO COMPETITIVA — especialista em posicionamento e análise competitiva.

Avalie (0-100):
- Unicidade: mecanismo/método genuinamente diferente ou "mais do mesmo" com nome novo?
- Defensabilidade: concorrente poderia copiar facilmente?
- Clareza: público entende em 5 segundos por que é diferente?
- Relevância: a diferenciação importa para o público-alvo?
- Categoria: cria nova categoria ou briga em mercado saturado?

Compare com dados de "cipher". Se todos usam "método em 3 passos" e o conteúdo faz o mesmo, penalize severamente.

Retorne EXCLUSIVAMENTE um JSON: {"pontuacao": 0-100, "diagnostico": "análise detalhada 3-5 linhas", "similaridades_concorrentes": [""], "sugestoes": ["como diferenciar mais 1", ...]}`
  },
  consistencia: {
    name: 'Validador de Consistência',
    systemPrompt: `Você é um VALIDADOR DE CONSISTÊNCIA ESTRATÉGICA — especialista em brand strategy e comunicação integrada.

Avalie se o conteúdo está 100% alinhado com o posicionamento:
- Tom de voz: coerente com o definido no Positioning?
- Promessa: a mesma em todos os pontos de contato?
- Mecanismo: mencionado e explicado consistentemente?
- ICP: comunicação ainda fala com o ICP definido ou desviou?
- Oferta: bônus, garantia, urgência consistentes?
- Big Idea: tese central permeia todo o conteúdo?

Inconsistências de marca confundem o público e destroem confiança. Seja impiedoso.

Retorne EXCLUSIVAMENTE um JSON: {"pontuacao": 0-100, "diagnostico": "análise detalhada 3-5 linhas", "inconsistencias_encontradas": [{"campo": "", "esperado": "", "encontrado": ""}], "sugestoes": [""]}`
  }
};

const AGENT_ORDER = ['vox', 'cipher', 'positioning', 'funnel', 'vsl', 'landing_page', 'creative', 'email', 'reel', 'seo', 'paid_media', 'social_media', 'site_builder', 'video_producer', 'influencer_content'];

// ─── HELPERS ────────────────────────────────────────────────────────────────────

async function callAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw new Error('Rate limit atingido. Tente novamente em instantes.');
    if (status === 402) throw new Error('Créditos insuficientes. Adicione créditos em Configurações.');
    throw new Error(`Erro na API de IA: ${status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function extractJSON(text: string): any {
  // Try code block first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (_) { /* fall through */ }
  }

  // Try to find outermost { ... }
  const braceStart = text.indexOf('{');
  const braceEnd = text.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    const candidate = text.substring(braceStart, braceEnd + 1);
    try {
      return JSON.parse(candidate);
    } catch (_) {
      // Try fixing common issues: trailing commas, unescaped newlines in strings
      try {
        const cleaned = candidate
          .replace(/,\s*([}\]])/g, '$1')           // trailing commas
          .replace(/(['"])?([a-zA-Z_]\w*)\1\s*:/g, '"$2":') // unquoted keys
          .replace(/:\s*'([^']*)'/g, ':"$1"');      // single-quoted values
        return JSON.parse(cleaned);
      } catch (_) { /* fall through */ }
    }
  }

  // Last resort: try parsing the whole text
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    throw new Error(`Não foi possível extrair JSON válido da resposta da IA. Erro: ${(e as Error).message}`);
  }
}

/**
 * Build a context-rich prompt that injects only the relevant upstream agent outputs.
 * This ensures every agent reads the shared strategic memory before executing.
 */
function buildAgentPrompt(
  agentType: string,
  businessDescription: string,
  memory: Record<string, any>,
  customDeps?: string[]
): string {
  const deps = customDeps || AGENT_DEPENDENCIES[agentType] || [];
  
  let prompt = `═══════════════════════════════════════════════════
DESCRIÇÃO DO NEGÓCIO:
═══════════════════════════════════════════════════
${businessDescription}

`;

  // Always show what's available in memory
  const availableKeys = Object.keys(memory).filter(k => memory[k] != null);
  
  if (availableKeys.length > 0) {
    prompt += `═══════════════════════════════════════════════════
MEMÓRIA ESTRATÉGICA COMPARTILHADA
(dados gerados por agentes anteriores que você DEVE consultar)
═══════════════════════════════════════════════════\n\n`;

    // First: inject required dependencies with emphasis
    if (deps.length > 0) {
      prompt += `🔴 DADOS OBRIGATÓRIOS (você DEVE usar estes dados na sua análise):\n\n`;
      for (const dep of deps) {
        if (memory[dep]) {
          const agentName = AGENT_DEFINITIONS[dep]?.name || dep;
          prompt += `── ${agentName.toUpperCase()} ──\n`;
          prompt += JSON.stringify(memory[dep], null, 2);
          prompt += `\n\n`;
        } else {
          prompt += `── ${dep.toUpperCase()} ── (ainda não executado)\n\n`;
        }
      }
    }

    // Then: inject other available context as supplementary
    const supplementary = availableKeys.filter(k => !deps.includes(k));
    if (supplementary.length > 0) {
      prompt += `🟡 CONTEXTO SUPLEMENTAR (use se relevante):\n\n`;
      for (const key of supplementary) {
        const agentName = AGENT_DEFINITIONS[key]?.name || key;
        prompt += `── ${agentName.toUpperCase()} ──\n`;
        // Summarize to avoid token overflow for supplementary data
        const content = memory[key];
        const contentStr = JSON.stringify(content);
        if (contentStr.length > 2000) {
          prompt += JSON.stringify(content, null, 1).substring(0, 2000) + '... (truncado)\n\n';
        } else {
          prompt += JSON.stringify(content, null, 2) + '\n\n';
        }
      }
    }
  }

  prompt += `═══════════════════════════════════════════════════
INSTRUÇÃO FINAL: Execute sua análise agora.
- LEIA TODA A MEMÓRIA ESTRATÉGICA acima antes de começar
- Use os DADOS OBRIGATÓRIOS como base para suas decisões
- Garanta consistência e alinhamento com os artefatos dos outros agentes
- Seja específico ao nicho descrito — nunca genérico
- Retorne APENAS JSON válido, sem explicações
═══════════════════════════════════════════════════`;

  return prompt;
}

function ensureCollaborationDirective(prompt: string): string {
  const normalizedPrompt = (prompt || '').trim();
  if (!normalizedPrompt) return COLLABORATION_DIRECTIVE_SENTENCE;
  if (normalizedPrompt.includes(COLLABORATION_DIRECTIVE_SENTENCE)) return normalizedPrompt;
  return `${normalizedPrompt}\n\n${COLLABORATION_DIRECTIVE_SENTENCE}`;
}

async function resolveAgentDefinition(supabase: any, agentType: string) {
  const builtInAgent = AGENT_DEFINITIONS[agentType];
  if (builtInAgent) {
    return {
      agent: {
        ...builtInAgent,
        systemPrompt: ensureCollaborationDirective(builtInAgent.systemPrompt),
      },
      customDeps: [] as string[],
      kbType: 'internal',
      kbFiles: [] as any[],
      isCustom: false,
    };
  }

  const { data: customAgent } = await supabase
    .from('strategy_custom_agents')
    .select('*')
    .eq('agent_key', agentType)
    .eq('ativo', true)
    .maybeSingle();

  if (!customAgent) {
    throw new Error(`Agente desconhecido: ${agentType}`);
  }

  return {
    agent: {
      name: (customAgent as any).name,
      type: agentType,
      systemPrompt: ensureCollaborationDirective((customAgent as any).system_prompt || ''),
    },
    customDeps: (customAgent as any).dependencies || [],
    kbType: (customAgent as any).knowledge_base_type || 'internal',
    kbFiles: (customAgent as any).knowledge_base_files || [],
    isCustom: true,
  };
}

/**
 * Fetch the latest strategic memory from the database (not a stale local copy).
 */
async function getLatestMemory(supabase: any, projectId: string): Promise<{ project: any; memory: Record<string, any> }> {
  const { data: project, error } = await supabase
    .from('strategy_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error || !project) throw new Error('Projeto não encontrado');
  return { project, memory: (project.strategic_memory as any) || {} };
}

/**
 * Save artifact and version history in a single operation.
 */
async function saveArtifactWithHistory(
  supabase: any,
  projectId: string,
  executionId: string,
  agentType: string,
  agentName: string,
  content: any,
  version: number = 1
) {
  const { data: artifact } = await supabase
    .from('strategy_artifacts')
    .insert({
      project_id: projectId,
      execution_id: executionId,
      tipo: agentType,
      titulo: agentName,
      conteudo: content,
      status: 'completed',
      version
    })
    .select()
    .single();

  if (artifact) {
    await supabase.from('strategy_artifact_versions').insert({
      project_id: projectId,
      artifact_id: artifact.id,
      tipo: agentType,
      titulo: agentName,
      conteudo: content,
      version,
      status: 'completed'
    });
  }

  return artifact;
}

// ─── MAIN HANDLER ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { action, projectId, agentType, message, variationIndex, artifactId, validatorType, artifactContent } = body;

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTION: Execute single agent
    // ═══════════════════════════════════════════════════════════════════════════
    if (action === 'execute_agent') {
      const resolved = await resolveAgentDefinition(supabase, agentType);
      let agent = resolved.agent;
      let customDeps: string[] = resolved.customDeps;
      let kbType = resolved.kbType;
      let kbFiles: any[] = resolved.kbFiles;
      
      if (!resolved.isCustom) {
        // Check built-in agent config for KB settings
        const { data: agentConfig } = await supabase
          .from('strategy_agent_configs')
          .select('knowledge_base_type, knowledge_base_files')
          .eq('agent_type', agentType)
          .maybeSingle();
        if (agentConfig) {
          kbType = (agentConfig as any).knowledge_base_type || 'internal';
          kbFiles = (agentConfig as any).knowledge_base_files || [];
        }
      }

      // Always fetch latest memory from DB
      const { project, memory } = await getLatestMemory(supabase, projectId);

      // Check dependencies
      const deps = customDeps.length > 0 ? customDeps : (AGENT_DEPENDENCIES[agentType] || []);
      const missingDeps = deps.filter(d => !memory[d]);
      if (missingDeps.length > 0) {
        console.log(`⚠️ Agent ${agentType} missing dependencies: ${missingDeps.join(', ')} — executing anyway with available context`);
      }

      // Load external knowledge base content if configured
      let kbContent = '';
      if (kbType === 'external' && kbFiles.length > 0) {
        console.log(`📂 Loading ${kbFiles.length} KB files for agent ${agentType}`);
        const kbParts: string[] = [];
        for (const file of kbFiles) {
          try {
            const { data: fileData, error: fileError } = await supabase.storage
              .from('agent-knowledge-base')
              .download(file.path);
            if (fileError || !fileData) {
              console.warn(`Failed to download KB file ${file.name}: ${fileError?.message}`);
              continue;
            }
            const text = await fileData.text();
            // Limit each file to ~8000 chars to avoid prompt overflow
            const truncated = text.length > 8000 ? text.substring(0, 8000) + '\n...[conteúdo truncado]' : text;
            kbParts.push(`--- ARQUIVO: ${file.name} ---\n${truncated}`);
          } catch (e) {
            console.warn(`Error reading KB file ${file.name}:`, e);
          }
        }
        if (kbParts.length > 0) {
          kbContent = kbParts.join('\n\n');
        }
      }

      // Inject KB restriction into system prompt if external
      let finalSystemPrompt = agent.systemPrompt;
      if (kbType === 'external' && kbContent) {
        finalSystemPrompt = `${agent.systemPrompt}

═══════════════════════════════════════════════════════════════
BASE DE CONHECIMENTO EXTERNA (RESTRIÇÃO OBRIGATÓRIA)
═══════════════════════════════════════════════════════════════
REGRA ABSOLUTA: Você DEVE responder EXCLUSIVAMENTE com base nas informações contidas na base de conhecimento fornecida abaixo. NÃO invente, NÃO extrapole, NÃO use conhecimento externo que não esteja presente nesses documentos. Se a informação solicitada não estiver na base, declare explicitamente: "Esta informação não está disponível na base de conhecimento fornecida."

${kbContent}
═══════════════════════════════════════════════════════════════`;
      }

      // Always inject collaboration directive
      finalSystemPrompt = ensureCollaborationDirective(finalSystemPrompt);

      // Create execution record with dependency info
      const { data: execution } = await supabase
        .from('strategy_agent_executions')
        .insert({
          project_id: projectId,
          agent_type: agentType,
          agent_name: agent.name,
          status: 'running',
          input_data: {
            dependencies: deps,
            missing_dependencies: missingDeps,
            memory_keys_available: Object.keys(memory),
            descricao: project.descricao_negocio,
            knowledge_base_type: kbType,
            knowledge_base_files_count: kbFiles.length,
          }
        })
        .select()
        .single();

      const startTime = Date.now();

      try {
        const userPrompt = buildAgentPrompt(agentType, project.descricao_negocio, memory, deps);
        
        // Retry up to 2 times if JSON extraction fails
        let parsedResult: any;
        let lastError: Error | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const rawResult = await callAI(LOVABLE_API_KEY, finalSystemPrompt, userPrompt);
            parsedResult = extractJSON(rawResult);
            lastError = null;
            break;
          } catch (e) {
            lastError = e as Error;
            console.warn(`Tentativa ${attempt + 1} falhou ao extrair JSON: ${(e as Error).message}`);
          }
        }
        if (lastError) throw lastError;
        const duration = Date.now() - startTime;

        // Update execution
        await supabase
          .from('strategy_agent_executions')
          .update({ status: 'completed', output_data: parsedResult, duration_ms: duration })
          .eq('id', execution!.id);

        // Update strategic memory
        const updatedMemory = { ...memory, [agentType]: parsedResult };
        await supabase
          .from('strategy_projects')
          .update({ strategic_memory: updatedMemory })
          .eq('id', projectId);

        // Save artifact + version
        await saveArtifactWithHistory(supabase, projectId, execution!.id, agentType, agent.name, parsedResult);

        return new Response(JSON.stringify({
          success: true,
          execution_id: execution!.id,
          result: parsedResult,
          duration_ms: duration,
          dependencies_used: deps.filter(d => memory[d]),
          dependencies_missing: missingDeps
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        await supabase
          .from('strategy_agent_executions')
          .update({ status: 'failed', error_message: error.message, duration_ms: Date.now() - startTime })
          .eq('id', execution!.id);
        throw error;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTION: Validate artifact (now with project context)
    // ═══════════════════════════════════════════════════════════════════════════
    if (action === 'validate') {
      const validator = VALIDATOR_DEFINITIONS[validatorType];
      if (!validator) throw new Error(`Validador desconhecido: ${validatorType}`);

      // Fetch project memory for context-aware validation
      let contextPrompt = `Conteúdo a validar:\n${JSON.stringify(artifactContent, null, 2)}`;
      
      if (projectId) {
        try {
          const { memory } = await getLatestMemory(supabase, projectId);
          contextPrompt += `\n\nMEMÓRIA ESTRATÉGICA DO PROJETO (use como referência para validação):\n`;
          if (memory.positioning) contextPrompt += `Posicionamento: ${JSON.stringify(memory.positioning, null, 1)}\n`;
          if (memory.vox) contextPrompt += `Voz do Cliente: ${JSON.stringify(memory.vox, null, 1)}\n`;
          if (memory.cipher) contextPrompt += `Inteligência Competitiva: ${JSON.stringify(memory.cipher, null, 1)}\n`;
        } catch { /* project context optional */ }
      }

      const rawResult = await callAI(LOVABLE_API_KEY, validator.systemPrompt, contextPrompt);
      const result = extractJSON(rawResult);

      return new Response(JSON.stringify({ success: true, validation: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTION: Generate A/B variation
    // ═══════════════════════════════════════════════════════════════════════════
    if (action === 'generate_variation') {
      const resolved = await resolveAgentDefinition(supabase, agentType);
      const agent = resolved.agent;

      const { variationStyle } = body;
      const { project, memory } = await getLatestMemory(supabase, projectId);

      const styleInstruction = variationStyle || 'Use um ângulo criativo completamente diferente.';
      const variationPrompt = buildAgentPrompt(agentType, project.descricao_negocio, memory) + `

INSTRUÇÃO ESPECIAL DE VARIAÇÃO (#${variationIndex || 1}):
Crie uma VARIAÇÃO ALTERNATIVA completamente diferente da versão original.
ESTILO OBRIGATÓRIO: ${styleInstruction}
- A estrutura e campos JSON devem ser os mesmos, mas o CONTEÚDO deve ser radicalmente diferente
- Use vocabulário, tom, exemplos e abordagem completamente distintos
- NÃO repita frases, termos ou ideias da versão padrão
- O resultado deve ser válido e de alta qualidade, mas IMPOSSÍVEL de confundir com o original`;

      const rawResult = await callAI(LOVABLE_API_KEY, agent.systemPrompt, variationPrompt);
      const parsedResult = extractJSON(rawResult);

      return new Response(JSON.stringify({ success: true, result: parsedResult }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTION: Clone project
    // ═══════════════════════════════════════════════════════════════════════════
    if (action === 'clone_project') {
      const { sourceProjectId, newName } = body;
      
      const { data: source } = await supabase
        .from('strategy_projects')
        .select('*')
        .eq('id', sourceProjectId)
        .single();

      if (!source) throw new Error('Projeto fonte não encontrado');

      const { data: cloned } = await supabase
        .from('strategy_projects')
        .insert({
          nome: newName || `${source.nome} (Cópia)`,
          descricao_negocio: source.descricao_negocio,
          estabelecimento_id: source.estabelecimento_id,
          user_id: source.user_id,
          strategic_memory: source.strategic_memory,
          status: 'draft'
        })
        .select()
        .single();

      if (!cloned) throw new Error('Erro ao clonar projeto');

      const { data: artifacts } = await supabase
        .from('strategy_artifacts')
        .select('*')
        .eq('project_id', sourceProjectId);

      if (artifacts && artifacts.length > 0) {
        const clonedArtifacts = artifacts.map((a: any) => ({
          project_id: cloned.id,
          tipo: a.tipo,
          titulo: a.titulo,
          conteudo: a.conteudo,
          version: 1,
          status: 'completed'
        }));
        await supabase.from('strategy_artifacts').insert(clonedArtifacts);
      }

      return new Response(JSON.stringify({ success: true, project: cloned }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTION: Revise agent (re-execute with feedback)
    // ═══════════════════════════════════════════════════════════════════════════
    if (action === 'revise_agent') {
      const resolved = await resolveAgentDefinition(supabase, agentType);
      const agent = resolved.agent;

      // Always re-read latest memory
      const { project, memory } = await getLatestMemory(supabase, projectId);

      const { data: currentArtifact } = await supabase
        .from('strategy_artifacts')
        .select('*')
        .eq('project_id', projectId)
        .eq('tipo', agentType)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { data: execution } = await supabase
        .from('strategy_agent_executions')
        .insert({
          project_id: projectId,
          agent_type: agentType,
          agent_name: agent.name + ' (Revisão)',
          status: 'running',
          input_data: { memory_keys: Object.keys(memory), revision: true }
        })
        .select()
        .single();

      const startTime = Date.now();

      try {
        // Build context-rich prompt + revision instructions
        const basePrompt = buildAgentPrompt(agentType, project.descricao_negocio, memory);
        const revisionPrompt = basePrompt + `

═══════════════════════════════════════════════════
MODO REVISÃO — RESULTADO ANTERIOR:
═══════════════════════════════════════════════════
${JSON.stringify(currentArtifact?.conteudo || {}, null, 2)}

INSTRUÇÃO DE REVISÃO:
1. Analise o resultado anterior criticamente
2. Identifique pontos fracos, genéricos ou inconsistentes
3. Melhore significativamente: mais específico, mais criativo, mais alinhado com a memória estratégica
4. Retorne o resultado COMPLETO revisado no mesmo formato JSON`;

        const rawResult = await callAI(LOVABLE_API_KEY, agent.systemPrompt, revisionPrompt);
        const parsedResult = extractJSON(rawResult);
        const duration = Date.now() - startTime;

        await supabase
          .from('strategy_agent_executions')
          .update({ status: 'completed', output_data: parsedResult, duration_ms: duration })
          .eq('id', execution!.id);

        // Update memory with revised output
        const updatedMemory = { ...memory, [agentType]: parsedResult };
        await supabase.from('strategy_projects').update({ strategic_memory: updatedMemory }).eq('id', projectId);

        const newVersion = ((currentArtifact as any)?.version || 1) + 1;
        if (currentArtifact) {
          await supabase
            .from('strategy_artifacts')
            .update({ conteudo: parsedResult, version: newVersion, status: 'completed', execution_id: execution!.id })
            .eq('id', currentArtifact.id);

          await supabase.from('strategy_artifact_versions').insert({
            project_id: projectId,
            artifact_id: currentArtifact.id,
            tipo: agentType,
            titulo: currentArtifact.titulo,
            conteudo: parsedResult,
            version: newVersion,
            status: 'completed'
          });
        }

        return new Response(JSON.stringify({
          success: true, new_version: newVersion, result: parsedResult, duration_ms: duration
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (error: any) {
        await supabase
          .from('strategy_agent_executions')
          .update({ status: 'failed', error_message: error.message, duration_ms: Date.now() - startTime })
          .eq('id', execution!.id);
        throw error;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTION: Chat with orchestrator
    // ═══════════════════════════════════════════════════════════════════════════
    if (action === 'chat') {
      const { project, memory } = await getLatestMemory(supabase, projectId);

      // Save user message
      await supabase.from('strategy_chat_messages').insert({
        project_id: projectId,
        role: 'user',
        content: message
      });

      // Load custom agents for this project's estabelecimento
      const { data: customAgentsList } = await supabase
        .from('strategy_custom_agents')
        .select('agent_key, name')
        .eq('estabelecimento_id', project.estabelecimento_id)
        .eq('ativo', true);

      const allAgentKeys = [...AGENT_ORDER, ...(customAgentsList || []).map((a: any) => a.agent_key)];
      const allAgentNames: Record<string, string> = {};
      for (const key of AGENT_ORDER) {
        allAgentNames[key] = AGENT_DEFINITIONS[key]?.name || key;
      }
      for (const ca of (customAgentsList || [])) {
        allAgentNames[(ca as any).agent_key] = (ca as any).name;
      }

      const memoryKeys = Object.keys(memory);
      const completedAgents = allAgentKeys.filter(a => memory[a]);
      const pendingAgents = allAgentKeys.filter(a => !memory[a]);

      const systemPrompt = `Você é o Orchestrator do Motor de Estratégia de Marketing.
Você coordena ${allAgentKeys.length} agentes especializados para criar estratégias completas de marketing.

PROJETO: ${project.nome}
DESCRIÇÃO: ${project.descricao_negocio}

STATUS DOS AGENTES:
✅ Concluídos: ${completedAgents.length > 0 ? completedAgents.map(a => allAgentNames[a] || a).join(', ') : 'Nenhum'}
⏳ Pendentes: ${pendingAgents.length > 0 ? pendingAgents.map(a => allAgentNames[a] || a).join(', ') : 'Nenhum'}

MEMÓRIA ESTRATÉGICA RESUMIDA:
${memoryKeys.length > 0 ? memoryKeys.map(k => {
  const content = memory[k];
  const summary = typeof content === 'object' ? Object.keys(content).join(', ') : String(content).substring(0, 100);
  return `- ${allAgentNames[k] || k}: [${summary}]`;
}).join('\n') : '(vazia — nenhum agente executado ainda)'}

REGRAS:
- Responda de forma concisa e estratégica
- Se o usuário pedir para executar agentes, indique quais serão acionados e suas dependências
- Se pedir ajustes, identifique quais artefatos precisam ser revisados
- Sugira próximos passos proativamente
- Nunca revele detalhes técnicos internos (IDs, nomes de tabelas, etc.)`;

      const result = await callAI(LOVABLE_API_KEY, systemPrompt, message);

      await supabase.from('strategy_chat_messages').insert({
        project_id: projectId,
        role: 'assistant',
        content: result
      });

      return new Response(JSON.stringify({ success: true, message: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTION: Run full pipeline with proper orchestration
    // ═══════════════════════════════════════════════════════════════════════════
    if (action === 'run_pipeline') {
      const { project, memory: initialMemory } = await getLatestMemory(supabase, projectId);

      await supabase.from('strategy_projects').update({ status: 'processing' }).eq('id', projectId);

      // Load custom agents for this project
      const { data: customAgentsList } = await supabase
        .from('strategy_custom_agents')
        .select('*')
        .eq('estabelecimento_id', project.estabelecimento_id)
        .eq('ativo', true)
        .order('ordem');

      const fullAgentOrder = [...AGENT_ORDER, ...(customAgentsList || []).map((a: any) => a.agent_key)];

      // Create pending executions for all agents
      const executions = [];
      for (const agentKey of fullAgentOrder) {
        const builtIn = AGENT_DEFINITIONS[agentKey];
        const custom = (customAgentsList || []).find((a: any) => a.agent_key === agentKey);
        const agentName = builtIn?.name || (custom as any)?.name || agentKey;
        const deps = builtIn ? (AGENT_DEPENDENCIES[agentKey] || []) : ((custom as any)?.dependencies || []);
        const { data: exec } = await supabase
          .from('strategy_agent_executions')
          .insert({
            project_id: projectId,
            agent_type: agentKey,
            agent_name: agentName,
            status: 'pending',
            input_data: { dependencies: deps }
          })
          .select()
          .single();
        executions.push({ key: agentKey, id: exec!.id });
      }

      // Execute agents sequentially, RE-READING memory from DB before each agent
      for (const exec of executions) {
        const resolved = await resolveAgentDefinition(supabase, exec.key);
        const builtIn = AGENT_DEFINITIONS[exec.key];
        const custom = (customAgentsList || []).find((a: any) => a.agent_key === exec.key);
        const agent = resolved.agent;
        const startTime = Date.now();

        // Mark as running
        await supabase
          .from('strategy_agent_executions')
          .update({ status: 'running', input_data: { started_at: new Date().toISOString() } })
          .eq('id', exec.id);

        try {
          // *** CRITICAL: Re-read latest memory from DB before each agent ***
          const { memory: latestMemory } = await getLatestMemory(supabase, projectId);

          // Log dependency status
          const deps = builtIn ? (AGENT_DEPENDENCIES[exec.key] || []) : (resolved.customDeps || []);
          const availableDeps = deps.filter((d: string) => latestMemory[d]);
          const missingDeps = deps.filter((d: string) => !latestMemory[d]);
          console.log(`🤖 ${agent.name}: deps=${deps.join(',')}, available=${availableDeps.join(',')}, missing=${missingDeps.join(',')}`);

          // Build context-rich prompt with dependency injection
          const userPrompt = buildAgentPrompt(exec.key, project.descricao_negocio, latestMemory, deps);

          const rawResult = await callAI(LOVABLE_API_KEY, agent.systemPrompt, userPrompt);
          const parsedResult = extractJSON(rawResult);
          const duration = Date.now() - startTime;

          // Update execution record
          await supabase
            .from('strategy_agent_executions')
            .update({
              status: 'completed',
              output_data: parsedResult,
              duration_ms: duration
            })
            .eq('id', exec.id);

          // Save artifact + version history
          await saveArtifactWithHistory(supabase, projectId, exec.id, exec.key, agent.name, parsedResult);

          // Update memory IMMEDIATELY so next agent can read it
          const updatedMemory = { ...latestMemory, [exec.key]: parsedResult };
          await supabase
            .from('strategy_projects')
            .update({ strategic_memory: updatedMemory })
            .eq('id', projectId);

          console.log(`✅ ${agent.name} concluído em ${duration}ms`);

        } catch (error: any) {
          console.error(`❌ ${agent.name} falhou: ${error.message}`);
          await supabase
            .from('strategy_agent_executions')
            .update({ status: 'failed', error_message: error.message, duration_ms: Date.now() - startTime })
            .eq('id', exec.id);
          // Continue with next agent — it will work with whatever memory is available
        }
      }

      await supabase.from('strategy_projects').update({ status: 'completed' }).eq('id', projectId);

      return new Response(JSON.stringify({ success: true, message: 'Pipeline concluído' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTION: Generate marketing page copy using AI
    // ═══════════════════════════════════════════════════════════════════════════
    if (action === 'generate_page_copy') {
      const contextSummary = body.contextSummary || '{}';

      const systemPrompt = `Você é um copywriter de elite especializado em páginas de vendas de alta conversão.
Seu trabalho é analisar TODOS os dados de estratégia de marketing fornecidos e gerar textos persuasivos, chamativos e prontos para uso em uma landing page profissional.

REGRAS CRÍTICAS:
- NUNCA INVENTE informações que não existem nos dados fornecidos. NÃO crie selos, certificações, prêmios, parcerias, números de clientes ou qualquer dado fictício que não esteja explicitamente nos dados do cliente.
- Se não houver dados reais de prova social (número de clientes, satisfação, etc), NÃO invente números. Use placeholders genéricos como "[Seu número aqui]" ou omita a seção.
- NÃO crie nomes de selos, certificados ou programas fictícios (ex: "Selo de Verificação", "Programa de Excelência", "Certificado de Qualidade") a menos que existam nos dados.
- Depoimentos/testimonials devem usar nomes genéricos marcados como exemplo (ex: "Maria S. — [Cliente Real]") para que o usuário saiba que precisa substituir.
- Crie títulos CHAMATIVOS e PERSUASIVOS, NUNCA use o nome do dado/campo como título
- Use gatilhos mentais: urgência, escassez, prova social, autoridade, reciprocidade
- Foque em BENEFÍCIOS e TRANSFORMAÇÃO, não em características técnicas
- Todos os textos devem ser em Português-BR
- Cada título deve fazer o visitante PARAR e QUERER LER MAIS
- O tom deve ser profissional mas envolvente, nunca genérico

Retorne EXCLUSIVAMENTE um JSON com esta estrutura:
{
  "page_name": "Nome criativo e chamativo para a página (não use 'Landing Page' ou 'Página de Vendas')",
  "seo_title": "Título SEO otimizado com até 60 caracteres",
  "seo_description": "Meta description persuasiva com até 160 caracteres",
  "hero_headline": "Headline principal impactante e persuasiva (máx 80 chars)",
  "hero_subheadline": "Subheadline que complementa e gera curiosidade (máx 150 chars)",
  "hero_cta": "Texto do botão CTA principal (máx 30 chars, use verbos de ação)",
  "features_title": "Título chamativo para seção de diferenciais",
  "features": [{"icon": "emoji", "title": "Título persuasivo do diferencial", "description": "Descrição focada em benefício"}],
  "process_title": "Título chamativo para seção Como Funciona",
  "process_steps": [{"step": "1", "title": "Nome da etapa", "description": "Descrição clara"}],
  "about_title": "Título envolvente para seção Sobre",
  "about_text": "Texto narrativo e envolvente sobre o negócio (2-3 parágrafos)",
  "testimonials_title": "Título chamativo para depoimentos",
  "testimonials": [{"name": "Nome Exemplo", "role": "[Substituir por cliente real]", "text": "Depoimento baseado nos benefícios reais do produto/serviço", "metrics": "Resultado esperado"}],
  "objections_title": "Título para quebra de objeções",
  "objections": [{"objection": "Objeção comum", "response": "Resposta persuasiva e empática"}],
  "guarantee_title": "Título da garantia",
  "guarantee_description": "Descrição da garantia que elimina risco",
  "guarantee_duration": "Período da garantia",
  "pricing_title": "Título persuasivo para preços",
  "faq": [{"question": "Pergunta frequente", "answer": "Resposta clara e completa"}],
  "cta_final_headline": "Headline final de urgência/ação",
  "cta_final_description": "Texto final que gera urgência e ação imediata",
  "cta_final_button": "Texto do botão final (verbo de ação)",
  "social_proof": [{"number": "Número REAL dos dados ou [Preencher]", "label": "Descrição curta"}],
  "image_suggestion": "Sugestão detalhada de imagem principal",
  "video_suggestion": "Sugestão de conteúdo para vídeo"
}`;

      const userPrompt = `Analise TODOS os dados abaixo do Motor de Estratégia e gere os textos de marketing para uma página de vendas de alta conversão:\n\n${contextSummary}`;

      const rawResult = await callAI(LOVABLE_API_KEY, systemPrompt, userPrompt);
      const copy = extractJSON(rawResult);

      return new Response(JSON.stringify({ success: true, copy }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTION: Generate ad image for product using AI
    // ═══════════════════════════════════════════════════════════════════════════
    if (action === 'generate_page_media') {
      const productName = body.productName || 'Produto';
      const productDescription = body.productDescription || '';
      const productImageUrl = body.productImageUrl || '';
      const marketingContext = body.marketingContext || '';
      const mediaType = body.mediaType || 'image'; // 'image' or 'video'
      const imageModel = body.imageModel || 'google/gemini-3.1-flash-image-preview';
      const useApiframe = body.useApiframe === true;

      if (mediaType === 'video') {
        // For video, generate a compelling prompt/storyboard
        const videoPrompt = `Crie um roteiro curto e cinematográfico (máximo 15 segundos) para um vídeo promocional do produto "${productName}".
Contexto de marketing: ${marketingContext}
Descrição do produto: ${productDescription}

REGRAS OBRIGATÓRIAS:
- O vídeo NÃO deve conter NENHUM texto, legenda, título ou overlay de texto
- O vídeo NÃO deve conter áudio, narração ou música
- Foco 100% visual: apenas imagens cinematográficas do produto
- Sem textos sobrepostos de nenhum tipo

Retorne EXCLUSIVAMENTE um JSON:
{
  "video_prompt": "Prompt detalhado para geração de vídeo em inglês, cinematográfico, focado no produto. NO TEXT OVERLAYS. NO AUDIO. NO CAPTIONS. NO TITLES. Pure visual cinematic product footage only.",
  "storyboard": [
    {"timestamp": "0-3s", "description": "Descrição da cena visual (sem texto)"},
    {"timestamp": "3-8s", "description": "Descrição da cena visual (sem texto)"},
    {"timestamp": "8-15s", "description": "Descrição da cena visual (sem texto)"}
  ],
  "headline_overlay": "",
  "cta_overlay": ""
}`;

        const rawResult = await callAI(LOVABLE_API_KEY, 'Você é um diretor criativo de vídeos publicitários. Gere roteiros persuasivos e visualmente impactantes.', videoPrompt);
        const videoData = extractJSON(rawResult);

        return new Response(JSON.stringify({ success: true, mediaType: 'video', data: videoData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Image generation
      const imagePromptRequest = `Crie um prompt profissional para gerar uma imagem publicitária para o produto "${productName}".
Descrição do produto: ${productDescription}
Contexto de marketing: ${marketingContext}

O prompt deve ser em inglês e descrever uma cena publicitária premium onde:
- O produto REAL aparece como foco central SEM NENHUMA ALTERAÇÃO na embalagem, rótulo, formato, cores ou visual do produto
- NÃO redesenhe, modifique ou altere a aparência do produto/embalagem de forma alguma
- Apenas mude o CENÁRIO ao redor: iluminação, superfície, fundo, atmosfera
- Iluminação profissional de estúdio
- SEM NENHUM TEXTO, lettering, tipografia ou palavras na imagem

Retorne EXCLUSIVAMENTE um JSON:
{
  "image_prompt": "Prompt em inglês descrevendo APENAS o cenário/ambiente ao redor do produto. CRITICAL: DO NOT modify the product appearance, packaging, label or branding. Only describe the background scene, lighting and atmosphere. NO TEXT in the image.",
  "alt_text": "Texto alternativo descritivo em português",
  "suggested_headline": "Headline persuasiva para acompanhar a imagem (PT-BR)"
}`;

      const rawPromptResult = await callAI(LOVABLE_API_KEY, 'Você é um diretor de arte publicitária. Crie prompts visuais impactantes.', imagePromptRequest);
      const promptData = extractJSON(rawPromptResult);

      // Now generate the actual image
      let generatedImageUrl = '';
      try {
        if (useApiframe) {
          // Use ApiFrame proxy for paid image models
          const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
          const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
          const afAction = imageModel.replace('apiframe/', '');
          const afPrompt = promptData?.image_prompt || `Professional advertising photo of "${productName}". ${productDescription}. Studio lighting, premium style. No text.`;
          const afParams: Record<string, any> = { prompt: afPrompt };
          if (productImageUrl) afParams.image_url = productImageUrl;

          const afResp = await fetch(`${SUPABASE_URL}/functions/v1/apiframe-proxy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
            body: JSON.stringify({ action: afAction, estabelecimentoId: body.estabelecimentoId || '', params: afParams }),
          });
          const afData = await afResp.json();
          if (!afResp.ok || afData?.error) throw new Error(afData?.error || `Erro ApiFrame (${afResp.status})`);

          // ApiFrame returns task_id for async generation - for page builder just return the task info
          const directUrl = afData?.image_url || afData?.output?.[0]?.url || afData?.output?.image_url;
          if (directUrl) {
            generatedImageUrl = directUrl;
          } else {
            // Has task_id, need to poll - for simplicity just pass the error
            throw new Error('ApiFrame imagem: geração em processamento. Tente novamente em alguns segundos.');
          }
        } else {
          // Use Lovable AI gateway
          const messages: any[] = [];
          
          if (productImageUrl) {
            messages.push({
              role: 'user',
              content: [
                { type: 'text', text: `Place this EXACT product in a professional advertising scene. CRITICAL RULES: 1) DO NOT modify, redesign, or alter the product appearance, packaging, label, colors, shape, or branding in ANY way. The product must look IDENTICAL to the reference image. 2) Only change the BACKGROUND and ENVIRONMENT around the product (lighting, surface, props, atmosphere). 3) NO TEXT, NO WORDS, NO LETTERS, NO TYPOGRAPHY anywhere in the image. 4) Keep the product as the hero/focal point with premium studio lighting. ${promptData?.image_prompt || `Professional product photography of "${productName}" with studio lighting and clean composition.`}` },
                { type: 'image_url', image_url: { url: productImageUrl } }
              ]
            });
          } else {
            messages.push({
              role: 'user',
              content: `NO TEXT, NO WORDS, NO LETTERS, NO TYPOGRAPHY in the image. Pure visual only. ${promptData?.image_prompt || `Professional advertising photo of "${productName}". ${productDescription}. Studio lighting, clean background, premium marketing style. No text overlay.`}`
            });
          }

          const imgResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: imageModel,
              messages,
              modalities: ['image', 'text'],
            }),
          });

          if (!imgResponse.ok) {
            const errText = await imgResponse.text();
            console.error('Image generation API error:', imgResponse.status, errText);
            throw new Error(`Erro na API de geração de imagem (${imgResponse.status}): ${errText.substring(0, 200)}`);
          }
          
          const imgData = await imgResponse.json();
          const base64Image = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          
          if (!base64Image) {
            console.error('No image in response:', JSON.stringify(imgData).substring(0, 500));
            throw new Error('A API retornou resposta sem imagem. Tente novamente.');
          }

          // Upload to storage
          const SUPABASE_URL_IMG = Deno.env.get('SUPABASE_URL')!;
          const SERVICE_ROLE_KEY_IMG = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
          const storageClient = createClient(SUPABASE_URL_IMG, SERVICE_ROLE_KEY_IMG);
          
          const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
          const binaryData = Uint8Array.from(atob(base64Data), (c: string) => c.charCodeAt(0));
          const filename = `page-builder/${Date.now()}-ad.png`;
          
          const { error: uploadError } = await storageClient.storage
            .from('marketing-images')
            .upload(filename, binaryData, { contentType: 'image/png', upsert: true });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Erro ao salvar imagem: ${uploadError.message}`);
          }

          const { data: urlData } = storageClient.storage
            .from('marketing-images')
            .getPublicUrl(filename);
          generatedImageUrl = urlData.publicUrl;
        } // end else (Lovable AI)
      } catch (imgError: any) {
        console.error('Image generation error:', imgError.message);
        return new Response(JSON.stringify({
          success: false,
          error: imgError.message || 'Erro ao gerar imagem',
          mediaType: 'image',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        mediaType: 'image',
        data: promptData,
        generatedImageUrl,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Ação desconhecida: ${action}`);

  } catch (error: any) {
    console.error('Strategy Engine Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: error.message.includes('Rate limit') ? 429 : error.message.includes('Créditos') ? 402 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
