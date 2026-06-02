// Presets compartilhados de Áudio & Sound Design
// Cada preset tem um label curto e uma descrição explicando o efeito/uso.
// Usados pelos blocos Roteiro de Vídeo / Roteiro de Reels do AI Studio
// e referenciados no prompt do Motor de Estratégia (supabase/functions/strategy-engine).

export type AudioPreset = { value: string; description: string };

export const SOUNDTRACK_PRESETS: AudioPreset[] = [
  { value: 'lo-fi calmo', description: 'Batida suave e relaxante. Bom para vídeos íntimos, estudo, café.' },
  { value: 'épico orquestral cinematográfico', description: 'Cordas e tambores grandiosos. Ideal para abertura impactante, hero shots.' },
  { value: 'house energético 120bpm', description: 'Dance/eletrônica animada. Para fitness, lifestyle, lançamentos.' },
  { value: 'ambient minimalista', description: 'Texturas suaves sem melodia forte. Para tutoriais e narração técnica.' },
  { value: 'indie folk acústico', description: 'Violão e voz delicada. Para storytelling humano, artesanal.' },
  { value: 'pop cinematográfico moderno', description: 'Pop com produção grande. Versátil para marcas e lifestyle premium.' },
  { value: 'corporate inspirador', description: 'Piano + cordas crescentes. Para vídeos institucionais motivacionais.' },
  { value: 'trap / hip-hop urbano', description: 'Batida 808 + hi-hats. Para moda jovem, streetwear, energia urbana.' },
  { value: 'synthwave retro', description: 'Sintetizadores anos 80. Para tech, gaming, estética nostálgica.' },
  { value: 'jazz suave', description: 'Saxofone e piano sofisticados. Para gastronomia, luxo, romance.' },
  { value: 'eletrônica progressiva', description: 'Build-ups crescentes. Para revelações de produto e drops.' },
  { value: 'rock motivacional', description: 'Guitarras enérgicas. Para esporte, ação, conquista.' },
  { value: 'piano emocional', description: 'Piano solo melancólico. Para depoimentos, momentos sensíveis.' },
  { value: 'reggae descontraído', description: 'Vibe leve e tropical. Para verão, lazer, bem-estar.' },
  { value: 'percussão tribal', description: 'Tambores intensos. Para força, ritual, raiz cultural.' },
];

export const SOUNDTRACK_INTENSITIES: AudioPreset[] = [
  { value: 'baixa', description: 'Trilha discreta no fundo, deixa a narração no primeiro plano.' },
  { value: 'média', description: 'Equilíbrio entre música e voz. Padrão recomendado.' },
  { value: 'alta', description: 'Música em destaque, narração mais sutil.' },
  { value: 'crescente', description: 'Começa baixa e cresce até o final. Ótima para build-up.' },
  { value: 'decrescente', description: 'Começa alta e diminui. Para encerrar com calma/reflexão.' },
];

export const VOICE_TONES: AudioPreset[] = [
  { value: 'feminina jovem confiante', description: 'Voz feminina 20-30 anos, segura e moderna.' },
  { value: 'feminina madura acolhedora', description: 'Voz feminina 40+, calorosa e experiente.' },
  { value: 'masculina grave e calma', description: 'Voz masculina baixa, autoridade serena (narrador clássico).' },
  { value: 'masculina jovem entusiasmada', description: 'Voz masculina vibrante, energia jovem.' },
  { value: 'entusiasmada PT-BR', description: 'Locução animada típica de comercial brasileiro.' },
  { value: 'sussurro íntimo', description: 'Voz baixa e próxima do microfone. Para sensorial/ASMR.' },
  { value: 'narrador documentário', description: 'Tom informativo e neutro, estilo BBC/National Geographic.' },
  { value: 'locutor comercial energético', description: 'Voz alta e empolgada de propaganda de varejo.' },
  { value: 'tom institucional sério', description: 'Voz formal e firme, para comunicados corporativos.' },
  { value: 'amigável e próximo', description: 'Conversa informal de amigo, perfeito para redes sociais.' },
  { value: 'autoritário e firme', description: 'Voz de comando, para chamadas de ação fortes.' },
  { value: 'inspiradora e motivacional', description: 'Tom de coach, ergue emoção do espectador.' },
];

export const AMBIENT_SOUNDS: AudioPreset[] = [
  { value: 'estúdio silencioso', description: 'Sem ruído de fundo. Foco total na narração.' },
  { value: 'café movimentado', description: 'Conversas baixas + xícaras. Aconchego urbano.' },
  { value: 'rua urbana de dia', description: 'Tráfego e pessoas. Energia da cidade.' },
  { value: 'rua urbana de noite', description: 'Cidade calma com sirenes distantes. Mistério/lifestyle.' },
  { value: 'natureza / floresta', description: 'Pássaros, folhas, vento leve. Bem-estar e organicidade.' },
  { value: 'praia / ondas', description: 'Ondas quebrando e gaivotas. Verão e relaxamento.' },
  { value: 'escritório corporativo', description: 'Teclados e murmúrio profissional. Productivity content.' },
  { value: 'sala residencial', description: 'Ambiente caseiro silencioso. Intimidade do dia a dia.' },
  { value: 'academia / esporte', description: 'Pesos, respiração, batida. Para fitness e performance.' },
  { value: 'vento suave', description: 'Brisa contínua. Para paisagens abertas e calma.' },
  { value: 'chuva leve', description: 'Chuva fina constante. Aconchego e introspecção.' },
  { value: 'ambiente industrial', description: 'Máquinas e metal. Para indústria, oficina, força.' },
];

export const SFX_PRESETS: AudioPreset[] = [
  { value: 'whoosh na transição', description: 'Som de passagem rápida entre cenas. Acelera o ritmo.' },
  { value: 'click suave', description: 'Tique curto. Pontua revelações, mudanças de tela.' },
  { value: 'passos no asfalto', description: 'Pegadas firmes. Marca presença/chegada de personagem.' },
  { value: 'tilintar de copo', description: 'Brinde. Para gastronomia e celebração.' },
  { value: 'notificação digital', description: 'Beep de app/mensagem. Para tech e produto digital.' },
  { value: 'risers crescentes', description: 'Tensão que cresce. Anuncia clímax/big reveal.' },
  { value: 'impact / boom cinematográfico', description: 'Pancada grave. Marca momento decisivo.' },
  { value: 'glitch eletrônico', description: 'Ruído digital quebrado. Estética cyber/tech.' },
  { value: 'aplausos', description: 'Plateia comemorando. Para conquista, lançamento, prova social.' },
  { value: 'cash register', description: 'Caixa registradora. Reforça venda/dinheiro entrando.' },
  { value: 'teclado digitando', description: 'Dedos no teclado. Para tecnologia, escrita, trabalho.' },
  { value: 'porta fechando', description: 'Encerramento decisivo. Pontua final de capítulo.' },
];
